'use client';

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Send, User, Bot, Activity, Calendar, FileText, Pill, BarChart, MessageSquare, Scissors, DollarSign, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { checkPatientRegistration, registerPatient, scheduleAppointment, saveTriage, searchLearnedAnswers, saveLearnedAnswer, checkAvailability, getPatientAppointments, cancelAppointment, rescheduleAppointment, sendAppointmentSummary } from '../lib/db-tools';

const checkPatientRegistrationTool: FunctionDeclaration = {
  name: 'checkPatientRegistration',
  description: 'Verifica se um paciente já está cadastrado no banco de dados da clínica usando CPF, Nome ou Telefone.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      cpf: {
        type: Type.STRING,
        description: 'O CPF do paciente (apenas números ou com pontuação).',
      },
      nome: {
        type: Type.STRING,
        description: 'O nome do paciente para busca aproximada.',
      },
      telefone: {
        type: Type.STRING,
        description: 'O telefone do paciente.',
      },
    },
  },
};

const registerPatientTool: FunctionDeclaration = {
  name: 'registerPatient',
  description: 'Cadastra um novo paciente no banco de dados da clínica.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      nome: {
        type: Type.STRING,
        description: 'Nome completo do paciente.',
      },
      cpf: {
        type: Type.STRING,
        description: 'CPF do paciente.',
      },
      telefone: {
        type: Type.STRING,
        description: 'Telefone de contato do paciente.',
      },
      data_nascimento: {
        type: Type.STRING,
        description: 'Data de nascimento do paciente no formato YYYY-MM-DD.',
      },
    },
    required: ['nome', 'cpf'],
  },
};

const scheduleAppointmentTool: FunctionDeclaration = {
  name: 'scheduleAppointment',
  description: 'Agenda uma nova consulta para um paciente já cadastrado.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      paciente_id: {
        type: Type.STRING,
        description: 'O ID (UUID) do paciente retornado pelo banco de dados.',
      },
      data_hora: {
        type: Type.STRING,
        description: 'Data e hora da consulta no formato ISO 8601 (ex: 2026-03-27T14:30:00Z).',
      },
      motivo: {
        type: Type.STRING,
        description: 'Motivo da consulta (ex: dor no joelho, retorno, etc).',
      },
      especialidade: {
        type: Type.STRING,
        description: 'Especialidade médica desejada (ex: Ortopedia Geral, Joelho, Coluna).',
      },
    },
    required: ['paciente_id', 'data_hora'],
  },
};

const saveTriageTool: FunctionDeclaration = {
  name: 'saveTriage',
  description: 'Salva os dados de uma triagem inicial (sintomas, escala de dor) de um paciente no banco de dados.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      paciente_id: {
        type: Type.STRING,
        description: 'O ID (UUID) do paciente retornado pelo banco de dados.',
      },
      pain_scale: {
        type: Type.INTEGER,
        description: 'Escala de dor de 0 a 10 informada pelo paciente.',
      },
      symptoms: {
        type: Type.STRING,
        description: 'Descrição dos sintomas relatados (ex: dor no joelho direito, inchaço).',
      },
      red_flags: {
        type: Type.STRING,
        description: 'Sinais de alerta graves identificados (ex: suspeita de fratura, perda de sensibilidade).',
      },
      urgency_classification: {
        type: Type.STRING,
        description: 'Classificação de urgência (ex: emergência, urgência, eletiva).',
      },
    },
    required: ['paciente_id', 'pain_scale', 'symptoms'],
  },
};

const searchLearnedAnswersTool: FunctionDeclaration = {
  name: 'searchLearnedAnswers',
  description: 'Busca no banco de dados respostas aprendidas para perguntas frequentes (FAQ) feitas por usuários.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      keyword: {
        type: Type.STRING,
        description: 'Palavra-chave principal da pergunta do usuário (ex: "horário", "convênio", "preparo").',
      },
    },
    required: ['keyword'],
  },
};

const saveLearnedAnswerTool: FunctionDeclaration = {
  name: 'saveLearnedAnswer',
  description: 'Salva uma nova pergunta e sua respectiva resposta no banco de dados para que o agente aprenda e reutilize no futuro.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: 'A pergunta que o usuário fez de forma clara e genérica.',
      },
      answer: {
        type: Type.STRING,
        description: 'A resposta formulada pelo agente que será salva para o futuro.',
      },
      category: {
        type: Type.STRING,
        description: 'Categoria da pergunta (ex: "horarios", "convenios", "geral").',
      },
    },
    required: ['question', 'answer', 'category'],
  },
};

const checkAvailabilityTool: FunctionDeclaration = {
  name: 'checkAvailability',
  description: 'Verifica se um horário específico está disponível na agenda da clínica.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      data_hora: { type: Type.STRING, description: 'Data e hora desejada no formato ISO 8601 (ex: 2026-03-27T14:30:00Z).' }
    },
    required: ['data_hora'],
  },
};

