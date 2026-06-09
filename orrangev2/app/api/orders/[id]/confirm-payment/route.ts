import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { assertTransition } from '@/lib/orders/status';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/confirm-payment
 * Merchant confirms INR received and USDC already sent to user client-side.
 * Body: { txHash: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const txHash: string | undefined = body.txHash;

    const { data: user } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('privy_user_id', privyId)
      .single();

    if (!user || user.user_type !== 'merchant') {
      return NextResponse.json({ error: 'Unauthorized - merchant only' }, { status: 403 });
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant record not found' }, { status: 404 });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, merchant_id')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.merchant_id !== merchant.id) {
      return NextResponse.json({ error: 'Not your order' }, { status: 403 });
    }

    const transition = assertTransition(order.status, 'completed');
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment_confirmed_at: now,
        completed_at: now,
        ...(txHash ? { tx_hash: txHash } : {}),
      })
      .eq('id', orderId);

    if (error) {
      console.error('[confirm-payment] DB error:', error);
      return NextResponse.json({ error: 'Failed to complete order', detail: error.message }, { status: 500 });
    }

    console.log('[confirm-payment] Order completed', { orderId, txHash });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[orders/confirm-payment] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
