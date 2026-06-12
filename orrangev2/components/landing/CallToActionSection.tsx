'use client';

import type { Variants } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TextEffect } from '@/components/motion-primitives/text-effect';
import { AnimatedGroup } from '@/components/motion-primitives/animated-group';

const itemVariant: Variants = {
  hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
  visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { type: 'spring', bounce: 0.3, duration: 1.5 } },
};
const groupVariants = { container: { visible: { transition: { staggerChildren: 0.05, delayChildren: 0.75 } } } as Variants, item: itemVariant };

export default function CallToActionSection() {
  return (
    <section className="py-16 mx-2 md:py-24">
      <div
        className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-orange-500/15 px-6 py-14 md:py-24 lg:py-32"
        style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.06) 0%, rgba(0,0,0,0) 60%)' }}
      >
        {/* Decorative corner glow */}
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 opacity-30"
          style={{ background: 'radial-gradient(ellipse, #FF6B00 0%, transparent 70%)' }}
        />

        <div className="relative text-center">
          <TextEffect
            triggerOnView
            preset="fade-in-blur"
            speedSegment={0.3}
            as="h2"
            className="text-balance text-4xl font-semibold text-white lg:text-5xl"
          >
            Ready to off-ramp your USDC?
          </TextEffect>

          <TextEffect
            triggerOnView
            preset="fade-in-blur"
            speedSegment={0.3}
            delay={0.3}
            as="p"
            className="mx-auto mt-4 max-w-lg text-white/35"
          >
            Join merchants and traders settling crypto to INR on Orrange. No custodians. No waiting days.
          </TextEffect>

          <AnimatedGroup
            triggerOnView
            variants={groupVariants}
            className="mt-12 flex flex-wrap justify-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="px-10 text-sm font-medium text-black"
              style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
            >
              <Link href="/auth/signup">
                <span>Get Started Free</span>
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/10 bg-transparent px-10 text-sm text-white/60 hover:border-white/20 hover:text-white"
            >
              <Link href="/auth/login">
                <span>Sign In</span>
              </Link>
            </Button>
          </AnimatedGroup>
        </div>
      </div>
    </section>
  );
}
