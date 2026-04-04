'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, MapPin, Palette, Building2, Save, X, Building, Map, Check, User, Upload, CheckCircle2, AlertCircle, Phone, Mail, Clock, ShieldAlert, CreditCard, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'branding' | 'payments'>('profile');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Profile State
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicHours, setClinicHours] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [responsavel, setResponsavel] = useState('');

  // Address State
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');

  // Branding State
  const [welcomeMessage, setWelcomeMessage] = useState('');

  // Payments State
  const [activePaymentGateway, setActivePaymentGateway] = useState('none');
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [asaasApiKey, setAsaasApiKey] = useState('');

  // Email State
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // Default values for comparison
  const [initialData, setInitialData] = useState<any>({});

  // Load data from Supabase
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('clinic_settings')
          .select('*')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching settings:', error);
          toast.error('Erro ao carregar configurações');
          return;
        }

        if (data) {
          setSettingsId(data.id);
          setClinicName(data.clinic_name || '');
          setClinicEmail(data.clinic_email || '');
          setClinicPhone(data.clinic_phone || '');
          setClinicHours(data.clinic_hours || '');
          setCnpj(data.cnpj || '');
          setResponsavel(data.responsavel || '');
          setCep(data.cep || '');
          setRua(data.rua || '');
          setNumero(data.numero || '');
          setBairro(data.bairro || '');
          setCidade(data.cidade || '');
          setWelcomeMessage(data.welcome_message || '');
          
          // Load payment settings
          setActivePaymentGateway(data.active_payment_gateway || 'none');
          setMpAccessToken(data.mp_access_token || '');
          setAsaasApiKey(data.asaas_api_key || '');

          // Load email settings
          setSmtpUser(data.smtp_user || '');
          setSmtpPass(data.smtp_pass || '');

          setInitialData(data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Monitor changes
  useEffect(() => {
    if (isLoading) return;
    
    const isChanged = 
      clinicName !== (initialData.clinic_name || '') || 
      cnpj !== (initialData.cnpj || '') ||
      responsavel !== (initialData.responsavel || '') ||
      cep !== (initialData.cep || '') ||
      rua !== (initialData.rua || '') ||
      numero !== (initialData.numero || '') ||
      bairro !== (initialData.bairro || '') ||
      cidade !== (initialData.cidade || '') ||
      welcomeMessage !== (initialData.welcome_message || '') ||
      activePaymentGateway !== (initialData.active_payment_gateway || 'none') ||
      mpAccessToken !== (initialData.mp_access_token || '') ||
      asaasApiKey !== (initialData.asaas_api_key || '') ||
      smtpUser !== (initialData.smtp_user || '') ||
      smtpPass !== (initialData.smtp_pass || '');
      
    setHasChanges(isChanged);
  }, [clinicName, clinicEmail, clinicPhone, clinicHours, cnpj, responsavel, cep, rua, numero, bairro, cidade, welcomeMessage, activePaymentGateway, mpAccessToken, asaasApiKey, smtpUser, smtpPass, initialData, isLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    
    const payload = {
      clinic_name: clinicName,
      clinic_email: clinicEmail,
      clinic_phone: clinicPhone,
      clinic_hours: clinicHours,
      cnpj,
      responsavel,
      cep,
      rua,
      numero,
      bairro,
      cidade,
      welcome_message: welcomeMessage,
      active_payment_gateway: activePaymentGateway,
      mp_access_token: mpAccessToken,
      asaas_api_key: asaasApiKey,
      smtp_user: smtpUser,
      smtp_pass: smtpPass,
      updated_at: new Date().toISOString(),
    };

    try {
      let error;
      
      if (settingsId) {
        // Update existing
        const { error: updateError } = await supabase
          .from('clinic_settings')
          .update(payload)
          .eq('id', settingsId);
        error = updateError;
      } else {
        // Insert new
        const { data, error: insertError } = await supabase
          .from('clinic_settings')
          .insert([payload])
          .select()
          .single();
          
        if (data) setSettingsId(data.id);
        error = insertError;
      }

      if (error) throw error;

      setInitialData(payload);
      setHasChanges(false);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar as configurações no banco de dados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setClinicName(initialData.clinic_name || '');
    setClinicEmail(initialData.clinic_email || '');
    setClinicPhone(initialData.clinic_phone || '');
    setClinicHours(initialData.clinic_hours || '');
    setCnpj(initialData.cnpj || '');
    setResponsavel(initialData.responsavel || '');
    setCep(initialData.cep || '');
    setRua(initialData.rua || '');
    setNumero(initialData.numero || '');
    setBairro(initialData.bairro || '');
    setCidade(initialData.cidade || '');
    setWelcomeMessage(initialData.welcome_message || '');
    setActivePaymentGateway(initialData.active_payment_gateway || 'none');
    setMpAccessToken(initialData.mp_access_token || '');
    setAsaasApiKey(initialData.asaas_api_key || '');
    setSmtpUser(initialData.smtp_user || '');
    setSmtpPass(initialData.smtp_pass || '');
    setHasChanges(false);
    toast.info('Alterações descartadas.');
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] pb-20">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Configurações da Clínica
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie o perfil, endereço e a identidade visual do seu sistema.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 mt-8">
          {/* Main Content Area usando Tabs */}
          <div className="flex-1 w-full">
            {isLoading ? (
              <Card className="animate-in fade-in duration-300">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-4 w-2/4" />
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-[250px_1fr] gap-4 items-center">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full max-w-md" />
                  </div>
                  <div className="grid sm:grid-cols-[250px_1fr] gap-4 items-center">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full max-w-md" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-5 lg:w-[1000px]">
                  <TabsTrigger value="profile" className="gap-2"><Building2 className="h-4 w-4" /><span className="hidden sm:inline">Perfil da Clínica</span></TabsTrigger>
                  <TabsTrigger value="address" className="gap-2"><MapPin className="h-4 w-4" /><span className="hidden sm:inline">Endereço</span></TabsTrigger>
                  <TabsTrigger value="branding" className="gap-2"><Palette className="h-4 w-4" /><span className="hidden sm:inline">Personalização</span></TabsTrigger>
                  <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /><span className="hidden sm:inline">Pagamentos</span></TabsTrigger>
                  <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /><span className="hidden sm:inline">E-mail Automático</span></TabsTrigger>
                </TabsList>
                {/* PROFILE TAB */}
                <TabsContent value="profile" className="space-y-6 mt-0">
                  <Card className="animate-in fade-in duration-300 overflow-hidden">
                    <div className="bg-muted/30 border-b px-6 py-4 flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Perfil da Clínica</CardTitle>
                        <CardDescription className="mt-1">Informações públicas que aparecem em recibos e laudos.</CardDescription>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-8">
                      {/* Logo Upload */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b">
                        <div className="relative group cursor-pointer shrink-0">
                          <div className="h-24 w-24 rounded-xl bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                            <span className="text-3xl font-bold text-muted-foreground/50 group-hover:opacity-0 transition-opacity">
                              {clinicName.charAt(0) || 'C'}
                            </span>
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="h-6 w-6 text-white mb-1" />
                              <span className="text-[10px] text-white font-medium">Trocar</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-foreground">Logo da Clínica</h3>
                          <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-sm">
                            Recomendamos imagens quadradas (1:1) com fundo transparente, formato PNG ou JPG de até 2MB.
                          </p>
                          <Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Fazer Upload</Button>
                        </div>
                      </div>

                      <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field>
                          <FieldLabel htmlFor="clinic-name">Nome da Clínica</FieldLabel>
                          <Input
                            id="clinic-name"
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            placeholder="Ex: OrthoCenter"
                          />
                          <FieldDescription>Nome público que os pacientes verão.</FieldDescription>
                        </Field>
                        
                        <Field>
                          <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
                          <Input
                            id="cnpj"
                            value={cnpj}
                            onChange={(e) => setCnpj(e.target.value)}
                            placeholder="00.000.000/0000-00"
                          />
                          <FieldDescription>Para emissão de notas e recibos.</FieldDescription>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="responsavel">Responsável Técnico</FieldLabel>
                          <Input
                            id="responsavel"
                            value={responsavel}
                            onChange={(e) => setResponsavel(e.target.value)}
                            placeholder="Ex: Dr. João Silva (CRM-SP 12345)"
                          />
                          <FieldDescription>Nome e registro profissional (CRM/CRO).</FieldDescription>
                        </Field>
                      </FieldGroup>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ADDRESS TAB */}
                <TabsContent value="address" className="space-y-6 mt-0">
                  <Card className="animate-in fade-in duration-300 overflow-hidden">
                    <div className="bg-muted/30 border-b px-6 py-4 flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <MapPin className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Endereço de Atendimento</CardTitle>
                        <CardDescription className="mt-1">Onde seus pacientes devem ir para as consultas.</CardDescription>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-6">
                      {/* Fake Map Visual */}
                      <div className="w-full h-40 bg-muted/50 rounded-lg border flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                        <div className="flex flex-col items-center text-muted-foreground z-10 transition-transform group-hover:scale-105">
                          <Map className="h-10 w-10 mb-2 text-primary" />
                          <span className="text-sm font-medium">Pré-visualização do Mapa</span>
                          <span className="text-xs opacity-70 mt-1">{rua ? `${rua}, ${numero} - ${cidade}` : 'Preencha o endereço abaixo'}</span>
                        </div>
                      </div>

                      <FieldGroup className="grid grid-cols-1 md:grid-cols-6 gap-6">
                        <Field className="md:col-span-2">
                          <FieldLabel htmlFor="cep">CEP</FieldLabel>
                          <InputGroup>
                            <InputGroupInput
                              id="cep"
                              value={cep}
                              onChange={(e) => setCep(e.target.value)}
                              placeholder="00000-000"
                            />
                            <Button variant="secondary" className="rounded-l-none border-l-0">Buscar</Button>
                          </InputGroup>
                        </Field>
                        
                        <Field className="md:col-span-4">
                          <FieldLabel htmlFor="rua">Logradouro (Rua / Avenida)</FieldLabel>
                          <Input
                            id="rua"
                            value={rua}
                            onChange={(e) => setRua(e.target.value)}
                            placeholder="Ex: Av. Paulista"
                          />
                        </Field>

                        <Field className="md:col-span-2">
                          <FieldLabel htmlFor="numero">Número</FieldLabel>
                          <Input
                            id="numero"
                            value={numero}
                            onChange={(e) => setNumero(e.target.value)}
                            placeholder="123"
                          />
                        </Field>

                        <Field className="md:col-span-4">
                          <FieldLabel htmlFor="bairro">Bairro</FieldLabel>
                          <Input
                            id="bairro"
                            value={bairro}
                            onChange={(e) => setBairro(e.target.value)}
                            placeholder="Centro"
                          />
                        </Field>

                        <Field className="md:col-span-4">
                          <FieldLabel htmlFor="cidade">Cidade</FieldLabel>
                          <Input
                            id="cidade"
                            value={cidade}
                            onChange={(e) => setCidade(e.target.value)}
                            placeholder="São Paulo"
                          />
                        </Field>
                      </FieldGroup>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* BRANDING TAB */}
                <TabsContent value="branding" className="space-y-6 mt-0">
                  <Card className="animate-in fade-in duration-300 overflow-hidden">
                    <div className="bg-muted/30 border-b px-6 py-4 flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Personalização</CardTitle>
                        <CardDescription className="mt-1">Ajuste a aparência do chat do paciente e portal web.</CardDescription>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-8">
                      
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="welcome">Mensagem de Boas-vindas</FieldLabel>
                          <FieldDescription>A primeira mensagem que o paciente vê ao abrir o chat ou WhatsApp.</FieldDescription>
                          <Textarea
                            id="welcome"
                            value={welcomeMessage}
                            onChange={(e) => setWelcomeMessage(e.target.value)}
                            className="min-h-[120px] max-w-2xl resize-none mt-2"
                            placeholder="Olá! Sou a assistente virtual da clínica..."
                          />
                        </Field>
                      </FieldGroup>

                      {/* Preview Component */}
                      <div className="pt-6 border-t">
                        <Label className="text-base mb-4 block">Pré-visualização do Chat</Label>
                        
                        <div className="max-w-[320px] w-full border-[6px] border-muted rounded-[2.5rem] overflow-hidden bg-background shadow-xl relative mx-auto md:mx-0">
                          {/* Fake Notch */}
                          <div className="absolute top-0 inset-x-0 h-6 bg-muted rounded-b-xl w-32 mx-auto z-10"></div>
                          
                          {/* Chat Header */}
                          <div className="pt-8 pb-3 px-4 flex items-center gap-3 border-b bg-card relative z-0 shadow-sm">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm bg-primary transition-colors duration-500">
                              {clinicName.charAt(0) || 'C'}
                            </div>
                            <div>
                              <p className="text-sm font-bold leading-tight">{clinicName || 'Nome da Clínica'}</p>
                              <p className="text-[10px] text-green-500 font-medium">Online agora</p>
                            </div>
                          </div>
                          
                          {/* Chat Body */}
                          <div className="p-4 bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center h-64 flex flex-col justify-end relative">
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]"></div>
                            
                            <div className="relative z-10 flex flex-col gap-3">
                              <div className="bg-card border shadow-sm rounded-2xl rounded-tl-sm p-3 text-sm max-w-[85%] self-start animate-in slide-in-from-left-2 fade-in duration-500">
                                {welcomeMessage || 'Sua mensagem aparecerá aqui...'}
                                <span className="text-[9px] text-muted-foreground block text-right mt-1">10:42</span>
                              </div>
                              
                              <div 
                                className="rounded-full px-4 py-2.5 text-primary-foreground text-sm font-medium shadow-md self-end cursor-default hover:opacity-90 transition-all text-center mt-2 bg-primary" 
                              >
                                Agendar Consulta
                              </div>
                            </div>
                          </div>
                          
                          {/* Chat Input Fake */}
                          <div className="p-3 bg-card border-t flex gap-2 items-center">
                            <div className="h-8 flex-1 bg-muted rounded-full px-4 flex items-center">
                              <span className="text-xs text-muted-foreground">Digite sua mensagem...</span>
                            </div>
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-primary-foreground bg-primary transition-colors duration-500">
                              <MapPin className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </TabsContent>
                {/* PAYMENTS TAB */}
                <TabsContent value="payments" className="space-y-6 mt-0">
                  <Card className="animate-in fade-in duration-300 overflow-hidden">
                    <div className="bg-muted/30 border-b px-6 py-4 flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Gateways de Pagamento</CardTitle>
                        <CardDescription className="mt-1">Configure suas chaves de API para receber pagamentos via PIX e Cartão.</CardDescription>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-8">
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Gateway Ativo</FieldLabel>
                          <FieldDescription>Escolha qual processador de pagamento você deseja usar no sistema.</FieldDescription>
                          <RadioGroup 
                            value={activePaymentGateway} 
                            onValueChange={setActivePaymentGateway}
                            className="flex flex-col sm:flex-row gap-4 mt-4"
                          >
                            <div className={`flex items-center space-x-2 border rounded-xl p-4 transition-all cursor-pointer ${activePaymentGateway === 'none' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}`} onClick={() => setActivePaymentGateway('none')}>
                              <RadioGroupItem value="none" id="none" />
                              <Label htmlFor="none" className="cursor-pointer font-medium">Nenhum (Desativado)</Label>
                            </div>
                            <div className={`flex items-center space-x-2 border rounded-xl p-4 transition-all cursor-pointer ${activePaymentGateway === 'mercadopago' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}`} onClick={() => setActivePaymentGateway('mercadopago')}>
                              <RadioGroupItem value="mercadopago" id="mercadopago" />
                              <Label htmlFor="mercadopago" className="cursor-pointer font-medium flex items-center gap-2">
                                Mercado Pago
                              </Label>
                            </div>
                            <div className={`flex items-center space-x-2 border rounded-xl p-4 transition-all cursor-pointer ${activePaymentGateway === 'asaas' ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}`} onClick={() => setActivePaymentGateway('asaas')}>
                              <RadioGroupItem value="asaas" id="asaas" />
                              <Label htmlFor="asaas" className="cursor-pointer font-medium flex items-center gap-2">
                                Asaas
                              </Label>
                            </div>
                          </RadioGroup>
                        </Field>

                        <Separator className="my-6" />

                        {activePaymentGateway === 'mercadopago' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-400 p-4 rounded-xl flex gap-3 text-sm">
                              <Info className="h-5 w-5 shrink-0" />
                              <div>
                                <p className="font-semibold mb-1">Como configurar o Mercado Pago?</p>
                                <ol className="list-decimal list-inside space-y-1 ml-1 opacity-90">
                                  <li>Acesse o <a href="https://www.mercadopago.com.br/developers/panel/credentials" target="_blank" rel="noreferrer" className="underline font-medium hover:text-blue-800 dark:hover:text-blue-300">Painel de Desenvolvedor</a>.</li>
                                  <li>Vá em <strong>Credenciais de Produção</strong>.</li>
                                  <li>Copie o valor do <strong>Access Token</strong> e cole abaixo.</li>
                                </ol>
                              </div>
                            </div>
                            <Field>
                              <FieldLabel htmlFor="mp-token">Access Token (Produção)</FieldLabel>
                              <Input
                                id="mp-token"
                                type="password"
                                value={mpAccessToken}
                                onChange={(e) => setMpAccessToken(e.target.value)}
                                placeholder="APP_USR-..."
                              />
                              <FieldDescription>O token usado para gerar links de cobrança.</FieldDescription>
                            </Field>
                          </div>
                        )}

                        {activePaymentGateway === 'asaas' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-400 p-4 rounded-xl flex gap-3 text-sm">
                              <Info className="h-5 w-5 shrink-0" />
                              <div>
                                <p className="font-semibold mb-1">Como configurar o Asaas?</p>
                                <ol className="list-decimal list-inside space-y-1 ml-1 opacity-90">
                                  <li>Acesse sua conta do Asaas e vá em <strong>Configurações &gt; Integração</strong>.</li>
                                  <li>Clique em <strong>Gerar API Key</strong> (Chave de API).</li>
                                  <li>Copie o valor da chave gerada e cole abaixo.</li>
                                </ol>
                              </div>
                            </div>
                            <Field>
                              <FieldLabel htmlFor="asaas-key">API Key (Produção)</FieldLabel>
                              <Input
                                id="asaas-key"
                                type="password"
                                value={asaasApiKey}
                                onChange={(e) => setAsaasApiKey(e.target.value)}
                                placeholder="$aact_..."
                              />
                              <FieldDescription>A chave usada para autenticar as requisições ao Asaas.</FieldDescription>
                            </Field>
                          </div>
                        )}

                      </FieldGroup>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* EMAIL AUTOMATION TAB */}
                <TabsContent value="email" className="space-y-6 mt-0">
                  <Card className="animate-in fade-in duration-300 overflow-hidden">
                    <div className="bg-muted/30 border-b px-6 py-4 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Configuração de E-mail (Google Workspace)</CardTitle>
                        <CardDescription className="mt-1">
                          Envie faturas e recibos automaticamente usando o e-mail oficial da sua clínica.
                        </CardDescription>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-8">
                      <FieldGroup>
                        <div className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 p-4 rounded-xl flex gap-3 text-sm">
                          <Info className="h-5 w-5 shrink-0" />
                          <div>
                            <p className="font-semibold mb-1">Como configurar o disparo pelo Gmail/Google Workspace?</p>
                            <ol className="list-decimal list-inside space-y-1 ml-1 opacity-90">
                              <li>Acesse as <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline font-medium hover:text-indigo-800 dark:hover:text-indigo-300">Configurações de Segurança do Google</a> com a conta da clínica.</li>
                              <li>Ative a <strong>Verificação em Duas Etapas</strong> (se não estiver ativa).</li>
                              <li>Vá em <strong>Senhas de App</strong> (ou App Passwords) e crie uma nova senha para &quot;App de Faturamento&quot;.</li>
                              <li>Copie a senha de 16 letras gerada e cole abaixo.</li>
                            </ol>
                          </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="smtp-user">E-mail Remetente</FieldLabel>
                            <Input
                              id="smtp-user"
                              type="email"
                              value={smtpUser}
                              onChange={(e) => setSmtpUser(e.target.value)}
                              placeholder="contato@suaclinica.com.br"
                            />
                            <FieldDescription>O e-mail da clínica no Google que enviará as cobranças.</FieldDescription>
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="smtp-pass">Senha de App (Google)</FieldLabel>
                            <Input
                              id="smtp-pass"
                              type="password"
                              value={smtpPass}
                              onChange={(e) => setSmtpPass(e.target.value)}
                              placeholder="abcd efgh ijkl mnop"
                            />
                            <FieldDescription>A senha de 16 caracteres gerada no Google.</FieldDescription>
                          </Field>
                        </div>
                      </FieldGroup>
                    </CardContent>
                  </Card>
                </TabsContent>

              </Tabs>
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-[#18181b] dark:bg-card border border-border shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
            <span className="text-sm font-medium text-white dark:text-foreground">
              Você tem alterações não salvas
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDiscard}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
                disabled={isSaving}
              >
                Descartar
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                className="rounded-full bg-white text-black hover:bg-gray-200 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
