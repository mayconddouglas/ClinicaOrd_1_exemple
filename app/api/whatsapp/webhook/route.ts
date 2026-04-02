import { NextRequest, NextResponse } from 'next/server';
import { getSetting, getWhatsappHistory, appendChatMessages, getPatientContext } from '@/lib/db-tools';
import { supabaseServer } from '@/lib/supabase-server';
import {
  getUniversalPatientPrompt,
  PATIENT_TOOLS_NAMES,
  toolDeclarations,
  executeTool
} from '@/lib/ai-agent';
import OpenAI from 'openai';

const getOpenAI = () => new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || "dummy",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "OrthoAdmin WhatsApp",
  }
});

async function logDebug(step: string, data: any) {
  try {
    const { error } = await supabaseServer.from('learned_faqs').insert([{
      question: `LOG_WA_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      answer: JSON.stringify({ step, data }),
      category: '__DEBUG_LOG__'
    }]);
    if (error) {
      console.error('Supabase insert error in logDebug:', error);
    }
  } catch (e) {
    console.error('Failed to log debug', e);
  }
}

// Handle webhook verification from Meta
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = await getSetting('__WHATSAPP_VERIFY_TOKEN__');

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

export const maxDuration = 60;

// Handle incoming messages
export async function POST(req: NextRequest) {
  const debugLogs: any[] = [];
  
  // Wrapper to log both to array and Supabase
  async function logStep(step: string, data: any) {
    debugLogs.push({ step, data });
    await logDebug(step, data);
  }

  try {
    const bodyText = await req.text();
    await logStep('RECEIVED_WEBHOOK', { body: bodyText });

    const body = JSON.parse(bodyText);

    // Validate WhatsApp payload structure
    if (body.object !== 'whatsapp_business_account') {
      await logStep('IGNORED_NON_WHATSAPP', { body });
      return NextResponse.json({ success: true });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Ignore non-text messages or status updates
    if (!message || message.type !== 'text') {
      await logStep('IGNORED_NON_TEXT', { message });
      return NextResponse.json({ success: true });
    }

    const senderPhone = message.from;
    const messageText = message.text.body;

    // 1. Check if integration is enabled
    const isEnabled = await getSetting('__WHATSAPP_ENABLED__');
    if (isEnabled !== 'true') {
      await logStep('DISABLED', { isEnabled });
      return NextResponse.json({ success: true });
    }

    const token = (await getSetting('__WHATSAPP_TOKEN__'))?.trim();
    const phoneId = (await getSetting('__WHATSAPP_PHONE_ID__'))?.trim();

    if (!token || !phoneId) {
      await logStep('NO_TOKEN_OR_PHONE_ID', {});
      return NextResponse.json({ success: true });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      await logStep('NO_API_KEY', {});
      return NextResponse.json({ success: true });
    }
    await logStep('API_KEY_INFO', { length: apiKey.length, start: apiKey.substring(0, 4) });

    // 2. Get Chat History
    const history = await getWhatsappHistory(senderPhone);
    await logStep('HISTORY_LOADED', { historyLength: history.length });

    // 2.5 Get Patient Context (Caller ID)
    const patientContext = await getPatientContext(senderPhone);

    // 3. Universal Agent Logic
    const AGENT_INSTRUCTION = await getUniversalPatientPrompt(patientContext);
    const agentTools = toolDeclarations.filter(t => t.function?.name && PATIENT_TOOLS_NAMES.includes(t.function.name));

    const openai = getOpenAI();

    // Converter histórico
    const openRouterMessages: any[] = [
      { role: 'system', content: AGENT_INSTRUCTION }
    ];

    if (history && history.length > 0) {
      for (const msg of history) {
        const role = msg.role === 'user' ? 'user' : 'assistant';
        const content = msg.parts?.[0]?.text || msg.content || '';
        openRouterMessages.push({ role, content });
      }
    }
    openRouterMessages.push({ role: 'user', content: messageText });

    let finalText = '';

    // Limitado a 8 iterações para garantir que fluxos complexos sejam concluídos
    for (let i = 0; i < 8; i++) {
      await logStep('SENDING_MESSAGE_TO_AI', { iteration: i, messages: openRouterMessages });
      
      const generateParams: any = {
        model: 'openai/gpt-4o-mini',
        messages: openRouterMessages,
        temperature: 0.1,
      };

      if (agentTools.length > 0) {
        generateParams.tools = agentTools as any;
        generateParams.tool_choice = "auto";
      }

      const response = await openai.chat.completions.create(generateParams);
      const assistantMessage = response.choices[0].message;

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        await logStep('FUNCTION_CALLS', { functionCalls: assistantMessage.tool_calls });
        openRouterMessages.push(assistantMessage);

        for (const call of assistantMessage.tool_calls) {
          const functionName = (call as any).function?.name || 'unknown';
          const functionArgs = JSON.parse((call as any).function?.arguments || '{}');
          
          const result = await executeTool(functionName, functionArgs);
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

          openRouterMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: functionName,
            content: resultStr
          });
        }
      } else {
        finalText = assistantMessage.content || '';
        await logStep('FINAL_TEXT_GENERATED', { finalText });
        break;
      }
    }

    // 5. Send response back to WhatsApp
    if (finalText) {
      const waResponse = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: senderPhone,
          text: { body: finalText },
        }),
      });

      const waData = await waResponse.text();
      await logStep('WHATSAPP_API_RESPONSE', { status: waResponse.status, data: waData });

      // 6. Save updated history (Ignore failures so it doesn't crash if RLS blocks)
      const newMessages = [
        { role: 'user', parts: [{ text: messageText }] },
        { role: 'model', parts: [{ text: finalText }] }
      ];
      try {
        await appendChatMessages('whatsapp', senderPhone, newMessages);
      } catch (e) {
        console.error('Failed to save history, but message was sent', e);
      }
    }

    return NextResponse.json({ success: true, logs: debugLogs });
  } catch (error: any) {
    debugLogs.push({ step: 'WEBHOOK_ERROR', data: { error: error.message, stack: error.stack } });
    console.error('WhatsApp Webhook Error:', error);
    // Always return 200 to WhatsApp so it doesn't retry infinitely
    return NextResponse.json({ success: true, logs: debugLogs });
  }
}
