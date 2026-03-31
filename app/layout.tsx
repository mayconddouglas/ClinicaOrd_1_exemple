import type {Metadata} from 'next';
import './globals.css';
import { Geist, Geist_Mono, Noto_Serif, Space_Grotesk, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";

const spaceGroteskHeading = Space_Grotesk({subsets:['latin'],variable:'--font-heading'});

const notoSerif = Noto_Serif({subsets:['latin'],variable:'--font-serif'});

const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'OrthoAI — Clínica Ortopédica',
  description: 'Sistema inteligente de gestão para clínicas ortopédicas',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn( geistMono.variable, notoSerif.variable, spaceGroteskHeading.variable, "font-sans", inter.variable)}>
      <body suppressHydrationWarning className="bg-background text-foreground min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
