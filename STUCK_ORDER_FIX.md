# Order Stuck - Diagnosis & Fix

## Problem Analysis

Your order `74b32817-cd1e-4558-b904-26d68ecc5b7a` is stuck at "Processing USDC transfer" status, which means:

1. **Status is `payment_confirmed`** - Merchant confirmed receiving INR payment
2. **USDC transfer never completed** - The automatic transfer to user failed silently
3. **Both pages stuck polling** - User and merchant see "Transferring USDC" / "Processing USDC transfer"

## Root Causes (Likely)

Based on the code and logs, possible issues:

### 1. **Merchant Wallet Not Funded** ⚠️ MOST LIKELY
The merchant wallet might not have USDC balance on Sepolia testnet.

**Check**: Visit [Sepolia Etherscan](https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238?a=0x060Fd292bac45c46e4cCB14B3E140e326235d2Af) to see merchant USDC balance.

**Fix**: Get Sepolia ETH and USDC:
- Sepolia ETH faucet: https://sepoliafaucet.com/
- Sepolia USDC: https://faucet.circle.com/ (need to bridge)

### 2. **Privy Authorization Keys Not Set**
The server might not have proper environment variables to sign transactions.

**Check**: Ensure `.env.local` has:
```
PRIVY_AUTHORIZATION_KEY_ID=cbqmrr6r5iit4i0nfpou61v8
PRIVY_AUTHORIZATION_PRIVATE_KEY=<your_private_key>
```

### 3. **Silent API Failure**
The `/confirm-payment` endpoint might be failing to call `/transfer-usdc`, or the transfer endpoint is timing out.

## Immediate Fixes Applied

I've made several code improvements:

### 1. **Better Error Logging** ✅
- Added detailed console logs in `confirm-payment` endpoint
- Added transaction status tracking in `transfer-usdc` endpoint
- Added balance check logging before transfer

### 2. **Manual Retry Button** ✅
- Created `/api/orders/[id]/retry-transfer` endpoint
- Added "Retry USDC Transfer" button on merchant stuck order page
- Merchant can manually retry if transfer is stuck > 30 seconds

### 3. **Debug Endpoint** ✅
- Created `/api/orders/[id]/debug` endpoint
- Returns complete order state, wallet info, balances, env config
- Access at: `https://orrangev2.vercel.app/api/orders/74b32817-cd1e-4558-b904-26d68ecc5b7a/debug`

### 4. **Improved Error Handling** ✅
- Confirm-payment now returns detailed error if transfer fails
- Transfer endpoint validates balance BEFORE attempting transfer
- Status only updates to `completed` AFTER successful transaction

## How to Fix Your Stuck Order

### Step 1: Check Debug Info
Visit: `https://orrangev2.vercel.app/api/orders/74b32817-cd1e-4558-b904-26d68ecc5b7a/debug`

This will show:
- Current order status
- Merchant wallet address and USDC balance
- Whether environment variables are set
- Whether transfer can proceed

### Step 2: Run Diagnostic SQL (Optional)
Run `scripts/011_debug_stuck_order.sql` in Supabase SQL Editor to see raw database state.

### Step 3: Fund Merchant Wallet (If Needed)
If merchant USDC balance < 1 USDC:

1. Get merchant wallet address from debug endpoint or Supabase
2. Send Sepolia USDC to that address using:
   - Circle faucet: https://faucet.circle.com/
   - Or bridge from mainnet

### Step 4: Retry Transfer
Two options:

**Option A: Use Retry Button (Easiest)**
1. Open merchant order page as merchant (vikramjeet7089@gmail.com)
2. You'll see "Retry USDC Transfer" button
3. Click it - it will attempt transfer again

**Option B: Call API Directly**
```bash
curl -X POST https://orrangev2.vercel.app/api/orders/74b32817-cd1e-4558-b904-26d68ecc5b7a/retry-transfer \
  -H "Authorization: Bearer <merchant_privy_token>"
```

### Step 5: If Still Failing
Check Vercel logs for detailed error messages. The new logging will show:
- Balance check results
- Privy API errors
- Transaction hash or failure reason

## Files Changed

### Modified:
1. `app/api/orders/[id]/confirm-payment/route.ts` - Better error handling & logging
2. `app/api/orders/[id]/transfer-usdc/route.ts` - Enhanced logging, better balance checks
3. `app/merchant/order/[id]/page.tsx` - Added retry button for stuck orders

### Created:
1. `app/api/orders/[id]/retry-transfer/route.ts` - Manual retry endpoint
2. `app/api/orders/[id]/debug/route.ts` - Debug information endpoint
3. `scripts/011_debug_stuck_order.sql` - Database diagnostic queries

## Prevention

For future orders, ensure:

1. **Merchant wallet has USDC** before accepting orders
2. **Environment variables set** on Vercel:
   - `PRIVY_AUTHORIZATION_KEY_ID`
   - `PRIVY_AUTHORIZATION_PRIVATE_KEY`
   - `PRIVY_APP_SECRET`
   - `NEXT_PUBLIC_PRIVY_APP_ID`

3. **Test flow** with small amounts first (1 USDC = ₹90)

## Next Steps

1. ✅ Code deployed (commit & push changes)
2. ⏳ Check debug endpoint for your order
3. ⏳ Fund merchant wallet if needed
4. ⏳ Use retry button to complete stuck order
5. ⏳ Verify completion (tx_hash appears, status = completed)

## Questions to Diagnose

1. Did you run migration 009 (custom_upi_id)?
2. Is merchant wallet funded with Sepolia USDC?
3. Are Privy authorization keys set in Vercel env?
4. What does the debug endpoint show?

Let me know what the debug endpoint returns and I can provide specific next steps!
