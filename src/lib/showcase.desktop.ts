import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  buildShowcaseGeometry,
  SHOWCASE_PARALLAX_GLOBAL_SCALE,
  LANE_VELOCITY_LEAN_MAX_PX,
  LANE_VELOCITY_LEAN_FACTOR,
} from '@/lib/config';
import { revealPanel, revealProblemCard } from '@/lib/motion';

/**
 * Desktop showcase: pinned section + horizontal scrub. See showcase.ts header
 * for the architectural notes. This module is dynamically imported only when
 * the viewport is desktop-width, keeping ScrollTrigger out of the mobile bundle.
 */

function readPanelWeights(panels: ArrayLike<HTMLElement>): number[] {
  return Array.from(panels).map(p => {
    const v = Number(p.dataset.showcasePanelWeight);
    return Number.isFinite(v) && v > 0 ? v : 1;
  });
}

/** Gaps are emitted by Panel.astro in absolute CSS pixels (so seams read
 *  identically across all viewport widths). The geometry helper works in
 *  vw fractions, so callers convert via `gap_px / window.innerWidth` at
 *  runtime — captured here as a px array, converted at use-time. */
function readPanelGapsPx(panels: ArrayLike<HTMLElement>): number[] {
  return Array.from(panels).map(p => {
    const v = Number(p.dataset.showcasePanelGapAfterPx);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  });
}

