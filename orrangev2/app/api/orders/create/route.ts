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

    // Get an available merchant (simple round-robin for now)
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, upi_id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'No active merchants available' }, { status: 503 });
    }

    // Create order (no escrow needed - merchant wallet holds USDC)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        merchant_id: merchant.id,
        type: type.toLowerCase(),
        fiat_amount: fiatAmount,
        usdc_amount: usdcAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    console.log('[Order Created]', {
      orderId: order.id,
      userId: user.id,
      merchantId: merchant.id,
      amount: `₹${fiatAmount} → ${usdcAmount} USDC`,
    });

    return NextResponse.json({ 
      success: true, 
      order,
      merchantUpi: merchant.upi_id,
    });
  } catch (error) {
    console.error('[orders/create] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
