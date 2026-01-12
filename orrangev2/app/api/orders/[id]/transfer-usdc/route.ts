import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { transferUSDCFromMerchantToUser, getUSDCBalance } from '@/lib/usdc-transfer';

export const runtime = 'nodejs';

/**
 * POST /api/orders/[id]/transfer-usdc
 * Backend transfers USDC directly from merchant wallet to user wallet
 * Called automatically after merchant confirms payment
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: orderId } = await params;

    // Get order with merchant and user info
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'payment_confirmed') {
      return NextResponse.json({ error: 'Payment not yet confirmed' }, { status: 400 });
    }

    // Get merchant's wallet info (need both ID and address)
    const { data: merchantUser } = await supabase
      .from('merchants')
      .select('user_id')
      .eq('id', order.merchant_id)
      .single();

    if (!merchantUser) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { data: merchantWallet } = await supabase
      .from('users')
      .select('embedded_wallet_address, privy_wallet_id')
      .eq('id', merchantUser.user_id)
      .single();

    console.log('[USDC Transfer] Merchant wallet data:', {
      merchantUserId: merchantUser.user_id,
      walletData: merchantWallet,
      hasAddress: !!merchantWallet?.embedded_wallet_address,
      hasWalletId: !!merchantWallet?.privy_wallet_id,
      walletId: merchantWallet?.privy_wallet_id,
    });

    if (!merchantWallet?.embedded_wallet_address || !merchantWallet?.privy_wallet_id) {
      console.error('[USDC Transfer] Missing wallet configuration:', {
        hasAddress: !!merchantWallet?.embedded_wallet_address,
        hasWalletId: !!merchantWallet?.privy_wallet_id,
        merchantWallet,
      });
      return NextResponse.json({ 
        error: 'Merchant wallet not configured for server signing',
        detail: `Missing: ${!merchantWallet?.embedded_wallet_address ? 'wallet address' : ''} ${!merchantWallet?.privy_wallet_id ? 'privy wallet ID' : ''}`
      }, { status: 404 });
    }

    // Get user's wallet address
    const { data: userWallet } = await supabase
      .from('users')
      .select('embedded_wallet_address')
      .eq('id', order.user_id)
      .single();

    if (!userWallet?.embedded_wallet_address) {
      return NextResponse.json({ error: 'User wallet not found' }, { status: 404 });
    }

    // Check merchant has sufficient USDC balance
    console.log('[USDC Transfer] Checking merchant balance', {
      orderId,
      merchantAddress: merchantWallet.embedded_wallet_address,
      requiredAmount: order.usdc_amount,
    });

    const merchantBalance = await getUSDCBalance(merchantWallet.embedded_wallet_address);
    console.log('[USDC Transfer] Merchant balance:', merchantBalance, 'USDC');

    if (merchantBalance < order.usdc_amount) {
      const errorMsg = `Insufficient merchant USDC balance. Has ${merchantBalance} USDC, needs ${order.usdc_amount} USDC`;
      console.error('[USDC Transfer]', errorMsg);
      return NextResponse.json({ 
        error: 'Insufficient merchant USDC balance',
        detail: errorMsg
      }, { status: 400 });
    }

    // Transfer USDC directly from merchant to user using Privy server signing
    console.log('[USDC Transfer] Starting transfer', {
      orderId,
      merchantWalletId: merchantWallet.privy_wallet_id,
      from: merchantWallet.embedded_wallet_address,
      to: userWallet.embedded_wallet_address,
      amount: order.usdc_amount,
    });

    const txHash = await transferUSDCFromMerchantToUser(
      merchantWallet.privy_wallet_id,
      userWallet.embedded_wallet_address,
      order.usdc_amount
    );

    console.log('[USDC Transfer] Transaction sent successfully', { orderId, txHash });

    const now = new Date().toISOString();

    // Update to completed with transaction hash
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        tx_hash: txHash,
        usdc_sent_at: now,
        completed_at: now,
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[USDC Transfer] Failed to update order status:', updateError);
      throw new Error('Transfer succeeded but failed to update order status');
    }

    console.log('[USDC Transfer] Order completed successfully', { orderId, txHash });

    return NextResponse.json({ 
      success: true,
      txHash,
      explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
    });
  } catch (error) {
    console.error('[orders/transfer-usdc] Error:', error);

    // Revert status on error
    try {
      const { id: orderId } = await params;
      await (await createClient())
        .from('orders')
        .update({ status: 'payment_confirmed' })
        .eq('id', orderId);
    } catch (revertError) {
      console.error('[orders/transfer-usdc] Failed to revert status:', revertError);
    }

    return NextResponse.json({ 
      error: 'USDC transfer failed',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
