import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { reviewSchema } from '@/lib/orders/validation';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/review
 * Submit a review after order completion
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

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validation failed', 400, parsed.error.errors);
  }

  const { rating, comment, communicationRating, speedRating, reliabilityRating } = parsed.data;
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

  // Get order with both parties
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, merchants!inner(id, user_id)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return errorResponse('Order not found', 404);
  }

  // Verify order is completed
  if (order.status !== 'completed') {
    return errorResponse('Can only review completed orders', 400);
  }

  // Determine who is reviewing and who is being reviewed
  const isUser = order.user_id === user.id;
  const isMerchant = order.merchants?.user_id === user.id;

  if (!isUser && !isMerchant) {
    return errorResponse('Not authorized to review this order', 403);
  }

  // Determine review direction
  const reviewerType = isUser ? 'user' : 'merchant';
  const revieweeId = isUser ? order.merchants!.user_id : order.user_id;
  const revieweeType = isUser ? 'merchant' : 'user';

  // Check for existing review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .eq('reviewer_id', user.id)
    .maybeSingle();

  if (existingReview) {
    return errorResponse('You have already reviewed this order', 409);
  }

  // Create review
  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      order_id: orderId,
      reviewer_id: user.id,
      reviewer_type: reviewerType,
      reviewee_id: revieweeId,
      reviewee_type: revieweeType,
      rating,
      comment,
      communication_rating: communicationRating,
      speed_rating: speedRating,
      reliability_rating: reliabilityRating,
    })
    .select()
    .single();

  if (error) {
    console.error('[review] Database error:', error);
    return errorResponse('Failed to submit review', 500);
  }

  console.log('[Review Submitted]', {
    reviewId: review.id,
    orderId,
    reviewer: user.id,
    reviewee: revieweeId,
    rating,
  });

  return successResponse({
    success: true,
    review,
    message: 'Review submitted successfully',
  });
}, {
  rateLimit: {
    type: 'orderAction',
    getKey: (req) => createRateLimitKey(req, undefined, 'submit-review'),
  },
});

/**
 * GET /api/orders/[id]/review
 * Get reviews for an order
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
    .select('user_id, merchant_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return errorResponse('Order not found', 404);
  }

  // Check authorization
  const isParticipant = order.user_id === user.id || 
    await supabase.from('merchants').select('id').eq('user_id', user.id).eq('id', order.merchant_id).then(r => !!r.data);
  
  if (!isParticipant && user.user_type !== 'admin') {
    return errorResponse('Not authorized', 403);
  }

  // Get reviews with reviewer info
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:users!reviewer_id(email)
    `)
    .eq('order_id', orderId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (error) {
    return errorResponse('Failed to fetch reviews', 500);
  }

  return successResponse({ reviews });
}, {
  rateLimit: {
    type: 'general',
    getKey: (req) => createRateLimitKey(req, undefined, 'get-reviews'),
  },
});
