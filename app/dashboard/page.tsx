'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDashboardKPIs, getRecentAppointments, getAnalyticsData, updateAppointmentStatus } from '../../lib/dashboard-tools';
import { Calendar, Users, AlertTriangle, Clock, CheckCircle2, XCircle, Stethoscope, BookOpen, RefreshCw, TrendingUp, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente:   { label: 'Pendente',   variant: 'outline' },
  confirmada: { label: 'Confirmada', variant: 'default' },
  cancelada:  { label: 'Cancelada',  variant: 'destructive' },
  canceled:   { label: 'Cancelada',  variant: 'destructive' },
  realizada:  { label: 'Realizada',  variant: 'secondary' },
};

const AVATAR_COLORS = [
  'bg-blue-500/10 text-blue-500',
  'bg-violet-500/10 text-violet-500',
  'bg-emerald-500/10 text-emerald-500',
  'bg-amber-500/10 text-amber-500',
  'bg-rose-500/10 text-rose-500',
  'bg-cyan-500/10 text-cyan-500',
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const KPI_CONFIG = [
  { key: 'appointmentsToday', label: 'Consultas Hoje',       icon: Calendar,    color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/20' },
  { key: 'urgentTriages',     label: 'Triagens Urgentes',    icon: AlertTriangle,color: 'text-destructive',   bg: 'bg-destructive/10',    border: 'border-destructive/20' },
  { key: 'pendingTriages',    label: 'Triagens Pendentes',   icon: Activity,    color: 'text-secondary-foreground',  bg: 'bg-secondary/10',  border: 'border-secondary/20' },
  { key: 'totalPatients',     label: 'Total de Pacientes',   icon: Users,       color: 'text-primary',  bg: 'bg-primary/10',  border: 'border-primary/20' },
  { key: 'availableDoctors',  label: 'Médicos Disponíveis',  icon: Stethoscope, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { key: 'learnedFaqs',       label: 'FAQs Aprendidas',      icon: BookOpen,    color: 'text-muted-foreground',   bg: 'bg-muted/50',   border: 'border-border' },
];

export default function DashboardOverview() {
  const [kpis, setKpis] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false, initial = false) => {
    if (!silent && !initial) setLoading(true);
    else if (!initial) setRefreshing(true);
    const [kpiRes, apptRes, analyticsRes] = await Promise.all([
      getDashboardKPIs(), getRecentAppointments(), getAnalyticsData()
    ]);
    if (kpiRes.success) setKpis(kpiRes.data || { totalPatients: 0, newPatientsThisMonth: 0, pendingAppointments: 0, completedAppointments: 0 });
    if (apptRes.success) setAppointments(apptRes.data || []);
    if (analyticsRes.success) setAnalytics(analyticsRes.data || { painDistribution: [], appointmentStatus: [] });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchData(false, true);
    };
    init();
  }, [fetchData]);

  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await updateAppointmentStatus(id, status);
    if (res.success) {
      toast.success(`Consulta ${status === 'confirmada' ? 'confirmada' : 'cancelada'}`);
      fetchData(true);
    } else toast.error('Erro ao atualizar status');
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <Skeleton className="h-9 w-[250px]" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-[200px] mb-2" />
              <Skeleton className="h-4 w-[300px]" />
            </CardHeader>
            <CardContent className="pl-2">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-[200px] mb-2" />
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="ml-4 space-y-1">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-3 w-[100px]" />
                    </div>
                    <Skeleton className="ml-auto h-5 w-[80px] rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h2>
          <p className="text-base text-muted-foreground capitalize mt-2">{today}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="gap-2 self-start md:self-auto bg-card"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>
      </div>

      {/* KPIs com Mini Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pacientes</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalPatients ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 font-medium">+{kpis?.newPatientsThisMonth ?? 0}</span> novos este mês
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consultas Pendentes</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-full">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.pendingAppointments ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-amber-600 font-medium">Aguardando</span> confirmação
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consultas Realizadas</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.completedAppointments ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Volume <span className="text-emerald-600 font-medium">estável</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-violet-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
            <div className="p-2 bg-violet-500/10 rounded-full">
              <Activity className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.totalPatients > 0 ? Math.round((kpis.completedAppointments / kpis.totalPatients) * 100) : 0}%
            </div>
            <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-violet-500 rounded-full" 
                style={{ width: `${kpis?.totalPatients > 0 ? Math.round((kpis.completedAppointments / kpis.totalPatients) * 100) : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {analytics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="shadow-sm flex flex-col">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Distribuição de Dor
              </CardTitle>
              <CardDescription className="text-sm">Intensidade relatada nas triagens</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-8">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.painDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {analytics.painDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: any) => [`${v} triagem(s)`, '']} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm flex flex-col">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Status das Consultas
              </CardTitle>
              <CardDescription className="text-sm">Total de agendamentos por situação</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-8">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.appointmentStatus} barSize={40} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: any) => [`${v} consulta(s)`, '']} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Próximas Consultas</CardTitle>
              <CardDescription className="text-sm mt-1">Você tem {appointments.length} agendamento(s) recentes.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">Nenhuma consulta</h3>
              <p className="mt-1 text-sm text-muted-foreground">Não há agendamentos recentes para exibir.</p>
            </div>
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
                      <TableRow key={appt.id} className="group border-b border-border/30 hover:bg-muted/50 transition-colors">
                        <TableCell className="py-5">
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
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                                    onClick={() => handleUpdateStatus(appt.id, 'confirmada')}>
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Confirmar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
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
        </CardContent>
      </Card>
    </div>
  );
}
