'use client';

import { useEffect, useState } from 'react';
import { getUrgentTriages, updateTriageStatus } from '../../../lib/dashboard-tools';
import { AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TriagesPage() {
  const [triages, setTriages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTriages = async () => {
    const res = await getUrgentTriages();
    if (res.success) setTriages(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTriages();
  }, []);

  const handleMarkResolved = async (id: string) => {
    const res = await updateTriageStatus(id, 'resolvido');
    if (res.success) {
      toast.success('Triagem marcada como resolvida');
      fetchTriages();
    } else {
      toast.error('Erro ao atualizar triagem');
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
          <Activity className="w-6 h-6 md:w-8 md:h-8 text-red-500" /> Triagens Clínicas
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">Acompanhe os relatos de sintomas e identifique urgências.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {triages.length === 0 ? (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 text-center text-sm md:text-base text-slate-500">Nenhuma triagem registrada.</div>
        ) : (
          triages.map((triage) => (
            <div key={triage.id} className={`bg-white p-5 md:p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4 md:gap-6 ${triage.status === 'resolvido' ? 'opacity-60 border-slate-200 bg-slate-50' : triage.pain_scale >= 8 ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
              <div className="flex-shrink-0 flex flex-row md:flex-col items-center justify-center w-full md:w-24 h-auto md:h-24 py-3 md:py-0 rounded-xl md:rounded-full bg-slate-50 border border-slate-100 gap-2 md:gap-0">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Dor</span>
                <span className={`text-2xl md:text-3xl font-black ${triage.pain_scale >= 8 ? 'text-red-600' : triage.pain_scale >= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {triage.pain_scale}/10
                </span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base md:text-lg font-bold text-slate-900">{triage.pacientes?.nome || 'Paciente Desconhecido'}</h3>
                      {triage.status === 'resolvido' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] uppercase font-bold tracking-wider">Resolvido</span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-500">{triage.pacientes?.telefone} • CPF: {triage.pacientes?.cpf}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] md:text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{new Date(triage.created_at).toLocaleString('pt-BR')}</span>
                    {triage.status !== 'resolvido' && (
                      <button 
                        onClick={() => handleMarkResolved(triage.id)}
                        className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /> Marcar Resolvido
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-slate-700">Sintomas Relatados:</p>
                  <p className="text-xs md:text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mt-1 border border-slate-100">{triage.symptoms}</p>
                </div>
                {triage.red_flags && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-xs md:text-sm font-medium">Sinais de Alerta: {triage.red_flags}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
