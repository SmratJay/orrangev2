import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { assertTransition } from '@/lib/orders/status';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

export const runtime = 'nodejs';

const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

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
        { error: 'Only merchant can verify' },
        { status: 403 }
      );
    }

    const transition = assertTransition(order.status, 'usdc_received');
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    if (!order.usdc_tx_hash) {
      return NextResponse.json(
        { error: 'No USDC transaction recorded' },
        { status: 400 }
      );
    }

    // Verify on-chain
    try {
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      const receipt = await publicClient.getTransactionReceipt({
        hash: order.usdc_tx_hash as `0x${string}`,
      });

      if (!receipt) {
        return NextResponse.json(
          { error: 'Transaction not found on-chain' },
          { status: 400 }
        );
      }

      if (receipt.status !== 'success') {
        return NextResponse.json(
          { error: 'Transaction failed on-chain' },
          { status: 400 }
        );
      }

    } catch (chainError) {
      console.error('[Verify USDC] Chain error:', chainError);
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'usdc_received',
        usdc_received_at: now,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('status', 'usdc_sent');

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'usdc_received',
      explorerUrl: `https://sepolia.etherscan.io/tx/${order.usdc_tx_hash}`,
    });

  } catch (error) {
    console.error('[Verify USDC] Error:', error);
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
      .select('id, user_id, merchant_id, status, usdc_tx_hash, usdc_sent_at, usdc_received_at, type')
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
      canVerify: order.status === 'usdc_sent' && isMerchant,
      explorerUrl: order.usdc_tx_hash
        ? `https://sepolia.etherscan.io/tx/${order.usdc_tx_hash}`
        : null,
    });

  } catch (error) {
    console.error('[Verify USDC GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
