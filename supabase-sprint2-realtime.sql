-- ==========================================
-- SPRINT 2: ENABLE REALTIME FOR AGENDAMENTOS
-- ==========================================

-- 1. Enable replication for the agendamentos table
-- This allows the Supabase Realtime server to broadcast changes (INSERT, UPDATE, DELETE)
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;

-- 2. Optional: If you want to broadcast the OLD record on UPDATE and DELETE
-- This is useful if the frontend needs to know what changed (e.g., "Consulta de João foi cancelada")
ALTER TABLE public.agendamentos REPLICA IDENTITY FULL;