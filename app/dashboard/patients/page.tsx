'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPatients, createPatient, updatePatient, deletePatient } from '../../../lib/dashboard-tools';
import { Users, Search, Phone, FileText, Plus, Pencil, Trash2, X, User } from 'lucide-react';
import { toast } from 'sonner';

type Patient = { id: string; nome: string; cpf?: string; telefone?: string; created_at?: string };

const emptyForm = { nome: '', cpf: '', telefone: '' };

function PatientAvatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
      {initials || '?'}
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPatients = useCallback(async (query?: string) => {
    setLoading(true);
    const res = await getPatients(query);
    if (res.success) setPatients(res.data || []);
    else toast.error('Erro ao buscar pacientes');
    setLoading(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search.trim() || undefined);
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchPatients();
  };

  const handleOpenModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({ nome: patient.nome || '', cpf: patient.cpf || '', telefone: patient.telefone || '' });
    } else {
      setEditingPatient(null);
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) { toast.error('O nome é obrigatório'); return; }
    setIsSubmitting(true);
    try {
      if (editingPatient) {
        const res = await updatePatient(editingPatient.id, formData);
        if (res.success) { toast.success('Paciente atualizado'); fetchPatients(search || undefined); handleCloseModal(); }
        else toast.error('Erro ao atualizar: ' + res.error);
      } else {
        const res = await createPatient(formData);
        if (res.success) { toast.success('Paciente cadastrado'); fetchPatients(search || undefined); handleCloseModal(); }
        else toast.error('Erro ao cadastrar: ' + res.error);
      }
    } catch { toast.error('Erro inesperado'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(id);
    const res = await deletePatient(id);
    if (res.success) { toast.success('Paciente excluído'); fetchPatients(search || undefined); }
    else toast.error('Erro ao excluir. Pode haver registros vinculados.');
    setDeletingId(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-violet-500" /> Pacientes
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie o cadastro e histórico dos pacientes.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" /> Novo Paciente
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-400 outline-none transition-all"
          />
          {search && (
            <button type="button" onClick={handleClearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="submit" className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Buscar
        </button>
      </form>

      {/* Stats pill */}
      {!loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
            <Users className="w-3.5 h-3.5 text-violet-500" />
            <span><strong className="text-slate-800">{patients.length}</strong> paciente(s) {search ? 'encontrado(s)' : 'cadastrado(s)'}</span>
          </span>
        </div>
      )}

      {/* Patient list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center gap-3 text-slate-400">
          <User className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">{search ? 'Nenhum paciente encontrado para essa busca.' : 'Nenhum paciente cadastrado ainda.'}</p>
          {!search && (
            <button onClick={() => handleOpenModal()} className="mt-1 text-sm text-violet-600 hover:text-violet-700 font-semibold">
              + Cadastrar primeiro paciente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[480px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="p-4 font-semibold">Paciente</th>
                  <th className="p-4 font-semibold">CPF</th>
                  <th className="p-4 font-semibold">Telefone</th>
                  <th className="p-4 font-semibold">Cadastro</th>
                  <th className="p-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patients.map(patient => (
                  <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <PatientAvatar name={patient.nome} />
                        <span className="text-sm font-semibold text-slate-800">{patient.nome}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-600 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {patient.cpf || <span className="text-slate-300 italic">—</span>}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {patient.telefone || <span className="text-slate-300 italic">—</span>}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {patient.created_at ? new Date(patient.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(patient)}
                          className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(patient.id, patient.nome)}
                          disabled={deletingId === patient.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editingPatient ? 'Atualize os dados do paciente.' : 'Preencha os dados para cadastrar.'}</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome completo <span className="text-red-500">*</span></label>
                <input
                  type="text" required autoFocus
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-400 outline-none transition-all"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">CPF</label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-400 outline-none transition-all"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-400 outline-none transition-all"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : editingPatient ? 'Salvar alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
