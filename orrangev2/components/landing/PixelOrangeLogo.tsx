'use client';

import React from 'react';

interface PixelOrangeLogoProps {
  size?: number;
  className?: string;
}

export function PixelOrangeLogo({ size = 48, className = '' }: PixelOrangeLogoProps) {
  const pixelSize = size / 12;
  
  // Pixel art representation of peeled orange (0 = empty, 1 = orange, 2 = peel/highlight, 3 = shadow)
  const pixelMap = [
    [0,0,0,1,1,1,1,1,0,0,0,0],
    [0,0,1,1,2,2,2,1,1,0,0,0],
    [0,1,1,2,2,2,2,2,1,1,0,0],
    [0,1,2,2,3,3,3,2,2,1,0,0],
    [1,1,2,3,3,3,3,3,2,1,1,0],
    [1,2,2,3,3,3,3,3,2,2,1,0],
    [1,2,2,3,3,3,3,3,2,2,1,0],
    [1,2,2,3,3,3,3,3,2,2,1,0],
    [1,1,2,3,3,3,3,3,2,1,1,0],
    [0,1,2,2,3,3,3,2,2,1,0,0],
    [0,1,1,2,2,2,2,2,1,1,0,0],
    [0,0,1,1,1,1,1,1,1,0,0,0],
  ];

  const getColor = (type: number) => {
    switch (type) {
      case 1: return '#FF6B00'; // Main orange
      case 2: return '#FF8C38'; // Lighter orange/peel
      case 3: return '#CC5500'; // Darker/shadow
      default: return 'transparent';
    }
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ 
        filter: 'drop-shadow(0 0 8px rgba(255, 107, 0, 0.4)) drop-shadow(0 0 16px rgba(255, 107, 0, 0.2))',
        imageRendering: 'pixelated'
      }}
    >
      {pixelMap.map((row, y) =>
        row.map((pixel, x) => {
          if (pixel === 0) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * pixelSize}
              y={y * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={getColor(pixel)}
              shapeRendering="crispEdges"
            />
          );
        })
      )}
    </svg>
  );
}

export function PixelOrangeText({ className = '' }: { className?: string }) {
  return (
    <span 
      className={`font-mono font-bold tracking-wider ${className}`}
      style={{
        fontFamily: "'Courier New', monospace",
        textShadow: '0 0 10px rgba(255, 107, 0, 0.5), 0 0 20px rgba(255, 107, 0, 0.3), 0 0 30px rgba(255, 107, 0, 0.1)',
        letterSpacing: '0.15em'
      }}
    >
      ORRANGE
    </span>
  );
}
