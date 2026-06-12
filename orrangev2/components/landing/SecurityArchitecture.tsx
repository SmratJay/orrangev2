'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { User, Lock, Store, CreditCard, Unlock, Shield, FileCheck, Eye } from 'lucide-react';

interface FlowStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const flowSteps: FlowStep[] = [
  {
    icon: <User className="w-6 h-6" />,
    title: 'User',
    description: 'Initiates USDC transfer to escrow',
    color: 'from-blue-500/20 to-blue-600/20',
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: 'Escrow Contract',
    description: 'Smart contract locks funds on-chain',
    color: 'from-orange-500/20 to-orange-600/20',
  },
  {
    icon: <Store className="w-6 h-6" />,
    title: 'Merchant',
    description: 'Matched merchant receives order',
    color: 'from-purple-500/20 to-purple-600/20',
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'UPI Settlement',
    description: 'Merchant sends INR via UPI',
    color: 'from-green-500/20 to-green-600/20',
  },
  {
    icon: <Unlock className="w-6 h-6" />,
    title: 'Release',
    description: 'Proof verified, escrow releases USDC',
    color: 'from-orange-500/20 to-orange-600/20',
  },
];

const securityFeatures = [
  { icon: <Shield className="w-5 h-5" />, title: 'Smart Contract Audited', desc: 'Verified by leading security firms' },
  { icon: <FileCheck className="w-5 h-5" />, title: 'Cryptographic Verification', desc: 'Every settlement cryptographically proven' },
  { icon: <Eye className="w-5 h-5" />, title: 'Full Transparency', desc: 'All transactions visible on-chain' },
];

function AnimatedArrow({ delay }: { delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="hidden md:flex items-center justify-center w-16"
    >
      <motion.div
        animate={{ x: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay }}
        className="relative"
      >
        <div className="w-12 h-px bg-gradient-to-r from-white/20 to-orange-500/50" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-orange-500/50 rotate-45" />
      </motion.div>
    </motion.div>
  );
}

export function SecurityArchitecture() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="security" ref={ref} className="relative py-32 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-orange-500/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-mono uppercase tracking-wider mb-6">
            Security Architecture
          </span>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            Trust Through Verification
          </h2>
          <p className="text-xl text-white/40 max-w-3xl mx-auto leading-relaxed">
            Every step cryptographically secured. No trust required, only proof.
          </p>
        </motion.div>

        {/* Animated flow diagram */}
        <div className="mb-20">
          {/* Desktop: Horizontal flow */}
          <div className="hidden md:flex items-center justify-center">
            {flowSteps.map((step, index) => (
              <React.Fragment key={step.title}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="relative"
                >
                  <div className={`p-6 rounded-2xl bg-gradient-to-br ${step.color} border border-white/10 backdrop-blur-sm w-48`}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-4 text-white">
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 font-mono">{step.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>
                  </div>
                  
                  {/* Step number */}
                  <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-black">
                    {index + 1}
                  </div>
                </motion.div>
                {index < flowSteps.length - 1 && <AnimatedArrow delay={index * 0.2 + 0.3} />}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile: Vertical flow */}
          <div className="md:hidden space-y-4">
            {flowSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-black shrink-0">
                  {index + 1}
                </div>
                <div className={`flex-1 p-4 rounded-xl bg-gradient-to-r ${step.color} border border-white/10`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-white/80">{step.icon}</div>
                    <h3 className="font-bold text-white font-mono">{step.title}</h3>
                  </div>
                  <p className="text-sm text-white/50">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Security features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {securityFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
              className="group p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-orange-500/30 transition-all duration-500"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                  <p className="text-sm text-white/40">{feature.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contract address */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
            <span className="text-xs text-white/30 font-mono uppercase tracking-wider">Sepolia Contract</span>
            <span className="text-xs text-white/60 font-mono">0x1c7D...C7238</span>
            <span className="w-2 h-2 rounded-full bg-green-400" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
