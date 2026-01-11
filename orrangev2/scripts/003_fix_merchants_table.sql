-- Fix merchants table to ensure all columns exist
-- Run this if you're having issues with the merchants table

-- Add missing columns to merchants table if they don't exist
ALTER TABLE public.merchants 
  ADD COLUMN IF NOT EXISTS merchant_name TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS daily_limit_usd DECIMAL(15, 2) DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS monthly_volume_usd DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inr_bank_account TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Also ensure merchants table has the NOT NULL constraint removed if it's blocking inserts
-- (We'll handle merchant_name separately if needed)
