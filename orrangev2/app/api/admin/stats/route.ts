import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/admin/stats
 * Platform statistics (admin only)
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

  // Get timeframe from query
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '7');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel
  const [
    { count: totalUsers },
    { count: totalMerchants },
    { count: totalOrders },
    { count: completedOrders },
    { data: recentOrders },
    { count: activeDisputes },
    { count: pendingOrders },
    { data: volumeData },
    { count: newUsersToday },
    { count: newMerchantsToday },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('merchants').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('orders')
      .select('id, status, created_at, fiat_amount, usdc_amount, type')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('disputes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'under_review', 'pending_evidence'])
      .eq('is_deleted', false),
    supabase.from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'accepted']),
    supabase.from('orders')
      .select('usdc_amount')
      .eq('status', 'completed')
      .gte('created_at', since),
    supabase.from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),
    supabase.from('merchants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),
  ]);

  // Calculate volume
  const totalVolume = volumeData?.reduce((sum, o) => sum + (o.usdc_amount || 0), 0) || 0;

  // Order status breakdown
  const statusBreakdown = recentOrders?.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Type breakdown
  const typeBreakdown = recentOrders?.reduce((acc: { onramp: number; offramp: number }, o) => {
    if (o.type === 'onramp') acc.onramp += 1;
    else acc.offramp += 1;
    return acc;
  }, { onramp: 0, offramp: 0 }) || { onramp: 0, offramp: 0 };

  // Daily order counts for chart
  const dailyCounts = recentOrders?.reduce((acc, o) => {
    const date = o.created_at.split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Daily volume for chart
  const dailyVolume = recentOrders?.reduce((acc, o) => {
    const date = o.created_at.split('T')[0];
    if (!acc[date]) acc[date] = { onramp: 0, offramp: 0 };
    if (o.type === 'onramp') acc[date].onramp += (o.usdc_amount || 0);
    else acc[date].offramp += (o.usdc_amount || 0);
    return acc;
  }, {} as Record<string, { onramp: number; offramp: number }>) || {};

  return successResponse({
    overview: {
      totalUsers: totalUsers || 0,
      totalMerchants: totalMerchants || 0,
      totalOrders: totalOrders || 0,
      completedOrders: completedOrders || 0,
      completionRate: totalOrders ? Math.round(((completedOrders || 0) / totalOrders) * 100) : 0,
      activeDisputes: activeDisputes || 0,
      pendingOrders: pendingOrders || 0,
      totalVolumeUsdc: totalVolume,
    },
    today: {
      newUsers: newUsersToday || 0,
      newMerchants: newMerchantsToday || 0,
    },
    recentActivity: {
      orderCount: recentOrders?.length || 0,
      statusBreakdown,
      typeBreakdown,
      dailyCounts,
      dailyVolume,
    },
    timeframe: {
      days,
      since,
    },
  });
}, {
  rateLimit: {
    type: 'general',
    getKey: (req) => createRateLimitKey(req, undefined, 'admin-stats'),
  },
});
