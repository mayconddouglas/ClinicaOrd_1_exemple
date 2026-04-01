import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { z } from 'zod';
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
  getAvailableDoctors,
  getDoctorsBySpecialty,
  escalateToHuman,
  registerPatientAlert,
  getClinicSettings
} from './db-tools';

export async function getDynamicOrchestratorInstruction() {
  const settings = await getClinicSettings();
  const clinicName = settings?.clinic_name || 'Clínica de Ortopedia';
  
  return `Você é o Orquestrador (Roteador Principal) da ${clinicName}.
Sua única função é analisar a mensagem do paciente e o histórico da conversa para classificar a intenção principal.
Categorias disponíveis:
- AGENDAMENTO: O paciente quer marcar, desmarcar, reagendar, confirmar uma consulta ou ver horários disponíveis.
- TRIAGEM: O paciente está relatando dor, machucado, acidente, inchaço ou sintomas físicos.
- MEDICOS: O paciente está perguntando sobre os médicos da clínica, especialidades (ex: "tem médico de joelho?").
- FAQ: O paciente tem dúvidas gerais (convênios, localização, horário de funcionamento, preparo de exames).
- POS_CONSULTA: O paciente está relatando como se sente após uma consulta, falando sobre a recuperação, dor pós-operatória, ou efeitos de medicamentos receitados.
- GERAL: Saudações simples ("olá", "bom dia") ou assuntos que não se encaixam nas outras categorias.`;
}

export async function getDynamicAgentInstructions() {
  const settings = await getClinicSettings();
  const clinicName = settings?.clinic_name || 'Clínica de Ortopedia';
  const welcomeMessage = settings?.welcome_message || 'Olá! Como posso ajudar?';

  return {
    AGENDAMENTO: `Você é o assistente de agendamento da ${clinicName}.
Sua comunicação deve ser EXTREMAMENTE direta e sem enrolação. Responda rápido e de forma objetiva.
REGRA DE OURO: NUNCA mencione que você é um subagente. Faça UMA pergunta por vez. Não use textos longos.

DIRETRIZES:
1. Ao paciente pedir agendamento, pergunte apenas: "Qual dia e período você prefere?"
2. Assim que ele disser o dia, use 'getAvailableSlots' e MOSTRE os horários livres.
3. Quando ele escolher o horário, peça o CPF para cadastro/busca ('checkPatientRegistration').
4. Se não tiver cadastro, peça Nome, Telefone e E-mail ('registerPatient'). O e-mail é essencial para enviarmos o lembrete da consulta.
5. ANTES de usar 'scheduleAppointment', mostre um resumo dos dados (Data, Hora, Médico/Especialidade) e PERGUNTE se ele confirma o agendamento.
6. Apenas chame 'scheduleAppointment' APÓS o paciente responder que confirma. Confirme o agendamento de forma breve e avise que ele receberá um e-mail de confirmação.`,

    TRIAGEM: `Você é o assistente clínico da ${clinicName}.
Seja rápido, objetivo e não enrole.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Se o paciente relatar dor, faça uma única pergunta curta: "Onde dói e qual a intensidade de 0 a 10?"
2. Registre com 'saveTriage'.
3. Se dor >= 8, oriente ir ao pronto-socorro em 1 frase.
4. Caso contrário, ofereça agendamento e mostre horários livres ('getAvailableSlots').`,

    MEDICOS: `Você é o assistente da ${clinicName}.
Seja direto e sem enrolação.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Responda listando os médicos imediatamente ('getAvailableDoctors' ou 'getDoctorsBySpecialty').
2. Pergunte em seguida: "Deseja ver os horários disponíveis para algum deles?"`,

    FAQ: `Você é o assistente de dúvidas da ${clinicName}.
Seja cirúrgico na resposta.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Use 'searchLearnedAnswers' IMEDIATAMENTE.
2. Dê a resposta em no máximo 2 frases curtas.
3. Se não souber, avise que vai repassar à equipe ('escalateToHuman') e encerre.`,

    POS_CONSULTA: `Você é o assistente de acompanhamento da ${clinicName}.
Seja educado, mas rápido e direto.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Pergunte: "Como está se sentindo após a consulta? A dor melhorou?"
2. Se houver piora/sintomas ruins, notifique a equipe com 'registerPatientAlert' e diga em 1 frase: "Avisei o médico, logo entraremos em contato."
3. Se estiver bem, encerre desejando boa recuperação.`,

    GERAL: `Você é o assistente virtual da ${clinicName}.
Sua função é recepcionar rápido.
REGRA DE OURO: NUNCA mencione que você é um subagente. Não use textos longos.

DIRETRIZES:
1. Saudação inicial: Baseie-se nesta mensagem da clínica: "${welcomeMessage}"
2. Tente responder rápido ou usar 'searchLearnedAnswers'.`
  };
}

