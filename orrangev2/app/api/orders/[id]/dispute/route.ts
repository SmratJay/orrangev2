import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { disputeSchema } from '@/lib/orders/validation';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';
import { captureMessage } from '@/lib/sentry';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/dispute
 * File a dispute for an order
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

  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validation failed', 400, parsed.error.errors);
  }

  const { reason, description, evidence } = parsed.data;
  const supabase = await createClient();

  // Get current user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, user_type')
    .eq('privy_user_id', privyId)
    .single();

  if (userError || !user) {
    return errorResponse('User not found', 404);
  }

  // Get order with merchant info
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, merchants!inner(user_id)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return errorResponse('Order not found', 404);
  }

  // Verify user is involved in this order (as user or merchant)
  const isUser = order.user_id === user.id;
  const isMerchant = order.merchants?.user_id === user.id;

  if (!isUser && !isMerchant) {
    return errorResponse('Not authorized to dispute this order', 403);
  }

  // Check if order is eligible for dispute (must be in progress or completed)
  const eligibleStatuses = ['payment_sent', 'usdc_sent', 'usdc_received', 'fiat_sent', 'completed'];
  if (!eligibleStatuses.includes(order.status)) {
    return errorResponse(
      `Cannot dispute order in ${order.status} status. Must be in progress or completed.`,
      400
    );
  }

  // Check for existing open dispute
  const { data: existingDispute } = await supabase
    .from('disputes')
    .select('id, status')
    .eq('order_id', orderId)
    .in('status', ['open', 'under_review', 'pending_evidence'])
    .maybeSingle();

  if (existingDispute) {
    return errorResponse('An open dispute already exists for this order', 409);
  }

  // Determine filed_by_type
  const filedByType = isMerchant ? 'merchant' : 'user';

  // Create dispute
  const { data: dispute, error } = await supabase
    .from('disputes')
    .insert({
      order_id: orderId,
      filed_by: user.id,
      filed_by_type: filedByType,
      reason,
      description,
      evidence_urls: evidence || [],
      disputed_usdc_amount: order.usdc_amount,
      disputed_fiat_amount: order.fiat_amount,
    })
    .select()
    .single();

  if (error) {
    console.error('[dispute] Database error:', error);
    return errorResponse('Failed to create dispute', 500);
  }

  // Create audit log entry
  await supabase.from('dispute_audit_log').insert({
    dispute_id: dispute.id,
    actor_id: user.id,
    actor_type: filedByType,
    action: 'dispute_filed',
    new_status: 'open',
    metadata: { reason, description },
  });

  // Update order status to reflect dispute
  await supabase
    .from('orders')
    .update({ status: 'disputed' })
    .eq('id', orderId);

  // Notify admin (in production, this would send email/push notification)
  captureMessage(`New dispute filed for order ${orderId}`, 'warning');

  console.log('[Dispute Filed]', {
    disputeId: dispute.id,
    orderId,
    filedBy: user.id,
    filedByType,
    reason,
  });

  return successResponse({
    success: true,
    dispute,
    message: 'Dispute filed successfully. An admin will review your case.',
  });
}, {
  rateLimit: {
    type: 'orderAction',
    getKey: (req) => createRateLimitKey(req, undefined, 'file-dispute'),
  },
});

/**
 * GET /api/orders/[id]/dispute
 * Get dispute details for an order
 */
export const GET = createAPIHandler(async (request, context) => {
  const { privyId } = await requirePrivyUser(request);
  const { id: orderId } = await context!.params;
  const supabase = await createClient();

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, user_type')
    .eq('privy_user_id', privyId)
    .single();

  if (userError || !user) {
    return errorResponse('User not found', 404);
  }

  // Get order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, merchants!inner(user_id)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return errorResponse('Order not found', 404);
  }

  // Verify access
  const isUser = order.user_id === user.id;
  const isMerchant = order.merchants?.user_id === user.id;
  const isAdmin = user.user_type === 'admin';

  if (!isUser && !isMerchant && !isAdmin) {
    return errorResponse('Not authorized', 403);
  }

  // Get dispute with messages
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select(`
      *,
      messages:dispute_messages(
        id,
        sender_id,
        sender_type,
        message,
        attachments,
        is_internal_note,
        created_at
      )
    `)
    .eq('order_id', orderId)
    .order('filed_at', { ascending: false })
    .maybeSingle();

  if (disputeError) {
    return errorResponse('Failed to fetch dispute', 500);
  }

  return successResponse({
    dispute,
    canFileNew: !dispute || ['resolved_user_favor', 'resolved_merchant_favor', 'resolved_split', 'resolved_no_action', 'cancelled'].includes(dispute.status),
  });
}, {
  rateLimit: {
    type: 'general',
    getKey: (req) => createRateLimitKey(req, undefined, 'get-dispute'),
  },
});
