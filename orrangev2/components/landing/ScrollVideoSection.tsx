'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Shield, Lock, Eye, CheckCircle } from 'lucide-react';

export function ScrollVideoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Track scroll progress through this section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  
  // Smooth the scroll progress for buttery playback
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.001
  });
  
  // Transform scroll progress to video time
  // Video starts at 4.5s, ends at 10s = 5.5s of usable footage
  const videoTime = useTransform(smoothProgress, [0, 1], [4.5, 10]);
  
  // Card animations based on scroll
  const card1Y = useTransform(smoothProgress, [0, 0.3], [100, 0]);
  const card2Y = useTransform(smoothProgress, [0.1, 0.4], [150, 0]);
  const card3Y = useTransform(smoothProgress, [0.2, 0.5], [200, 0]);
  const card4Y = useTransform(smoothProgress, [0.3, 0.6], [100, 0]);
  
  const card1Opacity = useTransform(smoothProgress, [0, 0.15, 0.35, 0.5], [0, 1, 1, 0]);
  const card2Opacity = useTransform(smoothProgress, [0.1, 0.25, 0.45, 0.6], [0, 1, 1, 0]);
  const card3Opacity = useTransform(smoothProgress, [0.2, 0.35, 0.55, 0.7], [0, 1, 1, 0]);
  const card4Opacity = useTransform(smoothProgress, [0.3, 0.45, 0.65, 0.8], [0, 1, 1, 0]);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Preload video
    video.load();
    video.currentTime = 4.5;
    video.pause();
    
    // Subscribe to time changes
    const unsubscribe = videoTime.on("change", (time) => {
      if (video.readyState >= 2 && Math.abs(video.currentTime - time) > 0.1) {
        video.currentTime = time;
      }
    });
    
    return () => unsubscribe();
  }, [videoTime]);
  
  return (
    <section 
      ref={containerRef} 
      className="relative h-[400vh]"
    >
      {/* Fixed video background */}
      <div className="fixed inset-0 h-screen w-full overflow-hidden -z-10">
        <video
          ref={videoRef}
          src="/pixelart-video.mp4"
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
          style={{ 
            imageRendering: 'pixelated',
            opacity: 0.9
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>
      
      {/* Content that scrolls over the video */}
      <div className="relative h-full">
        {/* Section 1: Trust Through Verification */}
        <div className="h-screen flex items-center justify-center px-6 sticky top-0">
          <motion.div 
            style={{ y: card1Y, opacity: card1Opacity }}
            className="max-w-md w-full"
          >
            <div className="p-6 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-green-400">Secure</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Trust Through Verification</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Every merchant is KYC-verified. Every transaction is cryptographically secured. 
                Your funds never leave the smart contract until payment is confirmed.
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Section 2: Smart Contract Secured */}
        <div className="h-screen flex items-center justify-center px-6 sticky top-0">
          <motion.div 
            style={{ y: card2Y, opacity: card2Opacity }}
            className="max-w-md w-full"
          >
            <div className="p-6 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-orange-400">Protected</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Smart Contract Secured</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                USDC is locked in audited escrow contracts. Funds only release when both parties 
                confirm the UPI transfer. No counterparty risk.
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Section 3: Observable Transactions */}
        <div className="h-screen flex items-center justify-center px-6 sticky top-0">
          <motion.div 
            style={{ y: card3Y, opacity: card3Opacity }}
            className="max-w-md w-full"
          >
            <div className="p-6 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-400">Transparent</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Observable Transactions</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Every settlement is on-chain. Track your funds in real-time. 
                Verify merchant activity. Complete transparency, zero blind trust.
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Section 4: Instant Confirmation */}
        <div className="h-screen flex items-center justify-center px-6 sticky top-0">
          <motion.div 
            style={{ y: card4Y, opacity: card4Opacity }}
            className="max-w-md w-full"
          >
            <div className="p-6 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-purple-400">Confirmed</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Instant Confirmation</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                No waiting for blocks. UPI confirmation triggers immediate USDC release. 
                Average settlement time: under 90 seconds.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
