'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAllTriages, updateTriageStatus } from '../../../lib/dashboard-tools';
import { AlertTriangle, Activity, CheckCircle2, Clock, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

type FilterType = 'todas' | 'urgentes' | 'moderadas' | 'leves' | 'resolvidas';

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
    if (res.success) { toast.success('Triagem marcada como resolvida'); fetchTriages(true); }
    else toast.error('Erro ao atualizar triagem');
  };

  const stats = useMemo(() => ({
    total: triages.length,
    urgentes: triages.filter(t => t.pain_scale >= 8 && t.status !== 'resolvido').length,
    moderadas: triages.filter(t => t.pain_scale >= 5 && t.pain_scale < 8 && t.status !== 'resolvido').length,
    leves: triages.filter(t => t.pain_scale < 5 && t.status !== 'resolvido').length,
    resolvidas: triages.filter(t => t.status === 'resolvido').length,
    pendentes: triages.filter(t => t.status !== 'resolvido').length,
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          <p className="text-sm">Carregando triagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-rose-500" />
            Triagens Clínicas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe os relatos de sintomas e identifique urgências.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchTriages(true)} disabled={refreshing} className="gap-2 flex-shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, className: 'border-border' },
          { label: 'Urgentes (≥8)', value: stats.urgentes, className: 'border-rose-100 bg-rose-50/50' },
          { label: 'Pendentes', value: stats.pendentes, className: 'border-amber-100 bg-amber-50/50' },
          { label: 'Resolvidas', value: stats.resolvidas, className: 'border-emerald-100 bg-emerald-50/50' },
        ].map(s => (
          <Card key={s.label} className={`shadow-sm ${s.className}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="todas" className="gap-1.5">Todas <Badge variant="secondary" className="text-[10px] h-4 px-1">{stats.total}</Badge></TabsTrigger>
          <TabsTrigger value="urgentes" className="gap-1.5">Urgentes <Badge variant="secondary" className="text-[10px] h-4 px-1">{stats.urgentes}</Badge></TabsTrigger>
          <TabsTrigger value="moderadas" className="gap-1.5">Moderadas <Badge variant="secondary" className="text-[10px] h-4 px-1">{stats.moderadas}</Badge></TabsTrigger>
          <TabsTrigger value="leves" className="gap-1.5">Leves <Badge variant="secondary" className="text-[10px] h-4 px-1">{stats.leves}</Badge></TabsTrigger>
          <TabsTrigger value="resolvidas" className="gap-1.5">Resolvidas <Badge variant="secondary" className="text-[10px] h-4 px-1">{stats.resolvidas}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Triages list */}
      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <Activity className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma triagem nessa categoria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((triage) => {
            const isResolved = triage.status === 'resolvido';
            const isUrgent = triage.pain_scale >= 8;
            const painColor = isUrgent ? 'text-rose-600' : triage.pain_scale >= 5 ? 'text-amber-600' : 'text-emerald-600';
            const progressColor = isUrgent ? 'bg-rose-500' : triage.pain_scale >= 5 ? 'bg-amber-400' : 'bg-emerald-400';

            return (
              <Card key={triage.id} className={`shadow-sm transition-opacity ${isResolved ? 'opacity-60' : ''} ${!isResolved && isUrgent ? 'border-rose-200' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row gap-5">
                    {/* Pain score */}
                    <div className="flex md:flex-col items-center md:justify-center md:w-20 flex-shrink-0 gap-3 md:gap-1">
                      <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dor</p>
                        <p className={`text-3xl font-black leading-none ${painColor}`}>{triage.pain_scale}<span className="text-base font-medium text-muted-foreground">/10</span></p>
                      </div>
                      <div className="flex-1 md:w-full">
                        <Progress value={triage.pain_scale * 10} className={`h-2 [&>div]:${progressColor}`} />
                      </div>
                    </div>

                    <Separator orientation="vertical" className="hidden md:block h-auto" />

                    {/* Main content */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold">{triage.pacientes?.nome || 'Paciente Desconhecido'}</p>
                              {isResolved && <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">Resolvido</Badge>}
                              {!isResolved && isUrgent && <Badge variant="destructive" className="text-[10px]">Urgente</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{triage.pacientes?.telefone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                            <Clock className="h-3 w-3" />
                            {new Date(triage.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                          {!isResolved && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkResolved(triage.id)}
                              className="h-7 gap-1 text-[11px] border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                              <CheckCircle2 className="h-3 w-3" /> Resolver
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Sintomas Relatados</p>
                        <p className="text-sm text-foreground leading-relaxed">{triage.symptoms}</p>
                      </div>

                      {triage.red_flags && (
                        <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 p-3">
                          <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 mb-0.5">Sinais de Alerta</p>
                            <p className="text-sm text-rose-700">{triage.red_flags}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
