-- Add 'accepted' status to orders for merchant acceptance flow
-- This allows distinguishing between: 
-- 'pending' = new order, not yet accepted by merchant
-- 'accepted' = merchant accepted, waiting for payment confirmation

-- Drop the old constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new constraint with 'accepted' status
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'accepted', 'payment_received', 'processing', 'completed', 'failed', 'cancelled'));

-- Create index for faster merchant order queries
CREATE INDEX IF NOT EXISTS idx_orders_status_merchant ON public.orders(status, merchant_id);
