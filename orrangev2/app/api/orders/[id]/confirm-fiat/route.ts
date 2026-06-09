import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { parseRequestJson, formatZodError } from '@/lib/validation';
import { confirmFiatSchema } from '@/lib/orders/validation';
import { assertTransition } from '@/lib/orders/status';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

    const parsed = await parseRequestJson(request, confirmFiatSchema);
    if (!parsed.ok) {
      const details = formatZodError(parsed.error);
      return NextResponse.json(
        { error: details.message, issues: details.issues },
        { status: 400 }
      );
    }

    const { confirmed, notes } = parsed.data;

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
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.type !== 'offramp') {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Handle dispute
    if (!confirmed) {
      const { error: disputeError } = await supabase
        .from('orders')
        .update({
          notes: notes || 'User disputes INR receipt',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (disputeError) {
        return NextResponse.json(
          { error: 'Failed to record dispute' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        disputed: true,
        message: 'Dispute recorded',
      });
    }

    const transition = assertTransition(order.status, 'completed');
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        fiat_confirmed_at: now,
        completed_at: now,
        notes: notes || order.notes,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('status', 'fiat_sent');

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to complete order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order completed',
      status: 'completed',
    });

  } catch (error) {
    console.error('[Confirm Fiat] Error:', error);
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
      .select('id, user_id, merchant_id, status, fiat_sent_at, fiat_confirmed_at')
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
      fiatConfirmedAt: order.fiat_confirmed_at,
      canConfirm: order.status === 'fiat_sent' && isUser,
    });

  } catch (error) {
    console.error('[Confirm Fiat GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
