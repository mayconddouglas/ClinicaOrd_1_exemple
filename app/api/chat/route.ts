import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getUniversalPatientPrompt,
  PATIENT_TOOLS_NAMES,
  toolDeclarations,
  executeTool
} from '../../../lib/ai-agent';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 });
    }

    const body = await req.json();
    const { history, message } = body as {
      history: { role: string; parts: { text: string }[] }[];
      message: string;
    };

    if (!message) {
      return NextResponse.json({ error: 'Mensagem não fornecida.' }, { status: 400 });
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "OrthoAdmin Web Chat",
      }
    });

    const AGENT_INSTRUCTION = await getUniversalPatientPrompt();
    const agentTools = toolDeclarations.filter(t => t.function?.name && PATIENT_TOOLS_NAMES.includes(t.function.name));

    // Converter histórico para o formato OpenAI
    const openRouterMessages: any[] = [
      { role: 'system', content: AGENT_INSTRUCTION }
    ];

    if (history && history.length > 0) {
      for (const msg of history) {
        openRouterMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.parts[0]?.text || ''
        });
      }
    }
    
    openRouterMessages.push({ role: 'user', content: message });

    // EXECUÇÃO DO AGENTE UNIVERSAL (LOOP DE TOOLS)
    let finalText = '';
    let iterations = 0;
    const MAX_ITERATIONS = 8;
    
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
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
        openRouterMessages.push(assistantMessage);

        for (const call of assistantMessage.tool_calls) {
          const functionName = (call as any).function?.name || 'unknown';
          const functionArgs = JSON.parse((call as any).function?.arguments || '{}');
          
          console.log(`[Web Chat] Calling tool via OpenRouter: ${functionName}`);
          
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
        break;
      }
    }

    return NextResponse.json({ text: finalText, intent: 'UNIVERSAL' });
  } catch (error: any) {
    console.error('Chat API error via OpenRouter:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