const getPatientAppointmentsTool: FunctionDeclaration = {
  name: 'getPatientAppointments',
  description: 'Busca todas as consultas ativas (não canceladas) de um paciente.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      paciente_id: { type: Type.STRING, description: 'O ID (UUID) do paciente.' }
    },
    required: ['paciente_id'],
  },
};

const cancelAppointmentTool: FunctionDeclaration = {
  name: 'cancelAppointment',
  description: 'Cancela uma consulta existente.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appointment_id: { type: Type.STRING, description: 'O ID (UUID) da consulta a ser cancelada.' }
    },
    required: ['appointment_id'],
  },
};

const rescheduleAppointmentTool: FunctionDeclaration = {
  name: 'rescheduleAppointment',
  description: 'Reagenda uma consulta existente para um novo horário.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appointment_id: { type: Type.STRING, description: 'O ID (UUID) da consulta.' },
      new_data_hora: { type: Type.STRING, description: 'Nova data e hora no formato ISO 8601.' }
    },
    required: ['appointment_id', 'new_data_hora'],
  },
};

const sendAppointmentSummaryTool: FunctionDeclaration = {
  name: 'sendAppointmentSummary',
  description: 'Gera e simula o envio de um resumo da consulta (lembrete) para o paciente após o agendamento.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appointment_id: { type: Type.STRING, description: 'O ID (UUID) da consulta recém-agendada.' }
    },
    required: ['appointment_id'],
  },
};

const SYSTEM_INSTRUCTION = `Você é o **OrthoAI**, o assistente virtual de uma clínica de ortopedia.
Sua comunicação deve ser direta, empática, simples e voltada para o público leigo (pacientes), embora você também atenda a equipe médica.

REGRA DE OURO: NUNCA mencione sua arquitetura interna, "subagentes", "camadas", "diretivas" ou processos de roteamento para o usuário. Para o usuário, você é uma entidade única. Você processa tudo internamente de forma invisível.

DIRETRIZES DE ATENDIMENTO:
1. Seja Direto e Conciso: Não dê respostas longas ou explicações desnecessárias. Vá direto ao ponto.
2. Agendamento de Consultas:
   - Peça o CPF, Nome ou Telefone do paciente para verificar o cadastro ('checkPatientRegistration').
   - Se a busca retornar múltiplos pacientes (ex: busca por nome), peça o CPF ou Telefone para confirmar.
   - Se não cadastrado, peça Nome e Telefone para cadastrar ('registerPatient').
   - Pergunte o motivo e a preferência de data/horário.
   - ANTES de agendar, use 'checkAvailability' para garantir que o horário está livre. Se não estiver, sugira alternativas.
   - Estando livre, use 'scheduleAppointment' para agendar.
   - APÓS agendar, use 'sendAppointmentSummary' para gerar o resumo e confirme com o paciente.
3. Cancelamento e Reagendamento:
   - Peça o CPF, Nome ou Telefone ('checkPatientRegistration').
   - Use 'getPatientAppointments' para listar as consultas do paciente. Mostre as opções para ele.
   - Para cancelar, use 'cancelAppointment' com o ID da consulta escolhida.
   - Para reagendar, verifique a disponibilidade do novo horário ('checkAvailability') e use 'rescheduleAppointment'.
4. Triagem Oculta (Relato de Dor/Sintomas): Se o paciente iniciar a conversa relatando dor ou sintomas, inicie a coleta de informações básicas de forma natural e acolhedora, SEM mencionar a palavra "triagem".
   - Pergunte onde dói, como começou e a intensidade da dor (escala de 0 a 10). Faça uma pergunta por vez para não sobrecarregar o paciente.
   - Peça o CPF, Nome ou Telefone para identificar o paciente ('checkPatientRegistration') ou cadastre-o se necessário.
   - Use a ferramenta 'saveTriage' para registrar os sintomas no banco de dados.
   - Se a dor for >= 8 ou houver sinais graves (fratura, perda de movimento), oriente a buscar um pronto-socorro imediatamente. Caso contrário, sugira agendar uma consulta.
5. Aprendizado Contínuo (Dúvidas Gerais): Se o usuário fizer uma pergunta geral (ex: horários, convênios, preparo de exames):
   - PRIMEIRO: Use a ferramenta 'searchLearnedAnswers' para buscar se já existe uma resposta aprendida no banco de dados.
   - SE ENCONTRAR: Use a resposta encontrada para responder ao usuário (isso economiza processamento).
   - SE NÃO ENCONTRAR: Formule uma resposta adequada. Em seguida, use a ferramenta 'saveLearnedAnswer' para salvar essa nova pergunta e resposta no banco de dados, aprendendo para a próxima vez.
6. Linguagem Simples: Evite jargões médicos ao falar com pacientes. Seja acolhedor.
7. Coleta de Dados: Faça perguntas objetivas e, de preferência, uma por vez para não confundir o usuário.

ESCOPO DE ATUAÇÃO:
- Agendamento, reagendamento e cancelamento de consultas.
- Avaliação inicial de sintomas (triagem oculta).
- Dúvidas gerais (horários, convênios, preparo de exames) com aprendizado contínuo.
- Suporte a médicos (prontuários, protocolos, laudos) - forneça respostas diretas quando solicitado por um profissional de saúde.

Lembre-se: Você é a interface amigável. Esconda a complexidade. Resolva o problema do usuário da forma mais rápida e fácil possível.`;

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

