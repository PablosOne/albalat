import type Lenis from 'lenis';
import { buildShowcaseGeometry, SHOWCASE_PARALLAX_Y_GLOBAL_SCALE } from '@/lib/config';
import { laneMotion, isMobileViewport, prefersReducedMotion } from '@/lib/viewport';

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

/** The station id that follows `currentId` in DOM order, or null if it is the
 *  last station (or not found). Pure — pass the ordered list of panel ids. */
export function nextStationId(orderedIds: readonly string[], currentId: string): string | null {
  const i = orderedIds.indexOf(currentId);
  if (i < 0 || i + 1 >= orderedIds.length) return null;
  return orderedIds[i + 1] ?? null;
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

  if (isMobileViewport() || prefersReducedMotion()) {
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

interface LaneState { openId: string | null; restoreFocus: HTMLElement | null; detachY?: () => void; detachPull?: () => void; closing?: boolean; }

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

  const SLIDE_MS = 600;
  let desktopAnimations: Animation[] = [];
  let desktopRun = 0;

  // Desktop uses one explicit compositor timeline for both layers. Keeping the
  // two transforms in the same Web Animations run prevents independent CSS
  // transitions from restarting or drifting apart. The close direction uses
  // the exact same endpoints in reverse.
  const runDesktopSlide = async (lane: HTMLElement, direction: 'open' | 'close') => {
    const main = document.querySelector<HTMLElement>('[data-showcase-descent]');
    if (!main) return true;

    const laneFrom = direction === 'open'
      ? 'translate3d(0, 100%, 0)'
      : getComputedStyle(lane).transform;
    const mainFrom = direction === 'open'
      ? 'translate3d(0, 0, 0)'
      : getComputedStyle(main).transform;
    const laneTo = direction === 'open'
      ? 'translate3d(0, 0, 0)'
      : 'translate3d(0, 100%, 0)';
    const mainTo = direction === 'open'
      ? 'translate3d(0, -100%, 0)'
      : 'translate3d(0, 0, 0)';
    const easing = direction === 'open'
      ? 'cubic-bezier(0.215, 0.61, 0.355, 1)'
      : 'cubic-bezier(0.55, 0.055, 0.675, 0.19)';

    desktopAnimations.forEach((animation) => animation.cancel());
    const run = ++desktopRun;
    const options: KeyframeAnimationOptions = {
      duration: SLIDE_MS,
      easing,
      fill: 'both',
    };
    const animations = [
      main.animate([{ transform: mainFrom }, { transform: mainTo }], options),
      lane.animate([{ transform: laneFrom }, { transform: laneTo }], options),
    ];
    desktopAnimations = animations;

    try {
      await Promise.all(animations.map((animation) => animation.finished));
    } catch {
      return false;
    }
    if (run !== desktopRun) return false;

    // Persist the end frame, then discard the animation objects. This leaves a
    // single source of truth and gives a later close a stable starting point.
    main.style.transform = mainTo;
    lane.style.transform = laneTo;
    animations.forEach((animation) => animation.cancel());
    desktopAnimations = [];
    return true;
  };

  // Wait until the lane's transform transition finishes (or a fallback timeout,
  // for the no-transition edge: reduced-motion flips mid-session, a close racing
  // an open that never got .is-open, display:none interruptions).
  const afterSlide = (lane: HTMLElement, done: () => void) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      lane.removeEventListener('transitionend', onEnd);
      lane.removeEventListener('transitioncancel', onEnd);
      window.clearTimeout(timer);
      done();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === lane && e.propertyName === 'transform') settle();
    };
    const timer = window.setTimeout(settle, SLIDE_MS + 200);
    lane.addEventListener('transitionend', onEnd);
    lane.addEventListener('transitioncancel', onEnd);
  };

  const setLaneInteractive = (lane: HTMLElement, interactive: boolean) => {
    lane.inert = !interactive;
    if (interactive) lane.removeAttribute('aria-hidden');
    else lane.setAttribute('aria-hidden', 'true');
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
    // Set synchronously so closeLane()/onKey's Escape guard and the re-entry
    // guard above see the correct id immediately, not only after the slide-in
    // finishes.
    state.openId = id;
    state.restoreFocus = trigger;
    pluckThreshold(id);

    // reveal + slide
    const scroller = lane.querySelector<HTMLElement>('[data-detail-scroll]');
    if (scroller) scroller.scrollTop = 0;
    lane.querySelectorAll<HTMLElement>('[data-detail-horizontal]').forEach((rail) => {
      rail.scrollLeft = 0;
    });

    const motion = laneMotion();
    if (motion === 'descend' || motion === 'slide') {
      lane.hidden = false;
      // Let the closed offscreen position render once before starting motion.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (state.openId !== id || state.closing) {
        lane.hidden = true;
        return;
      }
      document.documentElement.setAttribute('data-open-lane', id);
      lane.classList.add('is-opening', 'is-open');

      if (motion === 'descend') {
        const completed = await runDesktopSlide(lane, 'open');
        if (!completed || state.openId !== id || state.closing) return;
        lane.classList.remove('is-opening');
        setLaneInteractive(lane, true);
      } else {
        // Keep the already-correct mobile CSS slide unchanged.
        setLaneInteractive(lane, true);
        afterSlide(lane, () => lane.classList.remove('is-opening'));
      }

      // Vertical parallax for [data-parallax-y] descendants is a desktop-only
      // affordance (the pinned-lane read); mobile detail is a plain scroll.
      if (motion === 'descend' && scroller) {
        const yEls = Array.from(lane.querySelectorAll<HTMLElement>('[data-parallax-y]'));
        if (yEls.length) {
          const onScrollY = () => {
            const top = scroller.scrollTop;
            yEls.forEach((el) => {
              const m = Number(el.dataset.parallaxY) || 0;
              el.style.transform = `translateY(${(top * m * SHOWCASE_PARALLAX_Y_GLOBAL_SCALE * 0.1).toFixed(1)}px)`;
            });
          };
          onScrollY();
          state.detachY?.();
          state.detachY = undefined;
          scroller.addEventListener('scroll', onScrollY, { passive: true });
          state.detachY = () => scroller.removeEventListener('scroll', onScrollY);
        }
      }
    } else {
      // Reduced-motion: lane is inline in the native vertical stack — just reveal.
      lane.hidden = false;
      setLaneInteractive(lane, true);
      document.documentElement.setAttribute('data-open-lane', id);
    }
    // Overscroll-to-exit: at the very top of the detail, continuing to pull up
    // rubber-bands the content down and releases back to THIS station's main lane;
    // at the very bottom, continuing to pull down releases forward to the NEXT
    // station's main lane. Both build progressive resistance before the release
    // threshold. Desktop/motion only — mobile/reduced-motion lanes are inline in
    // the native vertical stack, where native over-scroll already carries you out
    // to the neighbouring content.
    if (laneMotion() === 'descend' && scroller) {
      const pullScroller = scroller;
      const exitOrder = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'))
        .map((p) => p.dataset.showcasePanelId)
        .filter((pid): pid is string => Boolean(pid));
      const nextId = nextStationId(exitOrder, id) ?? undefined;
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
    history.replaceState(null, '', `#${id}`);
    lane.querySelector<HTMLElement>('[data-detail-scroll]')?.focus();
  }

  async function closeLane(realignTo?: string) {
    const id = state.openId;
    // Re-entry guard: a close already in flight must run to completion —
    // otherwise rapid repeated back-clicks re-arm afterSlide/finish and can
    // leave state.openId set with the lane never actually closing.
    // Ignore re-entrant calls; the in-flight close will finish on its own.
    if (!id || state.closing) return;
    state.closing = true;
    const lane = laneEl(id);
    state.detachPull?.();
    state.detachPull = undefined;
    if (lane) setLaneInteractive(lane, false);
    const target = realignTo ?? id;
    const finish = () => {
      state.detachY?.();
      state.detachY = undefined;
      if (lane) {
        lane.classList.remove('is-open', 'is-opening', 'is-closing');
        lane.style.transform = '';
        lane.hidden = true;
      }
      const main = document.querySelector<HTMLElement>('[data-showcase-descent]');
      if (main) main.style.transform = '';
      document.documentElement.removeAttribute('data-open-lane');
      history.replaceState(null, '', window.location.pathname + window.location.search);
      state.openId = null;
      state.closing = false;
      state.restoreFocus?.focus?.();
      scrollToPanel(target); // re-align: this station, or the next one on a forward exit
    };
    const motion = laneMotion();
    if (lane && motion === 'descend' && lane.classList.contains('is-open')) {
      lane.classList.remove('is-opening');
      lane.classList.add('is-closing');
      await runDesktopSlide(lane, 'close');
      finish();
    } else if (lane && motion === 'slide' && lane.classList.contains('is-open')) {
      lane.classList.remove('is-open');
      document.documentElement.removeAttribute('data-open-lane');
      await new Promise<void>((resolve) => {
        afterSlide(lane, () => {
          finish();
          resolve();
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
    const nexter = (e.target as Element | null)?.closest('[data-lane-next]');
    if (nexter) {
      e.preventDefault();
      e.stopPropagation();
      if (state.openId) {
        const order = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'))
          .map((p) => p.dataset.showcasePanelId)
          .filter((pid): pid is string => Boolean(pid));
        void closeLane(nextStationId(order, state.openId) ?? undefined);
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
    // On a route-specific build only that route's detail lane is present. The
    // remaining controls retain real hrefs so browsers and crawlers can follow
    // them; intercept only when the target lane exists in the current document.
    const href = opener.getAttribute('href') ?? '';
    if (!hasDetailLane(id) && href && !href.startsWith('#')) return;
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

  // Idle warm-up: lazy images inside a hidden (display:none) lane never start
  // loading, so without this the click is the first fetch+decode and it lands
  // on the open tween's first frames. Pay it at idle instead.
  const warmLanes = () => {
    document.querySelectorAll<HTMLImageElement>('[data-detail-lane] img').forEach((img) => {
      if (img.loading === 'lazy') img.loading = 'eager';
      void img.decode().catch(() => {});
    });
  };
  const idle = (window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (idle) idle(warmLanes, { timeout: 3000 });
  else window.setTimeout(warmLanes, 1500);

  // Open initialDetail (route deep-link or hash) once the showcase has laid out.
  const initial = resolveInitialDetail(opts.initialDetail ?? null, window.location.hash);
  if (initial) requestAnimationFrame(() => requestAnimationFrame(() => {
    if (hasDetailLane(initial)) void openLane(initial);
  }));

  return () => {
    desktopRun += 1;
    desktopAnimations.forEach((animation) => animation.cancel());
    desktopAnimations = [];
    document.removeEventListener('click', onClick, { capture: true });
    document.removeEventListener('keydown', onKey);
  };
}
