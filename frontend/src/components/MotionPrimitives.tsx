import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const EDITORIAL_EASE: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];

interface RevealBlockProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const RevealBlock: React.FC<RevealBlockProps> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  return (
    <motion.div
      ref={ref}
      initial={prefersReduced ? false : { opacity: 0, y: 16 }}
      animate={
        visible ? { opacity: 1, y: 0 } : prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
      }
      transition={{ duration: 0.5, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface CountUpValueProps {
  value: number;
  formatter?: (n: number) => string;
  durationMs?: number;
}

export const CountUpValue: React.FC<CountUpValueProps> = ({
  value,
  formatter = (n) => String(Math.round(n)),
  durationMs = 700,
}) => {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState<number>(prefersReduced ? value : 0);
  const prevRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    const startVal = prevRef.current;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // cubic-out curve
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startVal + (value - startVal) * eased;
      setDisplay(current);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs, prefersReduced]);

  return <>{formatter(display)}</>;
};

export interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

export const useButtonRipple = () => {
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  const triggerRipple = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX ? e.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
      const y = e.clientY ? e.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;
      const id = Date.now() + Math.random();
      setRipples((prev) => [...prev.slice(-2), { id, x, y, size }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    },
    []
  );

  return { ripples, triggerRipple };
};
