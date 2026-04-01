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
  getClinicSettings,
  getClinicServices,
  createInvoiceLink,
  getFinancialMetrics,
  getAppointmentsMetrics,
  blockDoctorAgenda,
  cancelPendingInvoices,
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
    AGENDAMENTO: `Você é o consultor comercial e agendador da ${clinicName}.
Seu objetivo é marcar consultas de forma rápida, mas também atuar proativamente oferecendo as melhores opções de tratamentos (UPSELL) e pacotes.

Regras:
1. Sempre pergunte primeiro qual a especialidade ou o motivo da consulta.
2. Liste os horários ou médicos disponíveis (ferramentas 'getAvailableDoctors' ou 'getAvailableSlots').
3. Quando ele escolher o horário, peça o CPF para cadastro/busca ('checkPatientRegistration').
4. Se não tiver cadastro, peça Nome, Telefone e E-mail ('registerPatient'). O e-mail é essencial para enviarmos o lembrete da consulta.
5. IMPORTANTE - ESTRATÉGIA DE UPSELL (Venda Consultiva): Antes de fechar o agendamento de um serviço avulso (ex: Limpeza, Avaliação), consulte obrigatoriamente o catálogo da clínica usando 'getClinicServices'.
   - Se houver um "Pacote" ou tratamento mais completo que inclua o que ele pediu (ex: "Pacote Sorriso Perfeito" que inclui Limpeza + Clareamento), ofereça educadamente mostrando o custo-benefício. Exemplo: "Notei que você quer uma Limpeza (R$ 150), mas nós temos um Pacote Premium por R$ 250 que já inclui o Clareamento. Gostaria de aproveitar?"
   - Se o paciente aceitar o pacote, você agenda o pacote. Se ele recusar, prossiga apenas com o serviço inicial.
6. Você pode criar um carrinho com múltiplos serviços e aplicar descontos. Para isso, passe a lista de serviços na propriedade 'items' da ferramenta 'createInvoiceLink'.
7. Após confirmar o horário com o paciente, se houver custo (serviço PAGO), use a ferramenta 'createInvoiceLink' para gerar o link de pagamento do Mercado Pago e envie-o para o paciente pagar e garantir a vaga.
8. Se for totalmente GRATUITO (ou se o desconto zerar a conta), use a mesma ferramenta e ela vai confirmar direto sem cobrar.
9. Ao finalizar, envie um resumo confirmando o horário. Nunca diga que você é um subagente.`,

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
2. Tente responder rápido ou usar 'searchLearnedAnswers'.`,

    COPILOT_ADMIN: `Você é o Diretor Executivo (Copilot) do Dashboard da ${clinicName}.
Seu usuário é o Dono/Administrador da clínica. Você não fala com pacientes.
Sua função é gerenciar o ERP, fornecer relatórios em tempo real e executar tarefas operacionais.

Ferramentas disponíveis e quando usar:
- getFinancialMetrics: Quando o dono perguntar "quanto faturamos?", "quantas faturas pendentes?".
- getAppointmentsMetrics: Quando perguntar "como está a agenda hoje?", "quantos pacientes vêm?".
- blockDoctorAgenda: Quando o dono disser "O Dr. X vai faltar", "Bloqueie a agenda do médico Y amanhã". Você pode bloquear e cancelar as consultas daquele dia automaticamente.
- cancelPendingInvoices: Para limpeza de sistema ("Cancele faturas antigas", "Limpe faturas pendentes há mais de 2 dias").
- createInvoiceLink / scheduleAppointment: Você também pode gerar links de cobrança e marcar pacientes se o administrador pedir para você fazer isso por ele.

