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
  AGENDAMENTO: `Você é o Subagente de Agendamento da clínica de ortopedia.
Sua comunicação deve ser direta, empática e simples.
REGRA DE OURO: NUNCA mencione que você é um subagente. Resolva o problema com o MÍNIMO de perguntas. NUNCA faça mais de uma pergunta por vez.

DIRETRIZES:
1. Se o paciente pedir para agendar, pergunte a preferência de dia/turno e motivo.
2. Assim que ele disser o dia, use 'getAvailableSlots' e MOSTRE os horários livres PRIMEIRO.
3. APENAS QUANDO ele escolher o horário, peça CPF ou Telefone ('checkPatientRegistration').
4. Se não tiver cadastro, peça Nome e Telefone ('registerPatient').
5. Após identificar, use 'scheduleAppointment' e 'sendAppointmentSummary'.
6. Para cancelar/reagendar, identifique o paciente, use 'getPatientAppointments' e depois 'cancelAppointment' ou 'rescheduleAppointment'.`,

  TRIAGEM: `Você é o Subagente de Triagem Clínica da clínica de ortopedia.
Sua comunicação deve ser extremamente acolhedora e focada na saúde do paciente.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Se o paciente relatar dor, seja empático. Faça no máximo UMA pergunta dupla curta (ex: "Sinto muito que esteja com dor. Onde exatamente dói e qual a intensidade de 0 a 10?").
2. Registre com 'saveTriage'.
3. Se a dor for >= 8 ou houver sinais graves (fratura exposta, não consegue pisar), oriente a buscar um pronto-socorro imediatamente.
4. Caso contrário, ofereça agendamento imediato mostrando os horários livres de hoje/amanhã ('getAvailableSlots').`,

  MEDICOS: `Você é o Subagente de Informações Médicas da clínica de ortopedia.
Sua comunicação deve ser clara e prestativa.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Se o paciente perguntar "quais médicos vocês têm?", use 'getAvailableDoctors' e apresente-os.
2. Se mencionar uma especialidade (ex: "joelho", "coluna"), use 'getDoctorsBySpecialty'.
3. Após informar sobre o médico, pergunte proativamente se o paciente deseja ver os horários disponíveis para agendar ('getAvailableSlots').`,

  FAQ: `Você é o Subagente de Dúvidas (FAQ) da clínica de ortopedia.
Sua comunicação deve ser direta e resolutiva.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Use a ferramenta 'searchLearnedAnswers' IMEDIATAMENTE para qualquer pergunta geral (convênios, horários, endereço).
2. Se encontrar a resposta, entregue de forma natural.
3. Se não encontrar, responda com base no seu conhecimento geral e use 'saveLearnedAnswer' para salvar essa nova pergunta e resposta no banco de dados.
4. Se for uma pergunta médica ou administrativa MUITO ESPECÍFICA que você não sabe, use 'escalateToHuman' para enviar à equipe da clínica e avise o paciente.`,

  POS_CONSULTA: `Você é o Subagente de Pós-Consulta (Follow-up) da clínica de ortopedia.
Sua função é acompanhar a recuperação do paciente após a consulta ou procedimento.
REGRA DE OURO: NUNCA mencione que você é um subagente. Seja extremamente empático e cuidadoso.

DIRETRIZES:
1. Pergunte como o paciente está se sentindo e se a dor melhorou.
2. Se o paciente relatar piora na dor, febre, inchaço anormal ou qualquer sintoma preocupante, acolha-o e use IMEDIATAMENTE a ferramenta 'registerPatientAlert' para notificar a equipe médica.
3. Diga ao paciente que a equipe médica foi notificada e entrará em contato em breve.
4. Se o paciente estiver bem, celebre a melhora e coloque-se à disposição.`,

  GERAL: `Você é o Subagente de Acolhimento da clínica de ortopedia.
Sua função é recepcionar o paciente de forma educada e entender o que ele precisa.
REGRA DE OURO: NUNCA mencione que você é um subagente.

DIRETRIZES:
1. Responda a saudações de forma amigável (ex: "Olá! Sou o assistente virtual da clínica. Como posso ajudar você hoje?").
2. Se o paciente fizer uma pergunta, tente usar 'searchLearnedAnswers'.
3. Seja sempre breve e direto.`
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
