# Complete On-Ramp Flow Implementation Plan

## ✅ What's Been Completed

### Code Changes:
1. ✅ **Database Migration**: `scripts/004_add_privy_wallet_id.sql`
   - Adds `privy_wallet_id` column to `users` table
   - Adds index for performance

2. ✅ **Auth Setup API**: Updated `/api/auth/setup/route.ts`
   - Now accepts and stores `privy_wallet_id`

3. ✅ **UserSync Component**: Updated `components/user-sync.tsx`
   - Extracts `wallet.id` from Privy
   - Sends to backend during sync

4. ✅ **USDC Transfer Function**: Updated `lib/usdc-transfer.ts`
   - Changed signature to use `walletId` instead of `address`
   - Uses correct Privy SDK pattern: `privy.wallets().ethereum().sendTransaction()`

5. ✅ **Transfer Endpoint**: Updated `/api/orders/[id]/transfer-usdc/route.ts`
   - Fetches `privy_wallet_id` from database
   - Passes wallet ID to transfer function

6. ✅ **Merchant Signer Setup**: Created `/api/merchants/setup-signer/route.ts`
   - Endpoint for adding server as authorized signer (needs Privy API details)

---

## 🔧 Setup Steps (You Must Do These)

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
d:\orrange-v2\orrangev2\scripts\004_add_privy_wallet_id.sql
```

### Step 2: Generate Server Auth Key
```bash
# In your project root:
cd d:\orrange-v2\orrangev2

# Generate private key
openssl ecparam -name prime256v1 -genkey -noout -out privy-server-key.pem

# Generate public key
openssl ec -in privy-server-key.pem -pubout -out privy-server-key.pub

# View public key (copy this)
cat privy-server-key.pub
```

### Step 3: Register Key in Privy Dashboard
1. Go to https://dashboard.privy.io
2. Select your app
3. Navigate to: **Settings → Authorization Keys** (or similar)
4. Click **"Create Authorization Key"** or **"Create Key Quorum"**
5. Paste contents of `privy-server-key.pub`
6. Set **Threshold: 1**
7. Save
8. **Copy the SIGNER_QUORUM_ID** (e.g., `signer-quorum-xxx`)

### Step 4: Update .env.local
Add these lines:
```env
# Server signing for USDC transfers
PRIVY_SIGNER_QUORUM_ID=signer-quorum-xxx  # From Privy Dashboard
```

### Step 5: Update .gitignore
Add:
```
# Privy server keys
privy-server-key.pem
*.pem
```

### Step 6: Add Server as Signer to Merchant Wallet

**Option A - Client-Side (Recommended for Testing)**

Add button to merchant dashboard:
```typescript
// In merchant dashboard
import { useWallets } from '@privy-io/react-auth';

const { wallets } = useWallets();
const merchantWallet = wallets.find(w => w.walletClientType === 'privy');

const setupSigner = async () => {
  // Call API to add signer
  await fetch('/api/merchants/setup-signer', {
    method: 'POST',
  });
  
  alert('Signer setup complete! You can now receive USDC payments.');
};

// Show button
<Button onClick={setupSigner}>Enable Server Signing</Button>
```

**Option B - Privy Dashboard (Manual)**
1. Go to Privy Dashboard → Wallets
2. Find merchant's wallet
3. Add your `SIGNER_QUORUM_ID` as authorized signer

---

## 🧪 Testing Flow

### Pre-Test Setup:
1. ✅ Run database migration
2. ✅ Server auth key registered in Privy
3. ✅ `.env.local` has `PRIVY_SIGNER_QUORUM_ID`
4. ✅ Merchant wallet has server as signer
5. ✅ Merchant wallet has test USDC on Sepolia

### Test Steps:

**1. Refresh User Data (Both Accounts)**
- Merchant: Login → Refresh page (wallet ID syncs)
- User: Login → Create wallet → Refresh (wallet ID syncs)

**2. Verify Database**
```sql
-- In Supabase SQL Editor
SELECT 
  email,
  user_type,
  embedded_wallet_address,
  privy_wallet_id
