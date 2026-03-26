import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import {
  checkPatientRegistration,
  registerPatient,
  scheduleAppointment,
  saveTriage,
  searchLearnedAnswers,
  saveLearnedAnswer,
  checkAvailability,
  getAvailableSlots,
  getPatientAppointments,
  cancelAppointment,
  rescheduleAppointment,
  sendAppointmentSummary,
} from '../../../lib/db-tools';

const SYSTEM_INSTRUCTION = `Você é o **OrthoAI**, o assistente virtual inteligente e super rápido de uma clínica de ortopedia.
Sua comunicação deve ser extremamente direta, empática, simples e voltada para o público leigo (pacientes).
Seu objetivo principal é resolver o problema do paciente com o MÍNIMO de perguntas possível. Evite burocracia.

REGRA DE OURO: NUNCA mencione sua arquitetura interna, ferramentas, "subagentes" ou processos para o usuário. Você processa tudo internamente de forma invisível. NUNCA faça mais de uma pergunta por mensagem.

DIRETRIZES DE ATENDIMENTO (Foco em Rapidez e Menos Atrito):

1. Dúvidas Gerais e Aprendizado (Prioridade Máxima para Leigos):
   - Se o paciente fizer uma pergunta geral (ex: "aceita convênio?", "qual o horário de funcionamento?", "onde fica a clínica?"), NÃO peça CPF, nome ou telefone.
   - Use a ferramenta 'searchLearnedAnswers' IMEDIATAMENTE. Se encontrar a resposta, entregue na hora de forma natural.
   - Se não encontrar, responda com base no seu conhecimento geral de uma clínica ortopédica e use a ferramenta 'saveLearnedAnswer' para salvar essa nova pergunta e resposta no banco de dados. Assim você aprende para a próxima vez.

2. Agendamento de Consultas (Mostre valor antes de pedir dados):
   - Se o paciente pedir para agendar, pergunte apenas a preferência de dia/turno e o motivo (ex: "Claro! Para qual dia e turno você prefere? E qual o motivo da consulta?").
   - Assim que ele disser o dia, use 'getAvailableSlots' e MOSTRE os horários livres PRIMEIRO (ex: "Tenho horários livres amanhã às 09:00 e 10:30. Qual você prefere?").
   - APENAS QUANDO ele escolher o horário, peça a identificação: "Ótimo! Para confirmar esse horário, qual o seu CPF ou Telefone?" ('checkPatientRegistration').
   - Se não tiver cadastro, peça o Nome e Telefone juntos ('registerPatient').
   - Após identificar/cadastrar, use 'scheduleAppointment' para agendar e 'sendAppointmentSummary' para confirmar.

3. Cancelamento e Reagendamento:
   - Peça o CPF ou Telefone de forma amigável ('checkPatientRegistration').
   - Use 'getPatientAppointments' para listar as consultas.
   - Para cancelar, use 'cancelAppointment'.
   - Para reagendar, busque os horários livres com 'getAvailableSlots' e use 'rescheduleAppointment'.

4. Triagem Oculta (Relato de Dor/Sintomas):
   - Se o paciente relatar dor, seja muito acolhedor. Faça no máximo UMA pergunta dupla curta (ex: "Sinto muito que esteja com dor. Onde exatamente dói e qual a intensidade de 0 a 10?").
   - Registre com 'saveTriage'. Se a dor for >= 8 ou houver sinais graves (fratura), oriente a buscar um pronto-socorro.
   - Caso contrário, ofereça agendamento imediato já mostrando os horários livres de hoje/amanhã ('getAvailableSlots').

5. Regras de Ouro da Conversa:
   - Linguagem Simples: Zero jargões médicos. Fale como um humano prestativo.
   - Proatividade: Se o paciente disser "quero para amanhã de manhã", não pergunte o horário. Já busque os horários ('getAvailableSlots') e ofereça as opções.
   - Respostas Curtas: Pessoas leigas não gostam de ler textos longos. Seja breve.

ESCOPO DE ATUAÇÃO:
- Agendamento, reagendamento e cancelamento de consultas.
- Avaliação inicial de sintomas (triagem oculta).
- Dúvidas gerais (horários, convênios, preparo de exames) com aprendizado contínuo.
- Suporte a médicos (prontuários, protocolos, laudos) - forneça respostas diretas quando solicitado por um profissional de saúde.

Lembre-se: Você é a interface amigável. Esconda a complexidade. Resolva o problema do usuário da forma mais rápida e fácil possível.`;

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'checkPatientRegistration',
    description: 'Verifica se um paciente já está cadastrado no banco de dados da clínica usando CPF, Nome ou Telefone.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cpf: { type: Type.STRING, description: 'O CPF do paciente.' },
        nome: { type: Type.STRING, description: 'O nome do paciente para busca aproximada.' },
        telefone: { type: Type.STRING, description: 'O telefone do paciente.' },
      },
    },
  },
  {
    name: 'registerPatient',
    description: 'Cadastra um novo paciente no banco de dados da clínica.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nome: { type: Type.STRING, description: 'Nome completo do paciente.' },
        cpf: { type: Type.STRING, description: 'CPF do paciente.' },
        telefone: { type: Type.STRING, description: 'Telefone de contato do paciente.' },
        data_nascimento: { type: Type.STRING, description: 'Data de nascimento no formato YYYY-MM-DD.' },
      },
      required: ['nome', 'cpf'],
    },
  },
  {
    name: 'scheduleAppointment',
    description: 'Agenda uma nova consulta para um paciente já cadastrado.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        paciente_id: { type: Type.STRING, description: 'O ID (UUID) do paciente.' },
        data_hora: { type: Type.STRING, description: 'Data e hora no formato ISO 8601.' },
        motivo: { type: Type.STRING, description: 'Motivo da consulta.' },
        especialidade: { type: Type.STRING, description: 'Especialidade médica desejada.' },
      },
      required: ['paciente_id', 'data_hora'],
    },
  },
  {
    name: 'saveTriage',
    description: 'Salva os dados de uma triagem inicial de um paciente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        paciente_id: { type: Type.STRING, description: 'O ID (UUID) do paciente.' },
        pain_scale: { type: Type.INTEGER, description: 'Escala de dor de 0 a 10.' },
        symptoms: { type: Type.STRING, description: 'Descrição dos sintomas.' },
        red_flags: { type: Type.STRING, description: 'Sinais de alerta graves.' },
        urgency_classification: { type: Type.STRING, description: 'Classificação de urgência.' },
      },
      required: ['paciente_id', 'pain_scale', 'symptoms'],
    },
  },
  {
    name: 'searchLearnedAnswers',
    description: 'Busca respostas aprendidas para perguntas frequentes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        keyword: { type: Type.STRING, description: 'Palavra-chave da pergunta.' },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'saveLearnedAnswer',
    description: 'Salva uma nova pergunta e resposta no banco de dados.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: 'A pergunta do usuário.' },
        answer: { type: Type.STRING, description: 'A resposta formulada.' },
        category: { type: Type.STRING, description: 'Categoria da pergunta.' },
      },
      required: ['question', 'answer', 'category'],
    },
  },
  {
    name: 'getAvailableSlots',
    description: 'Busca todos os horários disponíveis em uma data específica.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: 'Data no formato YYYY-MM-DD.' },
      },
      required: ['date'],
    },
  },
  {
    name: 'checkAvailability',
    description: 'Verifica se um horário específico está disponível.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        data_hora: { type: Type.STRING, description: 'Data e hora no formato ISO 8601.' },
      },
      required: ['data_hora'],
    },
  },
  {
    name: 'getPatientAppointments',
    description: 'Busca todas as consultas ativas de um paciente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        paciente_id: { type: Type.STRING, description: 'O ID (UUID) do paciente.' },
      },
      required: ['paciente_id'],
    },
  },
  {
    name: 'cancelAppointment',
    description: 'Cancela uma consulta existente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appointment_id: { type: Type.STRING, description: 'O ID (UUID) da consulta.' },
      },
      required: ['appointment_id'],
    },
  },
  {
    name: 'rescheduleAppointment',
    description: 'Reagenda uma consulta para um novo horário.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appointment_id: { type: Type.STRING, description: 'O ID (UUID) da consulta.' },
        new_data_hora: { type: Type.STRING, description: 'Nova data e hora no formato ISO 8601.' },
      },
      required: ['appointment_id', 'new_data_hora'],
    },
  },
  {
    name: 'sendAppointmentSummary',
    description: 'Gera e simula o envio de um resumo da consulta ao paciente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appointment_id: { type: Type.STRING, description: 'O ID (UUID) da consulta.' },
      },
      required: ['appointment_id'],
    },
  },
];

async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'checkPatientRegistration':
      return checkPatientRegistration(args.cpf, args.nome, args.telefone);
    case 'registerPatient':
      return registerPatient(args.nome, args.cpf, args.telefone, args.data_nascimento);
    case 'scheduleAppointment':
      return scheduleAppointment(args.paciente_id, args.data_hora, args.motivo, args.especialidade);
    case 'saveTriage':
      return saveTriage(args.paciente_id, args.pain_scale, args.symptoms, args.red_flags, args.urgency_classification);
    case 'searchLearnedAnswers':
      return searchLearnedAnswers(args.keyword);
    case 'saveLearnedAnswer':
      return saveLearnedAnswer(args.question, args.answer, args.category);
    case 'checkAvailability':
      return checkAvailability(args.data_hora);
    case 'getAvailableSlots':
      return getAvailableSlots(args.date);
    case 'getPatientAppointments':
      return getPatientAppointments(args.paciente_id);
    case 'cancelAppointment':
      return cancelAppointment(args.appointment_id);
    case 'rescheduleAppointment':
      return rescheduleAppointment(args.appointment_id, args.new_data_hora);
    case 'sendAppointmentSummary':
      return sendAppointmentSummary(args.appointment_id);
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

    return NextResponse.json({ text: finalText });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
