'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Activity, Calendar, AlertCircle, BookOpen, Bot,
  LayoutDashboard, MessageSquare, Users, Stethoscope,
  ChevronRight, FileText, LogOut
} from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  { href: '/dashboard',           label: 'Visão Geral',         icon: LayoutDashboard, accent: 'text-blue-500' },
  { href: '/dashboard/schedule',  label: 'Horários',             icon: Calendar,        accent: 'text-sky-500' },
  { href: '/dashboard/patients',  label: 'Pacientes',            icon: Users,           accent: 'text-violet-500' },
  { href: '/dashboard/triages',   label: 'Triagens',             icon: AlertCircle,     accent: 'text-rose-500' },
  { href: '/dashboard/exames',    label: 'Exames e Laudos',      icon: FileText,        accent: 'text-emerald-500' },
  { href: '/dashboard/faqs',      label: 'Base de Conhecimento', icon: BookOpen,        accent: 'text-amber-500' },
  { href: '/dashboard/medicos',   label: 'Médicos',              icon: Stethoscope,     accent: 'text-cyan-500' },
];

const aiItem = { href: '/dashboard/copilot', label: 'Copiloto IA', icon: Bot, accent: 'text-indigo-500' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-neutral-50 overflow-hidden">
          <Toaster position="top-right" richColors />

        <Sidebar variant="inset" className="border-r border-neutral-200 bg-white">
          <SidebarHeader className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none text-neutral-900">OrthoAdmin</span>
                <span className="mt-0.5 text-[11px] text-neutral-500 font-medium">Painel da Clínica</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={cn("transition-all duration-200", isActive ? "bg-blue-50/80 text-blue-900 font-medium" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900")}>
                          <Link href={item.href}>
                            <item.icon className={cn("h-4 w-4", isActive ? item.accent : "text-neutral-400")} />
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
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Inteligência
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === aiItem.href} tooltip={aiItem.label} className={cn("transition-all duration-200", pathname === aiItem.href ? "bg-indigo-50/80 text-indigo-900 font-medium" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900")}>
                      <Link href={aiItem.href}>
                        <aiItem.icon className={cn("h-4 w-4", pathname === aiItem.href ? aiItem.accent : "text-neutral-400")} />
                        <span>{aiItem.label}</span>
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
                className="w-full justify-start gap-2.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border-neutral-200 shadow-sm"
              >
                <MessageSquare className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium">Chat do Paciente</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-2.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Sair do Sistema</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <header className="flex h-14 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:px-6 flex-shrink-0">
            <SidebarTrigger className="text-neutral-500 hover:text-neutral-900" />
            <div className="flex-1" />
            {/* Additional header items can go here */}
          </header>

          <main className="flex-1 overflow-y-auto bg-neutral-50/50 p-6 lg:p-10">
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
