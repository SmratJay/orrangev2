-- Reset stuck orders back to payment_confirmed so transfer can retry
-- Run this in Supabase SQL Editor

-- Reset any orders stuck at usdc_transferred (failed mid-transfer) back to payment_confirmed
UPDATE public.orders
SET status = 'payment_confirmed'
WHERE status = 'usdc_transferred'
  AND tx_hash IS NULL
  AND completed_at IS NULL;

-- Verify
SELECT id, status, tx_hash, completed_at, created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 10;
