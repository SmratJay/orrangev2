-- Clear merchant_id from pending orders so they show up in "Orders to Fulfill"
-- This is needed because old orders were auto-assigned to merchants
-- Now merchants need to manually accept orders

UPDATE public.orders
SET merchant_id = NULL
WHERE status = 'pending';

-- Show the updated orders
SELECT id, user_id, merchant_id, status, fiat_amount, usdc_amount, created_at
FROM public.orders
WHERE status = 'pending'
ORDER BY created_at DESC;