const SERVICES = [
  { id: 1, name: 'Agendamento', icon: Calendar, color: 'text-blue-500' },
  { id: 2, name: 'Triagem Online', icon: Activity, color: 'text-red-500' },
  { id: 3, name: 'Dúvidas e FAQ', icon: MessageSquare, color: 'text-cyan-500' },
  { id: 4, name: 'Resultados de Exames', icon: FileText, color: 'text-emerald-500' },
  { id: 5, name: 'Informações de Convênios', icon: DollarSign, color: 'text-green-600' },
];

const QUICK_ACTIONS = [
  "🗓️ Agendar Consulta",
  "🤕 Estou com dor",
  "❓ Dúvidas Frequentes",
  "📅 Reagendar/Cancelar"
];

const TOOL_STATUS_MAP: Record<string, string> = {
  checkPatientRegistration: 'Verificando cadastro...',
  registerPatient: 'Realizando cadastro...',
  scheduleAppointment: 'Agendando consulta...',
  saveTriage: 'Registrando informações clínicas...',
  searchLearnedAnswers: 'Buscando informações...',
  saveLearnedAnswer: 'Atualizando base de conhecimento...',
  checkAvailability: 'Consultando agenda...',
  getPatientAppointments: 'Buscando consultas do paciente...',
  cancelAppointment: 'Cancelando consulta...',
  rescheduleAppointment: 'Reagendando consulta...',
  sendAppointmentSummary: 'Gerando resumo da consulta...'
};

