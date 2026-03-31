import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai';
import { getSetting, getTelegramHistory, appendChatMessages } from '@/lib/db-tools';
import { supabaseServer } from '@/lib/supabase-server';
import {
  ORCHESTRATOR_INSTRUCTION,
  AGENT_INSTRUCTIONS,
  TOOL_ROUTING,
  toolDeclarations,
  executeTool
} from '@/lib/ai-agent';

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

    // 3. Orchestrator Logic
    const ai = new GoogleGenAI({ apiKey });
    const orchestratorPrompt = `Histórico da conversa:\n${JSON.stringify(history.slice(-4))}\n\nMensagem atual do usuário: "${userText}"`;

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

    await logStep('INTENT_DETECTED', { intent });

    // 4. Subagent Logic
    const agentInstruction = AGENT_INSTRUCTIONS[intent as keyof typeof AGENT_INSTRUCTIONS];
    const allowedToolsNames = TOOL_ROUTING[intent as keyof typeof TOOL_ROUTING];
    const agentTools = toolDeclarations.filter(t => t.name && allowedToolsNames.includes(t.name));

    const session = ai.chats.create({
      model: 'gemini-3-flash-preview',
      history: history.length > 0 ? history : undefined,
      config: {
        systemInstruction: agentInstruction,
        temperature: 0.2,
        tools: agentTools.length > 0 ? [{ functionDeclarations: agentTools }] : undefined,
      },
    });

    let currentMessage: any = { message: userText };
    let responseText = '';

    for (let i = 0; i < 10; i++) {
      await logStep('SENDING_MESSAGE_TO_AI', { iteration: i, currentMessage });
      const response = await session.sendMessage(currentMessage);
      const functionCalls = response.functionCalls ?? [];

      if (functionCalls.length > 0) {
        await logStep('FUNCTION_CALLS', { functionCalls });
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
        responseText = response.text ?? '';
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