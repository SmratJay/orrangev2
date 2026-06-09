import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';
import { transferUSDCFromMerchantToUser, getUSDCBalance } from '@/lib/usdc-transfer';
import { requirePrivyUser } from '@/lib/requirePrivyUser';
import { requireAdminUser } from '@/lib/requireAdmin';
import { assertTransition } from '@/lib/orders/status';

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
  let shouldRevertStatus = false;

  try {
    const internalApiKey = process.env.INTERNAL_API_KEY;
    const requestApiKey = request.headers.get('x-internal-api-key');

    let authorized = false;

    if (internalApiKey && requestApiKey && requestApiKey === internalApiKey) {
      authorized = true;
    }

    if (!authorized) {
      try {
        const { privyId } = await requirePrivyUser(request);
        await requireAdminUser(privyId);
        authorized = true;
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (order.status === 'completed' && order.tx_hash) {
      return NextResponse.json({
        success: true,
        txHash: order.tx_hash,
        explorerUrl: `https://sepolia.etherscan.io/tx/${order.tx_hash}`,
        alreadyCompleted: true,
      });
    }

    const transition = assertTransition(order.status, 'usdc_transferred');
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    // Claim this order for transfer execution to avoid duplicate sends.
    const { data: claimedOrder, error: claimError } = await supabase
      .from('orders')
      .update({ status: 'usdc_transferred' })
      .eq('id', orderId)
      .eq('status', 'payment_confirmed')
      .select('id, status, tx_hash')
      .maybeSingle();

    if (claimError) {
      console.error('[USDC Transfer] Failed to claim order:', claimError);
      return NextResponse.json({ error: 'Failed to claim order for transfer' }, { status: 500 });
    }

    if (!claimedOrder) {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status, tx_hash')
        .eq('id', orderId)
        .single();

      if (currentOrder?.status === 'completed' && currentOrder.tx_hash) {
        return NextResponse.json({
          success: true,
          txHash: currentOrder.tx_hash,
          explorerUrl: `https://sepolia.etherscan.io/tx/${currentOrder.tx_hash}`,
          alreadyCompleted: true,
        });
      }

      if (currentOrder?.status === 'usdc_transferred') {
        return NextResponse.json({ error: 'Transfer already in progress' }, { status: 409 });
      }

      return NextResponse.json({ error: 'Order no longer transferable' }, { status: 400 });
    }

    shouldRevertStatus = true;

    // Get merchant's wallet info (need both ID and address)
    const { data: merchantUser } = await supabase
      .from('merchants')
      .select('user_id')
      .eq('id', order.merchant_id)
      .single();

    if (!merchantUser) {
      throw new Error('Merchant not found');
    }

    const { data: merchantWallet } = await supabase
      .from('users')
      .select('custodial_wallet_id, custodial_wallet_address')
      .eq('id', merchantUser.user_id)
      .single();

    console.log('[USDC Transfer] Merchant wallet data:', {
      merchantUserId: merchantUser.user_id,
      walletData: merchantWallet,
      hasAddress: !!merchantWallet?.custodial_wallet_address,
      hasWalletId: !!merchantWallet?.custodial_wallet_id,
      walletId: merchantWallet?.custodial_wallet_id,
    });

    if (!merchantWallet?.custodial_wallet_address || !merchantWallet?.custodial_wallet_id) {
      console.error('[USDC Transfer] Missing custodial wallet — merchant must provision wallet first:', merchantWallet);
      throw new Error('Merchant custodial wallet not provisioned. Visit the merchant dashboard to set up your wallet.');
    }

    // Get user's wallet address
    const { data: userWallet } = await supabase
      .from('users')
      .select('embedded_wallet_address')
      .eq('id', order.user_id)
      .single();

    if (!userWallet?.embedded_wallet_address) {
      throw new Error('User wallet not found');
    }

    // Check merchant has sufficient USDC balance
    console.log('[USDC Transfer] Checking merchant balance', {
      orderId,
      merchantAddress: merchantWallet.custodial_wallet_address,
      requiredAmount: order.usdc_amount,
    });

    const merchantBalance = await getUSDCBalance(merchantWallet.custodial_wallet_address);
    console.log('[USDC Transfer] Merchant balance:', merchantBalance, 'USDC');

    if (merchantBalance < order.usdc_amount) {
      const errorMsg = `Insufficient merchant USDC balance. Has ${merchantBalance} USDC, needs ${order.usdc_amount} USDC`;
      console.error('[USDC Transfer]', errorMsg);
      throw new Error(errorMsg);
    }

    // Transfer USDC directly from merchant to user using Privy server signing
    console.log('[USDC Transfer] Starting transfer', {
      orderId,
      merchantWalletId: merchantWallet.custodial_wallet_id,
      from: merchantWallet.custodial_wallet_address,
      to: userWallet.embedded_wallet_address,
      amount: order.usdc_amount,
    });

    const txHash = await transferUSDCFromMerchantToUser(
      merchantWallet.custodial_wallet_id,
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
    shouldRevertStatus = false;

    return NextResponse.json({ 
      success: true,
      txHash,
      explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
    });
  } catch (error) {
    console.error('[orders/transfer-usdc] Error:', error);

    // Revert status on error
    if (shouldRevertStatus) {
      try {
        const { id: orderId } = await params;
        await (await createClient())
          .from('orders')
          .update({ status: 'payment_confirmed' })
          .eq('id', orderId)
          .eq('status', 'usdc_transferred');
      } catch (revertError) {
        console.error('[orders/transfer-usdc] Failed to revert status:', revertError);
      }
    }

    return NextResponse.json({ 
      error: 'USDC transfer failed',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
