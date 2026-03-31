import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getSetting, getTelegramHistory, saveTelegramHistory } from '@/lib/db-tools';
import { supabaseServer } from '@/lib/supabase-server';
import {
  ORCHESTRATOR_INSTRUCTION,
  AGENT_INSTRUCTIONS,
  TOOL_ROUTING,
  toolDeclarations,
  executeTool
} from '@/lib/ai-agent';

async function logDebug(step: string, data: any) {
  try {
    const { error } = await supabaseServer.from('learned_faqs').insert([{
      question: `LOG_TG_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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

export async function POST(req: NextRequest) {
  const debugLogs: any[] = [];
  async function logDebug(step: string, data: any) {
    debugLogs.push({ step, data });
  }

  try {
    const bodyText = await req.text();
    await logDebug('RECEIVED_WEBHOOK', { body: bodyText });
    
    const body = JSON.parse(bodyText);

    // Telegram webhook verification or message structure
    if (!body.message || !body.message.text) {
      await logDebug('IGNORED_NON_TEXT', { body });
      return NextResponse.json({ success: true }); // Ignore non-text messages
    }

    const chatId = body.message.chat.id.toString();
    const messageText = body.message.text;

    // 1. Check if integration is enabled
    const isEnabled = await getSetting('__TELEGRAM_ENABLED__');
    if (isEnabled !== 'true') {
      await logDebug('DISABLED', { isEnabled });
      return NextResponse.json({ success: true }); // Ignore if disabled
    }

    const botToken = (await getSetting('__TELEGRAM_BOT_TOKEN__'))?.trim();
    if (!botToken) {
      await logDebug('NO_TOKEN', {});
      return NextResponse.json({ success: true }); // Ignore if no token
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      await logDebug('NO_API_KEY', {});
      return NextResponse.json({ success: true });
    }
    await logDebug('API_KEY_INFO', { length: apiKey.length, start: apiKey.substring(0, 4) });

    // 2. Get Chat History
    const history = await getTelegramHistory(chatId);
    await logDebug('HISTORY_LOADED', { historyLength: history.length });

    // 3. Orchestrator Logic
    const ai = new GoogleGenAI({ apiKey });
    const orchestratorPrompt = `Histórico da conversa:\n${JSON.stringify(history.slice(-4))}\n\nMensagem atual do usuário: "${messageText}"`;
    
    const orchestratorResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: orchestratorPrompt,
      config: {
        systemInstruction: ORCHESTRATOR_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.STRING,
          enum: ['AGENDAMENTO', 'TRIAGEM', 'MEDICOS', 'FAQ', 'POS_CONSULTA', 'GERAL'],
          description: "A intenção classificada do usuário"
        },
        temperature: 0.1,
      }
    });

    let intent = orchestratorResponse.text?.replace(/["\n\r]/g, '').trim() || 'GERAL';
    if (!['AGENDAMENTO', 'TRIAGEM', 'MEDICOS', 'FAQ', 'POS_CONSULTA', 'GERAL'].includes(intent)) {
      intent = 'GERAL';
    }
    
    await logDebug('INTENT_DETECTED', { intent });

    // 4. Subagent Logic
    const agentInstruction = AGENT_INSTRUCTIONS[intent as keyof typeof AGENT_INSTRUCTIONS];
    const allowedToolsNames = TOOL_ROUTING[intent as keyof typeof TOOL_ROUTING];
    const agentTools = toolDeclarations.filter(t => allowedToolsNames.includes(t.name));

    const session = ai.chats.create({
      model: 'gemini-3-flash-preview',
      history: history.length > 0 ? history : undefined,
      config: {
        systemInstruction: agentInstruction,
        temperature: 0.2,
        tools: agentTools.length > 0 ? [{ functionDeclarations: agentTools }] : undefined,
      },
    });

    let currentMessage: any = { message: messageText };
    let finalText = '';

    for (let i = 0; i < 10; i++) {
      await logDebug('SENDING_MESSAGE_TO_AI', { iteration: i, currentMessage });
      const response = await session.sendMessage(currentMessage);
      const functionCalls = response.functionCalls ?? [];

      if (functionCalls.length > 0) {
        await logDebug('FUNCTION_CALLS', { functionCalls });
        const functionResponses = await Promise.all(
          functionCalls.map(async (call: any) => {
            const result = await executeTool(call.name, call.args ?? {});
            return {
              functionResponse: {
                name: call.name,
                response: result,
              },
            };
          })
        );
        currentMessage = { message: functionResponses };
      } else {
        finalText = response.text ?? '';
        await logDebug('FINAL_TEXT_GENERATED', { finalText });
        break;
      }
    }

    // 5. Send response back to Telegram
    if (finalText) {
      const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: finalText,
        }),
      });
      
      const tgData = await tgResponse.text();
      await logDebug('TELEGRAM_API_RESPONSE', { status: tgResponse.status, data: tgData });

      // 6. Save updated history
      const updatedHistory = [
        ...history,
        { role: 'user', parts: [{ text: messageText }] },
        { role: 'model', parts: [{ text: finalText }] }
      ];
      await saveTelegramHistory(chatId, updatedHistory);
    }

    return NextResponse.json({ success: true, logs: debugLogs });
  } catch (error: any) {
    debugLogs.push({ step: 'WEBHOOK_ERROR', data: { error: error.message, stack: error.stack } });
    console.error('Telegram Webhook Error:', error);
    // Always return 200 to Telegram so it doesn't retry infinitely
    return NextResponse.json({ success: true, logs: debugLogs });
  }
}
