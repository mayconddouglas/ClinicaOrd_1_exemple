'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPatients, createPatient, updatePatient, deletePatient } from '../../../lib/dashboard-tools';
import { Users, Search, Phone, FileText, Plus, Pencil, Trash2, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPatients = useCallback(async (query?: string) => {
    setLoading(true);
    const res = await getPatients(query);
    if (res.success) setPatients(res.data || []);
    else toast.error('Erro ao buscar pacientes');
    setLoading(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchPatients(search.trim() || undefined); };
  const handleClearSearch = () => { setSearch(''); fetchPatients(); };

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

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF ou telefone..."
              className="pl-9 pr-8 h-9 text-sm"
            />
            {search && (
              <button type="button" onClick={handleClearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9">Buscar</Button>
        </form>
        {!loading && (
          <Badge variant="secondary" className="gap-1.5 text-xs h-6">
            <Users className="h-3 w-3" />
            {patients.length} paciente(s)
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        {loading ? (
          <CardContent className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </CardContent>
        ) : patients.length === 0 ? (
          <CardContent className="py-16 text-center">
            <User className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground font-medium">
              {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}
            </p>
            {!search && (
              <Button variant="link" onClick={() => handleOpenModal()} className="mt-1 text-primary hover:text-primary/80 text-sm">
                + Cadastrar primeiro paciente
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
                {patients.map(patient => (
                  <TableRow key={patient.id} className="border-b border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`text-xs font-bold ${getColor(patient.nome)}`}>
                            {getInitials(patient.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{patient.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                        {patient.cpf || <span className="text-muted-foreground/40 italic">—</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                        {patient.telefone || <span className="text-muted-foreground/40 italic">—</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {patient.created_at ? new Date(patient.created_at).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => handleOpenModal(patient)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingId === patient.id}
                              onClick={() => handleDelete(patient.id, patient.nome)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
            <DialogDescription>
              {editingPatient ? 'Atualize os dados do paciente.' : 'Preencha os dados para cadastrar um novo paciente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs font-semibold">Nome completo <span className="text-destructive">*</span></Label>
              <Input id="nome" autoFocus required value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: João da Silva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf" className="text-xs font-semibold">CPF</Label>
              <Input id="cpf" value={formData.cpf}
                onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-xs font-semibold">Telefone</Label>
              <Input id="telefone" value={formData.telefone}
                onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Salvando...' : editingPatient ? 'Salvar alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
