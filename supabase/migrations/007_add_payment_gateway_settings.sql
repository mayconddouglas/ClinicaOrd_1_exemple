-- Add payment gateway configuration fields to clinic_settings table
ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS active_payment_gateway TEXT DEFAULT 'none', -- 'none', 'mercadopago', 'asaas'
ADD COLUMN IF NOT EXISTS mp_access_token TEXT,
ADD COLUMN IF NOT EXISTS asaas_api_key TEXT;
