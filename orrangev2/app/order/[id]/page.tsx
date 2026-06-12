'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivy, useWallets, getAccessToken } from '@privy-io/react-auth';
import { createWalletClient, custom, encodeFunctionData, parseUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { CheckCircle2, Clock, AlertCircle, Loader2, Copy, ExternalLink, Flag } from 'lucide-react';
import { FileDispute } from '@/components/dispute/file-dispute';
import type { OrderStatus } from '@/lib/orders/status';

interface OrderData {
  order: {
    id: string;
    type: 'onramp' | 'offramp';
    fiat_amount: number;
    usdc_amount: number;
    status: OrderStatus;
    payment_reference?: string;
    tx_hash?: string;
    usdc_tx_hash?: string;
    created_at: string;
    merchant_accepted_at?: string;
    payment_confirmed_at?: string;
    usdc_sent_at?: string;
    usdc_received_at?: string;
    fiat_sent_at?: string;
    fiat_confirmed_at?: string;
    completed_at?: string;
    custom_upi_id?: string;
    user_upi_id?: string;
  };
  merchant: {
    upi_id: string;
    wallet_address: string | null;
  } | null;
  user: {
    email: string;
    wallet_address: string;
  } | null;
  accessType: 'user' | 'merchant';
}

const ONRAMP_STEPS: { status: OrderStatus; label: string; description: string }[] = [
  { status: 'pending', label: 'Order Created', description: 'Waiting for merchant to accept' },
  { status: 'accepted', label: 'Merchant Accepted', description: 'Pay via UPI, then confirm' },
  { status: 'payment_sent', label: 'Payment Submitted', description: 'Merchant verifying payment' },
  { status: 'payment_confirmed', label: 'Payment Confirmed', description: 'Transferring USDC...' },
  { status: 'usdc_transferred', label: 'Transfer Broadcasted', description: 'Transaction submitted on-chain' },
  { status: 'completed', label: 'Completed', description: 'USDC transferred to your wallet!' },
];

const OFFRAMP_STEPS: { status: OrderStatus; label: string; description: string }[] = [
  { status: 'pending', label: 'Order Created', description: 'Waiting for merchant to accept' },
  { status: 'accepted', label: 'Merchant Accepted', description: 'Send USDC to merchant' },
  { status: 'usdc_sent', label: 'USDC Sent', description: 'Waiting for merchant to verify' },
  { status: 'usdc_received', label: 'USDC Verified', description: 'Merchant will send INR' },
  { status: 'fiat_sent', label: 'INR Sent', description: 'Confirm receipt to complete' },
  { status: 'completed', label: 'Completed', description: 'Order completed successfully!' },
];

const USDC_CONTRACT = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ERC20_TRANSFER_ABI = [{
  name: 'transfer',
  type: 'function',
  inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const;

export default function UserOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { ready: privyReady, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const orderId = params.id as string;

  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  // Fetch order data via API
  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch order');
      }

      const orderData = await response.json();
      setData(orderData);
      setError(null);

      // If merchant is viewing, redirect to merchant order page
      if (orderData.accessType === 'merchant') {
        router.push(`/merchant/order/${orderId}`);
        return;
      }
    } catch (err) {
      console.error('[OrderPage] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  // Initial fetch
  useEffect(() => {
    if (!privyReady) return;
    
    if (!authenticated) {
      router.push('/auth/login');
      return;
    }

    fetchOrder();
  }, [privyReady, authenticated, fetchOrder, router]);

  // Poll for updates (every 2 seconds for faster status updates)
  useEffect(() => {
    if (!data || data.order.status === 'completed' || data.order.status === 'cancelled' || data.order.status === 'expired') {
      return;
    }

    const interval = setInterval(fetchOrder, 2000);
    return () => clearInterval(interval);
  }, [data, fetchOrder]);

  // Submit payment reference
  const handleSubmitPayment = async () => {
    if (!paymentReference.trim()) {
      alert('Please enter your UPI transaction ID');
      return;
    }

    setActionLoading(true);
    try {
      const authToken = await getAccessToken();
      const response = await fetch(`/api/orders/${orderId}/submit-payment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ paymentReference: paymentReference.trim() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit payment');
      }

      // Refresh order data
      await fetchOrder();
    } catch (err) {
      console.error('[OrderPage] Submit payment error:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy UPI ID
  const copyUpiId = () => {
    const upi = order ? (order.custom_upi_id || merchant?.upi_id) : null;
    if (upi) {
      navigator.clipboard.writeText(upi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Confirm INR received (off-ramp)
  const handleConfirmFiat = async (confirmed: boolean) => {
    setActionLoading(true);
    try {
      const authToken = await getAccessToken();
      const response = await fetch(`/api/orders/${orderId}/confirm-fiat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ confirmed }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to confirm');
      }

      await fetchOrder();
    } catch (err) {
      console.error('[OrderPage] Confirm fiat error:', err);
      alert(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setActionLoading(false);
    }
  };

  // Get current step index
  const getCurrentStep = () => {
    if (!data) return 0;
    const steps = data.order.type === 'offramp' ? OFFRAMP_STEPS : ONRAMP_STEPS;
    const idx = steps.findIndex((s: { status: OrderStatus }) => s.status === data.order.status);
    return idx >= 0 ? idx : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { order, merchant } = data;
  const currentStep = getCurrentStep();
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';
  const isExpired = order.status === 'expired';

  const merchantUpi = order.custom_upi_id || merchant?.upi_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Order #{orderId.slice(0, 8)}</h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>
              {order.type === 'offramp' 
                ? `Sell ${order.usdc_amount} USDC for ₹${order.fiat_amount}`
                : `Buy ${order.usdc_amount} USDC for ₹${order.fiat_amount}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {order.type === 'offramp' ? 'You Send' : 'You Pay'}
                </p>
                <p className="text-2xl font-bold">
                  {order.type === 'offramp' ? `${order.usdc_amount} USDC` : `₹${order.fiat_amount}`}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">You Receive</p>
                <p className="text-2xl font-bold text-green-500">
                  {order.type === 'offramp' ? `₹${order.fiat_amount}` : `${order.usdc_amount} USDC`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(order.type === 'offramp' ? OFFRAMP_STEPS : ONRAMP_STEPS).map((step: { status: OrderStatus; label: string; description: string }, index: number) => {
                const isActive = index === currentStep;
                const isComplete = index < currentStep || isCompleted;
                const isPending = index > currentStep;

                return (
                  <div key={step.status} className="flex items-start gap-4">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center shrink-0
                      ${isComplete ? 'bg-green-500 text-white' : ''}
                      ${isActive ? 'bg-primary text-white animate-pulse' : ''}
                      ${isPending ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <span className="text-sm">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                        {step.label}
                      </p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Area - depends on status */}
        
        {/* Status: Merchant Accepted - Show UPI payment form (onramp only) */}
        {order.type === 'onramp' && order.status === 'accepted' && merchant && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Pay via UPI</CardTitle>
              <CardDescription>
                Send ₹{order.fiat_amount} to the merchant's UPI ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Merchant UPI */}
              <div>
                <Label>Merchant UPI ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-lg">
                    {merchantUpi}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyUpiId}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Payment Reference Input */}
              <div>
                <Label htmlFor="upi-ref">UPI Transaction ID</Label>
                <Input
                  id="upi-ref"
                  placeholder="Enter your UPI transaction ID after payment"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in your UPI app after completing payment
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleSubmitPayment}
                disabled={actionLoading || !paymentReference.trim()}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "I've Paid - Submit Reference"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status: Payment Sent - Waiting for merchant */}
        {order.status === 'payment_sent' && (
          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="text-yellow-500 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Waiting for Merchant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your payment reference <strong>{order.payment_reference}</strong> has been submitted.
                The merchant is verifying your payment.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status: Payment Confirmed - Transferring USDC */}
        {(order.status === 'payment_confirmed' || order.status === 'usdc_transferred') && (
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle className="text-blue-500 flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Transferring USDC
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Payment confirmed! USDC is being transferred to your wallet...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status: Completed */}
        {isCompleted && (
          <Card className="border-green-500 bg-green-500/10">
            <CardHeader>
              <CardTitle className="text-green-500 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Order Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {order.type === 'offramp'
                  ? `₹${order.fiat_amount} has been sent to your UPI account.`
                  : `${order.usdc_amount} USDC has been transferred to your wallet.`}
              </p>
              
              {order.tx_hash && (
                <div>
                  <Label>Transaction Hash</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                      {order.tx_hash}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://sepolia.etherscan.io/tx/${order.tx_hash}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* OFF-RAMP: Status Accepted - Send USDC client-side */}
        {order.type === 'offramp' && order.status === 'accepted' && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Send USDC</CardTitle>
              <CardDescription>
                Send {order.usdc_amount} USDC to the merchant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> You need to send USDC from your wallet first.
                  The merchant will send ₹{order.fiat_amount} after receiving your USDC.
                </p>
              </div>

              <div>
                <Label>Your UPI ID for receiving INR</Label>
                <div className="p-3 bg-muted rounded-lg font-mono mt-1">
                  {order.user_upi_id || 'Not set'}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={actionLoading}
                onClick={async () => {
                  const merchantWalletAddress = merchant?.wallet_address;
                  if (!merchantWalletAddress) {
                    alert('Merchant wallet address not available. Please try again.');
                    return;
                  }
                  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
                  if (!embeddedWallet) {
                    alert('Your embedded wallet is not ready. Please refresh and try again.');
                    return;
                  }
                  setActionLoading(true);
                  try {
                    console.log('[Offramp] Switching to Sepolia...');
                    await embeddedWallet.switchChain(11155111);
                    const provider = await embeddedWallet.getEthereumProvider();
                    const walletClient = createWalletClient({
                      account: embeddedWallet.address as `0x${string}`,
                      chain: sepolia,
                      transport: custom(provider),
                    });
                    const usdcAmount = parseUnits(String(order.usdc_amount), 6);
                    const calldata = encodeFunctionData({
                      abi: ERC20_TRANSFER_ABI,
                      functionName: 'transfer',
                      args: [merchantWalletAddress as `0x${string}`, usdcAmount],
                    });
                    console.log('[Offramp] Sending USDC tx — amount:', order.usdc_amount, 'to:', merchantWalletAddress);
                    const txHash = await walletClient.sendTransaction({
                      to: USDC_CONTRACT as `0x${string}`,
                      data: calldata,
                    });
                    console.log('[Offramp] txHash:', txHash);
                    const authToken = await getAccessToken();
                    const res = await fetch(`/api/orders/${orderId}/submit-usdc`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authToken ? `Bearer ${authToken}` : '',
                      },
                      body: JSON.stringify({ txHash }),
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.error || 'Failed to submit USDC transfer');
                    }
                    await fetchOrder();
                  } catch (err) {
                    console.error('[OrderPage] Send USDC error:', err);
                    alert(err instanceof Error ? err.message : 'Failed to send USDC');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending USDC...
                  </>
                ) : (
                  `Send ${order.usdc_amount} USDC to Merchant`
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* OFF-RAMP: Status USDC Sent - Waiting for merchant verification */}
        {order.type === 'offramp' && order.status === 'usdc_sent' && (
          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="text-yellow-500 flex items-center gap-2">
                <Clock className="w-5 h-5 animate-spin" />
                Verifying USDC Transfer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Your USDC transfer is being verified on-chain. 
                Transaction hash: <code className="text-xs bg-muted px-1 rounded">{order.usdc_tx_hash?.slice(0, 20)}...</code>
              </p>
              {order.usdc_tx_hash && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://sepolia.etherscan.io/tx/${order.usdc_tx_hash}`, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* OFF-RAMP: Status USDC Received - Waiting for INR */}
        {order.type === 'offramp' && order.status === 'usdc_received' && (
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle className="text-blue-500 flex items-center gap-2">
                <Clock className="w-5 h-5 animate-pulse" />
                Waiting for INR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                USDC verified! The merchant is sending ₹{order.fiat_amount} to your UPI ID: <strong>{order.user_upi_id}</strong>
              </p>
            </CardContent>
          </Card>
        )}

        {/* OFF-RAMP: Status Fiat Sent - Confirm INR Received */}
        {order.type === 'offramp' && order.status === 'fiat_sent' && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="text-green-500">Confirm INR Receipt</CardTitle>
              <CardDescription>
                Did you receive ₹{order.fiat_amount} in your bank account?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.payment_reference && (
                <p className="text-sm text-muted-foreground">
                  UPI Reference: <code className="bg-muted px-1 rounded">{order.payment_reference}</code>
                </p>
              )}
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={() => handleConfirmFiat(true)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Yes, Received
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleConfirmFiat(false)}
                  disabled={actionLoading}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  No, Dispute
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ON-RAMP: Status Pending - Waiting for merchant to accept */}
        {order.status === 'pending' && (
          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="text-yellow-500 flex items-center gap-2">
                <Clock className="w-5 h-5 animate-pulse" />
                Waiting for Merchant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your order is waiting for a merchant to accept. This usually takes less than a minute.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dispute Filing - available for active non-pending orders */}
        {!isCompleted && !isCancelled && !isExpired && order.status !== 'pending' && (
          <div className="mt-2">
            {!showDispute ? (
              <button
                onClick={() => setShowDispute(true)}
                className="text-sm text-red-500 hover:text-red-400 flex items-center gap-1 transition"
              >
                <Flag className="w-3 h-3" />
                File a dispute for this order
              </button>
            ) : (
              <FileDispute
                orderId={orderId}
                orderType={order.type}
                onDisputeFiled={() => { setShowDispute(false); fetchOrder(); }}
              />
            )}
          </div>
        )}

        {(isCancelled || isExpired) && (
          <Card className="border-red-500 bg-red-500/10">
            <CardHeader>
              <CardTitle className="text-red-500 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {isCancelled ? 'Order Cancelled' : 'Order Expired'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {isCancelled
                  ? 'This order was cancelled. You can create a new order from your dashboard.'
                  : 'This order expired before completion. Please create a new order.'}
              </p>
              <Button className="w-full" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
