'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getMedicos, createMedico, updateMedico, deleteMedico } from '../../../lib/dashboard-tools';
import { Stethoscope, Plus, Search, Pencil, Trash2, X, Phone, Mail, User, Building2, Loader2, MoreHorizontal, Filter, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Medico = { id: string; nome: string; crm: string; especialidade: string; telefone?: string; email?: string; bio?: string; disponivel: boolean; created_at: string; };

const ESPECIALIDADES = ['Ortopedia Geral','Joelho','Coluna','Quadril','Ombro e Cotovelo','Mão e Punho','Pé e Tornozelo','Oncologia Ortopédica','Ortopedia Pediátrica','Traumatologia'];
const emptyForm = { nome: '', crm: '', especialidade: '', telefone: '', email: '', bio: '', disponivel: true };
const AVATAR_COLORS = ['bg-blue-500/10 text-blue-500','bg-cyan-500/10 text-cyan-500','bg-violet-500/10 text-violet-500','bg-emerald-500/10 text-emerald-500','bg-amber-500/10 text-amber-500'];
function getInitials(name: string) { return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(); }
function getColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDisp, setFilterDisp] = useState<'todos' | 'disponiveis' | 'indisponiveis'>('todos');
  const [filterEspecialidade, setFilterEspecialidade] = useState<string>('todas');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchMedicos = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const res = await getMedicos();
    if (res.success) setMedicos(res.data || []);
    else toast.error('Erro ao carregar médicos');
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchMedicos(false);
    };
    init();
  }, [fetchMedicos]);

  const filtered = useMemo(() => {
    let list = medicos;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.nome.toLowerCase().includes(q) || m.especialidade.toLowerCase().includes(q) || m.crm.toLowerCase().includes(q));
    }
    if (filterDisp === 'disponiveis') list = list.filter(m => m.disponivel);
    if (filterDisp === 'indisponiveis') list = list.filter(m => !m.disponivel);
    if (filterEspecialidade !== 'todas') list = list.filter(m => m.especialidade === filterEspecialidade);
    return list;
  }, [medicos, search, filterDisp, filterEspecialidade]);

  const uniqueEspecialidades = useMemo(() => Array.from(new Set(medicos.map(m => m.especialidade))).sort(), [medicos]);

  const stats = useMemo(() => ({
    total: medicos.length,
    disponiveis: medicos.filter(m => m.disponivel).length,
    especialidades: new Set(medicos.map(m => m.especialidade)).size,
  }), [medicos]);

  const handleOpenModal = (medico?: Medico) => {
    if (medico) { setEditingId(medico.id); setForm({ nome: medico.nome, crm: medico.crm, especialidade: medico.especialidade, telefone: medico.telefone || '', email: medico.email || '', bio: medico.bio || '', disponivel: medico.disponivel }); }
    else { setEditingId(null); setForm(emptyForm); }
    setShowModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.crm || !form.especialidade) { toast.error('Nome, CRM e especialidade são obrigatórios'); return; }
    setSaving(true);
    const res = editingId ? await updateMedico(editingId, form) : await createMedico(form);
    if (res.success) { toast.success(editingId ? 'Médico atualizado' : 'Médico cadastrado'); fetchMedicos(); handleCloseModal(); }
    else toast.error('Erro ao salvar: ' + (res as any).error);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deleteMedico(id);
    if (res.success) { toast.success('Médico removido'); fetchMedicos(); }
    else toast.error('Erro ao remover médico');
    setDeletingId(null);
  };

  const handleToggleDisp = async (medico: Medico) => {
    setToggling(medico.id);
    const res = await updateMedico(medico.id, { disponivel: !medico.disponivel });
    if (res.success) { toast.success(medico.disponivel ? 'Marcado como indisponível' : 'Marcado como disponível'); fetchMedicos(); }
    else toast.error('Erro ao atualizar disponibilidade');
    setToggling(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Médicos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie o corpo clínico e a disponibilidade de cada especialista.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Médico
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total de Médicos</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-primary font-medium">Disponíveis</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.disponiveis}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-cyan-500/20 bg-cyan-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-primary font-medium">Especialidades</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.especialidades}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar médico por nome, CRM..." className="pl-9 pr-8 h-10 text-sm shadow-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 text-muted-foreground shadow-sm flex-1 sm:flex-none">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Especialidade</span>
                {filterEspecialidade !== 'todas' && <Badge variant="secondary" className="ml-1 h-5 px-1.5 rounded-sm">{filterEspecialidade}</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Filtrar por Especialidade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={filterEspecialidade === 'todas'} onCheckedChange={() => setFilterEspecialidade('todas')}>
                Todas as Especialidades
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {uniqueEspecialidades.map(esp => (
                <DropdownMenuCheckboxItem key={esp} checked={filterEspecialidade === esp} onCheckedChange={() => setFilterEspecialidade(esp)}>
                  {esp}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 text-muted-foreground shadow-sm flex-1 sm:flex-none">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Disponibilidade</span>
                {filterDisp !== 'todos' && <Badge variant="secondary" className="ml-1 h-5 px-1.5 rounded-sm capitalize">{filterDisp}</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Status na Agenda</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={filterDisp === 'todos'} onCheckedChange={() => setFilterDisp('todos')}>Mostrar Todos</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterDisp === 'disponiveis'} onCheckedChange={() => setFilterDisp('disponiveis')}>Apenas Disponíveis</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterDisp === 'indisponiveis'} onCheckedChange={() => setFilterDisp('indisponiveis')}>Indisponíveis</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Doctors Table/List */}
      {loading ? (
        <Card className="shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Médico</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex gap-3 items-center">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px] rounded-md" /></TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-[100px]" />
                      <Skeleton className="h-3 w-[140px]" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px] rounded-md" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-20 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center relative shadow-sm">
                <Stethoscope className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">Nenhum médico encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-[320px] leading-relaxed">
              {search || filterEspecialidade !== 'todas' || filterDisp !== 'todos'
                ? 'Tente remover alguns filtros ou buscar com outros termos.' 
                : 'Você ainda não possui nenhum especialista cadastrado no corpo clínico.'}
            </p>
            {search || filterEspecialidade !== 'todas' || filterDisp !== 'todos' ? (
              <Button variant="outline" onClick={() => { setSearch(''); setFilterDisp('todos'); setFilterEspecialidade('todas'); }} className="mt-6 shadow-sm">
                Limpar todos os filtros
              </Button>
            ) : (
              <Button onClick={() => handleOpenModal()} className="mt-6 gap-2 shadow-sm">
                <Plus className="h-4 w-4" /> Cadastrar primeiro médico
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">Médico</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(medico => (
                  <TableRow key={medico.id} className="border-b border-border/30 group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                            <AvatarFallback className={`text-xs font-bold ${getColor(medico.nome)}`}>
                              {getInitials(medico.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${medico.disponivel ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold truncate">{medico.nome}</span>
                          <span className="text-xs text-muted-foreground truncate">CRM {medico.crm}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-medium bg-muted text-foreground border-border/50">
                        {medico.especialidade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {medico.telefone ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-muted-foreground/50" /> {medico.telefone}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 italic">Sem telefone</span>
                        )}
                        {medico.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate max-w-[150px]">
                            <Mail className="h-3 w-3 text-muted-foreground/50" /> {medico.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {toggling === medico.id ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={medico.disponivel} 
                            onCheckedChange={() => handleToggleDisp(medico)}
                            className="scale-75 origin-left data-[state=checked]:bg-emerald-500" 
                          />
                          <span className={`text-xs font-medium ${medico.disponivel ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {medico.disponivel ? 'Disponível' : 'Indisponível'}
                          </span>
                        </div>
                      )}
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
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleOpenModal(medico)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" /> Editar Médico
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleToggleDisp(medico)}>
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" /> {medico.disponivel ? 'Pausar Agenda' : 'Liberar Agenda'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          
                          {/* Alert Dialog Wrapper for Dropdown Item */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4" /> Excluir Médico
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Especialista?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o <strong className="text-foreground">{medico.nome}</strong>? Esta ação não pode ser desfeita e removerá o médico da agenda.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(medico.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
        </Card>
      )}

      {/* Modal / Sheet */}
      <Sheet open={showModal} onOpenChange={handleCloseModal}>
        <SheetContent className="sm:max-w-md overflow-y-auto flex flex-col h-full px-4 sm:px-8 py-4 sm:py-8">
          <SheetHeader className="pb-3 sm:pb-6 border-b border-border/50">
            <SheetTitle className="text-lg sm:text-2xl">{editingId ? 'Editar Médico' : 'Novo Médico'}</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm mt-1 sm:mt-1.5">
              {editingId ? 'Atualize os dados do especialista.' : 'Preencha os dados do novo membro do corpo clínico.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col pt-4 sm:pt-8 pb-2">
            <div className="space-y-4 sm:space-y-8">
              <div className="space-y-1.5 sm:space-y-2.5">
                <Label className="text-xs sm:text-sm font-semibold">Nome completo <span className="text-destructive">*</span></Label>
                <Input required autoFocus value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Dr(a). Nome Sobrenome" className="h-9 sm:h-12 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2.5">
                  <Label className="text-xs sm:text-sm font-semibold">CRM <span className="text-destructive">*</span></Label>
                  <Input required value={form.crm} onChange={e => setForm({ ...form, crm: e.target.value })} placeholder="000000/UF" className="h-9 sm:h-12 text-sm" />
                </div>
                <div className="space-y-1.5 sm:space-y-2.5">
                  <Label className="text-xs sm:text-sm font-semibold">Especialidade <span className="text-destructive">*</span></Label>
                  <Select value={form.especialidade} onValueChange={v => setForm({ ...form, especialidade: v })}>
                    <SelectTrigger className="h-9 sm:h-12 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ESPECIALIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2.5">
                  <Label className="text-xs sm:text-sm font-semibold">Telefone</Label>
                  <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 9 9999-9999" className="h-9 sm:h-12 text-sm" />
                </div>
                <div className="space-y-1.5 sm:space-y-2.5">
                  <Label className="text-xs sm:text-sm font-semibold">E-mail</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="medico@clinica.com" className="h-9 sm:h-12 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2.5">
                <Label className="text-xs sm:text-sm font-semibold">Bio / Apresentação</Label>
                <Textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                  placeholder="Breve descrição e experiência do médico..." className="resize-none pt-2 sm:pt-3 text-sm" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3 sm:p-5 mt-1 sm:mt-2">
                <div className="space-y-0.5 sm:space-y-1.5">
                  <Label className="text-xs sm:text-sm font-semibold text-foreground">Disponível para agenda</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug">Pacientes podem agendar com este médico.</p>
                </div>
                <Switch checked={form.disponivel} onCheckedChange={c => setForm({ ...form, disponivel: c })} className="data-[state=checked]:bg-emerald-500 scale-90 sm:scale-100 origin-right" />
              </div>
            </div>
            
            <div className="mt-8 sm:mt-16 pt-4 sm:pt-6 border-t border-border/50">
              <SheetFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto h-9 sm:h-12 px-6">Cancelar</Button>
                <Button type="submit" disabled={saving} className="w-full sm:w-auto h-9 sm:h-12 px-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar Médico'}
                </Button>
              </SheetFooter>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
