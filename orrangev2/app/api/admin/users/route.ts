import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/admin/users
 * List all users with pagination and search (admin only)
 */
export const GET = createAPIHandler(async (request) => {
  const { privyId } = await requirePrivyUser(request);
  const supabase = await createClient();

  const { data: admin } = await supabase
    .from('users')
    .select('user_type')
    .eq('privy_user_id', privyId)
    .single();

  if (!admin || admin.user_type !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const userType = url.searchParams.get('user_type') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = supabase
    .from('users')
    .select('id, email, user_type, privy_user_id, embedded_wallet_address, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike('email', `%${search}%`);
  }

  if (userType) {
    query = query.eq('user_type', userType);
  }

  const { data: users, error, count } = await query;

  if (error) {
    console.error('[admin/users] Error:', error);
    return errorResponse('Failed to fetch users', 500);
  }

  return successResponse({
    users,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
}, {
  rateLimit: {
    type: 'general',
    getKey: (req) => createRateLimitKey(req, undefined, 'admin-users'),
  },
});

/**
 * PATCH /api/admin/users
 * Update a user's role (admin only)
 */
export const PATCH = createAPIHandler(async (request) => {
  const { privyId } = await requirePrivyUser(request);
  const supabase = await createClient();

  const { data: admin } = await supabase
    .from('users')
    .select('user_type')
    .eq('privy_user_id', privyId)
    .single();

  if (!admin || admin.user_type !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  const body = await request.json();
  const { userId, userType, upiId } = body;

  if (!userId || !userType) {
    return errorResponse('userId and userType are required', 400);
  }

  if (!['user', 'merchant', 'admin'].includes(userType)) {
    return errorResponse('Invalid userType. Must be user, merchant, or admin', 400);
  }

  // Prevent self-demotion
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, email, user_type, privy_user_id')
    .eq('id', userId)
    .single();

  if (!targetUser) {
    return errorResponse('User not found', 404);
  }

  if (targetUser.privy_user_id === privyId) {
    return errorResponse('You cannot change your own role', 400);
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ user_type: userType })
    .eq('id', userId);

  if (updateError) {
    console.error('[admin/users PATCH] Update error:', updateError);
    return errorResponse('Failed to update user role', 500);
  }

  // If promoting to merchant, ensure merchant record exists
  if (userType === 'merchant') {
    const { error: merchantError } = await supabase
      .from('merchants')
      .upsert({
        user_id: userId,
        upi_id: upiId || 'merchant@upi',
        inventory_balance: 10000,
        is_active: true,
      }, { onConflict: 'user_id' });

    if (merchantError) {
      console.error('[admin/users PATCH] Merchant upsert error:', merchantError);
    }
  }

  return successResponse({
    message: `User ${targetUser.email} is now ${userType}`,
    userId,
    newRole: userType,
  });
}, {
  rateLimit: {
    type: 'sensitive',
    getKey: (req) => createRateLimitKey(req, undefined, 'admin-users-patch'),
  },
});
