'use client';

import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import styles from './Reveal.module.scss';

type RevealVariant = 'up' | 'left' | 'right' | 'scale' | 'fade';

type RevealProps = {
  /** Rendered element. Defaults to `div`; pass `li`/`p`/`section` when the
   *  surrounding markup requires a specific tag. */
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Stagger, in milliseconds, applied once the element enters the viewport. */
  delay?: number;
  style?: CSSProperties;
  variant?: RevealVariant;
};

const VARIANT_CLASS: Record<RevealVariant, string> = {
  up: styles.up,
  left: styles.left,
  right: styles.right,
  scale: styles.scale,
  fade: styles.fade,
};

/**
 * Reveals its children the first time they scroll into view, then stops
 * observing — the animation never replays on scroll-up, which is what makes
 * repeated passes over a long page feel calm rather than busy.
 *
 * Content is never hidden by this component alone: the hidden start state
 * lives entirely in CSS behind `@media (scripting: enabled)`, so JS being off,
 * broken, or simply older than that query all resolve to "visible, no
 * animation". `prefers-reduced-motion` is handled in the stylesheet for the
 * same reason, which is also why there is no `matchMedia` call here.
 */
export default function Reveal({
  as: Tag = 'div',
  children,
  className,
  delay = 0,
  style,
  variant = 'up',
}: RevealProps) {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setIsVisible(true);
          observer.disconnect();
        }
      },
      // A negative bottom margin holds the reveal back until the element is
      // properly on screen, rather than firing on the first stray pixel.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      className={[
        styles.reveal,
        VARIANT_CLASS[variant],
        isVisible && styles.visible,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      ref={elementRef}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
    >
      {children}
    </Tag>
  );
}
