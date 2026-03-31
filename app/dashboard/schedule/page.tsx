'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, AlertCircle, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getBusinessHours, updateBusinessHours, getScheduleBlocks, createScheduleBlock, deleteScheduleBlock } from '../../../lib/schedule-tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<'hours' | 'blocks'>('hours');
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [loadingHours, setLoadingHours] = useState(true);
  const [savingHours, setSavingHours] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({ block_date: new Date(), start_time: '08:00', end_time: '18:00', reason: '' });

  const fetchBusinessHours = useCallback(async (showLoader = true) => {
    if (showLoader) setLoadingHours(true);
    const res = await getBusinessHours();
    if (res.success) setBusinessHours(res.data || []);
    else toast.error('Erro ao carregar horários. Verifique se as tabelas existem no banco.');
    setLoadingHours(false);
  }, []);

  const fetchBlocks = useCallback(async (showLoader = true) => {
    if (showLoader) setLoadingBlocks(true);
    const res = await getScheduleBlocks();
    if (res.success) setBlocks(res.data || []);
    setLoadingBlocks(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchBusinessHours(false);
      await fetchBlocks(false);
    };
    init();
  }, [fetchBusinessHours, fetchBlocks]);

  const handleUpdateHour = async (id: number, field: string, value: any) => {
    setBusinessHours(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
    setSavingHours(id);
    const res = await updateBusinessHours(id, { [field]: value });
    if (!res.success) { toast.error('Erro ao salvar horário'); fetchBusinessHours(); }
    else toast.success('Horário atualizado');
    setSavingHours(null);
  };

  const handleCopyMondayToWeek = async () => {
    const monday = businessHours.find(h => h.day_of_week === 1);
    if (!monday) return;
    
    // Pegar apenas os dias úteis (Terça=2 a Sexta=5)
    const targetDays = businessHours.filter(h => h.day_of_week >= 2 && h.day_of_week <= 5);
    
    if (targetDays.length === 0) return;
    
    if (!window.confirm('Deseja copiar os horários de Segunda-feira para todos os dias úteis (Terça a Sexta)?')) return;

    setSavingHours(-1); // Indicador visual de salvamento em lote
    let hasError = false;

    // Atualiza otimista no frontend
    setBusinessHours(prev => prev.map(h => {
      if (h.day_of_week >= 2 && h.day_of_week <= 5) {
        return { 
          ...h, 
          is_closed: monday.is_closed,
          open_time: monday.open_time,
          close_time: monday.close_time,
          lunch_start: monday.lunch_start,
          lunch_end: monday.lunch_end,
          slot_duration: monday.slot_duration
        };
      }
      return h;
    }));

    // Salva no banco sequencialmente para não sobrecarregar
    for (const day of targetDays) {
      const res = await updateBusinessHours(day.id, {
        is_closed: monday.is_closed,
        open_time: monday.open_time,
        close_time: monday.close_time,
        lunch_start: monday.lunch_start,
        lunch_end: monday.lunch_end,
        slot_duration: monday.slot_duration
      });
      if (!res.success) hasError = true;
    }

    if (hasError) {
      toast.error('Erro ao copiar alguns horários. Recarregando...');
      fetchBusinessHours();
    } else {
      toast.success('Horários copiados para os dias úteis!');
    }
    setSavingHours(null);
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlock.block_date || !newBlock.start_time || !newBlock.end_time) { toast.error('Preencha data e horários'); return; }
    setIsAddingBlock(true);
    
    // Format date to YYYY-MM-DD for database
    const formattedDate = format(newBlock.block_date, 'yyyy-MM-dd');
    
    const res = await createScheduleBlock({
      ...newBlock,
      block_date: formattedDate
    });
    
    if (res.success) { 
      toast.success('Bloqueio adicionado'); 
      setNewBlock({ block_date: new Date(), start_time: '08:00', end_time: '18:00', reason: '' }); 
      setIsSheetOpen(false);
      fetchBlocks(); 
    }
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
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          Horários e Agenda
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure a grade de horários da clínica e gerencie exceções.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-primary font-medium">Dias abertos / semana</p>
            <p className="text-2xl font-bold text-primary mt-1">{openDays} <span className="text-sm font-normal text-primary/70">dias</span></p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Bloqueios ativos</p>
            <p className="text-2xl font-bold mt-1">{blocks.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Slot padrão</p>
            <p className="text-2xl font-bold mt-1">
              {businessHours.find(h => !h.is_closed)?.slot_duration || '—'}<span className="text-sm font-normal text-muted-foreground"> min</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'hours' | 'blocks')}>
        <TabsList>
          <TabsTrigger value="hours">Grade de Horários</TabsTrigger>
          <TabsTrigger value="blocks" className="gap-2">
            Bloqueios / Feriados
            {blocks.length > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{blocks.length}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Hours tab */}
      {activeTab === 'hours' && (
        <>
          {loadingHours ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="shadow-sm">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-4 md:p-5">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-6 w-6" />
                      <Skeleton className="h-6 w-[120px]" />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
                      <Skeleton className="h-10 w-[120px]" />
                      <Skeleton className="h-10 w-[120px]" />
                      <Skeleton className="h-9 w-[100px]" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : businessHours.length === 0 ? (
            <Card className="shadow-sm border-amber-500/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-amber-500/10 rounded-lg flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1">Tabelas não encontradas</p>
                    <p className="text-xs text-muted-foreground mb-3">Execute o SQL abaixo no SQL Editor do Supabase:</p>
                    <pre className="bg-muted text-muted-foreground p-4 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{`CREATE TABLE business_hours (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL UNIQUE,
  open_time TIME NOT NULL DEFAULT '08:00:00',
  close_time TIME NOT NULL DEFAULT '18:00:00',
  lunch_start TIME, lunch_end TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  slot_duration INTEGER NOT NULL DEFAULT 30
);
INSERT INTO business_hours (day_of_week, is_closed) VALUES
  (0, true),(1,false),(2,false),(3,false),(4,false),(5,false),(6,true);

CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm overflow-hidden">
              <div className="divide-y divide-border/50">
                {businessHours.map((day) => (
                  <div key={day.id} className={`p-4 sm:p-5 transition-colors hover:bg-muted/20 ${day.is_closed ? 'opacity-60 bg-muted/10' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6">
                      {/* Day + toggle */}
                      <div className="flex items-center gap-3 sm:gap-4 md:w-60 flex-shrink-0">
                        <div className={`flex h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm font-bold ${day.is_closed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                          {DAYS_SHORT[day.day_of_week]}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <div>
                            <p className="text-sm sm:text-base font-semibold truncate">{DAYS_OF_WEEK[day.day_of_week]}</p>
                            <p className={`text-[10px] sm:text-xs font-medium ${day.is_closed ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                              {day.is_closed ? 'Fechado' : 'Aberto para agendamento'}
                            </p>
                          </div>
                          {day.day_of_week === 1 && !day.is_closed && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleCopyMondayToWeek}
                                  disabled={savingHours !== null}
                                  className="h-6 w-6 ml-1 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar horários para os dias úteis (Ter-Sex)</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center">
                              <Switch
                                checked={!day.is_closed}
                                onCheckedChange={checked => handleUpdateHour(day.id, 'is_closed', !checked)}
                                disabled={savingHours === day.id}
                                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700 shadow-sm scale-90 sm:scale-100 transition-all duration-200 ease-in-out"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{day.is_closed ? 'Habilitar dia' : 'Desabilitar dia'}</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Time pickers */}
                      {!day.is_closed && (
                        <div className="flex-1 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 items-end">
                          {[
                            { label: 'Abertura', field: 'open_time', value: day.open_time },
                            { label: 'Fechamento', field: 'close_time', value: day.close_time },
                            { label: 'Almoço Início', field: 'lunch_start', value: day.lunch_start, optional: true },
                            { label: 'Almoço Fim', field: 'lunch_end', value: day.lunch_end, optional: true },
                          ].map(({ label, field, value, optional }) => (
                            <div key={field} className="flex flex-col gap-1.5 sm:flex-1 sm:min-w-[100px]">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
                              <Input
                                type="time"
                                value={value?.substring(0, 5) || ''}
                                onChange={e => handleUpdateHour(day.id, field, e.target.value ? e.target.value + ':00' : optional ? null : e.target.value)}
                                className="h-9 sm:h-10 text-xs sm:text-sm bg-background w-full"
                              />
                            </div>
                          ))}
                          <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[100px]">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Slot (Duração)</Label>
                            <Select
                              value={String(day.slot_duration || 30)}
                              onValueChange={v => handleUpdateHour(day.id, 'slot_duration', parseInt(v))}
                            >
                              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm bg-background w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[15, 20, 30, 45, 60].map(m => (
                                  <SelectItem key={m} value={String(m)}>{m === 60 ? '1 hora' : `${m} min`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {savingHours === day.id && (
                            <div className="col-span-2 sm:col-span-1 flex items-center justify-center sm:justify-start h-9 sm:h-10 w-full sm:w-10">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                          )}
                        </div>
                      )}
                      {day.is_closed && (
                        <div className="flex-1 flex items-center h-full">
                          <p className="text-xs text-muted-foreground italic bg-muted/30 px-3 py-2 rounded-md w-full border border-border/40">
                            Ative o toggle ao lado para configurar os horários de funcionamento deste dia.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Blocks tab */}
      {activeTab === 'blocks' && (
        <div className="space-y-5">
          <Card className="shadow-sm">
            <CardHeader className="pb-4 sm:pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold">Bloqueios Cadastrados</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">Períodos em que a agenda estará fechada para agendamentos.</CardDescription>
                </div>
                <Button onClick={() => setIsSheetOpen(true)} className="gap-2 shrink-0 h-9 sm:h-10 text-xs sm:text-sm">
                  <Plus className="h-4 w-4" /> Novo Bloqueio
                </Button>
              </div>
            </CardHeader>
            <Separator />
            {loadingBlocks ? (
              <CardContent className="py-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
              </CardContent>
            ) : blocks.length === 0 ? (
              <CardContent className="py-16 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center relative shadow-sm">
                    <CalendarIcon className="h-10 w-10 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">Nenhum bloqueio cadastrado</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-[320px] leading-relaxed">
                  Adicione feriados, férias ou períodos de manutenção para evitar que pacientes agendem nesses dias.
                </p>
                <Button onClick={() => setIsSheetOpen(true)} className="mt-6 gap-2 shadow-sm">
                  <Plus className="h-4 w-4" /> Adicionar meu primeiro bloqueio
                </Button>
              </CardContent>
            ) : (
              <div className="divide-y divide-border/40">
                {blocks.map(block => (
                  <div key={block.id} className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex-shrink-0 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-rose-500/10">
                      <Clock className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm sm:text-base font-semibold text-foreground">
                          {new Date(block.block_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-medium border-border/50">
                          {block.start_time.substring(0, 5)} às {block.end_time.substring(0, 5)}
                        </Badge>
                      </div>
                      {block.reason ? (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{block.reason}</p>
                      ) : (
                        <p className="text-xs sm:text-sm text-muted-foreground/50 italic">Sem motivo informado</p>
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteBlock(block.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remover bloqueio</TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Sheet para Novo Bloqueio */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md w-full flex flex-col h-full px-4 sm:px-8 py-4 sm:py-8">
          <SheetHeader className="pb-3 sm:pb-6 border-b border-border/50">
            <SheetTitle className="text-lg sm:text-2xl">Novo Bloqueio</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm mt-1 sm:mt-1.5">
              Defina a data e o período em que a agenda estará indisponível para novos agendamentos.
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={handleAddBlock} className="flex-1 flex flex-col pt-4 sm:pt-8 pb-2">
            <div className="space-y-5 sm:space-y-6">
              
              {/* Date Picker */}
              <div className="space-y-1.5 sm:space-y-2.5">
                <Label className="text-xs sm:text-sm font-semibold">Data do Bloqueio <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-10 sm:h-12 justify-start text-left font-normal text-sm",
                        !newBlock.block_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newBlock.block_date ? format(newBlock.block_date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newBlock.block_date}
                      onSelect={(date) => date && setNewBlock({ ...newBlock, block_date: date })}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2.5">
                  <Label className="text-xs sm:text-sm font-semibold">Início <span className="text-destructive">*</span></Label>
                  <Input 
                    type="time" 
                    required 
                    value={newBlock.start_time} 
                    onChange={e => setNewBlock({ ...newBlock, start_time: e.target.value })} 
                    className="h-10 sm:h-12 text-sm" 
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2.5">
                  <Label className="text-xs sm:text-sm font-semibold">Fim <span className="text-destructive">*</span></Label>
                  <Input 
                    type="time" 
                    required 
                    value={newBlock.end_time} 
                    onChange={e => setNewBlock({ ...newBlock, end_time: e.target.value })} 
                    className="h-10 sm:h-12 text-sm" 
                  />
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5 sm:space-y-2.5">
                <Label className="text-xs sm:text-sm font-semibold">Motivo (Opcional)</Label>
                <Input 
                  type="text" 
                  placeholder="Ex: Feriado Nacional, Férias do Dr. João..." 
                  value={newBlock.reason} 
                  onChange={e => setNewBlock({ ...newBlock, reason: e.target.value })} 
                  className="h-10 sm:h-12 text-sm" 
                />
              </div>

            </div>
            
            <div className="mt-auto pt-6 border-t border-border/50">
              <SheetFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)} className="w-full sm:w-auto h-10 sm:h-12 px-6">Cancelar</Button>
                <Button type="submit" disabled={isAddingBlock} className="w-full sm:w-auto h-10 sm:h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                  {isAddingBlock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isAddingBlock ? 'Salvando...' : 'Adicionar Bloqueio'}
                </Button>
              </SheetFooter>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
