'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, DollarSign, ArrowUpRight, Copy, CheckCircle2, Search, Link2, Plus, Trash2, Send, ChevronsUpDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Invoice {
  id: string;
  patient_name: string;
  description: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: string;
  payment_link: string;
  created_at: string;
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New invoice state
  const [newPatientId, setNewPatientId] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('pix');
  const [sendEmail, setSendEmail] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Dynamic Select Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Delete invoice state
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Combobox popover states
  const [openPatientCombobox, setOpenPatientCombobox] = useState(false);
  const [openServiceCombobox, setOpenServiceCombobox] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchPatientsAndServices();

    // Supabase Realtime Subscription for automatic updates when webhook triggers
    const channel = supabase
      .channel('invoices_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          console.log('Realtime update received!', payload);
          fetchInvoices(); // Reload the list automatically
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Erro ao carregar faturas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatientsAndServices = async () => {
    try {
      const [patientsRes, servicesRes] = await Promise.all([
        supabase.from('patients').select('id, name, email').order('name'),
        supabase.from('services').select('id, name, price').eq('active', true).order('name')
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error fetching select data:', error);
    }
  };

  const handleServiceChange = (id: string) => {
    setNewServiceId(id);
    const service = services.find(s => s.id === id);
    if (service) {
      setNewAmount(service.price.toString());
    }
  };

  const handleCreateInvoice = async () => {
    if (!newPatientId || !newServiceId || !newAmount) {
      toast.error('Preencha paciente, serviço e valor.');
      return;
    }

    const patient = patients.find(p => p.id === newPatientId);
    const service = services.find(s => s.id === newServiceId);

    setIsCreating(true);

    try {
      // Call our API endpoint
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: newPatientId,
          patient_name: patient?.name,
          patient_email: patient?.email,
          service_id: newServiceId,
          description: service?.name,
          amount: parseFloat(newAmount),
          payment_method: newMethod,
          send_email: sendEmail
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao comunicar com a API de pagamentos');
      }

      toast.success('Cobrança gerada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Erro ao gerar cobrança. Verifique as configurações de pagamento.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      setIsDeletingId(id);
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      
      if (error) throw error;
      
      toast.success('Cobrança excluída com sucesso!');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Erro ao excluir a cobrança');
    } finally {
      setIsDeletingId(null);
    }
  };

  const resetForm = () => {
    setNewPatientId('');
    setNewServiceId('');
    setNewAmount('');
    setNewMethod('pix');
    setSendEmail(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            Faturamento e Cobranças
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere links de pagamento (PIX/Cartão) e gerencie os recebimentos da clínica.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-md">
              <Plus className="h-4 w-4" />
              Nova Cobrança
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Gerar Nova Cobrança</DialogTitle>
              <DialogDescription>
                Crie um link de pagamento para enviar ao paciente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="patient">Selecione o Paciente</Label>
                <Popover open={openPatientCombobox} onOpenChange={setOpenPatientCombobox} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPatientCombobox}
                      className="justify-between"
                    >
                      {newPatientId
                        ? patients.find((p) => p.id === newPatientId)?.name
                        : "Procurar paciente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Digite o nome do paciente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem
                              key={patient.id}
                              value={patient.name}
                              onSelect={() => {
                                setNewPatientId(patient.id);
                                setOpenPatientCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newPatientId === patient.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {patient.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="service">Serviço / Procedimento</Label>
                <Popover open={openServiceCombobox} onOpenChange={setOpenServiceCombobox} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openServiceCombobox}
                      className="justify-between"
                    >
                      {newServiceId
                        ? services.find((s) => s.id === newServiceId)?.name
                        : "Procurar serviço..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Digite o nome do serviço..." />
                      <CommandList>
                        <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                        <CommandGroup>
                          {services.map((service) => (
                            <CommandItem
                              key={service.id}
                              value={service.name}
                              onSelect={() => {
                                handleServiceChange(service.id);
                                setOpenServiceCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newServiceId === service.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {service.name} - {formatCurrency(service.price)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor Personalizado (R$)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="150.00" 
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Método Preferido</Label>
                  <Select value={newMethod} onValueChange={setNewMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="sendEmail" 
                  checked={sendEmail} 
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="sendEmail" className="font-normal flex items-center gap-2">
                  <Send className="h-3 w-3" />
                  Enviar link de pagamento por E-mail
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateInvoice} disabled={isCreating}>
                {isCreating ? 'Gerando...' : 'Gerar Link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido (Mês)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceived)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Faturas com status "Pago"
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Pagamento</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Links gerados e pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground shadow-md border-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">Saldo Disponível (Asaas/Stripe)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceived * 0.95)}</div>
            <p className="text-xs text-primary-foreground/60 mt-1">
              Já descontando taxas (estimativa 5%)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="border-b bg-muted/20 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Últimas Cobranças</CardTitle>
              <CardDescription>Gerencie os links de pagamento enviados aos pacientes.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente ou descrição..."
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
              Carregando faturas...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-muted/10">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Nenhuma cobrança encontrada</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Você ainda não gerou nenhum link de pagamento ou não encontramos resultados para sua busca.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                Gerar Primeira Cobrança
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 font-medium">Paciente / Descrição</th>
                    <th className="px-6 py-4 font-medium">Valor</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Método</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{invoice.patient_name}</div>
                        <div className="text-muted-foreground text-xs mt-0.5">{invoice.description}</div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4">
                        {invoice.status === 'paid' && <Badge variant="default" className="bg-green-500 hover:bg-green-600">Pago</Badge>}
                        {invoice.status === 'pending' && <Badge variant="secondary" className="text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30">Aguardando</Badge>}
                        {invoice.status === 'cancelled' && <Badge variant="destructive">Cancelado</Badge>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">
                          {invoice.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-muted-foreground hover:text-primary"
                            onClick={() => copyToClipboard(invoice.payment_link)}
                            title="Copiar Link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5"
                            onClick={() => window.open(invoice.payment_link, '_blank')}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Abrir Link</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja excluir esta cobrança?')) {
                                handleDeleteInvoice(invoice.id);
                              }
                            }}
                            disabled={isDeletingId === invoice.id}
                            title="Excluir Cobrança"
                          >
                            {isDeletingId === invoice.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
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