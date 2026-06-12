'use client';

import { useEffect, useState } from 'react';

interface WelcomeAnimationProps {
  name: string;
}

export function WelcomeAnimation({ name }: WelcomeAnimationProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit' | 'done'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('exit'), 2600);
    const t3 = setTimeout(() => setPhase('done'), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      style={{
        background: 'rgba(11,12,14,0.85)',
        backdropFilter: 'blur(12px)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.5s ease' : phase === 'enter' ? 'opacity 0.3s ease' : 'none',
      }}
    >
      <div
        style={{
          transform: phase === 'enter' ? 'translateY(12px) scale(0.97)' : phase === 'exit' ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
          textAlign: 'center',
        }}
      >
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-black text-black mb-6 mx-auto"
          style={{ background: 'linear-gradient(135deg,#FF7A1A,#FF8F3A)', boxShadow: '0 0 40px rgba(255,122,26,0.4)' }}
        >
          O
        </div>
        <p className="text-muted-foreground text-sm mb-2 tracking-widest uppercase font-medium">Welcome back</p>
        <h2
          className="text-4xl font-black text-white"
          style={{ textShadow: '0 0 40px rgba(255,122,26,0.3)' }}
        >
          {name}
        </h2>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
