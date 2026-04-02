-- ==========================================
-- SPRINT 4: VINCULAR SERVIÇOS A MÉDICOS ESPECÍFICOS
-- ==========================================

-- 1. Adicionar coluna 'medico_id' na tabela services, referenciando a tabela medicos
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS medico_id uuid REFERENCES public.medicos(id) ON DELETE SET NULL;

-- 2. (Opcional) Podemos limpar a coluna de especialidade caso não seja mais usada, mas vamos manter por retrocompatibilidade ou simplesmente ignorar.
