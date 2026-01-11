import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * GET /api/orders/[id]
 * Get order details with merchant info
 * Works for both users (order owner) and merchants (assigned merchant)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

    // Get current user
    const { data: currentUser } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('privy_user_id', privyId)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get order with merchant info
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        merchants:merchant_id (
          id,
          upi_id,
          user_id,
          users:user_id (
            email
          )
        ),
        users:user_id (
          email,
          embedded_wallet_address
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      console.error('[GET /api/orders/[id]] Order not found:', error);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check access: user must be either the order owner or the assigned merchant
    let accessType: 'user' | 'merchant' | null = null;

    // Check if current user owns this order
    if (order.user_id === currentUser.id) {
      accessType = 'user';
    }

    // Check if current user is the assigned merchant
    if (currentUser.user_type === 'merchant') {
      const { data: merchantRecord } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (merchantRecord && order.merchant_id === merchantRecord.id) {
        accessType = 'merchant';
      }
    }

    if (!accessType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Format response based on access type
    const response = {
      order: {
        id: order.id,
        type: order.type,
        fiat_amount: order.fiat_amount,
        usdc_amount: order.usdc_amount,
        status: order.status,
        payment_reference: order.payment_reference,
        tx_hash: order.tx_hash,
        created_at: order.created_at,
        merchant_accepted_at: order.merchant_accepted_at,
        payment_confirmed_at: order.payment_confirmed_at,
        usdc_sent_at: order.usdc_sent_at,
        completed_at: order.completed_at,
      },
      merchant: order.merchants ? {
        upi_id: order.merchants.upi_id,
      } : null,
      user: order.users ? {
        email: order.users.email,
        wallet_address: order.users.embedded_wallet_address,
      } : null,
      accessType,
      currentUserId: currentUser.id,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/orders/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
