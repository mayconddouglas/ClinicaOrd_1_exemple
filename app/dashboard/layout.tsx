'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Activity, Calendar, AlertCircle, BookOpen, Bot,
  LayoutDashboard, MessageSquare, Users, Stethoscope,
  ChevronRight, FileText, LogOut, Link2, Search
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

const navItems = [
  { href: '/dashboard',           label: 'Visão Geral',         icon: LayoutDashboard, accent: 'text-primary' },
  { href: '/dashboard/schedule',  label: 'Horários',             icon: Calendar,        accent: 'text-primary' },
  { href: '/dashboard/patients',  label: 'Pacientes',            icon: Users,           accent: 'text-primary' },
  { href: '/dashboard/triages',   label: 'Triagens',             icon: AlertCircle,     accent: 'text-primary' },
  { href: '/dashboard/exames',    label: 'Exames e Laudos',      icon: FileText,        accent: 'text-primary' },
  { href: '/dashboard/faqs',      label: 'Base de Conhecimento', icon: BookOpen,        accent: 'text-primary' },
  { href: '/dashboard/medicos',   label: 'Médicos',              icon: Stethoscope,     accent: 'text-primary' },
];

const aiItem = { href: '/dashboard/copilot', label: 'Copiloto IA', icon: Bot, accent: 'text-primary' };
const integrationItem = { href: '/dashboard/integrations', label: 'Integrações', icon: Link2, accent: 'text-primary' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [openCommand, setOpenCommand] = useState(false);

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
          setIsLoading(false);
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
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
                {navItems.map((item) => (
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
              <CommandGroup heading="Inteligência">
                <CommandItem onSelect={() => runCommand(() => router.push(aiItem.href))}>
                  <aiItem.icon className="mr-2 h-4 w-4" />
                  <span>{aiItem.label}</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Ações">
                <CommandItem onSelect={() => runCommand(() => router.push(integrationItem.href))}>
                  <integrationItem.icon className="mr-2 h-4 w-4" />
                  <span>{integrationItem.label}</span>
                </CommandItem>
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
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
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

            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Inteligência
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === aiItem.href} tooltip={aiItem.label} className={cn("transition-all duration-200", pathname === aiItem.href ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                      <Link href={aiItem.href}>
                        <aiItem.icon className={cn("h-4 w-4", pathname === aiItem.href ? aiItem.accent : "text-muted-foreground")} />
                        <span>{aiItem.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Configurações
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === integrationItem.href} tooltip={integrationItem.label} className={cn("transition-all duration-200", pathname === integrationItem.href ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                      <Link href={integrationItem.href}>
                        <integrationItem.icon className={cn("h-4 w-4", pathname === integrationItem.href ? integrationItem.accent : "text-muted-foreground")} />
                        <span>{integrationItem.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 space-y-2">
            <Link href="/">
              <Button
                variant="outline"
                className="w-full justify-start gap-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground border shadow-sm"
              >
                <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Chat do Paciente</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Sair do Sistema</span>
            </Button>
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
