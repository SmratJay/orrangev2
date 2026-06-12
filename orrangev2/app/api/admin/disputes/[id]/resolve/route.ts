import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';
import { captureMessage } from '@/lib/sentry';
import { z } from 'zod';

export const runtime = 'nodejs';

const resolveSchema = z.object({
  resolution: z.enum([
    'resolved_user_favor',
    'resolved_merchant_favor',
    'resolved_split',
    'resolved_no_action',
    'under_review',
    'pending_evidence',
  ]),
  notes: z.string().min(10).max(2000),
  action: z.enum(['release_to_user', 'release_to_merchant', 'split_50_50', 'custom_refund', 'no_action']),
});

/**
 * POST /api/admin/disputes/[id]/resolve
 * Resolve or update a dispute (admin only)
 */
export const POST = createAPIHandler(async (request, context) => {
  const { privyId } = await requirePrivyUser(request);
  const { id: disputeId } = await context!.params;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validation failed', 400, parsed.error.errors);
  }

  const { resolution, notes, action } = parsed.data;
  const supabase = await createClient();

  // Verify admin
  const { data: admin } = await supabase
    .from('users')
    .select('id, user_type')
    .eq('privy_user_id', privyId)
    .single();

  if (!admin || admin.user_type !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  // Get dispute
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('*, order:orders(id, status, user_id, merchant_id)')
    .eq('id', disputeId)
    .single();

  if (disputeError || !dispute) {
    return errorResponse('Dispute not found', 404);
  }

  // Cannot resolve already resolved disputes
  const resolvedStatuses = ['resolved_user_favor', 'resolved_merchant_favor', 'resolved_split', 'resolved_no_action'];
  if (resolvedStatuses.includes(dispute.status) && resolvedStatuses.includes(resolution)) {
    return errorResponse('Dispute already resolved', 400);
  }

  const oldStatus = dispute.status;

  // Update dispute
  const { error: updateError } = await supabase
    .from('disputes')
    .update({
      status: resolution,
      resolution_notes: notes,
      resolution_action: action,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', disputeId);

  if (updateError) {
    console.error('[admin/dispute/resolve] Error:', updateError);
    return errorResponse('Failed to resolve dispute', 500);
  }

  // Add audit log
  await supabase.from('dispute_audit_log').insert({
    dispute_id: disputeId,
    actor_id: admin.id,
    actor_type: 'admin',
    action: resolution.startsWith('resolved') ? 'dispute_resolved' : 'status_updated',
    old_status: oldStatus,
    new_status: resolution,
    metadata: { notes, action },
  });

  // If resolved, add message
  if (resolution.startsWith('resolved')) {
    await supabase.from('dispute_messages').insert({
      dispute_id: disputeId,
      sender_id: admin.id,
      sender_type: 'admin',
      message: `Dispute resolved. Decision: ${resolution.replace('resolved_', '').replace('_', ' ')}.\n\n${notes}`,
    });
  }

  // Update order status back to appropriate state
  if (resolution.startsWith('resolved') && dispute.order) {
    const orderStatus = resolution === 'resolved_user_favor' ? 'completed' :
                       resolution === 'resolved_merchant_favor' ? 'completed' :
                       'disputed';
    
    await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('id', dispute.order.id);
  }

  // Track in Sentry
  captureMessage(`Dispute ${disputeId} ${resolution}`, 'info');

  console.log('[Dispute Resolved]', {
    disputeId,
    adminId: admin.id,
    oldStatus,
    newStatus: resolution,
    action,
  });

  return successResponse({
    success: true,
    message: `Dispute ${resolution.startsWith('resolved') ? 'resolved' : 'updated'} successfully`,
  });
}, {
  rateLimit: {
    type: 'sensitive',
    getKey: (req) => createRateLimitKey(req, undefined, 'resolve-dispute'),
  },
});
