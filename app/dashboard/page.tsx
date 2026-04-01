'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDashboardKPIs, getRecentAppointments, getAnalyticsData, updateAppointmentStatus } from '../../lib/dashboard-tools';
import { Calendar, Users, AlertTriangle, Clock, CheckCircle2, XCircle, Stethoscope, BookOpen, RefreshCw, TrendingUp, Activity, MoreHorizontal, Edit2, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LineChart, Line } from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline', colorClass: string }> = {
  pendente:   { label: 'Pendente',   variant: 'outline', colorClass: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  confirmada: { label: 'Confirmada', variant: 'outline', colorClass: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  cancelada:  { label: 'Cancelada',  variant: 'outline', colorClass: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
  canceled:   { label: 'Cancelada',  variant: 'outline', colorClass: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
  realizada:  { label: 'Realizada',  variant: 'outline', colorClass: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
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

const chartConfigPain = {
  leve: { label: "Dor Leve (0-3)", color: "#22c55e" }, // Verde
  moderada: { label: "Dor Moderada (4-6)", color: "#eab308" }, // Amarelo
  intensa: { label: "Dor Intensa (7-10)", color: "#ef4444" }, // Vermelho
}

const chartConfigStatus = {
  pendente: { label: "Pendentes", color: "#eab308" },
  confirmada: { label: "Confirmadas", color: "#22c55e" },
  cancelada: { label: "Canceladas", color: "#ef4444" },
}

const chartConfigTrends = {
  confirmadas: { label: "Confirmadas", color: "#22c55e" },
  pendentes: { label: "Pendentes", color: "#eab308" },
}

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
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 lg:space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-9 w-[250px]" />
            <Skeleton className="h-5 w-[150px]" />
          </div>
          <Skeleton className="h-9 w-[140px]" />
        </div>
        
        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[140px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="shadow-sm flex flex-col">
              <CardHeader className="pb-6">
                <Skeleton className="h-6 w-[200px] mb-2" />
                <Skeleton className="h-4 w-[250px]" />
              </CardHeader>
              <CardContent className="flex-1 pb-8">
                <Skeleton className="h-[350px] w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 lg:space-y-10">
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
          className="gap-2 self-start md:self-auto bg-card shadow-sm"
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Gráfico 1: Linha de Tendência Semanal (NOVO) */}
          <Card className="shadow-sm flex flex-col lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Volume Semanal de Consultas</CardTitle>
              <CardDescription>Visão dos últimos 7 dias por status</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {analytics.weeklyTrends?.length > 0 ? (
                <ChartContainer config={chartConfigTrends} className="h-[280px] w-full mt-4">
                  <AreaChart data={analytics.weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillConfirmadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-confirmadas)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-confirmadas)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillPendentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-pendentes)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-pendentes)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="confirmadas" stroke="var(--color-confirmadas)" fill="url(#fillConfirmadas)" strokeWidth={2} />
                    <Area type="monotone" dataKey="pendentes" stroke="var(--color-pendentes)" fill="url(#fillPendentes)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-[280px] w-full flex flex-col items-center justify-center text-muted-foreground">
                  <Activity className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Sem dados suficientes</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico 2: Distribuição de Dor */}
          <Card className="shadow-sm flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">
                Triagens: Intensidade
              </CardTitle>
              <CardDescription>Escala de dor relatada (0 a 10)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              {analytics.painDistribution?.length > 0 ? (
                <ChartContainer config={chartConfigPain} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={analytics.painDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {analytics.painDistribution.map((entry: any, index: number) => {
                        const fillVar = index === 0 ? "var(--color-leve)" : index === 1 ? "var(--color-moderada)" : "var(--color-intensa)";
                        return <Cell key={`cell-${index}`} fill={fillVar} strokeWidth={0} />
                      })}
                    </Pie>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] w-full flex flex-col items-center justify-center text-muted-foreground">
                  <Activity className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Sem triagens recentes</p>
                </div>
              )}
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
                    const status = STATUS_MAP[appt.status] || { label: appt.status, variant: 'outline' as const, colorClass: '' };
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
                          <Badge variant={status.variant} className={`text-[11px] font-medium ${status.colorClass}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Ações da Consulta</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateStatus(appt.id, 'confirmada')} className="cursor-pointer text-emerald-600 focus:text-emerald-600">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirmar Agendamento
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(appt.id, 'realizada')} className="cursor-pointer text-blue-600 focus:text-blue-600">
                                <Stethoscope className="mr-2 h-4 w-4" />
                                Marcar como Realizada
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateStatus(appt.id, 'cancelada')} className="cursor-pointer text-rose-600 focus:text-rose-600">
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar Agendamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
