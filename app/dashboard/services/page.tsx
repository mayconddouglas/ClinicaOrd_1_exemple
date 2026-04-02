'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  is_free: boolean;
  especialidade_obrigatoria: string | null;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [isFree, setIsFree] = useState(false);
  const [especialidadeObrigatoria, setEspecialidadeObrigatoria] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchEspecialidades();
  }, []);

  const fetchEspecialidades = async () => {
    try {
      const { data, error } = await supabase
        .from('medicos')
        .select('especialidade')
        .eq('disponivel', true);

      if (error) throw error;

      // Extract unique specialties
      const uniqueSpecialties = Array.from(new Set(data.map(m => m.especialidade).filter(Boolean)));
      setEspecialidades(uniqueSpecialties as string[]);
    } catch (error) {
      console.error('Error fetching especialidades:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar o catálogo de serviços');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || (!price && !isFree)) {
      toast.error('Nome e Preço (se não for gratuito) são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        description,
        price: isFree ? 0 : parseFloat(price),
        duration_minutes: parseInt(duration),
        is_free: isFree,
        especialidade_obrigatoria: especialidadeObrigatoria || null,
        active: true
      };

      if (editingId) {
        const { error } = await supabase.from('services').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Serviço atualizado!');
      } else {
        const { error } = await supabase.from('services').insert([payload]);
        if (error) throw error;
        toast.success('Novo serviço adicionado!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Erro ao salvar o serviço');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description || '');
    setPrice(service.price.toString());
    setDuration(service.duration_minutes.toString());
    setIsFree(service.is_free);
    setEspecialidadeObrigatoria(service.especialidade_obrigatoria || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Serviço excluído!');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Erro ao excluir serviço');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setDuration('30');
    setIsFree(false);
    setEspecialidadeObrigatoria('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Catálogo de Serviços
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os valores e durações dos procedimentos da clínica.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-md">
              <Plus className="h-4 w-4" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
              <DialogDescription>
                Defina o nome e o valor padrão para este procedimento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Procedimento *</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Consulta de Avaliação" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Input 
                  id="description" 
                  placeholder="Detalhes (opcional)" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="isFree" 
                  checked={isFree} 
                  onChange={(e) => {
                    setIsFree(e.target.checked);
                    if (e.target.checked) setPrice('0');
                  }}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isFree" className="font-normal cursor-pointer">
                  Este é um serviço gratuito (Ex: Avaliação Inicial)
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price" className={isFree ? "text-muted-foreground" : ""}>Valor Padrão (R$) *</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    placeholder="150.00" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={isFree}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Duração (Minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="especialidade" className="text-right">
                  Especialidade Restrita
                </Label>
                <div className="col-span-3">
                  <select
                    id="especialidade"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={especialidadeObrigatoria}
                    onChange={(e) => setEspecialidadeObrigatoria(e.target.value)}
                  >
                    <option value="">Nenhuma (Qualquer médico)</option>
                    {especialidades.map((esp, index) => (
                      <option key={index} value={esp}>{esp}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se preenchido, apenas médicos com esta especialidade poderão realizar o serviço.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="border-b bg-muted/20 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Procedimentos Cadastrados</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar serviço..."
                className="pl-8 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              Carregando catálogo...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-muted/10">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Nenhum serviço encontrado</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Comece cadastrando os procedimentos e consultas que a sua clínica oferece.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 font-medium">Serviço</th>
                    <th className="px-6 py-4 font-medium">Duração</th>
                    <th className="px-6 py-4 font-medium">Especialidade</th>
                    <th className="px-6 py-4 font-medium">Valor Padrão</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{service.name}</div>
                        {service.description && (
                          <div className="text-muted-foreground text-xs mt-0.5">{service.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {service.duration_minutes} min
                      </td>
                      <td className="px-6 py-4">
                        {service.especialidade_obrigatoria ? (
                          <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">
                            {service.especialidade_obrigatoria}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Geral</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {service.is_free ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                            Gratuito
                          </Badge>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(service.price)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(service)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}