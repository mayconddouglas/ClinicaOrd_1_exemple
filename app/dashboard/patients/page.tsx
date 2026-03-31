'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPatients, createPatient, updatePatient, deletePatient } from '../../../lib/dashboard-tools';
import { Users, Search, Phone, FileText, Plus, Pencil, Trash2, X, User, MoreHorizontal, ArrowUpDown, Clock, Filter, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Patient = { id: string; nome: string; cpf?: string; telefone?: string; created_at?: string };
const emptyForm = { nome: '', cpf: '', telefone: '' };

const AVATAR_COLORS = [
  'bg-violet-500/10 text-violet-500', 'bg-blue-500/10 text-blue-500',
  'bg-emerald-500/10 text-emerald-500', 'bg-amber-500/10 text-amber-500',
  'bg-pink-500/10 text-pink-500', 'bg-indigo-500/10 text-indigo-500',
];
function getInitials(name: string) { return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(); }
function getColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

// Máscaras de formatação
const formatCPF = (value: string) => {
  return value.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
};

const isNewPatient = (dateString?: string) => {
  if (!dateString) return false;
  const created = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffInHours <= 48; // Considera "Novo" se cadastrado nas últimas 48 horas
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Paginação e Ordenação
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'recent' | 'alphabetical'>('recent');
  const itemsPerPage = 10;

  const fetchPatients = useCallback(async (query?: string) => {
    setLoading(true);
    const res = await getPatients(query);
    if (res.success) {
      setPatients(res.data || []);
      setCurrentPage(1); // Reset page on new search
    }
    else toast.error('Erro ao buscar pacientes');
    setLoading(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchPatients(search.trim() || undefined); };
  const handleClearSearch = () => { setSearch(''); fetchPatients(); };

  // Sorting and Pagination Logic
  const sortedPatients = [...patients].sort((a, b) => {
    if (sortOrder === 'alphabetical') {
      return a.nome.localeCompare(b.nome);
    }
    // Default to recent
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const paginatedPatients = sortedPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenModal = (patient?: Patient) => {
    if (patient) { setEditingPatient(patient); setFormData({ nome: patient.nome || '', cpf: patient.cpf || '', telefone: patient.telefone || '' }); }
    else { setEditingPatient(null); setFormData(emptyForm); }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingPatient(null); setFormData(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) { toast.error('O nome é obrigatório'); return; }
    setIsSubmitting(true);
    try {
      const res = editingPatient
        ? await updatePatient(editingPatient.id, formData)
        : await createPatient(formData);
      if (res.success) {
        toast.success(editingPatient ? 'Paciente atualizado' : 'Paciente cadastrado');
        fetchPatients(search || undefined);
        handleCloseModal();
      } else toast.error('Erro ao salvar: ' + (res as any).error);
    } catch { toast.error('Erro inesperado'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deletePatient(id);
    if (res.success) { toast.success('Paciente excluído'); fetchPatients(search || undefined); }
    else toast.error('Erro ao excluir. Pode haver registros vinculados.');
    setDeletingId(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Pacientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie o cadastro e histórico dos pacientes.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Paciente
        </Button>
      </div>

      {/* Search + stats */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar paciente por nome, CPF ou telefone..."
                className="pl-9 pr-8 h-10 text-sm shadow-sm"
              />
              {search && (
                <button type="button" onClick={handleClearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="secondary" className="h-10 shadow-sm">Buscar</Button>
          </form>
          
          {/* Ordenação Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 text-muted-foreground shadow-sm w-full sm:w-auto">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Ordenar por</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder('recent')} className="gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Mais Recentes
                {sortOrder === 'recent' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder('alphabetical')} className="gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Ordem Alfabética
                {sortOrder === 'alphabetical' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!loading && (
          <Badge variant="outline" className="gap-1.5 text-xs h-7 px-3 bg-background shadow-sm whitespace-nowrap">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{patients.length}</span> paciente(s)
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        {loading ? (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[150px]" />
                          <Skeleton className="h-3 w-[100px]" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : patients.length === 0 ? (
          <CardContent className="py-20 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center relative shadow-sm">
                <User className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">Nenhum paciente encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-[320px] leading-relaxed">
              {search 
                ? 'Tente buscar com outros termos ou verifique a ortografia.' 
                : 'Você ainda não possui nenhum paciente cadastrado no sistema.'}
            </p>
            {!search && (
              <Button onClick={() => handleOpenModal()} className="mt-6 gap-2 shadow-sm">
                <Plus className="h-4 w-4" /> Cadastrar primeiro paciente
              </Button>
            )}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paciente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cadastro</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPatients.map(patient => (
                  <TableRow key={patient.id} className="border-b border-border/30 group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
                          <AvatarFallback className={`text-xs font-bold ${getColor(patient.nome)}`}>
                            {getInitials(patient.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold flex items-center gap-2">
                            {patient.nome}
                            {isNewPatient(patient.created_at) && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
                                Novo
                              </Badge>
                            )}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                        {patient.cpf ? (
                          <span className="font-mono text-xs">{formatCPF(patient.cpf)}</span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground/60 font-normal bg-transparent border-dashed">Não informado</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                        {patient.telefone ? (
                          <span className="font-mono text-xs">{formatPhone(patient.telefone)}</span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground/60 font-normal bg-transparent border-dashed">Não informado</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                        {patient.created_at ? new Date(patient.created_at).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => toast.info('Funcionalidade em desenvolvimento')}>
                            <Eye className="h-4 w-4 text-muted-foreground" /> Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleOpenModal(patient)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" /> Editar Cadastro
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          
                          {/* Alert Dialog Wrapper for Dropdown Item */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4" /> Excluir Paciente
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Paciente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o paciente <strong className="text-foreground">{patient.nome}</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(patient.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Sim, Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Pagination Footer */}
        {!loading && patients.length > 0 && totalPages > 1 && (
          <div className="p-4 border-t border-border/50 bg-muted/10">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink 
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      {/* Modal / Sheet */}
      <Sheet open={isModalOpen} onOpenChange={handleCloseModal}>
        <SheetContent className="sm:max-w-md overflow-y-auto flex flex-col h-full px-4 sm:px-8 py-4 sm:py-8">
          <SheetHeader className="pb-3 sm:pb-6 border-b border-border/50">
            <SheetTitle className="text-lg sm:text-2xl">{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm mt-1 sm:mt-1.5">
              {editingPatient ? 'Atualize os dados do paciente abaixo.' : 'Preencha os dados para cadastrar um novo paciente.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col pt-4 sm:pt-8 pb-2">
            <div className="space-y-4 sm:space-y-8">
              <div className="space-y-1.5 sm:space-y-2.5">
                <Label htmlFor="nome" className="text-xs sm:text-sm font-semibold">Nome completo <span className="text-destructive">*</span></Label>
                <Input id="nome" autoFocus required value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: João da Silva" className="h-9 sm:h-12 text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2.5">
                <Label htmlFor="cpf" className="text-xs sm:text-sm font-semibold">CPF</Label>
                <Input id="cpf" value={formatCPF(formData.cpf || '')}
                  onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00" className="h-9 sm:h-12 text-sm font-mono" maxLength={14} />
              </div>
              <div className="space-y-1.5 sm:space-y-2.5">
                <Label htmlFor="telefone" className="text-xs sm:text-sm font-semibold">Telefone</Label>
                <Input id="telefone" value={formatPhone(formData.telefone || '')}
                  onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999" className="h-9 sm:h-12 text-sm font-mono" maxLength={15} />
              </div>
            </div>
            
            <div className="mt-8 sm:mt-16 pt-4 sm:pt-6 border-t border-border/50">
              <SheetFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto h-9 sm:h-12 px-6">Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto h-9 sm:h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                  {isSubmitting ? 'Salvando...' : editingPatient ? 'Salvar alterações' : 'Cadastrar Paciente'}
                </Button>
              </SheetFooter>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
