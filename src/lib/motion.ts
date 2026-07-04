import { gsap } from 'gsap';
import {
  MOBILE_BREAKPOINT_PX,
  STAGGER_MS,
  TEXT_REVEAL_PRESETS,
  type TextRevealPreset,
} from '@/lib/config';

/** Fade-up reveal: translateY(40) -> 0, opacity 0 -> 1. Run on load or scrub off a ScrollTrigger. */
export function fadeUpTimeline(targets: gsap.TweenTarget, opts: gsap.TimelineVars = {}) {
  return gsap.timeline(opts).fromTo(
    targets,
    { y: 40, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: STAGGER_MS / 1000 }
  );
}

/** Scale-up reveal for visuals: scale(0.95) -> 1 with fade. */
export function scaleInTimeline(targets: gsap.TweenTarget, opts: gsap.TimelineVars = {}) {
  return gsap.timeline(opts).fromTo(
    targets,
    { scale: 0.95, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out' }
  );
}

/**
 * Shared panel reveal — choreographed fade-up for `[data-reveal]` elements.
 *
 * CONTRACT
 * ────────
 * Each reveal target inside a panel carries `data-reveal="heading|body|cta"`
 * (groups for stagger ordering) and may opt into character-mask choreography
 * with `data-text-reveal="block|words|phrases"` plus a preset key
 * `data-text-reveal-preset="headline|body|label"` mapped to the shared
 * `TEXT_REVEAL_PRESETS` table in `lib/config.ts`. Wrappers using the
 * `TextReveal.astro` component emit the inner `[data-text-reveal-mask]` /
 * `[data-text-reveal-unit]` spans automatically.
 *
 * INITIAL HIDDEN STATE
 * ────────────────────
 * `[data-reveal]` targets are pre-hidden in `global.css` (opacity: 0,
 * translateY(24px)) so they can't flash in the brief window between SSR
 * paint and the first `onEnter`. Word/phrase masks pre-hide the inner units
 * instead so the wrapper itself can stay at translate 0 and the mask works.
 *
 * IDEMPOTENT
 * ──────────
 * Safe to call repeatedly. The function rebuilds a fresh GSAP timeline each
 * time and lets `fromTo` re-establish the from-state. Callers are expected to
 * invoke this once per panel (the showcase ScrollTriggers self-kill after the
 * first entry) so reveals don't replay on scroll-back.
 */
export function revealPanel(panel: HTMLElement) {
  const heading = panel.querySelectorAll<HTMLElement>('[data-reveal="heading"]');
  const body = panel.querySelectorAll<HTMLElement>('[data-reveal="body"]');
  const visual = panel.querySelectorAll<HTMLElement>('[data-reveal="visual"], [data-reveal="cta"]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    gsap.set([...Array.from(heading), ...Array.from(body), ...Array.from(visual)], { clearProps: 'all', opacity: 1, y: 0, scale: 1 });
    panel.querySelectorAll<HTMLElement>('[data-text-reveal-unit]').forEach(unit => {
      gsap.set(unit, { clearProps: 'all', opacity: 1, yPercent: 0 });
    });
    return;
  }

  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
  if (isMobile) {
    revealPanelMobile(panel);
    return;
  }

  const t = gsap.timeline({ defaults: { ease: 'power3.out' } });
  addRevealGroup(t, heading, 0);
  addRevealGroup(t, body, STAGGER_MS / 1000);

  Array.from(visual).forEach((el, i) => {
    if (el.dataset.reveal === 'cta' || el.dataset.textReveal) {
      addRevealElement(t, el, (STAGGER_MS * 2) / 1000 + i * (STAGGER_MS / 1000));
      return;
    }
    t.fromTo(
      el,
      { scale: 0.95, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.9 },
      (STAGGER_MS * 2) / 1000 + i * (STAGGER_MS / 1000),
    );
  });
}

function addRevealGroup(
  timeline: gsap.core.Timeline,
  elements: NodeListOf<HTMLElement>,
  position: number,
) {
  Array.from(elements).forEach((el, i) => {
    addRevealElement(timeline, el, position + i * (STAGGER_MS / 1000));
  });
}

function addRevealElement(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  position: number,
) {
  if (!el.dataset.textReveal) {
    timeline.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, position);
    return;
  }

  const units = el.querySelectorAll<HTMLElement>('[data-text-reveal-unit]');
  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
  const presetName = getPresetName(el);
  const preset = TEXT_REVEAL_PRESETS[presetName][isMobile ? 'mobile' : 'desktop'];
  const targets: gsap.TweenTarget = units.length ? units : el;

  timeline.set(el, { opacity: 1, y: 0 }, position);

  if (units.length) {
    timeline.fromTo(
      targets,
      { yPercent: preset.distance, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: preset.duration,
        stagger: preset.staggerMs / 1000,
        ease: 'power3.out',
      },
      position,
    );
    return;
  }

  timeline.fromTo(
    el,
    { y: Math.round(preset.distance * 0.45), opacity: 0 },
    { y: 0, opacity: 1, duration: preset.duration, ease: 'power3.out' },
    position,
  );
}

