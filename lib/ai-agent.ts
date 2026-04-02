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
  smartSlotDiscovery,
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
  sendClinicLocation,
  savePatientFeedback,
  scheduleReturnAlert,
  generateAttendanceCertificate,
} from './db-tools';

// === NOVA ARQUITETURA ENTERPRISE: AGENTE UNIVERSAL ===

export const PATIENT_TOOLS_NAMES = [
  'checkPatientRegistration', 'registerPatient', 'scheduleAppointment', 'saveTriage',
  'searchLearnedAnswers', 'getAvailableSlots', 'checkAvailability', 'getPatientAppointments',
  'cancelAppointment', 'rescheduleAppointment', 'getAvailableDoctors',
  'getDoctorsBySpecialty', 'getClinicServices', 'escalateToHuman', 'registerPatientAlert',
  'sendClinicLocation', 'savePatientFeedback', 'scheduleReturnAlert', 'generateAttendanceCertificate',
  'smartSlotDiscovery'
];

export const ADMIN_TOOLS_NAMES = [
  ...PATIENT_TOOLS_NAMES,
  'createInvoiceLink', 'sendAppointmentSummary', 'getFinancialMetrics', 'getAppointmentsMetrics', 'blockDoctorAgenda', 'cancelPendingInvoices', 'saveLearnedAnswer'
];

