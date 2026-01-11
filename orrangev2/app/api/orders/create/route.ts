import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * POST /api/orders/create
 * Create a new order (on-ramp or off-ramp)
 */
export async function POST(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();

    // Get request body
    const { type, fiatAmount, usdcAmount, userWalletAddress } = await request.json();

    if (!type || !fiatAmount || !usdcAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id, embedded_wallet_address')
      .eq('privy_user_id', privyId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create order WITHOUT assigning merchant (merchant accepts manually)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        merchant_id: null, // No merchant assigned yet
        type: type.toLowerCase(),
        fiat_amount: fiatAmount,
        usdc_amount: usdcAmount,
        status: 'pending', // Will change to 'accepted'/'merchant_accepted' when merchant accepts
        user_wallet_address: userWalletAddress || user.embedded_wallet_address,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to create order', 
        details: error.message || 'Unknown error',
        hint: error.hint || null 
      }, { status: 500 });
    }

    console.log('[Order Created]', {
      orderId: order.id,
      userId: user.id,
      amount: `₹${fiatAmount} → ${usdcAmount} USDC`,
      status: 'pending (waiting for merchant to accept)',
    });

    return NextResponse.json({ 
      success: true, 
      order,
    });
  } catch (error) {
    console.error('[orders/create] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