export default function OrthoAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: 'Olá! Sou o **OrthoAI**, o assistente virtual da clínica. Como posso ajudar você hoje? (Se quiser agendar uma consulta ou tirar dúvidas, é só me dizer!)',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatSession, setChatSession] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('orthoai_messages');
    let initialMessages: Message[] = [
      {
        id: '1',
        role: 'model',
        content: 'Olá! Sou o **OrthoAI**, o assistente virtual da clínica. Como posso ajudar você hoje? (Se quiser agendar uma consulta ou tirar dúvidas, é só me dizer!)',
      },
    ];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          initialMessages = parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved messages', e);
      }
    }
    setMessages(initialMessages);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('orthoai_messages', JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    // Initialize Gemini Chat Session
    const initChat = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
          console.error('Gemini API Key is missing.');
          return;
        }
        const ai = new GoogleGenAI({ apiKey });
        
        const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

        const session = ai.chats.create({
          model: 'gemini-3-flash-preview',
          history: history.length > 1 ? history : undefined,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2, // Low temperature for deterministic clinical responses
            tools: [{ functionDeclarations: [checkPatientRegistrationTool, registerPatientTool, scheduleAppointmentTool, saveTriageTool, searchLearnedAnswersTool, saveLearnedAnswerTool, checkAvailabilityTool, getPatientAppointmentsTool, cancelAppointmentTool, rescheduleAppointmentTool, sendAppointmentSummaryTool] }],
          },
        });
        setChatSession(session);
      } catch (error) {
        console.error('Failed to initialize chat session:', error);
      }
    };
    initChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !chatSession) return;

    const userMessage = text.trim();
    setInput('');
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setIsLoading(true);
    setSystemStatus('Pensando...');

    try {
      let currentMessage: any = { message: userMessage };
      let isFunctionCall = false;

      do {
        isFunctionCall = false;
        const response = await chatSession.sendMessageStream(currentMessage);
        
        let fullResponse = '';
        const modelMessageId = Date.now().toString();
        
        let messageAdded = false;
        let functionCalls: any[] = [];

        for await (const chunk of response) {
          if (chunk.functionCalls) {
            functionCalls.push(...chunk.functionCalls);
          }
          if (chunk.text) {
            if (!messageAdded) {
              setMessages((prev) => [...prev, { id: modelMessageId, role: 'model', content: '' }]);
              messageAdded = true;
              setSystemStatus(null);
            }
            fullResponse += chunk.text;
            setMessages((prev) => 
              prev.map((msg) => 
                msg.id === modelMessageId ? { ...msg, content: fullResponse } : msg
              )
            );
          }
        }

        if (functionCalls.length > 0) {
          isFunctionCall = true;
          const functionResponses = [];

          for (const call of functionCalls) {
            setSystemStatus(TOOL_STATUS_MAP[call.name] || 'Acessando sistema...');
            try {
              let result;
              const args = call.args as any;

              if (call.name === 'checkPatientRegistration') {
                result = await checkPatientRegistration(args.cpf, args.nome, args.telefone);
              } else if (call.name === 'registerPatient') {
                result = await registerPatient(args.nome, args.cpf, args.telefone, args.data_nascimento);
              } else if (call.name === 'scheduleAppointment') {
                result = await scheduleAppointment(args.paciente_id, args.data_hora, args.motivo, args.especialidade);
              } else if (call.name === 'saveTriage') {
                result = await saveTriage(args.paciente_id, args.pain_scale, args.symptoms, args.red_flags, args.urgency_classification);
              } else if (call.name === 'searchLearnedAnswers') {
                result = await searchLearnedAnswers(args.keyword);
              } else if (call.name === 'saveLearnedAnswer') {
                result = await saveLearnedAnswer(args.question, args.answer, args.category);
              } else if (call.name === 'checkAvailability') {
                result = await checkAvailability(args.data_hora);
              } else if (call.name === 'getPatientAppointments') {
                result = await getPatientAppointments(args.paciente_id);
              } else if (call.name === 'cancelAppointment') {
                result = await cancelAppointment(args.appointment_id);
              } else if (call.name === 'rescheduleAppointment') {
                result = await rescheduleAppointment(args.appointment_id, args.new_data_hora);
              } else if (call.name === 'sendAppointmentSummary') {
                result = await sendAppointmentSummary(args.appointment_id);
              } else {
                result = { error: 'Function not found' };
              }

              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: result
                }
              });
            } catch (error: any) {
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { error: error.message }
                }
              });
            }
          }

          setSystemStatus('Analisando dados...');
          // Pass the function responses back to the model
          currentMessage = { message: functionResponses };
        }

      } while (isFunctionCall);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: 'Desculpe, encontrei um erro ao processar sua solicitação. Por favor, tente novamente.' },
      ]);
    } finally {
      setIsLoading(false);
      setSystemStatus(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    const initial = [{
      id: Date.now().toString(),
      role: 'model' as const,
      content: 'Olá! Sou o **OrthoAI**, o assistente virtual da clínica. Como posso ajudar você hoje? (Se quiser agendar uma consulta ou tirar dúvidas, é só me dizer!)',
    }];
    setMessages(initial);
    localStorage.setItem('orthoai_messages', JSON.stringify(initial));
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const session = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
          tools: [{ functionDeclarations: [checkPatientRegistrationTool, registerPatientTool, scheduleAppointmentTool, saveTriageTool, searchLearnedAnswersTool, saveLearnedAnswerTool, checkAvailabilityTool, getPatientAppointmentsTool, cancelAppointmentTool, rescheduleAppointmentTool, sendAppointmentSummaryTool] }],
        },
      });
      setChatSession(session);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar - Subagents */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
            <Activity className="w-6 h-6" />
            OrthoAI
          </div>
          <p className="text-xs text-slate-500 mt-1">Atendimento Virtual</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Serviços Disponíveis</h3>
          <div className="space-y-1">
            {SERVICES.map((service) => (
              <div key={service.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                <div className={`p-1.5 rounded-md bg-slate-100 ${service.color}`}>
                  <service.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700">{service.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistema Online
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-bold md:hidden">
            <Activity className="w-5 h-5" />
            OrthoAI
          </div>
          <div className="hidden md:block text-sm font-medium text-slate-500">
            Assistente Virtual
          </div>
          <button 
            onClick={clearChat}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
            title="Limpar conversa"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Chat
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((message) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={message.id}
              className={`flex gap-4 max-w-4xl mx-auto ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
              }`}>
                {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={`flex-1 px-4 py-3 rounded-2xl ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 shadow-sm rounded-tl-none text-slate-800'
              }`}>
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:text-slate-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 max-w-4xl mx-auto"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-slate-600">
                  {systemStatus || 'Pensando...'}
                </span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto">
            
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="text-sm bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-full hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
              <div className="relative flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Digite sua mensagem aqui... (Ex: Gostaria de agendar uma consulta)"
                  className="w-full max-h-32 min-h-[56px] resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 pr-12 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={1}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || !chatSession}
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="mt-2 text-center text-xs text-slate-400">
              OrthoAI pode cometer erros. Considere verificar informações importantes.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
