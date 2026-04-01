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
import { Search, Calendar, Clock, User, Phone, Plus, Filter, MoreHorizontal, CheckCircle2, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
} from "@/components/ui/dropdown-menu";

interface Paciente {
  nome: string;
  telefone: string;
  cpf?: string;
}

interface Agendamento {
  id: string;
  paciente_id: string;
  data_hora: string;
  motivo: string;
  especialidade: string;
  status: string;
  pacientes: Paciente;
}

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
            cpf
          )
        `)
        .order('data_hora', { ascending: true });

      if (error) throw error;
      
      if (data) {
        // Formatar o retorno do Supabase (lidar com joins 1:1)
        const formattedData = data.map((item: any) => ({
          ...item,
          pacientes: Array.isArray(item.pacientes) ? item.pacientes[0] : item.pacientes
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

  const filteredAgendamentos = agendamentos.filter(agendamento => {
    const searchLower = searchTerm.toLowerCase();
    const nomePaciente = agendamento.pacientes?.nome?.toLowerCase() || '';
    const motivo = agendamento.motivo?.toLowerCase() || '';
    
    return nomePaciente.includes(searchLower) || motivo.includes(searchLower);
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
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
          <Button className="gap-2 w-full sm:w-auto shadow-md">
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
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
            <Badge variant="outline" className="cursor-pointer hover:bg-muted whitespace-nowrap">Hoje</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted whitespace-nowrap">Amanhã</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted whitespace-nowrap">Esta Semana</Badge>
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
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Calendar className="h-10 w-10 mb-4 opacity-20" />
                      <p className="text-lg font-medium text-foreground">Nenhum agendamento encontrado</p>
                      <p className="text-sm">Os agendamentos feitos pela IA aparecerão aqui automaticamente.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgendamentos.map((agendamento) => {
                  const dataObj = agendamento.data_hora ? parseISO(agendamento.data_hora) : null;
                  
                  return (
                    <TableRow key={agendamento.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
                            {agendamento.pacientes?.nome?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <span className="truncate max-w-[150px]" title={agendamento.pacientes?.nome || 'Paciente não identificado'}>
                            {agendamento.pacientes?.nome || 'Paciente não identificado'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center text-sm font-medium">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            {dataObj ? format(dataObj, "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Data não informada'}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1.5" />
                            {dataObj ? format(dataObj, "HH:mm") : '--:--'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{agendamento.especialidade || 'Clínico Geral'}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={agendamento.motivo}>
                            {agendamento.motivo || 'Nenhum motivo especificado'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 mr-1.5" />
                          {agendamento.pacientes?.telefone || 'Não informado'}
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