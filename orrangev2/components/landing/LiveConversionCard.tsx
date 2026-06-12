'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, DollarSign, IndianRupee, CheckCircle2, Loader2 } from 'lucide-react';

interface Order {
  id: string;
  amount: number;
  isTyping: boolean;
  status: 'typing' | 'converting' | 'matched' | 'completed';
}

const SAMPLE_ORDERS = [
  { amount: 50, delay: 0 },
  { amount: 125, delay: 4000 },
  { amount: 75, delay: 8000 },
  { amount: 200, delay: 12000 },
  { amount: 30, delay: 16000 },
];

const RATE = 90; // 1 USDC = 90 INR

export function LiveConversionCard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [isOfframp, setIsOfframp] = useState(true); // true = USDC->INR, false = INR->USDC
  const [displayAmount, setDisplayAmount] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);

  // Typewriter effect for amount
  const typeAmount = useCallback((amount: number) => {
    const str = amount.toString();
    let i = 0;
    setDisplayAmount('');
    
    const interval = setInterval(() => {
      if (i <= str.length) {
        setDisplayAmount(str.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Cycle through orders
  useEffect(() => {
    const runOrder = async () => {
      const order = SAMPLE_ORDERS[currentOrderIndex];
      
      // Start typing
      typeAmount(order.amount);
      
      // Wait for typing + conversion
      await new Promise(r => setTimeout(r, 2500));
      
      // Show matched state briefly
      await new Promise(r => setTimeout(r, 1500));
      
      // Flip the card (every 2 orders)
      if ((currentOrderIndex + 1) % 2 === 0) {
        setIsFlipping(true);
        await new Promise(r => setTimeout(r, 600));
        setIsOfframp(!isOfframp);
        setIsFlipping(false);
      }
      
      // Move to next order
      setCurrentOrderIndex((prev) => (prev + 1) % SAMPLE_ORDERS.length);
    };

    const timer = setTimeout(runOrder, 500);
    return () => clearTimeout(timer);
  }, [currentOrderIndex, isOfframp, typeAmount]);

  const currentAmount = SAMPLE_ORDERS[currentOrderIndex].amount;
  const convertedAmount = isOfframp 
    ? currentAmount * RATE 
    : Math.floor(currentAmount / RATE);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Floating status badge */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute -top-4 -right-4 z-20"
      >
        <div className="px-3 py-1.5 rounded-full bg-black/80 border border-orange-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">Live</span>
          </div>
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        animate={{ 
          rotateY: isFlipping ? 180 : 0,
          scale: isFlipping ? 0.95 : 1 
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: 'preserve-3d' }}
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
                      {displayAmount || '0'}
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
                    <motion.span 
                      key={convertedAmount}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-3xl font-bold text-white font-mono tabular-nums"
                    >
                      {convertedAmount.toLocaleString()}
                    </motion.span>
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
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-auto text-[10px] font-mono text-orange-400"
            >
              {displayAmount.length === currentAmount.toString().length ? 'matched' : 'typing...'}
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
