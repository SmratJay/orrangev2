'use client';

import React from 'react';
import type { Variants } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { AnimatedGroup } from '@/components/motion-primitives/animated-group';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { LiveConversionCard } from '@/components/landing/LiveConversionCard';
import Dither from '@/components/landing/Dither';

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
        {/* Animated dither background - visible and dynamic */}
        <div className="absolute inset-0 z-0">
          <Dither
            waveColor={[1.0, 0.42, 0.0]}
            waveSpeed={0.05}
            waveFrequency={3}
            waveAmplitude={0.35}
            colorNum={4}
            pixelSize={2}
            enableMouseInteraction
            mouseRadius={0.5}
            className="w-full h-full"
          />
        </div>
        {/* Subtle dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30 z-0" />
        {/* Gradient fade at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 z-0"
          style={{ background: 'linear-gradient(to bottom, transparent, black)' }} />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-32 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-40">
          {/* Left - Text */}
          <div className="relative mx-auto max-w-xl lg:mx-0">
            {/* Location badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="font-mono text-xs text-orange-400/70">
                Mumbai, India — Live on Sepolia Testnet
              </span>
            </motion.div>

            {/* Typography - similar to old design but enhanced */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-6xl font-bold leading-tight text-white tracking-tight"
            >
              Convert USDC
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-6xl font-bold leading-tight"
              style={{ 
                background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C38 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              to INR instantly.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-6 max-w-md text-base leading-relaxed text-white/40"
            >
              Peer-to-peer crypto settlement. No banks, no friction. Connect your wallet, find a merchant, settle in minutes.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-3"
            >
              <MagneticButton
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-black font-semibold hover:gap-3 transition-all duration-300"
                style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
              >
                <Link href="/auth/signup" className="flex items-center gap-2">
                  Start Trading
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </MagneticButton>
              
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white backdrop-blur-sm"
              >
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </motion.div>
          </div>

          {/* Right - Live Conversion Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mt-12 lg:mt-0"
          >
            <LiveConversionCard />
          </motion.div>
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
