import type Lenis from 'lenis';
import { MOBILE_BREAKPOINT_PX, buildShowcaseGeometry, SHOWCASE_PARALLAX_Y_GLOBAL_SCALE } from '@/lib/config';

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

type GsapInstance = typeof import('gsap').gsap;

interface LaneState { openId: string | null; restoreFocus: HTMLElement | null; detachY?: () => void; detachPull?: () => void; trackTween?: { kill: () => void }; closing?: boolean; }

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

  // Coordinated "same-level" descent, shared by open and close so both directions
  // stay in lockstep. The detail lane and the panel row (main lane) move as one:
  // opening, the lane rises from below while the panels slide up and off the top;
  // closing reverses it. The panels ride the [data-showcase-descent] layer, which
  // is a DIFFERENT element from the scrubbed track — so driving its y never fights
  // the horizontal scrub (that owns the track's x). This decoupling is what makes
  // the descent slide on every open, not only the first. state.trackTween clears
  // any stale y-tween so repeat cycles always start from a clean 0/-100.
  const descend = (
    gsap: GsapInstance,
    lane: HTMLElement,
    panelsLayer: HTMLElement | null,
    dir: 'open' | 'close',
    onComplete?: () => void,
  ) => {
    const ease = dir === 'open' ? 'power3.out' : 'power3.in';
    // eslint-disable-next-line no-console
    console.log('[descend]', dir, { panelsLayer: !!panelsLayer, lane: !!lane, laneHidden: lane.hidden, laneTransform: getComputedStyle(lane).transform });
    if (panelsLayer) {
      state.trackTween?.kill();
      state.trackTween = gsap.to(panelsLayer, {
        yPercent: dir === 'open' ? -100 : 0,
        duration: 0.6,
        ease,
        onStart: () => console.log('[descend] panelsLayer onStart', getComputedStyle(panelsLayer).transform),
        onUpdate() { if ((this as { _n?: number })._n === undefined) { (this as { _n?: number })._n = 1; console.log('[descend] panelsLayer first update', getComputedStyle(panelsLayer).transform); } },
        onComplete: () => console.log('[descend] panelsLayer onComplete', getComputedStyle(panelsLayer).transform),
        // Strip the inline transform once closed so the resting layer carries no
        // lingering translate(0,0) (which would leave a stray stacking context).
        ...(dir === 'close' ? { clearProps: 'transform' } : {}),
      });
    }
    // The lane's own tween uses fromTo (not a separate gsap.set + gsap.to) so the
    // start/end values are captured atomically in one tween — a preceding gsap.set
    // immediately followed by gsap.to on the same target left the open direction
    // rendering with no visible motion (close, which has no preceding set, was fine).
    if (dir === 'open') {
      gsap.fromTo(
        lane,
        { yPercent: 100, autoAlpha: 1 },
        { yPercent: 0, autoAlpha: 1, duration: 0.6, ease, overwrite: 'auto',
          onStart: () => console.log('[descend] lane onStart', getComputedStyle(lane).transform),
          onUpdate() { if ((this as { _n?: number })._n === undefined) { (this as { _n?: number })._n = 1; console.log('[descend] lane first update', getComputedStyle(lane).transform); } },
          onComplete: () => { console.log('[descend] lane onComplete', getComputedStyle(lane).transform); onComplete?.(); } },
      );
    } else {
      gsap.to(lane, { yPercent: 100, autoAlpha: 1, duration: 0.6, ease, overwrite: 'auto', onComplete });
    }
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

    pluckThreshold(id);

    // reveal + slide
    const scroller = lane.querySelector<HTMLElement>('[data-detail-scroll]');
    if (scroller) scroller.scrollTop = 0;

    if (isDesktopMotion()) {
      const { gsap } = await import('gsap');
      // Drive the descent layer (panels), NOT the pinned [data-showcase] section
      // (whose fixed-position lane children would ride a section transform) and
      // NOT the scrubbed track (whose x the horizontal scrub owns).
      const panelsLayer = document.querySelector<HTMLElement>('[data-showcase-descent]');
      lane.hidden = false;
      gsap.killTweensOf(lane);
      // Reveal + off-screen start + descend all happen inside the fromTo below
      // (no flash), in one atomic tween — see descend()'s comment for why.
      descend(gsap, lane, panelsLayer, 'open');

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
          state.detachY?.();
          state.detachY = undefined;
          scroller.addEventListener('scroll', onScrollY, { passive: true });
          state.detachY = () => scroller.removeEventListener('scroll', onScrollY);
        }
      }
    } else {
      // Mobile / reduced-motion: lanes are inline in the native vertical stack,
      // no slide — just reveal.
      lane.hidden = false;
    }
    // Overscroll-to-exit: at the very top of the detail, continuing to pull up
    // rubber-bands the content down and releases back to THIS station's main lane;
    // at the very bottom, continuing to pull down releases forward to the NEXT
    // station's main lane. Both build progressive resistance before the release
    // threshold. Desktop/motion only — mobile/reduced-motion lanes are inline in
    // the native vertical stack, where native over-scroll already carries you out
    // to the neighbouring content.
    if (isDesktopMotion() && scroller) {
      const pullScroller = scroller;
      const exitPanels = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'));
      const curIdx = exitPanels.findIndex((p) => p.dataset.showcasePanelId === id);
      const nextId = exitPanels[curIdx + 1]?.dataset.showcasePanelId;
      let pull = 0; // signed px: >0 pulled down (top over-scroll), <0 pulled up (bottom over-scroll)
      let springTimer = 0;
      const MAX_PULL = 150;
      const CLOSE_AT = 96;
      const setPull = (v: number, animate: boolean) => {
        pull = v;
        pullScroller.style.transition = animate ? 'transform 0.4s cubic-bezier(0.23,1,0.32,1)' : 'none';
        pullScroller.style.transform = v !== 0 ? `translateY(${v.toFixed(1)}px)` : '';
      };
      const springBack = () => setPull(0, true);
      const atTop = () => pullScroller.scrollTop <= 0;
      const atBottom = () => pullScroller.scrollTop + pullScroller.clientHeight >= pullScroller.scrollHeight - 1;
      const onWheelPull = (e: WheelEvent) => {
        const dir = (atTop() && e.deltaY < 0) ? 1 : (atBottom() && e.deltaY > 0) ? -1 : 0;
        if (dir === 0) {
          if (pull !== 0) { window.clearTimeout(springTimer); springBack(); }
          return;
        }
        e.preventDefault();
        window.clearTimeout(springTimer);
        // Progressive resistance: the further it is already pulled, the less each
        // additional wheel tick adds.
        const mag = Math.min(MAX_PULL, Math.abs(pull) + Math.abs(e.deltaY) * (1 - Math.abs(pull) / MAX_PULL) * 0.6);
        setPull(mag * dir, false);
        if (mag >= CLOSE_AT) {
          setPull(0, false);
          void closeLane(dir === -1 ? nextId : undefined);
          return;
        }
        springTimer = window.setTimeout(springBack, 130);
      };
      pullScroller.addEventListener('wheel', onWheelPull, { passive: false });
      state.detachPull?.();
      state.detachPull = () => {
        window.clearTimeout(springTimer);
        pullScroller.removeEventListener('wheel', onWheelPull);
        pullScroller.style.transition = '';
        pullScroller.style.transform = '';
      };
    }
    document.documentElement.setAttribute('data-open-lane', id);
    history.replaceState(null, '', `#${id}`);
    lane.querySelector<HTMLElement>('[data-detail-scroll]')?.focus();
  }

  async function closeLane(realignTo?: string) {
    const id = state.openId;
    // Re-entry guard: a close already in flight must run to completion. Without
    // this, a second back-click restarts closeLane, whose gsap.killTweensOf(lane)
    // kills the in-flight close tween BEFORE its onComplete (finish) fires — so
    // rapid repeated clicks keep restarting the slide, finish() never runs,
    // state.openId stays set, and the lane never actually closes ("back doesn't
    // work"). Ignore re-entrant calls; the in-flight close will finish on its own.
    if (!id || state.closing) return;
    state.closing = true;
    const lane = laneEl(id);
    state.detachPull?.();
    state.detachPull = undefined;
    const target = realignTo ?? id;
    const finish = () => {
      state.detachY?.();
      state.detachY = undefined;
      if (lane) lane.hidden = true;
      document.documentElement.removeAttribute('data-open-lane');
      history.replaceState(null, '', window.location.pathname + window.location.search);
      state.openId = null;
      state.closing = false;
      state.restoreFocus?.focus?.();
      scrollToPanel(target); // re-align: this station, or the next one on a forward exit
    };
    if (lane && isDesktopMotion()) {
      const { gsap } = await import('gsap');
      const panelsLayer = document.querySelector<HTMLElement>('[data-showcase-descent]');
      gsap.killTweensOf(lane);
      // Await the tween's own completion (not just its kickoff) so callers that
      // `await closeLane()` before opening a different lane (see openLane above)
      // see state.openId cleared before they proceed — otherwise finish() would
      // fire later and clobber the newly-set state.openId back to null.
      await new Promise<void>((resolve) => {
        descend(gsap, lane, panelsLayer, 'close', () => { finish(); resolve(); });
      });
    } else {
      finish();
    }
  }

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const closer = (e.target as Element | null)?.closest('[data-lane-close]');
    if (closer) { e.preventDefault(); e.stopPropagation(); void closeLane(); return; }
    const nexter = (e.target as Element | null)?.closest('[data-lane-next]');
    if (nexter) {
      e.preventDefault();
      e.stopPropagation();
      if (state.openId) {
        const order = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'));
        const here = order.findIndex((p) => p.dataset.showcasePanelId === state.openId);
        void closeLane(order[here + 1]?.dataset.showcasePanelId); // release forward to the next station
      }
      return;
    }
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
