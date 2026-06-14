'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { usePrivy, useWallets, getAccessToken } from '@privy-io/react-auth';
import { encodeFunctionData, parseUnits } from 'viem';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Copy, 
  ExternalLink, 
  Flag, 
  ArrowLeft, 
  ArrowDownLeft,
  ArrowUpRight,
  Wallet, 
  IndianRupee, 
  RefreshCw,
  Shield,
  Zap,
  Users
} from 'lucide-react';
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
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl"
          />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B00]/30 to-[#FF8C38]/20 flex items-center justify-center border border-[#FF6B00]/30">
            <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden p-4">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"
          />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="glass-card rounded-2xl p-8 border border-red-500/30 bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/30 to-red-400/20 flex items-center justify-center mx-auto border border-red-500/30">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Error</h2>
              <p className="text-white/60">{error}</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </motion.button>
            </div>
          </div>
        </motion.div>
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
  const steps = order.type === 'offramp' ? OFFRAMP_STEPS : ONRAMP_STEPS;

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'cancelled':
      case 'expired':
        return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'pending':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      default:
        return 'text-[#FF8C38] border-[#FF6B00]/30 bg-[#FF6B00]/10';
    }
  };

  const getStatusIcon = () => {
    switch (order.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'cancelled':
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
      default:
        return <Zap className="w-5 h-5 text-[#FF8C38]" />;
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 right-0 w-64 h-64 bg-[#FF8C38]/5 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </motion.button>

          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-2 h-2 rounded-full bg-[#FF6B00]"
            />
            <span className="text-sm font-medium text-white/80">
              Order #{orderId.slice(0, 8)}
            </span>
          </div>

          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Order Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-br from-black/90 via-black/80 to-[#FF6B00]/5 backdrop-blur-xl overflow-hidden"
        >
          <div className="p-6 space-y-6">
            {/* Header with status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getStatusColor(order.status)}`}>
                  {order.type === 'onramp' ? (
                    <ArrowDownLeft className="w-6 h-6 text-[#FF8C38]" />
                  ) : (
                    <ArrowUpRight className="w-6 h-6 text-green-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {order.type === 'onramp' ? 'On-Ramp Order' : 'Off-Ramp Order'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon()}
                    <span className={`text-sm font-medium ${
                      order.status === 'completed' ? 'text-green-400' :
                      order.status === 'cancelled' || order.status === 'expired' ? 'text-red-400' :
                      order.status === 'pending' ? 'text-yellow-400' :
                      'text-[#FF8C38]'
                    }`}>
                      {steps[currentStep]?.label || order.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40 uppercase tracking-wider">Created</p>
                <p className="text-sm text-white/60">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Exchange amount display */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-white/10 bg-black/40 p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/40 uppercase tracking-wider">You Pay</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  ₹{order.fiat_amount.toLocaleString()}
                </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-[#FF6B00]/30 bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C38]/5 p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-[#FF8C38]" />
                  <span className="text-xs text-[#FF8C38] uppercase tracking-wider">You Receive</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {order.usdc_amount} <span className="text-lg text-[#FF8C38]">USDC</span>
                </p>
              </motion.div>
            </div>

            {/* Rate info */}
            <div className="flex items-center justify-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Rate: ₹90/USDC
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-400" />
                Escrow Protected
              </span>
            </div>
          </div>
        </motion.div>

        {/* Progress Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-2 h-2 rounded-full bg-[#FF6B00]"
            />
            Order Progress
          </h3>

          <div className="relative">
            {/* Progress line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10">
              <motion.div
                className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#FF6B00] to-[#FF8C38]"
                initial={{ height: "0%" }}
                animate={{ height: `${(currentStep / (steps.length - 1)) * 100}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
              />
            </div>

            <div className="space-y-6">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isComplete = index < currentStep || isCompleted;
                const isPending = index > currentStep;

                return (
                  <motion.div
                    key={step.status}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="relative flex items-start gap-4 pl-12"
                  >
                    {/* Step indicator */}
                    <div className={`
                      absolute left-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                      ${isComplete ? 'bg-green-500/20 border-green-500 text-green-400' : ''}
                      ${isActive ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF8C38] shadow-lg shadow-[#FF6B00]/20' : ''}
                      ${isPending ? 'bg-black/50 border-white/20 text-white/40' : ''}
                    `}>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`
                      flex-1 p-4 rounded-xl border transition-all duration-300
                      ${isActive ? 'bg-[#FF6B00]/5 border-[#FF6B00]/20' : ''}
                      ${isComplete ? 'bg-green-500/5 border-green-500/20' : ''}
                      ${isPending ? 'bg-black/20 border-white/5' : ''}
                    `}>
                      <p className={`font-semibold ${
                        isActive ? 'text-[#FF8C38]' :
                        isComplete ? 'text-green-400' :
                        'text-white/60'
                      }`}>
                        {step.label}
                      </p>
                      <p className={`text-sm mt-1 ${
                        isActive ? 'text-white/80' :
                        isComplete ? 'text-white/60' :
                        'text-white/40'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Action Area - depends on status */}
        
        {/* Status: Merchant Accepted - Show UPI payment form (onramp only) */}
        {order.type === 'onramp' && order.status === 'accepted' && merchant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-[#FF6B00]/30 bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C38]/5 backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/20 border border-[#FF6B00]/30 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-[#FF8C38]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Pay via UPI</h3>
                <p className="text-sm text-white/60">Send ₹{order.fiat_amount} to complete your order</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Merchant UPI */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/40">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Merchant UPI ID</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 font-mono text-lg text-white">
                    {merchantUpi}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={copyUpiId}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/60" />}
                  </motion.button>
                </div>
              </div>

              {/* Payment Reference Input */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">UPI Transaction Reference</p>
                <Input
                  placeholder="Enter UPI transaction ID after payment"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-white/30 rounded-xl h-12"
                />
                <p className="text-xs text-white/40 mt-2">
                  Find this 12-digit reference in your UPI app after completing payment
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitPayment}
                disabled={actionLoading || !paymentReference.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white font-semibold text-sm shadow-lg shadow-[#FF6B00]/25 hover:shadow-[#FF6B00]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 overflow-hidden relative"
              >
                {/* Button shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      I've Paid - Submit Reference
                    </>
                  )}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Status: Payment Sent - Waiting for merchant */}
        {order.status === 'payment_sent' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-yellow-500/30 bg-yellow-500/5 backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                <Clock className="w-7 h-7 text-yellow-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-400">Verifying Payment</h3>
                <p className="text-sm text-white/60 mt-1">
                  Reference <code className="bg-white/10 px-2 py-0.5 rounded text-yellow-400">{order.payment_reference}</code>
                </p>
                <p className="text-sm text-white/40 mt-2">Merchant is confirming your UPI payment...</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Status: Payment Confirmed - Transferring USDC */}
        {(order.status === 'payment_confirmed' || order.status === 'usdc_transferred') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-400">Transferring USDC</h3>
                <p className="text-sm text-white/60 mt-1">Payment confirmed!</p>
                <p className="text-sm text-white/40 mt-2">USDC is being sent to your wallet on Sepolia...</p>
              </div>
            </div>
            {order.tx_hash && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Transaction Hash</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-black/40 rounded-lg text-sm text-white/80 font-mono break-all">
                    {order.tx_hash}
                  </code>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.open(`https://sepolia.etherscan.io/tx/${order.tx_hash}`, '_blank')}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <ExternalLink className="w-5 h-5 text-white/60" />
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Status: Completed */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="glass-card rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-xl p-6"
          >
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </motion.div>

              <div>
                <h3 className="text-2xl font-bold text-white">Order Complete!</h3>
                <p className="text-white/60 mt-2">
                  {order.type === 'offramp'
                    ? `₹${order.fiat_amount} sent to your UPI account`
                    : `${order.usdc_amount} USDC transferred to your wallet`}
                </p>
              </div>

              {order.tx_hash && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/40">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Transaction Hash</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-black/40 rounded text-sm text-white/80 font-mono break-all">
                      {order.tx_hash}
                    </code>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.open(`https://sepolia.etherscan.io/tx/${order.tx_hash}`, '_blank')}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <ExternalLink className="w-4 h-4 text-white/60" />
                    </motion.button>
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard')}
                className="w-full py-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* OFF-RAMP: Status Accepted - Send USDC client-side */}
        {order.type === 'offramp' && order.status === 'accepted' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Send USDC</h3>
                <p className="text-sm text-white/60">Send {order.usdc_amount} USDC to the merchant</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Info box */}
              <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-white/80">
                    <strong className="text-white">Important:</strong> Send USDC from your wallet first. 
                    The merchant will send ₹{order.fiat_amount} to your UPI after receiving USDC.
                  </p>
                </div>
              </div>

              {/* UPI ID display */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/40">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Your UPI ID for receiving INR</p>
                <div className="font-mono text-lg text-white">
                  {order.user_upi_id || 'Not set'}
                </div>
              </div>

              {/* Merchant wallet info if available */}
              {merchant?.wallet_address && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/40">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Merchant Wallet</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm text-white/60 break-all">
                      {merchant.wallet_address.slice(0, 12)}...{merchant.wallet_address.slice(-8)}
                    </code>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        navigator.clipboard.writeText(merchant.wallet_address || '');
                      }}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <Copy className="w-4 h-4 text-white/60" />
                    </motion.button>
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
                    const usdcAmount = parseUnits(String(order.usdc_amount), 6);
                    const calldata = encodeFunctionData({
                      abi: ERC20_TRANSFER_ABI,
                      functionName: 'transfer',
                      args: [merchantWalletAddress as `0x${string}`, usdcAmount],
                    });
                    console.log('[Offramp] Sending USDC tx — amount:', order.usdc_amount, 'to:', merchantWalletAddress);
                    // Use provider directly - works reliably with Privy's signatureless mode
                    const txHash = await provider.request({
                      method: 'eth_sendTransaction',
                      params: [{
                        from: embeddedWallet.address,
                        to: USDC_CONTRACT,
                        data: calldata,
                      }],
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
                className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 overflow-hidden relative"
              >
                {/* Button shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending USDC...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-5 h-5" />
                      Send {order.usdc_amount} USDC
                    </>
                  )}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* OFF-RAMP: Status USDC Sent - Waiting for merchant verification */}
        {order.type === 'offramp' && order.status === 'usdc_sent' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-yellow-500/30 bg-yellow-500/5 backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-yellow-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-400">Verifying USDC Transfer</h3>
                <p className="text-sm text-white/60 mt-1">Your transfer is being confirmed on-chain...</p>
                <p className="text-sm text-white/40 mt-2">This usually takes a few moments</p>
              </div>
            </div>
            {order.usdc_tx_hash && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Transaction Hash</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-black/40 rounded-lg text-sm text-white/80 font-mono break-all">
                    {order.usdc_tx_hash}
                  </code>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.open(`https://sepolia.etherscan.io/tx/${order.usdc_tx_hash}`, '_blank')}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <ExternalLink className="w-5 h-5 text-white/60" />
                  </motion.button>
                </div>
              </div>
            )}
            {/* Animated progress dots */}
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-yellow-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* OFF-RAMP: Status USDC Received - Waiting for INR */}
        {order.type === 'offramp' && order.status === 'usdc_received' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Clock className="w-7 h-7 text-blue-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-400">Sending INR</h3>
                <p className="text-sm text-white/60 mt-1">USDC transfer verified!</p>
                <p className="text-sm text-white/40 mt-2">
                  Merchant is sending ₹{order.fiat_amount} to <code className="bg-white/10 px-2 py-0.5 rounded text-blue-400">{order.user_upi_id}</code>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* OFF-RAMP: Status Fiat Sent - Confirm INR Received */}
        {order.type === 'offramp' && order.status === 'fiat_sent' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Confirm Receipt</h3>
                <p className="text-sm text-white/60">Did you receive ₹{order.fiat_amount}?</p>
              </div>
            </div>

            <div className="space-y-4">
              {order.payment_reference && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/40">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">UPI Reference</p>
                  <code className="font-mono text-lg text-white">{order.payment_reference}</code>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConfirmFiat(true)}
                  disabled={actionLoading}
                  className="py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  Yes, Received
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConfirmFiat(false)}
                  disabled={actionLoading}
                  className="py-4 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-red-500/20 hover:border-red-500/30 border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  No, Dispute
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ON-RAMP: Status Pending - Waiting for merchant to accept */}
        {order.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-yellow-500/30 bg-yellow-500/5 backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-yellow-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-400">Finding a Merchant</h3>
                <p className="text-sm text-white/60 mt-1">Your order is being matched...</p>
                <p className="text-sm text-white/40 mt-2">This usually takes less than a minute</p>
              </div>
            </div>
            {/* Animated progress dots */}
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-yellow-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
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
