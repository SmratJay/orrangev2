import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { ensureServerSigningEnabled } from '@/lib/auto-setup-signer';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/accept
 * Merchant accepts an order
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

    // Get current user
    const { data: user } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('privy_user_id', privyId)
      .single();

    if (!user || user.user_type !== 'merchant') {
      return NextResponse.json({ error: 'Unauthorized - merchant only' }, { status: 403 });
    }

    // Get merchant record
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant record not found' }, { status: 404 });
    }

    // Get order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Allow accepting orders that are either:
    // 1. Unassigned (merchant_id is null)
    // 2. Already assigned to this merchant
    if (order.merchant_id !== null && order.merchant_id !== merchant.id) {
      return NextResponse.json({ error: 'This order is already assigned to another merchant' }, { status: 403 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Order not in pending state' }, { status: 400 });
    }

    // 🆕 LAZY INITIALIZATION: Auto-enable server signing on first order accept
    // This works for both existing and new merchants
    console.log('[Order Accept] Checking server signing status...');
    
    const signingSetup = await ensureServerSigningEnabled(user.id);
    
    if (!signingSetup.success) {
      console.error('[Order Accept] Server signing setup failed:', signingSetup.error);
      return NextResponse.json({ 
        error: 'Failed to configure automatic payments. Please contact support.',
        detail: signingSetup.error
      }, { status: 500 });
    }

    if (!signingSetup.alreadySetup) {
      console.log('[Order Accept] ✅ Server signing enabled (first-time setup)');
    }

    // Update order to merchant_accepted and assign to this merchant
    const { error } = await supabase
      .from('orders')
      .update({
        merchant_id: merchant.id,
        status: 'merchant_accepted',
        merchant_accepted_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error accepting order:', error);
      return NextResponse.json({ error: 'Failed to accept order' }, { status: 500 });
    }

    console.log('[Order Accepted]', { 
      orderId, 
      merchantId: merchant.id,
      signingEnabled: true 
    });

    return NextResponse.json({ 
      success: true,
      firstTimeSetup: !signingSetup.alreadySetup
    });
  } catch (error) {
    console.error('[orders/accept] Error:', error);
    console.error('[orders/accept] Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
