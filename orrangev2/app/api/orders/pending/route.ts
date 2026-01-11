import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * GET /api/orders/pending
 * Get pending orders for merchants or users
 */
export async function GET(request: Request) {
  try {
    const { privyId } = await requirePrivyUser(request);
    const supabase = await createClient();

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('privy_user_id', privyId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let orders;

    if (user.user_type === 'merchant') {
      // Get merchant's assigned orders
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Fetch TWO sets of orders:
      // 1. New orders (pending with no merchant) - for "Orders to Fulfill"
      // 2. Orders assigned to this merchant - for "Pending Orders" and "Ready to Send"
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_user_id_fkey (
            id,
            email,
            smart_wallet_address,
            embedded_wallet_address
          )
        `)
        .or(`and(status.eq.pending,merchant_id.is.null),merchant_id.eq.${merchant?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      orders = data;
    } else {
      // Get user's own orders
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          merchants!orders_merchant_id_fkey (
            id,
            upi_id,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      orders = data;
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('[orders/pending] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
