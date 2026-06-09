-- Bootstrap schema for Privy-based auth (no Supabase Auth dependency)
-- Use this for a fresh database setup.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  privy_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT,
  user_type TEXT NOT NULL DEFAULT 'user' CHECK (user_type IN ('user', 'merchant', 'admin')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  smart_wallet_address TEXT,
  embedded_wallet_address TEXT,
  privy_wallet_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upi_id TEXT,
  inventory_balance DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  server_signing_enabled BOOLEAN DEFAULT false,
  merchant_name TEXT,
  business_type TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  daily_limit_usd DECIMAL(15, 2) DEFAULT 10000,
  monthly_volume_usd DECIMAL(15, 2) DEFAULT 0,
  inr_bank_account TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('onramp', 'offramp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'accepted',
    'payment_sent',
    'payment_confirmed',
    'usdc_transferred',
    'completed',
    'cancelled',
    'expired'
  )),
  fiat_amount DECIMAL(15, 2) NOT NULL,
  usdc_amount DECIMAL(15, 6) NOT NULL,
  exchange_rate DECIMAL(15, 8),
  payment_method TEXT DEFAULT 'upi',
  payment_reference TEXT,
  user_wallet_address TEXT,
  custom_upi_id TEXT,
  tx_hash TEXT,
  merchant_accepted_at TIMESTAMP WITH TIME ZONE,
  payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  usdc_sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON public.users(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_users_privy_wallet_id ON public.users(privy_wallet_id);

CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON public.merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_server_signing ON public.merchants(user_id, server_signing_enabled);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_custom_upi_id ON public.orders(custom_upi_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_merchants_updated_at ON public.merchants;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
