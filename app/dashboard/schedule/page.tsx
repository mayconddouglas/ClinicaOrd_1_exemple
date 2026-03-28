'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, Clock, Plus, Trash2, AlertCircle, ChevronRight } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DAYS_OF_WEEK = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<'hours' | 'blocks'>('hours');
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [loadingHours, setLoadingHours] = useState(true);
  const [savingHours, setSavingHours] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({ block_date: '', start_time: '', end_time: '', reason: '' });

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

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlock.block_date || !newBlock.start_time || !newBlock.end_time) { toast.error('Preencha data e horários'); return; }
    setIsAddingBlock(true);
    const res = await createScheduleBlock(newBlock);
    if (res.success) { toast.success('Bloqueio adicionado'); setNewBlock({ block_date: '', start_time: '', end_time: '', reason: '' }); fetchBlocks(); }
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
          <Calendar className="h-6 w-6 text-blue-500" />
          Horários e Agenda
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure a grade de horários da clínica e gerencie exceções.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm border-blue-100 bg-blue-50/30">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 font-medium">Dias abertos / semana</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{openDays} <span className="text-sm font-normal text-blue-400">dias</span></p>
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
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : businessHours.length === 0 ? (
            <Card className="shadow-sm border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-amber-50 rounded-lg flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1">Tabelas não encontradas</p>
                    <p className="text-xs text-muted-foreground mb-3">Execute o SQL abaixo no SQL Editor do Supabase:</p>
                    <pre className="bg-neutral-900 text-neutral-300 p-4 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{`CREATE TABLE business_hours (
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
            <div className="space-y-2">
              {businessHours.map((day) => (
                <Card key={day.id} className={`shadow-sm transition-opacity ${day.is_closed ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Day + toggle */}
                      <div className="flex items-center gap-3 md:w-52 flex-shrink-0">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold ${day.is_closed ? 'bg-muted text-muted-foreground' : 'bg-blue-50 text-blue-700'}`}>
                          {DAYS_SHORT[day.day_of_week]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{DAYS_OF_WEEK[day.day_of_week]}</p>
                          <p className={`text-xs font-medium ${day.is_closed ? 'text-muted-foreground' : 'text-emerald-600'}`}>
                            {day.is_closed ? 'Fechado' : 'Aberto'}
                          </p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Switch
                              checked={!day.is_closed}
                              onCheckedChange={checked => handleUpdateHour(day.id, 'is_closed', !checked)}
                              disabled={savingHours === day.id}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </TooltipTrigger>
                          <TooltipContent>{day.is_closed ? 'Habilitar dia' : 'Desabilitar dia'}</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Time pickers */}
                      {!day.is_closed && (
                        <div className="flex flex-wrap gap-3 flex-1 items-end">
                          {[
                            { label: 'Abertura', field: 'open_time', value: day.open_time },
                            { label: 'Fechamento', field: 'close_time', value: day.close_time },
                            { label: 'Almoço início', field: 'lunch_start', value: day.lunch_start, optional: true },
                            { label: 'Almoço fim', field: 'lunch_end', value: day.lunch_end, optional: true },
                          ].map(({ label, field, value, optional }) => (
                            <div key={field} className="flex flex-col gap-1">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
                              <Input
                                type="time"
                                value={value?.substring(0, 5) || ''}
                                onChange={e => handleUpdateHour(day.id, field, e.target.value ? e.target.value + ':00' : optional ? null : e.target.value)}
                                className="h-8 w-28 text-sm"
                              />
                            </div>
                          ))}
                          <div className="flex flex-col gap-1">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Slot</Label>
                            <Select
                              value={String(day.slot_duration || 30)}
                              onValueChange={v => handleUpdateHour(day.id, 'slot_duration', parseInt(v))}
                            >
                              <SelectTrigger className="h-8 w-24 text-sm">
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
                            <div className="flex items-end pb-1.5">
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            </div>
                          )}
                        </div>
                      )}
                      {day.is_closed && (
                        <p className="text-xs text-muted-foreground italic">Ative o toggle para configurar o horário deste dia.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Blocks tab */}
      {activeTab === 'blocks' && (
        <div className="space-y-5">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-500" /> Adicionar Bloqueio ou Feriado
              </CardTitle>
              <CardDescription className="text-xs">Defina datas e horários em que a agenda estará fechada.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data *</Label>
                  <Input type="date" required value={newBlock.block_date} onChange={e => setNewBlock({ ...newBlock, block_date: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Início *</Label>
                  <Input type="time" required value={newBlock.start_time} onChange={e => setNewBlock({ ...newBlock, start_time: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fim *</Label>
                  <Input type="time" required value={newBlock.end_time} onChange={e => setNewBlock({ ...newBlock, end_time: e.target.value })} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo</Label>
                  <Input type="text" placeholder="Ex: Feriado, Manutenção..." value={newBlock.reason} onChange={e => setNewBlock({ ...newBlock, reason: e.target.value })} className="h-9 text-sm" />
                </div>
                <Button type="submit" disabled={isAddingBlock} className="gap-2 sm:col-span-2 lg:col-span-1 h-9">
                  <Plus className="h-3.5 w-3.5" /> {isAddingBlock ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Bloqueios Cadastrados</CardTitle>
                <Badge variant="secondary" className="text-xs">{blocks.length} bloqueio(s)</Badge>
              </div>
              <CardDescription className="text-xs">Períodos em que a agenda estará fechada para agendamentos.</CardDescription>
            </CardHeader>
            <Separator />
            {loadingBlocks ? (
              <CardContent className="py-10 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </CardContent>
            ) : blocks.length === 0 ? (
              <CardContent className="py-14 text-center">
                <Calendar className="mx-auto h-9 w-9 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum bloqueio cadastrado.</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border/40">
                {blocks.map(block => (
                  <div key={block.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50">
                      <Clock className="h-4 w-4 text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(block.block_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs font-normal">
                          {block.start_time.substring(0, 5)} às {block.end_time.substring(0, 5)}
                        </Badge>
                      </div>
                      {block.reason && <p className="text-xs text-muted-foreground mt-0.5">{block.reason}</p>}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteBlock(block.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
