-- Migration to drop the theme_color column as personalization was removed
ALTER TABLE public.clinic_settings DROP COLUMN IF EXISTS theme_color;