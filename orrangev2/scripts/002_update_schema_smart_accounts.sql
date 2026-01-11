-- Update schema for smart accounts and complete order flow
-- Run this after 001_create_schema.sql

-- Drop old transactions table and create proper orders table
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Orders table for on-ramp and off-ramp requests
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  
  -- Order details
  type TEXT NOT NULL CHECK (type IN ('onramp', 'offramp')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'payment_received', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Amounts
  fiat_amount DECIMAL(15, 2) NOT NULL,
  usdc_amount DECIMAL(15, 6) NOT NULL,
  exchange_rate DECIMAL(15, 8),
  
  -- Payment details
  payment_method TEXT DEFAULT 'upi',
  payment_reference TEXT, -- UPI transaction ID or reference
  
  -- Smart wallet addresses
  user_wallet_address TEXT, -- User's smart account address
  merchant_wallet_address TEXT, -- Merchant's wallet address
  
  -- Blockchain transaction
  tx_hash TEXT, -- USDC transfer transaction hash
  tx_confirmed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_received_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Notes
  notes TEXT
);

-- Update users table to track wallet addresses and user type
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS privy_user_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS smart_wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS embedded_wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'merchant', 'admin')),
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON public.users(privy_user_id);

-- RLS Policies for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Merchants can view orders assigned to them
CREATE POLICY "merchants_select_assigned_orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants 
      WHERE merchants.user_id = auth.uid() 
      AND merchants.id = orders.merchant_id
    )
  );

-- Merchants can update orders assigned to them
CREATE POLICY "merchants_update_assigned_orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants 
      WHERE merchants.user_id = auth.uid() 
      AND merchants.id = orders.merchant_id
    )
  );

-- Admins can view and update all orders
CREATE POLICY "admin_select_all_orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "admin_update_all_orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
