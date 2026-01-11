'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@/lib/client';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

type OrderStatus = 'pending' | 'merchant_accepted' | 'payment_sent' | 'payment_confirmed' | 'usdc_transferred' | 'completed' | 'cancelled' | 'expired';

interface Order {
  id: string;
  user_id: string;
  merchant_id: string;
  type: 'onramp' | 'offramp';
  fiat_amount: number;
  usdc_amount: number;
  status: OrderStatus;
  payment_reference?: string;
  tx_hash?: string;
  merchant_accepted_at?: string;
  payment_confirmed_at?: string;
  usdc_sent_at?: string;
  completed_at?: string;
  created_at: string;
}

interface Merchant {
  upi_id: string;
}

interface User {
  id: string;
  privy_user_id: string;
  user_type: string;
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const { user: privyUser, ready: privyReady } = usePrivy();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentReference, setPaymentReference] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch order and related data
  useEffect(() => {
    if (!privyReady || !privyUser) return;

    const fetchOrderData = async () => {
      try {
        // Get current user
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('privy_user_id', privyUser.id)
          .single();

        setCurrentUser(userData);

        // Get order
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderData) {
          setOrder(orderData);

          // Get merchant details
          const { data: merchantData } = await supabase
            .from('merchants')
            .select('upi_id')
            .eq('id', orderData.merchant_id)
            .single();

          setMerchant(merchantData);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [privyReady, privyUser, orderId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload: any) => {
          console.log('[Realtime] Order updated:', payload.new);
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Merchant accepts order
  const handleAcceptOrder = async () => {
    setActionLoading('accept');
    try {
      const response = await fetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  // User submits payment reference
  const handleSubmitPayment = async () => {
    if (!paymentReference.trim()) {
      alert('Please enter payment reference');
      return;
    }

    setActionLoading('payment');
    try {
      const response = await fetch(`/api/orders/${orderId}/submit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentReference }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit payment');
      }

      setPaymentReference('');
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment');
    } finally {
      setActionLoading(null);
    }
  };

  // Merchant confirms payment
  const handleConfirmPayment = async () => {
    setActionLoading('confirm');
    try {
      const response = await fetch(`/api/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'cancelled':
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: OrderStatus) => {
    const statusMap: Record<OrderStatus, string> = {
      pending: 'Waiting for merchant',
      merchant_accepted: 'Merchant accepted - please pay',
      payment_sent: 'Payment submitted - awaiting confirmation',
      payment_confirmed: 'Payment confirmed - processing USDC',
      usdc_transferred: 'USDC sent - finalizing',
      completed: 'Order completed',
      cancelled: 'Order cancelled',
      expired: 'Order expired',
    };
    return statusMap[status] || status;
  };

  const isMerchant = currentUser?.user_type === 'merchant';
  const isUserOrder = currentUser?.id === order?.user_id;

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Order not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
              <CardDescription>
                {new Date(order.created_at).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <span className="font-medium">{getStatusText(order.status)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold">₹{order.fiat_amount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">USDC</p>
              <p className="text-2xl font-bold">{order.usdc_amount} USDC</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Order Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {order.merchant_accepted_at && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Merchant Accepted</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.merchant_accepted_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {order.payment_reference && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Payment Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    Reference: {order.payment_reference}
                  </p>
                </div>
              </div>
            )}

            {order.payment_confirmed_at && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Payment Confirmed</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.payment_confirmed_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {order.usdc_sent_at && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">USDC Transferred</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.usdc_sent_at).toLocaleString()}
                  </p>
                  {order.tx_hash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${order.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      View on Etherscan →
                    </a>
                  )}
                </div>
              </div>
            )}

            {order.completed_at && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Order Completed</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.completed_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Merchant Actions */}
          {isMerchant && order.status === 'pending' && (
            <div className="pt-4 border-t">
              <Button
                onClick={handleAcceptOrder}
                disabled={actionLoading === 'accept'}
                className="w-full"
              >
                {actionLoading === 'accept' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Accept Order
              </Button>
            </div>
          )}

          {/* User Payment Submission */}
          {isUserOrder && order.status === 'merchant_accepted' && merchant && (
            <div className="pt-4 border-t space-y-4">
              <div>
                <p className="font-medium mb-2">Pay to merchant UPI:</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-mono text-lg">{merchant.upi_id}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Payment Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter UPI transaction ID"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <Button
                onClick={handleSubmitPayment}
                disabled={actionLoading === 'payment'}
                className="w-full"
              >
                {actionLoading === 'payment' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Payment
              </Button>
            </div>
          )}

          {/* Merchant Confirm Payment */}
          {isMerchant && order.status === 'payment_sent' && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Payment reference: <span className="font-mono">{order.payment_reference}</span>
              </p>
              <Button
                onClick={handleConfirmPayment}
                disabled={actionLoading === 'confirm'}
                className="w-full"
              >
                {actionLoading === 'confirm' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm Payment Received
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
