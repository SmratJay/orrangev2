'use client';
import { ReactNode } from 'react';
import { motion, Variants } from 'motion/react';
import React from 'react';

export type AnimatedGroupProps = {
  children: ReactNode;
  className?: string;
  variants?: { container?: Variants; item?: Variants };
  preset?: 'fade' | 'slide' | 'scale' | 'blur' | 'blur-slide' | 'zoom' | 'flip' | 'bounce' | 'rotate' | 'swing';
  as?: React.ElementType;
  asChild?: React.ElementType;
  triggerOnView?: boolean;
  viewportOptions?: { once?: boolean; amount?: number | 'some' | 'all'; margin?: string };
};

const presetVariants: Record<string, Variants> = {
  fade: {},
  slide: { hidden: { y: 20 }, visible: { y: 0 } },
  scale: { hidden: { scale: 0.8 }, visible: { scale: 1 } },
  blur: { hidden: { filter: 'blur(4px)' }, visible: { filter: 'blur(0px)' } },
  'blur-slide': { hidden: { filter: 'blur(4px)', y: 20 }, visible: { filter: 'blur(0px)', y: 0 } },
  zoom: { hidden: { scale: 0.5 }, visible: { scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } } },
  flip: { hidden: { rotateX: -90 }, visible: { rotateX: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } } },
  bounce: { hidden: { y: -50 }, visible: { y: 0, transition: { type: 'spring', stiffness: 400, damping: 10 } } },
  rotate: { hidden: { rotate: -180 }, visible: { rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } } },
  swing: { hidden: { rotate: -10 }, visible: { rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 8 } } },
};

const addDefault = (v: Variants) => ({ hidden: { opacity: 0, ...v.hidden }, visible: { opacity: 1, ...v.visible } });

export function AnimatedGroup({ children, className, variants, preset, as = 'div', asChild = 'div', triggerOnView = false, viewportOptions = { once: true, amount: 0.3 } }: AnimatedGroupProps) {
  const selected = { item: addDefault(preset ? presetVariants[preset] : {}), container: addDefault({ visible: { transition: { staggerChildren: 0.1 } } }) };
  const containerVariants = variants?.container || selected.container;
  const itemVariants = variants?.item || selected.item;
  const MotionComponent = React.useMemo(() => motion(as as React.ElementType), [as]);
  const MotionChild = React.useMemo(() => motion(asChild as React.ElementType), [asChild]);
  const animationProps = triggerOnView
    ? { initial: 'hidden', whileInView: 'visible', viewport: viewportOptions }
    : { initial: 'hidden', animate: 'visible' };
  return (
    <MotionComponent {...animationProps} variants={containerVariants} className={className}>
      {React.Children.map(children, (child, i) => (
        <MotionChild key={i} variants={itemVariants}>{child}</MotionChild>
      ))}
    </MotionComponent>
  );
}
