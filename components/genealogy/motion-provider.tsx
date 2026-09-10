'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const revealTargets = [
  '.home-stats-band',
  '.home-tree-band',
  '.home-anniversary-band',
  '.history-band',
  '.page-heading',
  '.filter-bar',
  '.member-results',
  '.profile-hero',
  '.profile-layout',
  '.calendar-layout',
  '.history-body',
  '.tree-toolbar',
  '.tree-canvas',
  '.admin-table-wrap',
].join(',');

export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(revealTargets),
    );

    if (!nodes.length || reduceMotion) return;

    const root = document.documentElement;
    const reveal = (node: HTMLElement) => node.classList.add('is-revealed');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8%', threshold: 0.08 },
    );

    nodes.forEach((node, index) => {
      node.dataset.motionReveal = '';
      node.style.setProperty('--motion-delay', `${Math.min(index, 3) * 45}ms`);

      if (node.getBoundingClientRect().top < window.innerHeight * 0.92) {
        reveal(node);
      } else {
        observer.observe(node);
      }
    });

    root.classList.add('motion-ready');

    return () => {
      observer.disconnect();
      root.classList.remove('motion-ready');
    };
  }, [pathname]);

  return children;
}
