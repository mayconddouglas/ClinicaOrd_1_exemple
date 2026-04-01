import { LoginForm } from "@/components/login-form"
import { Activity, Shield, Stethoscope, Clock } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full overflow-hidden bg-background">
      {/* Left Column - Branding & Info (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-muted/30 border-r border-border/50 relative flex-col justify-between p-12 overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">OrthoAI</span>
        </div>

        {/* Value Proposition */}
        <div className="space-y-8 relative z-10 max-w-lg">
          <h2 className="text-4xl font-black tracking-tight text-foreground leading-[1.1]">
            Inteligência Artificial aplicada à <span className="text-primary">gestão ortopédica.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Nossa plataforma unifica triagem inteligente, agendamento otimizado e gestão de corpo clínico em uma única experiência fluida.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 bg-background/50 p-4 rounded-xl border border-border/50 shadow-sm backdrop-blur-sm">
              <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-foreground">Dados Seguros</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Criptografia ponta a ponta e conformidade total com a LGPD.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-background/50 p-4 rounded-xl border border-border/50 shadow-sm backdrop-blur-sm">
              <Stethoscope className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-foreground">Triagem Inteligente</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Classificação de risco automatizada baseada em sintomas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-sm font-medium text-muted-foreground">
          © {new Date().getFullYear()} OrthoAI. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 relative">
        {/* Mobile only decorative background */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-primary/10 blur-3xl" />
        </div>
        
        <div className="w-full max-w-[400px] z-10">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
