'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getMedicos, createMedico, updateMedico, deleteMedico } from '../../../lib/dashboard-tools';
import { Stethoscope, Plus, Search, Pencil, Trash2, X, Phone, Mail, User, Building2, Loader2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    return list;
  }, [medicos, search, filterDisp]);

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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CRM ou especialidade..." className="pl-9 h-9 text-sm" />
        </div>
        <Tabs value={filterDisp} onValueChange={(v) => setFilterDisp(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
            <TabsTrigger value="disponiveis" className="text-xs">Disponíveis</TabsTrigger>
            <TabsTrigger value="indisponiveis" className="text-xs">Indisponíveis</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Doctors grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[150px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
                <div className="mt-6 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <Skeleton className="h-5 w-[100px] rounded-full" />
                  <Skeleton className="h-9 w-[120px] rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <User className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground font-medium">
              {search ? 'Nenhum médico encontrado.' : 'Nenhum médico cadastrado ainda.'}
            </p>
            {!search && (
              <Button variant="link" onClick={() => handleOpenModal()} className="mt-1 text-primary hover:text-primary/80 text-sm">
                + Cadastrar primeiro médico
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(medico => (
            <Card key={medico.id} className={`shadow-sm transition-all hover:shadow-md ${!medico.disponivel ? 'opacity-70' : ''}`}>
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className={`text-sm font-bold ${getColor(medico.nome)}`}>
                          {getInitials(medico.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${medico.disponivel ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight truncate">{medico.nome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">CRM {medico.crm}</p>
                    </div>
                  </div>
                  <Badge variant={medico.disponivel ? 'default' : 'secondary'} className="flex-shrink-0 text-[10px]">
                    {medico.disponivel ? 'Disponível' : 'Indisponível'}
                  </Badge>
                </div>

                {/* Specialty */}
                <div className="flex items-center gap-1.5 mb-3">
                  <Building2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <Badge variant="outline" className="text-xs border-primary/20 text-primary bg-primary/10">{medico.especialidade}</Badge>
                </div>

                {/* Bio */}
                {medico.bio && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{medico.bio}</p>}

                {/* Contact */}
                <div className="space-y-1 mb-4">
                  {medico.telefone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 flex-shrink-0" /> {medico.telefone}
                    </div>
                  )}
                  {medico.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" /> {medico.email}
                    </div>
                  )}
                </div>

                <Separator className="mb-3" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleDisp(medico)}
                    disabled={toggling === medico.id}
                    className="flex-1 h-7 text-xs gap-1.5"
                  >
                    {toggling === medico.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Switch checked={medico.disponivel} className="h-3 w-5 pointer-events-none data-[state=checked]:bg-emerald-500" />
                    }
                    {medico.disponivel ? 'Disponível' : 'Indisponível'}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleOpenModal(medico)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === medico.id}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Médico?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o Dr(a). {medico.nome}? Esta ação não pode ser desfeita.
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
                    <TooltipContent>Excluir</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Médico' : 'Novo Médico'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Atualize os dados do especialista.' : 'Preencha os dados do novo membro do corpo clínico.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome completo <span className="text-destructive">*</span></Label>
              <Input required autoFocus value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Dr(a). Nome Sobrenome" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CRM <span className="text-destructive">*</span></Label>
                <Input required value={form.crm} onChange={e => setForm({ ...form, crm: e.target.value })} placeholder="000000/UF" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Especialidade <span className="text-destructive">*</span></Label>
                <Select value={form.especialidade} onValueChange={v => setForm({ ...form, especialidade: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ESPECIALIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone</Label>
                <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 9 9999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="medico@clinica.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bio / Apresentação</Label>
              <Textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Breve descrição e experiência do médico..." className="resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="disponivel"
                checked={form.disponivel}
                onCheckedChange={v => setForm({ ...form, disponivel: v })}
                className="data-[state=checked]:bg-emerald-500"
              />
              <Label htmlFor="disponivel" className="text-sm font-medium cursor-pointer">
                Disponível para consultas
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar Médico'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
