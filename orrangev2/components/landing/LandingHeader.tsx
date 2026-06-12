'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React from 'react';

export function LandingHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header>
      <nav
        data-state={open ? 'active' : undefined}
        className="fixed z-20 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            {/* Logo */}
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <Link href="/" className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
                >
                  <span className="text-xs font-black leading-none text-black">O</span>
                </div>
                <span className="font-mono text-sm font-semibold tracking-wide text-white">ORRANGE</span>
              </Link>

              <button
                onClick={() => setOpen(!open)}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:opacity-0 in-data-[state=active]:scale-0 size-5 text-white/60 duration-200" />
                <X className="in-data-[state=active]:opacity-100 in-data-[state=active]:scale-100 absolute inset-0 m-auto size-5 scale-0 text-white/60 opacity-0 duration-200" />
              </button>
            </div>

            {/* Nav items */}
            <div className="in-data-[state=active]:block mb-6 hidden w-full items-center justify-end gap-6 rounded-2xl border border-white/8 bg-black/90 p-6 shadow-2xl lg:m-0 lg:flex lg:w-fit lg:gap-8 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-6 md:w-fit">
                {['Protocol', 'Network', 'Developers'].map(item => (
                  <a key={item} href="#" className="text-sm text-white/40 transition-colors hover:text-white/80">
                    {item}
                  </a>
                ))}
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3 md:w-fit">
                <Button asChild size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="text-black font-medium"
                  style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
                >
                  <Link href="/auth/signup">Get Access</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
