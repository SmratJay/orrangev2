-- Enable Server Signing for Merchant (Development/Testing)
-- Run this in Supabase SQL Editor

-- Enable server signing for merchant by user_id
UPDATE public.merchants 
SET server_signing_enabled = true 
WHERE user_id = (
  SELECT id FROM public.users 
  WHERE privy_user_id = 'did:privy:cmk86rinc00t4kz0cp00f041i'
);

-- Verify
SELECT 
  u.id,
  u.privy_user_id, 
  u.email,
  u.user_type,
  u.privy_wallet_id,
  m.id as merchant_id,
  m.upi_id,
  m.server_signing_enabled
FROM public.users u
JOIN public.merchants m ON m.user_id = u.id
WHERE u.privy_user_id = 'did:privy:cmk86rinc00t4kz0cp00f041i';
