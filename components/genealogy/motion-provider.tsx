'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    root.classList.remove('route-leaving');
    root.classList.remove('motion-ready');
    if (reduceMotion) return;

    // The root class restarts CSS-only entrance animation without mutating
    // React-owned elements while a streamed route is hydrating.
    const animationFrame = window.requestAnimationFrame(() => {
      root.classList.add('motion-ready');
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
      document.removeEventListener('click', markRouteLeaving, true);
      root.classList.remove('motion-ready');
      root.classList.remove('route-leaving');
    };
  }, [pathname]);

  return children;
}
