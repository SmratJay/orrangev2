import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { getUSDCBalance } from '@/lib/usdc-transfer';

export const runtime = 'nodejs';

/**
 * GET /api/orders/[id]/debug
 * Debug endpoint to check order and wallet status
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePrivyUser(request);
    const supabase = await createClient();
    const { id: orderId } = await params;

    // Get order with all related data
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get merchant info
    const { data: merchantUser } = await supabase
      .from('merchants')
      .select('user_id, upi_id')
      .eq('id', order.merchant_id)
      .single();

    const { data: merchantWallet } = await supabase
      .from('users')
      .select('email, embedded_wallet_address, privy_wallet_id')
      .eq('id', merchantUser?.user_id)
      .single();

    // Get user info
    const { data: userWallet } = await supabase
      .from('users')
      .select('email, embedded_wallet_address')
      .eq('id', order.user_id)
      .single();

    // Check merchant USDC balance
    let merchantBalance = null;
    let balanceCheckError = null;
    try {
      if (merchantWallet?.embedded_wallet_address) {
        merchantBalance = await getUSDCBalance(merchantWallet.embedded_wallet_address);
      }
    } catch (err) {
      balanceCheckError = err instanceof Error ? err.message : 'Unknown error';
    }

    // Check environment variables
    const envCheck = {
      hasAppId: !!process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      hasAppSecret: !!process.env.PRIVY_APP_SECRET,
      hasAuthKeyId: !!process.env.PRIVY_AUTHORIZATION_KEY_ID,
      hasAuthPrivateKey: !!process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY,
    };

    const debugInfo = {
      order: {
        id: order.id,
        status: order.status,
        fiat_amount: order.fiat_amount,
        usdc_amount: order.usdc_amount,
        created_at: order.created_at,
        merchant_accepted_at: order.merchant_accepted_at,
        payment_confirmed_at: order.payment_confirmed_at,
        usdc_sent_at: order.usdc_sent_at,
        completed_at: order.completed_at,
        payment_reference: order.payment_reference,
        tx_hash: order.tx_hash,
      },
      merchant: {
        email: merchantWallet?.email,
        upi_id: merchantUser?.upi_id,
        wallet_address: merchantWallet?.embedded_wallet_address,
        privy_wallet_id: merchantWallet?.privy_wallet_id,
        usdc_balance: merchantBalance,
        balance_check_error: balanceCheckError,
        has_sufficient_usdc: merchantBalance !== null ? merchantBalance >= order.usdc_amount : null,
      },
      user: {
        email: userWallet?.email,
        wallet_address: userWallet?.embedded_wallet_address,
      },
      environment: envCheck,
      canTransfer: !!(
        merchantWallet?.privy_wallet_id &&
        userWallet?.embedded_wallet_address &&
        envCheck.hasAppId &&
        envCheck.hasAppSecret &&
        envCheck.hasAuthKeyId &&
        envCheck.hasAuthPrivateKey
      ),
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('[orders/debug] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
