'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PixelOrangeLogo, PixelOrangeText } from '@/components/landing/PixelOrangeLogo';
import React from 'react';

export function LandingHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header>
      <nav
        data-state={open ? 'active' : undefined}
        className="fixed z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            {/* Logo */}
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <Link href="/" className="flex items-center gap-3 group">
                <PixelOrangeLogo size={40} className="transition-transform duration-300 group-hover:scale-110" />
                <span className="text-xl text-white">
                  <PixelOrangeText />
                </span>
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
                {['Architecture'].map(item => (
                  <a 
                    key={item} 
                    href={`#${item.toLowerCase()}`} 
                    className="text-sm text-white/40 transition-colors hover:text-orange-400"
                  >
                    {item}
                  </a>
                ))}
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3 md:w-fit">
                <Button asChild size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <MagneticButton
                  asChild
                  size="sm"
                  className="text-black font-medium"
                  style={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C38)' }}
                >
                  <Link href="/auth/signup">Get Access</Link>
                </MagneticButton>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

// Magnetic button component
import { motion } from 'framer-motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  asChild?: boolean;
  size?: 'sm' | 'lg' | 'default';
  className?: string;
  style?: React.CSSProperties;
}

function MagneticButton({ children, className = '', style }: MagneticButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current!.getBoundingClientRect();
    const x = (clientX - left - width / 2) * 0.15;
    const y = (clientY - top - height / 2) * 0.15;
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
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors ${className}`}
      style={style}
    >
      {children}
    </motion.button>
  );
}
