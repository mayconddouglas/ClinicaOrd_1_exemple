-- Add SMTP configuration fields to clinic_settings table
ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS smtp_user TEXT,
ADD COLUMN IF NOT EXISTS smtp_pass TEXT;
