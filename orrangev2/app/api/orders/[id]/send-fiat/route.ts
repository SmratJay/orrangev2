import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { assertTransition } from '@/lib/orders/status';
import { z } from 'zod';

export const runtime = 'nodejs';

const sendFiatSchema = z.object({
  upiReference: z.string().trim().min(1).max(50).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

    const body = await request.json();
    const parsed = sendFiatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { upiReference, notes } = parsed.data;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, merchants!inner(user_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.type !== 'offramp') {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 });
    }

    if (order.merchants?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only merchant can mark INR sent' },
        { status: 403 }
      );
    }

    const transition = assertTransition(order.status, 'fiat_sent');
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'fiat_sent',
        fiat_sent_at: now,
        payment_reference: upiReference || order.payment_reference,
        notes: notes || order.notes,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('status', 'usdc_received');

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to mark INR sent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'INR marked as sent',
      status: 'fiat_sent',
    });

  } catch (error) {
    console.error('[Send Fiat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, merchant_id, status, fiat_sent_at, payment_reference, user_upi_id')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const isUser = order.user_id === user.id;
    let isMerchant = false;

    if (!isUser) {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', order.merchant_id)
        .maybeSingle();
      isMerchant = !!merchant;
    }

    if (!isUser && !isMerchant) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({
      orderId,
      status: order.status,
      fiatSentAt: order.fiat_sent_at,
      upiReference: order.payment_reference,
      canSendFiat: order.status === 'usdc_received' && isMerchant,
    });

  } catch (error) {
    console.error('[Send Fiat GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
