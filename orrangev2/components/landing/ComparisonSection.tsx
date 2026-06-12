'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { X, Check, Clock, Building2, Wallet, FileCheck } from 'lucide-react';

interface ComparisonRow {
  feature: string;
  exchange: {
    value: string;
    negative: boolean;
  };
  orrange: {
    value: string;
    negative: boolean;
  };
}

const comparisons: ComparisonRow[] = [
  {
    feature: 'Settlement Speed',
    exchange: { value: 'Withdrawal queues', negative: true },
    orrange: { value: 'Instant matching', negative: false },
  },
  {
    feature: 'Custody',
    exchange: { value: 'Custodial', negative: true },
    orrange: { value: 'Non-custodial', negative: false },
  },
  {
    feature: 'Bank Dependencies',
    exchange: { value: 'Required', negative: true },
    orrange: { value: 'Merchant network', negative: false },
  },
  {
    feature: 'KYC Requirements',
    exchange: { value: 'Heavy documentation', negative: true },
    orrange: { value: 'Minimal friction', negative: false },
  },
  {
    feature: 'Settlement Time',
    exchange: { value: 'Days', negative: true },
    orrange: { value: 'Minutes', negative: false },
  },
  {
    feature: 'Fees',
    exchange: { value: 'Hidden + spread', negative: true },
    orrange: { value: 'Transparent', negative: false },
  },
];

export function ComparisonSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 bg-black overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-500/5 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-mono uppercase tracking-wider mb-6">
            The Better Alternative
          </span>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            Why Not Exchanges?
          </h2>
          <p className="text-xl text-white/40 max-w-2xl leading-relaxed">
            Traditional exchanges weren't built for instant settlements. 
            We reimagined the entire experience from the ground up.
          </p>
        </motion.div>

        {/* Comparison table */}
        <div className="rounded-3xl border border-white/10 overflow-hidden bg-white/[0.02]">
          {/* Table header */}
          <div className="grid grid-cols-3 border-b border-white/10">
            <div className="p-6 md:p-8">
              <span className="text-sm font-mono text-white/30 uppercase tracking-wider">Feature</span>
            </div>
            <div className="p-6 md:p-8 border-l border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-white/40" />
                <span className="text-sm font-mono text-white/50 uppercase tracking-wider">Traditional Exchanges</span>
              </div>
            </div>
            <div className="p-6 md:p-8 border-l border-white/10 bg-orange-500/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-black">O</span>
                </div>
                <span className="text-sm font-mono text-orange-400 uppercase tracking-wider">ORRANGE</span>
              </div>
            </div>
          </div>

          {/* Table rows */}
          {comparisons.map((row, index) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="grid grid-cols-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.01] transition-colors"
            >
              <div className="p-6 md:p-8 flex items-center">
                <span className="text-white/60 font-medium">{row.feature}</span>
              </div>
              <div className="p-6 md:p-8 border-l border-white/10 bg-white/[0.02] flex items-center">
                <div className="flex items-center gap-3">
                  <X className="w-5 h-5 text-red-400/60" />
                  <span className="text-white/40">{row.exchange.value}</span>
                </div>
              </div>
              <div className="p-6 md:p-8 border-l border-white/10 bg-orange-500/[0.02] flex items-center">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-white">{row.orrange.value}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-white/40 text-lg mb-6">
            Stop waiting. Start settling.
          </p>
          <a 
            href="/auth/signup" 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-black font-semibold hover:from-orange-400 hover:to-orange-500 transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
          >
            <Wallet className="w-5 h-5" />
            Start Trading Now
          </a>
        </motion.div>
      </div>
    </section>
  );
}
