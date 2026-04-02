-- ==========================================
-- SPRINT 3: VINCULAR SERVIÇOS A ESPECIALIDADES
-- ==========================================

-- 1. Adicionar coluna 'especialidade_obrigatoria' na tabela services
-- Se for NULL, qualquer médico pode realizar o serviço. Se tiver um valor, apenas médicos com aquela especialidade podem.
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS especialidade_obrigatoria text;
