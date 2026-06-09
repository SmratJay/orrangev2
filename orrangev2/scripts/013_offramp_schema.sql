-- Off-Ramp Schema Migration
-- Adds fields needed for USDC → INR flow

-- Add off-ramp specific fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_upi_id TEXT,
ADD COLUMN IF NOT EXISTS merchant_payout_upi_id TEXT,
ADD COLUMN IF NOT EXISTS fiat_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fiat_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usdc_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usdc_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usdc_tx_hash TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_upi_id ON public.orders(user_upi_id);
CREATE INDEX IF NOT EXISTS idx_orders_usdc_tx_hash ON public.orders(usdc_tx_hash);
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON public.orders(type, status);

-- Add user_upi_id to user_profiles if not exists
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS inr_upi_address TEXT;

-- Create index on user_profiles UPI
CREATE INDEX IF NOT EXISTS idx_user_profiles_upi ON public.user_profiles(inr_upi_address) 
WHERE inr_upi_address IS NOT NULL;
