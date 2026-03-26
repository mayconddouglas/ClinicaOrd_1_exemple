'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Activity, Calendar, AlertCircle, BookOpen, Bot, LayoutDashboard, MessageSquare, Menu, X, Users, Stethoscope } from 'lucide-react';
import { Toaster } from 'sonner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Toaster position="top-right" richColors />
      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20">
        <Link href="/dashboard" className="flex items-center gap-2 text-blue-600 font-bold text-lg">
          <Activity className="w-5 h-5" />
          OrthoAdmin
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-200 hidden md:block">
          <Link href="/dashboard" className="flex items-center gap-2 text-blue-600 font-bold text-xl">
            <Activity className="w-6 h-6" />
            OrthoAdmin
          </Link>
          <p className="text-xs text-slate-500 mt-1">Painel da Clínica</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard" onClick={closeMobileMenu} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${pathname === '/dashboard' ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50 hover:text-blue-600 text-slate-700'}`}>
            <LayoutDashboard className="w-5 h-5" /> Visão Geral
          </Link>
          <Link href="/dashboard/schedule" onClick={closeMobileMenu} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${pathname === '/dashboard/schedule' ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50 hover:text-blue-600 text-slate-700'}`}>
            <Calendar className="w-5 h-5" /> Horários
          </Link>
          <Link href="/dashboard/patients" onClick={closeMobileMenu} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${pathname === '/dashboard/patients' ? 'bg-purple-50 text-purple-600' : 'hover:bg-purple-50 hover:text-purple-600 text-slate-700'}`}>
            <Users className="w-5 h-5" /> Pacientes
          </Link>
          <Link href="/dashboard/triages" onClick={closeMobileMenu} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${pathname === '/dashboard/triages' ? 'bg-red-50 text-red-600' : 'hover:bg-red-50 hover:text-red-600 text-slate-700'}`}>
            <AlertCircle className="w-5 h-5" /> Triagens (Alertas)
          </Link>
          <Link href="/dashboard/faqs" onClick={closeMobileMenu} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${pathname === '/dashboard/faqs' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-emerald-50 hover:text-emerald-600 text-slate-700'}`}>
            <BookOpen className="w-5 h-5" /> Base de Conhecimento
          </Link>
          <Link href="/dashboard/medicos" onClick={closeMobileMenu} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${pathname === '/dashboard/medicos' ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50 hover:text-blue-600 text-slate-700'}`}>
            <Stethoscope className="w-5 h-5" /> Médicos
          </Link>
          <Link href="/dashboard/copilot" onClick={closeMobileMenu} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${pathname === '/dashboard/copilot' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-indigo-50 hover:text-indigo-600 text-slate-700'}`}>
            <Bot className="w-5 h-5" /> Copiloto (IA)
          </Link>
        </nav>
        
        <div className="p-4 border-t border-slate-200">
          <Link href="/" className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-medium transition-colors text-sm">
            <MessageSquare className="w-4 h-4" /> Ver Chat do Paciente
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full flex flex-col pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
