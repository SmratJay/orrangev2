import { PrivyClient } from '@privy-io/server-auth';
import { createClient } from '@/lib/server';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

/**
 * ADMIN SCRIPT: Promote a user to merchant
 * 
 * Usage in terminal:
 * node scripts/make-merchant.js <privy_user_id> <upi_id> <inventory_balance>
 * 
 * Or call this function directly with the Privy User ID
 */
export async function makeMerchant(
  privyUserId: string,
  upiId: string = 'merchant@paytm',
  inventoryBalance: number = 10000
) {
  try {
    console.log(`🔄 Promoting ${privyUserId} to merchant...`);

    // 1. Update Privy metadata (TODO: Requires SDK v2.0+ or REST API)
    // await privy.updateUser(privyUserId, {
    //   customMetadata: {
    //     user_type: 'merchant',
    //   },
    // });
    console.log('⚠️  Skipping Privy metadata update (SDK limitation)');

    // 2. Update database
    const supabase = await createClient();
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ user_type: 'merchant' })
      .eq('privy_user_id', privyUserId);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return false;
    }
    console.log('✅ Updated database user_type');

    // 3. Create merchant entry
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .single();

    if (user) {
      const { error: merchantError } = await supabase
        .from('merchants')
        .upsert({
          user_id: user.id,
          upi_id: upiId,
          inventory_balance: inventoryBalance,
          is_active: true,
        }, {
          onConflict: 'user_id'
        });

      if (merchantError) {
        console.error('❌ Merchant creation error:', merchantError);
        return false;
      }
      console.log('✅ Created merchant entry');
    }

    console.log(`🎉 Successfully promoted ${privyUserId} to merchant!`);
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

// For running as standalone script
if (require.main === module) {
  const privyUserId = process.argv[2];
  const upiId = process.argv[3] || 'merchant@paytm';
  const inventoryBalance = parseInt(process.argv[4]) || 10000;

  if (!privyUserId) {
    console.error('Usage: node make-merchant.js <privy_user_id> [upi_id] [inventory_balance]');
    process.exit(1);
  }

  makeMerchant(privyUserId, upiId, inventoryBalance)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
