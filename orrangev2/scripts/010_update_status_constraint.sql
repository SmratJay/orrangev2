-- Update the orders status check constraint to allow all flow statuses
-- Run this in Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with all statuses
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending',
  'accepted',
  'payment_sent',
  'payment_confirmed',
  'usdc_transferred',
  'completed',
  'cancelled',
  'expired'
));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.orders'::regclass 
AND conname = 'orders_status_check';
