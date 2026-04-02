'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2, Zap, ArrowRight, Activity, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: 'Olá! Sou o **Copiloto OrthoAdmin**, sua IA de gestão clínica.\n\nEstou conectado ao banco de dados e posso ajudar você a analisar triagens, verificar agendas, buscar médicos e responder dúvidas operacionais. Como posso otimizar seu dia hoje?',
};

const SUGGESTED_PROMPTS = [
  { icon: Activity, text: "Resuma as triagens urgentes de hoje" },
  { icon: Zap, text: "Quais médicos estão disponíveis agora?" },
  { icon: ArrowRight, text: "Gere atestado para uma consulta" },
];

const TypingIndicator = () => (
  <div className="flex gap-1.5 items-center px-2 py-1">
    <motion.div className="w-2 h-2 rounded-full bg-primary/40" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
    <motion.div className="w-2 h-2 rounded-full bg-primary/60" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
    <motion.div className="w-2 h-2 rounded-full bg-primary/80" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
  </div>
);

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
    toast.success('Conversa limpa com sucesso!');
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
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: userMessage }])
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com o Copilot.');
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content || 'Desculpe, não consegui gerar uma resposta.'
        }
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua solicitação.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex items-center justify-center p-4 md:p-6 lg:p-8 bg-muted/20">
      <Card className="w-full max-w-5xl h-full flex flex-col shadow-lg border-border/50 bg-background overflow-hidden relative">
        {/* Background Subtle Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-border/50 bg-background/60 backdrop-blur-md relative z-10 space-y-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-primary/20 shadow-sm relative">
              <AvatarFallback className="bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </AvatarFallback>
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background"></span>
              </span>
            </Avatar>
            <div>
              <CardTitle className="text-lg">Ortho Copilot</CardTitle>
              <CardDescription className="text-xs">Assistente de Gestão em Tempo Real</CardDescription>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleClearChat} disabled={messages.length === 0 || isLoading} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpar conversa</TooltipContent>
          </Tooltip>
        </CardHeader>

        {/* Messages Area / Empty State */}
        <ScrollArea className="flex-1 p-6 relative z-10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center relative shadow-inner">
                  <Sparkles className="h-12 w-12 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Como posso otimizar seu dia hoje?</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Sou seu assistente inteligente. Posso analisar triagens urgentes, verificar horários da agenda, buscar médicos e responder dúvidas operacionais da clínica.
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl pt-4">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all font-medium gap-2 border bg-muted/50"
                    onClick={() => handleSubmit(undefined, prompt.text)}
                  >
                    <prompt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {prompt.text}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    key={message.id}
                    className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0 shadow-sm border border-border/50">
                      {message.role === 'user' ? (
                        <AvatarFallback className="bg-muted text-foreground">
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Bot className="w-5 h-5" />
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-5 py-4 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                          : 'bg-muted/50 border border-border/50 text-foreground rounded-2xl rounded-tl-sm'
                      }`}>
                        {message.role === 'user' ? (
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl">
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
                  <Avatar className="h-10 w-10 flex-shrink-0 shadow-sm border border-border/50">
                    <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-5 h-5" /></AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center shadow-sm">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <CardFooter className="p-4 md:p-6 bg-background/60 backdrop-blur-md border-t border-border/50 z-20 flex-col gap-3">
          <form onSubmit={(e) => handleSubmit(e)} className="relative flex items-end gap-3 w-full">
            <div className="relative flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Pergunte ao Copilot sobre triagens, horários, médicos..."
                className="min-h-[56px] max-h-32 resize-none bg-muted/50 text-[15px] rounded-xl pr-12 shadow-sm focus-visible:ring-primary/20"
                rows={1}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-14 w-14 rounded-xl shadow-sm flex-shrink-0 transition-all hover:shadow-md"
            >
              <Send className="w-5 h-5 ml-1" />
            </Button>
          </form>
          <div className="text-center w-full">
            <span className="text-[10px] text-muted-foreground font-medium">
              O Copiloto pode cometer erros. Verifique as informações importantes diretamente no painel.
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
