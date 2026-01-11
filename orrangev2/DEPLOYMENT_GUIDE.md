# 🚀 ORRANGE V2 - USDC On/Off-Ramp Platform Setup Guide

## ✅ COMPLETED FEATURES

### 1. **Smart Account (Account Abstraction) ✅**
- **File**: `components/providers.tsx`
- **Implementation**: Privy embedded wallets with automatic creation on login
- **Features**:
  - Users get ERC-4337 smart accounts automatically
  - No manual wallet connection needed
  - Web2-like experience (email/Google login)

### 2. **Gasless Transactions (Paymaster) ✅**
- **File**: `lib/smart-wallet.ts`
- **Implementation**: Privy handles gas sponsorship automatically
- **Benefits**:
  - Users don't need ETH for gas fees
  - Seamless USDC transfers
  - Configured for Sepolia testnet

### 3. **Complete Order Management System ✅**
- **Database Schema**: `scripts/002_update_schema_smart_accounts.sql`
- **Order Lifecycle**:
  1. User creates order (INR → USDC)
  2. Order assigned to merchant
  3. Merchant receives UPI payment
  4. Merchant confirms payment in dashboard
  5. Merchant sends USDC (gasless) to user's smart wallet
  6. Order marked complete with tx hash

### 4. **Merchant Dashboard ✅**
- **File**: `app/merchant/page.tsx`
- **Features**:
  - View pending orders awaiting payment
  - Confirm UPI payment receipt
  - Send USDC with one click (gasless)
  - Real-time order updates (10s refresh)

### 5. **User Flow ✅**
- **Files**: `components/buy-form.tsx`, `components/user-sync.tsx`
- **Features**:
  - Auto-wallet creation on login
  - Create on-ramp orders
  - View USDC balance
  - Wallet address auto-saved

### 6. **API Endpoints ✅**
- `/api/orders/create` - Create new orders
- `/api/orders/pending` - Get orders (user/merchant)
- `/api/orders/confirm-payment` - Merchant confirms payment
- `/api/orders/complete` - Record USDC transfer tx
- `/api/auth/setup` - Sync user data

---

## 🔧 SETUP INSTRUCTIONS

### Step 1: Update Database Schema
Run the new schema in Supabase SQL Editor:

```bash
# Navigate to Supabase Dashboard → SQL Editor
# Run: scripts/002_update_schema_smart_accounts.sql
```

**Important**: This drops the old `transactions` table and creates `orders` table.

### Step 2: Configure Privy Paymaster (CRITICAL)
1. Go to Privy Dashboard (dashboard.privy.io)
2. Navigate to **Settings → Embedded Wallets**
3. Enable **Sepolia** testnet
4. Go to **Paymasters** section
5. **Enable gas sponsorship for Sepolia**
6. Set daily/monthly limits as needed

Without this, gasless transactions won't work!

### Step 3: Get Sepolia USDC for Testing
```typescript
// Sepolia USDC Contract: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

// Option 1: Faucet (if available)
// Option 2: Bridge from mainnet using testnet bridges
// Option 3: Use Circle's testnet faucet
```

### Step 4: Create Test Merchant
```sql
-- Run in Supabase SQL Editor after creating a merchant user

INSERT INTO public.merchants (user_id, merchant_name, approval_status, daily_limit_usd)
SELECT id, 'Test Merchant', 'approved', 10000
FROM public.users
WHERE email = 'merchant@test.com';
```

### Step 5: Start Development Server
```bash
cd orrangev2
npm run dev
```

---

## 🧪 TESTING FLOW

### As User:
1. Visit `http://localhost:3000`
2. Click "Sign Up" → Login with email
3. Wait for embedded wallet creation (automatic)
4. Go to Dashboard → Click "On-Ramp"
5. Enter INR amount (e.g., 900) → You'll get 10 USDC
6. Click "Proceed to Payment"
7. Order created! Note the Order ID

### As Merchant:
1. Login with merchant account
2. Go to `/merchant` dashboard
3. See the pending order
4. Enter a fake UPI reference: "UTR123456789"
5. Click "Confirm Payment Received"
6. Order moves to "Ready to Fulfill" section
7. Click "Send USDC (Gasless)" button
8. Transaction sent! Check Sepolia Etherscan

### Verify:
- User's wallet balance should update
- Order status should be "completed"
- Transaction hash should appear in Etherscan

---

## 🏗️ ARCHITECTURE

### Smart Wallet Flow
```
User Signs Up (Email/Google)
        ↓
Privy Creates Embedded Wallet (ERC-4337)
        ↓
Wallet Address Saved to Supabase
        ↓
User Creates On-Ramp Order
        ↓
Merchant Confirms Fiat Payment
        ↓
Merchant Sends USDC (Gas Sponsored by Paymaster)
        ↓
User Receives USDC in Smart Wallet
```

