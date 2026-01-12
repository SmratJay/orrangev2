import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/retry-transfer
 * Manually retry USDC transfer for stuck orders
 * Only works if order is in payment_confirmed status
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

    // Get current user
    const { data: user } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('privy_user_id', privyId)
      .single();

    if (!user || user.user_type !== 'merchant') {
      return NextResponse.json({ error: 'Unauthorized - merchant only' }, { status: 403 });
    }

    // Get merchant record
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant record not found' }, { status: 404 });
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

    if (order.merchant_id !== merchant.id) {
      return NextResponse.json({ error: 'Not your order' }, { status: 403 });
    }

    // Only allow retry for payment_confirmed status
    if (order.status !== 'payment_confirmed') {
      return NextResponse.json({ 
        error: `Cannot retry transfer. Order status is ${order.status}`,
        detail: 'Only orders in payment_confirmed status can be retried'
      }, { status: 400 });
    }

    console.log('[Retry Transfer] Attempting to retry USDC transfer', { orderId });

    // Trigger USDC transfer
    const baseUrl = request.url.split('/api')[0];
    const transferResponse = await fetch(`${baseUrl}/api/orders/${orderId}/transfer-usdc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const transferResult = await transferResponse.json();

    if (!transferResponse.ok) {
      console.error('[Retry Transfer] Failed:', transferResult);
      return NextResponse.json({ 
        error: 'USDC transfer failed',
        detail: transferResult.error || transferResult.detail
      }, { status: 500 });
    }

    console.log('[Retry Transfer] Success', { orderId, txHash: transferResult.txHash });

    return NextResponse.json({ 
      success: true,
      txHash: transferResult.txHash,
      explorerUrl: transferResult.explorerUrl
    });
  } catch (error) {
    console.error('[orders/retry-transfer] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
