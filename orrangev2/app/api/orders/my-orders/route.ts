import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * GET /api/orders/my-orders
 * Get current user's orders
 */
export async function GET(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        merchants!orders_merchant_id_fkey (
          id,
          upi_id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[my-orders] Error:', error);
      throw error;
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error('[my-orders] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
