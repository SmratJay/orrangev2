import { createClient } from '@/lib/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { createOrderSchema } from '@/lib/orders/validation';
import { createAPIHandler, successResponse, errorResponse } from '@/lib/api-handler';
import { createRateLimitKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/orders/create
 * Create a new order (on-ramp or off-ramp)
 */
export const POST = createAPIHandler(async (request) => {
  const { privyId } = await requirePrivyUser(request);
  const supabase = await createClient();

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validation failed', 400, parsed.error.errors);
  }

  const { type, fiatAmount, usdcAmount, userWalletAddress } = parsed.data;

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, embedded_wallet_address')
      .eq('privy_user_id', privyId)
      .single();

    if (userError || !user) {
      return errorResponse('User not found', 404);
    }

    // Create order WITHOUT assigning merchant (merchant accepts manually)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        merchant_id: null,
        type,
        fiat_amount: fiatAmount,
        usdc_amount: usdcAmount,
        status: 'pending',
        user_wallet_address: userWalletAddress || user.embedded_wallet_address,
      })
      .select()
      .single();

    if (error) {
      console.error('[orders/create] Database error:', error);
      return errorResponse('Failed to create order', 500, { hint: error.hint });
    }

    console.log('[Order Created]', {
      orderId: order.id,
      userId: user.id,
      amount: `₹${fiatAmount} → ${usdcAmount} USDC`,
    });

    return successResponse({ 
      success: true, 
      order,
    });
}, {
  rateLimit: {
    type: 'orderCreate',
    getKey: (req) => createRateLimitKey(req, undefined, 'create-order'),
  },
});
