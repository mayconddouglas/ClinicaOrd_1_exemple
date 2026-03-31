'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getLearnedFAQs, updateLearnedFAQ, deleteLearnedFAQ, getPendingQuestions, answerPendingQuestion } from '../../../lib/dashboard-tools';
import { BookOpen, TrendingUp, Search, Trash2, Pencil, X, ChevronDown, ChevronUp, Tag, Clock, CheckCircle2, MessageSquareWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FAQ = { id: string; question: string; answer: string; category?: string; usage_count: number; created_at?: string };
type PendingQuestion = { id: string; question: string; patient_phone: string; status: string; created_at: string };

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [answeringQuestion, setAnsweringQuestion] = useState<PendingQuestion | null>(null);
  const [editForm, setEditForm] = useState({ question: '', answer: '', category: '' });
  const [answerForm, setAnswerForm] = useState({ answer: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const [faqsRes, pendingRes] = await Promise.all([
      getLearnedFAQs(),
      getPendingQuestions()
    ]);
    
    if (faqsRes.success) setFaqs(faqsRes.data || []);
    if (pendingRes.success) setPendingQuestions(pendingRes.data || []);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchData(false);
    };
    init();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return faqs;
    return faqs.filter(f =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q) ||
      (f.category || '').toLowerCase().includes(q)
    );
  }, [faqs, search]);

  const categories = useMemo(() => Array.from(new Set(faqs.map(f => f.category || 'Geral'))), [faqs]);
  const topFaq = faqs.reduce<FAQ | null>((top, f) => (!top || f.usage_count > top.usage_count ? f : top), null);

  const handleOpenEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setEditForm({ question: faq.question, answer: faq.answer, category: faq.category || '' });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;
    setSaving(true);
    const res = await updateLearnedFAQ(editingFaq.id, editForm);
    if (res.success) { toast.success('FAQ atualizada'); fetchData(); setEditingFaq(null); }
    else toast.error('Erro ao salvar FAQ');
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta FAQ?')) return;
    setDeletingId(id);
    const res = await deleteLearnedFAQ(id);
    if (res.success) { toast.success('FAQ excluída'); fetchData(); }
    else toast.error('Erro ao excluir FAQ');
    setDeletingId(null);
  };

  const handleOpenAnswer = (q: PendingQuestion) => {
    setAnsweringQuestion(q);
    setAnswerForm({ answer: '', category: 'Geral' });
  };

  const handleSaveAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringQuestion) return;
    setSaving(true);
    const res = await answerPendingQuestion(answeringQuestion.id, answeringQuestion.question, answerForm.answer, answerForm.category);
    if (res.success) { 
      toast.success('Resposta salva e enviada ao paciente!'); 
      fetchData(); 
      setAnsweringQuestion(null); 
    } else {
      toast.error('Erro ao salvar resposta');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Carregando base de conhecimento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Base de Conhecimento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Perguntas e respostas aprendidas automaticamente pelo OrthoAI.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="shadow-sm border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-primary font-medium flex items-center gap-1">
              <MessageSquareWarning className="h-3 w-3" /> Pendentes
            </p>
            <p className="text-2xl font-bold tracking-tight mt-1 text-primary">{pendingQuestions.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total de FAQs</p>
            <p className="text-2xl font-bold tracking-tight mt-1">{faqs.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Categorias</p>
            <p className="text-2xl font-bold tracking-tight mt-1">{categories.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-primary font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Mais usada
            </p>
            <p className="text-sm font-bold text-primary mt-1 line-clamp-1">{topFaq?.question || '—'}</p>
            {topFaq && <p className="text-[11px] text-primary/70 mt-0.5">{topFaq.usage_count}x consultada</p>}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pending" className="relative">
            Perguntas Pendentes
            {pendingQuestions.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {pendingQuestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="published">FAQs Publicadas</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Aguardando Resposta da Equipe</h2>
            <p className="text-sm text-muted-foreground">Estas perguntas foram feitas por pacientes e a IA não soube responder. Ao responder, a IA aprenderá a resposta para o futuro.</p>
          </div>

          {pendingQuestions.length === 0 ? (
            <Card className="shadow-sm border-dashed">
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-medium text-foreground">Tudo em dia!</h3>
                <p className="text-sm text-muted-foreground mt-1">Não há perguntas pendentes no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingQuestions.map(q => (
                <Card key={q.id} className="shadow-sm border-amber-500/20 bg-amber-500/5">
                  <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Pendente</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(q.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="font-medium text-foreground text-lg">&quot;{q.question}&quot;</p>
                      <p className="text-sm text-muted-foreground">Paciente: {q.patient_phone}</p>
                    </div>
                    <Button onClick={() => handleOpenAnswer(q)} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                      Responder e Ensinar IA
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="published" className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por pergunta, resposta ou categoria..."
              className="pl-9 pr-8 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {search && <p className="text-sm text-muted-foreground">{filtered.length} resultado(s) para <strong>&quot;{search}&quot;</strong></p>}

          {/* FAQ list */}
          {filtered.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-16 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">{search ? 'Nenhuma FAQ encontrada.' : 'Nenhuma resposta aprendida ainda.'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(faq => (
                <Card key={faq.id} className="shadow-sm overflow-hidden">
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary bg-primary/10">
                          <Tag className="h-2.5 w-2.5" /> {faq.category || 'Geral'}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <TrendingUp className="h-2.5 w-2.5" /> {faq.usage_count}x
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground line-clamp-2">{faq.question}</p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={e => { e.stopPropagation(); handleOpenEdit(faq); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === faq.id}
                            onClick={e => { e.stopPropagation(); handleDelete(faq.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                      {expanded === faq.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                  {expanded === faq.id && (
                    <>
                      <Separator />
                      <div className="px-4 pb-4 pt-3 bg-muted/20">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Resposta</p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                        {faq.created_at && (
                          <p className="text-[11px] text-muted-foreground mt-3">
                            Aprendida em {new Date(faq.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Answer Modal */}
      <Dialog open={!!answeringQuestion} onOpenChange={() => setAnsweringQuestion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder Pergunta</DialogTitle>
            <DialogDescription>
              A sua resposta será enviada ao paciente e a IA aprenderá essa informação para o futuro.
            </DialogDescription>
          </DialogHeader>
          {answeringQuestion && (
            <div className="bg-muted p-3 rounded-md border mb-2">
              <p className="text-sm font-medium text-foreground">&quot;{answeringQuestion.question}&quot;</p>
              <p className="text-xs text-muted-foreground mt-1">Paciente: {answeringQuestion.patient_phone}</p>
            </div>
          )}
          <form onSubmit={handleSaveAnswer} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-answer" className="text-xs font-semibold">Sua Resposta</Label>
              <Textarea id="new-answer" required autoFocus rows={5} value={answerForm.answer}
                onChange={e => setAnswerForm({ ...answerForm, answer: e.target.value })}
                placeholder="Digite a resposta clara e objetiva..."
                className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-category" className="text-xs font-semibold">Categoria</Label>
              <Input id="new-category" value={answerForm.category}
                onChange={e => setAnswerForm({ ...answerForm, category: e.target.value })}
                placeholder="Ex: Convênios, Exames, Horários..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAnsweringQuestion(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
                {saving ? 'Enviando...' : 'Responder e Ensinar IA'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingFaq} onOpenChange={() => setEditingFaq(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar FAQ</DialogTitle>
            <DialogDescription>Atualize a pergunta, resposta e categoria desta entrada.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="faq-question" className="text-xs font-semibold">Pergunta</Label>
              <Input id="faq-question" required autoFocus value={editForm.question}
                onChange={e => setEditForm({ ...editForm, question: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faq-answer" className="text-xs font-semibold">Resposta</Label>
              <Textarea id="faq-answer" required rows={5} value={editForm.answer}
                onChange={e => setEditForm({ ...editForm, answer: e.target.value })}
                className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faq-category" className="text-xs font-semibold">Categoria</Label>
              <Input id="faq-category" value={editForm.category}
                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                placeholder="Ex: Convênios, Exames, Horários..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingFaq(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
