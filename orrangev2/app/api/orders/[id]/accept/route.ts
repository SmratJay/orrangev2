import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { acceptOrderSchema } from '@/lib/orders/validation';
import { assertTransition } from '@/lib/orders/status';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/accept
 * Merchant accepts an order
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
  
  const parsed = acceptOrderSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validation failed', 400, parsed.error.errors);
  }

  const requestedUpi = parsed.data.upiId;
  const supabase = await createClient();

    // Get current user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('privy_user_id', privyId)
      .single();

    if (userError || !user || user.user_type !== 'merchant') {
      return errorResponse('Unauthorized - merchant only', 403);
    }

    // Get merchant record (need default UPI)
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, upi_id')
      .eq('user_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return errorResponse('Merchant record not found', 404);
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

    // Allow accepting orders that are either:
    // 1. Unassigned (merchant_id is null)
    // 2. Already assigned to this merchant
    if (order.merchant_id !== null && order.merchant_id !== merchant.id) {
      return errorResponse('This order is already assigned to another merchant', 403);
    }

    const transition = assertTransition(order.status, 'accepted');
    if (!transition.ok) {
      return errorResponse(transition.error, 400);
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
      console.error('[orders/accept] Database error:', error);
      return errorResponse('Failed to accept order', 500);
    }

    console.log('[Order Accepted]', { 
      orderId, 
      merchantId: merchant.id,
      chosenUpi,
    });

    return successResponse({ success: true });
}, {
  rateLimit: {
    type: 'orderAction',
    getKey: (req) => createRateLimitKey(req, undefined, 'accept-order'),
  },
});
