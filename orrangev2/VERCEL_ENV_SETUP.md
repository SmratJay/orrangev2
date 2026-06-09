# Vercel Environment Variables Setup

Add these to Vercel: Settings > Environment Variables > Production

IMPORTANT:
- Never commit real secrets to git.
- Rotate any previously exposed values before continuing.
- Paste raw values without wrapping quotes.

## Variables to Add:

### 1. PRIVY_AUTHORIZATION_KEY_ID
```
<your_privy_authorization_key_id>
```

### 2. PRIVY_AUTHORIZATION_PRIVATE_KEY
```
wallet-auth:<your_privy_authorization_private_key>
```

### 3. INTERNAL_API_KEY
```
<a_long_random_internal_api_key>
```

## How to Add:

1. Go to: https://vercel.com/[your-username]/orrangev2/settings/environment-variables
2. Click "Add New"
3. Key: `PRIVY_AUTHORIZATION_KEY_ID`
4. Value: Paste the ID above (NO quotes)
5. Environment: Check "Production"
6. Click "Save"
7. Repeat for the PRIVATE_KEY
8. Repeat for INTERNAL_API_KEY

## Note:
- Do not include backticks or quotes in the value field.
- Do not store production secrets in markdown files.
- Add these vars to Preview and Development as needed.