### Tech Stack
- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Auth & Wallets**: Privy (Smart Accounts + Paymaster)
- **Blockchain**: Viem, Sepolia Testnet
- **Database**: Supabase (PostgreSQL)
- **Smart Contracts**: USDC on Sepolia

---

## 📁 KEY FILES

### Core Components
- `components/providers.tsx` - Privy configuration (smart accounts)
- `lib/smart-wallet.ts` - USDC transfer logic (gasless)
- `components/send-usdc.tsx` - UI for sending USDC
- `components/buy-form.tsx` - User order creation
- `app/merchant/page.tsx` - Merchant dashboard

### API Routes
- `app/api/orders/create/route.ts`
- `app/api/orders/pending/route.ts`
- `app/api/orders/confirm-payment/route.ts`
- `app/api/orders/complete/route.ts`

### Database
- `scripts/001_create_schema.sql` - Initial schema
- `scripts/002_update_schema_smart_accounts.sql` - Updated for smart accounts

---

## ⚠️ IMPORTANT NOTES

### Privy Paymaster Setup
**MUST DO**: Enable gas sponsorship in Privy dashboard for Sepolia. Without this, users will get errors when merchants try to send USDC.

### USDC Contract
Using Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
Make sure merchants have USDC in their wallets for testing.

### RLS Policies
Database has Row-Level Security enabled:
- Users see only their orders
- Merchants see only assigned orders
- Admins see everything

### Security
Current implementation is for testing. Before production:
1. Add proper KYC verification
2. Implement rate limiting
3. Add webhook confirmations for payments
4. Set up proper merchant verification
5. Add transaction monitoring
6. Implement fraud detection

---

## 🚧 TODO (Not Yet Implemented)

1. **Off-Ramp Flow** - Users send USDC, receive INR
2. **Transaction History** - Real-time updates with Supabase subscriptions
3. **Admin Panel** - Approve merchants, view all transactions
4. **KYC Integration** - Onfido/Sumsub integration points
5. **Real-time Updates** - WebSocket/Supabase Realtime for order status
6. **Email Notifications** - Order confirmations, status updates
7. **Payment Proofs** - Upload screenshots for manual verification
8. **Multi-merchant Routing** - Smart merchant assignment
9. **Rate Limiting** - API rate limits per user
10. **Monitoring & Alerts** - Sentry, error tracking

---

## 📞 NEXT STEPS

1. **Run SQL migrations** in Supabase
2. **Enable Privy paymaster** for Sepolia
3. **Get test USDC** for merchant wallets
4. **Create test merchant** in database
5. **Test complete flow** end-to-end
6. **Implement off-ramp** (reverse flow)
7. **Build admin panel** for merchant approvals
8. **Add transaction history** page
9. **Deploy to Vercel** for staging
10. **Go live** on mainnet

---

## 🎯 PRODUCTION CHECKLIST

Before going live on mainnet:

- [ ] Switch from Sepolia to Ethereum Mainnet
- [ ] Use real USDC contract (`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`)
- [ ] Configure mainnet paymaster in Privy
- [ ] Integrate real payment gateway (UPI API)
- [ ] Add KYC verification (Onfido/Sumsub)
- [ ] Set up proper merchant onboarding
- [ ] Implement compliance checks (AML/KYC)
- [ ] Add insurance/escrow for large amounts
- [ ] Set up monitoring & alerting
- [ ] Get legal compliance (FinCEN, etc.)
- [ ] Audit smart contract integrations
- [ ] Load testing & performance optimization

---

## 💡 PLATFORM FEATURES

### For Users
✅ Email/Google signup (no crypto knowledge needed)
✅ Automatic wallet creation
✅ Gasless transactions (no ETH needed)
✅ Buy USDC with INR via UPI
✅ View wallet balance in real-time
⏳ Sell USDC for INR (coming soon)
⏳ Transaction history (coming soon)

### For Merchants
✅ Dashboard to view orders
✅ Confirm fiat payments
✅ Send USDC with one click (gasless)
✅ Track daily/monthly volume
⏳ Admin approval required (coming soon)
⏳ Automated settlements (coming soon)

### For Admins
⏳ Approve/reject merchants
⏳ View all platform transactions
⏳ Monitor system health
⏳ Manage user KYC status

---

## 🔥 QUICK START

```bash
# 1. Install dependencies
cd orrangev2
npm install

# 2. Run migrations in Supabase
# Copy contents of scripts/002_update_schema_smart_accounts.sql

# 3. Enable Privy paymaster for Sepolia
# Visit dashboard.privy.io → Settings → Paymasters

# 4. Start dev server
npm run dev

# 5. Open browser
http://localhost:3000
```

**Ready to test!** 🚀
