'use client';

import React from 'react';
import Image from 'next/image';

interface PixelOrangeLogoProps {
  size?: number;
  className?: string;
}

export function PixelOrangeLogo({ size = 40, className = '' }: PixelOrangeLogoProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: size,
        height: size,
        filter: 'drop-shadow(0 0 8px rgba(255, 107, 0, 0.5)) drop-shadow(0 0 16px rgba(255, 107, 0, 0.3))',
        imageRendering: 'pixelated'
      }}
    >
      <Image
        src="/orange-logo.png"
        alt="ORRANGE"
        width={size}
        height={size}
        className="object-contain"
        style={{ imageRendering: 'pixelated' }}
        priority
        unoptimized // For pixel art crispness
      />
    </div>
  );
}

export function PixelOrangeText({ className = '' }: { className?: string }) {
  return (
    <span 
      className={`font-black tracking-tight ${className}`}
      style={{
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontWeight: 900,
        letterSpacing: '-0.02em',
        textShadow: '0 0 20px rgba(255, 107, 0, 0.4), 0 0 40px rgba(255, 107, 0, 0.2)',
        background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C38 50%, #FFB347 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}
    >
      ORRANGE
    </span>
  );
}
