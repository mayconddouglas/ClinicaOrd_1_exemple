import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ORCHESTRATOR_INSTRUCTION,
  AGENT_INSTRUCTIONS,
  TOOL_ROUTING,
  toolDeclarations,
  executeTool
} from '../../../lib/ai-agent';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_GEMINI_API_KEY não configurada.' }, { status: 500 });
    }

    const body = await req.json();
    const { history, message } = body as {
      history: { role: string; parts: { text: string }[] }[];
      message: string;
    };

    if (!message) {
      return NextResponse.json({ error: 'Mensagem não fornecida.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. ORQUESTRAÇÃO: Descobrir a intenção
    const orchestratorPrompt = `Histórico da conversa:\n${JSON.stringify(history.slice(-4))}\n\nMensagem atual do usuário: "${message}"`;
    
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

    // Limpar a resposta para garantir que pegamos apenas a string
    let intent = orchestratorResponse.text?.replace(/["\n\r]/g, '').trim() || 'GERAL';
    
    // Fallback de segurança
    if (!['AGENDAMENTO', 'TRIAGEM', 'MEDICOS', 'FAQ', 'POS_CONSULTA', 'GERAL'].includes(intent)) {
      intent = 'GERAL';
    }

    console.log(`[Orquestrador] Intenção detectada: ${intent}`);

    // 2. SELEÇÃO DO SUBAGENTE
    const agentInstruction = AGENT_INSTRUCTIONS[intent as keyof typeof AGENT_INSTRUCTIONS];
    const allowedToolsNames = TOOL_ROUTING[intent as keyof typeof TOOL_ROUTING];
    const agentTools = toolDeclarations.filter(t => allowedToolsNames.includes(t.name));

    // 3. EXECUÇÃO DO SUBAGENTE
    const session = ai.chats.create({
      model: 'gemini-3-flash-preview',
      history: history.length > 0 ? history : undefined,
      config: {
        systemInstruction: agentInstruction,
        temperature: 0.2,
        tools: agentTools.length > 0 ? [{ functionDeclarations: agentTools }] : undefined,
      },
    });

    let currentMessage: any = { message };
    let finalText = '';

    for (let i = 0; i < 10; i++) {
      const response = await session.sendMessage(currentMessage);

      const functionCalls = response.functionCalls ?? [];

      if (functionCalls.length > 0) {
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
        break;
      }
    }

    return NextResponse.json({ text: finalText, intent });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
