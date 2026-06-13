'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth';
import { useEmbeddedWallet } from '@/lib/smart-wallet';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wallet, ArrowRight, Sparkles, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BuyForm() {
  const router = useRouter();
  const { user, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const embeddedWallet = useEmbeddedWallet();
  const [amountInr, setAmountInr] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Debug: log wallets on load
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      const embedded = wallets.find((w) => w.walletClientType === 'privy');
      if (embedded) {
        setWalletAddress(embedded.address);
      }
    }
  }, [wallets, walletsReady]);

  // Handle wallet creation
  const handleCreateWallet = async () => {
    try {
      setLoading(true);
      await createWallet();
    } catch (error) {
      console.error('[BuyForm] Error creating wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hardcoded rate for prototype: 1 USDC = 90 INR
  const EXCHANGE_RATE = 90;
  const usdcAmount = amountInr ? (parseFloat(amountInr) / EXCHANGE_RATE).toFixed(2) : '0.00';
  const inrValue = parseFloat(amountInr) || 0;

  const handleBuy = async () => {
    if (!ready || !user) {
      alert('Please wait for authentication');
      return;
    }

    if (!walletAddress && !embeddedWallet) {
      alert('Please create a wallet first');
      return;
    }

    if (!amountInr || parseFloat(amountInr) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'onramp',
          fiatAmount: parseFloat(amountInr),
          usdcAmount: parseFloat(usdcAmount),
          userWalletAddress: walletAddress || embeddedWallet?.address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const { order } = await response.json();
      router.push(`/order/${order.id}`);
    } catch (e) {
      console.error(e);
      alert('Failed to create order');
      setLoading(false);
    }
  };

  // Loading state
  if (!walletsReady) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="glass-card rounded-2xl p-8 border border-white/10 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-[#FF6B00] animate-spin" />
          </div>
        </div>
      </motion.div>
    );
  }

  // No wallet state
  if (!walletAddress) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="glass-card rounded-2xl p-8 border border-[#FF6B00]/20 bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-xl overflow-hidden relative">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B00]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B00]/30 to-[#FF8C38]/20 flex items-center justify-center mx-auto border border-[#FF6B00]/30"
            >
              <Wallet className="w-8 h-8 text-[#FF8C38]" />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Create Your Wallet</h2>
              <p className="text-sm text-white/60">Set up an embedded wallet to start trading</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateWallet}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white font-semibold text-sm shadow-lg shadow-[#FF6B00]/25 hover:shadow-[#FF6B00]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Creating Wallet...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Wallet
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-card rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-br from-black/90 via-black/80 to-[#FF6B00]/5 backdrop-blur-xl overflow-hidden relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-0 left-0 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-0 right-0 w-64 h-64 bg-[#FF8C38]/5 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 p-8 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center space-y-3"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-2 h-2 rounded-full bg-[#FF6B00]"
              />
              <span className="text-xs font-medium text-[#FF8C38] uppercase tracking-widest">On-Ramp</span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Buy USDC
            </h2>
            <p className="text-sm text-white/60 flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              Buy crypto directly from trusted peers.
            </p>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 text-xs text-white/40"
          >
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-400" />
              Secure
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>₹90/USDC</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Instant</span>
          </motion.div>

          {/* Amount Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {/* INR Input */}
            <div className="relative">
              <motion.div
                animate={{
                  borderColor: isFocused ? 'rgba(255, 107, 0, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isFocused ? '0 0 20px rgba(255, 107, 0, 0.15)' : 'none'
                }}
                className="rounded-2xl border bg-black/40 backdrop-blur-sm overflow-hidden"
              >
                <div className="p-5">
                  <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">
                    You Pay (INR)
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-white/60 font-light">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={amountInr}
                      onChange={(e) => setAmountInr(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      className="flex-1 bg-transparent text-4xl font-bold text-white placeholder:text-white/20 outline-none"
                    />
                  </div>
                </div>

                {/* Orange animated slider indicator */}
                <div className="relative h-1 bg-white/5 overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FF6B00] to-[#FF8C38]"
                    initial={{ width: "0%" }}
                    animate={{ width: inrValue > 0 ? `${Math.min((inrValue / 50000) * 100, 100)}%` : "0%" }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                  {/* Animated glow on the slider tip */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#FF6B00] shadow-lg shadow-[#FF6B00]/50"
                    animate={{
                      left: inrValue > 0 ? `${Math.min((inrValue / 50000) * 100, 100)}%` : "0%",
                      boxShadow: [
                        "0 0 10px rgba(255, 107, 0, 0.5)",
                        "0 0 20px rgba(255, 107, 0, 0.8)",
                        "0 0 10px rgba(255, 107, 0, 0.5)",
                      ]
                    }}
                    transition={{
                      left: { type: "spring", stiffness: 100, damping: 20 },
                      boxShadow: { duration: 1.5, repeat: Infinity }
                    }}
                  />
                </div>
              </motion.div>

              {/* Quick amount buttons */}
              <div className="flex gap-2 mt-3">
                {['1000', '5000', '10000', '25000'].map((amt) => (
                  <motion.button
                    key={amt}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAmountInr(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      amountInr === amt
                        ? 'bg-[#FF6B00]/30 text-[#FF8C38] border border-[#FF6B00]/50'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    ₹{parseInt(amt).toLocaleString()}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-10 h-10 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5 text-[#FF6B00] rotate-90" />
              </motion.div>
            </div>

            {/* USDC Output */}
            <div className="rounded-2xl border border-[#FF6B00]/20 bg-gradient-to-br from-[#FF6B00]/10 to-[#FF8C38]/5 p-5">
              <label className="text-xs text-[#FF8C38] uppercase tracking-wider font-medium mb-2 block">
                You Receive (USDC)
              </label>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={usdcAmount}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-white"
                >
                  {usdcAmount}
                </motion.span>
                <span className="text-lg text-[#FF8C38] font-medium">USDC</span>
              </div>
              <p className="text-xs text-white/40 mt-1">Sepolia Testnet</p>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBuy}
              disabled={loading || !amountInr || parseFloat(amountInr) <= 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white font-semibold text-sm shadow-lg shadow-[#FF6B00]/25 hover:shadow-[#FF6B00]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group overflow-hidden relative"
            >
              {/* Button shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />

              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Creating Order...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Proceed to Payment
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.span>
                  </span>
                )}
              </span>
            </motion.button>
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-white/30"
          >
            Rate locked for 10 minutes • No hidden fees
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}