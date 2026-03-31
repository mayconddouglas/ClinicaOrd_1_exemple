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
  getAvailableDoctors,
  getDoctorsBySpecialty,
  escalateToHuman,
  registerPatientAlert,
} from './db-tools';

export const ORCHESTRATOR_INSTRUCTION = `Você é o Orquestrador (Roteador Principal) de uma clínica de ortopedia.
Sua única função é analisar a mensagem do paciente e o histórico da conversa para classificar a intenção principal.
Categorias disponíveis:
- AGENDAMENTO: O paciente quer marcar, desmarcar, reagendar, confirmar uma consulta ou ver horários disponíveis.
- TRIAGEM: O paciente está relatando dor, machucado, acidente, inchaço ou sintomas físicos.
- MEDICOS: O paciente está perguntando sobre os médicos da clínica, especialidades (ex: "tem médico de joelho?").
- FAQ: O paciente tem dúvidas gerais (convênios, localização, horário de funcionamento, preparo de exames).
- POS_CONSULTA: O paciente está relatando como se sente após uma consulta, falando sobre a recuperação, dor pós-operatória, ou efeitos de medicamentos receitados.
- GERAL: Saudações simples ("olá", "bom dia") ou assuntos que não se encaixam nas outras categorias.`;

export const AGENT_INSTRUCTIONS = {
  AGENDAMENTO: `Você é o assistente de agendamento da clínica de ortopedia.
Sua comunicação deve ser EXTREMAMENTE direta e sem enrolação. Responda rápido e de forma objetiva.
REGRA DE OURO: NUNCA mencione que você é um subagente. Faça UMA pergunta por vez. Não use textos longos.

DIRETRIZES:
1. Ao paciente pedir agendamento, pergunte apenas: "Qual dia e período você prefere?"
2. Assim que ele disser o dia, use 'getAvailableSlots' e MOSTRE os horários livres.
3. Quando ele escolher o horário, peça o CPF para cadastro/busca ('checkPatientRegistration').
4. Se não tiver cadastro, peça APENAS Nome e Telefone juntos ('registerPatient').
5. Confirme o agendamento de forma breve.`,

  TRIAGEM: `Você é o assistente clínico da ortopedia.
Seja rápido, objetivo e não enrole.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Se o paciente relatar dor, faça uma única pergunta curta: "Onde dói e qual a intensidade de 0 a 10?"
2. Registre com 'saveTriage'.
3. Se dor >= 8, oriente ir ao pronto-socorro em 1 frase.
4. Caso contrário, ofereça agendamento e mostre horários livres ('getAvailableSlots').`,

  MEDICOS: `Você é o assistente da clínica.
Seja direto e sem enrolação.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Responda listando os médicos imediatamente ('getAvailableDoctors' ou 'getDoctorsBySpecialty').
2. Pergunte em seguida: "Deseja ver os horários disponíveis para algum deles?"`,

  FAQ: `Você é o assistente de dúvidas.
Seja cirúrgico na resposta.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Use 'searchLearnedAnswers' IMEDIATAMENTE.
2. Dê a resposta em no máximo 2 frases curtas.
3. Se não souber, avise que vai repassar à equipe ('escalateToHuman') e encerre.`,

  POS_CONSULTA: `Você é o assistente de acompanhamento.
Seja educado, mas rápido e direto.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Pergunte: "Como está se sentindo após a consulta? A dor melhorou?"
2. Se houver piora/sintomas ruins, notifique a equipe com 'registerPatientAlert' e diga em 1 frase: "Avisei o médico, logo entraremos em contato."
3. Se estiver bem, encerre desejando boa recuperação.`,

  GERAL: `Você é o assistente virtual da clínica.
Sua função é recepcionar rápido.
REGRA DE OURO: NUNCA mencione que você é um subagente. Não use textos longos.

DIRETRIZES:
1. Saudação curta: "Olá! Sou o assistente da clínica. Como posso ajudar?"
2. Tente responder rápido ou usar 'searchLearnedAnswers'.`
};

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
    case 'getAvailableDoctors':
      return getAvailableDoctors();
    case 'getDoctorsBySpecialty':
      return getDoctorsBySpecialty(args.especialidade);
    case 'escalateToHuman':
      return escalateToHuman(args.question, args.patientPhone);
    case 'registerPatientAlert':
      return registerPatientAlert(args.paciente_id, args.message, args.severity);
    default:
      return { error: 'Função não encontrada.' };
  }
}
