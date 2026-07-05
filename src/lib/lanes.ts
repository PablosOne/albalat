import type Lenis from 'lenis';
import { MOBILE_BREAKPOINT_PX, buildShowcaseGeometry, LANE_TRANSITION_S, SHOWCASE_PARALLAX_Y_GLOBAL_SCALE } from '@/lib/config';

export function laneIdFromHash(hash: string): string | null {
  if (!hash) return null;
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  return id.length ? id : null;
}

export function hasDetailLane(id: string, doc: Document = document): boolean {
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return !!doc.querySelector(`[data-detail-lane="${escaped}"]`);
}

export function resolveInitialDetail(explicit: string | null, hash: string): string | null {
  if (explicit) return explicit;
  return laneIdFromHash(hash);
}

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

interface LaneState { openId: string | null; restoreFocus: HTMLElement | null; detachY?: () => void; }

function isDesktopMotion(): boolean {
  return !window.matchMedia('(max-width: 767px)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function initLanes(opts: { initialDetail?: string | null } = {}): () => void {
  if (typeof window === 'undefined') return () => {};
  const state: LaneState = { openId: null, restoreFocus: null };

  const laneEl = (id: string) =>
    document.querySelector<HTMLElement>(`[data-detail-lane="${CSS.escape(id)}"]`);

  const pluckThreshold = (id: string) => {
    const svg = document.querySelector<SVGSVGElement>(`[data-lane-open="${CSS.escape(id)}"] svg[data-string]`);
    // string handles are owned by string.ts; dispatch a pointer pulse instead:
    svg?.dispatchEvent(new PointerEvent('pointerenter'));
    window.setTimeout(() => svg?.dispatchEvent(new PointerEvent('pointerleave')), 260);
  };

  async function openLane(id: string) {
    const lane = laneEl(id);
    // Same lane already open (or mid-open): no-op instead of restarting the tween.
    if (!lane || state.openId === id) return;
    // Capture the trigger before any await touches focus (e.g. via closeLane's
    // restore-focus step below), so the *new* lane restores focus to the element
    // that actually opened it, not to whatever closeLane() restored focus to.
    const trigger = document.activeElement as HTMLElement | null;
    // A different lane is already open: close it fully before opening this one,
    // so we never end up with two lanes visible (hidden = false) at once.
    if (state.openId) await closeLane();
    // Set synchronously (before the open-tween's `await import('gsap')`) so
    // closeLane()/onKey's Escape guard and the re-entry guard above see the
    // correct id immediately, not only after the ~0.7s slide-in finishes.
    state.openId = id;
    state.restoreFocus = trigger;

    // 1) align the main lane to the station first (so exit restores exactly here)
    scrollToPanel(id);
    pluckThreshold(id);

    // 2) reveal + slide
    lane.hidden = false;
    const scroller = lane.querySelector<HTMLElement>('[data-detail-scroll]');
    if (scroller) scroller.scrollTop = 0;

    if (isDesktopMotion()) {
      const { gsap } = await import('gsap');
      gsap.killTweensOf(lane);
      gsap.fromTo(lane, { yPercent: 100, autoAlpha: 1 },
        { yPercent: 0, duration: LANE_TRANSITION_S, ease: 'power3.out' });

      // 3) vertical parallax for [data-parallax-y] descendants, scrubbed by the
      // lane's own scroll container. Desktop/motion-enabled only; detached in
      // closeLane so repeated open/close cycles never leave a stale listener.
      if (scroller) {
        const yEls = Array.from(lane.querySelectorAll<HTMLElement>('[data-parallax-y]'));
        if (yEls.length) {
          const onScrollY = () => {
            const top = scroller.scrollTop;
            yEls.forEach((el) => {
              const m = Number(el.dataset.parallaxY) || 0;
              el.style.transform = `translateY(${(top * m * SHOWCASE_PARALLAX_Y_GLOBAL_SCALE * 0.1).toFixed(1)}px)`;
            });
          };
          onScrollY(); // sync to the reset scrollTop=0 before the listener is live
          scroller.addEventListener('scroll', onScrollY, { passive: true });
          state.detachY = () => scroller.removeEventListener('scroll', onScrollY);
        }
      }
    }
    document.documentElement.setAttribute('data-lane-open', id);
    history.replaceState(null, '', `#${id}`);
    lane.querySelector<HTMLElement>('[data-detail-heading]')?.focus();
  }

  async function closeLane() {
    const id = state.openId;
    if (!id) return;
    const lane = laneEl(id);
    const finish = () => {
      state.detachY?.();
      state.detachY = undefined;
      if (lane) lane.hidden = true;
      document.documentElement.removeAttribute('data-lane-open');
      history.replaceState(null, '', window.location.pathname + window.location.search);
      state.openId = null;
      state.restoreFocus?.focus?.();
      scrollToPanel(id); // re-align in case anything shifted
    };
    if (lane && isDesktopMotion()) {
      const { gsap } = await import('gsap');
      gsap.killTweensOf(lane);
      // Await the tween's own completion (not just its kickoff) so callers that
      // `await closeLane()` before opening a different lane (see openLane above)
      // see state.openId cleared before they proceed — otherwise finish() would
      // fire later and clobber the newly-set state.openId back to null.
      await new Promise<void>((resolve) => {
        gsap.to(lane, {
          yPercent: 100, duration: LANE_TRANSITION_S, ease: 'power3.in',
          onComplete: () => { finish(); resolve(); },
        });
      });
    } else {
      finish();
    }
  }

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const closer = (e.target as Element | null)?.closest('[data-lane-close]');
    if (closer) { e.preventDefault(); e.stopPropagation(); void closeLane(); return; }
    const opener = (e.target as Element | null)?.closest<HTMLElement>('[data-lane-open], a[href^="#"]');
    if (!opener) return;
    const id = opener.getAttribute('data-lane-open')
      ?? laneIdFromHash(opener.getAttribute('href') ?? '');
    if (!id) return;
    const panel = document.querySelector(`[data-showcase-panel-id="${CSS.escape(id)}"]`);
    if (!panel) return;
    e.preventDefault();
    e.stopPropagation();
    if (hasDetailLane(id)) void openLane(id);
    else { history.pushState(null, '', `#${id}`); scrollToPanel(id); } // station w/o lane
  };

  const onKey = (e: KeyboardEvent) => {
    if (state.openId) {
      const scroller = laneEl(state.openId)?.querySelector<HTMLElement>('[data-detail-scroll]');
      if (e.key === 'Escape') { e.preventDefault(); void closeLane(); return; }
      if (e.key === 'ArrowUp' && scroller && scroller.scrollTop <= 0) { e.preventDefault(); void closeLane(); return; }
      return; // inside a lane, let native vertical scroll handle the rest
    }
    // main-lane keyboard nav (ported from anchorScroll.ts)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, select, button, [contenteditable="true"]')) return;
    if (!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) return;
    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'));
    const current = getCurrentPanelIndex();
    if (current < 0) return;
    const dir = (e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowLeft') ? -1 : 0;
    // ArrowDown on a station that has a lane opens it:
    if (e.key === 'ArrowDown') {
      const id = panels[current]?.dataset.showcasePanelId;
      if (id && hasDetailLane(id)) { e.preventDefault(); void openLane(id); return; }
    }
    if (dir === 0) return;
    const next = Math.max(0, Math.min(panels.length - 1, current + dir));
    const id = panels[next]?.dataset.showcasePanelId;
    if (id && next !== current) { e.preventDefault(); scrollToPanel(id); }
  };

  document.addEventListener('click', onClick, { capture: true });
  document.addEventListener('keydown', onKey);

  // Open initialDetail (route deep-link or hash) once the showcase has laid out.
  const initial = resolveInitialDetail(opts.initialDetail ?? null, window.location.hash);
  if (initial) requestAnimationFrame(() => requestAnimationFrame(() => {
    if (hasDetailLane(initial)) void openLane(initial);
  }));

  return () => {
    document.removeEventListener('click', onClick, { capture: true });
    document.removeEventListener('keydown', onKey);
  };
}
