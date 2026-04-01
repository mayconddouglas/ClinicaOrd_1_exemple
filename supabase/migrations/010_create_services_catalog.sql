-- 1. Create the services table (catalog of procedures)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    duration_minutes INTEGER DEFAULT 30,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default services to start with
INSERT INTO public.services (name, description, price, duration_minutes) VALUES
    ('Consulta Inicial / Avaliação', 'Primeira consulta para avaliação do paciente', 150.00, 45),
    ('Limpeza (Profilaxia)', 'Limpeza profunda e aplicação de flúor', 200.00, 40),
    ('Manutenção Aparelho', 'Ajuste mensal do aparelho ortodôntico', 120.00, 30),
    ('Clareamento a Laser', 'Sessão única de clareamento a laser', 800.00, 60);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage services
CREATE POLICY "Enable all access for authenticated users on services" ON public.services
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    
-- Allow anonymous users to read services (for the AI Agent)
CREATE POLICY "Enable read for anonymous users on services" ON public.services
    FOR SELECT USING (true);
