'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEmbeddedWallet, getUSDCBalance } from '@/lib/smart-wallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Wallet, ArrowRightLeft, Shield, Zap, Users, CheckCircle2, ArrowUpRight, IndianRupee, Coins, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SellForm() {
  const router = useRouter();
  const { user, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const embeddedWallet = useEmbeddedWallet();
  
  const [amountUsdc, setAmountUsdc] = useState('');
  const [userUpiId, setUserUpiId] = useState('');
  const [defaultUpiId, setDefaultUpiId] = useState<string | null>(null);
  const [usingDefault, setUsingDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLoaded, setBalanceLoaded] = useState(false);

  // Exchange rate: 1 USDC = 90 INR
  const EXCHANGE_RATE = 90;
  const inrAmount = amountUsdc ? (parseFloat(amountUsdc) * EXCHANGE_RATE).toFixed(2) : '0.00';

  // Load default UPI from profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/users/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.default_upi_id) {
            setDefaultUpiId(data.user.default_upi_id);
            setUserUpiId(data.user.default_upi_id);
            setUsingDefault(true);
          }
        }
      } catch {}
    };
    loadProfile();
  }, []);

  // Get wallet address and balance
  useEffect(() => {
    if (walletsReady && wallets && wallets.length > 0) {
      const embedded = wallets.find((w) => w.walletClientType === 'privy');
      if (embedded) {
        setWalletAddress(embedded.address);
        fetchBalance(embedded);
      }
    }
  }, [wallets, walletsReady]);

  const fetchBalance = async (wallet: any) => {
    console.log('[SellForm] fetchBalance START - wallet:', wallet?.address);
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const balance = await getUSDCBalance(wallet);
      console.log('[SellForm] Balance fetched:', balance);
      setUsdcBalance(balance);
      setBalanceLoaded(true);
    } catch (error: any) {
      console.error('[SellForm] Error fetching balance:', error);
      console.error('[SellForm] Error message:', error?.message);
      console.error('[SellForm] Error stack:', error?.stack);
      setBalanceError(`Failed to load balance: ${error?.message || 'Unknown error'}`);
      setBalanceLoaded(false);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleSell = async () => {
    if (!ready || !user) {
      alert('Please wait for authentication');
      return;
    }

    if (!walletAddress || !embeddedWallet) {
      alert('Wallet not available');
      return;
    }

    const usdcAmt = parseFloat(amountUsdc);
    if (!amountUsdc || usdcAmt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Check balance
    const balance = parseFloat(usdcBalance);
    if (usdcAmt > balance) {
      alert(`Insufficient balance. You have ${usdcBalance} USDC`);
      return;
    }

    if (!userUpiId || userUpiId.length < 5) {
      alert('Please enter a valid UPI ID');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'offramp',
          fiatAmount: parseFloat(inrAmount),
          usdcAmount: usdcAmt,
          userWalletAddress: walletAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const { order } = await response.json();

      // Save user UPI ID separately
      await fetch(`/api/orders/${order.id}/update-upi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUpiId }),
      });

      router.push(`/order/${order.id}`);
    } catch (e) {
      console.error('[SellForm] Error:', e);
      alert(e instanceof Error ? e.message : 'Failed to create order');
      setLoading(false);
    }
  };

  const refreshBalance = () => {
    if (embeddedWallet) {
      fetchBalance(embeddedWallet);
    }
  };

  // Quick amount buttons
  const quickAmounts = [10, 25, 50, 100];

  const setQuickAmount = (amount: number) => {
    const maxAmount = parseFloat(usdcBalance);
    if (amount <= maxAmount) {
      setAmountUsdc(amount.toString());
    } else {
      setAmountUsdc(maxAmount.toString());
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative">
      {/* Animated Background Elements */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-black/90 via-black/80 to-emerald-500/5 backdrop-blur-xl overflow-hidden relative"
      >
        {/* Ambient gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5 pointer-events-none" />
        
        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-3xl opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent)',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <div className="p-8 relative z-10">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-green-500/20 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
              >
                <ArrowUpRight className="w-7 h-7 text-emerald-400" />
              </motion.div>
            </div>
            
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Sell Crypto
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/50 text-sm"
            >
              Sell crypto directly to trusted peers.
            </motion.p>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-4 mt-4"
            >
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span>Instant</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>P2P</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Wallet Status */}
          <AnimatePresence mode="wait">
            {!walletsReady ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-center gap-3"
              >
                <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
                <span className="text-sm text-white/70">Loading wallet...</span>
              </motion.div>
            ) : !walletAddress ? (
              <motion.div
                key="no-wallet"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center gap-3"
              >
                <Wallet className="w-5 h-5 text-red-400" />
                <span className="text-sm text-white/70">No wallet found</span>
              </motion.div>
            ) : (
              <motion.div
                key="wallet-ready"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Wallet Connected</p>
                    <p className="text-xs font-mono text-emerald-400">
                      {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40">Balance</p>
                  <p className="text-sm font-semibold text-white">
                    {balanceLoading ? '...' : `${usdcBalance} USDC`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* USDC Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-white/70 mb-2">
              Amount to Sell
            </label>
            <div className="relative">
              <motion.div
                whileFocus={{ scale: 1.01 }}
                className="relative"
              >
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountUsdc}
                  onChange={(e) => setAmountUsdc(e.target.value)}
                  className="h-16 text-2xl font-bold bg-black/40 border-white/10 text-white placeholder:text-white/20 rounded-xl pr-24 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-medium text-emerald-400">USDC</span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAmountUsdc(usdcBalance)}
                    className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                  >
                    MAX
                  </motion.button>
                </div>
              </motion.div>
              
              {/* Animated border on focus */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{
                  boxShadow: amountUsdc 
                    ? '0 0 20px rgba(16, 185, 129, 0.15)' 
                    : '0 0 0px rgba(16, 185, 129, 0)'
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            {amountUsdc && balanceLoaded && parseFloat(amountUsdc) > parseFloat(usdcBalance) && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 mt-2 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                Amount exceeds your balance ({usdcBalance} USDC available)
              </motion.p>
            )}
            {balanceError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-yellow-400 mt-2"
              >
                ⚠️ {balanceError}
              </motion.p>
            )}

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-3">
              {quickAmounts.map((amount) => (
                <motion.button
                  key={amount}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQuickAmount(amount)}
                  className="flex-1 py-2 text-xs font-medium bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                >
                  {amount} USDC
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* UPI ID Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white/70">
                Your UPI ID
              </label>
              {defaultUpiId && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (usingDefault) {
                      setUsingDefault(false);
                      setUserUpiId('');
                    } else {
                      setUsingDefault(true);
                      setUserUpiId(defaultUpiId);
                    }
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {usingDefault ? 'Use different' : 'Use default'}
                </motion.button>
              )}
            </div>
            <div className="relative">
              <Input
                type="text"
                placeholder="yourname@upi"
                value={userUpiId}
                onChange={(e) => { setUserUpiId(e.target.value); setUsingDefault(false); }}
                className="h-14 bg-black/40 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all font-mono"
              />
              {usingDefault && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </motion.div>
              )}
            </div>
            <p className="text-xs text-white/40 mt-2">
              Enter the UPI ID where you want to receive INR
            </p>
          </motion.div>

          {/* INR Output */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                You Receive
              </span>
              <span className="text-xs text-white/40">Rate: ₹{EXCHANGE_RATE}/USDC</span>
            </div>
            <motion.div
              key={inrAmount}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-white"
            >
              ₹{inrAmount}
            </motion.div>
          </motion.div>

          {/* Info Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80 mb-1">How it works</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  You send USDC first from your wallet. Once the merchant receives it, 
                  they will send INR to your UPI ID. The process is escrow-protected.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSell}
              disabled={
                loading ||
                !amountUsdc ||
                !walletAddress ||
                !userUpiId ||
                parseFloat(amountUsdc) <= 0 ||
                (balanceLoaded && parseFloat(amountUsdc) > parseFloat(usdcBalance))
              }
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 overflow-hidden relative group"
            >
              {/* Button shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    Create Sell Order
                  </>
                )}
              </span>
            </motion.button>
          </motion.div>

          {/* Security Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 text-center"
          >
            <p className="text-xs text-white/30 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Escrow protected • Instant settlement
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
