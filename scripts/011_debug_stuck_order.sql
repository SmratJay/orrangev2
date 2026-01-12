-- Diagnostic query for order 74b32817-cd1e-4558-b904-26d68ecc5b7a
-- Run this in Supabase SQL Editor to see the current state

-- Check order details
SELECT 
  id,
  status,
  fiat_amount,
  usdc_amount,
  payment_reference,
  tx_hash,
  created_at,
  merchant_accepted_at,
  payment_confirmed_at,
  usdc_sent_at,
  completed_at,
  merchant_id,
  user_id
FROM orders
WHERE id = '74b32817-cd1e-4558-b904-26d68ecc5b7a';

-- Check merchant wallet details
SELECT 
  u.id,
  u.email,
  u.embedded_wallet_address,
  u.privy_wallet_id,
  m.upi_id
FROM orders o
JOIN merchants m ON o.merchant_id = m.id
JOIN users u ON m.user_id = u.id
WHERE o.id = '74b32817-cd1e-4558-b904-26d68ecc5b7a';

-- Check user wallet details
SELECT 
  u.id,
  u.email,
  u.embedded_wallet_address
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.id = '74b32817-cd1e-4558-b904-26d68ecc5b7a';

-- Check if status constraint allows the current status
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'orders' 
  AND c.contype = 'c'
  AND conname LIKE '%status%';
