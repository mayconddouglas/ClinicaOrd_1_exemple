'use client';

import { useEffect, useState } from 'react';
import { getMedicos, createMedico, updateMedico, deleteMedico } from '../../../lib/dashboard-tools';
import { Stethoscope, Plus, Search, Pencil, Trash2, X, Check, Phone, Mail, FileText, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Medico = {
  id: string;
  nome: string;
  crm: string;
  especialidade: string;
  telefone?: string;
  email?: string;
  bio?: string;
  disponivel: boolean;
  created_at: string;
};

const ESPECIALIDADES = [
  'Ortopedia Geral',
  'Joelho',
  'Coluna',
  'Quadril',
  'Ombro e Cotovelo',
  'Mão e Punho',
  'Pé e Tornozelo',
  'Oncologia Ortopédica',
  'Ortopedia Pediátrica',
  'Traumatologia',
];

const emptyForm = {
  nome: '',
  crm: '',
  especialidade: '',
  telefone: '',
  email: '',
  bio: '',
  disponivel: true,
};

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async (q?: string) => {
    setLoading(true);
    const res = await getMedicos(q);
    if (res.success) setMedicos(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchData(search || undefined), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: Medico) => {
    setEditingId(m.id);
    setForm({
      nome: m.nome,
      crm: m.crm,
      especialidade: m.especialidade,
      telefone: m.telefone || '',
      email: m.email || '',
      bio: m.bio || '',
      disponivel: m.disponivel,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.crm || !form.especialidade) {
      toast.error('Nome, CRM e Especialidade são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await updateMedico(editingId, form);
        if (res.success) { toast.success('Médico atualizado!'); }
        else throw new Error(res.error);
      } else {
        const res = await createMedico(form);
        if (res.success) { toast.success('Médico cadastrado!'); }
        else throw new Error(res.error);
      }
      setShowModal(false);
      fetchData(search || undefined);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar médico.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este médico?')) return;
    setDeletingId(id);
    const res = await deleteMedico(id);
    if (res.success) { toast.success('Médico removido.'); fetchData(search || undefined); }
    else toast.error('Erro ao remover médico.');
    setDeletingId(null);
  };

  const handleToggleDisponivel = async (m: Medico) => {
    const res = await updateMedico(m.id, { disponivel: !m.disponivel });
    if (res.success) {
      toast.success(`${m.nome} marcado como ${!m.disponivel ? 'disponível' : 'indisponível'}.`);
      fetchData(search || undefined);
    } else {
      toast.error('Erro ao atualizar disponibilidade.');
    }
  };

  const disponiveisCount = medicos.filter(m => m.disponivel).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-7 h-7 text-blue-600" /> Médicos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {medicos.length} cadastrado{medicos.length !== 1 ? 's' : ''} · {disponiveisCount} disponível{disponiveisCount !== 1 ? 'is' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" /> Adicionar Médico
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, especialidade ou CRM..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : medicos.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Stethoscope className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">Nenhum médico encontrado.</p>
          <p className="text-sm mt-1">Clique em "Adicionar Médico" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {medicos.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
              {/* Name + status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900 text-base leading-tight">{m.nome}</h3>
                  <span className="text-xs text-slate-500 font-mono">CRM {m.crm}</span>
                </div>
                <button
                  onClick={() => handleToggleDisponivel(m)}
                  title={m.disponivel ? 'Clique para marcar como indisponível' : 'Clique para marcar como disponível'}
                  className="flex-shrink-0"
                >
                  {m.disponivel ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <ToggleRight className="w-3.5 h-3.5" /> Disponível
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      <ToggleLeft className="w-3.5 h-3.5" /> Indisponível
                    </span>
                  )}
                </button>
              </div>

              {/* Specialty */}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full self-start border border-blue-100">
                <Stethoscope className="w-3 h-3" /> {m.especialidade}
              </span>

              {/* Contact */}
              <div className="space-y-1 text-xs text-slate-500">
                {m.telefone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {m.telefone}
                  </div>
                )}
                {m.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {m.email}
                  </div>
                )}
                {m.bio && (
                  <div className="flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{m.bio}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-slate-100 mt-auto">
                <button
                  onClick={() => openEdit(m)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Editar Médico' : 'Novo Médico'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Dr. João da Silva"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CRM *</label>
                  <input
                    type="text"
                    value={form.crm}
                    onChange={e => setForm(f => ({ ...f, crm: e.target.value }))}
                    placeholder="123456/SP"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade *</label>
                  <select
                    value={form.especialidade}
                    onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Selecione...</option>
                    {ESPECIALIDADES.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                    <option value="Outra">Outra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="dr@clinica.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bio / Observações</label>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Especialista em joelho com 10 anos de experiência..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, disponivel: !f.disponivel }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.disponivel ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.disponivel ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {form.disponivel ? 'Disponível para consultas' : 'Indisponível'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-300 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingId ? 'Salvar alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
