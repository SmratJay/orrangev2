import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/confirm-payment
 * Merchant confirms payment received (triggers USDC transfer)
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

    if (order.status !== 'payment_sent') {
      return NextResponse.json({ error: 'Payment not yet submitted' }, { status: 400 });
    }

    // Update order to payment_confirmed (this triggers backend USDC transfer)
    console.log('[Payment Confirmed] Updating order status', { orderId, merchantId: merchant.id });

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'payment_confirmed',
        payment_confirmed_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('[Payment Confirmed] Error updating status:', JSON.stringify(error));
      return NextResponse.json({ 
        error: 'Failed to confirm payment',
        detail: error.message 
      }, { status: 500 });
    }

    console.log('[Payment Confirmed] Status updated successfully', { orderId });

    // Trigger USDC transfer
    try {
      const baseUrl = request.url.split('/api')[0];
      console.log('[Payment Confirmed] Triggering USDC transfer...', { orderId, baseUrl });

      const transferResponse = await fetch(`${baseUrl}/api/orders/${orderId}/transfer-usdc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const transferResult = await transferResponse.json();
      console.log('[Payment Confirmed] Transfer response:', { 
        ok: transferResponse.ok, 
        status: transferResponse.status,
        result: transferResult 
      });

      if (!transferResponse.ok) {
        console.error('[Payment Confirmed] USDC transfer failed:', transferResult);
        return NextResponse.json({ 
          error: 'Payment confirmed but USDC transfer failed',
          detail: transferResult.error || transferResult.detail,
          transferError: true
        }, { status: 500 });
      }

      console.log('[Payment Confirmed] USDC transfer completed successfully', { 
        orderId, 
        txHash: transferResult.txHash 
      });
    } catch (transferError) {
      console.error('[Payment Confirmed] Error triggering USDC transfer:', transferError);
      return NextResponse.json({ 
        error: 'Payment confirmed but failed to trigger USDC transfer',
        detail: transferError instanceof Error ? transferError.message : 'Unknown error',
        transferError: true
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[orders/confirm-payment] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
