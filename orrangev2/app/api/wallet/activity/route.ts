import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';

export const runtime = 'nodejs';

/**
 * GET /api/wallet/activity
 * Get combined activity: orders, withdrawals, and external deposits
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

    // Fetch all activity types in parallel
    const [ordersResult, withdrawalsResult, depositsResult] = await Promise.all([
      // Orders (conversions) - fetch all non-pending statuses
      supabase
        .from('orders')
        .select(`
          id,
          type,
          usdc_amount,
          status,
          created_at,
          completed_at,
          fiat_amount,
          exchange_rate,
          custom_upi_id,
          merchant_id,
          merchants!orders_merchant_id_fkey (upi_id)
        `)
        .eq('user_id', user.id)
        .in('status', ['accepted', 'payment_sent', 'payment_confirmed', 'processing', 'usdc_transferred', 'completed'])
        .order('created_at', { ascending: false })
        .limit(10),

      // Withdrawals
      supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),

      // External deposits
      supabase
        .from('external_deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    // Debug logging
    console.log('[wallet-activity] Orders found:', ordersResult.data?.length || 0);
    console.log('[wallet-activity] Withdrawals found:', withdrawalsResult.data?.length || 0);
    console.log('[wallet-activity] Deposits found:', depositsResult.data?.length || 0);
    if (ordersResult.error) console.error('[wallet-activity] Orders error:', ordersResult.error);
    if (withdrawalsResult.error) console.error('[wallet-activity] Withdrawals error:', withdrawalsResult.error);
    if (depositsResult.error) console.error('[wallet-activity] Deposits error:', depositsResult.error);

    // Transform orders
    const orderActivities = (ordersResult.data || []).map(order => {
      // Handle merchants as array or object
      let merchantUpi = order.custom_upi_id;
      if (!merchantUpi && order.merchants) {
        if (Array.isArray(order.merchants)) {
          merchantUpi = order.merchants[0]?.upi_id;
        } else {
          merchantUpi = (order.merchants as any)?.upi_id;
        }
      }
      
      const orderType = order.type === 'onramp' ? 'On-Ramp' : 'Off-Ramp';
      const usdcAmount = order.usdc_amount || 0;
      const fiatAmount = order.fiat_amount || Math.round(usdcAmount * (order.exchange_rate || 90));
      
      return {
        id: order.id,
        type: 'conversion' as const,
        title: `${orderType} Conversion`,
        description: order.type === 'onramp' 
          ? `Converted ₹${fiatAmount} to ${usdcAmount} USDC`
          : `Converted ${usdcAmount} USDC to ₹${fiatAmount}`,
        amount: usdcAmount,
        status: order.status,
        created_at: order.created_at,
        completed_at: order.completed_at,
        merchant_upi: merchantUpi,
        icon: 'exchange'
      };
    });

    // Transform withdrawals
    const withdrawalActivities = (withdrawalsResult.data || []).map(w => ({
      id: w.id,
      type: 'withdrawal' as const,
      title: 'USDC Withdrawal',
      description: `Sent ${w.amount} USDC to ${w.destination_address.slice(0, 6)}...${w.destination_address.slice(-4)}`,
      amount: w.amount,
      status: w.status,
      created_at: w.created_at,
      completed_at: w.completed_at,
      tx_hash: w.tx_hash,
      destination_address: w.destination_address,
      icon: 'send'
    }));

    // Transform deposits
    const depositActivities = (depositsResult.data || []).map(d => ({
      id: d.id,
      type: 'deposit' as const,
      title: 'USDC Received',
      description: `Received ${d.amount} USDC from ${d.from_address.slice(0, 6)}...${d.from_address.slice(-4)}`,
      amount: d.amount,
      status: 'completed',
      created_at: d.created_at,
      tx_hash: d.tx_hash,
      from_address: d.from_address,
      icon: 'receive'
    }));

    // Combine and sort by date
    const allActivities = [...orderActivities, ...withdrawalActivities, ...depositActivities]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    return NextResponse.json({ 
      activities: allActivities,
      counts: {
        orders: ordersResult.data?.length || 0,
        withdrawals: withdrawalsResult.data?.length || 0,
        deposits: depositsResult.data?.length || 0
      }
    });

  } catch (error) {
    console.error('[wallet-activity] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
