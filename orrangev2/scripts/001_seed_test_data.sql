-- SEED TEST DATA: Create test merchant and sample orders
-- Run this AFTER 000_complete_bootstrap.sql

-- ============================================
-- 1. CREATE TEST MERCHANT
-- ============================================

-- Insert test merchant user (if not exists)
INSERT INTO public.users (id, privy_user_id, email, full_name, user_type, kyc_status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test-privy-user-id',
  'testmerchant@orrange.app',
  'Test Merchant',
  'merchant',
  'approved'
)
ON CONFLICT (privy_user_id) DO NOTHING;

-- Get the user ID
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE email = 'testmerchant@orrange.app';
  
  IF v_user_id IS NOT NULL THEN
    -- Insert merchant record
    INSERT INTO public.merchants (
      id,
      user_id, 
      upi_id, 
      merchant_name, 
      business_type,
      approval_status,
      is_active,
      inventory_balance
    )
    VALUES (
      '660e8400-e29b-41d4-a716-446655440001',
      v_user_id,
      'testmerchant@upi',
      'Orrange Test Merchant',
      'Exchange',
      'approved',
      true,
      10000.00
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Test merchant created with ID: %', v_user_id;
  END IF;
END $$;

-- ============================================
-- 2. VERIFICATION
-- ============================================

-- View created test merchant
SELECT 
  u.id as user_id,
  u.email,
  u.user_type,
  m.id as merchant_id,
  m.upi_id,
  m.merchant_name,
  m.approval_status,
  m.inventory_balance
FROM public.users u
JOIN public.merchants m ON m.user_id = u.id
WHERE u.email = 'testmerchant@orrange.app';
