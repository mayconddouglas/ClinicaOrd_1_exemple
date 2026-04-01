-- Adiciona as novas colunas de contato e informações na tabela clinic_settings
ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS clinic_email TEXT,
ADD COLUMN IF NOT EXISTS clinic_phone TEXT,
ADD COLUMN IF NOT EXISTS clinic_hours TEXT;
