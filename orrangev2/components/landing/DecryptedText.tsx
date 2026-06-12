'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';

interface DecryptedTextProps extends HTMLMotionProps<'span'> {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  parentClassName?: string;
  animateOn?: 'view' | 'hover' | 'both';
}

export default function DecryptedText({
  text, speed = 50, maxIterations = 10, sequential = false,
  revealDirection = 'start', useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  className = '', parentClassName = '', encryptedClassName = '',
  animateOn = 'hover', ...props
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let currentIteration = 0;
    const availableChars = useOriginalCharsOnly
      ? Array.from(new Set(text.split(''))).filter(c => c !== ' ')
      : characters.split('');

    const getNextIndex = (revealed: Set<number>) => {
      switch (revealDirection) {
        case 'end': return text.length - 1 - revealed.size;
        case 'center': {
          const mid = Math.floor(text.length / 2);
          const off = Math.floor(revealed.size / 2);
          const idx = revealed.size % 2 === 0 ? mid + off : mid - off - 1;
          if (idx >= 0 && idx < text.length && !revealed.has(idx)) return idx;
          for (let i = 0; i < text.length; i++) if (!revealed.has(i)) return i;
          return 0;
        }
        default: return revealed.size;
      }
    };

    const shuffle = (orig: string, revealed: Set<number>) => orig.split('').map((char, i) => {
      if (char === ' ') return ' ';
      if (revealed.has(i)) return orig[i];
      return availableChars[Math.floor(Math.random() * availableChars.length)];
    }).join('');

    if (isHovering) {
      setIsScrambling(true);
      interval = setInterval(() => {
        setRevealedIndices(prev => {
          if (sequential) {
            if (prev.size < text.length) {
              const next = getNextIndex(prev);
              const newSet = new Set(prev);
              newSet.add(next);
              setDisplayText(shuffle(text, newSet));
              return newSet;
            } else { clearInterval(interval); setIsScrambling(false); return prev; }
          } else {
            setDisplayText(shuffle(text, prev));
            if (++currentIteration >= maxIterations) { clearInterval(interval); setIsScrambling(false); setDisplayText(text); }
            return prev;
          }
        });
      }, speed);
    } else {
      setDisplayText(text);
      setRevealedIndices(new Set());
      setIsScrambling(false);
    }
    return () => clearInterval(interval);
  }, [isHovering, text, speed, maxIterations, sequential, revealDirection, characters, useOriginalCharsOnly]);

  useEffect(() => {
    if (animateOn !== 'view' && animateOn !== 'both') return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting && !hasAnimated) { setIsHovering(true); setHasAnimated(true); } });
    }, { threshold: 0.1 });
    const el = containerRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [animateOn, hasAnimated]);

  const hoverProps = animateOn === 'hover' || animateOn === 'both'
    ? { onMouseEnter: () => setIsHovering(true), onMouseLeave: () => setIsHovering(false) }
    : {};

  return (
    <motion.span ref={containerRef} className={`inline-block whitespace-pre-wrap ${parentClassName}`} {...hoverProps} {...props}>
      <span className="sr-only">{displayText}</span>
      <span aria-hidden="true">
        {displayText.split('').map((char, i) => {
          const done = revealedIndices.has(i) || !isScrambling || !isHovering;
          return <span key={i} className={done ? className : encryptedClassName}>{char}</span>;
        })}
      </span>
    </motion.span>
  );
}
