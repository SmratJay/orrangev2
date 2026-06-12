'use client';

import type { Variants } from 'motion/react';
import { TextEffect } from '@/components/motion-primitives/text-effect';
import { AnimatedGroup } from '@/components/motion-primitives/animated-group';

const itemVariant: Variants = {
  hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
  visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { type: 'spring', bounce: 0.3, duration: 1.5 } },
};
const groupVariants = { container: { visible: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } } as Variants, item: itemVariant };

const STEPS = [
  { time: '01', title: 'Connect Wallet', desc: 'Sign in with your email or social — Privy creates an embedded wallet automatically. No seed phrase needed.' },
  { time: '02', title: 'Place Sell Order', desc: 'Enter the USDC amount and your UPI ID. Your USDC is locked in escrow on-chain instantly.' },
  { time: '03', title: 'Merchant Matches', desc: 'A verified merchant accepts your order and initiates the UPI bank transfer to your account.' },
  { time: '04', title: 'Confirm & Release', desc: 'You confirm receipt of INR. Smart contract releases USDC to the merchant. Done.' },
];

export default function HowItWorksSection() {
  return (
    <section className="scroll-py-16 py-16 md:scroll-py-32 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-y-12 px-2 lg:grid-cols-[1fr_auto] lg:gap-x-20">
          {/* Left heading */}
          <div className="text-center lg:text-left">
            <TextEffect
              triggerOnView
              preset="fade-in-blur"
              speedSegment={0.3}
              as="h2"
              className="mb-4 text-3xl font-semibold text-white md:text-4xl"
            >
              How it works
            </TextEffect>
            <TextEffect
              triggerOnView
              preset="fade-in-blur"
              speedSegment={0.3}
              delay={0.2}
              as="p"
              className="max-w-sm text-sm text-white/35 leading-relaxed"
            >
              Four steps from wallet to bank account. No KYC on your end — just your UPI ID and USDC.
            </TextEffect>
          </div>

          {/* Right steps */}
          <AnimatedGroup
            triggerOnView
            variants={groupVariants}
            className="divide-y divide-dashed divide-white/8 sm:mx-auto sm:max-w-lg lg:mx-0"
          >
            {STEPS.map((step, i) => (
              <div key={i} className={i === 0 ? 'pb-6' : i === STEPS.length - 1 ? 'pt-6' : 'py-6'}>
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 shrink-0 font-mono text-sm text-orange-500/70">{step.time}</span>
                  <div>
                    <p className="font-medium text-white">{step.title}</p>
                    <p className="mt-2 text-sm text-white/35 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </AnimatedGroup>
        </div>
      </div>
    </section>
  );
}
