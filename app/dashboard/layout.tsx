'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Activity, Calendar, AlertCircle, BookOpen, Bot,
  LayoutDashboard, MessageSquare, Users, Stethoscope,
  Menu, ChevronRight
} from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { href: '/dashboard',           label: 'Visão Geral',         icon: LayoutDashboard, accent: 'text-blue-400' },
  { href: '/dashboard/schedule',  label: 'Horários',             icon: Calendar,        accent: 'text-sky-400' },
  { href: '/dashboard/patients',  label: 'Pacientes',            icon: Users,           accent: 'text-violet-400' },
  { href: '/dashboard/triages',   label: 'Triagens',             icon: AlertCircle,     accent: 'text-rose-400' },
  { href: '/dashboard/faqs',      label: 'Base de Conhecimento', icon: BookOpen,        accent: 'text-emerald-400' },
  { href: '/dashboard/medicos',   label: 'Médicos',              icon: Stethoscope,     accent: 'text-cyan-400' },
];

const aiItem = { href: '/dashboard/copilot', label: 'Copiloto IA', icon: Bot, accent: 'text-indigo-400' };

function NavLink({ item, pathname, onClick }: {
  item: { href: string; label: string; icon: any; accent: string };
  pathname: string;
  onClick?: () => void;
}) {
  const isActive = pathname === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
      )}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : item.accent)} />
      <span className="truncate">{item.label}</span>
      {isActive && <ChevronRight className="ml-auto w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
    </Link>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-neutral-950">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-900/50">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-white">OrthoAdmin</p>
          <p className="mt-0.5 text-[11px] text-neutral-500">Painel da Clínica</p>
        </div>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Principal</p>
        <div className="space-y-0.5">
          {navItems.map(item => (
            <NavLink key={item.href} item={item} pathname={pathname} onClick={onNavigate} />
          ))}
        </div>

        <p className="mt-5 mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Inteligência</p>
        <NavLink item={aiItem} pathname={pathname} onClick={onNavigate} />
      </nav>

      <Separator className="bg-white/[0.06]" />

      {/* Bottom link */}
      <div className="p-3">
        <Link href="/" onClick={onNavigate}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-neutral-400 hover:bg-white/5 hover:text-white border border-white/[0.07] hover:border-white/10"
          >
            <MessageSquare className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <span className="text-sm">Chat do Paciente</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-neutral-100 overflow-hidden">
      <Toaster position="top-right" richColors />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-shrink-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Content column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <header className="flex md:hidden items-center justify-between bg-neutral-950 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">OrthoAdmin</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-white/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 border-0 bg-neutral-950">
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          {children}
        </main>
      </div>
    </div>
  );
}
