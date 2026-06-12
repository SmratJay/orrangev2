'use client';

import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Lock, Users, CheckCircle, Smartphone } from 'lucide-react';

interface ArchitectureCard {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const cards: ArchitectureCard[] = [
  {
    number: '01',
    title: 'ON-CHAIN ESCROW',
    description: 'Funds remain locked until payment confirmation. Smart contracts hold USDC in trust until UPI settlement is verified.',
    icon: <Lock className="w-6 h-6" />,
  },
  {
    number: '02',
    title: 'MERCHANT MATCHING ENGINE',
    description: 'Orders routed to available liquidity providers. AI-powered matching ensures optimal rates and instant fulfillment.',
    icon: <Users className="w-6 h-6" />,
  },
  {
    number: '03',
    title: 'ATOMIC RELEASE',
    description: 'Escrow released only after settlement verification. Cryptographic proof ensures trustless execution.',
    icon: <CheckCircle className="w-6 h-6" />,
  },
  {
    number: '04',
    title: 'UPI CONNECTIVITY',
    description: 'Direct access to India\'s dominant payment rail. Seamless integration with all major UPI handles.',
    icon: <Smartphone className="w-6 h-6" />,
  },
];

function TiltCard({ card, index }: { card: ArchitectureCard; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    setTransform({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      viewport={{ once: true, margin: "-50px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
      className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-orange-500/30 transition-colors duration-500"
    >
      {/* Card number */}
      <span className="absolute top-6 right-6 font-mono text-xs text-white/20">
        {card.number}
      </span>

      {/* Icon */}
      <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform duration-500">
        {card.icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white mb-3 font-mono tracking-wide">
        {card.title}
      </h3>

      {/* Description */}
      <p className="text-white/40 text-sm leading-relaxed">
        {card.description}
      </p>

      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: isHovered 
            ? `radial-gradient(circle at ${50 + transform.rotateY * 2}% ${50 - transform.rotateX * 2}%, rgba(255,107,0,0.15), transparent 50%)`
            : 'none'
        }}
      />

      {/* Border glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/20 via-transparent to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm" />
    </motion.div>
  );
}

export function SettlementArchitecture() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="architecture" ref={ref} className="relative py-32 bg-black overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-[150px]" />
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
            Settlement Architecture
          </span>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            How It Works
          </h2>
          <p className="text-xl text-white/40 max-w-3xl mx-auto leading-relaxed">
            Sophisticated infrastructure powering instant crypto-to-fiat settlement. 
            Every layer optimized for speed, security, and reliability.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <TiltCard key={card.number} card={card} index={index} />
          ))}
        </div>

        {/* Bottom visualization */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 p-8 rounded-3xl border border-white/5 bg-white/[0.01]"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-600/30 border-2 border-black flex items-center justify-center"
                  >
                    <span className="text-xs font-mono text-orange-300">M{i}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white font-medium">48+ Active Merchants</p>
                <p className="text-white/40 text-sm">Providing liquidity across India</p>
              </div>
            </div>
            
            <div className="flex items-center gap-8 text-center">
              <div>
                <p className="text-2xl font-bold text-white font-mono">12</p>
                <p className="text-xs text-white/40 uppercase tracking-wider">Cities</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white font-mono">24/7</p>
                <p className="text-xs text-white/40 uppercase tracking-wider">Uptime</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white font-mono">&lt;2m</p>
                <p className="text-xs text-white/40 uppercase tracking-wider">Avg Time</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
