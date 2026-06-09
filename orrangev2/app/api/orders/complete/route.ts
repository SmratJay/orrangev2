import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { requireAdminUser } from '@/lib/requireAdmin';
import { parseRequestJson, formatZodError } from '@/lib/validation';
import { completeOrderSchema } from '@/lib/orders/validation';

export const runtime = 'nodejs';

/**
 * POST /api/orders/complete
 * Admin/internal manual completion (server-signed transfers are default)
 */
export async function POST(request: Request) {
  try {
    const internalApiKey = process.env.INTERNAL_API_KEY;
    const requestApiKey = request.headers.get('x-internal-api-key');

    let authorized = false;

    if (internalApiKey && requestApiKey && requestApiKey === internalApiKey) {
      authorized = true;
    }

    if (!authorized) {
      const { privyId } = await requirePrivyUser(request);
      await requireAdminUser(privyId);
      authorized = true;
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const parsed = await parseRequestJson(request, completeOrderSchema);
    if (!parsed.ok) {
      const details = formatZodError(parsed.error);
      return NextResponse.json({ error: details.message, issues: details.issues }, { status: 400 });
    }

    const { orderId, txHash, paymentReference } = parsed.data;

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status, tx_hash')
      .eq('id', orderId)
      .single();

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existingOrder.status === 'completed' && existingOrder.tx_hash) {
      return NextResponse.json({
        success: true,
        order: existingOrder,
        alreadyCompleted: true,
      });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      status: 'completed',
      tx_hash: txHash,
      usdc_sent_at: now,
      completed_at: now,
    };

    if (paymentReference) {
      updateData.payment_reference = paymentReference;
    }

    // Update order
    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('[orders/complete] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
