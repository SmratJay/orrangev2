import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { PrivyClient } from '@privy-io/server-auth';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

/**
 * POST /api/admin/set-user-type
 * Admin endpoint to set user type (merchant, admin, user)
 */
export async function POST(request: Request) {
  try {
    // Verify admin is making the request
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();

    // Check if requester is admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('user_type')
      .eq('privy_user_id', privyId)
      .single();

    if (!adminUser || adminUser.user_type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Get request body
    const { targetPrivyId, userType, upiId, inventoryBalance } = await request.json();

    if (!targetPrivyId || !userType) {
      return NextResponse.json({ error: 'Missing targetPrivyId or userType' }, { status: 400 });
    }

    if (!['user', 'merchant', 'admin'].includes(userType)) {
      return NextResponse.json({ error: 'Invalid userType' }, { status: 400 });
    }

    console.log(`[Admin] Setting user ${targetPrivyId} to ${userType}`);

    // Set custom metadata in Privy (TODO: Requires SDK v2.0+ or REST API)
    // await privy.updateUser(targetPrivyId, {
    //   customMetadata: {
    //     user_type: userType,
    //   },
    // });

    // Also update in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ user_type: userType })
      .eq('privy_user_id', targetPrivyId);

    if (updateError) {
      console.error('Error updating user in database:', updateError);
    }

    // If making user a merchant, create merchant entry
    if (userType === 'merchant') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('id')
        .eq('privy_user_id', targetPrivyId)
        .single();

      if (targetUser) {
        const { error: merchantError } = await supabase
          .from('merchants')
          .upsert({
            user_id: targetUser.id,
            upi_id: upiId || 'merchant@paytm',
            inventory_balance: inventoryBalance || 10000,
            is_active: true,
          }, {
            onConflict: 'user_id'
          });

        if (merchantError) {
          console.error('Error creating merchant entry:', merchantError);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `User ${targetPrivyId} is now ${userType}` 
    });
  } catch (error) {
    console.error('Error setting user type:', error);
    return NextResponse.json({ error: 'Failed to set user type' }, { status: 500 });
  }
}
