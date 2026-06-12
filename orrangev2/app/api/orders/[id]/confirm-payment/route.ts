import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { assertTransition } from '@/lib/orders/status';
import { completeOrderSchema } from '@/lib/orders/validation';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/confirm-payment
 * Merchant confirms INR received and USDC already sent to user client-side.
 * Body: { txHash: string }
 */
export const POST = createAPIHandler(async (request, context) => {
  const { privyId } = await requirePrivyUser(request);
  const { id: orderId } = await context!.params;
  
  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  
  const parsed = completeOrderSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validation failed', 400, parsed.error.errors);
  }
  
  const { txHash } = parsed.data;
  const supabase = await createClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('privy_user_id', privyId)
      .single();

    if (userError || !user || user.user_type !== 'merchant') {
      return errorResponse('Unauthorized - merchant only', 403);
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return errorResponse('Merchant record not found', 404);
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, merchant_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return errorResponse('Order not found', 404);
    }

    if (order.merchant_id !== merchant.id) {
      return errorResponse('Not your order', 403);
    }

    const transition = assertTransition(order.status, 'completed');
    if (!transition.ok) {
      return errorResponse(transition.error, 400);
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment_confirmed_at: now,
        completed_at: now,
        ...(txHash ? { tx_hash: txHash } : {}),
      })
      .eq('id', orderId);

    if (error) {
      console.error('[confirm-payment] Database error:', error);
      return errorResponse('Failed to complete order', 500);
    }

    console.log('[confirm-payment] Order completed', { orderId, txHash });
    return successResponse({ success: true });
}, {
  rateLimit: {
    type: 'sensitive',
    getKey: (req) => createRateLimitKey(req, undefined, 'confirm-payment'),
  },
});
