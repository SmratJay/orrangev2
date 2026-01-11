# Server Authentication Key Setup Guide

## Step 1: Generate Server Key Pair

Run these commands in your terminal:

```bash
# Generate private key
openssl ecparam -name prime256v1 -genkey -noout -out privy-server-key.pem

# Generate public key
openssl ec -in privy-server-key.pem -pubout -out privy-server-key.pub

# View public key (you'll paste this in Privy Dashboard)
cat privy-server-key.pub
```

**IMPORTANT:** 
- `privy-server-key.pem` = PRIVATE (add to .gitignore, never commit!)
- `privy-server-key.pub` = PUBLIC (register in Privy Dashboard)

## Step 2: Register in Privy Dashboard

1. Go to https://dashboard.privy.io
2. Select your app: "orrange-coredb"
3. Navigate to: **Settings → Authorization Keys** (or **Controls → Authorization**)
4. Click **"Create Authorization Key"** or **"Create Key Quorum"**
5. Paste contents of `privy-server-key.pub`
6. Set **Threshold: 1**
7. Click **Save**
8. **COPY THE SIGNER_QUORUM_ID** (looks like: `signer-quorum-xxx`)

## Step 3: Add to Environment Variables

Add to your `.env.local`:

```env
# Privy Server Signing (KEEP PRIVATE KEY SECRET!)
PRIVY_SERVER_AUTH_KEY_PATH=./privy-server-key.pem
PRIVY_SIGNER_QUORUM_ID=signer-quorum-xxx  # From Privy Dashboard
```

## Step 4: Update .gitignore

Add to `.gitignore`:

```
# Privy server keys (NEVER COMMIT!)
privy-server-key.pem
*.pem
```

## Verification

After setup, verify:
- [ ] `privy-server-key.pem` exists in project root
- [ ] `privy-server-key.pub` registered in Privy Dashboard
- [ ] `PRIVY_SIGNER_QUORUM_ID` saved in `.env.local`
- [ ] `.pem` files added to `.gitignore`
