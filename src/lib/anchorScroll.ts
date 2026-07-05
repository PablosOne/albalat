import type Lenis from 'lenis';
import { MOBILE_BREAKPOINT_PX, buildShowcaseGeometry } from '@/lib/config';

/** Document-Y of an element, traversing offsetParents. This stays correct while
 *  ScrollTrigger has the showcase pinned — unlike getBoundingClientRect + scrollY,
 *  which during pin returns (viewport-top + current-scroll), collapsing the target
 *  to the current scroll position and breaking "scroll to panel 1" from mid-pin. */
function absoluteTop(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

/** Resolve the vertical scroll Y that aligns a horizontal panel fully in view.
 *  Panels live inside a pinned showcase whose horizontal translate is scrubbed by
 *  vertical scroll. On mobile the track stacks vertically, so we fall back to the
 *  panel's natural element position. */
function panelScrollY(panelId: string): number | null {
  const section = document.querySelector<HTMLElement>('[data-showcase]');
  const panels  = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'));
  const panel   = panels.find(p => p.dataset.showcasePanelId === panelId);
  if (!panel || !section) return null;
  const idx = panels.indexOf(panel);

  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isMobile && !prefersReduced) {
    const track = document.querySelector<HTMLElement>('[data-showcase-track]');
    const scrollContainer = section;
    if (track && scrollContainer) {
      scrollContainer.scrollTo({ left: panel.offsetLeft, behavior: 'smooth' });
      return null;
    }
  }
  if (isMobile || prefersReduced) {
    return absoluteTop(panel);
  }

  // ScrollTrigger wraps the pinned section in a pin-spacer div whose natural height
  // is (section height + pin distance). Measuring via offsetTop up that chain gives
  // the scroll-Y origin of the showcase regardless of pin state.
  const pinSpacer   = section.parentElement?.classList.contains('pin-spacer')
    ? section.parentElement
    : section;
  const sectionTop  = absoluteTop(pinSpacer as HTMLElement);
  // Panel N (0-indexed) reaches full alignment after the cumulative
  // per-transition scroll distances, which we derive from the same panel
  // weights the showcase engine uses (emitted by Panel.astro at build time).
  // Gaps are emitted in absolute pixels; convert to vw fractions for the
  // geometry helper using the current viewport width.
  const weights = panels.map(p => {
    const v = Number(p.dataset.showcasePanelWeight);
    return Number.isFinite(v) && v > 0 ? v : 1;
  });
  const innerWidth = window.innerWidth;
  const gaps = panels.map(p => {
    const px = Number(p.dataset.showcasePanelGapAfterPx);
    return Number.isFinite(px) && px >= 0 ? px / innerWidth : 0;
  });
  const { panelOffsetMultipliers } = buildShowcaseGeometry(weights, gaps);
  return sectionTop + window.innerHeight * (panelOffsetMultipliers[idx] ?? 0);
}

function getCurrentPanelIndex(): number {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'));
  if (!panels.length) return -1;

  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isMobile && !prefersReduced) {
    const section = document.querySelector<HTMLElement>('[data-showcase]');
    const left = section?.scrollLeft ?? 0;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    panels.forEach((panel, i) => {
      const distance = Math.abs(panel.offsetLeft - left);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    return best;
  }

  const y = window.scrollY;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  panels.forEach((panel, i) => {
    const id = panel.dataset.showcasePanelId;
    if (!id) return;
    const panelY = panelScrollY(id);
    if (panelY === null) return;
    const distance = Math.abs(panelY - y);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

function scrollToPanel(panelId: string): void {
  const y = panelScrollY(panelId);
  if (y === null) return;

  const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
  if (lenis) {
    lenis.scrollTo(y, { duration: 1.2 });
  } else {
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

/** Hijack clicks on same-page `#id` links and route them through Lenis for
 *  smooth scrolling that respects the horizontal showcase mapping. */
export function initAnchorScroll(): () => void {
  const handler = (event: MouseEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor) return;
    const id = anchor.getAttribute('href')?.slice(1);
    if (!id) return;

    const panel = document.querySelector<HTMLElement>(`[data-showcase-panel-id="${CSS.escape(id)}"]`);
    if (!panel) return;

    event.preventDefault();
    history.pushState(null, '', `#${id}`);
    scrollToPanel(id);
  };

  const keyHandler = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) return;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;

    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'));
    if (!panels.length) return;

    const current = getCurrentPanelIndex();
    if (current < 0) return;
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.max(0, Math.min(panels.length - 1, current + direction));
    const id = panels[next]?.dataset.showcasePanelId;
    if (!id || next === current) return;

    event.preventDefault();
    scrollToPanel(id);
  };

  document.addEventListener('click', handler);
  document.addEventListener('keydown', keyHandler);
  return () => {
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', keyHandler);
  };
}
