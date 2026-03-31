'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Activity, Calendar, FileText, DollarSign, MessageSquare, Trash2, LayoutDashboard, Mic, MicOff, Paperclip, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

const SERVICES = [
  { id: 1, name: 'Agendamento', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 2, name: 'Triagem Online', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 3, name: 'Dúvidas e FAQ', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 4, name: 'Resultados', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 5, name: 'Convênios', icon: DollarSign, color: 'text-pink-500', bg: 'bg-pink-500/10' },
];

const QUICK_ACTIONS = [
  { icon: Calendar, text: "Agendar Consulta" },
  { icon: Activity, text: "Estou com dor" },
  { icon: MessageSquare, text: "Dúvidas Frequentes" },
  { icon: Calendar, text: "Reagendar/Cancelar" }
];

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'model',
  content: 'Olá! Sou o **OrthoAI**, o assistente virtual da clínica.\n\nComo posso ajudar você hoje? (Se quiser agendar uma consulta ou tirar dúvidas, é só me dizer!)',
};

const TypingIndicator = () => (
  <div className="flex gap-1.5 items-center px-2 py-1">
    <motion.div className="w-2 h-2 rounded-full bg-primary/40" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
    <motion.div className="w-2 h-2 rounded-full bg-primary/60" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
    <motion.div className="w-2 h-2 rounded-full bg-primary/80" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
  </div>
);

export default function OrthoAI() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [systemStatus, setSystemStatus] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSystemStatus('Analisando exame...');

    const tempId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content: `📎 Enviando arquivo: ${file.name}...` },
    ]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientPhone', 'user_chat');

      const response = await fetch('/api/upload-exam', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao enviar arquivo.');
      }

      setMessages((prev) => prev.map(m => 
        m.id === tempId ? { ...m, content: `📎 Arquivo enviado: **${file.name}**` } : m
      ));

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          content: `Recebi o seu exame/imagem. Aqui está a minha análise preliminar:\n\n${data.data.aiAnalysis}\n\n*Nota: Esta é uma análise feita por IA e não substitui a avaliação médica. O arquivo já foi anexado ao seu prontuário para o médico avaliar.*`,
        },
      ]);

    } catch (error: any) {
      console.error('Upload error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          content: `Desculpe, encontrei um erro ao processar seu arquivo: ${error.message}`,
        },
      ]);
    } finally {
      setIsUploading(false);
      setSystemStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Sidebar - Redesigned for a softer, more modern look */}
      <aside className="hidden md:flex w-72 flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-xl tracking-tight">OrthoAI</h1>
              <p className="text-xs text-muted-foreground font-medium">Clínica Ortopédica</p>
            </div>
          </div>

          <nav className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-3 px-2">Serviços</p>
            {SERVICES.map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl ${service.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <service.icon className={`w-5 h-5 ${service.color}`} />
                </div>
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{service.name}</span>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-muted/50 rounded-2xl p-4 border border-border/50 flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Sistema Online e Operante</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative bg-background/50">
        {/* Ambient Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-primary font-bold md:hidden">
            <Activity className="w-5 h-5" />
            OrthoAI
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Assistente Virtual Inteligente</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-full hover:bg-primary/10"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Acessar Dashboard</span>
            </Link>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-full hover:bg-destructive/10"
              title="Limpar conversa"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar Chat</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                key={message.id}
                className={`flex gap-4 max-w-3xl mx-auto ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border ${
                  message.role === 'user' 
                    ? 'bg-primary/10 border-primary/20 text-primary' 
                    : 'bg-card border-border/50 text-foreground'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-4 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-3xl rounded-tr-sm'
                      : 'bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground rounded-3xl rounded-tl-sm'
                  }`}>
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1.5 px-2 font-medium opacity-70">
                    {message.role === 'user' ? 'Você' : 'OrthoAI'} • Agora
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 max-w-3xl mx-auto"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-card border border-border/50 text-foreground flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl rounded-tl-sm px-5 py-4 flex items-center shadow-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-background/80 backdrop-blur-xl border-t border-border/50 z-20">
          <div className="max-w-3xl mx-auto">
            {/* Quick Actions (Only show if no user messages yet) */}
            {messages.length === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 mb-4"
              >
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(action.text)}
                    className="flex items-center gap-2 text-xs font-medium bg-card border border-border/50 text-muted-foreground px-4 py-2 rounded-full hover:border-primary/50 hover:text-foreground hover:bg-muted/50 transition-all shadow-sm"
                  >
                    <action.icon className="w-3.5 h-3.5 text-primary" />
                    {action.text}
                  </button>
                ))}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                className="flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center rounded-2xl bg-card border border-border/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50 shadow-sm"
                title="Anexar Exame ou Imagem"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </button>

              <div className="relative flex-1 bg-card/50 backdrop-blur-sm border border-border/50 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 rounded-2xl transition-all shadow-sm">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Digite sua mensagem aqui..."
                  className="w-full max-h-32 min-h-[56px] resize-none bg-transparent px-5 py-4 text-[15px] placeholder:text-muted-foreground focus:outline-none"
                  rows={1}
                />
              </div>

              <button
                type="button"
                onClick={toggleListening}
                className={`flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center rounded-2xl border transition-all shadow-sm ${
                  isListening
                    ? 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 animate-pulse'
                    : 'bg-card border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={isListening ? "Parar gravação" : "Falar por voz"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-all hover:shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:hover:shadow-none shadow-md"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
            <div className="mt-3 text-center">
              <span className="text-[10px] text-muted-foreground font-medium">
                A IA pode cometer erros. Em caso de emergência, procure um pronto-socorro.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
