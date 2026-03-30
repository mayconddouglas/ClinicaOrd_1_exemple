import type {Metadata} from 'next';
import './globals.css';
import { Geist, Geist_Mono, Noto_Serif, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const spaceGroteskHeading = Space_Grotesk({subsets:['latin'],variable:'--font-heading'});

const notoSerif = Noto_Serif({subsets:['latin'],variable:'--font-serif'});

const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'OrthoAI — Clínica Ortopédica',
  description: 'Sistema inteligente de gestão para clínicas ortopédicas',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={cn("dark", geist.variable, geistMono.variable, "font-serif", notoSerif.variable, spaceGroteskHeading.variable)}>
      <body suppressHydrationWarning>
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
