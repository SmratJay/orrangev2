-- Migration: Add privy_wallet_id to users table
-- This stores Privy's internal wallet ID (different from wallet address)
-- Required for server-side transaction signing

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privy_wallet_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_wallet_id ON public.users(privy_wallet_id);

COMMENT ON COLUMN public.users.privy_wallet_id IS 'Privy internal wallet ID (e.g., clj1234...) used for server-side signing';
