'use client';

import { useEffect, useState, useMemo } from 'react';
import { getMedicos, createMedico, updateMedico, deleteMedico } from '../../../lib/dashboard-tools';
import { Stethoscope, Plus, Search, Pencil, Trash2, X, Phone, Mail, FileText, Loader2, User, Building2 } from 'lucide-react';
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
  'Ortopedia Geral', 'Joelho', 'Coluna', 'Quadril', 'Ombro e Cotovelo',
  'Mão e Punho', 'Pé e Tornozelo', 'Oncologia Ortopédica', 'Ortopedia Pediátrica', 'Traumatologia',
];

const emptyForm = { nome: '', crm: '', especialidade: '', telefone: '', email: '', bio: '', disponivel: true };

function DoctorAvatar({ name, disponivel }: { name: string; disponivel: boolean }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  return (
    <div className="relative flex-shrink-0">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${disponivel ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
        {initials || '?'}
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${disponivel ? 'bg-emerald-400' : 'bg-slate-300'}`} />
    </div>
  );
}

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filterDisp, setFilterDisp] = useState<'todos' | 'disponiveis' | 'indisponiveis'>('todos');

  const fetchMedicos = async (query?: string) => {
    setLoading(true);
    const res = await getMedicos(query);
    if (res.success) setMedicos(res.data || []);
    else toast.error('Erro ao carregar médicos');
    setLoading(false);
  };

  useEffect(() => { fetchMedicos(); }, []);

  const filtered = useMemo(() => {
    let list = medicos;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.nome.toLowerCase().includes(q) || m.especialidade.toLowerCase().includes(q) || m.crm.toLowerCase().includes(q));
    }
    if (filterDisp === 'disponiveis') list = list.filter(m => m.disponivel);
    if (filterDisp === 'indisponiveis') list = list.filter(m => !m.disponivel);
    return list;
  }, [medicos, search, filterDisp]);

  const stats = useMemo(() => ({
    total: medicos.length,
    disponiveis: medicos.filter(m => m.disponivel).length,
    especialidades: new Set(medicos.map(m => m.especialidade)).size,
  }), [medicos]);

  const handleOpenModal = (medico?: Medico) => {
    if (medico) {
      setEditingId(medico.id);
      setForm({ nome: medico.nome, crm: medico.crm, especialidade: medico.especialidade, telefone: medico.telefone || '', email: medico.email || '', bio: medico.bio || '', disponivel: medico.disponivel });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.crm || !form.especialidade) { toast.error('Nome, CRM e especialidade são obrigatórios'); return; }
    setSaving(true);
    const res = editingId ? await updateMedico(editingId, form) : await createMedico(form);
    if (res.success) {
      toast.success(editingId ? 'Médico atualizado' : 'Médico cadastrado');
      fetchMedicos();
      handleCloseModal();
    } else toast.error('Erro ao salvar: ' + (res as any).error);
    setSaving(false);
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir o Dr(a). ${nome}?`)) return;
    setDeletingId(id);
    const res = await deleteMedico(id);
    if (res.success) { toast.success('Médico removido'); fetchMedicos(); }
    else toast.error('Erro ao remover médico');
    setDeletingId(null);
  };

  const handleToggleDisp = async (medico: Medico) => {
    setToggling(medico.id);
    const res = await updateMedico(medico.id, { disponivel: !medico.disponivel });
    if (res.success) {
      toast.success(medico.disponivel ? 'Médico marcado como indisponível' : 'Médico marcado como disponível');
      fetchMedicos();
    } else toast.error('Erro ao atualizar disponibilidade');
    setToggling(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-7 h-7 text-blue-500" /> Médicos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie o corpo clínico e a disponibilidade de cada especialista.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" /> Novo Médico
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
          <p className="text-xs text-emerald-600 font-medium">Disponíveis</p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.disponiveis}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
          <p className="text-xs text-blue-600 font-medium">Especialidades</p>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{stats.especialidades}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CRM ou especialidade..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {([['todos', 'Todos'], ['disponiveis', 'Disponíveis'], ['indisponiveis', 'Indisponíveis']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilterDisp(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${filterDisp === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Doctors list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center gap-3 text-slate-400">
          <User className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">{search ? 'Nenhum médico encontrado.' : 'Nenhum médico cadastrado ainda.'}</p>
          {!search && <button onClick={() => handleOpenModal()} className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-semibold">+ Cadastrar primeiro médico</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(medico => (
            <div key={medico.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${medico.disponivel ? 'border-slate-200' : 'border-slate-100 opacity-75'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <DoctorAvatar name={medico.nome} disponivel={medico.disponivel} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{medico.nome}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">CRM {medico.crm}</p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${medico.disponivel ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {medico.disponivel ? 'Disponível' : 'Indisponível'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{medico.especialidade}</span>
                </div>

                {medico.bio && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{medico.bio}</p>
                )}

                <div className="space-y-1.5 mb-4">
                  {medico.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {medico.telefone}
                    </div>
                  )}
                  {medico.email && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {medico.email}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleDisp(medico)}
                    disabled={toggling === medico.id}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${medico.disponivel ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    {toggling === medico.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : medico.disponivel ? 'Marcar Indisponível' : 'Marcar Disponível'}
                  </button>
                  <button onClick={() => handleOpenModal(medico)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(medico.id, medico.nome)} disabled={deletingId === medico.id} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-bold text-slate-900">{editingId ? 'Editar Médico' : 'Novo Médico'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editingId ? 'Atualize os dados do médico.' : 'Preencha os dados do novo especialista.'}</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome completo <span className="text-red-500">*</span></label>
                  <input type="text" required autoFocus value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Dr(a). Nome Sobrenome" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CRM <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.crm} onChange={e => setForm({ ...form, crm: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="000000/UF" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Especialidade <span className="text-red-500">*</span></label>
                  <select required value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">Selecione...</option>
                    {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone</label>
                  <input type="text" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="(11) 9 9999-9999" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="medico@clinica.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bio / Apresentação</label>
                  <textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Breve descrição do médico e sua experiência..." />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setForm({ ...form, disponivel: !form.disponivel })}
                      className={`relative w-10 h-6 rounded-full transition-colors ${form.disponivel ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.disponivel ? 'left-5' : 'left-1'}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Disponível para consultas</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar Médico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
