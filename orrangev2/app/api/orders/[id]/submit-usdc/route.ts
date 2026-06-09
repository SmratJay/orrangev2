import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { parseRequestJson, formatZodError } from '@/lib/validation';
import { submitUsdcSchema } from '@/lib/orders/validation';
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

    const parsed = await parseRequestJson(request, submitUsdcSchema);
    if (!parsed.ok) {
      const details = formatZodError(parsed.error);
      return NextResponse.json(
        { error: details.message, issues: details.issues },
        { status: 400 }
      );
    }

    const { txHash } = parsed.data;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, user_type')
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
      return NextResponse.json(
        { error: 'Invalid order type' },
        { status: 400 }
      );
    }

    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    const transition = assertTransition(order.status, 'usdc_sent');
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'usdc_sent',
        usdc_tx_hash: txHash,
        usdc_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'accepted');

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to record USDC transfer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      txHash,
      explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
    });

  } catch (error) {
    console.error('[Submit USDC] Error:', error);
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
      .select('id, user_id, merchant_id, status, usdc_tx_hash, type')
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
      usdcTxHash: order.usdc_tx_hash,
      explorerUrl: order.usdc_tx_hash
        ? `https://sepolia.etherscan.io/tx/${order.usdc_tx_hash}`
        : null,
    });

  } catch (error) {
    console.error('[Submit USDC GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
