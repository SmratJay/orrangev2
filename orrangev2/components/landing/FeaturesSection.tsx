'use client';

import type { Variants } from 'motion/react';
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Zap, ShieldCheck, Users, ArrowLeftRight } from 'lucide-react';
import { TextEffect } from '@/components/motion-primitives/text-effect';
import { AnimatedGroup } from '@/components/motion-primitives/animated-group';

const itemVariant: Variants = {
  hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
  visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { type: 'spring', bounce: 0.3, duration: 1.5 } },
};
const groupVariants = { container: { visible: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } } } as Variants, item: itemVariant };

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div className="mask-radial-from-40% mask-radial-to-60% relative mx-auto size-36 duration-200 [--color-border:color-mix(in_oklab,#FF6B00_12%,transparent)] group-hover:[--color-border:color-mix(in_oklab,#FF6B00_22%,transparent)]">
    <div
      aria-hidden
      className="absolute inset-0 opacity-60"
      style={{
        backgroundImage: 'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
    <div className="absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t border-orange-500/30 bg-black text-orange-400">
      {children}
    </div>
  </div>
);

const FEATURES = [
  {
    icon: <ArrowLeftRight className="size-6" />,
    title: 'P2P Settlement',
    desc: 'Directly matched with verified merchants. No middlemen, no custodial risk.',
  },
  {
    icon: <Zap className="size-6" />,
    title: 'Under 2 Minutes',
    desc: 'On-chain USDC lock → UPI transfer → auto-release. The fastest off-ramp in India.',
  },
  {
    icon: <ShieldCheck className="size-6" />,
    title: 'Escrow Protected',
    desc: 'Funds held in smart contract escrow until UPI payment is confirmed by both parties.',
  },
  {
    icon: <Users className="size-6" />,
    title: 'Merchant Network',
    desc: 'A growing network of KYC-verified merchants ensures availability and competitive rates.',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <TextEffect
            triggerOnView
            preset="fade-in-blur"
            speedSegment={0.3}
            as="h2"
            className="text-balance text-4xl font-semibold text-white lg:text-5xl"
          >
            Everything you need to off-ramp
          </TextEffect>
          <TextEffect
            triggerOnView
            preset="fade-in-blur"
            speedSegment={0.3}
            delay={0.2}
            as="p"
            className="mx-auto mt-4 max-w-xl text-base text-white/35"
          >
            Built for speed, security, and simplicity. From wallet connect to INR in your account.
          </TextEffect>
        </div>

        <AnimatedGroup
          triggerOnView
          variants={groupVariants}
        >
          <Card className="mx-auto mt-12 grid max-w-4xl divide-y divide-white/5 overflow-hidden border-white/8 bg-black/50 shadow-none md:mt-16 md:grid-cols-2 md:divide-x md:divide-y-0">
            {FEATURES.map((f, i) => (
              <div key={i} className="group px-8 py-8">
                <CardHeader className="p-0 pb-3 text-center">
                  <CardDecorator>{f.icon}</CardDecorator>
                  <h3 className="mt-6 text-center text-lg font-medium text-white">{f.title}</h3>
                </CardHeader>
                <CardContent className="p-0 text-center">
                  <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>
                </CardContent>
              </div>
            ))}
          </Card>
        </AnimatedGroup>
      </div>
    </section>
  );
}
