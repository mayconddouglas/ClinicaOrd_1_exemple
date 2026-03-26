'use client';

import { useEffect, useState } from 'react';
import { getDashboardKPIs, getRecentAppointments, getAnalyticsData, updateAppointmentStatus } from '../../lib/dashboard-tools';
import { Calendar, Users, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

export default function DashboardOverview() {
  const [kpis, setKpis] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [kpiRes, apptRes, analyticsRes] = await Promise.all([
      getDashboardKPIs(),
      getRecentAppointments(),
      getAnalyticsData()
    ]);
    
    if (kpiRes.success) setKpis(kpiRes.data);
    if (apptRes.success) setAppointments(apptRes.data || []);
    if (analyticsRes.success) setAnalytics(analyticsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const res = await updateAppointmentStatus(id, newStatus);
    if (res.success) {
      toast.success(`Consulta marcada como ${newStatus}`);
      fetchData(); // refresh data
    } else {
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">Acompanhe os indicadores e a agenda da clínica.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 md:p-4 bg-blue-50 text-blue-600 rounded-xl"><Calendar className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div>
            <p className="text-xs md:text-sm font-medium text-slate-500">Consultas Hoje</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{kpis?.appointmentsToday || 0}</p>
          </div>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 md:p-4 bg-red-50 text-red-600 rounded-xl"><AlertTriangle className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div>
            <p className="text-xs md:text-sm font-medium text-slate-500">Triagens Críticas (Dor &ge; 7)</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{kpis?.urgentTriages || 0}</p>
          </div>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          <div className="p-3 md:p-4 bg-emerald-50 text-emerald-600 rounded-xl"><Users className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div>
            <p className="text-xs md:text-sm font-medium text-slate-500">Respostas Aprendidas (FAQ)</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{kpis?.learnedFaqs || 0}</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-4">Distribuição de Dor (Triagens)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.painDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.painDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-4">Status das Consultas</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.appointmentStatus}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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

      {/* Agenda Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-base md:text-lg font-bold text-slate-900">Próximas Consultas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs md:text-sm border-b border-slate-200">
                <th className="p-3 md:p-4 font-medium">Data/Hora</th>
                <th className="p-3 md:p-4 font-medium">Paciente</th>
                <th className="p-3 md:p-4 font-medium">Motivo</th>
                <th className="p-3 md:p-4 font-medium">Status</th>
                <th className="p-3 md:p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-sm text-slate-500">Nenhuma consulta agendada.</td></tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 md:p-4 text-xs md:text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                        {new Date(appt.data_hora).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="p-3 md:p-4 text-xs md:text-sm text-slate-700">
                      {appt.pacientes?.nome || 'Paciente Desconhecido'}
                      <div className="text-[10px] md:text-xs text-slate-400 mt-0.5">{appt.pacientes?.telefone}</div>
                    </td>
                    <td className="p-3 md:p-4 text-xs md:text-sm text-slate-600">{appt.motivo || 'Não informado'}</td>
                    <td className="p-3 md:p-4">
                      <span className={`px-2 py-1 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                        appt.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                        (appt.status === 'canceled' || appt.status === 'cancelada') ? 'bg-red-100 text-red-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="p-3 md:p-4 text-right">
                      {appt.status === 'pendente' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(appt.id, 'confirmada')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Confirmar"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(appt.id, 'cancelada')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