FROM users
WHERE user_type = 'merchant';
```
Should see `privy_wallet_id` populated (looks like: `clxxxxx-xxx-xxx`)

**3. Fund Merchant Wallet**
- Get merchant's `embedded_wallet_address` from database
- Send Sepolia USDC to that address
- Verify balance: Check on Sepolia Etherscan

**4. Test Order Flow**
```
User Dashboard:
→ Enter ₹900
→ Click "Proceed to Payment"
→ Should redirect to /order/[id]
→ Status: "Waiting for merchant"

Merchant Dashboard:
→ See pending order
→ Click "Accept Order"
→ Status: "Merchant accepted - please pay"

User Order Page:
→ See merchant UPI: vikramjeet7089@paytm
→ Enter payment reference: "TEST12345"
→ Click "Submit Payment"
→ Status: "Payment submitted"

Merchant Order Page:
→ See payment ref: "TEST12345"
→ Click "Confirm Payment Received"
→ Status: "Processing USDC transfer"

🔥 AUTOMATIC TRANSFER HAPPENS
→ Server signs transaction from merchant wallet
→ USDC sent to user wallet
→ Status: "Order completed ✅"
→ Transaction link shown
```

**5. Verify on Blockchain**
- Click Etherscan link
- Verify USDC transfer from merchant → user
- Check user wallet balance increased

---

## 🚨 Troubleshooting

### Error: "Merchant wallet not configured for server signing"
- **Cause**: `privy_wallet_id` not in database
- **Fix**: Merchant must refresh page after wallet creation

### Error: "Unauthorized signer"
- **Cause**: Server not added as signer to wallet
- **Fix**: Run `/api/merchants/setup-signer` OR add manually in Privy Dashboard

### Error: "Insufficient merchant USDC balance"
- **Cause**: Merchant wallet empty
- **Fix**: Send test USDC from Sepolia faucet

### Error: "Wallet not found"
- **Cause**: Using `address` instead of `walletId`
- **Fix**: Already fixed in code - ensure DB migration ran

### Transaction Fails Silently
- **Check**: Privy Dashboard logs
- **Check**: Browser console for errors
- **Check**: Sepolia Etherscan for failed transactions

---

## 📋 Production Checklist

Before going live:
- [ ] Server auth key generated and registered
- [ ] All merchant wallets have server as authorized signer
- [ ] Merchant inventory tracking (USDC balance)
- [ ] Gas sponsorship configured (or merchants hold ETH)
- [ ] Transaction confirmation monitoring
- [ ] Error notification system
- [ ] Retry logic for failed transfers
- [ ] Mainnet USDC contract address updated
- [ ] Rate limiting on transfer endpoint
- [ ] Audit log for all transfers

---

## 🎯 Next Steps (In Order)

1. **Now**: Run database migration
2. **Now**: Generate & register server auth key
3. **Now**: Update `.env.local` and `.gitignore`
4. **Now**: Restart dev server
5. **Now**: Login as merchant → refresh → verify `privy_wallet_id` saved
6. **Now**: Call `/api/merchants/setup-signer` for merchant
7. **Now**: Fund merchant wallet with Sepolia USDC
8. **Then**: Test complete order flow
9. **If works**: Celebrate! 🎉
10. **If fails**: Check troubleshooting section above

---

## 📚 Documentation References

- **Privy Server Signing**: https://docs.privy.io/controls/authorization-keys/using-owners/sign/signing-on-the-server
- **Privy Wallets**: https://docs.privy.io/wallets/wallets/server-side-access
- **Sending USDC**: https://docs.privy.io/recipes/send-usdc
- **Sepolia USDC**: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

---

## 🔐 Security Notes

- ✅ `privy-server-key.pem` MUST be in `.gitignore`
- ✅ Server auth key has signing permissions (powerful!)
- ✅ Only merchant wallets should have server as signer
- ✅ User wallets should NOT have server signing
- ✅ In production, use KMS or secret manager for keys
- ✅ Monitor all server-signed transactions
- ✅ Implement spend limits per order
- ✅ Add fraud detection before confirming
