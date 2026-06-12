'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export function ScrollVideoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Track scroll progress through this section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  
  // Smooth the scroll progress for buttery playback
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  // Transform scroll progress to video time
  // Video starts at 4.5s, ends at 10s = 5.5s of usable footage
  const videoTime = useTransform(smoothProgress, [0, 1], [4.5, 10]);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Preload video and start at 4.5s
    video.currentTime = 4.5;
    video.pause();
    setIsReady(true);
    
    // Subscribe to time changes
    const unsubscribe = videoTime.on("change", (time) => {
      if (video.readyState >= 2) {
        video.currentTime = time;
      }
    });
    
    return () => unsubscribe();
  }, [videoTime]);
  
  // Fade in/out based on scroll position
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.9, 1, 1, 0.9]);
  
  return (
    <section 
      ref={containerRef} 
      className="relative h-[200vh] bg-black"
    >
      {/* Sticky container for the video */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
        
        {/* Video container with cinematic aspect ratio */}
        <motion.div 
          style={{ opacity, scale }}
          className="relative w-full max-w-6xl mx-auto px-6"
        >
          {/* Cinematic letterbox frame */}
          <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 shadow-2xl shadow-orange-500/10">
            {/* Video element - no controls, no autoplay, muted */}
            <video
              ref={videoRef}
              src="/reate_a_pixelart_video_with_bl.mp4"
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="auto"
              style={{ 
                willChange: 'transform',
                imageRendering: 'pixelated'
              }}
            />
            
            {/* Vignette overlay for cinematic feel */}
            <div className="absolute inset-0 bg-radial-gradient pointer-events-none" 
              style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)'
              }}
            />
            
            {/* Film grain texture overlay */}
            <div 
              className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>
          
          {/* Scroll hint - fades out as you scroll */}
          <motion.div 
            style={{ 
              opacity: useTransform(scrollYProgress, [0, 0.15], [1, 0])
            }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
              Scroll to continue
            </span>
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent"
            />
          </motion.div>
        </motion.div>
        
        {/* Edge gradients for seamless transitions */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
