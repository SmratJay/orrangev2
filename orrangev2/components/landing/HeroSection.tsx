'use client';

import type { Variants } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { TextEffect } from '@/components/motion-primitives/text-effect';
import { AnimatedGroup } from '@/components/motion-primitives/animated-group';
import DecryptedText from '@/components/landing/DecryptedText';

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

function NetworkDot({ label, color = '#FF6B00' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4">
      <div className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-30" style={{ background: color }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </div>
      <span className="font-mono text-xs font-medium tracking-widest text-white/40 uppercase">{label}</span>
    </div>
  );
}

export default function HeroSection() {
  return (
    <main className="overflow-x-hidden">
      {/* ── Hero ────────────────────────────── */}
      <section className="relative min-h-screen">
        {/* Dither animated background */}
        <div className="absolute inset-0 z-0 opacity-45">
          <Dither
            waveColor={[1.0, 0.42, 0.0]}
            waveSpeed={0.04}
            waveFrequency={2.5}
            waveAmplitude={0.35}
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

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-32 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-40">
          {/* Left — text */}
          <div className="relative mx-auto max-w-xl lg:mx-0">
            <div className="mt-2">
              <DecryptedText
                text="Mumbai, India — Live on Sepolia Testnet"
                animateOn="view"
                revealDirection="start"
                sequential
                speed={55}
                className="font-mono text-xs text-orange-400/70"
                parentClassName="mb-6 block"
              />
            </div>

            <TextEffect
              preset="fade-in-blur"
              speedSegment={0.3}
              as="h1"
              className="text-balance text-5xl font-semibold leading-tight text-white md:text-6xl xl:text-7xl"
            >
              Convert USDC
            </TextEffect>
            <TextEffect
              preset="fade-in-blur"
              speedSegment={0.3}
              as="h1"
              className="text-balance text-5xl font-semibold leading-tight md:text-6xl xl:text-7xl"
              style={{ color: '#FF6B00' }}
            >
              to INR instantly.
            </TextEffect>

            <TextEffect
              per="line"
              preset="fade-in-blur"
              speedSegment={0.3}
              delay={0.5}
              as="p"
              className="mt-6 max-w-md text-base leading-relaxed text-white/40"
            >
              Peer-to-peer crypto settlement. No banks, no friction. Connect your wallet, find a merchant, settle in minutes.
            </TextEffect>

            <AnimatedGroup
              variants={mkGroup(0.05, 0.75)}
              className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            >
              <Button
                asChild
                size="lg"
                className="w-full px-8 text-sm font-medium text-black sm:w-auto"
                style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
              >
                <Link href="/auth/signup">
                  <span className="text-nowrap">Start Trading</span>
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="w-full border border-white/8 bg-white/3 px-8 text-sm text-white/60 backdrop-blur-sm hover:bg-white/6 hover:text-white sm:w-auto"
              >
                <Link href="/auth/login">
                  <span className="text-nowrap">Sign In</span>
                </Link>
              </Button>
            </AnimatedGroup>

            {/* Stats row */}
            <AnimatedGroup
              triggerOnView
              variants={mkGroup(0.07, 0.2)}
              className="mt-12 flex items-center gap-8 border-t border-white/6 pt-8"
            >
              {[
                { v: '< 2 min', l: 'Settlement time' },
                { v: '₹90/USDC', l: 'Live rate' },
                { v: 'P2P', l: 'No custodian' },
              ].map(s => (
                <div key={s.l}>
                  <p className="text-xl font-semibold text-white">{s.v}</p>
                  <p className="mt-0.5 text-xs text-white/35">{s.l}</p>
                </div>
              ))}
            </AnimatedGroup>
          </div>

          {/* Right — visual */}
          <div className="relative mt-16 flex items-center justify-center lg:mt-0">
            {/* Animated terminal / order card */}
            <div
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/8"
              style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(24px)' }}
            >
              {/* Header bar */}
              <div className="flex items-center gap-2 border-b border-white/6 px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FF6B00' }} />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="ml-3 font-mono text-xs text-white/25">orrange — settlement protocol</span>
              </div>

              <div className="p-6 space-y-5">
                {/* Swap visual */}
                <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-5 py-4">
                  <div>
                    <p className="font-mono text-xs text-white/30 uppercase tracking-widest mb-1">You send</p>
                    <p className="text-3xl font-semibold text-white">100 <span className="text-lg text-white/40">USDC</span></p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
                    <span className="text-orange-400 text-lg font-bold">$</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-500/30" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-500/40" style={{ background: 'rgba(255,107,0,0.1)' }}>
                    <svg className="h-3 w-3 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-500/30" />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-5 py-4">
                  <div>
                    <p className="font-mono text-xs text-white/30 uppercase tracking-widest mb-1">You receive</p>
                    <p className="text-3xl font-semibold text-white">₹9,000 <span className="text-lg text-white/40">INR</span></p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
                    <span className="text-orange-400 text-lg font-bold">₹</span>
                  </div>
                </div>

                {/* UPI row */}
                <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-mono text-xs text-white/35">via UPI · merchant@okicici</span>
                  <span className="ml-auto font-mono text-xs text-orange-400">matched</span>
                </div>

                {/* CTA */}
                <Button
                  asChild
                  className="w-full text-sm font-medium text-black"
                  style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
                >
                  <Link href="/auth/signup">Connect Wallet & Start</Link>
                </Button>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -right-4 -top-4 rounded-xl border border-white/8 bg-black/80 px-4 py-2.5 backdrop-blur-sm">
              <p className="font-mono text-[10px] text-orange-400 uppercase tracking-widest">Sepolia Testnet</p>
              <p className="text-xs text-white/40 mt-0.5">Live & Active</p>
            </div>
          </div>
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
