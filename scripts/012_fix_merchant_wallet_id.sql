-- Fix missing privy_wallet_id for merchant
-- This query needs to be updated with the actual wallet ID from Privy

-- STEP 1: First, you need to get the merchant's Privy wallet ID
-- Go to Privy Dashboard → Users → Find vikramjeet7089@paytm
-- Look for the embedded wallet with address 0x060Fd292bac45c46e4cCB14B3E140e326235d2Af
-- Copy the wallet ID (looks like: clxxxxxxxxxxxxxx)

-- STEP 2: Then run this query with the actual wallet ID:
-- Replace 'WALLET_ID_FROM_PRIVY' with the actual wallet ID

UPDATE users
SET privy_wallet_id = 'WALLET_ID_FROM_PRIVY'
WHERE embedded_wallet_address = '0x060Fd292bac45c46e4cCB14B3E140e326235d2Af';

-- Verify the update:
SELECT 
  id,
  email,
  embedded_wallet_address,
  privy_wallet_id,
  user_type
FROM users
WHERE embedded_wallet_address = '0x060Fd292bac45c46e4cCB14B3E140e326235d2Af';


-- Alternative: If you have the Privy User ID (did:privy:cmk86rinc00t4kz0cp00f041i)
-- You can also use the admin endpoint to fetch it automatically:
-- POST https://orrangev2.vercel.app/api/admin/fix-wallet-ids
