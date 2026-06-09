import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { parseRequestJson, formatZodError } from '@/lib/validation';
import { submitPaymentSchema } from '@/lib/orders/validation';
import { assertTransition } from '@/lib/orders/status';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/submit-payment
 * User submits payment reference after paying via UPI
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const parsed = await parseRequestJson(request, submitPaymentSchema);
    if (!parsed.ok) {
      const details = formatZodError(parsed.error);
      return NextResponse.json({ error: details.message, issues: details.issues }, { status: 400 });
    }

    const supabase = await createClient();
    const { id: orderId } = await params;
    const { paymentReference } = parsed.data;

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

    const transition = assertTransition(order.status, 'payment_sent');
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
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
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to submit payment',
        details: error.message,
        hint: error.hint
      }, { status: 500 });
    }

    console.log('[Payment Submitted]', { orderId, reference: paymentReference });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[orders/submit-payment] Error:', error);
    console.error('[orders/submit-payment] Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
