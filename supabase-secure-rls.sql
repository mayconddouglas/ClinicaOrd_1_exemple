-- ==========================================
-- 1. LIMPEZA DE TABELAS DUPLICADAS/NÃO USADAS
-- ==========================================
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.medical_records CASCADE;
DROP TABLE IF EXISTS public.surgeries CASCADE;
DROP TABLE IF EXISTS public.knowledge_base CASCADE;
DROP TABLE IF EXISTS public.triagens CASCADE;
DROP TABLE IF EXISTS public.prontuarios CASCADE;

-- ==========================================
-- 2. ATIVAÇÃO DE SEGURANÇA (RLS)
-- ==========================================
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. POLÍTICAS DE ACESSO 100% SEGURAS (LGPD)
-- ==========================================

-- Remove políticas antigas (se existirem)
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.pacientes;
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.medicos;
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.triages;
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.patient_exams;
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.learned_faqs;
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.pending_questions;
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.business_hours;
DROP POLICY IF EXISTS "Permitir acesso total temporário para o Dashboard" ON public.schedule_blocks;

-- Cria políticas restritas APENAS para usuários autenticados (Dashboard Logado)
-- O backend (IA) usa a service_role, que ignora essas regras automaticamente.

CREATE POLICY "Acesso restrito a usuários autenticados" ON public.pacientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.agendamentos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.medicos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.triages FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.patient_exams FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.learned_faqs FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.pending_questions FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.business_hours FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso restrito a usuários autenticados" ON public.schedule_blocks FOR ALL TO authenticated USING (true);