function getPresetName(el: HTMLElement): TextRevealPreset {
  const preset = el.dataset.textRevealPreset;
  return preset && preset in TEXT_REVEAL_PRESETS ? preset as TextRevealPreset : 'body';
}

/**
 * Mobile-only reveal choreography. Where the desktop path stacks
 * heading/body/visual within ~160ms, mobile spreads them across ~1.4s and
 * varies the motion vocabulary so each beat reads distinct: kicker labels
 * slide in from the left, headline word masks rise, body fades up, visuals
 * translate up + scale-down. All beats are GPU-only (transform + opacity);
 * earlier filter-blur and clip-path versions thrashed the mobile compositor.
 *
 * Each beat starts at a fixed offset from the panel-enter; multiple items in
 * the same beat stagger by `BEAT_ITEM_STAGGER` so paragraphs/bullets cascade
 * instead of popping together. Beats are derived from the existing
 * data-reveal/data-text-reveal-preset attributes — no markup changes needed.
 */
type MobileBeat = 'label' | 'headline' | 'subhead' | 'body' | 'cta' | 'visual';

const MOBILE_BEAT_STARTS: Record<MobileBeat, number> = {
  label:    0,
  headline: 0.25,
  subhead:  0.55,
  body:     0.85,
  cta:      1.05,
  visual:   1.20,
};
const MOBILE_BEAT_ITEM_STAGGER = 0.18;

function classifyMobileBeat(el: HTMLElement): MobileBeat {
  const role = el.dataset.reveal;
  const preset = el.dataset.textRevealPreset;
  if (role === 'cta') return 'cta';
  if (role === 'visual') return 'visual';
  if (role === 'body') return 'body';
  // role === 'heading' — split by preset so the small kicker label leads.
  if (preset === 'label') return 'label';
  if (preset === 'headline') return 'headline';
  return 'subhead';
}

function revealPanelMobile(panel: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  const counts: Record<MobileBeat, number> = { label: 0, headline: 0, subhead: 0, body: 0, cta: 0, visual: 0 };

  panel.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
    const beat = classifyMobileBeat(el);
    const idx = counts[beat]++;
    const position = MOBILE_BEAT_STARTS[beat] + idx * MOBILE_BEAT_ITEM_STAGGER;
    addMobileBeat(tl, el, beat, position);
  });

  return tl;
}

