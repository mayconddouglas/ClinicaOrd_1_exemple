-- Fix the foreign key constraint that was previously pointing to 'patients' instead of 'pacientes'

-- 1. First, we need to drop the wrong constraint if it was created
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_patient_id_fkey;

-- 2. Ensure the patient_id column exists
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS patient_id UUID;

-- 3. Add the correct foreign key constraint pointing to the 'pacientes' table
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;
