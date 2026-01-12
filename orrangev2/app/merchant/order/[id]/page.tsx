'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { usePrivy } from '@privy-io/react-auth';
import { CheckCircle2, Clock, AlertCircle, Loader2, Copy, ExternalLink, IndianRupee, Wallet } from 'lucide-react';

type OrderStatus = 'pending' | 'accepted' | 'payment_sent' | 'payment_confirmed' | 'usdc_transferred' | 'completed' | 'cancelled' | 'expired';

interface OrderData {
  order: {
    id: string;
    type: 'onramp' | 'offramp';
    fiat_amount: number;
    usdc_amount: number;
    status: OrderStatus;
    payment_reference?: string;
    tx_hash?: string;
    created_at: string;
    merchant_accepted_at?: string;
    payment_confirmed_at?: string;
    usdc_sent_at?: string;
    completed_at?: string;
    custom_upi_id?: string;
  };
  merchant: {
    upi_id: string;
  } | null;
  user: {
    email: string;
    wallet_address: string;
  } | null;
  accessType: 'user' | 'merchant';
}

export default function MerchantOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { ready: privyReady, authenticated } = usePrivy();
  const orderId = params.id as string;

  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customPaymentRef, setCustomPaymentRef] = useState('');
  const [useCustomRef, setUseCustomRef] = useState(false);

  // Fetch order data via API
  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch order');
      }

      const orderData = await response.json();
      
      // If user is viewing, redirect to user order page
      if (orderData.accessType === 'user') {
        router.push(`/order/${orderId}`);
        return;
      }

      setData(orderData);
      setError(null);
    } catch (err) {
      console.error('[MerchantOrderPage] Error:', err);
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
    if (!data || data.order.status === 'completed' || data.order.status === 'cancelled') {
      return;
    }

    const interval = setInterval(fetchOrder, 2000);
    return () => clearInterval(interval);
  }, [data, fetchOrder]);

  // Accept order
  const handleAcceptOrder = async () => {
    setActionLoading('accept');
    try {
      const response = await fetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to accept order');
      }

      await fetchOrder();
    } catch (err) {
      console.error('[MerchantOrderPage] Accept error:', err);
      alert(err instanceof Error ? err.message : 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  // Confirm payment received
  const handleConfirmPayment = async () => {
    setActionLoading('confirm');
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to confirm payment');
      }

      await fetchOrder();
    } catch (err) {
      console.error('[MerchantOrderPage] Confirm error:', err);
      alert(err instanceof Error ? err.message : 'Failed to confirm payment');
    } finally {
      setActionLoading(null);
    }
  };

  // Retry USDC transfer for stuck orders
  const handleRetryTransfer = async () => {
    setActionLoading('retry');
    try {
      const response = await fetch(`/api/orders/${orderId}/retry-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to retry transfer');
      }

      await fetchOrder();
      alert('Transfer retry successful!');
    } catch (err) {
      console.error('[MerchantOrderPage] Retry error:', err);
      alert(err instanceof Error ? err.message : 'Failed to retry transfer');
    } finally {
      setActionLoading(null);
    }
  };

  // Copy payment reference
  const copyRef = () => {
    if (data?.order.payment_reference) {
      navigator.clipboard.writeText(data.order.payment_reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
            <Button onClick={() => router.push('/merchant')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { order, user: orderUser } = data;
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Order #{orderId.slice(0, 8)}</h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/merchant')}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Customer wants to buy {order.usdc_amount} USDC
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <IndianRupee className="w-4 h-4" /> You Receive
                </p>
                <p className="text-2xl font-bold text-green-500">₹{order.fiat_amount}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-4 h-4" /> You Send
                </p>
                <p className="text-2xl font-bold">{order.usdc_amount} USDC</p>
              </div>
            </div>

            {/* Customer Info */}
            {orderUser && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{orderUser.email}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  Wallet: {orderUser.wallet_address}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              order.status === 'pending' ? 'bg-yellow-500/10 border border-yellow-500/20' :
              order.status === 'accepted' ? 'bg-blue-500/10 border border-blue-500/20' :
              order.status === 'payment_sent' ? 'bg-orange-500/10 border border-orange-500/20' :
              order.status === 'completed' ? 'bg-green-500/10 border border-green-500/20' :
              'bg-muted'
            }`}>
              {order.status === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
              {order.status === 'accepted' && <Clock className="w-5 h-5 text-blue-500" />}
              {order.status === 'payment_sent' && <AlertCircle className="w-5 h-5 text-orange-500" />}
              {(order.status === 'payment_confirmed' || order.status === 'usdc_transferred') && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
              {order.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              
              <div>
                <p className="font-medium">
                  {order.status === 'pending' && 'Waiting for you to accept'}
                  {order.status === 'accepted' && 'Waiting for customer payment'}
                  {order.status === 'payment_sent' && 'Payment submitted - verify and confirm'}
                  {order.status === 'payment_confirmed' && 'Processing USDC transfer...'}
                  {order.status === 'usdc_transferred' && 'Finalizing order...'}
                  {order.status === 'completed' && 'Order completed!'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards based on status */}

        {/* Status: Pending - Accept order */}
        {order.status === 'pending' && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">Accept This Order?</CardTitle>
              <CardDescription>
                You'll receive ₹{order.fiat_amount} via UPI and send {order.usdc_amount} USDC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                size="lg"
                onClick={handleAcceptOrder}
                disabled={actionLoading === 'accept'}
              >
                {actionLoading === 'accept' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Order'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status: Merchant Accepted - Waiting for payment */}
        {order.status === 'accepted' && (
          <>
            <Card className="border-blue-500">
              <CardHeader>
                <CardTitle className="text-blue-500">Your UPI ID for Payment</CardTitle>
                <CardDescription>
                  Share this with the customer or they should already have it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* UPI ID */}
                {data.merchant?.upi_id && (
                  <div>
                    <Label>UPI ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 p-3 bg-muted rounded-lg font-mono font-medium text-lg">
                        {data.order.custom_upi_id || data.merchant.upi_id}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText((data.order.custom_upi_id || data.merchant!.upi_id));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Payment Reference Options */}
                <div className="space-y-3">
                  <Label>Expected Payment Reference (Optional)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="useDefaultRef"
                        checked={!useCustomRef}
                        onChange={() => setUseCustomRef(false)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="useDefaultRef" className="text-sm">
                        Use default UPI ID as reference: <code className="bg-muted px-2 py-1 rounded">{data.merchant?.upi_id}</code>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="useCustomRef"
                        checked={useCustomRef}
                        onChange={() => setUseCustomRef(true)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="useCustomRef" className="text-sm">
                        Use custom payment reference
                      </label>
                    </div>
                    {useCustomRef && (
                      <Input
                        placeholder="Enter custom payment reference/ID"
                        value={customPaymentRef}
                        onChange={(e) => setCustomPaymentRef(e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 This will be shown to the customer and should match what they enter after payment
                  </p>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm">
                    ⏳ Waiting for customer to send payment...
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Status: Payment Sent - Confirm payment */}
        {order.status === 'payment_sent' && (
          <Card className="border-orange-500">
            <CardHeader>
              <CardTitle className="text-orange-500">Payment Submitted - Verify!</CardTitle>
              <CardDescription>
                The customer claims to have paid. Check your UPI app and confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Reference */}
              <div>
                <Label>Payment Reference / UPI Transaction ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono">
                    {order.payment_reference || 'No reference provided'}
                  </div>
                  {order.payment_reference && (
                    <Button variant="outline" size="icon" onClick={copyRef}>
                      {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ Only confirm if you've received ₹{order.fiat_amount} in your UPI account.
                  USDC will be automatically sent to the customer after confirmation.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleConfirmPayment}
                disabled={actionLoading === 'confirm'}
              >
                {actionLoading === 'confirm' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "I've Received ₹" + order.fiat_amount + " - Confirm"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status: Processing USDC */}
        {(order.status === 'payment_confirmed' || order.status === 'usdc_transferred') && (
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle className="text-blue-500 flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing USDC Transfer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your payment confirmation has been received. USDC is being transferred to the customer's wallet.
                This usually takes a few seconds.
              </p>
              
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ If the transfer is stuck for more than 30 seconds, you can retry it manually.
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleRetryTransfer}
                disabled={actionLoading === 'retry'}
              >
                {actionLoading === 'retry' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Retrying Transfer...
                  </>
                ) : (
                  'Retry USDC Transfer'
                )}
              </Button>
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
                {order.usdc_amount} USDC has been transferred to the customer.
                You received ₹{order.fiat_amount} via UPI.
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

              <Button className="w-full" onClick={() => router.push('/merchant')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
