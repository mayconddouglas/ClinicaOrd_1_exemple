-- Disable RLS on the invoices table to allow API routes and webhooks to interact
-- with the database without passing authenticated session tokens.
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
