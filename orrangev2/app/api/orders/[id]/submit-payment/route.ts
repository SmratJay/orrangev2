import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { submitPaymentSchema } from '@/lib/orders/validation';
import { assertTransition } from '@/lib/orders/status';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/submit-payment
 * User submits payment reference after paying via UPI
 */
export const POST = createAPIHandler(async (request, context) => {
  const { privyId } = await requirePrivyUser(request);
  const { id: orderId } = await context!.params;
  
  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
  
  const parsed = submitPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validation failed', 400, parsed.error.errors);
  }

  const { paymentReference } = parsed.data;
  const supabase = await createClient();

    // Get current user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .single();

    if (userError || !user) {
      return errorResponse('User not found', 404);
    }

    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return errorResponse('Order not found', 404);
    }

    if (order.user_id !== user.id) {
      return errorResponse('Not your order', 403);
    }

    const transition = assertTransition(order.status, 'payment_sent');
    if (!transition.ok) {
      return errorResponse(transition.error, 400);
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
      console.error('[submit-payment] Database error:', error);
      return errorResponse('Failed to submit payment', 500);
    }

    console.log('[Payment Submitted]', { orderId, reference: paymentReference });

    return successResponse({ success: true });
}, {
  rateLimit: {
    type: 'orderAction',
    getKey: (req) => createRateLimitKey(req, undefined, 'submit-payment'),
  },
});
