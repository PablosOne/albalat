import type Lenis from 'lenis';
import { MOBILE_BREAKPOINT_PX } from '@/lib/config';

/** Initialise smooth scroll + ScrollTrigger synchronisation.
 *  Called from the base layout on every `astro:page-load` (including the
 *  first). Returns a teardown function the caller must run before
 *  re-initialising, since ClientRouter swaps re-run this without a full
 *  page reload — leaving the old Lenis instance and gsap ticker callback
 *  running would double-drive scroll.
 *
 *  BUNDLE NOTE
 *  ───────────
 *  Lenis (~12 KB) and gsap/ScrollTrigger (~50 KB) are dynamically imported
 *  only when actually needed (desktop, fine pointer, motion enabled). Mobile
 *  and reduced-motion users never pay for these — Lighthouse "unused JS"
 *  warning was largely from these two libs sitting in the main chunk.
 */
export async function initScroll(): Promise<() => void> {
  if (typeof window === 'undefined') return () => {};

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Lenis on touch devices fights the browser's native momentum scroll and
  // produces noticeable lag/jank. Use native vertical scroll on mobile/coarse
  // pointers; the showcase track stacks vertically there anyway (no horizontal
  // pin scrub to keep in sync).
  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  if (prefersReduced || isMobile || isCoarse) {
    return () => {};
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

  const unsubscribeScroll = lenis.on('scroll', ScrollTrigger.update);

  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.refresh();

  // Expose for anchorScroll.ts and other modules that need to trigger smooth scrolls.
  (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

  return () => {
    gsap.ticker.remove(tick);
    unsubscribeScroll();
    lenis.destroy();
    if ((window as unknown as { __lenis?: Lenis }).__lenis === lenis) {
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    }
  };
}
