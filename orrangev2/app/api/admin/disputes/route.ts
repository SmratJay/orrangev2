import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/admin/disputes
 * List all disputes (admin only)
 * Query params: status, limit, offset
 */
export const GET = createAPIHandler(async (request) => {
  const { privyId } = await requirePrivyUser(request);
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

  // Parse query params
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Build query
  let query = supabase
    .from('disputes')
    .select(`
      *,
      order:orders(id, type, fiat_amount, usdc_amount, status),
      filed_by_user:users!filed_by(email),
      resolved_by_user:users!resolved_by(email)
    `, { count: 'exact' })
    .eq('is_deleted', false)
    .order('filed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: disputes, error, count } = await query;

  if (error) {
    console.error('[admin/disputes] Error:', error);
    return errorResponse('Failed to fetch disputes', 500);
  }

  // Get stats
  const { data: stats } = await supabase
    .from('disputes')
    .select('status')
    .eq('is_deleted', false);

  const statusCounts = stats?.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return successResponse({
    disputes,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
    stats: {
      total: count || 0,
      open: statusCounts['open'] || 0,
      underReview: statusCounts['under_review'] || 0,
      pendingEvidence: statusCounts['pending_evidence'] || 0,
      resolved: ['resolved_user_favor', 'resolved_merchant_favor', 'resolved_split', 'resolved_no_action']
        .reduce((sum, s) => sum + (statusCounts[s] || 0), 0),
    },
  });
}, {
  rateLimit: {
    type: 'general',
    getKey: (req) => createRateLimitKey(req, undefined, 'admin-disputes'),
  },
});
