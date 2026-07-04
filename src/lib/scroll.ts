import type Lenis from 'lenis';
import { MOBILE_BREAKPOINT_PX } from '@/lib/config';

/** Initialise smooth scroll + ScrollTrigger synchronisation.
 *  Call once from a client-side script in the base layout.
 *
 *  BUNDLE NOTE
 *  ───────────
 *  Lenis (~12 KB) and gsap/ScrollTrigger (~50 KB) are dynamically imported
 *  only when actually needed (desktop, fine pointer, motion enabled). Mobile
 *  and reduced-motion users never pay for these — Lighthouse "unused JS"
 *  warning was largely from these two libs sitting in the main chunk.
 */
export async function initScroll(): Promise<Lenis | null> {
  if (typeof window === 'undefined') return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Lenis on touch devices fights the browser's native momentum scroll and
  // produces noticeable lag/jank. Use native vertical scroll on mobile/coarse
  // pointers; the showcase track stacks vertically there anyway (no horizontal
  // pin scrub to keep in sync).
  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  if (prefersReduced || isMobile || isCoarse) {
    return null;
  }

  // Dynamic import keeps Lenis + ScrollTrigger out of the mobile bundle.
  const [{ default: LenisCtor }, { gsap }, { ScrollTrigger }, { LENIS_LERP }] = await Promise.all([
    import('lenis'),
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('@/lib/config'),
  ]);

  gsap.registerPlugin(ScrollTrigger);

  const lenis = new LenisCtor({
    lerp: LENIS_LERP,
    wheelMultiplier: 1,
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.refresh();

  // Expose for anchorScroll.ts and other modules that need to trigger smooth scrolls.
  (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

  return lenis;
}
