import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * POST /api/merchants/setup-signer
 * 
 * One-time setup: Adds server as authorized signer to merchant's wallet
 * This allows server to sign USDC transfer transactions on merchant's behalf
 * 
 * Must be called once after merchant wallet is created
 */
export async function POST(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();

    // Verify user is a merchant
    const { data: user } = await supabase
      .from('users')
      .select('id, user_type, privy_wallet_id, embedded_wallet_address')
      .eq('privy_user_id', privyId)
      .single();

    if (!user || user.user_type !== 'merchant') {
      return NextResponse.json({ error: 'Unauthorized - merchant only' }, { status: 403 });
    }

    if (!user.privy_wallet_id) {
      return NextResponse.json({ 
        error: 'Wallet ID not found. Please refresh and try again.' 
      }, { status: 400 });
    }

    // Initialize Privy credentials
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    const authKeyId = process.env.PRIVY_AUTHORIZATION_KEY_ID;
    
    if (!appId || !appSecret || !authKeyId) {
      return NextResponse.json({ 
        error: 'Server authorization key not configured. Check .env.local' 
      }, { status: 500 });
    }

    console.log('[Setup Signer] Adding server signer to merchant wallet', {
      walletId: user.privy_wallet_id,
      authKeyId,
    });

    // Add server authorization key as signer to merchant wallet
    // Using Privy REST API: https://docs.privy.io/guide/server/wallets/management
    try {
      const response = await fetch(`https://auth.privy.io/api/v1/wallets/${user.privy_wallet_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'privy-app-id': appId!,
          'Authorization': `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          authorization_keys: [authKeyId],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Privy API error: ${response.status} - ${error}`);
      }

      console.log('[Setup Signer] Success - Server can now sign for merchant wallet');

      return NextResponse.json({ 
        success: true,
        message: 'Server signing enabled for merchant wallet',
        walletId: user.privy_wallet_id,
      });
    } catch (error) {
      console.error('[Setup Signer] Failed:', error);
      return NextResponse.json({ 
        error: 'Failed to add server as signer',
        detail: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[merchants/setup-signer] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
