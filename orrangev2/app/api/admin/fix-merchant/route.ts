import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';

/**
 * POST /api/admin/fix-merchant
 * Fix merchant user_type in database (skip Privy metadata for now)
 */
export async function POST(request: Request) {
  try {
    const { privyUserId, upiId } = await request.json();

    if (!privyUserId) {
      return NextResponse.json({ error: 'privyUserId required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Update database user_type
    console.log(`[fix-merchant] Updating database user_type for ${privyUserId}`);
    const { error: updateError } = await supabase
      .from('users')
      .update({ user_type: 'merchant' })
      .eq('privy_user_id', privyUserId);

    if (updateError) {
      console.error('[fix-merchant] Database update error:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // 2. Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // 3. Ensure merchant entry exists
    console.log(`[fix-merchant] Creating/updating merchant entry`);
    const { error: merchantError } = await supabase
      .from('merchants')
      .upsert({
        user_id: user.id,
        upi_id: upiId || 'merchant@paytm',
        inventory_balance: 10000,
        is_active: true,
      }, {
        onConflict: 'user_id'
      });

    if (merchantError) {
      console.error('[fix-merchant] Merchant entry error:', merchantError);
      return NextResponse.json({ error: 'Merchant entry failed' }, { status: 500 });
    }

    console.log(`[fix-merchant] Success! User ${privyUserId} is now a merchant`);
    return NextResponse.json({ 
      success: true, 
      message: `User ${privyUserId} is now a merchant. Please refresh the page.`,
      userId: user.id
    });
  } catch (error) {
    console.error('[fix-merchant] Error:', error);
    return NextResponse.json({ error: 'Failed to fix merchant' }, { status: 500 });
  }
}
