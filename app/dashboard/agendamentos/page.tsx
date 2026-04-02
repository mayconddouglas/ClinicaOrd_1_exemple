'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Calendar, Clock, User, Phone, Plus, Filter, MoreHorizontal, CheckCircle2, XCircle, Clock4, CalendarX2, FileText, Stethoscope, Mail } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, isPast } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Paciente {
  nome: string;
  telefone: string;
  cpf?: string;
  email?: string;
}

interface Agendamento {
  id: string;
  paciente_id: string;
  data_hora: string;
  motivo: string;
  especialidade: string;
  status: string;
  pacientes: Paciente;
  medicos?: { nome: string };
}

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters State
  const [dateFilter, setDateFilter] = useState<'todos' | 'hoje' | 'amanha' | 'semana'>('todos');
  const [statusFilter, setStatusFilter] = useState<string[]>(['pendente', 'confirmada']);
  
  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pacientesList, setPacientesList] = useState<{id: string, nome: string, telefone: string}[]>([]);
  const [medicosList, setMedicosList] = useState<{id: string, nome: string, especialidade: string}[]>([]);
  const [newAppt, setNewAppt] = useState({
    paciente_id: '',
    medico_id: '',
    data: '',
    hora: '',
    motivo: ''
  });

  const fetchPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome, telefone')
        .order('nome');
      if (error) throw error;
      if (data) setPacientesList(data);
    } catch (error) {
      console.error('Erro ao buscar pacientes para o formulário:', error);
    }
  };

  const fetchMedicos = async () => {
    try {
      const { data, error } = await supabase
        .from('medicos')
        .select('id, nome, especialidade')
        .eq('disponivel', true)
        .order('nome');
      if (error) throw error;
      if (data) setMedicosList(data);
    } catch (error) {
      console.error('Erro ao buscar médicos para o formulário:', error);
    }
  };

  const fetchAgendamentos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          paciente_id,
          data_hora,
          motivo,
          especialidade,
          status,
          pacientes (
            nome,
            telefone,
            cpf,
            email
          ),
          medicos (
            nome
          )
        `)
        .order('data_hora', { ascending: true });

      if (error) throw error;
      
      if (data) {
        // Formatar o retorno do Supabase (lidar com joins 1:1)
        const formattedData = data.map((item: any) => ({
          ...item,
          pacientes: Array.isArray(item.pacientes) ? item.pacientes[0] : item.pacientes,
          medicos: Array.isArray(item.medicos) ? item.medicos[0] : item.medicos
        })) as Agendamento[];
        
        setAgendamentos(formattedData);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast.error('Não foi possível carregar os agendamentos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
    fetchPacientes();
    fetchMedicos();

    // Configurar realtime subscription para atualizar quando o bot marcar uma consulta
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos'
        },
        () => {
          fetchAgendamentos();
          toast.info('A lista de agendamentos foi atualizada.', {
            icon: <Calendar className="h-4 w-4" />
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const medicosByEspecialidade = medicosList.reduce((acc, medico) => {
    if (!acc[medico.especialidade]) acc[medico.especialidade] = [];
    acc[medico.especialidade].push(medico);
    return acc;
  }, {} as Record<string, typeof medicosList>);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Status atualizado para ${newStatus}.`);
      fetchAgendamentos(); // Atualiza a lista
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Não foi possível atualizar o status.');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || 'pendente';
    if (s === 'confirmada' || s === 'confirmado') {
      return <Badge className="bg-green-500 hover:bg-green-600">Confirmado</Badge>;
    }
    if (s === 'cancelada' || s === 'canceled') {
      return <Badge variant="destructive">Cancelado</Badge>;
    }
    return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">Pendente</Badge>;
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAppt.paciente_id || !newAppt.data || !newAppt.hora) {
      toast.error('Preencha os campos obrigatórios (Paciente, Data e Hora).');
      return;
    }

    if (newAppt.paciente_id === 'new') {
      toast.info('Por favor, acesse a aba "Pacientes" para cadastrar um novo paciente primeiro.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Montar a data ISO (ex: 2023-10-25T14:30:00)
      const dataHoraIso = `${newAppt.data}T${newAppt.hora}:00`;

      const selectedMedico = medicosList.find(m => m.id === newAppt.medico_id);
      const especialidade = selectedMedico ? selectedMedico.especialidade : 'Consulta';

      const { error } = await supabase
        .from('agendamentos')
        .insert([{
          paciente_id: newAppt.paciente_id,
          medico_id: newAppt.medico_id || null,
          data_hora: dataHoraIso,
          especialidade: especialidade,
          motivo: newAppt.motivo,
          status: 'pendente' // Padrão
        }]);

      if (error) throw error;

      toast.success('Agendamento criado com sucesso!');
      setIsSheetOpen(false);
      // Resetar o formulário
      setNewAppt({ paciente_id: '', medico_id: '', data: '', hora: '', motivo: '' });
      // Atualizar a lista
      fetchAgendamentos();
    } catch (error: any) {
      console.error('Erro ao salvar agendamento:', error);
      toast.error('Erro ao criar agendamento. Verifique se o paciente existe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAgendamentos = agendamentos.filter(agendamento => {
    // 1. Search Filter
    const searchLower = searchTerm.toLowerCase();
    const nomePaciente = agendamento.pacientes?.nome?.toLowerCase() || '';
    const motivo = agendamento.motivo?.toLowerCase() || '';
    const matchesSearch = nomePaciente.includes(searchLower) || motivo.includes(searchLower);
    
    // 2. Status Filter
    const s = agendamento.status?.toLowerCase() || 'pendente';
    const normalizedStatus = s === 'confirmado' ? 'confirmada' : (s === 'canceled' ? 'cancelada' : s);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(normalizedStatus);

    // 3. Date Filter
    let matchesDate = true;
    if (dateFilter !== 'todos' && agendamento.data_hora) {
      const dataObj = toDate(agendamento.data_hora, { timeZone: 'America/Sao_Paulo' });
      if (dateFilter === 'hoje') matchesDate = isToday(dataObj);
      if (dateFilter === 'amanha') matchesDate = isTomorrow(dataObj);
      if (dateFilter === 'semana') matchesDate = isThisWeek(dataObj, { weekStartsOn: 0 }); // Domingo
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Agendamentos
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as consultas marcadas pelo assistente de IA ou manualmente.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 relative w-full sm:w-auto justify-center">
                <Filter className="h-4 w-4" />
                Filtrar
                {statusFilter.length < 3 && statusFilter.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Status da Consulta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem 
                checked={statusFilter.includes('pendente')}
                onCheckedChange={() => toggleStatusFilter('pendente')}
              >
                Pendente
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={statusFilter.includes('confirmada')}
                onCheckedChange={() => toggleStatusFilter('confirmada')}
              >
                Confirmado
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem 
                checked={statusFilter.includes('cancelada')}
                onCheckedChange={() => toggleStatusFilter('cancelada')}
              >
                Cancelado
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto shadow-md justify-center">
                <Plus className="h-4 w-4" />
                Novo Agendamento
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Criar Agendamento
                </SheetTitle>
                <SheetDescription>
                  Preencha os dados abaixo para marcar uma nova consulta manualmente.
                </SheetDescription>
              </SheetHeader>
              
              <form onSubmit={handleCreateAppointment} className="space-y-6">
                <div className="space-y-4">
                  {/* Dados do Paciente */}
                  <div className="bg-muted/30 border rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <User className="h-5 w-5" />
                      <h4 className="text-sm font-semibold text-foreground">Dados do Paciente</h4>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paciente">Selecione o Paciente</Label>
                      <Select 
                        required 
                        value={newAppt.paciente_id} 
                        onValueChange={(val) => setNewAppt({...newAppt, paciente_id: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um paciente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pacientesList.map(paciente => (
                            <SelectItem key={paciente.id} value={paciente.id}>
                              {paciente.nome} {paciente.telefone ? `(${paciente.telefone})` : ''}
                            </SelectItem>
                          ))}
                          {pacientesList.length === 0 && (
                            <SelectItem value="empty" disabled>Nenhum paciente encontrado</SelectItem>
                          )}
                          <SelectItem value="new" className="text-primary font-medium">+ Cadastrar Novo Paciente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Data e Hora */}
                  <div className="bg-muted/30 border rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <Calendar className="h-5 w-5" />
                      <h4 className="text-sm font-semibold text-foreground">Data e Horário</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="data">Data da Consulta</Label>
                        <Input 
                          type="date" 
                          id="data" 
                          required 
                          className="w-full focus-visible:ring-primary"
                          value={newAppt.data}
                          onChange={(e) => setNewAppt({...newAppt, data: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hora">Horário</Label>
                        <Input 
                          type="time" 
                          id="hora" 
                          required 
                          className="w-full focus-visible:ring-primary" 
                          value={newAppt.hora}
                          onChange={(e) => setNewAppt({...newAppt, hora: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="bg-muted/30 border rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <Stethoscope className="h-5 w-5" />
                      <h4 className="text-sm font-semibold text-foreground">Detalhes da Consulta</h4>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medico_id">Especialidade / Profissional</Label>
                      <Select 
                        value={newAppt.medico_id}
                        onValueChange={(val) => setNewAppt({...newAppt, medico_id: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o profissional..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(medicosByEspecialidade).map(([esp, profs]) => (
                            <SelectGroup key={esp}>
                              <SelectLabel className="bg-muted/50">{esp}</SelectLabel>
                              {profs.map(p => (
                                <SelectItem key={p.id} value={p.id}>Dr(a). {p.nome}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                          {medicosList.length === 0 && (
                            <SelectItem value="empty" disabled>Nenhum médico cadastrado</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motivo">Motivo / Observações</Label>
                      <Textarea 
                        id="motivo" 
                        placeholder="Ex: Paciente relata dor de dente há 3 dias..."
                        className="resize-none h-20 focus-visible:ring-primary"
                        value={newAppt.motivo}
                        onChange={(e) => setNewAppt({...newAppt, motivo: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <SheetFooter className="pt-4 border-t mt-auto flex-col sm:flex-row gap-2 sm:gap-0">
                  <SheetClose asChild>
                    <Button variant="outline" type="button" className="w-full sm:w-auto">Cancelar</Button>
                  </SheetClose>
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? 'Salvando...' : 'Salvar Agendamento'}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card className="border-muted shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por paciente ou motivo..." 
              className="pl-9 bg-background focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <Badge 
              variant={dateFilter === 'todos' ? 'default' : 'outline'} 
              className={`cursor-pointer whitespace-nowrap transition-colors ${dateFilter === 'todos' ? '' : 'hover:bg-muted'}`}
              onClick={() => setDateFilter('todos')}
            >
              Todos
            </Badge>
            <Badge 
              variant={dateFilter === 'hoje' ? 'default' : 'outline'} 
              className={`cursor-pointer whitespace-nowrap transition-colors ${dateFilter === 'hoje' ? '' : 'hover:bg-muted'}`}
              onClick={() => setDateFilter('hoje')}
            >
              Hoje
            </Badge>
            <Badge 
              variant={dateFilter === 'amanha' ? 'default' : 'outline'} 
              className={`cursor-pointer whitespace-nowrap transition-colors ${dateFilter === 'amanha' ? '' : 'hover:bg-muted'}`}
              onClick={() => setDateFilter('amanha')}
            >
              Amanhã
            </Badge>
            <Badge 
              variant={dateFilter === 'semana' ? 'default' : 'outline'} 
              className={`cursor-pointer whitespace-nowrap transition-colors ${dateFilter === 'semana' ? '' : 'hover:bg-muted'}`}
              onClick={() => setDateFilter('semana')}
            >
              Esta Semana
            </Badge>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[200px]">Paciente</TableHead>
                <TableHead>Data e Hora</TableHead>
                <TableHead>Especialidade / Motivo</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-3 w-[60px]" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAgendamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[400px] text-center p-0">
                    <div className="flex flex-col items-center justify-center h-full w-full bg-muted/10 relative overflow-hidden">
                      {/* Background decorative elements */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                      
                      <div className="relative z-10 flex flex-col items-center max-w-sm px-4">
                        <div className="h-20 w-20 rounded-full bg-background border shadow-sm flex items-center justify-center mb-6 relative">
                          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-[ping_3s_ease-in-out_infinite]"></div>
                          <CalendarX2 className="h-10 w-10 text-muted-foreground" />
                        </div>
                        
                        <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum agendamento encontrado</h3>
                        <p className="text-sm text-muted-foreground mb-8 text-center">
                          {searchTerm || dateFilter !== 'todos' || statusFilter.length > 0 
                            ? "Não encontramos nenhum agendamento com os filtros atuais. Tente limpar os filtros para ver mais resultados."
                            : "Sua agenda está livre! Os agendamentos feitos pela IA aparecerão aqui ou você pode criar um manualmente."}
                        </p>
                        
                        <Button 
                          className="shadow-md transition-all hover:scale-105" 
                          onClick={() => {
                            setSearchTerm('');
                            setDateFilter('todos');
                            setStatusFilter([]);
                            if (agendamentos.length === 0) setIsSheetOpen(true);
                          }}
                        >
                          {searchTerm || dateFilter !== 'todos' || statusFilter.length > 0 ? "Limpar Filtros" : "Criar Primeiro Agendamento"}
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgendamentos.map((agendamento) => {
                  const dataObj = agendamento.data_hora ? toDate(agendamento.data_hora, { timeZone: 'America/Sao_Paulo' }) : null;
                  const isHoje = dataObj ? isToday(dataObj) : false;
                  const isPassado = dataObj ? isPast(dataObj) && !isHoje : false;
                  const isPendenteAtrasado = isPassado && (agendamento.status?.toLowerCase() === 'pendente');
                  
                  return (
                    <TableRow 
                      key={agendamento.id} 
                      className={`group transition-colors hover:bg-muted/30 ${isPendenteAtrasado ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                            isHoje 
                              ? 'bg-blue-500 text-white shadow-sm ring-2 ring-blue-500/20' 
                              : isPendenteAtrasado
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-primary/10 text-primary'
                          }`}>
                            {agendamento.pacientes?.nome?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <span className={`truncate max-w-[150px] ${isPendenteAtrasado ? 'text-muted-foreground' : ''}`} title={agendamento.pacientes?.nome || 'Paciente não identificado'}>
                            {agendamento.pacientes?.nome || 'Paciente não identificado'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className={`flex items-center text-sm ${isHoje ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium'} ${isPendenteAtrasado ? 'text-muted-foreground' : ''}`}>
                            {isHoje ? (
                              <Clock4 className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                            ) : (
                              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            )}
                            {isHoje ? 'Hoje' : dataObj ? format(dataObj, "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Data não informada'}
                          </div>
                          <div className={`flex items-center text-xs ${isHoje ? 'text-blue-600/80 dark:text-blue-400/80 font-medium' : 'text-muted-foreground'}`}>
                            <Clock className="h-3 w-3 mr-1.5" />
                            {dataObj ? format(dataObj, "HH:mm") : '--:--'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">
                            {agendamento.medicos?.nome 
                              ? `Dr(a). ${agendamento.medicos.nome} (${agendamento.especialidade})` 
                              : agendamento.especialidade || 'Clínico Geral'}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={agendamento.motivo}>
                            {agendamento.motivo || 'Nenhum motivo especificado'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                            {agendamento.pacientes?.telefone || 'Não informado'}
                          </div>
                          {agendamento.pacientes?.email && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 mr-1.5 flex-shrink-0" />
                              <span className="truncate max-w-[150px]" title={agendamento.pacientes.email}>
                                {agendamento.pacientes.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(agendamento.status)}
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
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(agendamento.id, 'confirmada')}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                              Confirmar Presença
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(agendamento.id, 'cancelada')}>
                              <XCircle className="mr-2 h-4 w-4 text-red-500" />
                              Cancelar Consulta
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <User className="mr-2 h-4 w-4" />
                              Ver Ficha do Paciente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}