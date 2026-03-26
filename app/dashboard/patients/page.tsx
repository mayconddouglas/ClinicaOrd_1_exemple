'use client';

import { useEffect, useState } from 'react';
import { getPatients, createPatient, updatePatient, deletePatient } from '../../../lib/dashboard-tools';
import { Users, Search, Phone, FileText, Plus, Edit2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [formData, setFormData] = useState({ nome: '', cpf: '', telefone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPatients = async (query?: string) => {
    setLoading(true);
    const res = await getPatients(query);
    if (res.success) {
      setPatients(res.data || []);
    } else {
      toast.error('Erro ao buscar pacientes: ' + (res.error || ''));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  const handleOpenModal = (patient?: any) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        nome: patient.nome || '',
        cpf: patient.cpf || '',
        telefone: patient.telefone || ''
      });
    } else {
      setEditingPatient(null);
      setFormData({ nome: '', cpf: '', telefone: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
    setFormData({ nome: '', cpf: '', telefone: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingPatient) {
        const res = await updatePatient(editingPatient.id, formData);
        if (res.success) {
          toast.success('Paciente atualizado com sucesso');
          fetchPatients(search);
          handleCloseModal();
        } else {
          toast.error('Erro ao atualizar paciente: ' + res.error);
        }
      } else {
        const res = await createPatient(formData);
        if (res.success) {
          toast.success('Paciente cadastrado com sucesso');
          fetchPatients(search);
          handleCloseModal();
        } else {
          toast.error('Erro ao cadastrar paciente: ' + res.error);
        }
      }
    } catch (error) {
      toast.error('Erro inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o paciente ${nome}? Esta ação não pode ser desfeita e pode falhar se houver agendamentos ou triagens vinculadas.`)) {
      const res = await deletePatient(id);
      if (res.success) {
        toast.success('Paciente excluído com sucesso');
        fetchPatients(search);
      } else {
        toast.error('Erro ao excluir paciente. Pode haver registros vinculados a ele.');
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-500" /> Pacientes
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Gerencie o cadastro e histórico dos pacientes.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            <button type="submit" className="hidden">Buscar</button>
          </form>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Novo Paciente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs md:text-sm border-b border-slate-200">
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">CPF</th>
                <th className="p-4 font-medium">Telefone</th>
                <th className="p-4 font-medium">Data de Cadastro</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div></td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Nenhum paciente encontrado.</td></tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-900">
                      {patient.nome}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {patient.cpf || 'Não informado'}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {patient.telefone || 'Não informado'}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {patient.created_at ? new Date(patient.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(patient)}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(patient.id, patient.nome)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  placeholder="Ex: 000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