Regras de Ouro:
1. Seja analítico, rápido e proativo.
2. Formate dados financeiros usando "R$".
3. Formate relatórios em listas com bullet points.
4. Antes de cancelar ou bloquear agendas, confirme o nome do médico, a menos que ele já tenha sido bem específico na frase.`
  };
}

export const TOOL_ROUTING = {
  AGENDAMENTO: ['checkPatientRegistration', 'registerPatient', 'scheduleAppointment', 'getAvailableSlots', 'checkAvailability', 'getPatientAppointments', 'cancelAppointment', 'rescheduleAppointment', 'sendAppointmentSummary', 'getAvailableDoctors', 'getDoctorsBySpecialty', 'getClinicServices', 'createInvoiceLink'],
  TRIAGEM: ['saveTriage', 'getAvailableSlots', 'checkPatientRegistration', 'registerPatient', 'scheduleAppointment'],
  MEDICOS: ['getAvailableDoctors', 'getDoctorsBySpecialty', 'getAvailableSlots'],
  FAQ: ['searchLearnedAnswers', 'saveLearnedAnswer', 'escalateToHuman'],
  POS_CONSULTA: ['registerPatientAlert', 'checkPatientRegistration'],
  GERAL: ['searchLearnedAnswers'],
  COPILOT_ADMIN: [
    'getFinancialMetrics', 
    'getAppointmentsMetrics', 
    'blockDoctorAgenda', 
    'cancelPendingInvoices', 
    'getClinicServices', 
    'createInvoiceLink',
    'getAvailableDoctors',
    'checkPatientRegistration',
    'scheduleAppointment'
  ]
};

export const toolDeclarations = [
  {
    type: 'function',
    function: {
      name: 'checkPatientRegistration',
      description: 'Verifica se um paciente já está cadastrado no banco de dados da clínica usando CPF, Nome ou Telefone.',
      parameters: {
        type: 'object',
        properties: {
          cpf: { type: 'string', description: 'O CPF do paciente.' },
          nome: { type: 'string', description: 'O nome do paciente para busca aproximada.' },
          telefone: { type: 'string', description: 'O telefone do paciente.' },
        },
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'registerPatient',
      description: 'Cadastra um novo paciente no banco de dados da clínica.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome completo do paciente.' },
          cpf: { type: 'string', description: 'CPF do paciente.' },
          telefone: { type: 'string', description: 'Telefone de contato do paciente.' },
          email: { type: 'string', description: 'E-mail do paciente para receber notificações.' },
          data_nascimento: { type: 'string', description: 'Data de nascimento no formato YYYY-MM-DD.' },
        },
        required: ['nome', 'telefone'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'scheduleAppointment',
      description: 'Agenda uma nova consulta para um paciente já cadastrado.',
      parameters: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string', description: 'O ID (UUID) do paciente.' },
          data_hora: { type: 'string', description: 'Data e hora no formato ISO 8601.' },
          motivo: { type: 'string', description: 'Motivo da consulta.' },
          especialidade: { type: 'string', description: 'Especialidade médica desejada.' },
        },
        required: ['paciente_id', 'data_hora'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'saveTriage',
      description: 'Salva os dados de uma triagem inicial de um paciente.',
      parameters: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string', description: 'O ID (UUID) do paciente.' },
          pain_scale: { type: 'integer', description: 'Escala de dor de 0 a 10.' },
          symptoms: { type: 'string', description: 'Descrição dos sintomas.' },
          red_flags: { type: 'string', description: 'Sinais de alerta graves.' },
          urgency_classification: { type: 'string', description: 'Classificação de urgência.' },
        },
        required: ['paciente_id', 'pain_scale', 'symptoms'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchLearnedAnswers',
      description: 'Busca respostas aprendidas para perguntas frequentes.',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Palavra-chave da pergunta.' },
        },
        required: ['keyword'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'saveLearnedAnswer',
      description: 'Salva uma nova pergunta e resposta no banco de dados.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'A pergunta do usuário.' },
          answer: { type: 'string', description: 'A resposta formulada.' },
          category: { type: 'string', description: 'Categoria da pergunta.' },
        },
        required: ['question', 'answer', 'category'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAvailableSlots',
      description: 'Busca todos os horários disponíveis em uma data específica.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Data no formato YYYY-MM-DD.' },
        },
        required: ['date'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkAvailability',
      description: 'Verifica se um horário específico está disponível.',
      parameters: {
        type: 'object',
        properties: {
          data_hora: { type: 'string', description: 'Data e hora no formato ISO 8601.' },
        },
        required: ['data_hora'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPatientAppointments',
      description: 'Busca todas as consultas ativas de um paciente.',
      parameters: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string', description: 'O ID (UUID) do paciente.' },
        },
        required: ['paciente_id'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancelAppointment',
      description: 'Cancela uma consulta existente.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'O ID (UUID) da consulta.' },
        },
        required: ['appointment_id'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'rescheduleAppointment',
      description: 'Reagenda uma consulta para um novo horário.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'O ID (UUID) da consulta.' },
          new_data_hora: { type: 'string', description: 'Nova data e hora no formato ISO 8601.' },
        },
        required: ['appointment_id', 'new_data_hora'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'sendAppointmentSummary',
      description: 'Gera e simula o envio de um resumo da consulta ao paciente.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'O ID (UUID) da consulta.' },
        },
        required: ['appointment_id'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAvailableDoctors',
      description: 'Busca todos os médicos disponíveis na clínica.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getDoctorsBySpecialty',
      description: 'Busca médicos disponíveis por especialidade (ex: Joelho, Coluna, Ortopedia Geral).',
      parameters: {
        type: 'object',
        properties: {
          especialidade: { type: 'string', description: 'A especialidade médica desejada.' },
        },
        required: ['especialidade'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'getClinicServices',
      description: 'Retorna a lista de serviços e pacotes da clínica, com os preços e informando se o serviço é gratuito (is_free). Chame antes de criar o link de cobrança.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createInvoiceLink',
      description: 'Gera e retorna um link de pagamento (Mercado Pago) para um ou múltiplos serviços, ou agenda diretamente se for gratuito/desconto 100%.',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'string' },
          patient_name: { type: 'string' },
          patient_email: { type: 'string' },
          service_id: { type: 'string', description: 'ID do serviço (se for apenas um)' },
          service_name: { type: 'string', description: 'Nome do serviço (se for apenas um)' },
          amount: { type: 'number', description: 'Valor (se for apenas um)' },
          is_free: { type: 'boolean', description: 'É gratuito? (se for apenas um)' },
          items: {
            type: 'array',
            description: 'Lista de múltiplos serviços (carrinho/pacote). Use isso em vez de service_id/service_name se o paciente comprar mais de um serviço.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
                is_free: { type: 'boolean' }
              }
            }
          },
          discount: { type: 'number', description: 'Desconto aplicado ao valor total (em Reais)' },
          appointment_date_time: { type: 'string', description: 'Data e hora ISO da consulta se for agendada' },
          appointment_medico_id: { type: 'string' },
          appointment_medico_nome: { type: 'string' },
          appointment_especialidade: { type: 'string' },
        },
        required: ['patient_id', 'patient_name'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'escalateToHuman',
      description: 'Envia uma pergunta específica que a IA não soube responder para a equipe humana da clínica responder.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'A pergunta exata do paciente.' },
          patientPhone: { type: 'string', description: 'O telefone ou identificador do paciente (opcional).' },
        },
        required: ['question'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'registerPatientAlert',
      description: 'Registra um alerta médico urgente para a equipe da clínica sobre o estado de um paciente pós-consulta.',
      parameters: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string', description: 'O identificador do paciente (ID, CPF ou Telefone).' },
          message: { type: 'string', description: 'A mensagem de alerta descrevendo os sintomas ou problema.' },
          severity: { type: 'string', description: 'Nível de gravidade: "alta", "media" ou "baixa".' },
        },
        required: ['paciente_id', 'message', 'severity'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'getFinancialMetrics',
      description: 'Obtém o faturamento financeiro de hoje, faturamento do mês, e os recebíveis pendentes (não pagos) do dashboard.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAppointmentsMetrics',
      description: 'Obtém o total de agendamentos para o dia de hoje, mostrando os confirmados, pendentes, cancelados e a lista de pacientes e médicos.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'blockDoctorAgenda',
      description: 'Bloqueia a agenda de um médico (torna indisponível) e opcionalmente cancela os agendamentos pendentes ou confirmados de um dia específico.',
      parameters: {
        type: 'object',
        properties: {
          medico_id: { type: 'string' },
          medico_nome: { type: 'string' },
          cancel_appointments_date: { type: 'string', description: "Data ISO (YYYY-MM-DD) para cancelar os agendamentos do médico neste dia." }
        }
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'cancelPendingInvoices',
      description: 'Varre o sistema e cancela as faturas que estão pendentes há muito tempo, liberando as vagas na agenda.',
      parameters: {
        type: 'object',
        properties: {
          days_old: { type: 'number', description: "Cancelar faturas com mais de X dias pendentes. Padrão: 1" }
        }
      },
    }
  }
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
      case 'getClinicServices':
        return await getClinicServices();
      case 'createInvoiceLink':
        return await createInvoiceLink(args);
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
      case 'getFinancialMetrics':
        return await getFinancialMetrics();
      case 'getAppointmentsMetrics':
        return await getAppointmentsMetrics();
      case 'blockDoctorAgenda':
        return await blockDoctorAgenda(args);
      case 'cancelPendingInvoices':
        return await cancelPendingInvoices(args.days_old);
      default:
        return { error: 'Função não encontrada.' };
    }
  } catch (error: any) {
    console.error(`Erro de validação na ferramenta ${name}:`, error);
    return { error: `Parâmetros inválidos para a função ${name}. ${error.message || ''}` };
  }
}
