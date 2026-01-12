import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

export const runtime = 'nodejs';

/**
 * POST /api/admin/fix-wallet-ids
 * Admin endpoint to fetch and update missing privy_wallet_id for all users
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Initialize Privy client
    const privy = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    );

    // Get all users with embedded wallets but no privy_wallet_id
    const { data: users, error } = await supabase
      .from('users')
      .select('id, privy_user_id, embedded_wallet_address, privy_wallet_id')
      .not('embedded_wallet_address', 'is', null)
      .is('privy_wallet_id', null);

    if (error) {
      console.error('[Fix Wallet IDs] Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        message: 'No users need wallet ID updates',
        updated: 0 
      });
    }

    console.log(`[Fix Wallet IDs] Found ${users.length} users to update`);

    const updates = [];

    // Fetch wallet info from Privy for each user
    for (const user of users) {
      try {
        // Get user from Privy API
        const privyUser = await privy.getUser(user.privy_user_id);
        
        // Find the embedded wallet
        const embeddedWallet = privyUser.linkedAccounts.find(
          (account: any) => 
            account.type === 'wallet' && 
            account.walletClientType === 'privy' &&
            account.address.toLowerCase() === user.embedded_wallet_address.toLowerCase()
        );

        if (embeddedWallet) {
          // Update database with wallet ID
          const { error: updateError } = await supabase
            .from('users')
            .update({ privy_wallet_id: embeddedWallet.walletId })
            .eq('id', user.id);

          if (updateError) {
            console.error(`[Fix Wallet IDs] Error updating user ${user.id}:`, updateError);
          } else {
            console.log(`[Fix Wallet IDs] Updated user ${user.id} with wallet ID ${embeddedWallet.walletId}`);
            updates.push({
              user_id: user.id,
              privy_user_id: user.privy_user_id,
              wallet_id: embeddedWallet.walletId,
              wallet_address: user.embedded_wallet_address,
            });
          }
        } else {
          console.warn(`[Fix Wallet IDs] No embedded wallet found for user ${user.id}`);
        }
      } catch (err) {
        console.error(`[Fix Wallet IDs] Error processing user ${user.id}:`, err);
      }
    }

    return NextResponse.json({
      message: `Updated ${updates.length} out of ${users.length} users`,
      updated: updates.length,
      total: users.length,
      updates,
    });
  } catch (error) {
    console.error('[Fix Wallet IDs] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
