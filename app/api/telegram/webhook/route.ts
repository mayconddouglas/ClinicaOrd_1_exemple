import { NextRequest, NextResponse } from 'next/server';
import { getSetting, getTelegramHistory, appendChatMessages, getPatientContext } from '@/lib/db-tools';
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
    "X-Title": "OrthoAdmin Telegram",
  }
});

export const maxDuration = 60;

// Logging wrapper to persist debug logs
async function logDebug(step: string, data: any) {
  try {
    // Attempt to log to Supabase. Note: this will fail silently if RLS is enabled without a policy.
    const { error } = await supabaseServer.from('learned_faqs').insert([{
      question: `LOG_TG_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      answer: JSON.stringify({ step, data }),
      category: '__DEBUG_LOG__'
    }]);
    if (error) {
      // Just console log the error, don't crash
      console.log(`[Log Failed RLS] ${step}:`, JSON.stringify(data).substring(0, 200));
    }
  } catch (e) {
    console.error('Failed to log debug', e);
  }
}

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  const TELEGRAM_API = `https://api.telegram.org/bot${token}`
  console.log(`[Telegram Webhook] Sending message to ${chatId}: ${text.substring(0, 50)}...`);
  
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
  
  const result = await response.json();
  if (!response.ok) {
    console.error(`[Telegram Webhook] Failed to send message:`, result);
  } else {
    console.log(`[Telegram Webhook] Message sent successfully.`);
  }
}

export async function POST(req: NextRequest) {
  const debugLogs: any[] = [];
  async function logStep(step: string, data: any) {
    debugLogs.push({ step, data });
    console.log(`[Telegram Webhook] ${step}`);
    await logDebug(step, data);
  }

  try {
    const body = await req.json()
    await logStep('RECEIVED_WEBHOOK_JSON', { body });

    // Ignora updates que não são mensagens de texto
    const message = body?.message
    if (!message || !message.text) {
      await logStep('IGNORED_NON_TEXT', { body });
      return NextResponse.json({ ok: true })
    }

    const chatId: number = message.chat.id
    const userText: string = message.text

    // ---- LÓGICA DO BOT ----
    
    // 1. Validar Token (lendo do banco ou do ENV)
    const dbToken = (await getSetting('__TELEGRAM_BOT_TOKEN__'))?.trim();
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || dbToken;
    
    if (!TELEGRAM_BOT_TOKEN) {
      await logStep('NO_TOKEN', {});
      return NextResponse.json({ ok: true }); 
    }

    // Verifica se a integração está ativa no banco
    const isEnabled = await getSetting('__TELEGRAM_ENABLED__');
    if (isEnabled !== 'true') {
      await logStep('DISABLED', { isEnabled });
      return NextResponse.json({ ok: true }); 
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      await logStep('NO_API_KEY', {});
      return NextResponse.json({ ok: true });
    }

    // 2. Get Chat History
    const history = await getTelegramHistory(chatId.toString());
    await logStep('HISTORY_LOADED', { historyLength: history.length });

    // 2.5 Get Patient Context (Caller ID) - Try to get phone from contact if available
    let patientContext = null;
    if (message.contact && message.contact.phone_number) {
      patientContext = await getPatientContext(message.contact.phone_number);
    }

    // 3. Agent Logic
    const openai = getOpenAI();
    const AGENT_INSTRUCTION = await getUniversalPatientPrompt(patientContext);
    const agentTools = toolDeclarations.filter(t => t.function?.name && PATIENT_TOOLS_NAMES.includes(t.function.name));

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
    openRouterMessages.push({ role: 'user', content: userText });

    let responseText = '';
    
    // Limitado a 8 iterações para garantir que fluxos complexos sejam concluídos
    for (let i = 0; i < 8; i++) {
      await logStep('SENDING_MESSAGE_TO_AI', { iteration: i });
      
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
        await logStep('FUNCTION_CALLS', { toolCalls: assistantMessage.tool_calls.length });
        openRouterMessages.push(assistantMessage);

        for (const call of assistantMessage.tool_calls) {
          const functionName = (call as any).function?.name || 'unknown';
          const functionArgs = JSON.parse((call as any).function?.arguments || '{}');
          
          await logStep('EXECUTING_TOOL', { functionName, functionArgs });
          
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
        responseText = assistantMessage.content || '';
        await logStep('FINAL_TEXT_GENERATED', { responseText });
        break;
      }
    }
    // ---- FIM DA LÓGICA ----

    // 5. Send response back to Telegram
    if (responseText) {
      await sendMessage(TELEGRAM_BOT_TOKEN, chatId, responseText)

      // 6. Save updated history (Ignore failures so it doesn't crash if RLS blocks)
      const newMessages = [
        { role: 'user', parts: [{ text: userText }] },
        { role: 'model', parts: [{ text: responseText }] }
      ];
      try {
        await appendChatMessages('telegram', chatId.toString(), newMessages);
      } catch (e) {
        console.error('Failed to save history, but message was sent', e);
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook Error]', error)
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
  }
}

// GET para verificação de saúde
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook is active' })
}