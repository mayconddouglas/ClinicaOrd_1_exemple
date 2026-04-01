-- Add appointment_id to invoices to link them
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL;

-- Optionally, add invoice_id to agendamentos as well for easy reverse lookup
ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
