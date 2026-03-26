'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Plus, Trash2, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBusinessHours,
  updateBusinessHours,
  getScheduleBlocks,
  createScheduleBlock,
  deleteScheduleBlock
} from '../../../lib/schedule-tools';

const DAYS_OF_WEEK = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const SLOT_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<'hours' | 'blocks'>('hours');

  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [loadingHours, setLoadingHours] = useState(true);
  const [savingHours, setSavingHours] = useState<number | null>(null);

  const [blocks, setBlocks] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({ block_date: '', start_time: '', end_time: '', reason: '' });

  useEffect(() => { fetchBusinessHours(); fetchBlocks(); }, []);

  const fetchBusinessHours = async () => {
    setLoadingHours(true);
    const res = await getBusinessHours();
    if (res.success) setBusinessHours(res.data || []);
    else toast.error('Erro ao carregar horários. Verifique se as tabelas existem no banco.');
    setLoadingHours(false);
  };

  const fetchBlocks = async () => {
    setLoadingBlocks(true);
    const res = await getScheduleBlocks();
    if (res.success) setBlocks(res.data || []);
    setLoadingBlocks(false);
  };

  const handleUpdateHour = async (id: number, field: string, value: any) => {
    setBusinessHours(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
    setSavingHours(id);
    const res = await updateBusinessHours(id, { [field]: value });
    if (!res.success) { toast.error('Erro ao salvar horário'); fetchBusinessHours(); }
    else toast.success('Horário atualizado');
    setSavingHours(null);
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlock.block_date || !newBlock.start_time || !newBlock.end_time) { toast.error('Preencha data e horários'); return; }
    setIsAddingBlock(true);
    const res = await createScheduleBlock(newBlock);
    if (res.success) { toast.success('Bloqueio adicionado'); setNewBlock({ block_date: '', start_time: '', end_time: '', reason: '' }); fetchBlocks(); }
    else toast.error('Erro ao adicionar bloqueio');
    setIsAddingBlock(false);
  };

  const handleDeleteBlock = async (id: string) => {
    if (!window.confirm('Remover este bloqueio?')) return;
    const res = await deleteScheduleBlock(id);
    if (res.success) { toast.success('Bloqueio removido'); fetchBlocks(); }
    else toast.error('Erro ao remover bloqueio');
  };

  const openDays = businessHours.filter(h => !h.is_closed).length;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-7 h-7 text-blue-500" /> Horários e Agenda
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configure a grade de horários da clínica e gerencie exceções.</p>
      </div>

      {/* Quick summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
          <p className="text-xs text-blue-600 font-medium">Dias abertos / semana</p>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{openDays} <span className="text-sm font-normal text-blue-400">dias</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Bloqueios ativos</p>
          <p className="text-2xl font-bold text-slate-700 mt-0.5">{blocks.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Slot padrão</p>
          <p className="text-2xl font-bold text-slate-700 mt-0.5">
            {businessHours.find(h => !h.is_closed)?.slot_duration || '—'}<span className="text-sm font-normal text-slate-400"> min</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('hours')} className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'hours' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Grade de Horários
        </button>
        <button onClick={() => setActiveTab('blocks')} className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${activeTab === 'blocks' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Bloqueios / Feriados
          {blocks.length > 0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">{blocks.length}</span>}
        </button>
      </div>

      {/* Hours Tab */}
      {activeTab === 'hours' && (
        <>
          {loadingHours ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : businessHours.length === 0 ? (
            <div className="bg-white rounded-2xl border border-amber-200 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 rounded-xl flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900 mb-1">Tabelas não encontradas</h3>
                  <p className="text-sm text-slate-600 mb-4">Execute o SQL abaixo no <strong>SQL Editor do Supabase</strong> para criar as tabelas de agenda:</p>
                  <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
                    {`CREATE TABLE business_hours (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL UNIQUE,
  open_time TIME NOT NULL DEFAULT '08:00:00',
  close_time TIME NOT NULL DEFAULT '18:00:00',
  lunch_start TIME,
  lunch_end TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  slot_duration INTEGER NOT NULL DEFAULT 30
);

INSERT INTO business_hours (day_of_week, is_closed) VALUES
  (0, true), (1, false), (2, false),
  (3, false), (4, false), (5, false), (6, true);

CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {businessHours.map((day) => (
                <div
                  key={day.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${day.is_closed ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-5">
                    {/* Day name + toggle */}
                    <div className="flex items-center justify-between md:justify-start md:w-52 gap-3 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${day.is_closed ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
                          {DAYS_SHORT[day.day_of_week]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{DAYS_OF_WEEK[day.day_of_week]}</p>
                          <p className={`text-xs font-medium ${day.is_closed ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {day.is_closed ? 'Fechado' : 'Aberto'}
                          </p>
                        </div>
                      </div>
                      {/* Toggle */}
                      <button
                        onClick={() => handleUpdateHour(day.id, 'is_closed', !day.is_closed)}
                        disabled={savingHours === day.id}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${day.is_closed ? 'bg-slate-200' : 'bg-emerald-500'} ${savingHours === day.id ? 'opacity-50' : ''}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${day.is_closed ? 'left-1' : 'left-6'}`} />
                      </button>
                    </div>

                    {/* Time inputs */}
                    {!day.is_closed && (
                      <div className="flex flex-wrap gap-3 flex-1">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Abertura</label>
                          <input
                            type="time"
                            value={day.open_time?.substring(0, 5) || ''}
                            onChange={e => handleUpdateHour(day.id, 'open_time', e.target.value + ':00')}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fechamento</label>
                          <input
                            type="time"
                            value={day.close_time?.substring(0, 5) || ''}
                            onChange={e => handleUpdateHour(day.id, 'close_time', e.target.value + ':00')}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Almoço inicio</label>
                          <input
                            type="time"
                            value={day.lunch_start?.substring(0, 5) || ''}
                            onChange={e => handleUpdateHour(day.id, 'lunch_start', e.target.value ? e.target.value + ':00' : null)}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Almoço fim</label>
                          <input
                            type="time"
                            value={day.lunch_end?.substring(0, 5) || ''}
                            onChange={e => handleUpdateHour(day.id, 'lunch_end', e.target.value ? e.target.value + ':00' : null)}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Slot</label>
                          <select
                            value={day.slot_duration || 30}
                            onChange={e => handleUpdateHour(day.id, 'slot_duration', parseInt(e.target.value))}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none bg-white"
                          >
                            {SLOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        {savingHours === day.id && (
                          <div className="flex items-end pb-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                      </div>
                    )}

                    {day.is_closed && (
                      <p className="text-sm text-slate-400 italic">Clique no toggle para habilitar este dia.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Blocks Tab */}
      {activeTab === 'blocks' && (
        <div className="space-y-5">
          {/* Add block form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-blue-500" /> Adicionar Bloqueio ou Feriado
            </h2>
            <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Data <span className="text-red-400">*</span></label>
                <input type="date" required value={newBlock.block_date} onChange={e => setNewBlock({ ...newBlock, block_date: e.target.value })}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Início <span className="text-red-400">*</span></label>
                <input type="time" required value={newBlock.start_time} onChange={e => setNewBlock({ ...newBlock, start_time: e.target.value })}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fim <span className="text-red-400">*</span></label>
                <input type="time" required value={newBlock.end_time} onChange={e => setNewBlock({ ...newBlock, end_time: e.target.value })}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Motivo</label>
                <input type="text" placeholder="Ex: Feriado, Manutenção..." value={newBlock.reason} onChange={e => setNewBlock({ ...newBlock, reason: e.target.value })}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button type="submit" disabled={isAddingBlock}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 sm:col-span-2 lg:col-span-1">
                <Plus className="w-4 h-4" /> {isAddingBlock ? 'Adicionando...' : 'Adicionar'}
              </button>
            </form>
          </div>

          {/* Blocks list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Bloqueios Cadastrados</h2>
                <p className="text-xs text-slate-400 mt-0.5">Períodos em que a agenda estará fechada para agendamentos.</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">{blocks.length} bloqueio(s)</span>
            </div>

            {loadingBlocks ? (
              <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
            ) : blocks.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-2 text-slate-400">
                <Calendar className="w-9 h-9 opacity-40" />
                <p className="text-sm">Nenhum bloqueio cadastrado.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {blocks.map(block => (
                  <div key={block.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">
                          {new Date(block.block_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-500">
                          {block.start_time.substring(0, 5)} às {block.end_time.substring(0, 5)}
                        </span>
                      </div>
                      {block.reason && <p className="text-xs text-slate-400 mt-0.5">{block.reason}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