export const TOOL_ROUTING = {
  AGENDAMENTO: ['checkPatientRegistration', 'registerPatient', 'scheduleAppointment', 'getAvailableSlots', 'checkAvailability', 'getPatientAppointments', 'cancelAppointment', 'rescheduleAppointment', 'sendAppointmentSummary', 'getAvailableDoctors', 'getDoctorsBySpecialty'],
  TRIAGEM: ['saveTriage', 'getAvailableSlots', 'checkPatientRegistration', 'registerPatient', 'scheduleAppointment'],
  MEDICOS: ['getAvailableDoctors', 'getDoctorsBySpecialty', 'getAvailableSlots'],
  FAQ: ['searchLearnedAnswers', 'saveLearnedAnswer', 'escalateToHuman'],
  POS_CONSULTA: ['registerPatientAlert', 'checkPatientRegistration'],
  GERAL: ['searchLearnedAnswers']
};

export const toolDeclarations: FunctionDeclaration[] = [
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
        email: { type: Type.STRING, description: 'E-mail do paciente para receber notificações.' },
        data_nascimento: { type: Type.STRING, description: 'Data de nascimento no formato YYYY-MM-DD.' },
      },
      required: ['nome', 'telefone'],
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
  {
    name: 'getAvailableDoctors',
    description: 'Busca todos os médicos disponíveis na clínica.',
  },
  {
    name: 'getDoctorsBySpecialty',
    description: 'Busca médicos disponíveis por especialidade (ex: Joelho, Coluna, Ortopedia Geral).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        especialidade: { type: Type.STRING, description: 'A especialidade médica desejada.' },
      },
      required: ['especialidade'],
    },
  },
  {
    name: 'escalateToHuman',
    description: 'Envia uma pergunta específica que a IA não soube responder para a equipe humana da clínica responder.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: 'A pergunta exata do paciente.' },
        patientPhone: { type: Type.STRING, description: 'O telefone ou identificador do paciente (opcional).' },
      },
      required: ['question'],
    },
  },
  {
    name: 'registerPatientAlert',
    description: 'Registra um alerta médico urgente para a equipe da clínica sobre o estado de um paciente pós-consulta.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        paciente_id: { type: Type.STRING, description: 'O identificador do paciente (ID, CPF ou Telefone).' },
        message: { type: Type.STRING, description: 'A mensagem de alerta descrevendo os sintomas ou problema.' },
        severity: { type: Type.STRING, description: 'Nível de gravidade: "alta", "media" ou "baixa".' },
      },
      required: ['paciente_id', 'message', 'severity'],
    },
  },
];

