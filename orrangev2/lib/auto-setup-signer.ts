/**
 * Auto-Setup Server Signing (Lazy Initialization)
 * 
 * Automatically enables server signing for merchants when needed.
 * This ensures both existing and new merchants get configured seamlessly.
 */

import { createClient } from '@/lib/server';

interface SignerSetupResult {
  success: boolean;
  alreadySetup?: boolean;
  error?: string;
}

/**
 * Ensures server signing is enabled for a merchant's wallet.
 * If not enabled, automatically sets it up.
 * 
 * This is called just-in-time when merchant accepts their first order.
 * 
 * @param userId - Database user ID (not Privy ID)
 * @returns Setup result with success status
 */
export async function ensureServerSigningEnabled(userId: string): Promise<SignerSetupResult> {
  try {
    const supabase = await createClient();

    // Get merchant's wallet info
    const { data: user } = await supabase
      .from('users')
      .select('privy_wallet_id, embedded_wallet_address, user_type')
      .eq('id', userId)
      .single();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.user_type !== 'merchant') {
      return { success: false, error: 'User is not a merchant' };
    }

    if (!user.privy_wallet_id) {
      return { 
        success: false, 
        error: 'Wallet ID not synced yet. Please refresh and try again.' 
      };
    }

    // Check if server signing is already enabled
    // We'll use a database flag to track this to avoid repeated API calls
    const { data: merchantStatus } = await supabase
      .from('merchants')
      .select('server_signing_enabled')
      .eq('user_id', userId)
      .single();

    if (merchantStatus?.server_signing_enabled) {
      console.log('[Auto-Setup] Server signing already enabled for user', userId);
      return { success: true, alreadySetup: true };
    }

    // Setup server signing via Privy API
    console.log('[Auto-Setup] Enabling server signing for merchant...', {
      userId,
      walletId: user.privy_wallet_id,
    });

    const result = await setupServerSigning(user.privy_wallet_id);

    if (result.success) {
      // Mark as enabled in database to avoid future checks
      await supabase
        .from('merchants')
        .update({ server_signing_enabled: true })
        .eq('user_id', userId);

      console.log('[Auto-Setup] ✅ Server signing enabled successfully');
      return { success: true };
    } else {
      console.error('[Auto-Setup] Failed to enable server signing:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[Auto-Setup] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Internal function to call Privy API and enable server signing
 */
async function setupServerSigning(walletId: string): Promise<SignerSetupResult> {
  try {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    const authKeyId = process.env.PRIVY_AUTHORIZATION_KEY_ID;

    if (!appId || !appSecret || !authKeyId) {
      return { 
        success: false, 
        error: 'Server authorization keys not configured' 
      };
    }

    const response = await fetch(`https://auth.privy.io/api/v1/wallets/${walletId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'privy-app-id': appId,
        'Authorization': `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        authorization_keys: [authKeyId],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `Privy API error: ${response.status} - ${errorText}` 
      };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
