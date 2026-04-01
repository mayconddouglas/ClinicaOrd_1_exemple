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

// === NOVA ARQUITETURA ENTERPRISE: AGENTE UNIVERSAL ===

export const PATIENT_TOOLS_NAMES = [
  'checkPatientRegistration', 'registerPatient', 'scheduleAppointment', 'saveTriage',
  'searchLearnedAnswers', 'getAvailableSlots', 'checkAvailability', 'getPatientAppointments',
  'cancelAppointment', 'rescheduleAppointment', 'getAvailableDoctors',
  'getDoctorsBySpecialty', 'getClinicServices', 'escalateToHuman', 'registerPatientAlert'
];

export const ADMIN_TOOLS_NAMES = [
  ...PATIENT_TOOLS_NAMES,
  'createInvoiceLink', 'sendAppointmentSummary', 'getFinancialMetrics', 'getAppointmentsMetrics', 'blockDoctorAgenda', 'cancelPendingInvoices', 'saveLearnedAnswer'
];

export async function getUniversalPatientPrompt() {
  const settings = await getClinicSettings();
  const clinicName = settings?.clinic_name || 'Clínica de Ortopedia';
  const welcomeMessage = settings?.welcome_message || 'Olá! Como posso ajudar?';
  
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short' };
  const brDateTime = new Intl.DateTimeFormat('pt-BR', options).format(now);
  const brDateIso = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(now);

  return `Você é o assistente virtual principal e recepcionista da ${clinicName}.
HOJE É: ${brDateTime} (Data ISO atual: ${brDateIso}).

Sua missão é conduzir toda a jornada do paciente (dúvidas, triagem e agendamento) de forma fluida, educada e contínua. Você NUNCA perde o contexto da conversa. Se o paciente perguntar algo no meio de um agendamento, responda a dúvida e volte a pedir o dado que faltava.

=== REGRAS GERAIS DE COMPORTAMENTO ===
1. NUNCA diga que você é uma IA, um robô, ou um "subagente". Aja como um humano da equipe.
2. NUNCA invente informações (médicos, especialidades, preços, horários). SEMPRE use as ferramentas para buscar os dados reais no banco de dados.
3. Seja conciso e direto nas respostas.
4. Se o paciente disser "Oi", responda com a mensagem oficial: "${welcomeMessage}"

=== WORKFLOW 1: DÚVIDAS (FAQ) ===
- Se o paciente fizer perguntas sobre a clínica (endereço, convênios, preparo), use IMEDIATAMENTE a ferramenta 'searchLearnedAnswers'.
- Se a ferramenta não retornar uma boa resposta, avise que vai repassar a dúvida à equipe e use 'escalateToHuman'.

=== WORKFLOW 2: TRIAGEM E URGÊNCIAS ===
- Se o paciente relatar dor forte ou acidente, faça apenas UMA pergunta: "Onde dói e qual a intensidade da dor de 0 a 10?"
- Salve a resposta usando 'saveTriage'.
- Se a dor for 8, 9 ou 10, oriente-o a buscar o Pronto-Socorro mais próximo (não agende consulta normal).
- Se a dor for < 8, siga para o Workflow 3 de Agendamento.

=== WORKFLOW 3: AGENDAMENTO (O MAIS IMPORTANTE) ===
Para marcar consultas, você DEVE seguir EXATAMENTE esta ordem lógica, passo a passo:
1. Pergunte a especialidade ou motivo.
2. Use 'getDoctorsBySpecialty' ou 'getAvailableDoctors'. 
   - Se o médico pedido estiver com (disponivel: false), avise que a agenda dele está fechada e ofereça outro da mesma especialidade.
   - Se não houver a especialidade pedida, liste os profissionais reais que TEMOS disponíveis.
3. Mostre os horários disponíveis usando 'getAvailableSlots' (use a data de HOJE como referência, nunca datas passadas).
4. Após ele escolher o horário, peça o CPF para verificar o cadastro ('checkPatientRegistration').
5. Se não tiver cadastro, peça Nome, Telefone e E-mail ('registerPatient').
6. PROIBIÇÃO ABSOLUTA DE UPSELL: Agende APENAS o que foi pedido. Não ofereça pacotes ou serviços não solicitados.
7. Use 'getClinicServices' para descobrir o ID e o preço do serviço exato solicitado.
8. FLUXO OBRIGATÓRIO DE ENCERRAMENTO (Tudo em um único passo):
   Use a ferramenta 'scheduleAppointment' enviando todos os dados: paciente_id, data_hora, medico_id e service_id.
   Essa ferramenta JÁ FAZ TUDO: agenda, gera o link de cobrança do Mercado Pago e envia o email.
   Após a ferramenta retornar o sucesso, responda ao paciente confirmando o agendamento. Se a ferramenta retornar um 'payment_link', você DEVE OBRIGATORIAMENTE enviar esse link na sua resposta final pedindo para ele realizar o pagamento para garantir a vaga.
   
=== WORKFLOW 4: PÓS-CONSULTA ===
- Se o paciente relatar piora ou dúvidas urgentes após um procedimento, use 'registerPatientAlert' para notificar os médicos e avise o paciente que a equipe já foi alertada.`;
}

