-- Normalize legacy order statuses to match current flow
-- Run this before enforcing the latest status constraint

UPDATE public.orders
SET status = 'accepted'
WHERE status = 'merchant_accepted';

UPDATE public.orders
SET status = 'payment_confirmed'
WHERE status = 'payment_received';

UPDATE public.orders
SET status = 'usdc_transferred'
WHERE status = 'processing';

UPDATE public.orders
SET status = 'cancelled'
WHERE status = 'failed';

SELECT status, COUNT(*)
FROM public.orders
GROUP BY status
ORDER BY status;
