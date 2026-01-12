import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/accept
 * Merchant accepts an order
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const body = await request.json().catch(() => ({}));
    const requestedUpi: string | undefined = body?.upiId?.toString().trim() || undefined;
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

    // Get merchant record (need default UPI)
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, upi_id')
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

    // Allow accepting orders that are either:
    // 1. Unassigned (merchant_id is null)
    // 2. Already assigned to this merchant
    if (order.merchant_id !== null && order.merchant_id !== merchant.id) {
      return NextResponse.json({ error: 'This order is already assigned to another merchant' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Order not in pending state' }, { status: 400 });
    }

    // Use provided custom UPI or fall back to merchant default
    const chosenUpi = requestedUpi || merchant.upi_id || null;

    // Update order to accepted and assign to this merchant
    const { error } = await supabase
      .from('orders')
      .update({
        merchant_id: merchant.id,
        status: 'accepted',
        merchant_accepted_at: new Date().toISOString(),
        custom_upi_id: chosenUpi,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error accepting order:', error);
      return NextResponse.json({ error: 'Failed to accept order', details: error }, { status: 500 });
    }

    console.log('[Order Accepted]', { 
      orderId, 
      merchantId: merchant.id,
      chosenUpi
    });

    return NextResponse.json({ 
      success: true
    });
  } catch (error) {
    console.error('[orders/accept] Error:', error);
    console.error('[orders/accept] Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
