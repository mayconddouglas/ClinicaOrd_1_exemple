'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Mail, AlertCircle, Activity, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full"
      >
        <div className="space-y-4 text-center pb-8 pt-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 relative border border-primary/20">
                <Activity className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            OrthoAI
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
            Acesso exclusivo para a equipe médica e administrativa.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-3.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground text-xs font-bold uppercase tracking-wider">E-mail Corporativo</Label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="email"
                type="email"
                placeholder="medico@orthoai.com.br"
                className="pl-10 h-12 bg-background border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl shadow-sm text-[15px]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground text-xs font-bold uppercase tracking-wider">Senha</Label>
              <a href="#" className="text-xs font-semibold text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors">
                Esqueceu a senha?
              </a>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10 h-12 bg-background border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl shadow-sm text-[15px] tracking-wide"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-md"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-[15px] font-semibold rounded-xl shadow-md shadow-primary/20 transition-all mt-4 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Autenticando...
              </>
            ) : (
              'Entrar no Dashboard'
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/40 text-center space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/30 py-2 px-3 rounded-lg w-max mx-auto border border-border/50">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Protegido com criptografia ponta a ponta
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            Problemas para acessar? <a href="#" className="text-primary hover:underline underline-offset-4">Contate o suporte</a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
