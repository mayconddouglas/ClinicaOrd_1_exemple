'use client';

import { useEffect, useState, useMemo } from 'react';
import { getLearnedFAQs, updateLearnedFAQ, deleteLearnedFAQ } from '../../../lib/dashboard-tools';
import { BookOpen, TrendingUp, Search, Trash2, Pencil, X, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { toast } from 'sonner';

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

  const fetchFaqs = async () => {
    setLoading(true);
    const res = await getLearnedFAQs();
    if (res.success) setFaqs(res.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchFaqs(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return faqs;
    return faqs.filter(f =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q) ||
      (f.category || '').toLowerCase().includes(q)
    );
  }, [faqs, search]);

  const categories = useMemo(() => {
    const cats = new Set(faqs.map(f => f.category || 'Geral'));
    return Array.from(cats);
  }, [faqs]);

  const topFaq = faqs.reduce<FAQ | null>((top, f) => (!top || f.usage_count > top.usage_count ? f : top), null);

  const handleOpenEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setEditForm({ question: faq.question, answer: faq.answer, category: faq.category || '' });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;
    setSaving(true);
    const res = await updateLearnedFAQ(editingFaq.id, {
      question: editForm.question,
      answer: editForm.answer,
      category: editForm.category,
    });
    if (res.success) {
      toast.success('FAQ atualizada');
      fetchFaqs();
      setEditingFaq(null);
    } else {
      toast.error('Erro ao salvar FAQ');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta FAQ? A ação não pode ser desfeita.')) return;
    setDeletingId(id);
    const res = await deleteLearnedFAQ(id);
    if (res.success) { toast.success('FAQ excluída'); fetchFaqs(); }
    else toast.error('Erro ao excluir FAQ');
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        <p className="text-sm text-slate-500">Carregando base de conhecimento...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-emerald-500" /> Base de Conhecimento
        </h1>
        <p className="text-sm text-slate-500 mt-1">Perguntas e respostas aprendidas automaticamente pelo OrthoAI.</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total de FAQs</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">{faqs.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Categorias</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">{categories.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Mais consultada</p>
          <p className="text-sm font-bold text-emerald-800 mt-0.5 line-clamp-1">{topFaq?.question || '—'}</p>
          {topFaq && <p className="text-xs text-emerald-600 mt-0.5">{topFaq.usage_count}x usada</p>}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por pergunta, resposta ou categoria..."
          className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 outline-none transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {search && (
        <p className="text-sm text-slate-500">{filtered.length} resultado(s) para <strong>"{search}"</strong></p>
      )}

      {/* FAQ list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center gap-3 text-slate-400">
          <BookOpen className="w-10 h-10 opacity-40" />
          <p className="text-sm">{search ? 'Nenhuma FAQ encontrada.' : 'Nenhuma resposta aprendida ainda.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(faq => (
            <div key={faq.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div
                className="p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Tag className="w-2.5 h-2.5" /> {faq.category || 'Geral'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                      <TrendingUp className="w-2.5 h-2.5" /> {faq.usage_count}x usada
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-2">{faq.question}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleOpenEdit(faq); }}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(faq.id); }}
                    disabled={deletingId === faq.id}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expanded === faq.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {expanded === faq.id && (
                <div className="px-4 pb-4 border-t border-slate-50">
                  <div className="bg-slate-50 rounded-xl p-3 mt-3 border border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Resposta</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                  </div>
                  {faq.created_at && (
                    <p className="text-[11px] text-slate-400 mt-2">Aprendida em {new Date(faq.created_at).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Editar FAQ</h2>
                <p className="text-xs text-slate-400 mt-0.5">Atualize a pergunta, resposta e categoria.</p>
              </div>
              <button onClick={() => setEditingFaq(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pergunta</label>
                <input
                  type="text" required autoFocus
                  value={editForm.question}
                  onChange={e => setEditForm({ ...editForm, question: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Resposta</label>
                <textarea
                  required rows={4}
                  value={editForm.answer}
                  onChange={e => setEditForm({ ...editForm, answer: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 outline-none"
                  placeholder="Ex: Convênios, Exames, Horários..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingFaq(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