export function initShowcaseDesktop(
  section: HTMLElement,
  track: HTMLElement,
  panels: NodeListOf<HTMLElement>,
): () => void {
  gsap.registerPlugin(ScrollTrigger);

  const panelCount = panels.length;
  const weights = readPanelWeights(panels);
  const gapsPx = readPanelGapsPx(panels);
  const panelArr = Array.from(panels);

  // Compute the geometry against the *current* viewport width. Gap is the
  // only viewport-dependent input (px → vw fraction); weights are already
  // viewport-relative, and the helper is unit-pure. We re-run this in the
  // ScrollTrigger refresh callbacks (`x:` / `end:` are functions) so a
  // resize lands panels at the correct positions and pin distance.
  //
  // Note: `cumulativeWidthMultipliers` is no longer used to translate the
  // track — we read `panel.offsetLeft` directly so per-panel CSS width
  // caps (SHOWCASE_PANEL_MAX_WIDTH_PX) flow through automatically. The
  // helper still drives the *vertical* pin distance (scroll cost), which
  // is intentionally decoupled from the rendered horizontal width so the
  // scroll feel stays viewport-independent.
  const buildGeometry = (innerWidth: number) =>
    buildShowcaseGeometry(weights, gapsPx.map(px => px / innerWidth));

  // `transitionMultipliers` is captured once at init and used for sub-tween
  // durations (which GSAP fixes at construction time). On resize, end-of-
  // segment positions stay correct because `x:` recomputes; only the
  // intra-segment scrub rate carries a tiny error proportional to how much
  // the gap fraction changed — gaps are 1–4% of a panel, so this is below
  // perceptual threshold.
  const initialGeometry = buildGeometry(window.innerWidth);
  const transitionMultipliers = initialGeometry.transitionMultipliers;

  const pinDistance = () => window.innerHeight * buildGeometry(window.innerWidth).totalMultiplier;
  const revealedPanels = new WeakSet<HTMLElement>();
  const revealVisiblePanels = () => {
    panelArr.forEach((panel) => {
      if (panel.dataset.showcasePanelId === 'hero' || revealedPanels.has(panel)) return;
      const rect = panel.getBoundingClientRect();
      const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
      if (visibleWidth < Math.min(rect.width, window.innerWidth) * 0.18) return;

      revealedPanels.add(panel);
      revealPanel(panel);
      revealProblemCard(panel);
    });
  };

  const tween = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: revealVisiblePanels,
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${pinDistance()}`,
      pin: true,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: revealVisiblePanels,
      onRefresh: revealVisiblePanels,
    },
  });

  for (let i = 1; i < panelCount; i++) {
    tween.to(track, {
      x: () => -(panelArr[i]?.offsetLeft ?? 0),
      duration: transitionMultipliers[i - 1] ?? 0,
    });
  }

  const panelTriggers: ScrollTrigger[] = [];
  panels.forEach((panel) => {
    if (panel.dataset.showcasePanelId === 'hero') return;

    const trigger = ScrollTrigger.create({
      trigger: panel,
      containerAnimation: tween,
      // Fire once the panel is meaningfully visible (≈15% of the viewport
      // width has scrolled in from the right). Previously this used
      // `'left center'`, which only fired when the panel's left edge hit
      // the horizontal centre — fine when every panel was 100vw, but on
      // ultrawide monitors with capped panel widths two panels can be on
      // screen at once, so the reveal lagged well behind first sight.
      start: 'left right-=15%',
      end: 'right center',
      once: true,
      onEnter: (self) => { revealPanel(panel); revealProblemCard(panel); self.kill(); },
      onEnterBack: (self) => { revealPanel(panel); revealProblemCard(panel); self.kill(); },
      invalidateOnRefresh: true,
    });
    panelTriggers.push(trigger);
  });

  const revealSoon = () => requestAnimationFrame(revealVisiblePanels);
  window.addEventListener('hashchange', revealSoon);
  window.addEventListener('scroll', revealSoon, { passive: true });
  window.addEventListener('resize', revealSoon);
  document.addEventListener('click', revealSoon);
  requestAnimationFrame(revealVisiblePanels);

  const aboutHeadline = document.querySelector<HTMLElement>('[data-about-headline]');
  const aboutIndex = Array.from(panels).findIndex(panel => panel.dataset.showcasePanelId === 'about');
  const aboutPanel = panels[aboutIndex] ?? null;

  const aboutHeadlineTween = aboutHeadline && aboutPanel
    ? gsap.fromTo(
        aboutHeadline,
        { x: 0 },
        {
          // Drift left by 1.5× the about panel's rendered width so the
          // parallax distance scales with the panel cap (capped on
          // ultrawide via SHOWCASE_PANEL_MAX_WIDTH_PX) instead of the raw
          // viewport. Keeps the headline reaching the same relative
          // off-screen position regardless of monitor size.
          x: () => -(aboutPanel.offsetWidth) * 1.5,
          ease: 'none',
          scrollTrigger: {
            trigger: aboutPanel,
            containerAnimation: tween,
            start: 'left right',
            end: 'right left',
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      )
    : null;

  // ─── Generic horizontal parallax ────────────────────────────────────────
  // Any element with `data-parallax-x="<multiplier>"` inside a panel drifts
  // horizontally by `multiplier × panel.offsetWidth` over the duration that
  // its containing panel is on screen. Multiplier conventions:
  //   ±0.05 – ±0.20 → subtle depth (eyebrows, kickers, captions)
  //   ±0.30 – ±0.60 → noticeable but stays inside panel
  //   ±1.00+        → travels off-screen (background display elements)
  // Negative drifts left (against scroll = appears slower / receding into
  // background); positive drifts right (with scroll = appears faster /
  // foreground rushing past).
  const parallaxTweens: gsap.core.Tween[] = [];
  panels.forEach((panel) => {
    const targets = panel.querySelectorAll<HTMLElement>('[data-parallax-x]');
    targets.forEach((el) => {
      const raw = Number(el.dataset.parallaxX);
      if (!Number.isFinite(raw) || raw === 0) return;
      const multiplier = raw * SHOWCASE_PARALLAX_GLOBAL_SCALE;
      if (multiplier === 0) return;
      const tw = gsap.fromTo(
        el,
        { x: 0 },
        {
          x: () => multiplier * panel.offsetWidth,
          ease: 'none',
          scrollTrigger: {
            trigger: panel,
            containerAnimation: tween,
            start: 'left right',
            end: 'right left',
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
      parallaxTweens.push(tw);
    });
  });

  // ─── Velocity lead/lag lean ─────────────────────────────────────────────
  // Additive to the parallax-x tweens above: elements marked
  // `data-parallax-lean` get a subtle `--lean` CSS custom property driven by
  // Lenis's *reported velocity* (not scroll position), so they lean toward
  // the travel direction while panning fast and settle back to 0 (via the
  // CSS transition in global.css) once scrolling stops. Deliberately reads
  // `window.__lenis` once per frame and writes only a custom property —
  // no layout reads, so this can't introduce forced-reflow jank.
  const leanEls = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax-lean]'));
  let leanRaf = 0;
  const leanTick = () => {
    const lenis = (window as unknown as { __lenis?: { velocity?: number } }).__lenis;
    const v = lenis?.velocity ?? 0;
    const lean = Math.max(-LANE_VELOCITY_LEAN_MAX_PX,
      Math.min(LANE_VELOCITY_LEAN_MAX_PX, v * LANE_VELOCITY_LEAN_FACTOR));
    leanEls.forEach((el, i) => { el.style.setProperty('--lean', `${lean * (1 + i % 3 * 0.15)}px`); });
    leanRaf = requestAnimationFrame(leanTick);
  };
  if (leanEls.length) leanRaf = requestAnimationFrame(leanTick);

  const progressEl = document.querySelector<HTMLElement>('[data-hud-progress]');
  const hudTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => `+=${pinDistance()}`,
    onUpdate: (self) => {
      const p = self.progress;
      if (progressEl) progressEl.style.transform = `scaleX(${p})`;
    },
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    panelTriggers.forEach(t => t.kill());
    aboutHeadlineTween?.scrollTrigger?.kill();
    aboutHeadlineTween?.kill();
    parallaxTweens.forEach(t => { t.scrollTrigger?.kill(); t.kill(); });
    if (leanRaf) cancelAnimationFrame(leanRaf);
    hudTrigger.kill();
    window.removeEventListener('hashchange', revealSoon);
    window.removeEventListener('scroll', revealSoon);
    window.removeEventListener('resize', revealSoon);
    document.removeEventListener('click', revealSoon);
  };
}
