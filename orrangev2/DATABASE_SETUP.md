# Database Setup Guide - Fresh Database

## Step-by-Step Setup Instructions

### Step 1: Create New Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Name it: `orrange-v2` (or your preferred name)
4. Choose region closest to your users (Mumbai for India)
5. Choose password for database
6. Wait 2-3 minutes for project to be ready

### Step 2: Get Connection Details

1. In your project, go to **Settings → Database**
2. Copy these values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Run the Complete Schema

1. Go to **SQL Editor** (in left sidebar)
2. Click "New Query"
3. Copy the ENTIRE contents of `scripts/000_complete_bootstrap.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Verify no errors (should see green checkmarks)

### Step 4: Add Test Merchant (Optional)

If you want test data:

1. In SQL Editor, create new query
2. Copy contents of `scripts/001_seed_test_data.sql`
3. Run it
4. Verify: `SELECT * FROM merchants;` should show 1 row

### Step 5: Update Environment Variables

In your project root, create/update `.env.local`:

```env
# Supabase (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Privy (your existing keys)
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-secret

# RPC URLs (Sepolia for testing)
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

### Step 6: Test Connection

```bash
cd d:\orrange-v2\orrangev2
npm run dev
```

Open http://localhost:3000 and test:
- [ ] User can login
- [ ] Create buy order (on-ramp)
- [ ] Create sell order (off-ramp)
- [ ] Orders appear in dashboard

### Step 7: Verify Schema

Run these in Supabase SQL Editor to confirm:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check off-ramp columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('user_upi_id', 'usdc_tx_hash', 'fiat_sent_at', 'usdc_received_at');

-- Check status constraint
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.orders'::regclass 
AND conname = 'orders_status_check';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'orders';
```

### Tables Created

| Table | Purpose |
|-------|---------|
| `users` | Stores user accounts with Privy integration |
| `merchants` | Merchant profiles and settings |
| `orders` | All orders (on-ramp and off-ramp) |

### Order Statuses Supported

- `pending` - Order created, waiting for merchant
- `accepted` - Merchant accepted
- `payment_sent` - User sent INR (on-ramp)
- `payment_confirmed` - Merchant confirmed INR receipt
- `usdc_sent` - User sent USDC (off-ramp)
- `usdc_received` - Merchant received USDC
- `usdc_transferred` - USDC sent to user (on-ramp)
- `fiat_sent` - Merchant sent INR (off-ramp)
- `completed` - Order finished
- `cancelled` - Order cancelled
- `expired` - Order expired

### Troubleshooting

**Error: "relation does not exist"**
→ Schema not applied. Re-run `000_complete_bootstrap.sql`

**Error: "column does not exist"**
→ Off-ramp migration missing. Check columns exist with verification query.

**Error: "violates check constraint"**
→ Status constraint outdated. Re-run the status constraint part of bootstrap.

**Error: "RLS policy violation"**
→ RLS policies not applied. Check policies exist in SQL Editor → Database → Policies.

### Next Steps

After setup:
1. Test on-ramp flow
2. Test off-ramp flow
3. Deploy to Vercel (update env vars there too)
4. Monitor for any issues

### Files Location

- Complete schema: `scripts/000_complete_bootstrap.sql`
- Test data: `scripts/001_seed_test_data.sql`
