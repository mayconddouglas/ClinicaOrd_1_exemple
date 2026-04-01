-- 2. Update the invoices table to link with patients and services
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- Also add patient's email to invoices for sending receipts automatically
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS customer_email TEXT;
