'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Activity, Calendar, FileText, Pill, BarChart, MessageSquare, Scissors, DollarSign, Loader2, Trash2, LayoutDashboard, Mic, MicOff } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'model',
  content: 'Olá! Sou o **OrthoAI**, o assistente virtual da clínica. Como posso ajudar você hoje? (Se quiser agendar uma consulta ou tirar dúvidas, é só me dizer!)',
};

export default function OrthoAI() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [systemStatus, setSystemStatus] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput((prev) => prev ? prev + ' ' + finalTranscript : finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('orthoai_messages');
    let initialMessages: Message[] = [INITIAL_MESSAGE];
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    setInput('');

    const updatedMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', content: userMessage },
    ];
    setMessages(updatedMessages);
    setIsLoading(true);
    setSystemStatus('Pensando...');

    try {
      const history = updatedMessages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, message: userMessage }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro na resposta do servidor.');
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: data.text },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          content: 'Desculpe, encontrei um erro ao processar sua solicitação. Por favor, tente novamente.',
        },
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
    const initial = [{ ...INITIAL_MESSAGE, id: Date.now().toString() }];
    setMessages(initial);
    localStorage.setItem('orthoai_messages', JSON.stringify(initial));
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">OrthoAI</h1>
              <p className="text-xs text-slate-500">Assistente Virtual</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Serviços</p>
          {SERVICES.map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group"
            >
              <div className={`w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-white flex items-center justify-center transition-colors ${service.color}`}>
                <service.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-700">{service.name}</span>
            </div>
          ))}
        </nav>

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
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
            >
              <LayoutDashboard className="w-4 h-4" />
              Acessar Dashboard
            </Link>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
              title="Limpar conversa"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Chat
            </button>
          </div>
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
                type="button"
                onClick={toggleListening}
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isListening
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
                title={isListening ? "Parar gravação" : "Falar por voz"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
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
