'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivy } from '@privy-io/react-auth';
import { CheckCircle2, Clock, AlertCircle, Loader2, Copy, ExternalLink } from 'lucide-react';

type OrderStatus = 'pending' | 'merchant_accepted' | 'payment_sent' | 'payment_confirmed' | 'usdc_transferred' | 'completed' | 'cancelled' | 'expired';

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

const STATUS_STEPS: { status: OrderStatus; label: string; description: string }[] = [
  { status: 'pending', label: 'Order Created', description: 'Waiting for merchant to accept' },
  { status: 'merchant_accepted', label: 'Merchant Accepted', description: 'Pay via UPI, then confirm' },
  { status: 'payment_sent', label: 'Payment Submitted', description: 'Merchant verifying payment' },
  { status: 'payment_confirmed', label: 'Payment Confirmed', description: 'Transferring USDC...' },
  { status: 'completed', label: 'Completed', description: 'USDC transferred to your wallet!' },
];

export default function UserOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { ready: privyReady, authenticated } = usePrivy();
  const orderId = params.id as string;

  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Poll for updates (every 5 seconds)
  useEffect(() => {
    if (!data || data.order.status === 'completed' || data.order.status === 'cancelled') {
      return;
    }

    const interval = setInterval(fetchOrder, 5000);
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
      const response = await fetch(`/api/orders/${orderId}/submit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (data?.merchant?.upi_id) {
      navigator.clipboard.writeText(data.merchant.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get current step index
  const getCurrentStep = () => {
    if (!data) return 0;
    const idx = STATUS_STEPS.findIndex(s => s.status === data.order.status);
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
              Buy {order.usdc_amount} USDC for ₹{order.fiat_amount}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">You Pay</p>
                <p className="text-2xl font-bold">₹{order.fiat_amount}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">You Receive</p>
                <p className="text-2xl font-bold text-green-500">{order.usdc_amount} USDC</p>
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
              {STATUS_STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isComplete = index < currentStep || isCompleted;
                const isPending = index > currentStep;

                return (
                  <div key={step.status} className="flex items-start gap-4">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
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
        
        {/* Status: Merchant Accepted - Show UPI payment form */}
        {order.status === 'merchant_accepted' && merchant && (
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
                    {merchant.upi_id}
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
                {order.usdc_amount} USDC has been transferred to your wallet.
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

        {/* Status: Pending - Waiting for merchant to accept */}
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
      </main>
    </div>
  );
}
