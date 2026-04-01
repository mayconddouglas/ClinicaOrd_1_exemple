'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, MapPin, Palette, Building2, Save, X, Building, Map } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'address' | 'branding'>('profile');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [clinicName, setClinicName] = useState('OrthoClinic SP');
  const [cnpj, setCnpj] = useState('12.345.678/0001-90');
  const [responsavel, setResponsavel] = useState('Dr. João Silva (CRM-SP 12345)');

  // Address State
  const [cep, setCep] = useState('01234-567');
  const [rua, setRua] = useState('Av. Paulista');
  const [numero, setNumero] = useState('1000');
  const [bairro, setBairro] = useState('Bela Vista');
  const [cidade, setCidade] = useState('São Paulo');

  // Branding State
  const [themeColor, setThemeColor] = useState('#2563eb'); // Default blue
  const [welcomeMessage, setWelcomeMessage] = useState('Olá! Seja bem-vindo à OrthoClinic. Como podemos ajudar hoje?');

  // Monitor changes
  useEffect(() => {
    // In a real app, we would compare with the initial loaded state
    // For this UI demo, we'll just show the save bar if they type something different from defaults
    const isChanged = 
      clinicName !== 'OrthoClinic SP' || 
      cnpj !== '12.345.678/0001-90' ||
      responsavel !== 'Dr. João Silva (CRM-SP 12345)' ||
      cep !== '01234-567' ||
      rua !== 'Av. Paulista' ||
      numero !== '1000' ||
      bairro !== 'Bela Vista' ||
      cidade !== 'São Paulo' ||
      themeColor !== '#2563eb' ||
      welcomeMessage !== 'Olá! Seja bem-vindo à OrthoClinic. Como podemos ajudar hoje?';
      
    setHasChanges(isChanged);
  }, [clinicName, cnpj, responsavel, cep, rua, numero, bairro, cidade, themeColor, welcomeMessage]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
    toast.success('Configurações salvas com sucesso!');
  };

  const handleDiscard = () => {
    setClinicName('OrthoClinic SP');
    setCnpj('12.345.678/0001-90');
    setResponsavel('Dr. João Silva (CRM-SP 12345)');
    setCep('01234-567');
    setRua('Av. Paulista');
    setNumero('1000');
    setBairro('Bela Vista');
    setCidade('São Paulo');
    setThemeColor('#2563eb');
    setWelcomeMessage('Olá! Seja bem-vindo à OrthoClinic. Como podemos ajudar hoje?');
    setHasChanges(false);
    toast.info('Alterações descartadas.');
  };

  const PRESET_COLORS = [
    { name: 'Azul Médico (Padrão)', value: '#2563eb' },
    { name: 'Verde Saúde', value: '#16a34a' },
    { name: 'Roxo Premium', value: '#7c3aed' },
    { name: 'Rosa Clínico', value: '#db2777' },
    { name: 'Preto Elegante', value: '#171717' },
  ];

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
          {/* Sidebar Menu */}
          <aside className="md:w-64 flex-shrink-0">
            <nav className="flex flex-col space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'profile' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Building2 className="h-4 w-4" />
                Perfil da Clínica
              </button>
              <button
                onClick={() => setActiveTab('address')}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'address' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <MapPin className="h-4 w-4" />
                Endereço
              </button>
              <button
                onClick={() => setActiveTab('branding')}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'branding' 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Palette className="h-4 w-4" />
                Personalização (Branding)
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <Card className="animate-in fade-in duration-300">
                <CardHeader>
                  <CardTitle>Perfil da Clínica</CardTitle>
                  <CardDescription>Informações públicas que aparecem em recibos e laudos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Logo Upload */}
                  <div className="flex items-center gap-6">
                    <div className="relative group cursor-pointer">
                      <div className="h-24 w-24 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                        <span className="text-3xl font-bold text-muted-foreground/50 group-hover:opacity-0 transition-opacity">
                          {clinicName.charAt(0)}
                        </span>
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-6 w-6 text-white mb-1" />
                          <span className="text-[10px] text-white font-medium">Trocar</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Logo da Clínica</h3>
                      <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-xs">
                        Recomendamos imagens quadradas (1:1) com fundo transparente, formato PNG ou JPG de até 2MB.
                      </p>
                      <Button variant="outline" size="sm">Fazer Upload</Button>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="clinic-name">Nome da Clínica</Label>
                      <Input
                        id="clinic-name"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                      <div className="grid gap-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          value={cnpj}
                          onChange={(e) => setCnpj(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="responsavel">Responsável Técnico</Label>
                        <Input
                          id="responsavel"
                          value={responsavel}
                          onChange={(e) => setResponsavel(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ADDRESS TAB */}
            {activeTab === 'address' && (
              <Card className="animate-in fade-in duration-300">
                <CardHeader>
                  <CardTitle>Endereço de Atendimento</CardTitle>
                  <CardDescription>Onde seus pacientes devem ir para as consultas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Fake Map Visual */}
                  <div className="w-full h-32 bg-muted/50 rounded-lg border border-border flex items-center justify-center relative overflow-hidden mb-6">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                    <div className="flex flex-col items-center text-muted-foreground z-10">
                      <Map className="h-8 w-8 mb-2" />
                      <span className="text-sm font-medium">Pré-visualização do Mapa</span>
                    </div>
                  </div>

                  <div className="grid gap-6 max-w-2xl">
                    <div className="grid gap-2">
                      <Label htmlFor="cep">CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="cep"
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          className="max-w-[150px]"
                        />
                        <Button variant="secondary">Buscar</Button>
                      </div>
                    </div>
                    
                    <div className="grid sm:grid-cols-[1fr_100px] gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="rua">Rua / Avenida</Label>
                        <Input
                          id="rua"
                          value={rua}
                          onChange={(e) => setRua(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="numero">Número</Label>
                        <Input
                          id="numero"
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input
                          id="bairro"
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cidade">Cidade / Estado</Label>
                        <Input
                          id="cidade"
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BRANDING TAB */}
            {activeTab === 'branding' && (
              <Card className="animate-in fade-in duration-300">
                <CardHeader>
                  <CardTitle>Personalização</CardTitle>
                  <CardDescription>Ajuste a aparência do chat do paciente e portal web.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  
                  <div className="space-y-4">
                    <Label className="text-base">Cor Principal do Tema</Label>
                    <p className="text-sm text-muted-foreground">Essa cor será usada em botões e destaques no chat do paciente.</p>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setThemeColor(color.value)}
                          className={`flex flex-col items-center gap-2 transition-transform hover:scale-105`}
                        >
                          <div 
                            className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center ${themeColor === color.value ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : 'border border-border'}`}
                            style={{ backgroundColor: color.value }}
                          >
                            {themeColor === color.value && <Save className="h-5 w-5 text-white" />}
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid gap-2">
                      <Label htmlFor="welcome" className="text-base">Mensagem de Boas-vindas</Label>
                      <p className="text-sm text-muted-foreground mb-2">A primeira mensagem que o paciente vê ao abrir o chat ou WhatsApp.</p>
                      <Textarea
                        id="welcome"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        className="min-h-[100px] max-w-2xl resize-none"
                      />
                    </div>
                  </div>

                  {/* Preview Component */}
                  <div className="pt-6">
                    <Label className="text-base mb-4 block">Pré-visualização do Chat</Label>
                    <div className="max-w-md border rounded-xl overflow-hidden bg-card shadow-sm">
                      <div className="p-4 border-b flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: themeColor }}>
                          {clinicName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{clinicName}</p>
                          <p className="text-[10px] text-green-500">Online agora</p>
                        </div>
                      </div>
                      <div className="p-4 bg-muted/30 h-32 flex flex-col justify-end">
                        <div className="bg-background border rounded-2xl rounded-tl-sm p-3 text-sm shadow-sm max-w-[85%]">
                          {welcomeMessage}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <div className="rounded-full px-4 py-2 text-white text-sm font-medium shadow-sm" style={{ backgroundColor: themeColor }}>
                            Agendar Consulta
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
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
