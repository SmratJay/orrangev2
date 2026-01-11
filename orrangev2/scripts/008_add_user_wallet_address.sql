-- Rename escrow_wallet_address to user_wallet_address
-- We don't need escrow anymore since merchants hold USDC directly

ALTER TABLE public.orders 
RENAME COLUMN escrow_wallet_address TO user_wallet_address;

-- Update the index name too
DROP INDEX IF EXISTS idx_orders_escrow_wallet;
CREATE INDEX IF NOT EXISTS idx_orders_user_wallet ON public.orders(user_wallet_address);

-- Verify the column was renamed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;
