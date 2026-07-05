/** All tunables for the site live here. Edit these to change the feel. */

// ─────────────────────────────────────────────────────────────────────────────
// Showcase scroll geometry
//
// The horizontal showcase pin maps vertical scroll → horizontal track translate.
// A panel's `weight` is BOTH its width (in screen-widths) and its scroll cost.
// Coupling them keeps the scrub ratio uniform across the whole pin: smaller
// panels take less screen real estate AND less scroll distance proportionally.
// ─────────────────────────────────────────────────────────────────────────────

/** Vertical scroll distance for one full-width (weight=1) panel, in units of
 *  viewport height. This is the global scrub ratio: 1vw of horizontal track
 *  travel costs `BASE_VH × innerHeight` of vertical scroll. */
export const SHOWCASE_TRANSITION_BASE_VH = 1.5;

/** Structural gap between every pair of adjacent panels, in CSS pixels. */
export const SHOWCASE_PANEL_GAP_PX = 400;

/** Horizontal safe-zone applied inside every panel's content box, in CSS
 *  pixels (each side). */
export const SHOWCASE_PANEL_PADDING_PX = 112;

/** Maximum width of one weight-unit (1.0 weight = "100vw" panel) in CSS
 *  pixels, so ultrawide monitors don't stretch content into empty space. */
export const SHOWCASE_PANEL_MAX_WIDTH_PX = 1800;

/** Global multiplier applied to every `data-parallax-x` element across the
 *  showcase. 1.0 = exactly as authored on each element. */
export const SHOWCASE_PARALLAX_GLOBAL_SCALE = 1.5;

/** Global multiplier for every `data-parallax-y` element inside a detail lane. */
export const SHOWCASE_PARALLAX_Y_GLOBAL_SCALE = 1.0;

/** Detail-lane open/close slide duration, in seconds. */
export const LANE_TRANSITION_S = 0.7;

/** Max px an element may "lean" in the scroll direction from velocity. */
export const LANE_VELOCITY_LEAN_MAX_PX = 26;

/** px of lean per unit of Lenis velocity (before the max clamp). */
export const LANE_VELOCITY_LEAN_FACTOR = 0.012;

/** Default panel weight (screen-widths). 1.0 = 100vw. Every station renders
 *  full-width by default; use SHOWCASE_PANEL_OVERRIDES for one-off tuning. */
export const SHOWCASE_DEFAULT_WEIGHT = 1.0;

/** Optional per-kind size scale used by `getPanelScrollWeight`. Multiplies
 *  the default weight. */
export const SHOWCASE_SIZE_SCALE = {
  sm: 0.6,
  md: 1.0,
  lg: 1.4,
} as const;
export type ShowcasePanelSize = keyof typeof SHOWCASE_SIZE_SCALE;

// ─── Per-panel overrides, keyed by panel id ──────────────────────────────
// One central place to tune individual sections. Any field omitted falls
// back to the global default. Only add an entry for panels that need to
// differ from the defaults above.
export interface ShowcasePanelOverride {
  width?: number;
  gapAfter?: number;
  padding?: number;
}

/** Empty until a specific station needs to differ from the defaults above. */
export const SHOWCASE_PANEL_OVERRIDES: Record<string, ShowcasePanelOverride> = {};

/** Resolve a panel's width (in screen-widths).
 *  Precedence: SHOWCASE_PANEL_OVERRIDES[id].width → default × size. */
export function getPanelScrollWeight(
  size: ShowcasePanelSize = 'md',
  panelId?: string,
): number {
  const o = panelId ? SHOWCASE_PANEL_OVERRIDES[panelId] : undefined;
  if (o && typeof o.width === 'number' && Number.isFinite(o.width) && o.width > 0) {
    return o.width;
  }
  return SHOWCASE_DEFAULT_WEIGHT * SHOWCASE_SIZE_SCALE[size];
}

/** Resolve the gap *after* a panel (in CSS pixels).
 *  Precedence: SHOWCASE_PANEL_OVERRIDES[id].gapAfter → SHOWCASE_PANEL_GAP_PX. */
export function getPanelGapAfter(panelId: string): number {
  const g = SHOWCASE_PANEL_OVERRIDES[panelId]?.gapAfter;
  return typeof g === 'number' && Number.isFinite(g) && g >= 0 ? g : SHOWCASE_PANEL_GAP_PX;
}