function addMobileBeat(
  tl: gsap.core.Timeline,
  el: HTMLElement,
  beat: MobileBeat,
  position: number,
) {
  // Override the CSS pre-hide on the wrapper so the per-beat tween below has
  // a clean canvas. fromTo's from-state below overrides this when needed.
  tl.set(el, { opacity: 1, y: 0 }, position);

  switch (beat) {
    case 'label': {
      // Editorial kicker. Previously used clip-path: inset(0% 100% 0% 0%) which
      // forces a per-frame paint of the clipped subtree on mobile. Translate +
      // opacity is GPU-only; the perceived left-to-right reveal is preserved
      // by combining a small horizontal slide with a quick fade.
      tl.fromTo(
        el,
        { x: -24, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: 'power2.out' },
        position,
      );
      const units = el.querySelectorAll<HTMLElement>('[data-text-reveal-unit]');
      if (units.length) tl.set(units, { opacity: 1, yPercent: 0 }, position);
      return;
    }
    case 'headline': {
      const units = el.querySelectorAll<HTMLElement>('[data-text-reveal-unit]');
      if (units.length) {
        // Word masks: yPercent + opacity only. Previously included
        // filter: blur(8px) which forced an offscreen buffer per word for the
        // entire 0.85s tween — a primary mobile hotspot. Slightly longer
        // duration compensates for the missing softness.
        tl.fromTo(
          units,
          { yPercent: 130, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.95, stagger: 0.075, ease: 'power3.out' },
          position,
        );
      } else {
        // Block headline: y-translate + fade replaces the clip-path inset reveal.
        tl.fromTo(
          el,
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.inOut' },
          position,
        );
      }
      return;
    }
    case 'subhead': {
      const units = el.querySelectorAll<HTMLElement>('[data-text-reveal-unit]');
      if (units.length) {
        tl.fromTo(
          units,
          { yPercent: 95, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.045, ease: 'power3.out' },
          position,
        );
      } else {
        tl.fromTo(
          el,
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },
          position,
        );
      }
      return;
    }
    case 'body': {
      const units = el.querySelectorAll<HTMLElement>('[data-text-reveal-unit]');
      if (units.length) {
        tl.fromTo(
          units,
          { yPercent: 60, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.62, stagger: 0.04, ease: 'power3.out' },
          position,
        );
      } else {
        tl.fromTo(
          el,
          { y: 32, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
          position,
        );
      }
      return;
    }
    case 'cta': {
      // Don't clearProps after the tween: the CSS pre-hide rule on
      // `[data-reveal]` sets `transform: translateY(24px)`, which would re-apply
      // the moment GSAP strips the inline transform and snap the link 24px
      // down. Leaving `matrix(1,0,0,1,0,0)` inline is visually identical to no
      // transform and blocks the pre-hide from re-asserting itself.
      tl.fromTo(
        el,
        { y: 18, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'power2.out' },
        position,
      );
      return;
    }
    case 'visual': {
      // Top-down "reveal" without clip-path. Y-translate + fade reads similarly
      // and avoids forcing a paint of the clipped subtree on every frame.
      // See cta beat above for why clearProps is intentionally omitted.
      tl.fromTo(
        el,
        { y: 40, opacity: 0, scale: 1.04 },
        { y: 0, opacity: 1, scale: 1, duration: 1.0, ease: 'power3.inOut' },
        position,
      );
      return;
    }
  }
}

/** Staged reveal for the Rondo problem card. Always-on: corners wipe top-down, hero fades up, bottom stats fade up.
 * Two opt-in drama beats keyed off data attributes in the markup, so removing them = deleting one attribute:
 *   - data-reveal-count-up on the $1M element  → animates the number from $0 to $1M during hero fade
 *   - data-reveal-border-wipe on the card root → SVG stroke draws the border on, replacing the inline CSS border */
