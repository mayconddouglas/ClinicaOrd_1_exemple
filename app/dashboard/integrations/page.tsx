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
                <SheetContent className="sm:max-w-md w-full flex flex-col h-full px-4 sm:px-8 py-4 sm:py-8">
                  <SheetHeader className="pb-3 sm:pb-6 border-b border-border/50">
                    <SheetTitle className="text-lg sm:text-2xl">Configuração do Telegram</SheetTitle>
                    <SheetDescription className="text-xs sm:text-sm mt-1 sm:mt-1.5">
                      Siga o passo a passo para conectar seu bot do Telegram.
                    </SheetDescription>
                  </SheetHeader>

                  <ScrollArea className="flex-1 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 sm:py-6">
                    <div className="space-y-6 sm:space-y-8">
                      <div className="space-y-4 sm:space-y-5 text-sm bg-muted/50 p-4 sm:p-6 rounded-xl border border-border/50">
                        <h3 className="font-semibold text-sm sm:text-base">Passo a Passo</h3>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex gap-2.5 sm:gap-4">
                            <span className="flex h-5 w-5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">1</span>
                            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed pt-0.5 sm:pt-1">
                              Abra o Telegram e busque por <a href="https://t.me/botfather" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium inline-flex items-center">@BotFather <ExternalLink className="h-3 w-3 ml-1" /></a>. Envie o comando <code>/newbot</code> e siga as instruções.
                            </p>
                          </div>
                          <div className="flex gap-2.5 sm:gap-4">
                            <span className="flex h-5 w-5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">2</span>
                            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed pt-0.5 sm:pt-1">
                              O BotFather enviará o <strong className="text-foreground">HTTP API Token</strong>. Copie e cole no campo abaixo.
                            </p>
                          </div>
                          <div className="flex gap-2.5 sm:gap-4">
                            <span className="flex h-5 w-5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">3</span>
                            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed pt-0.5 sm:pt-1">
                              Ative a integração na tela anterior e clique em <strong className="text-foreground">Salvar Configurações</strong>.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        <div className="space-y-1.5 sm:space-y-3">
                          <Label htmlFor="bot-token" className="text-xs sm:text-sm font-semibold">Bot Token</Label>
                          <Input
                            id="bot-token"
                            type="password"
                            value={telegramToken}
                            onChange={(e) => setTelegramToken(e.target.value)}
                            placeholder="Ex: 1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                            className="h-9 sm:h-12 font-mono text-xs sm:text-sm"
                          />
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            O token gerado pelo BotFather no Telegram.
                          </p>
                        </div>

                        <div className="space-y-1.5 sm:space-y-3">
                          <Label htmlFor="webhook-url" className="text-xs sm:text-sm font-semibold">Webhook URL (Automático)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="webhook-url"
                              value={webhookUrl}
                              readOnly
                              className="bg-muted h-9 sm:h-12 font-mono text-[10px] sm:text-xs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 sm:h-12 sm:w-12 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(webhookUrl);
                                toast.success('URL copiada para a área de transferência!');
                              }}
                            >
                              <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Esta URL será configurada automaticamente no Telegram.
                          </p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="mt-2 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
                    <SheetFooter>
                      <Button
                        onClick={handleSaveTelegram}
                        className="w-full h-9 sm:h-12 text-xs sm:text-base font-medium"
                        disabled={isSaving || (telegramEnabled && !telegramToken)}
                      >
                        {isSaving ? <Loader2 className="mr-2 h-3 w-3 sm:h-5 sm:w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3 sm:h-5 sm:w-5" />}
                        Salvar Configurações
                      </Button>
                    </SheetFooter>
                  </div>
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
                <SheetContent className="sm:max-w-md w-full flex flex-col h-full px-4 sm:px-8 py-4 sm:py-8">
                  <SheetHeader className="pb-3 sm:pb-6 border-b border-border/50">
                    <SheetTitle className="text-lg sm:text-2xl">Configuração do WhatsApp</SheetTitle>
                    <SheetDescription className="text-xs sm:text-sm mt-1 sm:mt-1.5">
                      Siga o passo a passo para conectar a API Oficial do WhatsApp.
                    </SheetDescription>
                  </SheetHeader>

                  <ScrollArea className="flex-1 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 sm:py-6">
                    <div className="space-y-6 sm:space-y-8">
                      <div className="space-y-4 sm:space-y-5 text-sm bg-muted/50 p-4 sm:p-6 rounded-xl border border-border/50">
                        <h3 className="font-semibold text-sm sm:text-base">Passo a Passo</h3>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex gap-2.5 sm:gap-4">
                            <span className="flex h-5 w-5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">1</span>
                            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed pt-0.5 sm:pt-1">
                              Acesse <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium inline-flex items-center">Meta for Developers <ExternalLink className="h-3 w-3 ml-1" /></a>, crie um app e adicione <strong className="text-foreground">WhatsApp</strong>.
                            </p>
                          </div>
                          <div className="flex gap-2.5 sm:gap-4">
                            <span className="flex h-5 w-5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">2</span>
                            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed pt-0.5 sm:pt-1">
                              Copie o <strong className="text-foreground">Token de Acesso</strong> e o <strong className="text-foreground">ID do Número</strong> e cole abaixo.
                            </p>
                          </div>
                          <div className="flex gap-2.5 sm:gap-4">
                            <span className="flex h-5 w-5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">3</span>
                            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed pt-0.5 sm:pt-1">
                              Crie um <strong className="text-foreground">Token de Verificação</strong> (senha) e cole abaixo.
                            </p>
                          </div>
                          <div className="flex gap-2.5 sm:gap-4">
                            <span className="flex h-5 w-5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">4</span>
                            <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed pt-0.5 sm:pt-1">
                              Na Meta, em Configuração &gt; Webhook, cole a <strong className="text-foreground">URL</strong> e o <strong className="text-foreground">Token de Verificação</strong>. Inscreva-se em <code>messages</code>.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        <div className="space-y-1.5 sm:space-y-3">
                          <Label htmlFor="wa-token" className="text-xs sm:text-sm font-semibold">Token de Acesso</Label>
                          <Input
                            id="wa-token"
                            type="password"
                            value={whatsappToken}
                            onChange={(e) => setWhatsappToken(e.target.value)}
                            placeholder="EAAGm0..."
                            className="h-9 sm:h-12 font-mono text-xs sm:text-sm"
                          />
                        </div>

                        <div className="space-y-1.5 sm:space-y-3">
                          <Label htmlFor="wa-phone-id" className="text-xs sm:text-sm font-semibold">ID do Número de Telefone</Label>
                          <Input
                            id="wa-phone-id"
                            value={whatsappPhoneId}
                            onChange={(e) => setWhatsappPhoneId(e.target.value)}
                            placeholder="10384759..."
                            className="h-9 sm:h-12 font-mono text-xs sm:text-sm"
                          />
                        </div>

                        <div className="space-y-1.5 sm:space-y-3">
                          <Label htmlFor="wa-verify-token" className="text-xs sm:text-sm font-semibold">Token de Verificação (Webhook)</Label>
                          <Input
                            id="wa-verify-token"
                            type="password"
                            value={whatsappVerifyToken}
                            onChange={(e) => setWhatsappVerifyToken(e.target.value)}
                            placeholder="Crie uma senha forte"
                            className="h-9 sm:h-12 font-mono text-xs sm:text-sm"
                          />
                        </div>

                        <div className="space-y-1.5 sm:space-y-3">
                          <Label htmlFor="wa-webhook" className="text-xs sm:text-sm font-semibold">Webhook URL (Para a Meta)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="wa-webhook"
                              value={whatsappWebhookUrl}
                              readOnly
                              className="bg-muted h-9 sm:h-12 font-mono text-[10px] sm:text-xs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 sm:h-12 sm:w-12 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(whatsappWebhookUrl);
                                toast.success('URL copiada para a área de transferência!');
                              }}
                            >
                              <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="mt-2 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
                    <SheetFooter>
                      <Button
                        onClick={handleSaveWhatsapp}
                        className="w-full h-9 sm:h-12 text-xs sm:text-base font-medium"
                        disabled={isSaving || (whatsappEnabled && (!whatsappToken || !whatsappPhoneId || !whatsappVerifyToken))}
                      >
                        {isSaving ? <Loader2 className="mr-2 h-3 w-3 sm:h-5 sm:w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3 sm:h-5 sm:w-5" />}
                        Salvar Configurações
                      </Button>
                    </SheetFooter>
                  </div>
                </SheetContent>
              </Sheet>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
