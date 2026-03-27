import type {Metadata} from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'OrthoAI — Clínica Ortopédica',
  description: 'Sistema inteligente de gestão para clínicas ortopédicas',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body suppressHydrationWarning>
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
