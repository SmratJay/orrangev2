# 🔴 CRITICAL FIX REQUIRED - Missing Privy Wallet ID

## The Problem

Your order is stuck because the merchant's `privy_wallet_id` is **NULL** in the database. This ID is required for the server to sign transactions on behalf of the merchant's wallet.

**Debug Output Shows:**
```json
{
  "privy_wallet_id": null,     // ❌ MISSING!
  "canTransfer": false         // ❌ BLOCKED!
}
```

**Error in Logs:**
```
[Retry Transfer] Failed: { error: 'Merchant wallet not configured for server signing' }
```

## Why This Happened

The merchant account (vikramjeet7089@paytm) was created before the `privy_wallet_id` field was properly implemented. New users get this automatically, but existing users need to be updated.

## How to Fix (Choose ONE method)

### Method 1: Use Admin API Endpoint (EASIEST) ✅

**Wait for Vercel deployment to complete** (check: https://vercel.com/your-project), then:

#### Option A: Using Browser
1. Open your browser
2. Open DevTools (F12)
3. Go to Console tab
4. Paste this code:

```javascript
fetch('https://orrangev2.vercel.app/api/admin/fix-wallet-ids', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Result:', data))
.catch(err => console.error('Error:', err));
```

5. Press Enter
6. Check the console output - should show updated users

#### Option B: Using PowerShell
```powershell
$response = Invoke-RestMethod -Uri "https://orrangev2.vercel.app/api/admin/fix-wallet-ids" -Method POST
$response | ConvertTo-Json
```

### Method 2: Manual SQL Update (REQUIRES PRIVY WALLET ID)

1. **Get Privy Wallet ID:**
   - Go to https://dashboard.privy.io
   - Login to your Privy account
   - Click "Users" in sidebar
   - Find user: vikramjeet7089@paytm (or search by wallet: 0x060Fd292bac45c46e4cCB14B3E140e326235d2Af)
   - Click on the user
   - Find the embedded wallet section
   - Copy the **Wallet ID** (looks like: `clxxxxxxxxxxxxxx`)

2. **Update Database:**
   - Open Supabase SQL Editor
   - Run this query (replace `YOUR_WALLET_ID` with the ID from step 1):

   ```sql
   UPDATE users
   SET privy_wallet_id = 'YOUR_WALLET_ID'
   WHERE embedded_wallet_address = '0x060Fd292bac45c46e4cCB14B3E140e326235d2Af';
   
   -- Verify:
   SELECT email, embedded_wallet_address, privy_wallet_id
   FROM users
   WHERE embedded_wallet_address = '0x060Fd292bac45c46e4cCB14B3E140e326235d2Af';
   ```

### Method 3: Have Merchant Re-login

1. Merchant logs out completely
2. Clears browser cache
3. Logs back in
4. The `user-sync.tsx` component will now save the wallet ID automatically

## After Fixing

Once the `privy_wallet_id` is updated:

1. **Refresh both order pages** (user and merchant)
2. **On merchant page, click "Retry USDC Transfer"**
3. **Check Vercel logs** for detailed output
4. **Order should complete** within a few seconds

## Verification Steps

### Check if fix worked:
```
Visit: https://orrangev2.vercel.app/api/orders/74b32817-cd1e-4558-b904-26d68ecc5b7a/debug
```

Look for:
```json
{
  "merchant": {
    "privy_wallet_id": "clxxxxxxxxxxxxxx",  // ✅ Should have a value now
  },
  "canTransfer": true  // ✅ Should be true now
}
```

### Test the transfer:
1. Refresh merchant order page
2. Click "Retry USDC Transfer" button
3. Watch Vercel logs:
   - Should see: `[USDC Transfer] Starting transfer`
   - Should see: `[USDC Transfer] Transaction sent successfully`
   - Should see: `[USDC Transfer] Order completed successfully`

## Expected Result

After fixing the wallet ID and retrying:

✅ Order status changes from `payment_confirmed` → `completed`  
✅ Transaction hash appears (tx_hash)  
✅ User receives 1 USDC in wallet  
✅ Both pages show "Order Complete"  
✅ Etherscan link to transaction appears

## If Still Failing

Share:
1. **New debug endpoint output** (after fix)
2. **Vercel logs** after clicking retry
3. **Any error messages** displayed

## Files Changed
- ✅ `app/api/admin/fix-wallet-ids/route.ts` - Auto-fix endpoint
- ✅ `scripts/012_fix_merchant_wallet_id.sql` - Manual SQL option

## Quick Summary

**Problem:** `privy_wallet_id` is NULL  
**Solution:** Run admin endpoint OR update SQL manually  
**Time:** 2 minutes to fix  
**Then:** Click "Retry USDC Transfer" button
