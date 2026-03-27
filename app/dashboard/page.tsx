'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDashboardKPIs, getRecentAppointments, getAnalyticsData, updateAppointmentStatus } from '../../lib/dashboard-tools';
import { Calendar, Users, AlertTriangle, Clock, CheckCircle2, XCircle, Stethoscope, BookOpen, RefreshCw, TrendingUp, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente:   { label: 'Pendente',   variant: 'outline' },
  confirmada: { label: 'Confirmada', variant: 'default' },
  cancelada:  { label: 'Cancelada',  variant: 'destructive' },
  canceled:   { label: 'Cancelada',  variant: 'destructive' },
  realizada:  { label: 'Realizada',  variant: 'secondary' },
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const KPI_CONFIG = [
  { key: 'appointmentsToday', label: 'Consultas Hoje',       icon: Calendar,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
  { key: 'urgentTriages',     label: 'Triagens Urgentes',    icon: AlertTriangle,color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-100' },
  { key: 'pendingTriages',    label: 'Triagens Pendentes',   icon: Activity,    color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-100' },
  { key: 'totalPatients',     label: 'Total de Pacientes',   icon: Users,       color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100' },
  { key: 'availableDoctors',  label: 'Médicos Disponíveis',  icon: Stethoscope, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { key: 'learnedFaqs',       label: 'FAQs Aprendidas',      icon: BookOpen,    color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
];

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
      getDashboardKPIs(), getRecentAppointments(), getAnalyticsData()
    ]);
    if (kpiRes.success) setKpis(kpiRes.data);
    if (apptRes.success) setAppointments(apptRes.data || []);
    if (analyticsRes.success) setAnalytics(analyticsRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await updateAppointmentStatus(id, status);
    if (res.success) {
      toast.success(`Consulta ${status === 'confirmada' ? 'confirmada' : 'cancelada'}`);
      fetchData(true);
    } else toast.error('Erro ao atualizar status');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Carregando dados da clínica...</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">{today}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="gap-2 flex-shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {KPI_CONFIG.map(({ key, label, icon: Icon, color, bg, border }) => (
          <Card key={key} className={`border ${border} shadow-sm`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground leading-none">{label}</p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
                    {kpis?.[key] ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Distribuição de Dor</CardTitle>
              </div>
              <CardDescription className="text-xs">Intensidade relatada pelos pacientes nas triagens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.painDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                      {analytics.painDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: any) => [`${v} triagem(s)`, '']} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Status das Consultas</CardTitle>
              </div>
              <CardDescription className="text-xs">Total de agendamentos por situação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.appointmentStatus} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(v: any) => [`${v} consulta(s)`, '']} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                      {analytics.appointmentStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appointments Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Próximas Consultas</CardTitle>
              <CardDescription className="mt-0.5 text-xs">{appointments.length} agendamento(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        {appointments.length === 0 ? (
          <CardContent className="py-16 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma consulta agendada.</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data / Hora</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paciente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motivo</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const status = STATUS_MAP[appt.status] || { label: appt.status, variant: 'outline' as const };
                  const patientName = appt.pacientes?.nome || 'Desconhecido';
                  return (
                    <TableRow key={appt.id} className="group border-b border-border/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {new Date(appt.data_hora).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(appt.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`text-xs font-bold ${getAvatarColor(patientName)}`}>
                              {getInitials(patientName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium text-foreground">{patientName}</p>
                            <p className="text-[11px] text-muted-foreground">{appt.pacientes?.telefone || '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <p className="text-xs text-foreground truncate">{appt.motivo || <span className="text-muted-foreground/50 italic">Não informado</span>}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="text-[11px]">{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {appt.status === 'pendente' && (
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleUpdateStatus(appt.id, 'confirmada')}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Confirmar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleUpdateStatus(appt.id, 'cancelada')}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
