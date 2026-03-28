'use client';

import { useEffect, useState, useMemo } from 'react';
import { getLearnedFAQs, updateLearnedFAQ, deleteLearnedFAQ } from '../../../lib/dashboard-tools';
import { BookOpen, TrendingUp, Search, Trash2, Pencil, X, ChevronDown, ChevronUp, Tag } from 'lucide-react';
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

type FAQ = { id: string; question: string; answer: string; category?: string; usage_count: number; created_at?: string };

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editForm, setEditForm] = useState({ question: '', answer: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFaqs = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const res = await getLearnedFAQs();
    if (res.success) setFaqs(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchFaqs(false);
    };
    init();
  }, [fetchFaqs]);

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
    if (res.success) { toast.success('FAQ atualizada'); fetchFaqs(); setEditingFaq(null); }
    else toast.error('Erro ao salvar FAQ');
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta FAQ?')) return;
    setDeletingId(id);
    const res = await deleteLearnedFAQ(id);
    if (res.success) { toast.success('FAQ excluída'); fetchFaqs(); }
    else toast.error('Erro ao excluir FAQ');
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
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
          <BookOpen className="h-6 w-6 text-emerald-500" />
          Base de Conhecimento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Perguntas e respostas aprendidas automaticamente pelo OrthoAI.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
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
        <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Mais usada
            </p>
            <p className="text-sm font-bold text-emerald-800 mt-1 line-clamp-1">{topFaq?.question || '—'}</p>
            {topFaq && <p className="text-[11px] text-emerald-600 mt-0.5">{topFaq.usage_count}x consultada</p>}
          </CardContent>
        </Card>
      </div>

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
                    <Badge variant="outline" className="text-[10px] gap-1 border-emerald-200 text-emerald-700 bg-emerald-50/50">
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                        onClick={e => { e.stopPropagation(); handleOpenEdit(faq); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
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
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
