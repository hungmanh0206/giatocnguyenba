'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const revealTargets = [
  'main#main > *',
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
    const root = document.documentElement;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(revealTargets),
    );

    if (!nodes.length || reduceMotion) return;

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

    root.classList.remove('route-leaving');
    root.classList.add('motion-ready');

    nodes.forEach((node, index) => {
      node.dataset.motionReveal = '';
      node.classList.remove('is-revealed');
      node.style.setProperty('--motion-delay', `${Math.min(index, 3) * 45}ms`);
    });

    // Waiting one frame lets the hidden initial state paint before each block reveals.
    const animationFrame = window.requestAnimationFrame(() => {
      nodes.forEach((node) => {
        if (node.getBoundingClientRect().top < window.innerHeight * 0.92) {
          reveal(node);
        } else {
          observer.observe(node);
        }
      });
    });

    const markRouteLeaving = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        anchor.dataset.noPageTransition !== undefined
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname
      ) {
        return;
      }

      root.classList.add('route-leaving');
    };

    document.addEventListener('click', markRouteLeaving, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      document.removeEventListener('click', markRouteLeaving, true);
      nodes.forEach((node) => {
        node.classList.remove('is-revealed');
        node.removeAttribute('data-motion-reveal');
        node.style.removeProperty('--motion-delay');
      });
      root.classList.remove('motion-ready');
      root.classList.remove('route-leaving');
    };
  }, [pathname]);

  return children;
}
