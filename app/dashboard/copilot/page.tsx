'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'model',
  content: 'Olá, equipe! Sou o Copiloto OrthoAdmin. Como posso ajudar na gestão da clínica hoje? (Ex: "Quais são as triagens urgentes de hoje?" ou "Resuma a agenda")',
};

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={message.id}
              className={`flex gap-3 md:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-sm ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-indigo-600'
              }`}>
                {message.role === 'user' ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <Bot className="w-5 h-5 md:w-6 md:h-6" />}
              </div>
              <div className={`flex-1 px-4 py-3 md:px-5 md:py-4 rounded-2xl max-w-3xl ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 shadow-sm rounded-tl-none text-slate-800'
              }`}>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Pergunte ao Copiloto... (Ex: Resuma as triagens de hoje)"
              className="w-full max-h-32 min-h-[48px] md:min-h-[56px] resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 md:px-4 md:py-3.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-12 w-12 md:h-14 md:w-14 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-300"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
