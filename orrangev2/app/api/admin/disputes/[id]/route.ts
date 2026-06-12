import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/admin/disputes/[id]
 * Get single dispute details (admin only)
 */
export const GET = createAPIHandler(async (request, context) => {
  const { privyId } = await requirePrivyUser(request);
  const { id: disputeId } = await context!.params;
  const supabase = await createClient();

  // Verify admin
  const { data: user } = await supabase
    .from('users')
    .select('user_type')
    .eq('privy_user_id', privyId)
    .single();

  if (!user || user.user_type !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  // Get dispute with all details
  const { data: dispute, error } = await supabase
    .from('disputes')
    .select(`
      *,
      order:orders(id, type, fiat_amount, usdc_amount, status, user_id, merchant_id),
      messages:dispute_messages(
        id,
        sender_id,
        sender_type,
        message,
        created_at
      ),
      filed_by_user:users!filed_by(email),
      resolved_by_user:users!resolved_by(email)
    `)
    .eq('id', disputeId)
    .single();

  if (error || !dispute) {
    console.error('[admin/dispute/detail] Error:', error);
    return errorResponse('Dispute not found', 404);
  }

  return successResponse({ dispute });
}, {
  rateLimit: {
    type: 'general',
    getKey: (req) => createRateLimitKey(req, undefined, 'admin-dispute-detail'),
  },
});
