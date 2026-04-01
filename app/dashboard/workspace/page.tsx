'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, Eye, EyeOff, Key, Save, Plug, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
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

  // Calendar State
  const [isCalendarActive, setIsCalendarActive] = useState(false);
  const [calendarJson, setCalendarJson] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [showCalendarJson, setShowCalendarJson] = useState(false);
  const [isTestingCalendar, setIsTestingCalendar] = useState(false);

  // Dialog State
  const [integrationToDisable, setIntegrationToDisable] = useState<'gmail' | 'calendar' | null>(null);

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
    } else {
      if (!calendarJson || !calendarId) {
        toast.error('Preencha a chave JSON e o ID do Calendário para testar.');
        return;
      }
      setIsTestingCalendar(true);
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (type === 'gmail') {
      setIsTestingGmail(false);
      toast.success('Conexão com Gmail estabelecida com sucesso!');
    } else {
      setIsTestingCalendar(false);
      toast.success('Conexão com Google Calendar estabelecida com sucesso!');
    }
  };

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
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

            <CardContent className="p-6 space-y-6">
              {isGmailActive ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="grid gap-2">
                    <Label htmlFor="gmail-email">E-mail da Clínica</Label>
                    <Input
                      id="gmail-email"
                      type="email"
                      placeholder="clinica@gmail.com"
                      value={gmailEmail}
                      onChange={(e) => setGmailEmail(e.target.value)}
                      className="max-w-md focus-visible:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      O endereço de e-mail que aparecerá como remetente para os pacientes.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="gmail-password">Senha de Aplicativo (App Password)</Label>
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
                    <p className="text-xs text-muted-foreground">
                      Você precisa gerar uma senha de aplicativo nas configurações de segurança da sua Conta Google. A sua senha normal não funcionará.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Ative a integração para configurar as credenciais do Gmail.</p>
                </div>
              )}
            </CardContent>
            
            {isGmailActive && (
              <CardFooter className="bg-muted/10 border-t px-6 py-4 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => handleTestConnection('gmail')}
                  disabled={isTestingGmail || !gmailEmail || !gmailAppPassword}
                  className="gap-2"
                >
                  {isTestingGmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4" />
                  )}
                  {isTestingGmail ? 'Testando...' : 'Testar Conexão'}
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

            <CardContent className="p-6 space-y-6">
              {isCalendarActive ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="grid gap-2">
                    <Label htmlFor="calendar-id">ID do Calendário</Label>
                    <Input
                      id="calendar-id"
                      type="text"
                      placeholder="exemplo@group.calendar.google.com"
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      className="max-w-md focus-visible:ring-primary font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      O ID do calendário pode ser encontrado nas configurações do seu Google Calendar.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="calendar-json">Service Account JSON (Chave Privada)</Label>
                    <div className="relative max-w-2xl">
                      <textarea
                        id="calendar-json"
                        placeholder={'{\n  "type": "service_account",\n  "project_id": "..."\n}'}
                        value={calendarJson}
                        onChange={(e) => setCalendarJson(e.target.value)}
                        className={`flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 font-mono ${!showCalendarJson && calendarJson ? 'text-transparent text-shadow-disc' : ''}`}
                        style={!showCalendarJson && calendarJson ? { textShadow: '0 0 8px rgba(0,0,0,0.5)' } : {}}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur-sm rounded-md"
                        onClick={() => setShowCalendarJson(!showCalendarJson)}
                      >
                        {showCalendarJson ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cole aqui o conteúdo completo do arquivo JSON gerado no Google Cloud Console (Google Calendar API).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Ative a integração para configurar a sincronização com o Calendar.</p>
                </div>
              )}
            </CardContent>
            
            {isCalendarActive && (
              <CardFooter className="bg-muted/10 border-t px-6 py-4 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => handleTestConnection('calendar')}
                  disabled={isTestingCalendar || !calendarId || !calendarJson}
                  className="gap-2"
                >
                  {isTestingCalendar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4" />
                  )}
                  {isTestingCalendar ? 'Testando...' : 'Testar Conexão'}
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
