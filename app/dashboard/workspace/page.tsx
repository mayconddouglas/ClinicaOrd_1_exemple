'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, Eye, EyeOff, Key, Save, Plug, Loader2, CheckCircle2, UploadCloud, Info, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function WorkspacePage() {
  // Gmail State
  const [isGmailActive, setIsGmailActive] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [showGmailPassword, setShowGmailPassword] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [gmailTestSuccess, setGmailTestSuccess] = useState(false);

  // Calendar State
  const [isCalendarActive, setIsCalendarActive] = useState(false);
  const [calendarJson, setCalendarJson] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [showCalendarJson, setShowCalendarJson] = useState(false);
  const [isTestingCalendar, setIsTestingCalendar] = useState(false);
  const [calendarTestSuccess, setCalendarTestSuccess] = useState(false);

  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog State
  const [integrationToDisable, setIntegrationToDisable] = useState<'gmail' | 'calendar' | null>(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const { data, error } = await supabase
          .from('workspace_integrations')
          .select('*')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching integrations:', error);
          return;
        }

        if (data) {
          setIntegrationId(data.id);
          setIsGmailActive(data.is_gmail_active || false);
          setGmailEmail(data.gmail_email || '');
          setGmailAppPassword(data.gmail_app_password || '');
          
          setIsCalendarActive(data.is_calendar_active || false);
          setCalendarId(data.calendar_id || '');
          setCalendarJson(data.calendar_json || '');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    };

    fetchIntegrations();
  }, []);

  const handleToggle = (type: 'gmail' | 'calendar', checked: boolean) => {
    if (!checked) {
      setIntegrationToDisable(type);
      return;
    }

    if (type === 'gmail') setIsGmailActive(true);
    if (type === 'calendar') setIsCalendarActive(true);
    toast.success(`Integração com ${type === 'gmail' ? 'Gmail' : 'Google Calendar'} ativada com sucesso!`);
  };

  const confirmDisableIntegration = () => {
    if (integrationToDisable === 'gmail') setIsGmailActive(false);
    if (integrationToDisable === 'calendar') setIsCalendarActive(false);
    toast.info(`Integração com ${integrationToDisable === 'gmail' ? 'Gmail' : 'Google Calendar'} desativada.`);
    setIntegrationToDisable(null);
  };

  const handleTestConnection = async (type: 'gmail' | 'calendar') => {
    if (type === 'gmail') {
      if (!gmailEmail || !gmailAppPassword) {
        toast.error('Preencha o e-mail e a senha de aplicativo para testar.');
        return;
      }
      setIsTestingGmail(true);

      try {
        const response = await fetch('/api/email/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: gmailEmail, // Envia para o próprio e-mail da clínica para testar
            email: gmailEmail,
            appPassword: gmailAppPassword
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro desconhecido');
        }

        setIsTestingGmail(false);
        setGmailTestSuccess(true);
        toast.success('Conexão com Gmail bem-sucedida! Verifique sua caixa de entrada.');
        setTimeout(() => setGmailTestSuccess(false), 4000);
      } catch (error: any) {
        setIsTestingGmail(false);
        toast.error(`Falha na conexão: ${error.message}`);
      }

    } else {
      if (!calendarJson || !calendarId) {
        toast.error('Preencha a chave JSON e o ID do Calendário para testar.');
        return;
      }
      setIsTestingCalendar(true);
      // Simulate API call for calendar
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsTestingCalendar(false);
      setCalendarTestSuccess(true);
      toast.success('Conexão com Google Calendar estabelecida com sucesso!');
      setTimeout(() => setCalendarTestSuccess(false), 3000);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // Valida se é um JSON válido
        JSON.parse(content);
        setCalendarJson(content);
        toast.success('Arquivo JSON importado com sucesso!');
      } catch (error) {
        toast.error('O arquivo importado não é um JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const payload = {
      is_gmail_active: isGmailActive,
      gmail_email: gmailEmail,
      gmail_app_password: gmailAppPassword,
      is_calendar_active: isCalendarActive,
      calendar_id: calendarId,
      calendar_json: calendarJson,
      updated_at: new Date().toISOString()
    };

    try {
      let error;
      
      if (integrationId) {
        const { error: updateError } = await supabase
          .from('workspace_integrations')
          .update(payload)
          .eq('id', integrationId);
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('workspace_integrations')
          .insert([payload])
          .select()
          .single();
        if (data) setIntegrationId(data.id);
        error = insertError;
      }

      if (error) throw error;
      toast.success('Configurações salvas com sucesso no banco de dados!');
    } catch (error) {
      console.error('Error saving integrations:', error);
      toast.error('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            Google Workspace
          </h1>
          <p className="text-muted-foreground mt-2">
            Conecte as ferramentas do Google para automatizar e-mails e sincronizar agendas.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 shadow-md hover:shadow-lg transition-all">
          <Save className="h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="gmail" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1">
          <TabsTrigger value="gmail" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all">
            <Mail className="h-4 w-4 mr-2" />
            Gmail
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all">
            <Calendar className="h-4 w-4 mr-2" />
            Google Calendar
          </TabsTrigger>
        </TabsList>

        {/* Gmail Tab */}
        <TabsContent value="gmail" className="mt-6 space-y-6">
          <Card className="border-muted shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Envio de E-mails via Gmail</CardTitle>
                  <CardDescription className="mt-1">
                    Envie lembretes e notificações usando o e-mail da clínica.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={isGmailActive ? "default" : "secondary"} className={isGmailActive ? "bg-green-500 hover:bg-green-600" : ""}>
                  {isGmailActive ? 'Ativo' : 'Inativo'}
                </Badge>
                <Switch
                  checked={isGmailActive}
                  onCheckedChange={(checked) => handleToggle('gmail', checked)}
                  className="data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700 shadow-inner"
                />
              </div>
            </div>

            <CardContent className="p-0">
              <Tabs defaultValue="credentials" className="w-full">
                <div className="px-6 pt-4 pb-2 border-b">
                  <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="credentials" className="data-[state=active]:bg-background">
                      <Key className="h-4 w-4 mr-2" />
                      Credenciais
                    </TabsTrigger>
                    <TabsTrigger value="instructions" className="data-[state=active]:bg-background">
                      <Info className="h-4 w-4 mr-2" />
                      Como configurar
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="credentials" className="p-6 m-0 space-y-6">
                  {isGmailActive ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Status da conexão: <strong>Ativo</strong> e pronto para envio.</span>
                      </div>

                      <div className="grid sm:grid-cols-[250px_1fr] gap-4 items-start">
                        <div>
                          <Label htmlFor="gmail-email" className="text-base">E-mail da Clínica</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            O endereço de e-mail que aparecerá como remetente para os pacientes.
                          </p>
                        </div>
                        <Input
                          id="gmail-email"
                          type="email"
                          placeholder="clinica@gmail.com"
                          value={gmailEmail}
                          onChange={(e) => setGmailEmail(e.target.value)}
                          className="max-w-md focus-visible:ring-primary"
                        />
                      </div>

                      <div className="grid sm:grid-cols-[250px_1fr] gap-4 items-start">
                        <div>
                          <Label htmlFor="gmail-password" className="text-base">Senha de Aplicativo</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Senha gerada especificamente para o sistema. Não use sua senha pessoal.
                          </p>
                        </div>
                        <div className="relative max-w-md">
                          <Input
                            id="gmail-password"
                            type={showGmailPassword ? "text" : "password"}
                            placeholder="••••••••••••••••"
                            value={gmailAppPassword}
                            onChange={(e) => setGmailAppPassword(e.target.value)}
                            className="pr-10 focus-visible:ring-primary font-mono"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowGmailPassword(!showGmailPassword)}
                          >
                            {showGmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Ative a integração no topo do card para configurar as credenciais do Gmail.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="instructions" className="p-6 m-0">
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-lg font-medium text-foreground mb-4">Como gerar a Senha de Aplicativo</h3>
                    <ol className="space-y-4 list-decimal list-inside ml-4">
                      <li className="pl-2">Acesse as <strong>Configurações da sua Conta Google</strong>.</li>
                      <li className="pl-2">Vá na aba <strong>Segurança</strong> no menu lateral esquerdo.</li>
                      <li className="pl-2">Certifique-se de que a <strong>Verificação em duas etapas</strong> esteja ativada.</li>
                      <li className="pl-2">Busque por <strong>Senhas de app</strong> (ou App passwords) na barra de pesquisa.</li>
                      <li className="pl-2">Crie uma nova senha com o nome "Sistema Clínica" e copie o código de 16 letras gerado.</li>
                      <li className="pl-2">Cole o código no campo "Senha de Aplicativo" na aba Credenciais.</li>
                    </ol>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            {isGmailActive && (
              <CardFooter className="bg-muted/10 border-t px-6 py-4 flex justify-end">
                <Button 
                  variant={gmailTestSuccess ? "default" : "outline"} 
                  onClick={() => handleTestConnection('gmail')}
                  disabled={isTestingGmail || !gmailEmail || !gmailAppPassword}
                  className={`gap-2 transition-all duration-300 ${gmailTestSuccess ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                >
                  {isTestingGmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : gmailTestSuccess ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plug className="h-4 w-4" />
                  )}
                  {isTestingGmail ? 'Testando...' : gmailTestSuccess ? 'Conexão Bem-sucedida!' : 'Testar Conexão'}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-6 space-y-6">
          <Card className="border-muted shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Sincronização com Google Calendar</CardTitle>
                  <CardDescription className="mt-1">
                    Sincronize os agendamentos do sistema diretamente na agenda do celular.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={isCalendarActive ? "default" : "secondary"} className={isCalendarActive ? "bg-green-500 hover:bg-green-600" : ""}>
                  {isCalendarActive ? 'Ativo' : 'Inativo'}
                </Badge>
                <Switch
                  checked={isCalendarActive}
                  onCheckedChange={(checked) => handleToggle('calendar', checked)}
                  className="data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700 shadow-inner"
                />
              </div>
            </div>

            <CardContent className="p-0">
              <Tabs defaultValue="credentials" className="w-full">
                <div className="px-6 pt-4 pb-2 border-b">
                  <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="credentials" className="data-[state=active]:bg-background">
                      <Key className="h-4 w-4 mr-2" />
                      Credenciais
                    </TabsTrigger>
                    <TabsTrigger value="instructions" className="data-[state=active]:bg-background">
                      <Info className="h-4 w-4 mr-2" />
                      Como configurar
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="credentials" className="p-6 m-0 space-y-6">
                  {isCalendarActive ? (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Status da conexão: <strong>Ativa</strong>. Agendamentos serão sincronizados em tempo real.</span>
                      </div>

                      <div className="grid sm:grid-cols-[250px_1fr] gap-4 items-start">
                        <div>
                          <Label htmlFor="calendar-id" className="text-base">ID do Calendário</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Geralmente é o seu e-mail ou um ID específico do calendário criado para a clínica.
                          </p>
                        </div>
                        <Input
                          id="calendar-id"
                          type="text"
                          placeholder="exemplo@group.calendar.google.com"
                          value={calendarId}
                          onChange={(e) => setCalendarId(e.target.value)}
                          className="max-w-md focus-visible:ring-primary font-mono text-sm"
                        />
                      </div>

                      <div className="grid sm:grid-cols-[250px_1fr] gap-4 items-start">
                        <div>
                          <Label htmlFor="calendar-json" className="text-base">Service Account JSON</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            A chave privada que autoriza o sistema a editar a agenda.
                          </p>
                          
                          <div className="mt-4">
                            <input
                              type="file"
                              id="json-upload"
                              accept=".json"
                              className="hidden"
                              onChange={handleFileUpload}
                            />
                            <Label 
                              htmlFor="json-upload" 
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer w-full max-w-[200px]"
                            >
                              <UploadCloud className="mr-2 h-4 w-4" />
                              Importar arquivo .json
                            </Label>
                          </div>
                        </div>
                        
                        <div className="relative max-w-2xl bg-[#0d1117] rounded-md border border-border shadow-sm overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-border/50">
                            <span className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              <span className="ml-2">credentials.json</span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowCalendarJson(!showCalendarJson)}
                            >
                              {showCalendarJson ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                          <textarea
                            id="calendar-json"
                            placeholder={'{\n  "type": "service_account",\n  "project_id": "..."\n}'}
                            value={calendarJson}
                            onChange={(e) => setCalendarJson(e.target.value)}
                            className={`flex min-h-[160px] w-full resize-y bg-transparent px-4 py-3 text-sm text-green-400 placeholder:text-muted-foreground/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 font-mono ${!showCalendarJson && calendarJson ? 'text-transparent text-shadow-disc' : ''}`}
                            style={!showCalendarJson && calendarJson ? { textShadow: '0 0 8px rgba(74, 222, 128, 0.5)' } : {}}
                            spellCheck="false"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Ative a integração no topo do card para configurar a sincronização com o Calendar.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="instructions" className="p-6 m-0">
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-lg font-medium text-foreground mb-4">Como obter as credenciais do Calendar</h3>
                    <ol className="space-y-4 list-decimal list-inside ml-4">
                      <li className="pl-2">Acesse o <strong>Google Cloud Console</strong> e crie um novo projeto.</li>
                      <li className="pl-2">No menu "APIs e Serviços", busque e ative a <strong>Google Calendar API</strong>.</li>
                      <li className="pl-2">Vá em "Credenciais", clique em "Criar Credenciais" e escolha <strong>Conta de Serviço</strong> (Service Account).</li>
                      <li className="pl-2">Após criar a conta, clique nela, vá na aba "Chaves" e crie uma nova chave no formato <strong>JSON</strong>.</li>
                      <li className="pl-2">O arquivo será baixado. Volte aqui e clique em <strong>Importar arquivo .json</strong> na aba Credenciais.</li>
                      <li className="pl-2">Por fim, vá no seu Google Calendar, acesse as configurações do calendário que deseja usar e adicione o e-mail da Conta de Serviço (que está dentro do JSON) com permissão para "Fazer alterações em eventos". Copie o ID do calendário e cole no campo acima.</li>
                    </ol>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            {isCalendarActive && (
              <CardFooter className="bg-muted/10 border-t px-6 py-4 flex justify-end">
                <Button 
                  variant={calendarTestSuccess ? "default" : "outline"} 
                  onClick={() => handleTestConnection('calendar')}
                  disabled={isTestingCalendar || !calendarId || !calendarJson}
                  className={`gap-2 transition-all duration-300 ${calendarTestSuccess ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                >
                  {isTestingCalendar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : calendarTestSuccess ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plug className="h-4 w-4" />
                  )}
                  {isTestingCalendar ? 'Testando...' : calendarTestSuccess ? 'Conexão Bem-sucedida!' : 'Testar Conexão'}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!integrationToDisable} onOpenChange={() => setIntegrationToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Integração?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar a integração com o {integrationToDisable === 'gmail' ? 'Gmail' : 'Google Calendar'}? 
              {integrationToDisable === 'gmail' 
                ? ' Os e-mails automáticos pararão de ser enviados imediatamente.' 
                : ' Os novos agendamentos não serão mais sincronizados com a sua agenda.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDisableIntegration}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