export function revealProblemCard(panel: ParentNode): gsap.core.Timeline | null {
  const card = panel.querySelector<HTMLElement>('[data-problem-card]');
  if (!card) return null;

  // Synchronous reset, runs at call time so the brief "natural-state" flash before the parent visual
  // fades in shows the pre-animation values ($0 / no border) rather than the final values.
  const countUpEls = card.querySelectorAll<HTMLElement>('[data-reveal-count-up]');
  countUpEls.forEach(el => { el.textContent = '$0'; });

  const borderWipeEnabled = card.hasAttribute('data-reveal-border-wipe');
  if (borderWipeEnabled) {
    if (!card.dataset.origBorderColor) {
      card.dataset.origBorderColor = getComputedStyle(card).borderColor;
    }
    card.style.borderColor = 'transparent';
  }

  const corners = card.querySelectorAll<HTMLElement>('[data-reveal-card="corner"] > *');
  const hero = card.querySelector<HTMLElement>('[data-reveal-card="hero"]');
  const stats = card.querySelectorAll<HTMLElement>('[data-reveal-card="stat"]');

  // Delay sequences the card after the text column's staged reveal (heading + body + bullets/links) completes
  // so the two animations don't compete for attention. Tuned by feel — long enough that the last body line has
  // settled before the border starts to draw.
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' }, delay: 1.4 });

  if (borderWipeEnabled) tl.add(() => animateBorderWipe(card), 0);

  if (corners.length) {
    tl.fromTo(
      corners,
      { clipPath: 'inset(0% 0% 100% 0%)', opacity: 0 },
      { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.8, stagger: 0.12 },
      0.1,
    );
  }

  if (hero) {
    tl.fromTo(hero, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0 }, 0.45);
  }

  countUpEls.forEach(el => { tl.add(() => animateCountUp(el), 0.5); });

  if (stats.length) {
    tl.fromTo(stats, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.18 }, 1.0);
  }

  return tl;
}

/** $0 → $1M count-up. Stepping formatter keeps intermediate values readable ($0 / $XXXK / $1M). */
function animateCountUp(el: HTMLElement): gsap.core.Tween {
  const final = el.dataset.countUpFinal || '$1M';
  const proxy = { v: 0 };
  return gsap.to(proxy, {
    v: 1_000_000,
    duration: 1.2,
    ease: 'power2.out',
    onUpdate: () => {
      const v = proxy.v;
      el.textContent =
        v < 50_000 ? '$0' :
        v < 950_000 ? `$${Math.round(v / 100_000) * 100}K` :
        '$1M';
    },
    onComplete: () => { el.textContent = final; },
  });
}

/** Border wipe-in via SVG stroke-dashoffset. The card's CSS border is held transparent during the wipe
 * (set by revealProblemCard), and restored once the SVG overlay completes. pathLength="100" normalises the
 * dasharray math so the rect dimensions don't have to be measured in JS. */
function animateBorderWipe(card: HTMLElement): gsap.core.Tween {
  const NS = 'http://www.w3.org/2000/svg';
  const radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 12;
  const accent = getComputedStyle(card).getPropertyValue('--color-accent').trim() || '#10B981';
  const rect = card.getBoundingClientRect();

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', String(rect.width));
  svg.setAttribute('height', String(rect.height));
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.pointerEvents = 'none';
  svg.style.overflow = 'visible';

  const r = document.createElementNS(NS, 'rect');
  r.setAttribute('x', '0.5');
  r.setAttribute('y', '0.5');
  r.setAttribute('width', String(Math.max(0, rect.width - 1)));
  r.setAttribute('height', String(Math.max(0, rect.height - 1)));
  r.setAttribute('rx', String(radius));
  r.setAttribute('fill', 'none');
  r.setAttribute('stroke', accent);
  r.setAttribute('stroke-width', '1');
  r.setAttribute('pathLength', '100');
  r.setAttribute('stroke-dasharray', '100');
  r.setAttribute('stroke-dashoffset', '100');

  svg.appendChild(r);
  card.appendChild(svg);

  return gsap.to(r, {
    attr: { 'stroke-dashoffset': 0 },
    duration: 1.2,
    ease: 'power2.inOut',
    onComplete: () => {
      svg.remove();
      card.style.borderColor = card.dataset.origBorderColor || '';
    },
  });
}

/** Hero on-load choreography, gated on the background image load.
 * Until the background image is ready, everything stays black: no text, no chrome, no images.
 *
 * Act 1 - Stage, toolbar, bottom text, and side hint unmask top-down from the same beat.
 * Act 2 - Headline words rise word-by-word.
 * Act 3 - Foreground person slides in from the left and fades in.
 *
 * MOBILE: The desktop clip-path top-down wipe delays the foreground (LCP element, at
 * the bottom of the stage) until t=2.25s of the animation. On mobile we swap to an
 * opacity fade so the full stage — including the foreground — reveals at t=0, and
 * the person can start appearing at t=0.45s, cutting LCP by ~1.5-2s. */
