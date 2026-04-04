'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Activity, Calendar, FileText, DollarSign, MessageSquare, Trash2, LayoutDashboard, Mic, MicOff, Paperclip, Loader2, Sparkles, Square, Volume2, ShieldCheck, MapPin, Activity as Pulse } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: { url: string }[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [systemStatus, setSystemStatus] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if (messages.length === 0) return;
    if (window.confirm('Tem certeza que deseja limpar toda a conversa?')) {
      setMessages([]);
      localStorage.removeItem('orthoai_messages');
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
        
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-80 bg-muted/20 border-r border-border/50 p-6 relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-md rounded-xl" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg border border-primary/20">
                <Activity className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">OrthoAI</h1>
              <p className="text-xs text-muted-foreground font-medium">Clínica Ortopédica Inteligente</p>
            </div>
          </div>

          <nav className="flex-1 space-y-8">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Nossos Serviços</h2>
              <div className="space-y-1.5">
                {[
                  { icon: Calendar, text: "Agendamento Inteligente" },
                  { icon: FileText, text: "Análise de Exames (Raio-X/Ressonância)" },
                  { icon: MessageSquare, text: "Triagem com IA" },
                  { icon: DollarSign, text: "Planos e Convênios" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-foreground/80 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <item.icon className="w-4 h-4 text-primary/70" />
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </nav>

          <div className="mt-auto space-y-4">
            <div className="p-4 rounded-xl bg-background border border-border/50 shadow-sm flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Privacidade Garantida</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">Seus dados médicos são criptografados e protegidos (LGPD).</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-muted/30 border-border/50">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-medium text-muted-foreground">Sistema Operante</span>
              </Badge>
              <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10">
                <Link href="/dashboard">
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                  Staff
                </Link>
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col relative bg-background">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-md z-10 sticky top-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">OrthoAI</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-medium">Online</span>
                </div>
              </div>
            </div>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Link href="/dashboard">
                <LayoutDashboard className="w-4 h-4" />
              </Link>
            </Button>
          </header>

          {/* Chat Top Actions */}
          <div className="absolute top-4 right-6 z-10 hidden lg:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={clearChat} className="gap-2 bg-background/50 backdrop-blur-md border-border/50 shadow-sm text-xs h-8">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Limpar Conversa
                </Button>
              </TooltipTrigger>
              <TooltipContent>Apagar histórico atual</TooltipContent>
            </Tooltip>
          </div>

          {/* Messages List / Welcome Screen */}
          <ScrollArea className="flex-1 px-4 md:px-8 pt-8 pb-4">
            <div className="max-w-3xl mx-auto min-h-full flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 md:py-20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-3xl flex items-center justify-center relative shadow-sm">
                      <Sparkles className="w-10 h-10 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-w-lg">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Olá! Como posso te ajudar?</h2>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Sou a assistente virtual da clínica OrthoAI. Estou aqui para ajudar com agendamentos, tirar dúvidas ou analisar seu raio-x inicial.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg pt-4">
                    {QUICK_ACTIONS.map((action, idx) => (
                      <Button 
                        key={idx} 
                        variant="outline" 
                        className="h-auto py-3 px-4 justify-start text-left font-medium hover:border-primary/40 hover:bg-primary/5 transition-all"
                        onClick={() => setInput(action.text)}
                      >
                        <action.icon className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{action.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence initial={false}>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 md:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-border/50 shadow-sm flex-shrink-0">
                          {message.role === 'user' ? (
                            <AvatarFallback className="bg-muted text-foreground"><User className="w-4 h-4" /></AvatarFallback>
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary"><Activity className="w-4 h-4" /></AvatarFallback>
                          )}
                        </Avatar>

                        <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-3 md:px-5 md:py-4 shadow-sm ${
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' 
                              : 'bg-muted/50 border border-border/50 text-foreground rounded-2xl rounded-tl-sm'
                          }`}>
                            {message.role === 'user' ? (
                              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                            ) : (
                              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                              </div>
                            )}
                            
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.attachments.map((file, idx) => (
                                  <div key={idx} className="relative group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={file.url} alt="Anexo" className="w-32 md:w-48 h-32 md:h-48 object-cover rounded-xl border border-border/50 shadow-sm transition-transform hover:scale-[1.02] cursor-zoom-in" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <span className="text-[10px] text-muted-foreground mt-1.5 px-1 font-medium opacity-70">
                            {message.role === 'user' ? 'Você' : 'OrthoAI'} • Agora
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {(isLoading || isUploading) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 md:gap-4">
                      <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-border/50 shadow-sm flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary"><Activity className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3 shadow-sm min-w-[120px]">
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-sm font-medium text-muted-foreground">Enviando anexo...</span>
                          </>
                        ) : (
                          <div className="flex gap-1.5 items-center h-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-background/80 backdrop-blur-md border-t border-border/50 z-20">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="relative flex items-end gap-2 md:gap-3">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={isLoading || isUploading}
                />
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="h-12 w-12 md:h-14 md:w-14 rounded-xl flex-shrink-0 border-border/50 bg-background hover:bg-muted"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isLoading || isUploading}
                    >
                      <Paperclip className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Anexar Exame ou Imagem</TooltipContent>
                </Tooltip>

                <div className="relative flex-1 bg-background border border-border/50 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 rounded-xl transition-all shadow-sm flex items-center">
                  <Textarea
                    ref={inputRef as any}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Descreva o que está sentindo..."
                    className="w-full max-h-32 min-h-[48px] md:min-h-[56px] resize-none bg-transparent border-0 focus-visible:ring-0 px-4 py-3 md:py-4 pr-12 text-[15px] placeholder:text-muted-foreground"
                    rows={1}
                    disabled={isLoading || isUploading || isListening}
                  />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`absolute right-2 h-8 w-8 md:h-10 md:w-10 rounded-lg ${isListening ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-600' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={toggleListening}
                        disabled={isLoading || isUploading}
                      >
                        {isListening ? <Square className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isListening ? 'Parar gravação' : 'Falar por áudio'}</TooltipContent>
                  </Tooltip>
                </div>

                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading || isUploading || isListening}
                  className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all flex-shrink-0"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                </Button>
              </form>
              
              <div className="text-center mt-3">
                <span className="text-[10px] text-muted-foreground/80 font-medium">
                  A OrthoAI não substitui uma consulta médica presencial. Em caso de emergência grave, dirija-se a um hospital.
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
