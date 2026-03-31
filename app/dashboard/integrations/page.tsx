'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MessageCircle, CheckCircle2, Copy, ExternalLink, Loader2, Settings, Phone } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function IntegrationsPage() {
  // Telegram State
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  // WhatsApp State
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState('');
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Set webhook URLs based on current origin
    setWebhookUrl(`${window.location.origin}/api/telegram/webhook`);
    setWhatsappWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
    
    // Load settings
    const loadSettings = async () => {
      try {
        const [
          enabledRes, tokenRes,
          waEnabledRes, waTokenRes, waPhoneIdRes, waVerifyTokenRes
        ] = await Promise.all([
          fetch('/api/settings?key=__TELEGRAM_ENABLED__'),
          fetch('/api/settings?key=__TELEGRAM_BOT_TOKEN__'),
          fetch('/api/settings?key=__WHATSAPP_ENABLED__'),
          fetch('/api/settings?key=__WHATSAPP_TOKEN__'),
          fetch('/api/settings?key=__WHATSAPP_PHONE_ID__'),
          fetch('/api/settings?key=__WHATSAPP_VERIFY_TOKEN__')
        ]);
        
        const enabledData = await enabledRes.json();
        const tokenData = await tokenRes.json();
        const waEnabledData = await waEnabledRes.json();
        const waTokenData = await waTokenRes.json();
        const waPhoneIdData = await waPhoneIdRes.json();
        const waVerifyTokenData = await waVerifyTokenRes.json();
        
        if (enabledData.value === 'true') setTelegramEnabled(true);
        if (tokenData.value) setTelegramToken(tokenData.value);
        
        if (waEnabledData.value === 'true') setWhatsappEnabled(true);
        if (waTokenData.value) setWhatsappToken(waTokenData.value);
        if (waPhoneIdData.value) setWhatsappPhoneId(waPhoneIdData.value);
        if (waVerifyTokenData.value) setWhatsappVerifyToken(waVerifyTokenData.value);
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('Erro ao carregar configurações.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleSaveTelegram = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: '__TELEGRAM_ENABLED__', value: telegramEnabled ? 'true' : 'false' })
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: '__TELEGRAM_BOT_TOKEN__', value: telegramToken })
        })
      ]);
      
      // If enabled and token exists, register webhook
      if (telegramEnabled && telegramToken) {
        const response = await fetch('/api/telegram/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: telegramToken, url: webhookUrl })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao registrar webhook');
        toast.success('Integração Telegram salva e Webhook configurado!');
      } else {
        toast.success('Configurações do Telegram salvas!');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Erro ao salvar configurações do Telegram.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: '__WHATSAPP_ENABLED__', value: whatsappEnabled ? 'true' : 'false' })
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: '__WHATSAPP_TOKEN__', value: whatsappToken })
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: '__WHATSAPP_PHONE_ID__', value: whatsappPhoneId })
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: '__WHATSAPP_VERIFY_TOKEN__', value: whatsappVerifyToken })
        })
      ]);
      
      toast.success('Configurações do WhatsApp salvas!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Erro ao salvar configurações do WhatsApp.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-6 w-[150px]" />
                </div>
                <Skeleton className="h-4 w-[250px]" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-[120px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <Skeleton className="h-6 w-[40px] rounded-full" />
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground mt-2">
          Conecte o agente de IA da clínica a outros canais de comunicação.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Telegram Integration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#0088cc]/10 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-[#0088cc]" />
                  </div>
                  <div>
                    <CardTitle>Telegram Bot</CardTitle>
                    <CardDescription>Atenda pacientes pelo Telegram</CardDescription>
                  </div>
                </div>
                <Switch 
                  checked={telegramEnabled} 
                  onCheckedChange={setTelegramEnabled} 
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                {telegramEnabled ? 'Integração ativa. O bot está pronto para responder mensagens.' : 'Integração desativada. Configure para começar a usar.'}
              </p>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md w-full flex flex-col h-full">
                  <SheetHeader>
                    <SheetTitle>Configuração do Telegram</SheetTitle>
                    <SheetDescription>
                      Siga o passo a passo para conectar seu bot do Telegram.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <ScrollArea className="flex-1 -mx-6 px-6 py-4">
                    <div className="space-y-6">
                      <div className="space-y-4 text-sm bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-base">Passo a Passo</h3>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                            <p className="text-muted-foreground">
                              Abra o Telegram e busque por <a href="https://t.me/botfather" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center">@BotFather <ExternalLink className="h-3 w-3 ml-1" /></a>. Envie o comando <code>/newbot</code> e siga as instruções para dar um nome e um &quot;username&quot; ao seu bot.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                            <p className="text-muted-foreground">
                              O BotFather enviará uma mensagem com o seu <strong>HTTP API Token</strong>. Copie esse código e cole no campo abaixo.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                            <p className="text-muted-foreground">
                              Ative a integração na tela anterior e clique em <strong>Salvar Configurações</strong>.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="bot-token">Bot Token</Label>
                          <Input 
                            id="bot-token" 
                            type="password" 
                            placeholder="Ex: 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ" 
                            value={telegramToken}
                            onChange={(e) => setTelegramToken(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            O token gerado pelo BotFather no Telegram.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Webhook URL (Automático)</Label>
                          <div className="flex gap-2">
                            <Input 
                              readOnly 
                              value={webhookUrl} 
                              className="bg-muted text-muted-foreground"
                            />
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => copyToClipboard(webhookUrl)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Esta URL será configurada automaticamente no Telegram ao salvar.
                          </p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  
                  <SheetFooter className="pt-4 border-t mt-auto">
                    <Button 
                      onClick={handleSaveTelegram} 
                      className="w-full" 
                      disabled={isSaving || (telegramEnabled && !telegramToken)}
                    >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Salvar Configurações
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </CardFooter>
          </Card>
        </motion.div>

        {/* WhatsApp Integration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#25D366]/10 rounded-lg">
                    <Phone className="h-6 w-6 text-[#25D366]" />
                  </div>
                  <div>
                    <CardTitle>WhatsApp API</CardTitle>
                    <CardDescription>Atenda pacientes pelo WhatsApp</CardDescription>
                  </div>
                </div>
                <Switch 
                  checked={whatsappEnabled} 
                  onCheckedChange={setWhatsappEnabled} 
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">
                {whatsappEnabled ? 'Integração ativa. O bot está pronto para responder mensagens.' : 'Integração desativada. Configure para começar a usar.'}
              </p>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md w-full flex flex-col h-full">
                  <SheetHeader>
                    <SheetTitle>Configuração do WhatsApp</SheetTitle>
                    <SheetDescription>
                      Siga o passo a passo para conectar a API Oficial do WhatsApp.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <ScrollArea className="flex-1 -mx-6 px-6 py-4">
                    <div className="space-y-6">
                      <div className="space-y-4 text-sm bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-base">Passo a Passo</h3>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                            <p className="text-muted-foreground">
                              Acesse o <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center">Meta for Developers <ExternalLink className="h-3 w-3 ml-1" /></a>, crie um aplicativo e adicione o produto <strong>WhatsApp</strong>.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                            <p className="text-muted-foreground">
                              Na seção de Configuração da API, copie o <strong>Token de Acesso</strong> e o <strong>ID do Número de Telefone</strong> e cole nos campos abaixo.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
                            <p className="text-muted-foreground">
                              Crie um <strong>Token de Verificação</strong> (uma senha qualquer inventada por você) e cole no campo correspondente.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">4</span>
                            <p className="text-muted-foreground">
                              No painel da Meta, vá em Configuração &gt; Webhook. Cole a <strong>URL do Webhook</strong> gerada abaixo e o <strong>Token de Verificação</strong>. Inscreva-se no evento <code>messages</code>.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="wa-token">Token de Acesso (Access Token)</Label>
                          <Input 
                            id="wa-token" 
                            type="password" 
                            placeholder="Ex: EAABwzLixxxx..." 
                            value={whatsappToken}
                            onChange={(e) => setWhatsappToken(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wa-phone-id">ID do Número de Telefone</Label>
                          <Input 
                            id="wa-phone-id" 
                            type="text" 
                            placeholder="Ex: 123456789012345" 
                            value={whatsappPhoneId}
                            onChange={(e) => setWhatsappPhoneId(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wa-verify-token">Token de Verificação (Webhook)</Label>
                          <Input 
                            id="wa-verify-token" 
                            type="password" 
                            placeholder="Crie uma senha para o webhook" 
                            value={whatsappVerifyToken}
                            onChange={(e) => setWhatsappVerifyToken(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Webhook URL</Label>
                          <div className="flex gap-2">
                            <Input 
                              readOnly 
                              value={whatsappWebhookUrl} 
                              className="bg-muted text-muted-foreground"
                            />
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => copyToClipboard(whatsappWebhookUrl)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  
                  <SheetFooter className="pt-4 border-t mt-auto">
                    <Button 
                      onClick={handleSaveWhatsapp} 
                      className="w-full" 
                      disabled={isSaving || (whatsappEnabled && (!whatsappToken || !whatsappPhoneId || !whatsappVerifyToken))}
                    >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Salvar Configurações
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
