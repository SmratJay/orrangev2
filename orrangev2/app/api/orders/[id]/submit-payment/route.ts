import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/submit-payment
 * User submits payment reference after paying via UPI
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const orderId = params.id;
    const { paymentReference } = await request.json();

    if (!paymentReference) {
      return NextResponse.json({ error: 'Payment reference required' }, { status: 400 });
    }

    // Get current user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your order' }, { status: 403 });
    }

    if (order.status !== 'merchant_accepted') {
      return NextResponse.json({ error: 'Order not in correct state' }, { status: 400 });
    }

    // Update order with payment reference
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'payment_sent',
        payment_reference: paymentReference,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error submitting payment:', error);
      return NextResponse.json({ error: 'Failed to submit payment' }, { status: 500 });
    }

    console.log('[Payment Submitted]', { orderId, reference: paymentReference });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[orders/submit-payment] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
