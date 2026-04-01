-- Create table for clinic settings
CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name TEXT NOT NULL DEFAULT 'OrthoClinic SP',
    cnpj TEXT,
    responsavel TEXT,
    cep TEXT,
    rua TEXT,
    numero TEXT,
    bairro TEXT,
    cidade TEXT,
    theme_color TEXT DEFAULT '#2563eb',
    welcome_message TEXT DEFAULT 'Olá! Seja bem-vindo à OrthoClinic. Como podemos ajudar hoje?',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Allow public read access (for the client chat)
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to read settings" 
    ON public.clinic_settings FOR SELECT 
    USING (true);

CREATE POLICY "Allow authenticated users to update settings" 
    ON public.clinic_settings FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert settings" 
    ON public.clinic_settings FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Insert default row if table is empty
INSERT INTO public.clinic_settings (id, clinic_name)
SELECT '00000000-0000-0000-0000-000000000001', 'OrthoClinic SP'
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_settings);