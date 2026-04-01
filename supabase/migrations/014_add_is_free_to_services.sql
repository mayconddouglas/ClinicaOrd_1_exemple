-- Add is_free column to services table to easily identify free procedures
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- Auto update existing services with 0 price to be free
UPDATE public.services
SET is_free = true
WHERE price = 0;
