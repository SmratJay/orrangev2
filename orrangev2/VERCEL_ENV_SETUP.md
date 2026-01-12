# Vercel Environment Variables Setup

Add these to Vercel: Settings > Environment Variables > Production

**IMPORTANT**: Remove the quotes when pasting into Vercel!

## Variables to Add:

### 1. PRIVY_AUTHORIZATION_KEY_ID
```
cbqmrr6r5iit4i0nfpou61v8
```

### 2. PRIVY_AUTHORIZATION_PRIVATE_KEY
```
wallet-auth:MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgTUQK85NBaUA9HZQx54jrWISmkaceexCc8SwPJCVuWwWhRANCAATIqGpA8kaVKTbaElVhUELegOhW+ZZessh57wdXpIfehpxXqvSPm/gNJwz5KiJZSSHAaSId+SreBCiCpowAiL0r
```

## How to Add:

1. Go to: https://vercel.com/[your-username]/orrangev2/settings/environment-variables
2. Click "Add New"
3. Key: `PRIVY_AUTHORIZATION_KEY_ID`
4. Value: Paste the ID above (NO quotes)
5. Environment: Check "Production"
6. Click "Save"
7. Repeat for the PRIVATE_KEY

## Note:
- Don't include the backticks or quotes
- Just paste the raw value
- If it still fails, try adding them to "Preview" and "Development" environments too
