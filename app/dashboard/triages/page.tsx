'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getAllTriages, updateTriageStatus } from '../../../lib/dashboard-tools';
import { AlertTriangle, Activity, CheckCircle2, Clock, User, RefreshCw, Search, ArrowUpDown, ShieldAlert, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type FilterType = 'todas' | 'urgentes' | 'moderadas' | 'leves' | 'resolvidas';

export default function TriagesPage() {
  const [triages, setTriages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('todas');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'pain_desc' | 'pain_asc'>('pain_desc');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchTriages = useCallback(async (silent = false, initial = false) => {
    if (!silent && !initial) setLoading(true);
    else if (!initial) setRefreshing(true);
    const res = await getAllTriages();
    if (res.success) setTriages(res.data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchTriages(false, true);
    };
    init();
  }, [fetchTriages]);

  const handleMarkResolved = async (id: string) => {
    setResolvingId(id);
    
    // Optimistic Update
    setTriages(prev => prev.map(t => t.id === id ? { ...t, status: 'resolvido' } : t));
    
    const res = await updateTriageStatus(id, 'resolvido');
    if (res.success) { 
      toast.success('Triagem marcada como resolvida'); 
    } else { 
      toast.error('Erro ao atualizar triagem');
      // Revert if failed
      fetchTriages(true);
    }
    setResolvingId(null);
  };

  const stats = useMemo(() => ({
    total: triages.length,
    urgentes: triages.filter(t => t.pain_scale >= 8 && t.status !== 'resolvido').length,
    moderadas: triages.filter(t => t.pain_scale >= 5 && t.pain_scale < 8 && t.status !== 'resolvido').length,
    leves: triages.filter(t => t.pain_scale < 5 && t.status !== 'resolvido').length,
    resolvidas: triages.filter(t => t.status === 'resolvido').length,
    pendentes: triages.filter(t => t.status !== 'resolvido').length,
  }), [triages]);

  const filteredAndSorted = useMemo(() => {
    let result = triages;

    // Filtering by Tabs
    switch (filter) {
      case 'urgentes':   result = result.filter(t => t.pain_scale >= 8 && t.status !== 'resolvido'); break;
      case 'moderadas':  result = result.filter(t => t.pain_scale >= 5 && t.pain_scale < 8 && t.status !== 'resolvido'); break;
      case 'leves':      result = result.filter(t => t.pain_scale < 5 && t.status !== 'resolvido'); break;
      case 'resolvidas': result = result.filter(t => t.status === 'resolvido'); break;
    }

    // Searching
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => 
        t.pacientes?.nome?.toLowerCase().includes(q) || 
        t.pacientes?.telefone?.includes(q) ||
        t.symptoms?.toLowerCase().includes(q)
      );
    }

    // Sorting
    return result.sort((a, b) => {
      if (sortOrder === 'pain_desc') return b.pain_scale - a.pain_scale || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'pain_asc') return a.pain_scale - b.pain_scale || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      // recent
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [triages, filter, search, sortOrder]);

  const getPainColorClass = (score: number) => {
    if (score >= 9) return 'text-rose-600 bg-rose-500/10 border-rose-500/20'; // Emergência
    if (score >= 6) return 'text-amber-600 bg-amber-500/10 border-amber-500/20'; // Urgência
    if (score >= 3) return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20'; // Atenção
    return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'; // Leve
  };

  const getPainProgressClass = (score: number) => {
    if (score >= 9) return 'bg-rose-600';
    if (score >= 6) return 'bg-amber-500';
    if (score >= 3) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

    if (loading) {
      return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-4 w-[350px]" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
            ))}
          </div>
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-[400px]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="flex md:flex-col items-center md:justify-center md:w-20 flex-shrink-0 gap-3 md:gap-2">
                      <Skeleton className="h-12 w-16" />
                      <Skeleton className="h-2 w-full mt-1" />
                    </div>
                    <Separator orientation="vertical" className="hidden md:block h-auto" />
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-3 w-[100px]" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-[100px]" />
                      </div>
                      <Skeleton className="h-16 w-full rounded-lg" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-destructive" />
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
          { label: 'Urgentes (≥6)', value: stats.urgentes, className: 'border-rose-500/20 bg-rose-500/5' },
          { label: 'Pendentes', value: stats.pendentes, className: 'border-amber-500/20 bg-amber-500/5' },
          { label: 'Resolvidas', value: stats.resolvidas, className: 'border-emerald-500/20 bg-emerald-500/5' },
        ].map(s => (
          <Card key={s.label} className={`shadow-sm ${s.className}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className="text-2xl font-bold tracking-tight mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as FilterType)} className="justify-start flex-wrap bg-muted/50 p-1 rounded-lg">
          <ToggleGroupItem value="todas" className="text-xs h-8 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm">Todas <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1">{stats.total}</Badge></ToggleGroupItem>
          <ToggleGroupItem value="urgentes" className="text-xs h-8 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm">Urgentes <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1">{stats.urgentes}</Badge></ToggleGroupItem>
          <ToggleGroupItem value="moderadas" className="text-xs h-8 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm">Moderadas <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1">{stats.moderadas}</Badge></ToggleGroupItem>
          <ToggleGroupItem value="leves" className="text-xs h-8 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm">Leves <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1">{stats.leves}</Badge></ToggleGroupItem>
          <ToggleGroupItem value="resolvidas" className="text-xs h-8 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm">Resolvidas <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1">{stats.resolvidas}</Badge></ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar paciente ou sintoma..."
              className="pl-9 h-10 text-sm shadow-sm bg-background"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 text-muted-foreground shadow-sm w-full sm:w-auto bg-background">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Ordenar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder('pain_desc')} className="gap-2">
                <HeartPulse className="h-4 w-4 text-rose-500" /> Maior Dor Primeiro
                {sortOrder === 'pain_desc' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder('pain_asc')} className="gap-2">
                <Activity className="h-4 w-4 text-emerald-500" /> Menor Dor Primeiro
                {sortOrder === 'pain_asc' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder('recent')} className="gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> Mais Recentes
                {sortOrder === 'recent' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Triages list */}
      {filteredAndSorted.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-20 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center relative shadow-sm">
                {filter === 'urgentes' ? (
                  <ShieldAlert className="h-10 w-10 text-rose-500" strokeWidth={1.5} />
                ) : filter === 'resolvidas' ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
                ) : (
                  <Activity className="h-10 w-10 text-primary" strokeWidth={1.5} />
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {search ? 'Nenhuma triagem encontrada' : filter === 'urgentes' ? 'Nenhuma urgência no momento' : 'Nenhuma triagem nesta categoria'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-[320px] leading-relaxed">
              {search 
                ? 'Tente buscar com outros termos ou verifique a ortografia.' 
                : filter === 'urgentes' 
                  ? 'Excelente! Não há pacientes aguardando com prioridade máxima.' 
                  : 'A fila está limpa. Novas triagens aparecerão aqui automaticamente.'}
            </p>
            {search && (
              <Button variant="outline" onClick={() => setSearch('')} className="mt-6 shadow-sm">
                Limpar busca
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAndSorted.map((triage) => {
            const isResolved = triage.status === 'resolvido';
            const isUrgent = triage.pain_scale >= 6;
            
            const painColorClass = getPainColorClass(triage.pain_scale);
            const progressColorClass = getPainProgressClass(triage.pain_scale);

            return (
              <Card key={triage.id} className={`shadow-sm transition-all hover:shadow-md ${isResolved ? 'opacity-60 grayscale-[0.3]' : ''} ${!isResolved && isUrgent ? 'border-rose-500/40 bg-rose-500/[0.02]' : ''}`}>
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col md:flex-row gap-5 sm:gap-6">
                    {/* Pain score */}
                    <div className="flex md:flex-col items-center md:justify-center md:w-24 flex-shrink-0 gap-4 md:gap-2 bg-muted/30 p-4 rounded-xl border border-border/50">
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Dor</p>
                        <p className={`text-4xl font-black leading-none tracking-tighter ${painColorClass.split(' ')[0]}`}>{triage.pain_scale}<span className="text-lg font-semibold text-muted-foreground/50">/10</span></p>
                      </div>
                      <div className="flex-1 md:w-full">
                        <Progress value={triage.pain_scale * 10} className={`h-2.5 shadow-inner [&>div]:${progressColorClass}`} />
                      </div>
                    </div>

                    <Separator orientation="vertical" className="hidden md:block h-auto" />

                    {/* Main content */}
                    <div className="flex-1 space-y-4 min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 border border-border/50 shadow-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap mb-0.5">
                              <p className="text-base font-bold text-foreground">{triage.pacientes?.nome || 'Paciente Desconhecido'}</p>
                              {isResolved && <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-600 bg-emerald-500/10 font-semibold">Resolvido</Badge>}
                              {!isResolved && isUrgent && <Badge variant="destructive" className="text-[10px] font-semibold animate-pulse">Urgente</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {new Date(triage.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                          {!isResolved && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="h-8 gap-1.5 text-xs w-full sm:w-auto shadow-sm">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolver Triagem
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Arquivar Triagem?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja marcar a triagem de <strong className="text-foreground">{triage.pacientes?.nome}</strong> como resolvida? O paciente sairá da fila de prioridade.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleMarkResolved(triage.id)}>
                                    Sim, Resolver
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/30 p-4 border border-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <Activity className="h-3 w-3" /> Sintomas Relatados
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{triage.symptoms}</p>
                      </div>

                      {triage.red_flags && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
                          <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1">Sinais de Alerta Identificados</p>
                            <p className="text-sm text-rose-600 font-medium leading-relaxed">{triage.red_flags}</p>
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
