-- Add medico_id column to agendamentos to link with medicos table
ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL;
