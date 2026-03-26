import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, FunctionDeclaration } from '@google/genai';
import { getDashboardKPIs, getRecentAppointments, getUrgentTriages, getMedicos } from '../../../lib/dashboard-tools';

const SYSTEM_INSTRUCTION = `Você é o **Copiloto OrthoAdmin**, um assistente de IA exclusivo para a equipe médica e recepcionistas da clínica de ortopedia.
Seu objetivo é ajudar a equipe a extrair informações do banco de dados, resumir triagens, verificar a agenda e auxiliar na gestão.
Responda de forma profissional, técnica (pode usar jargões médicos, pois está falando com a equipe) e direta.

FERRAMENTAS DISPONÍVEIS:
- 'getDashboardKPIs': Para ver o resumo do dia.
- 'getRecentAppointments': Para ver a agenda geral.
- 'getUrgentTriages': Para ver pacientes com dor ou red flags.
- Você também pode responder dúvidas gerais sobre a clínica.

Seja prestativo e forneça resumos claros e estruturados.`;

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'getDashboardKPIs',
    description: 'Obtém os indicadores principais do dia (total de consultas, triagens urgentes, FAQs aprendidas).',
  },
  {
    name: 'getRecentAppointments',
    description: 'Busca as próximas consultas agendadas na clínica.',
  },
  {
    name: 'getUrgentTriages',
    description: 'Busca as triagens recentes, ordenadas por nível de dor e urgência.',
  },
  {
    name: 'getMedicos',
    description: 'Lista todos os médicos cadastrados na clínica, com nome, CRM, especialidade e disponibilidade.',
  },
];

async function executeTool(name: string): Promise<any> {
  switch (name) {
    case 'getDashboardKPIs':
      return getDashboardKPIs();
    case 'getRecentAppointments':
      return getRecentAppointments();
    case 'getUrgentTriages':
      return getUrgentTriages();
    case 'getMedicos':
      return getMedicos();
    default:
      return { error: 'Função não encontrada.' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada.' }, { status: 500 });
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

    const session = ai.chats.create({
      model: 'gemini-2.0-flash',
      history: history.length > 0 ? history : undefined,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        tools: [{ functionDeclarations: toolDeclarations }],
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
            const result = await executeTool(call.name);
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

    return NextResponse.json({ text: finalText });
  } catch (error: any) {
    console.error('Copilot API error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
