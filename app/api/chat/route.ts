import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getDynamicOrchestratorInstruction,
  getDynamicAgentInstructions,
  TOOL_ROUTING,
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
    // A interface do Web Chat envia { history: [{role: 'user', parts: [{text: '...'}]}], message: '...' }
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

    const ORCHESTRATOR_INSTRUCTION = await getDynamicOrchestratorInstruction();
    const AGENT_INSTRUCTIONS = await getDynamicAgentInstructions();

    // 1. ORQUESTRAÇÃO: Descobrir a intenção (usando modelo rápido do OpenRouter)
    const orchestratorPrompt = `Histórico da conversa:\n${JSON.stringify(history.slice(-10))}\n\nMensagem atual do usuário: "${message}"`;
    
    const orchestratorResponse = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: ORCHESTRATOR_INSTRUCTION },
        { role: 'user', content: orchestratorPrompt }
      ],
      temperature: 0.1,
    });

    let intentText = orchestratorResponse.choices[0].message.content?.replace(/["\n\r]/g, '').trim().toUpperCase() || 'GERAL';
    
    // Fallback de segurança
    const validIntents = ['AGENDAMENTO', 'TRIAGEM', 'MEDICOS', 'FAQ', 'POS_CONSULTA', 'GERAL'];
    let intent = 'GERAL';
    for (const valid of validIntents) {
      if (intentText.includes(valid)) {
        intent = valid;
        break;
      }
    }

    console.log(`[Orquestrador via OpenRouter] Intenção detectada: ${intent}`);

    // 2. SELEÇÃO DO SUBAGENTE E CONVERSÃO DE MENSAGENS
    const agentInstruction = AGENT_INSTRUCTIONS[intent as keyof typeof AGENT_INSTRUCTIONS] || AGENT_INSTRUCTIONS.GERAL;
    const allowedToolsNames = TOOL_ROUTING[intent as keyof typeof TOOL_ROUTING] || [];
    const agentTools = toolDeclarations.filter(t => t.function?.name && allowedToolsNames.includes(t.function.name));

    // Converter histórico do formato Gemini para o formato OpenAI/OpenRouter
    const openRouterMessages: any[] = [
      { role: 'system', content: agentInstruction }
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

    // 3. EXECUÇÃO DO SUBAGENTE (LOOP DE TOOLS)
    let finalText = '';
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      const generateParams: any = {
        model: 'openai/gpt-4o-mini', // Modelo de chat
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

    return NextResponse.json({ text: finalText, intent });
  } catch (error: any) {
    console.error('Chat API error via OpenRouter:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