export async function getUniversalPatientPrompt(patientContext?: any) {
  const settings = await getClinicSettings();
  const clinicName = settings?.clinic_name || 'Clínica de Ortopedia';
  const welcomeMessage = settings?.welcome_message || 'Olá! Como posso ajudar?';

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short' };
  const brDateTime = new Intl.DateTimeFormat('pt-BR', options).format(now);
  const brDateIso = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(now);

  let callerIdContext = '';
  if (patientContext && patientContext.paciente) {
    callerIdContext = `\n=== INFORMAÇÕES DO PACIENTE (CALLER ID) ===
Você já reconheceu este paciente pelo número de telefone! Use isso para dar uma saudação hiper-personalizada.
- Nome: ${patientContext.paciente.nome}
- ID do Paciente: ${patientContext.paciente.id}
`;
    if (patientContext.ultima_consulta) {
      const ultima = patientContext.ultima_consulta;
      callerIdContext += `- Última Consulta: ${ultima.data_hora} com Dr(a). ${ultima.medicos?.nome} (Especialidade: ${ultima.medicos?.especialidade})\n`;
      callerIdContext += `Se for a primeira mensagem do dia, surpreenda o paciente chamando-o pelo nome e, se fizer sentido, pergunte se o contato é referente ao acompanhamento da última consulta ou uma nova queixa.`;
    } else {
      callerIdContext += `Se for a primeira mensagem do dia, surpreenda o paciente chamando-o pelo nome e agradeça por escolher a ${clinicName}.`;
    }
  } else {
    callerIdContext = `\n=== INFORMAÇÕES DO PACIENTE ===
Paciente novo ou não reconhecido pelo número. Seja educado, apresente-se como assistente da clínica e pergunte o nome dele para iniciar o atendimento.`;
  }

  return `Você é o assistente virtual principal e recepcionista da ${clinicName}.
HOJE É: ${brDateTime} (Data ISO atual: ${brDateIso}).
${callerIdContext}

Sua missão é conduzir toda a jornada do paciente (dúvidas, triagem e agendamento) de forma fluida, educada e contínua. Você NUNCA perde o contexto da conversa. Se o paciente perguntar algo no meio de um agendamento, responda a dúvida e volte a pedir o dado que faltava.

=== REGRAS GERAIS DE COMPORTAMENTO ===
1. NUNCA diga que você é uma IA, um robô, ou um "subagente". Aja como um humano da equipe.
2. NUNCA invente informações (médicos, especialidades, preços, horários). SEMPRE use as ferramentas para buscar os dados reais no banco de dados.
3. Seja conciso e direto nas respostas.
4. Se o paciente disser "Oi", responda com a mensagem oficial: "${welcomeMessage}"

=== REGRAS DE OURO PARA USUÁRIOS LEIGOS E EMPATIA ===
1. NLP FAST SCHEDULING (Escuta Ativa): Se o paciente enviar uma mensagem longa contendo várias informações de uma vez (Ex: "Meu nome é João, CPF 123, quero marcar com o Dr. Pedro amanhã de tarde"), VOCÊ DEVE extrair todas essas informações imediatamente! NÃO faça perguntas sobre dados que o paciente já forneceu. Pule direto para a confirmação ou busca de horários.
2. REGRA DO PASSO A PASSO (Apenas se faltarem dados): Se o paciente NÃO forneceu os dados logo de cara, aí sim você deve pedir as informações uma por vez. Use mensagens curtas, claras e sem textos longos (máximo 3 a 4 linhas).
3. REGRA DO MENU NUMERADO: Sempre que precisar listar opções (médicos, especialidades ou horários disponíveis), use SEMPRE um menu numerado simples para facilitar a escolha.
   Exemplo de formato obrigatório:
   "Tenho esses horários disponíveis. Digite o número da opção desejada:
   1. Segunda-feira às 14:00
   2. Terça-feira às 09:00"
4. ACOLHIMENTO DE DOR: Sempre que o paciente relatar dor, desconforto ou tristeza, inicie a resposta com uma frase de empatia e acolhimento ANTES de fazer perguntas práticas (Ex: "Sinto muito que você esteja passando por isso. Vamos cuidar de você o mais rápido possível.").

=== WORKFLOW 1: DÚVIDAS (FAQ) E INFORMAÇÕES ===
- Se o paciente perguntar sobre o endereço, como chegar ou localização, use a ferramenta 'sendClinicLocation'.
- Se fizer outras perguntas sobre a clínica (convênios, preparo), use IMEDIATAMENTE a ferramenta 'searchLearnedAnswers'.
- Se a ferramenta não retornar uma boa resposta, avise que vai repassar a dúvida à equipe e use 'escalateToHuman'.

=== WORKFLOW 2: TRIAGEM E URGÊNCIAS ===
- Se o paciente relatar dor forte ou acidente, faça apenas UMA pergunta: "Onde dói e qual a intensidade da dor de 0 a 10?"
- Salve a resposta usando 'saveTriage'.
- Se a dor for 8, 9 ou 10, oriente-o a buscar o Pronto-Socorro mais próximo (não agende consulta normal).
- Se a dor for < 8, siga para o Workflow 3 de Agendamento.

=== WORKFLOW 3: AGENDAMENTO DE CONSULTA ===
Para marcar consultas, você DEVE seguir EXATAMENTE esta ordem lógica, passo a passo (não pule etapas):
  PASSO 1: Descubra o que o paciente quer e quando. (Ex: "Qual especialidade e para qual dia você gostaria?").
  PASSO 2: Use a ferramenta 'smartSlotDiscovery' passando a data desejada (e a especialidade, se informada). Ela retornará TODOS os médicos disponíveis e seus horários livres de uma vez só!
  PASSO 3: Apresente as opções ao paciente de forma clara e resumida. Ex: "Para amanhã, temos o Dr. João (Ortopedia) às 09:00 e 10:30, e a Dra. Maria às 14:00. Qual horário prefere?"
  PASSO 4: Se o paciente escolher um horário, você precisará dos dados dele. Use a ferramenta 'checkPatientRegistration' com o Nome ou CPF.
  PASSO 5: Se o paciente não existir no banco, peça os dados obrigatórios (Nome e Telefone) e use 'registerPatient'.
  PASSO 6: Quando tiver o ID do Paciente, o ID do Médico e a Data/Hora exata no formato ISO, e souber se será particular ou convênio, pergunte qual serviço (use 'getClinicServices' para ver opções).
  PASSO 7: Se for particular/pago, não agende diretamente! Use a ferramenta 'createInvoiceLink' para gerar o link do Mercado Pago e envie ao paciente.
  PASSO 8: Se for um serviço gratuito (ex: Retorno, ou Consulta via Convênio já autorizada), use a ferramenta 'scheduleAppointment' para salvar a consulta no banco de dados. SÓ DIGA QUE ESTÁ CONFIRMADO APÓS ESSA FERRAMENTA RETORNAR SUCESSO.
   
=== WORKFLOW 5: REAGENDAMENTO E CANCELAMENTO ===
- Se o paciente pedir para REMARCAR, MUDAR OU CANCELAR um agendamento:
  1. Use 'checkPatientRegistration' (com o telefone ou CPF) para encontrar o ID do paciente.
  2. Use 'getPatientAppointments' para listar os agendamentos dele. IMPORTANTE: Leia e mostre as propriedades 'data_formatada_br' e 'hora_formatada_br' dessa consulta EXATAMENTE como foram retornadas pela ferramenta, sem somar ou subtrair horas. O fuso horário (GMT-3) já foi aplicado no sistema.
  3. Se ele quiser cancelar, use a ferramenta 'cancelAppointment' passando o ID do agendamento.
  4. Se ele quiser REAGENDAR (mudar a data/hora), NUNCA crie um novo agendamento. Use a ferramenta 'smartSlotDiscovery' para ver os horários da nova data desejada.
  5. Mande um menu com as opções.
  6. Use a ferramenta OBRIGATÓRIA 'rescheduleAppointment' passando o ID do agendamento existente e a nova data/hora. Isso evita duplicidade no banco e no financeiro.
  7. Após reagendar, confirme com o paciente o novo horário.

=== WORKFLOW 6: PÓS-CONSULTA E FIDELIZAÇÃO ===
- Após uma consulta ser concluída ou se o paciente relatar que acabou de sair da clínica, atue proativamente:
  1. Pergunte: "Como foi o seu atendimento hoje? De 0 a 10, qual nota você daria?"
  2. Use a ferramenta 'savePatientFeedback' com a nota fornecida. Repasse a mensagem gerada pela ferramenta para o paciente (se a nota for 9 ou 10, peça avaliação no Google).
  3. Pergunte: "O Doutor pediu para você retornar ou mostrar algum exame daqui a alguns dias?"
  4. Se sim, use 'scheduleReturnAlert' passando a quantidade de dias (ex: 15) e o motivo. Diga ao paciente que você mesma entrará em contato para lembrá-lo.
- Se o paciente relatar piora ou dúvidas urgentes após um procedimento, use 'registerPatientAlert' para notificar os médicos e avise o paciente que a equipe já foi alertada.

=== WORKFLOW 7: EMISSÃO DE DOCUMENTOS ===
- Se o paciente pedir um **atestado** ou **declaração de comparecimento** (para o trabalho, escola, etc.):
  1. Use 'getPatientAppointments' para encontrar a consulta realizada do paciente.
  2. Use a ferramenta 'generateAttendanceCertificate' passando o ID dessa consulta.
  3. A ferramenta retornará a declaração formatada. Entregue essa declaração diretamente no chat para o paciente. Diga que ele pode imprimir ou salvar em PDF.`;
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
- generateAttendanceCertificate: Gerar atestados/declarações de comparecimento para pacientes.
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
          data_hora: { type: 'string', description: 'MUITO IMPORTANTE: Data e hora EXATAS escolhidas pelo paciente no formato ISO 8601 (ex: 2026-04-03T14:30:00-03:00). Nunca envie datas genéricas ou nulas.' },
          motivo: { type: 'string', description: 'Motivo da consulta.' },
          especialidade: { type: 'string', description: 'Especialidade médica desejada.' },
          medico_id: { type: 'string', description: 'O ID (UUID) do médico escolhido (opcional, mas recomendado).' },
          service_id: { type: 'string', description: 'O ID (UUID) do serviço escolhido para buscar o preço e gerar cobrança.' }
        },
        required: ['paciente_id', 'data_hora', 'service_id'],
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
      description: 'DEPRECATED: Use smartSlotDiscovery em vez desta ferramenta.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Data no formato YYYY-MM-DD.' },
          period: { type: 'string', description: 'Turno desejado: manha, tarde ou noite.', enum: ['manha', 'tarde', 'noite'] }
        },
        required: ['date'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'smartSlotDiscovery',
      description: 'Busca inteligente e rápida de horários. Traz a matriz completa de médicos e seus horários livres para um dia específico. Use esta ferramenta como primeira opção ao invés de getAvailableSlots.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Data no formato YYYY-MM-DD.' },
          especialidade: { type: 'string', description: 'Opcional. Filtra por especialidade (ex: Ortopedia, Joelho).' },
          medico_id: { type: 'string', description: 'Opcional. Filtra por um médico específico.' }
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
      description: 'Reagenda (Muda a data e hora) de uma consulta. USE SEMPRE ESTA FERRAMENTA PARA REAGENDAMENTOS, nunca crie um novo agendamento para evitar duplicidade financeira.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'O ID (UUID) da consulta.' },
          new_data_hora: { type: 'string', description: 'Nova data e hora EXATA no formato ISO 8601 (ex: 2026-04-03T14:30:00-03:00).' },
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
      name: 'savePatientFeedback',
      description: 'Salva a nota de avaliação (NPS) do paciente sobre o atendimento.',
      parameters: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string', description: 'ID do paciente' },
          score: { type: 'number', description: 'Nota de 0 a 10 dada pelo paciente' },
          comments: { type: 'string', description: 'Comentários extras (opcional)' }
        },
        required: ['paciente_id', 'score'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'scheduleReturnAlert',
      description: 'Programa um alerta no sistema para a clínica entrar em contato com o paciente daqui a N dias para marcar um retorno.',
      parameters: {
        type: 'object',
        properties: {
          paciente_id: { type: 'string', description: 'ID do paciente' },
          days_from_now: { type: 'number', description: 'Daqui a quantos dias o alerta deve disparar (ex: 15)' },
          reason: { type: 'string', description: 'Motivo do retorno (ex: Mostrar exames, Retirar gesso)' }
        },
        required: ['paciente_id', 'days_from_now', 'reason'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'generateAttendanceCertificate',
      description: 'Gera uma declaração de comparecimento formatada em Markdown para um paciente que compareceu à clínica.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'O ID (UUID) da consulta que foi realizada pelo paciente.' },
        },
        required: ['appointment_id'],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'sendClinicLocation',
      description: 'Envia o endereço completo e o link do Google Maps da clínica para ajudar o paciente a chegar.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'getClinicServices',
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
          service_id: z.string(),
          motivo: z.string().optional(),
          especialidade: z.string().optional(),
          medico_id: z.string().optional()
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
        const schema = z.object({ date: z.string(), period: z.enum(['manha', 'tarde', 'noite']).optional() });
        const validArgs = schema.parse(args);
        return await getAvailableSlots(validArgs.date, validArgs.period);
      }
      case 'smartSlotDiscovery': {
        const schema = z.object({ date: z.string(), especialidade: z.string().optional(), medico_id: z.string().optional() });
        const validArgs = schema.parse(args);
        return await smartSlotDiscovery(validArgs.date, validArgs.especialidade, validArgs.medico_id);
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
      case 'sendClinicLocation':
        return await sendClinicLocation();
      case 'savePatientFeedback': {
        const schema = z.object({ paciente_id: z.string(), score: z.number(), comments: z.string().optional() });
        const validArgs = schema.parse(args);
        return await savePatientFeedback(validArgs.paciente_id, validArgs.score, validArgs.comments);
      }
      case 'scheduleReturnAlert': {
        const schema = z.object({ paciente_id: z.string(), days_from_now: z.number(), reason: z.string() });
        const validArgs = schema.parse(args);
        return await scheduleReturnAlert(validArgs.paciente_id, validArgs.days_from_now, validArgs.reason);
      }
      case 'generateAttendanceCertificate': {
        const schema = z.object({ appointment_id: z.string() });
        const validArgs = schema.parse(args);
        return await generateAttendanceCertificate(validArgs.appointment_id);
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
