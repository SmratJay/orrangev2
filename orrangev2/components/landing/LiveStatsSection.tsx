'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, Users, Clock, Activity, IndianRupee } from 'lucide-react';

// ────────────────────────────────────────────────────────────
// LIVE COUNTERS
// ────────────────────────────────────────────────────────────

// Live settlement countdown (counts down from ~2 min)
function LiveSettlementTimer() {
  const [seconds, setSeconds] = useState(127); // 2:07

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 45) return 127 + Math.floor(Math.random() * 20); // Reset with variation
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className="font-mono text-5xl md:text-6xl lg:text-7xl font-bold text-white tabular-nums tracking-tight">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

// Live ticking volume (constantly grows)
function LiveVolumeCounter() {
  const [volume, setVolume] = useState(4.2);

  useEffect(() => {
    const interval = setInterval(() => {
      setVolume(v => v + (Math.random() * 0.01));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold text-white tabular-nums">
      ₹{volume.toFixed(2)}Cr
    </span>
  );
}

// Animated number for smaller stats
function TickerNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(v => v + (Math.random() > 0.7 ? 1 : 0));
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <span className="font-mono text-2xl md:text-3xl font-bold text-white tabular-nums">
      {display}{suffix}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN SECTION
// ────────────────────────────────────────────────────────────

export function LiveStatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 border-y border-white/5 bg-black overflow-hidden">
      {/* Animated background lines */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 40px,
            rgba(255,107,0,0.5) 40px,
            rgba(255,107,0,0.5) 41px
          )`
        }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Header with emotion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono uppercase tracking-wider mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Network Online
          </motion.div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight">
            The Infrastructure
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              Never Sleeps
            </span>
          </h2>
          <p className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto">
            Every transaction is observable. Every settlement is verified.
          </p>
        </motion.div>

        {/* CENTERPIECE: Network Reliability */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mb-12"
        >
          <div className="flex flex-col items-center">
            {/* Status bar */}
            <div className="w-full max-w-2xl mb-8">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-white/30 mb-3">
                <span>Network Status</span>
                <span className="text-green-400">Operational</span>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-green-500/50 to-transparent relative">
                <motion.div
                  className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-transparent via-green-400 to-transparent"
                  animate={{ x: ['0%', '400%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>

            {/* Big number */}
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="font-mono text-8xl md:text-9xl lg:text-[10rem] font-bold text-white tabular-nums tracking-tighter leading-none"
              >
                99.98<span className="text-6xl md:text-7xl lg:text-8xl text-white/40">%</span>
              </motion.div>
              <p className="mt-4 text-lg text-white/40 font-mono uppercase tracking-wider">
                Network Reliability
              </p>
            </div>
          </div>
        </motion.div>

        {/* SECONDARY: Volume (prominent) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mb-16 pb-16 border-b border-white/5"
        >
          <p className="text-sm font-mono uppercase tracking-wider text-white/30 mb-2">
            Total Settled Volume
          </p>
          <LiveVolumeCounter />
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/30">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="font-mono">+12% this week</span>
          </div>
        </motion.div>

        {/* TERTIARY: Supporting metrics in a minimal row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
        >
          {/* Settlement Time - with live countdown */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider text-white/30 mb-3">
              <Clock className="w-3 h-3" />
              Avg Settlement
            </div>
            <LiveSettlementTimer />
          </div>

          {/* Active Merchants */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider text-white/30 mb-3">
              <Users className="w-3 h-3" />
              Active Merchants
            </div>
            <TickerNumber value={48} suffix="+" />
          </div>

          {/* Settlements Today */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider text-white/30 mb-3">
              <Activity className="w-3 h-3" />
              Settlements Today
            </div>
            <TickerNumber value={1247} />
          </div>

          {/* Live Rate */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider text-white/30 mb-3">
              <IndianRupee className="w-3 h-3" />
              Live Rate
            </div>
            <span className="font-mono text-2xl md:text-3xl font-bold text-white tabular-nums">
              ₹90.50
            </span>
            <span className="text-xs text-white/30 ml-1">/USDC</span>
          </div>
        </motion.div>

        {/* Bottom activity pulse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 flex items-center justify-center"
        >
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.02] border border-white/5">
            <div className="flex gap-0.5">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-orange-500 rounded-full"
                  animate={{
                    height: [3, 12, 3],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-white/40">
              Processing settlements across Mumbai, Delhi, Bangalore...
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
