'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDashboardKPIs, getRecentAppointments, getAnalyticsData, updateAppointmentStatus } from '../../lib/dashboard-tools';
import { Calendar, Users, AlertTriangle, Clock, CheckCircle2, XCircle, Stethoscope, BookOpen, RefreshCw, TrendingUp, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  pendente:   { label: 'Pendente',   class: 'bg-amber-100 text-amber-700 border border-amber-200' },
  confirmada: { label: 'Confirmada', class: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  cancelada:  { label: 'Cancelada',  class: 'bg-red-100 text-red-700 border border-red-200' },
  canceled:   { label: 'Cancelada',  class: 'bg-red-100 text-red-700 border border-red-200' },
  realizada:  { label: 'Realizada',  class: 'bg-blue-100 text-blue-700 border border-blue-200' },
};

function PatientAvatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  const colors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
      {initials || '?'}
    </div>
  );
}

export default function DashboardOverview() {
  const [kpis, setKpis] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [kpiRes, apptRes, analyticsRes] = await Promise.all([
      getDashboardKPIs(),
      getRecentAppointments(),
      getAnalyticsData()
    ]);

    if (kpiRes.success) setKpis(kpiRes.data);
    if (apptRes.success) setAppointments(apptRes.data || []);
    if (analyticsRes.success) setAnalytics(analyticsRes.data);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const res = await updateAppointmentStatus(id, newStatus);
    if (res.success) {
      toast.success(`Consulta ${newStatus === 'confirmada' ? 'confirmada' : 'cancelada'} com sucesso`);
      fetchData(true);
    } else {
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-sm text-slate-500">Carregando dados...</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const kpiCards = [
    { label: 'Consultas Hoje', value: kpis?.appointmentsToday ?? 0, icon: Calendar, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { label: 'Triagens Urgentes', value: kpis?.urgentTriages ?? 0, icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
    { label: 'Triagens Pendentes', value: kpis?.pendingTriages ?? 0, icon: Activity, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    { label: 'Total de Pacientes', value: kpis?.totalPatients ?? 0, icon: Users, bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
    { label: 'Médicos Disponíveis', value: kpis?.availableDoctors ?? 0, icon: Stethoscope, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { label: 'FAQs Aprendidas', value: kpis?.learnedFaqs ?? 0, icon: BookOpen, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Visão Geral</h1>
          <p className="text-sm text-slate-500 mt-1 capitalize">{today}</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
        {kpiCards.map(({ label, value, icon: Icon, bg, text, border }) => (
          <div key={label} className={`bg-white p-4 md:p-5 rounded-2xl border ${border} shadow-sm flex items-center gap-3 md:gap-4`}>
            <div className={`p-2.5 md:p-3.5 ${bg} ${text} rounded-xl flex-shrink-0`}>
              <Icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-medium text-slate-500 leading-tight">{label}</p>
              <p className="text-xl md:text-3xl font-bold text-slate-900 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm md:text-base font-bold text-slate-900">Distribuição de Dor (Triagens)</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">Intensidade dos relatos dos pacientes</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.painDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                    {analytics.painDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => [`${value} triagem(s)`, '']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm md:text-base font-bold text-slate-900">Status das Consultas</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">Total de agendamentos por situação</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.appointmentStatus} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(value: any) => [`${value} consulta(s)`, '']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {analytics.appointmentStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-900">Próximas Consultas</h2>
            <p className="text-xs text-slate-400 mt-0.5">{appointments.length} agendamento(s) encontrado(s)</p>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-3 text-slate-400">
            <Calendar className="w-10 h-10 opacity-40" />
            <p className="text-sm">Nenhuma consulta agendada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                  <th className="p-3 md:p-4 font-semibold uppercase tracking-wider">Data / Hora</th>
                  <th className="p-3 md:p-4 font-semibold uppercase tracking-wider">Paciente</th>
                  <th className="p-3 md:p-4 font-semibold uppercase tracking-wider">Motivo</th>
                  <th className="p-3 md:p-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="p-3 md:p-4 font-semibold uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {appointments.map((appt) => {
                  const statusConfig = STATUS_LABELS[appt.status] || { label: appt.status, class: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 md:p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs md:text-sm font-semibold text-slate-800">
                              {new Date(appt.data_hora).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(appt.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 md:p-4">
                        <div className="flex items-center gap-2.5">
                          <PatientAvatar name={appt.pacientes?.nome || '?'} />
                          <div>
                            <p className="text-xs md:text-sm font-medium text-slate-800">{appt.pacientes?.nome || 'Desconhecido'}</p>
                            <p className="text-[11px] text-slate-400">{appt.pacientes?.telefone || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 md:p-4 text-xs md:text-sm text-slate-600 max-w-[180px] truncate">
                        {appt.motivo || <span className="text-slate-300 italic">Não informado</span>}
                      </td>
                      <td className="p-3 md:p-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusConfig.class}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-3 md:p-4 text-right">
                        {appt.status === 'pendente' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleUpdateStatus(appt.id, 'confirmada')} title="Confirmar" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button onClick={() => handleUpdateStatus(appt.id, 'cancelada')} title="Cancelar" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <XCircle className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