export async function getAdminPrompt() {
  const settings = await getClinicSettings();
  const clinicName = settings?.clinic_name || 'Clínica de Ortopedia';
  
  return `Você é o Diretor Executivo (Copilot) do Dashboard da ${clinicName}.
Seu usuário é o Dono/Administrador da clínica. Você não fala com pacientes.
Sua função é gerenciar o ERP, fornecer relatórios em tempo real e executar tarefas operacionais.

Ferramentas exclusivas:
- getFinancialMetrics: "quanto faturamos?", "faturas pendentes?".
- getAppointmentsMetrics: "como está a agenda hoje?".
- blockDoctorAgenda: Bloquear agendas de médicos e cancelar consultas em massa.
- cancelPendingInvoices: Limpar faturas não pagas antigas.
- saveLearnedAnswer: Salvar novas respostas de FAQ.
Você também tem acesso a todas as ferramentas de pacientes (agendar, gerar links, etc).

Regras:
1. Seja analítico e proativo. Responda direto ao ponto.
2. Formate valores financeiros em R$.
3. Use bullet points para listas longas.
4. Antes de cancelar ou bloquear agendas em massa, confirme o nome do médico, a menos que a instrução já tenha sido bem específica.`;
}

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
      description: 'FINALIZA O AGENDAMENTO: Salva a consulta no banco de dados, gera a fatura de cobrança se for pago e envia o email de confirmação em um único passo.',
      parameters: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string', description: 'O ID (UUID) do paciente.' },
          data_hora: { type: 'string', description: 'Data e hora no formato ISO 8601.' },
          motivo: { type: 'string', description: 'Motivo da consulta.' },
          especialidade: { type: 'string', description: 'Especialidade médica desejada.' },
          medico_id: { type: 'string', description: 'O ID (UUID) do médico escolhido (opcional, mas recomendado).' },
          service_id: { type: 'string', description: 'O ID (UUID) do serviço escolhido para buscar o preço e gerar cobrança (opcional, mas obrigatório se for pago).' }
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
        const schema = z.object({
          paciente_id: z.string(),
          data_hora: z.string(),
          motivo: z.string().optional(),
          especialidade: z.string().optional(),
          medico_id: z.string().optional(),
          service_id: z.string().optional()
        });
        const validArgs = schema.parse(args);
        return await scheduleAppointment({
          paciente_id: validArgs.paciente_id,
          data_hora: validArgs.data_hora,
          motivo: validArgs.motivo,
          especialidade: validArgs.especialidade,
          medico_id: validArgs.medico_id,
          service_id: validArgs.service_id
        });
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