export async function executeTool(name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case 'checkPatientRegistration': {
        const schema = z.object({ cpf: z.string().optional(), nome: z.string().optional(), telefone: z.string().optional() });
        const validArgs = schema.parse(args);
        return await checkPatientRegistration(validArgs.cpf, validArgs.nome, validArgs.telefone);
      }
      case 'registerPatient': {
        const schema = z.object({ nome: z.string(), cpf: z.string().optional(), telefone: z.string().optional(), email: z.string().optional(), data_nascimento: z.string().optional() });
        const validArgs = schema.parse(args);
        return await registerPatient(validArgs.nome, validArgs.cpf || '', validArgs.telefone, validArgs.email, validArgs.data_nascimento);
      }
      case 'scheduleAppointment': {
        const schema = z.object({ paciente_id: z.string(), data_hora: z.string(), motivo: z.string().optional(), especialidade: z.string().optional() });
        const validArgs = schema.parse(args);
        return await scheduleAppointment(validArgs.paciente_id, validArgs.data_hora, validArgs.motivo, validArgs.especialidade);
      }
      case 'saveTriage': {
        const schema = z.object({ paciente_id: z.string(), pain_scale: z.number(), symptoms: z.string(), red_flags: z.string().optional(), urgency_classification: z.string().optional() });
        const validArgs = schema.parse(args);
        return await saveTriage(validArgs.paciente_id, validArgs.pain_scale, validArgs.symptoms, validArgs.red_flags, validArgs.urgency_classification);
      }
      case 'searchLearnedAnswers': {
        const schema = z.object({ keyword: z.string() });
        const validArgs = schema.parse(args);
        return await searchLearnedAnswers(validArgs.keyword);
      }
      case 'saveLearnedAnswer': {
        const schema = z.object({ question: z.string(), answer: z.string(), category: z.string() });
        const validArgs = schema.parse(args);
        return await saveLearnedAnswer(validArgs.question, validArgs.answer, validArgs.category);
      }
      case 'checkAvailability': {
        const schema = z.object({ data_hora: z.string() });
        const validArgs = schema.parse(args);
        return await checkAvailability(validArgs.data_hora);
      }
      case 'getAvailableSlots': {
        const schema = z.object({ date: z.string() });
        const validArgs = schema.parse(args);
        return await getAvailableSlots(validArgs.date);
      }
      case 'getPatientAppointments': {
        const schema = z.object({ paciente_id: z.string() });
        const validArgs = schema.parse(args);
        return await getPatientAppointments(validArgs.paciente_id);
      }
      case 'cancelAppointment': {
        const schema = z.object({ appointment_id: z.string() });
        const validArgs = schema.parse(args);
        return await cancelAppointment(validArgs.appointment_id);
      }
      case 'rescheduleAppointment': {
        const schema = z.object({ appointment_id: z.string(), new_data_hora: z.string() });
        const validArgs = schema.parse(args);
        return await rescheduleAppointment(validArgs.appointment_id, validArgs.new_data_hora);
      }
      case 'sendAppointmentSummary': {
        const schema = z.object({ appointment_id: z.string() });
        const validArgs = schema.parse(args);
        return await sendAppointmentSummary(validArgs.appointment_id);
      }
      case 'getAvailableDoctors':
        return await getAvailableDoctors();
      case 'getDoctorsBySpecialty': {
        const schema = z.object({ especialidade: z.string() });
        const validArgs = schema.parse(args);
        return await getDoctorsBySpecialty(validArgs.especialidade);
      }
      case 'escalateToHuman': {
        const schema = z.object({ question: z.string(), patientPhone: z.string().optional() });
        const validArgs = schema.parse(args);
        return await escalateToHuman(validArgs.question, validArgs.patientPhone);
      }
      case 'registerPatientAlert': {
        const schema = z.object({ paciente_id: z.string(), message: z.string(), severity: z.string().optional() });
        const validArgs = schema.parse(args);
        return await registerPatientAlert(validArgs.paciente_id, validArgs.message, validArgs.severity);
      }
      default:
        return { error: 'Função não encontrada.' };
    }
  } catch (error: any) {
    console.error(`Erro de validação na ferramenta ${name}:`, error);
    return { error: `Parâmetros inválidos para a função ${name}. ${error.message || ''}` };
  }
}
