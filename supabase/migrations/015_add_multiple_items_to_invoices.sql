-- Add items JSONB column to support multiple services/products per invoice
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0.00;

-- Optional: we keep service_id for backwards compatibility or single-item invoices,
-- but 'items' will be the new standard for multiple products.
