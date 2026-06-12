'use client';

import React from 'react';
import type { Variants } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { AnimatedGroup } from '@/components/motion-primitives/animated-group';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const Dither = dynamic(() => import('@/components/landing/Dither'), { ssr: false });

const itemVariant: Variants = {
  hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
  visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { type: 'spring', bounce: 0.3, duration: 1.5 } },
};
const mkGroup = (stagger = 0.05, delay = 0.75) => ({
  container: { visible: { transition: { staggerChildren: stagger, delayChildren: delay } } } as Variants,
  item: itemVariant,
});

const PARTNERS = [
  { name: 'Ethereum', abbr: 'ETH' },
  { name: 'Sepolia', abbr: 'SEP' },
  { name: 'USDC', abbr: 'USDC' },
  { name: 'UPI', abbr: 'UPI' },
  { name: 'Web3', abbr: 'WEB3' },
  { name: 'Privy', abbr: 'PRIVY' },
];

// Magnetic button for hero
function MagneticButton({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current!.getBoundingClientRect();
    const x = (clientX - left - width / 2) * 0.2;
    const y = (clientY - top - height / 2) * 0.2;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
      style={style}
    >
      {children}
    </motion.button>
  );
}

export default function HeroSection() {
  return (
    <main className="overflow-x-hidden">
      {/* ── Hero ────────────────────────────── */}
      <section className="relative min-h-screen">
        {/* Dither animated background - visible waves with random cuts */}
        <div className="absolute inset-0 z-0 opacity-55">
          <Dither
            waveColor={[1.0, 0.38, 0.0]}
            waveSpeed={0.08}
            waveFrequency={2.5}
            waveAmplitude={0.4}
            colorNum={4}
            pixelSize={2}
            enableMouseInteraction
            mouseRadius={0.8}
            className="w-full h-full"
          />
        </div>
        {/* Fade hero content over dither at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 z-0"
          style={{ background: 'linear-gradient(to bottom, transparent, black)' }} />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-40 lg:pt-48">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Now Live on Sepolia Testnet
            </span>
          </motion.div>

          {/* Huge Typography - Centered like Stripe/Linear */}
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white tracking-tight leading-[0.9] mb-6"
            >
              The fastest way
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold tracking-tight leading-[0.9]"
              style={{ 
                background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C38 50%, #FFB347 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              to settle crypto.
            </motion.h1>
          </div>

          {/* Subtitle with breathing room */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center text-xl md:text-2xl text-white/50 max-w-3xl mx-auto mb-16 leading-relaxed"
          >
            Convert USDC to INR in under 2 minutes. 
            <br className="hidden md:block" />
            Non-custodial. Peer-to-peer. Zero friction.
          </motion.p>

          {/* CTA Buttons with magnetic effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <MagneticButton
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-black font-semibold text-lg hover:gap-4 transition-all duration-300"
              style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
            >
              <Link href="/auth/signup" className="flex items-center gap-2">
                Start Trading
                <ArrowRight className="w-5 h-5" />
              </Link>
            </MagneticButton>
            
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="px-8 py-4 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white text-lg backdrop-blur-sm"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex flex-wrap items-center justify-center gap-8 mt-16 text-white/30 text-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Non-custodial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Smart Contract Secured</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>48+ Active Merchants</span>
            </div>
          </motion.div>

          {/* Stats row */}
          <AnimatedGroup
            triggerOnView
            variants={mkGroup(0.07, 0.2)}
            className="mt-16 flex items-center justify-center gap-12 border-t border-white/6 pt-8"
          >
            {[
              { v: '< 2 min', l: 'Settlement time' },
              { v: '₹90/USDC', l: 'Live rate' },
              { v: 'P2P', l: 'No custodian' },
            ].map(s => (
              <div key={s.l} className="text-center">
                <p className="text-2xl font-bold text-white font-mono">{s.v}</p>
                <p className="mt-1 text-xs text-white/40 uppercase tracking-wider">{s.l}</p>
              </div>
            ))}
          </AnimatedGroup>
        </div>
      </section>

      {/* ── Ticker ──────────────────────────── */}
      <section className="border-y border-white/5 bg-black py-5">
        <AnimatedGroup
          triggerOnView
          variants={mkGroup(0.05, 0.2)}
          className="relative mx-auto max-w-6xl px-6"
        >
          <div className="flex flex-col items-center md:flex-row md:gap-0">
            <div className="mb-4 shrink-0 md:mb-0 md:w-40 md:border-r md:border-white/8 md:pr-6">
              <p className="text-center font-mono text-xs uppercase text-white/25 md:text-right">Built on</p>
            </div>
            <div className="relative md:w-[calc(100%-10rem)]">
              <InfiniteSlider speedOnHover={20} speed={40} gap={96}>
                {PARTNERS.map(p => (
                  <div key={p.abbr} className="flex items-center gap-2 px-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded border border-white/8 bg-white/4">
                      <span className="font-mono text-[9px] font-bold text-white/50">{p.abbr.slice(0,3)}</span>
                    </div>
                    <span className="font-mono text-xs text-white/30">{p.name}</span>
                  </div>
                ))}
              </InfiniteSlider>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black" />
            </div>
          </div>
        </AnimatedGroup>
      </section>
    </main>
  );
}
