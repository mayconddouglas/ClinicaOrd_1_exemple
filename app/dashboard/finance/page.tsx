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
import { Wallet, DollarSign, ArrowUpRight, Copy, CheckCircle2, Search, Link2, Plus, Trash2, Send, ChevronsUpDown, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  nome: string;
  email: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  is_free: boolean;
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
  
  // New Invoice Form State
  const [newPatientId, setNewPatientId] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [discount, setDiscount] = useState('');
  const [newMethod, setNewMethod] = useState('pix');
  const [sendEmail, setSendEmail] = useState(true);
  
  // Appointment Details
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentEspecialidade, setAppointmentEspecialidade] = useState('clinico');

  const [isCreating, setIsCreating] = useState(false);

  // Derived calculations
  const subtotal = selectedServices.reduce((acc, curr) => acc + curr.price, 0);
  const isAnyServiceFree = selectedServices.some(s => s.is_free);
  const finalAmount = Math.max(0, subtotal - (parseFloat(discount) || 0));
  const isTotalFree = finalAmount === 0 || isAnyServiceFree;

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
        { event: 'UPDATE', schema: 'public', table: 'invoices' },
        (payload) => {
          console.log('Realtime update received!', payload);
          fetchInvoices(); // Reload the list automatically
          
          // Toast notification for real-time payment confirmation
          if (payload.new && payload.new.status === 'paid' && payload.old && payload.old.status !== 'paid') {
            toast.success(`🎉 Novo pagamento confirmado: ${payload.new.patient_name}`, {
              description: `Agendamento efetivado com sucesso.`,
              duration: 5000,
            });
          }
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
        supabase.from('pacientes').select('id, nome, email').order('nome'),
        supabase.from('services').select('id, name, price, is_free').eq('active', true).order('name')
      ]);

      if (patientsRes.data) setPatients(patientsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error fetching select data:', error);
    }
  };

  const handleServiceChange = (id: string) => {
    const service = services.find(s => s.id === id);
    if (service && !selectedServices.some(s => s.id === id)) {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const removeService = (id: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== id));
  };

  const handleCreateInvoice = async () => {
    if (!newPatientId || selectedServices.length === 0) {
      toast.error('Preencha o paciente e adicione ao menos um serviço.');
      return;
    }

    if (!appointmentDate || !appointmentTime) {
      toast.error('Preencha a data e o horário do agendamento.');
      return;
    }

    const patient = patients.find(p => p.id === newPatientId);

    setIsCreating(true);

    try {
      const description = selectedServices.length > 1 
        ? `Pacote: ${selectedServices.map(s => s.name).join(', ')}`
        : selectedServices[0].name;

      const dataHoraIso = `${appointmentDate}T${appointmentTime}:00`;

      // Call our API endpoint
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: newPatientId,
          patient_name: patient?.nome,
          patient_email: patient?.email,
          items: selectedServices,
          description: description,
          subtotal: subtotal,
          discount: parseFloat(discount) || 0,
          amount: finalAmount,
          payment_method: isTotalFree ? 'free' : newMethod,
          send_email: sendEmail,
          appointment_date_time: dataHoraIso,
          appointment_especialidade: appointmentEspecialidade
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao comunicar com a API de pagamentos');
      }

      toast.success(data.is_free ? 'Agendamento gratuito confirmado com sucesso!' : 'Cobrança gerada com sucesso!');
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
    setSelectedServices([]);
    setDiscount('');
    setNewMethod('pix');
    setSendEmail(true);
    setAppointmentDate('');
    setAppointmentTime('');
    setAppointmentEspecialidade('clinico');
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
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerar Nova Cobrança</DialogTitle>
              <DialogDescription>
                Selecione o paciente, os serviços e defina a data do agendamento.
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
                        ? patients.find((p) => p.id === newPatientId)?.nome
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
                              value={patient.nome}
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
                              {patient.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="service">Adicionar Serviço / Procedimento</Label>
                <Popover open={openServiceCombobox} onOpenChange={setOpenServiceCombobox} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openServiceCombobox}
                      className="justify-between"
                    >
                      Buscar e adicionar serviço...
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
                              <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                              {service.name} - {formatCurrency(service.price)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedServices.length > 0 && (
                <div className="bg-muted/30 border rounded-lg p-3 space-y-2 mt-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Data do Agendamento</div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="appointmentDate">Data</Label>
                      <Input 
                        id="appointmentDate" 
                        type="date" 
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="appointmentTime">Horário</Label>
                      <Input 
                        id="appointmentTime" 
                        type="time" 
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="especialidade">Especialidade / Profissional</Label>
                    <Select value={appointmentEspecialidade} onValueChange={setAppointmentEspecialidade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinico">Clínico Geral</SelectItem>
                        <SelectItem value="ortodontia">Ortodontia</SelectItem>
                        <SelectItem value="pediatria">Odontopediatria</SelectItem>
                        <SelectItem value="endodontia">Endodontia</SelectItem>
                        <SelectItem value="implantodontia">Implantodontia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedServices.length > 0 && (
                <div className="bg-muted/30 border rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Itens do Pacote</div>
                  {selectedServices.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-background border rounded-md p-2 text-sm">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate font-medium">{s.name}</span>
                        {s.is_free && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Grátis</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={s.is_free ? 'text-muted-foreground line-through' : 'font-medium'}>
                          {formatCurrency(s.price)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeService(s.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    
                    {!isTotalFree && (
                      <div className="flex justify-between items-center text-sm gap-4">
                        <span className="text-muted-foreground">Desconto (R$)</span>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={discount} 
                          onChange={(e) => setDiscount(e.target.value)}
                          className="h-7 w-24 text-right"
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-between font-bold pt-1">
                      <span>Total</span>
                      <span className={isTotalFree ? "text-emerald-600" : ""}>
                        {isTotalFree ? 'Grátis' : formatCurrency(finalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label className={isTotalFree ? "text-muted-foreground" : ""}>Método Preferido</Label>
                <Select value={isTotalFree ? 'free' : newMethod} onValueChange={setNewMethod} disabled={isTotalFree}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isTotalFree ? (
                      <SelectItem value="free">Isento / Gratuito</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
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
                  {isTotalFree ? "Enviar confirmação por E-mail" : "Enviar link de pagamento por E-mail"}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateInvoice} disabled={isCreating} className="bg-[#8cc63f] hover:bg-[#7ab331] text-white">
                {isCreating ? 'Processando...' : (isTotalFree ? 'Confirmar Agendamento' : 'Gerar Link')}
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