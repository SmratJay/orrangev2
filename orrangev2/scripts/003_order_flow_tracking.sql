-- Migration: Add Order Flow Tracking Columns
-- Run this in Supabase SQL Editor

-- Add missing columns to orders table for complete order flow tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS merchant_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS usdc_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS escrow_wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status enum to include all states
-- Note: PostgreSQL doesn't allow easy enum modification, so we use CHECK constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'pending',           -- Order created, waiting for merchant
    'merchant_accepted', -- Merchant accepted the order
    'payment_sent',      -- User claims to have sent UPI payment
    'payment_confirmed', -- Merchant confirms INR received
    'usdc_transferred',  -- USDC sent to user wallet
    'completed',         -- Order fully completed
    'cancelled',         -- Order cancelled
    'failed'             -- Order failed
  ));

-- Create index for faster order lookups
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON public.orders 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

COMMENT ON COLUMN public.orders.payment_reference IS 'UPI transaction ID provided by user';
COMMENT ON COLUMN public.orders.merchant_accepted_at IS 'When merchant accepts the order';
COMMENT ON COLUMN public.orders.payment_confirmed_at IS 'When merchant confirms receiving INR';
COMMENT ON COLUMN public.orders.usdc_sent_at IS 'When USDC is transferred from escrow to user';
COMMENT ON COLUMN public.orders.escrow_wallet_address IS 'Escrow wallet holding USDC for this order';
