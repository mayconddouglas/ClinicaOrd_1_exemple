'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, Trash2, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getBusinessHours, 
  updateBusinessHours, 
  getScheduleBlocks, 
  createScheduleBlock, 
  deleteScheduleBlock 
} from '../../../lib/schedule-tools';

const DAYS_OF_WEEK = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<'hours' | 'blocks'>('hours');
  
  // Business Hours State
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [loadingHours, setLoadingHours] = useState(true);
  const [savingHours, setSavingHours] = useState<number | null>(null);

  // Blocks State
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({
    block_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  useEffect(() => {
    fetchBusinessHours();
    fetchBlocks();
  }, []);

  const fetchBusinessHours = async () => {
    setLoadingHours(true);
    const res = await getBusinessHours();
    if (res.success) {
      setBusinessHours(res.data || []);
    } else {
      toast.error('Erro ao carregar horários. Verifique se as tabelas existem no banco.');
    }
    setLoadingHours(false);
  };

  const fetchBlocks = async () => {
    setLoadingBlocks(true);
    const res = await getScheduleBlocks();
    if (res.success) {
      setBlocks(res.data || []);
    }
    setLoadingBlocks(false);
  };

  const handleUpdateHour = async (id: number, field: string, value: any) => {
    // Optimistic update
    const updatedHours = businessHours.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    );
    setBusinessHours(updatedHours);
    
    setSavingHours(id);
    const res = await updateBusinessHours(id, { [field]: value });
    if (!res.success) {
      toast.error('Erro ao salvar horário');
      fetchBusinessHours(); // Revert on error
    } else {
      toast.success('Horário atualizado');
    }
    setSavingHours(null);
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlock.block_date || !newBlock.start_time || !newBlock.end_time) {
      toast.error('Preencha data e horários');
      return;
    }
    
    setIsAddingBlock(true);
    const res = await createScheduleBlock(newBlock);
    if (res.success) {
      toast.success('Bloqueio adicionado com sucesso');
      setNewBlock({ block_date: '', start_time: '', end_time: '', reason: '' });
      fetchBlocks();
    } else {
      toast.error('Erro ao adicionar bloqueio');
    }
    setIsAddingBlock(false);
  };

  const handleDeleteBlock = async (id: string) => {
    if (window.confirm('Remover este bloqueio?')) {
      const res = await deleteScheduleBlock(id);
      if (res.success) {
        toast.success('Bloqueio removido');
        fetchBlocks();
      } else {
        toast.error('Erro ao remover bloqueio');
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
          <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-500" /> Horários e Agenda
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">
          Configure a grade de horários da clínica e gerencie exceções.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-full md:w-fit">
        <button
          onClick={() => setActiveTab('hours')}
          className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'hours' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Grade Padrão
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'blocks' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Bloqueios / Feriados
        </button>
      </div>

      {/* Tab Content: Hours */}
      {activeTab === 'hours' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-900">Horário de Funcionamento</h2>
            <p className="text-sm text-slate-500">Defina os dias e horários que a clínica está aberta.</p>
          </div>
          
          <div className="p-0 overflow-x-auto">
            {loadingHours ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-500 mt-4">Carregando horários...</p>
              </div>
            ) : businessHours.length === 0 ? (
              <div className="p-12 text-center max-w-md mx-auto">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Tabelas não encontradas</h3>
                <p className="text-slate-600 mb-4">
                  Parece que as tabelas de agenda ainda não foram criadas no seu banco de dados Supabase.
                </p>
                <div className="bg-slate-900 text-slate-300 p-4 rounded-lg text-left text-xs overflow-x-auto">
                  <code>
                    -- Execute no SQL Editor do Supabase:<br/>
                    CREATE TABLE business_hours (<br/>
                    &nbsp;&nbsp;id SERIAL PRIMARY KEY,<br/>
                    &nbsp;&nbsp;day_of_week INTEGER NOT NULL UNIQUE,<br/>
                    &nbsp;&nbsp;open_time TIME NOT NULL DEFAULT '08:00:00',<br/>
                    &nbsp;&nbsp;close_time TIME NOT NULL DEFAULT '18:00:00',<br/>
                    &nbsp;&nbsp;lunch_start TIME,<br/>
                    &nbsp;&nbsp;lunch_end TIME,<br/>
                    &nbsp;&nbsp;is_closed BOOLEAN NOT NULL DEFAULT false,<br/>
                    &nbsp;&nbsp;slot_duration INTEGER NOT NULL DEFAULT 30<br/>
                    );<br/><br/>
                    INSERT INTO business_hours (day_of_week, is_closed) VALUES <br/>
                    (0, true), (1, false), (2, false), (3, false), (4, false), (5, false), (6, true);<br/><br/>
                    CREATE TABLE schedule_blocks (<br/>
                    &nbsp;&nbsp;id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),<br/>
                    &nbsp;&nbsp;block_date DATE NOT NULL,<br/>
                    &nbsp;&nbsp;start_time TIME NOT NULL,<br/>
                    &nbsp;&nbsp;end_time TIME NOT NULL,<br/>
                    &nbsp;&nbsp;reason TEXT,<br/>
                    &nbsp;&nbsp;created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()<br/>
                    );
                  </code>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-medium">Dia da Semana</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Abertura</th>
                    <th className="p-4 font-medium">Fechamento</th>
                    <th className="p-4 font-medium">Início Almoço</th>
                    <th className="p-4 font-medium">Fim Almoço</th>
                    <th className="p-4 font-medium">Duração (min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {businessHours.map((day) => (
                    <tr key={day.id} className={`transition-colors ${day.is_closed ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 font-medium text-slate-900">
                        {DAYS_OF_WEEK[day.day_of_week]}
                      </td>
                      <td className="p-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={!day.is_closed}
                            onChange={(e) => handleUpdateHour(day.id, 'is_closed', !e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm font-medium text-slate-700">
                            {day.is_closed ? 'Fechado' : 'Aberto'}
                          </span>
                        </label>
                      </td>
                      <td className="p-4">
                        <input 
                          type="time" 
                          disabled={day.is_closed}
                          value={day.open_time?.substring(0, 5) || ''}
                          onChange={(e) => handleUpdateHour(day.id, 'open_time', e.target.value + ':00')}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:bg-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="time" 
                          disabled={day.is_closed}
                          value={day.close_time?.substring(0, 5) || ''}
                          onChange={(e) => handleUpdateHour(day.id, 'close_time', e.target.value + ':00')}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:bg-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="time" 
                          disabled={day.is_closed}
                          value={day.lunch_start?.substring(0, 5) || ''}
                          onChange={(e) => handleUpdateHour(day.id, 'lunch_start', e.target.value ? e.target.value + ':00' : null)}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:bg-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="time" 
                          disabled={day.is_closed}
                          value={day.lunch_end?.substring(0, 5) || ''}
                          onChange={(e) => handleUpdateHour(day.id, 'lunch_end', e.target.value ? e.target.value + ':00' : null)}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:bg-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <select
                          disabled={day.is_closed}
                          value={day.slot_duration || 30}
                          onChange={(e) => handleUpdateHour(day.id, 'slot_duration', parseInt(e.target.value))}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:bg-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value={15}>15 min</option>
                          <option value={20}>20 min</option>
                          <option value={30}>30 min</option>
                          <option value={45}>45 min</option>
                          <option value={60}>1 hora</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Blocks */}
      {activeTab === 'blocks' && (
        <div className="space-y-6">
          {/* Add Block Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Adicionar Exceção / Bloqueio
            </h2>
            <form onSubmit={handleAddBlock} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input 
                  type="date" 
                  required
                  value={newBlock.block_date}
                  onChange={e => setNewBlock({...newBlock, block_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Início</label>
                <input 
                  type="time" 
                  required
                  value={newBlock.start_time}
                  onChange={e => setNewBlock({...newBlock, start_time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Fim</label>
                <input 
                  type="time" 
                  required
                  value={newBlock.end_time}
                  onChange={e => setNewBlock({...newBlock, end_time: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Feriado, Manutenção"
                  value={newBlock.reason}
                  onChange={e => setNewBlock({...newBlock, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-1">
                <button 
                  type="submit"
                  disabled={isAddingBlock}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </form>
          </div>

          {/* Blocks List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-900">Bloqueios Ativos</h2>
              <p className="text-sm text-slate-500">Datas e horários em que a agenda estará fechada.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Horário</th>
                    <th className="p-4 font-medium">Motivo</th>
                    <th className="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingBlocks ? (
                    <tr><td colSpan={4} className="p-8 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></td></tr>
                  ) : blocks.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">Nenhum bloqueio cadastrado.</td></tr>
                  ) : (
                    blocks.map((block) => (
                      <tr key={block.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-medium text-slate-900">
                          {new Date(block.block_date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {block.start_time.substring(0, 5)} às {block.end_time.substring(0, 5)}
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {block.reason || '-'}
                        </td>
                        <td className="p-4 text-sm text-right">
                          <button 
                            onClick={() => handleDeleteBlock(block.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover Bloqueio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
