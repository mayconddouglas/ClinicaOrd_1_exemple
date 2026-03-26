'use client';

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDashboardKPIs, getRecentAppointments, getUrgentTriages } from '../../../lib/dashboard-tools';

const getDashboardKPIsTool: FunctionDeclaration = {
  name: 'getDashboardKPIs',
  description: 'Obtém os indicadores principais do dia (total de consultas, triagens urgentes, FAQs aprendidas).',
};

const getRecentAppointmentsTool: FunctionDeclaration = {
  name: 'getRecentAppointments',
  description: 'Busca as próximas consultas agendadas na clínica.',
};

const getUrgentTriagesTool: FunctionDeclaration = {
  name: 'getUrgentTriages',
  description: 'Busca as triagens recentes, ordenadas por nível de dor e urgência.',
};

const SYSTEM_INSTRUCTION = `Você é o **Copiloto OrthoAdmin**, um assistente de IA exclusivo para a equipe médica e recepcionistas da clínica de ortopedia.
Seu objetivo é ajudar a equipe a extrair informações do banco de dados, resumir triagens, verificar a agenda e auxiliar na gestão.
Responda de forma profissional, técnica (pode usar jargões médicos, pois está falando com a equipe) e direta.

FERRAMENTAS DISPONÍVEIS:
- 'getDashboardKPIs': Para ver o resumo do dia.
- 'getRecentAppointments': Para ver a agenda geral.
- 'getUrgentTriages': Para ver pacientes com dor ou red flags.
- Você também pode responder dúvidas gerais sobre a clínica.

Seja prestativo e forneça resumos claros e estruturados.`;

export default function CopilotPage() {
  const [messages, setMessages] = useState<any[]>([
    { id: '1', role: 'model', content: 'Olá, equipe! Sou o Copiloto OrthoAdmin. Como posso ajudar na gestão da clínica hoje? (Ex: "Quais são as triagens urgentes de hoje?" ou "Resuma a agenda")' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatSession, setChatSession] = useState<any>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) return;
        const ai = new GoogleGenAI({ apiKey });
        const session = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
            tools: [{ functionDeclarations: [getDashboardKPIsTool, getRecentAppointmentsTool, getUrgentTriagesTool] }],
          },
        });
        setChatSession(session);
      } catch (error) {
        console.error('Failed to initialize copilot:', error);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatSession) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setIsLoading(true);

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
          if (chunk.functionCalls) functionCalls.push(...chunk.functionCalls);
          if (chunk.text) {
            if (!messageAdded) {
              setMessages(prev => [...prev, { id: modelMessageId, role: 'model', content: '' }]);
              messageAdded = true;
            }
            fullResponse += chunk.text;
            setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, content: fullResponse } : msg));
          }
        }

        if (functionCalls.length > 0) {
          isFunctionCall = true;
          const functionResponses = [];

          for (const call of functionCalls) {
            try {
              let result;
              if (call.name === 'getDashboardKPIs') result = await getDashboardKPIs();
              else if (call.name === 'getRecentAppointments') result = await getRecentAppointments();
              else if (call.name === 'getUrgentTriages') result = await getUrgentTriages();
              else result = { error: 'Function not found' };

              functionResponses.push({ functionResponse: { name: call.name, response: result } });
            } catch (error: any) {
              functionResponses.push({ functionResponse: { name: call.name, response: { error: error.message } } });
            }
          }
          currentMessage = { message: functionResponses };
        }
      } while (isFunctionCall);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
          <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" /> Copiloto da Clínica
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">Seu assistente de IA interno para análise de dados e gestão.</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50/50">
          {messages.map((message) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={message.id} className={`flex gap-3 md:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-sm ${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                {message.role === 'user' ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-5 h-5 md:w-6 md:h-6" />}
              </div>
              <div className={`flex-1 px-4 py-3 md:px-5 md:py-4 rounded-2xl max-w-3xl ${message.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 shadow-sm rounded-tl-none text-slate-800'}`}>
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
                ) : (
                  <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 md:gap-4">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-none px-4 py-3 md:px-5 md:py-4 flex items-center gap-2 md:gap-3">
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-indigo-600" />
                <span className="text-xs md:text-sm font-medium text-slate-600">Analisando dados da clínica...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 md:p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder="Pergunte ao Copiloto... (Ex: Resuma as triagens de hoje)"
              className="w-full max-h-32 min-h-[48px] md:min-h-[56px] resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 md:px-4 md:py-3.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={1}
            />
            <button type="submit" disabled={!input.trim() || isLoading || !chatSession} className="flex h-12 w-12 md:h-14 md:w-14 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-300">
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
