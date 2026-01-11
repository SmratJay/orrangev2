-- ============================================
-- CREATE TEST MERCHANT ACCOUNT
-- ============================================
-- Run this in Supabase SQL Editor AFTER you've signed up in your app
-- Replace 'your-email@example.com' with the email you used to sign up

-- Step 1: Update user type to 'merchant'
UPDATE public.users 
SET user_type = 'merchant' 
WHERE email = 'your-email@example.com';  -- ← REPLACE THIS WITH YOUR EMAIL

-- Step 2: Create merchant entry with inventory
INSERT INTO public.merchants (user_id, upi_id, inventory_balance, is_active)
SELECT 
  id, 
  'merchant@paytm',  -- ← REPLACE with your actual UPI ID (e.g., yourname@paytm)
  10000.00,          -- Starting inventory: 10,000 USDC
  true               -- Merchant is active
FROM public.users 
WHERE email = 'your-email@example.com'  -- ← REPLACE THIS WITH YOUR EMAIL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify the merchant was created successfully
SELECT 
  m.id as merchant_id,
  m.upi_id,
  m.inventory_balance,
  m.is_active,
  u.email,
  u.user_type,
  u.smart_wallet_address
FROM public.merchants m
JOIN public.users u ON m.user_id = u.id
WHERE u.email = 'your-email@example.com';  -- ← REPLACE THIS WITH YOUR EMAIL
