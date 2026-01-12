-- Add a per-order UPI field so merchants can use default or custom UPI when accepting
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_upi_id text;

-- Optional: index if queried often
CREATE INDEX IF NOT EXISTS idx_orders_custom_upi_id ON public.orders(custom_upi_id);