export function heroEntrance(root: ParentNode = document) {
  const bg = root.querySelector<HTMLImageElement>('[data-hero-background]');
  if (!bg) return null;

  // Pin initial hidden states through GSAP so its transform state stays canonical.
  // Inline % transforms collapse to a pixel matrix at computed-style time, and then
  // GSAP's yPercent/xPercent tween cannot clear that pixel offset. Letting GSAP own
  // the initial state avoids that trap.
  const words = root.querySelectorAll<HTMLElement>('[data-hero-word-text]');
  const headline = root.querySelector<HTMLElement>('[data-hero-headline]');
  const foreground = root.querySelector<HTMLElement>('[data-hero-foreground]');

  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;

  gsap.set(words, { yPercent: 220 });
  gsap.set(foreground, { x: isMobile ? -40 : -60 });
  if (headline) headline.style.visibility = 'visible';

  if (isMobile) {
    // Swap clip-path → opacity so the foreground at the bottom of the stage is not
    // occluded during the top-down wipe. All elements already have opacity: 0 via
    // inline style; removing clip-path just lets GSAP control visibility via opacity.
    const stage = root.querySelector<HTMLElement>('[data-hero-stage]');
    root.querySelectorAll<HTMLElement>('[data-toolbar], [data-hero-subtitle], [data-hero-signature]')
      .forEach(el => { el.style.clipPath = ''; });
    if (stage) stage.style.clipPath = '';
  }

  const start = () => buildTimeline(root, isMobile);
  if (bg.complete && bg.naturalWidth > 0) return start();

  bg.addEventListener('load', start, { once: true });
  bg.addEventListener('error', start, { once: true });
  return null;
}

function buildTimeline(root: ParentNode, isMobile = false) {
  const words = root.querySelectorAll<HTMLElement>('[data-hero-word-text]');
  const stage = root.querySelector<HTMLElement>('[data-hero-stage]');
  const subtitle = root.querySelector<HTMLElement>('[data-hero-subtitle]');
  const signature = root.querySelector<HTMLElement>('[data-hero-signature]');
  const foreground = root.querySelector<HTMLElement>('[data-hero-foreground]');
  const toolbar = root.querySelectorAll<HTMLElement>('[data-toolbar]');
  const hint = root.querySelector<HTMLElement>('[data-hero-scroll-hint]');
  const topDownReveal = [stage, ...Array.from(toolbar), subtitle, signature, hint]
    .filter((target): target is HTMLElement => Boolean(target));

  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

  if (isMobile) {
    // Mobile: opacity fade for the whole stage so the foreground at the bottom is
    // not blocked by the clip-path wipe. Foreground starts at t=0.45s (vs 2.25s on
    // desktop), cutting the time the LCP element is invisible by ~1.5–2s.
    tl.fromTo(
      topDownReveal,
      { opacity: 0 },
      { opacity: 1, duration: 0.85, ease: 'power2.inOut', clearProps: 'opacity' },
      0
    )
      .fromTo(
        words,
        { yPercent: 220 },
        { yPercent: 0, duration: 0.95, stagger: 0.14, ease: 'power3.out' },
        0.35
      )
      .fromTo(
        foreground,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.85, ease: 'power3.out' },
        0.45
      );
  } else {
    tl.fromTo(
      topDownReveal,
      { clipPath: 'inset(0% 0% 100% 0%)', opacity: 1, willChange: 'clip-path' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        opacity: 1,
        duration: 1.8,
        ease: 'power3.inOut',
        clearProps: 'clipPath,willChange',
      },
      0
    )
      .fromTo(
        words,
        { yPercent: 220 },
        { yPercent: 0, duration: 1.1, stagger: 0.18, ease: 'power3.out' },
        1.15
      )
      .fromTo(
        foreground,
        { x: -60, opacity: 0 },
        { x: 0, opacity: 1, duration: 1.0, ease: 'power3.out' },
        2.25
      );
  }

  return tl;
}
