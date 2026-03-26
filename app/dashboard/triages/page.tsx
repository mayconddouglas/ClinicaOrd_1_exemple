'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAllTriages, updateTriageStatus } from '../../../lib/dashboard-tools';
import { AlertTriangle, Activity, CheckCircle2, Clock, User, RefreshCw, Filter } from 'lucide-react';
import { toast } from 'sonner';

type FilterType = 'todas' | 'urgentes' | 'moderadas' | 'leves' | 'resolvidas';

function PainBar({ scale }: { scale: number }) {
  const pct = (scale / 10) * 100;
  const color = scale >= 8 ? 'bg-red-500' : scale >= 5 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TriagesPage() {
  const [triages, setTriages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('todas');

  const fetchTriages = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const res = await getAllTriages();
    if (res.success) setTriages(res.data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchTriages(); }, []);

  const handleMarkResolved = async (id: string) => {
    const res = await updateTriageStatus(id, 'resolvido');
    if (res.success) {
      toast.success('Triagem marcada como resolvida');
      fetchTriages(true);
    } else {
      toast.error('Erro ao atualizar triagem');
    }
  };

  const stats = useMemo(() => ({
    total: triages.length,
    urgentes: triages.filter(t => t.pain_scale >= 8 && t.status !== 'resolvido').length,
    moderadas: triages.filter(t => t.pain_scale >= 5 && t.pain_scale < 8 && t.status !== 'resolvido').length,
    pendentes: triages.filter(t => t.status !== 'resolvido').length,
    resolvidas: triages.filter(t => t.status === 'resolvido').length,
  }), [triages]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'urgentes':   return triages.filter(t => t.pain_scale >= 8 && t.status !== 'resolvido');
      case 'moderadas':  return triages.filter(t => t.pain_scale >= 5 && t.pain_scale < 8 && t.status !== 'resolvido');
      case 'leves':      return triages.filter(t => t.pain_scale < 5 && t.status !== 'resolvido');
      case 'resolvidas': return triages.filter(t => t.status === 'resolvido');
      default:           return triages;
    }
  }, [triages, filter]);

  const filterTabs: { key: FilterType; label: string; count: number; dot?: string }[] = [
    { key: 'todas',      label: 'Todas',     count: stats.total },
    { key: 'urgentes',   label: 'Urgentes',  count: stats.urgentes,  dot: 'bg-red-500' },
    { key: 'moderadas',  label: 'Moderadas', count: stats.moderadas, dot: 'bg-amber-400' },
    { key: 'leves',      label: 'Leves',     count: triages.filter(t => t.pain_scale < 5 && t.status !== 'resolvido').length, dot: 'bg-emerald-400' },
    { key: 'resolvidas', label: 'Resolvidas',count: stats.resolvidas },
  ];

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        <p className="text-sm text-slate-500">Carregando triagens...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-red-500" /> Triagens Clínicas
          </h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhe os relatos de sintomas e identifique urgências.</p>
        </div>
        <button
          onClick={() => fetchTriages(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-white border-slate-200' },
          { label: 'Urgentes (≥8)', value: stats.urgentes, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
          { label: 'Pendentes', value: stats.pendentes, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { label: 'Resolvidas', value: stats.resolvidas, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${filter === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.dot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tab.dot}`} />}
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Triages list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 flex flex-col items-center gap-3 text-slate-400">
            <Filter className="w-10 h-10 opacity-40" />
            <p className="text-sm">Nenhuma triagem nessa categoria.</p>
          </div>
        ) : (
          filtered.map((triage) => {
            const isResolved = triage.status === 'resolvido';
            const urgencyBorder = isResolved
              ? 'border-slate-200 bg-white'
              : triage.pain_scale >= 8
                ? 'border-red-200 bg-red-50/30'
                : triage.pain_scale >= 5
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200 bg-white';
            const painColor = triage.pain_scale >= 8 ? 'text-red-600' : triage.pain_scale >= 5 ? 'text-amber-600' : 'text-emerald-600';

            return (
              <div key={triage.id} className={`rounded-2xl border shadow-sm transition-opacity ${urgencyBorder} ${isResolved ? 'opacity-60' : ''}`}>
                <div className="p-4 md:p-5 flex flex-col md:flex-row gap-4">
                  {/* Pain indicator */}
                  <div className="flex items-center md:flex-col md:items-center md:justify-center md:w-20 md:flex-shrink-0 gap-3 md:gap-2">
                    <div className="text-center">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Dor</span>
                      <span className={`text-3xl font-black leading-none ${painColor}`}>{triage.pain_scale}</span>
                      <span className="text-sm font-medium text-slate-400">/10</span>
                    </div>
                    <div className="flex-1 md:w-full">
                      <PainBar scale={triage.pain_scale} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm md:text-base font-bold text-slate-900">{triage.pacientes?.nome || 'Paciente Desconhecido'}</h3>
                            {isResolved && <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Resolvido</span>}
                            {!isResolved && triage.pain_scale >= 8 && <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase">Urgente</span>}
                          </div>
                          <p className="text-xs text-slate-400">{triage.pacientes?.telefone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(triage.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isResolved && (
                          <button
                            onClick={() => handleMarkResolved(triage.id)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Sintomas Relatados</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{triage.symptoms}</p>
                    </div>

                    {triage.red_flags && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-0.5">Sinais de Alerta</p>
                          <p className="text-sm text-red-700">{triage.red_flags}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
