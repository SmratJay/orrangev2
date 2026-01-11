-- Migration: Add server_signing_enabled flag to merchants table
-- This tracks whether server signing has been set up for each merchant
-- Used by lazy initialization to avoid repeated Privy API calls

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS server_signing_enabled BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchants_server_signing 
  ON public.merchants(user_id, server_signing_enabled);

COMMENT ON COLUMN public.merchants.server_signing_enabled IS 
  'Whether server has been added as authorized signer for this merchant wallet (for automatic USDC transfers)';
