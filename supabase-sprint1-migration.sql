-- ==========================================
-- SPRINT 1: MIGRATION SCRIPT
-- ==========================================

-- 1. Criação da tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.system_settings FOR ALL TO authenticated USING (true);

-- 2. Criação da tabela de Sessões de Chat
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform text NOT NULL, -- 'whatsapp' ou 'telegram'
    external_id text NOT NULL, -- Número de telefone ou Chat ID
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(platform, external_id)
);
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.chat_sessions FOR ALL TO authenticated USING (true);

-- 3. Criação da tabela de Mensagens de Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role text NOT NULL, -- 'user' ou 'model'
    content jsonb NOT NULL, -- Array de parts (ex: [{"text": "Olá"}])
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.chat_messages FOR ALL TO authenticated USING (true);

-- ==========================================
-- MIGRAÇÃO DE DADOS (OPCIONAL/SAFE)
-- ==========================================
-- Move as configurações do sistema existentes em learned_faqs para system_settings
INSERT INTO public.system_settings (key, value)
SELECT question, answer FROM public.learned_faqs WHERE category = '__SYSTEM_SETTING__'
ON CONFLICT (key) DO NOTHING;

-- Opcional: Remover as configurações e históricos antigos da tabela learned_faqs
-- DELETE FROM public.learned_faqs WHERE category IN ('__SYSTEM_SETTING__', '__TELEGRAM_HISTORY__', '__WHATSAPP_HISTORY__');
