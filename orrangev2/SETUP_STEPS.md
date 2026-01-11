# BlockRamp Setup Steps

## Current Status
✅ Authorization keys configured in `.env.local`  
✅ Code updated to use server-side signing with Privy Pattern B  
✅ Database migration SQL ready  
⏳ Need to run migration and test flow

---

## Setup Instructions

### 1. Run Database Migration
```sql
-- Go to Supabase Dashboard > SQL Editor
-- Run BOTH migrations in order:

-- Migration 1: Add privy_wallet_id column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privy_wallet_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_privy_wallet_id ON public.users(privy_wallet_id);

COMMENT ON COLUMN public.users.privy_wallet_id IS 'Privy internal wallet ID (e.g., clj1234...) used for server-side signing';

-- Migration 2: Add server signing tracking flag
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS server_signing_enabled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_merchants_server_signing 
  ON public.merchants(user_id, server_signing_enabled);

COMMENT ON COLUMN public.merchants.server_signing_enabled IS 
  'Whether server has been added as authorized signer for this merchant wallet (for automatic USDC transfers)';
```

### 2. Restart Dev Server
```powershell
# Stop current server (Ctrl+C)
cd d:\orrange-v2\orrangev2
npm run dev
```

### 3. Sync Merchant Wallet ID
1. Login as merchant: `vikramjeet7089@gmail.com`
2. The app will auto-sync and store `privy_wallet_id` in database
3. Verify in Supabase: Check `users` table for merchant record

### 4. Enable Server Signing on Merchant Wallet

**✨ AUTOMATIC - No manual steps needed!**

Server signing is automatically enabled when the merchant accepts their first order. This works for both existing and new merchants.

**What happens:**
- Merchant accepts first order → System auto-configures server signing (takes 2 seconds)
- All future orders → Instant (no setup delay)

**For vikramjeet7089@gmail.com:** Will auto-setup on first order accept  
**For new merchants:** Will auto-setup on their first order accept

*See `AUTO_SETUP_IMPLEMENTATION.md` for technical details.*

---

**Manual Setup (Optional, for testing):**
If you want to test the setup endpoint directly:

```javascript
// In browser console while logged in as merchant:
fetch('/api/merchants/setup-signer', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### 5. Fund Merchant Wallet with Sepolia USDC
1. Get merchant wallet address from Privy dashboard or database
2. Visit [Sepolia USDC Faucet](https://faucet.circle.com/) (if available)
3. Or bridge from another wallet to merchant address
4. USDC Contract: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
5. Verify balance on [Sepolia Etherscan](https://sepolia.etherscan.io/)

### 6. Test Complete Flow

#### As User (xenon.ghoul070@gmail.com):
1. Navigate to dashboard
2. Create new order for USDC amount (e.g., 10 USDC)
3. Wait for merchant to accept

#### As Merchant (vikramjeet7089@gmail.com):
1. View pending orders in merchant dashboard
2. Accept the order

#### As User Again:
1. See order status change to "Awaiting Payment"
2. Click "I've Paid" button
3. Enter UPI reference (e.g., `UPI123456`)

#### As Merchant Again:
1. Verify UPI payment in your app/bank
2. Click "Confirm Payment" button
3. **Server automatically transfers USDC from merchant wallet to user wallet**

#### Verify:
1. Check order page for "Completed" status
2. See transaction hash displayed
3. Verify on Sepolia Etherscan: `https://sepolia.etherscan.io/tx/{hash}`
4. Check user's wallet balance increased

---

## Troubleshooting

### Error: "Server authorization keys not configured"
- Check `.env.local` has `PRIVY_AUTHORIZATION_KEY_ID` and `PRIVY_AUTHORIZATION_PRIVATE_KEY`
- Restart dev server after adding env vars

### Error: "Wallet ID not found for user"
- User needs to logout and login again to trigger wallet ID sync
- Check `users` table in Supabase has `privy_wallet_id` populated

### Error: "Insufficient USDC balance"
- Fund merchant wallet with more Sepolia USDC
- Check balance: `https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238?a={merchant_address}`

### Transaction Fails
- Check Privy logs in dashboard
- Verify authorization key is added to merchant wallet
- Ensure wallet has ETH for gas fees (get from [Sepolia Faucet](https://sepoliafaucet.com/))

---

## Environment Variables Reference
```bash
# .env.local
NEXT_PUBLIC_PRIVY_APP_ID="your-app-id"
PRIVY_APP_SECRET="your-secret"
PRIVY_AUTHORIZATION_KEY_ID="cbqmrr6r5iit4i0nfpou61v8"
PRIVY_AUTHORIZATION_PRIVATE_KEY="wallet-auth:MIG..."

NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-key"
```

---

## Key Files Updated
- `lib/usdc-transfer.ts` - Now uses authorization context
- `app/api/merchants/setup-signer/route.ts` - Adds server as signer
- `app/api/orders/[id]/transfer-usdc/route.ts` - Uses wallet ID
- `components/user-sync.tsx` - Syncs wallet ID
- `scripts/004_add_privy_wallet_id.sql` - Database migration

---

## Next Steps After Testing
1. Add error handling for failed transfers
2. Implement retry logic for transaction failures
3. Add webhook for real-time payment notifications
4. Move to mainnet with production USDC
5. Add transaction history page
6. Implement refund mechanism for failed orders