/** Resolve the inner padding of a panel (in CSS pixels, applied each side).
 *  Precedence: SHOWCASE_PANEL_OVERRIDES[id].padding → SHOWCASE_PANEL_PADDING_PX. */
export function getPanelPadding(panelId: string): number {
  const p = SHOWCASE_PANEL_OVERRIDES[panelId]?.padding;
  return typeof p === 'number' && Number.isFinite(p) && p >= 0 ? p : SHOWCASE_PANEL_PADDING_PX;
}

/** Geometry derived from per-panel weights. Used by both the showcase track
 *  engine and the anchor-scroll resolver so they stay in sync.
 *
 *  Convention: panel `i` is "aligned" when its left edge sits at the viewport
 *  left edge. Going from panel i → panel i+1 means scrolling past panel i AND
 *  the gap that follows it, so the cost is (weights[i] + gap_i) × BASE_VH.
 *
 *  Units: weights are screen-widths (1.0 = 100vw). `gap` is in the SAME unit
 *  as weights — i.e. screen-widths fractions. Callers that have gaps in
 *  pixels must convert them via `gap_px / window.innerWidth` before passing
 *  in. `gap` may be a constant (uniform gap) or an array of length N-1 giving
 *  the gap *after* each non-last panel — used for per-panel overrides. */
export function buildShowcaseGeometry(
  weights: readonly number[],
  gap: number | readonly number[] = 0,
): {
  /** transitionMultipliers[i] = vh cost of moving panel i → panel i+1. */
  transitionMultipliers: number[];
  /** panelOffsetMultipliers[i] = cumulative vh cost before panel i is aligned. */
  panelOffsetMultipliers: number[];
  /** cumulativeWidthMultipliers[i] = sum of widths + gaps before panel i, in
   *  screen-widths. */
  cumulativeWidthMultipliers: number[];
  /** Sum of transition costs — the total pin distance, in vh units. */
  totalMultiplier: number;
} {
  const gapAt = (i: number): number =>
    typeof gap === 'number' ? gap : (gap[i] ?? 0);
  const transitionMultipliers: number[] = [];
  for (let i = 0; i < weights.length - 1; i++) {
    transitionMultipliers.push((weights[i]! + gapAt(i)) * SHOWCASE_TRANSITION_BASE_VH);
  }
  const panelOffsetMultipliers: number[] = [0];
  for (const t of transitionMultipliers) {
    panelOffsetMultipliers.push(panelOffsetMultipliers[panelOffsetMultipliers.length - 1]! + t);
  }
  const cumulativeWidthMultipliers: number[] = [0];
  for (let i = 0; i < weights.length - 1; i++) {
    cumulativeWidthMultipliers.push(
      cumulativeWidthMultipliers[cumulativeWidthMultipliers.length - 1]! + weights[i]! + gapAt(i),
    );
  }
  const totalMultiplier = panelOffsetMultipliers[panelOffsetMultipliers.length - 1] ?? 0;
  return { transitionMultipliers, panelOffsetMultipliers, cumulativeWidthMultipliers, totalMultiplier };
}

// ─────────────────────────────────────────────────────────────────────────────
// Other tunables
// ─────────────────────────────────────────────────────────────────────────────

/** Lenis wheel interpolation factor. Lower = smoother / laggier. */
export const LENIS_LERP = 0.1;

/** Stagger between element reveals within a panel, in ms. */
export const STAGGER_MS = 80;

/** Shared text reveal presets. Components emit a preset name and motion.ts
 *  adapts the same choreography for desktop and mobile. */
export const TEXT_REVEAL_PRESETS = {
  headline: {
    desktop: { distance: 125, duration: 0.85, staggerMs: 55 },
    mobile: { distance: 90, duration: 0.7, staggerMs: 38 },
  },
  body: {
    desktop: { distance: 70, duration: 0.7, staggerMs: 45 },
    mobile: { distance: 48, duration: 0.58, staggerMs: 28 },
  },
  label: {
    desktop: { distance: 26, duration: 0.55, staggerMs: 35 },
    mobile: { distance: 20, duration: 0.45, staggerMs: 24 },
  },
} as const;

export type TextRevealPreset = keyof typeof TEXT_REVEAL_PRESETS;

/** Mobile breakpoint below which pinning is disabled and panels stack vertically. */
export const MOBILE_BREAKPOINT_PX = 768;
