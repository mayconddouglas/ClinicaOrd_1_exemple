-- 1. Add email column to pacientes table
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create table for Workspace Integrations (Gmail / Calendar)
CREATE TABLE IF NOT EXISTS public.workspace_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_gmail_active BOOLEAN DEFAULT false,
    gmail_email TEXT,
    gmail_app_password TEXT,
    is_calendar_active BOOLEAN DEFAULT false,
    calendar_id TEXT,
    calendar_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Allow public read access for the edge functions
ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read workspace integrations" 
    ON public.workspace_integrations FOR SELECT 
    USING (true);

CREATE POLICY "Allow authenticated users to update workspace integrations" 
    ON public.workspace_integrations FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert workspace integrations" 
    ON public.workspace_integrations FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Insert default row if table is empty
INSERT INTO public.workspace_integrations (id)
SELECT '00000000-0000-0000-0000-000000000002'
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_integrations);