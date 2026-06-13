'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, DollarSign, IndianRupee, CheckCircle2, Loader2 } from 'lucide-react';

interface Order {
  amount: number;
  delay: number;
}

const SAMPLE_ORDERS: Order[] = [
  { amount: 50, delay: 3000 },
  { amount: 125, delay: 4000 },
  { amount: 75, delay: 3500 },
  { amount: 200, delay: 4500 },
  { amount: 30, delay: 3000 },
];

const RATE = 90; // 1 USDC = 90 INR

type Status = 'typing' | 'calculating' | 'ready' | 'matched';

export function LiveConversionCard() {
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [isOfframp, setIsOfframp] = useState(true);
  const [sendAmount, setSendAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [status, setStatus] = useState<Status>('typing');
  
  const currentOrder = SAMPLE_ORDERS[currentOrderIndex];
  const targetAmount = currentOrder.amount.toString();
  
  // Calculate what should be received
  const calculateReceive = (amount: number) => {
    if (isOfframp) {
      return (amount * RATE).toLocaleString();
    } else {
      return Math.floor(amount / RATE).toString();
    }
  };

  // Main animation sequence
  useEffect(() => {
    let isActive = true;
    
    const runSequence = async () => {
      // Reset states
      setSendAmount('');
      setReceiveAmount('');
      setStatus('typing');
      
      // Type the send amount
      const typeInterval = setInterval(() => {
        if (!isActive) {
          clearInterval(typeInterval);
          return;
        }
        
        setSendAmount(prev => {
          if (prev.length >= targetAmount.length) {
            clearInterval(typeInterval);
            return targetAmount;
          }
          return targetAmount.slice(0, prev.length + 1);
        });
      }, 120);
      
      // Wait for typing to complete
      await new Promise(r => setTimeout(r, targetAmount.length * 120 + 200));
      
      if (!isActive) return;
      
      // Small pause, then show calculating
      setStatus('calculating');
      await new Promise(r => setTimeout(r, 400));
      
      if (!isActive) return;
      
      // Spawn the receive amount (no typing, just appears)
      const finalReceive = calculateReceive(currentOrder.amount);
      setReceiveAmount(finalReceive);
      setStatus('ready');
      
      // Show matched status briefly
      await new Promise(r => setTimeout(r, 800));
      if (!isActive) return;
      setStatus('matched');
      
      // Wait before next order
      await new Promise(r => setTimeout(r, 1500));
      if (!isActive) return;
      
      // Switch direction every 2 orders (no flip animation)
      if ((currentOrderIndex + 1) % 2 === 0) {
        setIsOfframp(prev => !prev);
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Move to next order
      setCurrentOrderIndex((prev) => (prev + 1) % SAMPLE_ORDERS.length);
    };
    
    const timer = setTimeout(runSequence, 500);
    
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [currentOrderIndex, isOfframp]);

  const getStatusText = () => {
    switch (status) {
      case 'typing': return 'typing...';
      case 'calculating': return 'calculating...';
      case 'ready': return 'ready';
      case 'matched': return 'matched';
      default: return '';
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Main Card */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl"
      >
        {/* Card Header */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-2 text-[10px] font-mono text-white/30 uppercase tracking-wider">
            orrange — live settlement
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* You Send */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={isOfframp ? 'usdc' : 'inr'}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <div>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">
                    You send
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white font-mono tabular-nums">
                      {sendAmount || '0'}
                    </span>
                    <span className="text-lg text-white/50 font-mono">
                      {isOfframp ? 'USDC' : 'INR'}
                    </span>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
                  {isOfframp ? (
                    <DollarSign className="w-5 h-5 text-orange-400" />
                  ) : (
                    <IndianRupee className="w-5 h-5 text-orange-400" />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Arrow with animation */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <motion.div
              animate={{ 
                rotate: isOfframp ? 0 : 180,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 0.5 },
                scale: { duration: 1, repeat: Infinity, repeatDelay: 2 }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10"
            >
              <ArrowDown className="w-5 h-5 text-orange-500" />
            </motion.div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          {/* You Receive */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={isOfframp ? 'inr' : 'usdc'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <div>
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">
                    You receive
                  </p>
                  <div className="flex items-baseline gap-1">
                    <AnimatePresence mode="wait">
                      {receiveAmount && (
                        <motion.span 
                          key={`${isOfframp}-${receiveAmount}`}
                          initial={{ opacity: 0, scale: 0.5, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: -10 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="text-3xl font-bold text-white font-mono tabular-nums"
                        >
                          {receiveAmount}
                        </motion.span>
                      )}
                      {!receiveAmount && (
                        <span className="text-3xl font-bold text-white/20 font-mono tabular-nums">
                          —
                        </span>
                      )}
                    </AnimatePresence>
                    <span className="text-lg text-white/50 font-mono">
                      {isOfframp ? 'INR' : 'USDC'}
                    </span>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
                  {isOfframp ? (
                    <IndianRupee className="w-5 h-5 text-green-400" />
                  ) : (
                    <DollarSign className="w-5 h-5 text-green-400" />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* UPI / Settlement info */}
          <motion.div 
            key={isOfframp ? 'upi' : 'escrow'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-mono text-white/50">
              {isOfframp ? 'via UPI · merchant@orrange' : 'via Escrow · instant settlement'}
            </span>
            <motion.span 
              key={status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-auto text-[10px] font-mono text-orange-400"
            >
              {getStatusText()}
            </motion.span>
          </motion.div>

          {/* CTA Button */}
          <button className="w-full py-3 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 transition-all duration-300">
            Connect Wallet & Start
          </button>
        </div>

        {/* Corner decoration */}
        <div className="absolute bottom-0 right-0 p-3">
          <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
            Sepolia Testnet
          </div>
        </div>
      </motion.div>

      {/* Live order indicator */}
      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/30 font-mono">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Processing order #{1000 + currentOrderIndex + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500/50" />
          <span>{currentOrderIndex * 2 + 1} settled today</span>
        </div>
      </div>
    </div>
  );
}
