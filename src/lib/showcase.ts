import { MOBILE_BREAKPOINT_PX } from '@/lib/config';

/**
 * Showcase scroll engine — viewport-aware dispatcher.
 *
 * BUNDLE NOTE
 * ───────────
 * The desktop pinned/scrubbed implementation requires gsap + ScrollTrigger
 * (~50 KB gzipped). The mobile implementation only needs IntersectionObserver
 * (native, 0 KB). To avoid shipping ScrollTrigger to mobile users — who never
 * use it — this file dispatches to one of two dynamically-imported modules:
 *
 *  - `showcase.desktop.ts` — gsap + ScrollTrigger pinned horizontal scrub
 *  - `showcase.mobile.ts`  — IO-driven reveals + decorative-loop gating
 *
 * ARCHITECTURE — desktop
 * ──────────────────────
 * The page has one full-height `<section data-showcase>` containing a
 * horizontal flex `<div data-showcase-track>` of panels. ScrollTrigger pins
 * the section vertically and scrubs `track.x` from 0 → −(track width − vw)
 * over a vertical scroll distance proportional to the cumulative panel
 * widths. So vertical wheel = horizontal pan.
 *
 * REVEAL TRIGGERS — `containerAnimation` is mandatory
 * ───────────────────────────────────────────────────
 * Per-panel reveals must use `containerAnimation: tween` against the main
 * horizontal tween, with the *panel itself* as the trigger and
 * `start/end: 'left center' / 'right center'` (positions in the
 * containerAnimation's coordinate space, not document scroll). See
 * `showcase.desktop.ts` for the implementation.
 */
export async function initShowcase(): Promise<() => void> {
  if (typeof window === 'undefined') return () => {};

  const section = document.querySelector<HTMLElement>('[data-showcase]');
  const track = document.querySelector<HTMLElement>('[data-showcase-track]');
  if (!section || !track) return () => {};

  const panels = track.querySelectorAll<HTMLElement>('[data-showcase-panel]');
  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;

  if (isMobile) {
    const { initShowcaseMobile } = await import('./showcase.mobile');
    return initShowcaseMobile(track, panels);
  }

  const { initShowcaseDesktop } = await import('./showcase.desktop');
  return initShowcaseDesktop(section, track, panels);
}
