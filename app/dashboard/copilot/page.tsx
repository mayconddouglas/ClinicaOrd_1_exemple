'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2, Zap, ArrowRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'model',
  content: 'Olá! Sou o **Copiloto OrthoAdmin**, sua IA de gestão clínica.\n\nEstou conectado ao banco de dados e posso ajudar você a analisar triagens, verificar agendas, buscar médicos e responder dúvidas operacionais. Como posso otimizar seu dia hoje?',
};

const SUGGESTED_PROMPTS = [
  { icon: Activity, text: "Resuma as triagens urgentes de hoje" },
  { icon: Zap, text: "Quais médicos estão disponíveis agora?" },
  { icon: ArrowRight, text: "Mostre as consultas pendentes" },
];

const TypingIndicator = () => (
  <div className="flex gap-1.5 items-center px-2 py-1">
    <motion.div className="w-2 h-2 rounded-full bg-primary/40" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
    <motion.div className="w-2 h-2 rounded-full bg-primary/60" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
    <motion.div className="w-2 h-2 rounded-full bg-primary/80" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
  </div>
);

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const handleSubmit = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const userMessage = promptOverride || input.trim();
    if (!userMessage || isLoading) return;

    setInput('');

    const updatedMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', content: userMessage },
    ];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const history = updatedMessages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const response = await fetch('/api/copilot', {
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
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: 'Desculpe, ocorreu um erro ao processar sua solicitação.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-5xl h-full flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/40 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-card"></span>
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Ortho Copilot</h1>
              <p className="text-xs text-muted-foreground font-medium">Assistente de IA Online</p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleClearChat} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpar conversa</TooltipContent>
          </Tooltip>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border ${
                  message.role === 'user'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-card border-border/50 text-foreground'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-4 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-3xl rounded-tr-sm'
                      : 'bg-card/80 backdrop-blur-sm border border-border/50 text-card-foreground rounded-3xl rounded-tl-sm'
                  }`}>
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1.5 px-1 font-medium opacity-70">
                    {message.role === 'user' ? 'Você' : 'Copilot'} • Agora
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
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
        <div className="p-4 md:p-6 bg-background/40 backdrop-blur-md border-t border-border/50 z-20">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {/* Suggested Prompts (Only show if no user messages yet) */}
            {messages.length === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex flex-wrap gap-2 mb-2"
              >
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(undefined, prompt.text)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-card hover:bg-muted border border-border/50 rounded-full transition-colors text-muted-foreground hover:text-foreground shadow-sm"
                  >
                    <prompt.icon className="w-3 h-3 text-primary" />
                    {prompt.text}
                  </button>
                ))}
              </motion.div>
            )}

            <form onSubmit={(e) => handleSubmit(e)} className="relative flex items-end gap-3">
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
                  placeholder="Como posso ajudar na gestão hoje?"
                  className="w-full max-h-32 min-h-[56px] resize-none bg-transparent px-5 py-4 text-[15px] placeholder:text-muted-foreground focus:outline-none"
                  rows={1}
                />
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-[56px] w-[56px] rounded-2xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex-shrink-0"
              >
                <Send className="w-5 h-5 ml-1" />
              </Button>
            </form>
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground font-medium">O Copiloto pode cometer erros. Verifique as informações importantes.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
