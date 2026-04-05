'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import {
  Activity, Calendar, AlertCircle, BookOpen, Bot,
  LayoutDashboard, MessageSquare, Users, Stethoscope,
  ChevronRight, FileText, LogOut, Link2, Search, Mail, Settings, CalendarDays,
  Sun, Moon, Wallet
} from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

const navGroups = [
  {
    title: 'Atendimentos',
    collapsible: false,
    items: [
      { href: '/dashboard/agendamentos',label: 'Agendamentos',      icon: CalendarDays,    accent: 'text-primary' },
      { href: '/dashboard/schedule',  label: 'Horários da Clínica', icon: Calendar,        accent: 'text-primary' },
      { href: '/dashboard/triages',   label: 'Triagens',             icon: AlertCircle,     accent: 'text-primary' },
      { href: '/dashboard/exames',    label: 'Exames e Laudos',      icon: FileText,        accent: 'text-primary' },
    ]
  },
  {
    title: 'Gestão',
    collapsible: false,
    items: [
      { href: '/dashboard/patients',  label: 'Pacientes',            icon: Users,           accent: 'text-primary' },
      { href: '/dashboard/medicos',   label: 'Médicos',              icon: Stethoscope,     accent: 'text-primary' },
      { href: '/dashboard/services',  label: 'Catálogo de Serviços', icon: BookOpen,        accent: 'text-primary' },
      { href: '/dashboard/finance',   label: 'Faturamento',          icon: Wallet,          accent: 'text-primary' },
    ]
  },
  {
    title: 'Ferramentas',
    collapsible: false,
    items: [
      { href: '/dashboard',           label: 'Visão Geral',         icon: LayoutDashboard, accent: 'text-primary' },
      { href: '/dashboard/copilot', label: 'Copiloto IA', icon: Bot, accent: 'text-primary' },
      { href: '/dashboard/faqs',      label: 'Base de Conhecimento', icon: BookOpen,        accent: 'text-primary' },
    ]
  },
  {
    title: 'Sistema',
    collapsible: true,
    items: [
      { href: '/dashboard/integrations', label: 'Integrações', icon: Link2, accent: 'text-primary' },
      { href: '/dashboard/workspace', label: 'Google Workspace', icon: Mail, accent: 'text-primary' },
      { href: '/dashboard/settings', label: 'Configurações', icon: Settings, accent: 'text-primary' },
    ]
  }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [openCommand, setOpenCommand] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenCommand((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpenCommand(false);
    command();
  };

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (!session) {
          window.location.href = '/login'; // Força o redirecionamento se o router.push falhar
        } else {
          setUser(session.user);
          setIsLoading(false);

          // Restaura o tema salvo do banco de dados (user_metadata)
          const userTheme = session.user.user_metadata?.theme;
          if (userTheme && (userTheme === 'light' || userTheme === 'dark')) {
            setTheme(userTheme);
          }
        }
      } catch (error) {
        console.error("Auth error:", error);
        if (mounted) window.location.href = '/login';
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && mounted) {
        window.location.href = '/login';
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    try {
      // Salva a preferência de tema no user_metadata do Supabase
      const { error } = await supabase.auth.updateUser({
        data: { theme: newTheme }
      });
      
      if (error) {
        console.error("Erro ao salvar tema:", error);
      }
    } catch (err) {
      console.error("Erro inesperado ao salvar tema:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background overflow-hidden">
          <Toaster position="top-right" richColors />

          <CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
            <CommandInput placeholder="Digite um comando ou busque..." />
            <CommandList>
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
              <CommandGroup heading="Atalhos">
                {navGroups.flatMap(group => group.items).map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => runCommand(() => router.push(item.href))}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Ações">
                <CommandItem onSelect={() => runCommand(() => { supabase.auth.signOut(); router.push('/login'); })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair do sistema</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>

        <Sidebar variant="inset" className="border-r bg-card">
          <SidebarHeader className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none text-foreground">OrthoAdmin</span>
                <span className="mt-0.5 text-[11px] text-muted-foreground font-medium">Painel da Clínica</span>
              </div>
            </div>
            
            <div className="mt-4 px-1">
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm text-muted-foreground bg-muted/50 border-border/50 h-9"
                onClick={() => setOpenCommand(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span>Buscar...</span>
                <kbd className="pointer-events-none absolute right-3 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group) => {
              if (group.collapsible) {
                return (
                  <Collapsible key={group.title} defaultOpen className="group/collapsible">
                    <SidebarGroup>
                      <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:bg-accent hover:text-accent-foreground p-2 rounded-md transition-colors cursor-pointer">
                          {group.title}
                          <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                      </SidebarGroupLabel>
                      <CollapsibleContent>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {group.items.map((item) => {
                              const isActive = pathname === item.href;
                              return (
                                <SidebarMenuItem key={item.href}>
                                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={cn("transition-all duration-200", isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                                    <Link href={item.href}>
                                      <item.icon className={cn("h-4 w-4", isActive ? item.accent : "text-muted-foreground")} />
                                      <span>{item.label}</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </SidebarGroup>
                  </Collapsible>
                );
              }

              return (
                <SidebarGroup key={group.title}>
                  <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={cn("transition-all duration-200", isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                              <Link href={item.href}>
                                <item.icon className={cn("h-4 w-4", isActive ? item.accent : "text-muted-foreground")} />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
          </SidebarContent>

          <SidebarFooter className="p-4 space-y-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="w-full justify-between hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 rounded-lg bg-primary/10">
                          <AvatarFallback className="rounded-lg text-primary font-semibold text-xs">
                            {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold text-foreground">
                            {user?.user_metadata?.full_name || 'Administrador'}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user?.email || 'admin@orthoadmin.com'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-lg" side="top" align="start" sideOffset={8}>
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg bg-primary/10">
                          <AvatarFallback className="rounded-lg text-primary font-semibold text-xs">
                            {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold text-foreground">
                            {user?.user_metadata?.full_name || 'Administrador'}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user?.email || 'admin@orthoadmin.com'}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')} className="cursor-pointer">
                      {theme === 'dark' ? (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          <span className="font-medium">Modo Claro</span>
                        </>
                      ) : (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          <span className="font-medium">Modo Escuro</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/">
                        <MessageSquare className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium">Chat do Paciente</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span className="font-medium">Sair do Sistema</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>

            {/* Branding Footer */}
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
              <a 
                href="https://www.instagram.com/brazeo.ai?igsh=N3NqZXZoMnA1bGc=" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 no-underline"
                title="Conheça a Brazeo AI"
              >
                <svg width="70" height="20" viewBox="0 0 120 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground">
                  <path d="M22 5V25" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M22 5C30 5 33 10 26 14C35 15 32 25 22 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 10L8 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M16 15L6 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M16 20L8 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <text x="40" y="22" fill="currentColor" fontSize="22" fontWeight="600" fontFamily="system-ui, sans-serif" letterSpacing="-0.5">brazeo</text>
                </svg>
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                  feito com amor ❤️
                </span>
              </a>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6 flex-shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            {/* Additional header items can go here */}
          </header>

          <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-10">
            <div className="mx-auto max-w-[1600px] w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
