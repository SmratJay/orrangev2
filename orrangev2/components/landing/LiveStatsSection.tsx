'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, Users, Clock, Shield, Zap, Globe } from 'lucide-react';

interface StatItem {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
  icon: React.ReactNode;
  decimals?: number;
}

const stats: StatItem[] = [
  { label: 'Settlement Time', value: 2, suffix: ' min', prefix: '< ', icon: <Clock className="w-5 h-5" />, decimals: 0 },
  { label: 'Active Merchants', value: 48, suffix: '+', icon: <Users className="w-5 h-5" />, decimals: 0 },
  { label: 'Live Rate', value: 90.5, suffix: ' INR/USDC', prefix: '₹', icon: <TrendingUp className="w-5 h-5" />, decimals: 1 },
  { label: 'Network Uptime', value: 99.9, suffix: '%', icon: <Zap className="w-5 h-5" />, decimals: 1 },
  { label: 'Total Volume', value: 2.4, suffix: 'M USDC', icon: <Globe className="w-5 h-5" />, decimals: 1 },
  { label: 'Security Score', value: 100, suffix: '/100', icon: <Shield className="w-5 h-5" />, decimals: 0 },
];

function AnimatedCounter({ value, suffix, prefix = '', decimals = 0, inView }: { 
  value: number; 
  suffix: string; 
  prefix?: string;
  decimals?: number;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, inView]);

  return (
    <span className="font-mono text-3xl md:text-4xl font-bold text-white tabular-nums">
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
}

export function LiveStatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-24 border-y border-white/5 bg-black overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,107,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      
      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Network Status
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Real-time Settlement Metrics
          </h2>
          <p className="text-white/40 max-w-2xl mx-auto text-lg">
            Transparent network statistics. Every transaction, every merchant, every second.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-orange-500/20 transition-all duration-500"
            >
              <div className="flex items-center gap-2 mb-3 text-orange-400/60 group-hover:text-orange-400 transition-colors">
                {stat.icon}
                <span className="text-xs font-mono uppercase tracking-wider">{stat.label}</span>
              </div>
              <AnimatedCounter 
                value={stat.value} 
                suffix={stat.suffix} 
                prefix={stat.prefix}
                decimals={stat.decimals}
                inView={inView}
              />
              
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            </motion.div>
          ))}
        </div>

        {/* Network activity indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 flex items-center justify-center gap-4"
        >
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-orange-500/60 rounded-full"
                  animate={{
                    height: [4, 16, 4],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            <span className="font-mono">Processing settlements across 12 cities</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
