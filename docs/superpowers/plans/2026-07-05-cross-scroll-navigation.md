# Cross-Scroll Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the home page into a coherent cross-scroll: a horizontal main lane of stations, each optionally opening a vertical "detail lane" below it via clickable animated arrows / nav, with a unified component set and a guitar-string motion signature.

**Architecture:** The existing GSAP pinned horizontal showcase stays the "main lane" (wheel always pans horizontally, both directions). Each station that has content gets a `DetailLane` — a self-contained vertical-scroll overlay revealed on demand by a `lanes.ts` engine (arrows, nav, hash, `initialDetail`). Hero/teaser panels merge into one `Station` component; the gfdu triple-chevron becomes a reusable, pluckable `LaneArrow`; `string.ts` is generalized into a reusable pluck API. Detail routes (`/music`, …) become thin wrappers that render `<Stage initialDetail="…">` + their JSON-LD.

**Tech Stack:** Astro 5, TypeScript, Tailwind, GSAP + ScrollTrigger, Lenis, Vitest (unit), Playwright (e2e).

## Global Constraints

- **Home navigation invariant:** on desktop the wheel pans the main lane horizontally in BOTH directions (wheel-down = right). Detail lanes are the ONLY vertical scroll. Never let wheel-down scroll the main lane vertically.
- **Bundle discipline:** GSAP/ScrollTrigger/Lenis are dynamically imported (desktop, fine pointer, motion-enabled only) — see `scroll.ts`, `showcase.ts`. Do not add static imports of these to any module loaded on mobile.
- **`prefers-reduced-motion: reduce`** and **mobile (`max-width: 767px`)**: no pin, no Lenis, no slide transitions — lanes degrade to inline vertical stacking; all motion degrades to static/instant.
- **i18n:** every user-facing string is bilingual via `useTranslations(locale)` / `Bilingual` objects. `es` is the default locale (`/`), `en` is prefixed (`/en/`). Never hard-code a single-language UI string in a shared component.
- **Panel identity:** stations are identified by `data-showcase-panel-id="<id>"`; the hero panel id is `hero` and is exempt from reveal/parallax wiring.
- **Accent theming:** components read `--color-accent` / `--color-ink` / `--color-stage` CSS vars; never hard-code palette hexes in component markup.

---

## File Structure

**New files**
- `src/lib/laneString.ts` — reusable guitar-string physics + `attachString()` / `pluck()`.
- `src/lib/lanes.ts` — detail-lane engine: open/close, keyboard, hash sync, `initialDetail`. Absorbs `anchorScroll.ts`.
- `src/components/LaneArrow.astro` — clickable animated triple-chevron; up/down; optional string.
- `src/components/Station.astro` — unified main-lane panel (hero + standard), emits down-`LaneArrow` when the station has a detail.
- `src/components/DetailLane.astro` — detail chrome: vertical scroll container, up-`LaneArrow` return header, title, content `<slot />`.
- `src/components/content/GuitarNotes.astro` — guitar-notes grid (extracted from `guitar.astro`).
- `src/components/content/ClassesContent.astro` — classes + concerts + contact copy, socials, and `InquiryForm intent="class"` (extracted from the current `classes.astro`, which already merges classes/concerts/contact — a separate "contact" station no longer exists in `site.ts`; see the AMENDMENT note below).
- `tests/unit/lanes.test.ts` — unit tests for lane helpers.
- `tests/e2e/lanes.spec.ts` — e2e for cross-scroll navigation.
- `CLAUDE.md` — project instructions incl. the navigation invariant.

**Modified files**
- `src/data/site.ts` — add `detail?: boolean` to `Station`; set it on music/videos/guitar/classes.
- `src/components/Stage.astro` — render `Station` + optional `DetailLane`; accept `initialDetail`.
- `src/components/Nav.astro`, `src/components/HUD.astro` — link to `#id` on home for all stations (lanes open via engine).
- `src/lib/config.ts` — parallax-y scale, lane transition tokens.
- `src/lib/string.ts` — refactor onto `laneString.ts` (keep `initSignature` export).
- `src/lib/showcase.desktop.ts` — bolder parallax multipliers + velocity lead/lag + `data-parallax-y`.
- `src/styles/global.css` — container-query display type, lane styles, string threshold, `data-parallax-y` pre-hide.
- `src/layouts/Base.astro` — swap `initAnchorScroll` → `initLanes`.
- `src/pages/{about,music,videos,guitar,classes}.astro` and `src/pages/en/*` — thin `<Stage initialDetail>` wrappers.
- `tests/e2e/{stage,music,videos}.spec.ts` — update to the lane model.

**Removed files (after migration)**
- `src/components/StationHero.astro`, `src/components/StationTeaser.astro` (merged into `Station.astro`).

**AMENDMENT (post-Task-2.1):** while this plan was being executed, a separate concurrent session merged the standalone "Contact" station into "Classes" — `src/data/site.ts` no longer has a `contact` station (heading now "Clases y conciertos" / "Classes & Concerts"), `src/pages/contact.astro` and `src/pages/en/contact.astro` were deleted, and `src/pages/classes.astro` was redesigned to embed the contact form, email, and socials directly. The user confirmed (2026-07-05) this merge is intentional and final. Every task below referencing a separate `contact` station, `ContactContent.astro`, or `/contact` route has been updated in place to reflect **five stations total post-hero** (about, music, videos, guitar, classes) and **four detail lanes** (music, videos, guitar, classes — `classes`'s lane now includes what would have been the contact content). Do not recreate a `contact` station, route, or component.

---

## Phase 0 — Foundation

### Task 0.1: Document the navigation invariant

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
# Albalat — project instructions

Astro 5 + TypeScript site for classical guitarist Eulogio Albalat. Bilingual
(`es` default at `/`, `en` at `/en/`). Content model lives in `src/data/*`.

## Home navigation invariant (do not regress)

Home (`/`, `/en/`) is a horizontal **main lane**. On desktop the mouse wheel
pans the main lane **horizontally in BOTH directions** — wheel-down = move
right, wheel-up = move left (GSAP ScrollTrigger pins the showcase and scrubs
`track.x` from vertical scroll; see `src/lib/showcase.desktop.ts`).

Some stations have an optional **detail lane** below them. Detail lanes are the
ONLY place vertical scrolling happens. A detail lane is entered via its
down-arrow (`LaneArrow`) or a nav/HUD entry, and exited via the up-arrow,
scroll-to-top, or `Esc`/`ArrowUp`-at-top (see `src/lib/lanes.ts`). Never wire
wheel-down to scroll the main lane vertically.

Mobile (`max-width: 767px`) and `prefers-reduced-motion: reduce` disable the pin
and Lenis: stations and their details stack as one native vertical scroll.

## Motion

- Reveals: `data-reveal` + `revealPanel()` in `src/lib/motion.ts`.
- Horizontal parallax: `data-parallax-x="<multiplier>"`; vertical (in lanes):
  `data-parallax-y`. Global scales in `src/lib/config.ts`.
- Guitar-string affordance: `src/lib/laneString.ts` (`attachString`/`pluck`).

## Commands

- `pnpm dev` — dev server. `pnpm build` — production build.
- `pnpm check` — `astro check` + i18n-key validation (`scripts/check-i18n-keys.ts`).
- `pnpm test` — Vitest (unit). `pnpm test:e2e` — Playwright.
```

- [ ] **Step 2: Sanity-check the command names**

Run: `grep -A10 '"scripts"' package.json`
Expected: confirms `dev`, `build`, `check`, `test`, `test:e2e` exist as written above.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with home navigation invariant"
```

### Task 0.2: Config tokens for lanes and vertical parallax

**Files:**
- Modify: `src/lib/config.ts`

**Interfaces:**
- Produces: `SHOWCASE_PARALLAX_Y_GLOBAL_SCALE: number`, `LANE_TRANSITION_S: number`, `LANE_VELOCITY_LEAN_MAX_PX: number`, `LANE_VELOCITY_LEAN_FACTOR: number`.

- [ ] **Step 1: Append tokens to `config.ts`** (after `SHOWCASE_PARALLAX_GLOBAL_SCALE`)

```ts
/** Global multiplier for every `data-parallax-y` element inside a detail lane. */
export const SHOWCASE_PARALLAX_Y_GLOBAL_SCALE = 1.0;

/** Detail-lane open/close slide duration, in seconds. */
export const LANE_TRANSITION_S = 0.7;

/** Max px an element may "lean" in the scroll direction from velocity. */
export const LANE_VELOCITY_LEAN_MAX_PX = 26;

/** px of lean per unit of Lenis velocity (before the max clamp). */
export const LANE_VELOCITY_LEAN_FACTOR = 0.012;
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds (no TS errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/config.ts
git commit -m "feat: add lane + vertical-parallax config tokens"
```

---

## Phase 1 — Reusable guitar-string API

### Task 1.1: Extract `attachString` into `laneString.ts`

The string physics currently live inside `src/lib/string.ts` (`ensureLine`, `writePoints`, `initString`, and the ticker loop in `initSignature`). Extract a standalone, reusable controller so `LaneArrow`, `Station`, and `Nav`/`HUD` can all use identical string behavior and trigger discrete "plucks".

**Files:**
- Create: `src/lib/laneString.ts`
- Test: `tests/unit/laneString.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface StringHandle {
    /** Add impulse amplitude (damped over subsequent frames). strength ≈ 8–24. */
    pluck(strength?: number): void;
    /** Replace the ambient amplitude source (e.g. scroll velocity). */
    setVelocitySource(fn: () => number): void;
    /** Advance one physics frame deterministically (unit tests only). */
    tickForTest(): void;
    destroy(): void;
  }
  export function attachString(svg: SVGSVGElement, opts?: {
    pointCount?: number; hoverAmplitude?: number; pluckDefault?: number;
  }): StringHandle;
  ```

- [ ] **Step 1: Write the failing test** (`tests/unit/laneString.test.ts`)

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { attachString } from '@/lib/laneString';

// jsdom: getBoundingClientRect + rAF exist; SVG namespace supported.
function makeSvg(): SVGSVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
}

describe('attachString', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates a polyline with the configured point count', () => {
    const svg = makeSvg();
    attachString(svg, { pointCount: 40 });
    const line = svg.querySelector('[data-string-line]');
    expect(line).not.toBeNull();
    const pts = line!.getAttribute('points')!.trim().split(/\s+/);
    expect(pts).toHaveLength(40);
  });

  it('pluck() raises amplitude so the mid points deviate from the baseline', () => {
    const svg = makeSvg();
    const handle = attachString(svg, { pointCount: 40 });
    const line = svg.querySelector('[data-string-line]')!;
    const flatMidY = line.getAttribute('points')!.trim().split(/\s+/)[20].split(',')[1];
    handle.pluck(20);
    handle.tickForTest(); // advance one physics frame (test-only hook)
    const pluckedMidY = line.getAttribute('points')!.trim().split(/\s+/)[20].split(',')[1];
    expect(pluckedMidY).not.toEqual(flatMidY);
    handle.destroy();
  });

  it('destroy() is idempotent and detaches listeners', () => {
    const svg = makeSvg();
    const handle = attachString(svg);
    expect(() => { handle.destroy(); handle.destroy(); }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm test -- laneString`
Expected: FAIL — module `@/lib/laneString` not found.

- [ ] **Step 3: Implement `src/lib/laneString.ts`**

```ts
/**
 * Reusable guitar-string controller. Renders a horizontal polyline into an
 * <svg> and animates a damped standing-wave whose amplitude is driven by an
 * ambient source (default: scroll velocity) plus discrete plucks.
 *
 * Extracted from string.ts so LaneArrow / Station / Nav all share one physics
 * model. The internal rAF loop is self-owned; a `tickForTest()` hook lets unit
 * tests advance frames deterministically without a real animation frame.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_POINTS = 72;
const WIDTH = 1000;
const MID_Y = 50;

export interface StringHandle {
  pluck(strength?: number): void;
  setVelocitySource(fn: () => number): void;
  tickForTest(): void;
  destroy(): void;
}

interface Opts { pointCount?: number; hoverAmplitude?: number; pluckDefault?: number; }

function ensureLine(svg: SVGSVGElement): SVGPolylineElement {
  svg.setAttribute('viewBox', `0 0 ${WIDTH} 100`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('focusable', 'false');
  const existing = svg.querySelector<SVGPolylineElement>('[data-string-line]');
  if (existing) return existing;
  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('data-string-line', '');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '1.4');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(line);
  return line;
}

function prefersReduced(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function attachString(svg: SVGSVGElement, opts: Opts = {}): StringHandle {
  const pointCount = opts.pointCount ?? DEFAULT_POINTS;
  const hoverAmplitude = opts.hoverAmplitude ?? 14;
  const pluckDefault = opts.pluckDefault ?? 18;
  const line = ensureLine(svg);
  const state = { amplitude: 0, target: 0, phase: 0, hovered: false, impulse: 0 };
  let velocitySource = () => 0;

  const write = () => {
    const pts: string[] = [];
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const x = t * WIDTH;
      const envelope = Math.pow(Math.sin(Math.PI * t), 1.35);
      const fast = Math.sin(t * Math.PI * 8 + state.phase);
      const slow = Math.sin(t * Math.PI * 2 - state.phase * 0.55);
      const y = MID_Y + envelope * state.amplitude * (fast * 0.78 + slow * 0.22);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    line.setAttribute('points', pts.join(' '));
  };

  const step = () => {
    const velocity = velocitySource();
    const ambient = Math.min(18, velocity * 0.07);
    state.target = Math.max(ambient, state.hovered ? hoverAmplitude : 0, state.impulse);
    state.amplitude += (state.target - state.amplitude) * 0.095;
    state.impulse *= 0.88; // decay pluck
    state.phase += 0.075 + Math.min(0.08, velocity * 0.00045);
    write();
  };

  const enter = () => { state.hovered = true; };
  const leave = () => { state.hovered = false; };
  svg.addEventListener('pointerenter', enter);
  svg.addEventListener('pointerleave', leave);

  let rafId = 0;
  const loop = () => { step(); rafId = requestAnimationFrame(loop); };
  const reduced = prefersReduced();
  if (!reduced && typeof requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(loop);
  }
  write(); // initial flat line

  return {
    pluck(strength = pluckDefault) { if (!reduced) state.impulse = Math.max(state.impulse, strength); },
    setVelocitySource(fn) { velocitySource = fn; },
    tickForTest() { step(); },
    destroy() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      svg.removeEventListener('pointerenter', enter);
      svg.removeEventListener('pointerleave', leave);
    },
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test -- laneString`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/laneString.ts tests/unit/laneString.test.ts
git commit -m "feat: reusable attachString guitar-string controller"
```

### Task 1.2: Refactor `string.ts` onto `attachString`

**Files:**
- Modify: `src/lib/string.ts:36-99`, `src/lib/string.ts:252-294`

**Interfaces:**
- Consumes: `attachString`, `StringHandle` from Task 1.1.
- Produces: unchanged `initSignature(): () => void` export (Base.astro depends on it).

- [ ] **Step 1: Replace the inline string physics with `attachString`**

In `string.ts`, delete `SVG_NS`, `POINT_COUNT`, `WIDTH`, `MID_Y`, `ensureLine`, `writePoints`, `initString`, and `RunningString` (lines ~8-17, ~26-99). Import at top:

```ts
import { attachString, type StringHandle } from '@/lib/laneString';
```

Rewrite the string wiring inside `initSignature` (the block that maps `strings.map(initString)` and the `gsap.ticker.add(tick)` loop, ~lines 258-286) to:

```ts
  const strings = Array.from(document.querySelectorAll<SVGSVGElement>('svg[data-string]'));
  const spotlights = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-spotlight]'));
  if (!strings.length && !spotlights.length) return cleanupHud;

  const readVelocity = () => {
    const lenis = (window as unknown as { __lenis?: { velocity?: number } }).__lenis;
    const v = Math.abs(lenis?.velocity ?? 0);
    return Number.isFinite(v) ? v : 0;
  };

  const handles: StringHandle[] = strings.map((svg) => {
    const h = attachString(svg);
    h.setVelocitySource(readVelocity);
    return h;
  });
  cleanupFns.push(...handles.map((h) => () => h.destroy()));

  // Spotlights still need gsap; keep that dynamic import for them only.
  void import('gsap').then(({ gsap }) => {
    if (!active) return;
    cleanupFns.push(...spotlights.map((root) => mountSpotlight(root, gsap)));
  });
```

Keep `initHudStatus`, `mountSpotlight`, `mostVisiblePanel`, etc. unchanged. Remove now-unused `readScrollVelocity` if it is no longer referenced.

- [ ] **Step 2: Verify build + existing behavior**

Run: `pnpm build`
Expected: build succeeds. Then `pnpm dev`, open `/`, hover a station string → it vibrates (unchanged behavior), and scrolling makes strings livelier.

- [ ] **Step 3: Commit**

```bash
git add src/lib/string.ts
git commit -m "refactor: string.ts uses shared attachString controller"
```

---

## Phase 2 — LaneArrow component

### Task 2.1: `LaneArrow.astro`

Ports gfdu's triple-chevron as a clickable control. `direction="down"` links to `#<targetId>` (engine opens the lane); `direction="up"` calls the engine's close. Optionally renders a `data-string` line beneath a down-arrow (the "threshold").

**Files:**
- Create: `src/components/LaneArrow.astro`

**Interfaces:**
- Produces markup contract consumed by the engine (Task 5): a down-arrow is `a.lane-arrow[data-lane-open="<id>"][href="#<id>"]`; an up-arrow is `button.lane-arrow[data-lane-close]`.

- [ ] **Step 1: Create `LaneArrow.astro`**

```astro
---
interface Props {
  direction: 'down' | 'up';
  targetId?: string;   // required for direction="down"
  label: string;       // accessible label, already localized
  withString?: boolean; // render the vibrating threshold line (down only)
}
const { direction, targetId, label, withString = false } = Astro.props;
const isDown = direction === 'down';
const chevron = `M8,20 L28,20 M28,20 L20,12 M28,20 L20,28`; // right-pointing base; rotated via CSS
---
{isDown ? (
  <a
    class="lane-arrow lane-arrow--down group"
    href={`#${targetId}`}
    data-lane-open={targetId}
    aria-label={label}
  >
    {withString && (
      <svg class="lane-arrow__string text-accent/60" data-string aria-hidden="true"></svg>
    )}
    <span class="lane-arrow__chevrons" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <svg class={`arrow arrow--${n}`} viewBox="0 0 36 40" preserveAspectRatio="xMidYMid meet">
          <path d={chevron} fill="none" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        </svg>
      ))}
    </span>
  </a>
) : (
  <button type="button" class="lane-arrow lane-arrow--up group" data-lane-close aria-label={label}>
    <span class="lane-arrow__chevrons" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <svg class={`arrow arrow--${n}`} viewBox="0 0 36 40" preserveAspectRatio="xMidYMid meet">
          <path d={chevron} fill="none" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        </svg>
      ))}
    </span>
  </button>
)}

<style>
  .lane-arrow {
    display: inline-flex; flex-direction: column; align-items: center;
    gap: 0.5rem; color: var(--color-accent); background: none; border: none;
    cursor: pointer; padding: 0.5rem; text-decoration: none;
  }
  .lane-arrow:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; border-radius: 8px; }
  .lane-arrow__string { width: clamp(120px, 22vw, 320px); height: 1.5rem; }
  .lane-arrow__chevrons { position: relative; display: inline-flex; flex-direction: column; }
  /* Base SVG chevron points right; rotate to point down / up. */
  .lane-arrow--down .arrow { transform: rotate(90deg); }
  .lane-arrow--up .arrow { transform: rotate(-90deg); }
  .lane-arrow .arrow { width: 2rem; height: 2rem; margin-block: -0.55rem; opacity: 0.35; }
  .lane-arrow .arrow--1 { animation: laneArrowPulse 1.8s ease-in-out infinite; }
  .lane-arrow .arrow--2 { animation: laneArrowPulse 1.8s ease-in-out 0.18s infinite; }
  .lane-arrow .arrow--3 { animation: laneArrowPulse 1.8s ease-in-out 0.36s infinite; }
  .lane-arrow:hover .arrow { opacity: 0.9; }
  @keyframes laneArrowPulse { 0%,100% { opacity: 0.25; } 50% { opacity: 0.9; } }
  @media (prefers-reduced-motion: reduce) {
    .lane-arrow .arrow { animation: none; opacity: 0.7; }
  }
</style>
```

- [ ] **Step 2: Smoke-render it**

Temporarily drop `<LaneArrow direction="down" targetId="music" label="Open" withString />` into `src/pages/index.astro` under `<Stage>`, run `pnpm dev`, confirm three animated down-chevrons render with a faint string line. Then remove the temporary usage.

- [ ] **Step 3: Commit**

```bash
git add src/components/LaneArrow.astro
git commit -m "feat: reusable clickable LaneArrow triple-chevron"
```

---

## Phase 3 — Detail content components + DetailLane

### Task 3.1: Extract page bodies into content components

Move the inline detail bodies out of the route pages so they can be rendered inside both a `DetailLane` and (later) a thin route. Music and Videos already have `AlbumStoryPlayer` / `VideoGallery` — no extraction needed for those.

**AMENDMENT:** `src/pages/contact.astro` / `en/contact.astro` no longer exist and `site.ts` no longer has a `contact` station (merged into `classes` by a concurrent session, confirmed intentional by the user). Do NOT create `ContactContent.astro`. `ClassesContent.astro` extracts from the CURRENT `src/pages/classes.astro`, which already contains the merged classes+concerts+contact copy, email, socials, and `InquiryForm`.

**Files:**
- Create: `src/components/content/GuitarNotes.astro` (move the `<section>…guitarNotes.map…` body from `src/pages/guitar.astro`, both locales' copy handled via `locale` prop and the bilingual `guitar-notes` data)
- Create: `src/components/content/ClassesContent.astro` (move the full body — heading, email link, class/concert cards, socials list, and `<InquiryForm locale={locale} intent="class" />` — from the CURRENT `src/pages/classes.astro`)

**Interfaces:**
- Produces: `GuitarNotes({ locale })`, `ClassesContent({ locale })` — each takes only `locale: Locale`, reads its data from `src/data/*` / `site`.

- [ ] **Step 1: Create `GuitarNotes.astro`**

Frontmatter: `import { guitarNotes } from '@/data/guitar-notes'; import type { Locale } from '@/i18n'; interface Props { locale: Locale } const { locale } = Astro.props;`. Body: the exact grid currently in `guitar.astro`, but replace every `.es` access with `[locale]` and pull `kindLabels` from a bilingual literal keyed by locale. Wrap headings/eyebrows with `data-reveal` so lane reveal choreography applies.

- [ ] **Step 2: Create `ClassesContent.astro`**

Read the CURRENT `src/pages/classes.astro` and `src/pages/en/classes.astro` first (both have been redesigned by a concurrent session to merge in contact content — read them fresh, don't rely on any earlier description). Copy the current body markup, parameterize hard-coded strings by `locale` (use `src/pages/en/classes.astro`'s copy for the `en` branch). Keep `<InquiryForm locale={locale} intent="class" />` intact, and keep the email/socials rendering that reads from `site.socials`. Preserve the component's own `<style>` block (the `.contact-email`/`.contact-heading` clamp rules) if present.

- [ ] **Step 3: Verify it renders standalone**

Temporarily import it into `src/pages/guitar.astro`... no — into `src/pages/classes.astro` in place of the inline body (and `GuitarNotes` into `guitar.astro`), `pnpm dev`, confirm `/guitar` and `/classes` (and `/en/…`) look identical to before. Then revert those two route files back to their current (pre-your-edit) state — this task only creates the two new content components, it does not modify the route pages (that happens in Task 7.1).

- [ ] **Step 4: Commit**

```bash
git add src/components/content/
git commit -m "refactor: extract guitar/classes content into components"
```

### Task 3.2: `DetailLane.astro`

Consistent chrome + the vertical scroll container for one station's detail. Hidden by default; the engine reveals it. Named slot for content.

**Files:**
- Create: `src/components/DetailLane.astro`

**Interfaces:**
- Consumes: `LaneArrow` (Task 2.1).
- Produces markup contract for the engine: `section.detail-lane[data-detail-lane="<id>"][hidden]` with an inner `[data-detail-scroll]` scroll container and a heading `[data-detail-heading]` (focus target).

- [ ] **Step 1: Create `DetailLane.astro`**

```astro
---
import LaneArrow from '@/components/LaneArrow.astro';
import type { Locale } from '@/i18n';
interface Props { id: string; title: string; locale: Locale; }
const { id, title, locale } = Astro.props;
const back = locale === 'en' ? 'Back to main lane' : 'Volver a la línea principal';
---
<section
  class="detail-lane"
  data-detail-lane={id}
  aria-label={title}
  hidden
>
  <div class="detail-lane__scroll" data-detail-scroll>
    <header class="detail-lane__header">
      <LaneArrow direction="up" label={back} />
      <h2 class="detail-lane__title" data-detail-heading tabindex="-1">{title}</h2>
    </header>
    <div class="detail-lane__body">
      <slot />
    </div>
  </div>
</section>

<style>
  .detail-lane {
    position: fixed; inset: 0; z-index: 60;
    background: var(--color-stage); color: var(--color-ink);
  }
  .detail-lane[hidden] { display: none; }
  .detail-lane__scroll {
    height: 100dvh; overflow-y: auto; overflow-x: hidden;
    overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  }
  .detail-lane__header {
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    padding-top: clamp(2rem, 6vh, 5rem);
  }
  .detail-lane__title {
    container-type: inline-size;
    font-family: var(--font-display, serif);
    font-weight: 300; letter-spacing: -0.02em; text-align: center;
    font-size: clamp(2.5rem, 8cqw, 6rem);
  }
  .detail-lane__body { padding: clamp(2rem, 6vh, 6rem) clamp(1rem, 6vw, 7rem) 12vh; }
  /* Mobile / reduced-motion: lanes are inline in the vertical stack, not fixed. */
  @media (max-width: 767px) { .detail-lane { position: relative; inset: auto; z-index: auto; } .detail-lane__scroll { height: auto; overflow: visible; } }
  @media (prefers-reduced-motion: reduce) { .detail-lane { position: relative; inset: auto; } .detail-lane__scroll { height: auto; overflow: visible; } }
</style>
```

- [ ] **Step 2: Commit** (rendered/verified via Stage in Phase 6)

```bash
git add src/components/DetailLane.astro
git commit -m "feat: DetailLane chrome + vertical scroll container"
```

---

## Phase 4 — Unified Station + data model

### Task 4.1: Add `detail` flag to the data model

**Files:**
- Modify: `src/data/site.ts:26-34` (interface), `src/data/site.ts:124-188` (stations)

**AMENDMENT:** `site.ts` no longer has a `contact` station (merged into `classes` by a concurrent session, confirmed final). Read the CURRENT `src/data/site.ts` first — the exact station id list may differ from the description below; go by what's actually in the file.

**Interfaces:**
- Produces: `Station.detail?: boolean`; `true` on `music`, `videos`, `guitar`, `classes`; absent on `hero`, `about`.

- [ ] **Step 1: Extend the interface**

In the `Station` interface add: `detail?: boolean; // true → this station opens a vertical detail lane`.

- [ ] **Step 2: Set the flag**

Add `detail: true,` to the `music`, `videos`, `guitar`, and `classes` station literals. Leave `hero` and `about` without it.

- [ ] **Step 3: Verify types**

Run: `pnpm build`
Expected: succeeds (the `satisfies Station[]` still holds).

- [ ] **Step 4: Commit**

```bash
git add src/data/site.ts
git commit -m "feat: mark stations that have a detail lane"
```

### Task 4.2: `Station.astro` (merge hero + teaser)

One main-lane panel. `station.kind === 'hero'` renders the hero display; otherwise a richer standard panel (number, heading, tagline, artifact, string) that — when `station.detail` — shows a down-`LaneArrow` threshold instead of the old "Explore" link-out.

**AMENDMENT:** `contact` is no longer a station id (merged into `classes`). The code below already reflects this (`order` array and `artifact` map have 5 entries, not 6) — read the CURRENT `src/data/site.ts` to confirm the exact station id list before implementing, in case it has changed further.

**Files:**
- Create: `src/components/Station.astro`
- Reference (do not modify yet): `src/components/StationHero.astro`, `src/components/StationTeaser.astro`

**Interfaces:**
- Consumes: `LaneArrow` (2.1), `site`, `Station`, `Locale`.
- Produces: root element carries `data-station-title` (for `readStationTitle` in string.ts). A detail station emits `a.lane-arrow[data-lane-open="<id>"]`.

- [ ] **Step 1: Create `Station.astro`**

```astro
---
import type { Station } from '@/data/site';
import type { Locale } from '@/i18n';
import { site } from '@/data/site';
import LaneArrow from '@/components/LaneArrow.astro';

interface Props { station: Station; locale: Locale; }
const { station, locale } = Astro.props;
const isHero = station.kind === 'hero';
const order = ['about', 'music', 'videos', 'guitar', 'classes'];
const num = order.indexOf(station.id) + 1;
const artifact = { about:'score', music:'wave', videos:'frame', guitar:'rosette', classes:'fretboard' }[station.id] ?? 'score';
const openLabel = locale === 'en' ? `Open ${station.heading.en} details` : `Abrir ${station.heading.es}`;
---
{isHero ? (
  <div class="relative w-full h-full flex items-center justify-center px-6 text-center overflow-hidden" data-hero-stage data-station-title={station.heading[locale]}>
    <div class="absolute inset-0 -z-10 pointer-events-none" data-hero-spotlight aria-hidden="true"></div>
    <div class="hero-stage__strings" data-parallax-x="-0.22" aria-hidden="true">
      {Array.from({ length: 6 }).map(() => <span></span>)}
    </div>
    <div class="hero-stage__wash" data-parallax-x="0.10" aria-hidden="true"></div>
    <div class="relative z-10 flex flex-col items-center gap-4 md:gap-6" data-parallax-x="0.05">
      <h1 class="station-hero__title font-display font-light tracking-tight text-ink">{site.fullName}</h1>
      {station.tagline && <p class="font-sans text-lg md:text-2xl text-ink-muted">{station.tagline[locale]}</p>}
    </div>
  </div>
) : (
  <div class="station group relative flex w-full flex-col justify-center gap-6 text-ink" data-station-title={station.heading[locale]} data-station-kind={station.id}>
    <div class="station__wash" data-parallax-x="-0.16" aria-hidden="true"></div>
    <div class:list={['station__artifact', `station__artifact--${artifact}`]} data-parallax-x="0.28" aria-hidden="true">
      {Array.from({ length: 4 }).map(() => <span></span>)}
    </div>
    <div class="station__copy" data-parallax-x="-0.06">
      <span data-reveal="heading" data-text-reveal-preset="label" class="station__number">{String(Math.max(num,1)).padStart(2,'0')}</span>
      <h2 data-reveal="heading" data-text-reveal-preset="headline" class="station__heading font-display font-light tracking-tight">{station.heading[locale]}</h2>
      {station.tagline && <p data-reveal="body" class="font-sans text-lg md:text-xl text-ink-muted max-w-prose">{station.tagline[locale]}</p>}
    </div>
    {station.detail && (
      <div data-reveal="cta" class="station__enter">
        <LaneArrow direction="down" targetId={station.id} label={openLabel} withString />
      </div>
    )}
  </div>
)}

<style>
  .station-hero__title { font-size: clamp(3.5rem, 12vw, 9rem); }
  .station__heading { font-size: clamp(2.5rem, 9vw, 6.5rem); }
  .station__copy { container-type: inline-size; display: flex; flex-direction: column; gap: 1.25rem; }
  .station__number { font-family: var(--font-mono, monospace); font-size: 0.8rem; letter-spacing: 0.2em; color: var(--color-accent); }
  .station__enter { margin-top: 1.5rem; }
</style>
```

Port the `.station__wash`, `.station__artifact*`, `.hero-stage__*` decorative rules from the current `StationTeaser.astro` / `StationHero.astro` `<style>`/global CSS (rename `station-teaser__*` → `station__*`). Keep them visually identical.

- [ ] **Step 2: Commit** (wired into Stage in Phase 6)

```bash
git add src/components/Station.astro
git commit -m "feat: unified Station panel (hero + standard, with LaneArrow)"
```

---

## Phase 5 — Lane engine

### Task 5.1: `lanes.ts` pure helpers (TDD)

**Files:**
- Create: `src/lib/lanes.ts`
- Test: `tests/unit/lanes.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function laneIdFromHash(hash: string): string | null;
  export function hasDetailLane(id: string, doc?: Document): boolean;
  export function resolveInitialDetail(explicit: string | null, hash: string): string | null;
  export function initLanes(opts?: { initialDetail?: string | null }): () => void;
  ```

- [ ] **Step 1: Write failing tests** (`tests/unit/lanes.test.ts`)

```ts
// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { laneIdFromHash, hasDetailLane, resolveInitialDetail } from '@/lib/lanes';

describe('laneIdFromHash', () => {
  it('strips a leading #', () => expect(laneIdFromHash('#music')).toBe('music'));
  it('returns null for empty', () => expect(laneIdFromHash('')).toBeNull());
  it('returns null for bare #', () => expect(laneIdFromHash('#')).toBeNull());
});

describe('hasDetailLane', () => {
  beforeEach(() => { document.body.innerHTML = '<section data-detail-lane="music"></section>'; });
  it('true when a lane exists', () => expect(hasDetailLane('music', document)).toBe(true));
  it('false when it does not', () => expect(hasDetailLane('about', document)).toBe(false));
});

describe('resolveInitialDetail', () => {
  it('prefers explicit prop', () => expect(resolveInitialDetail('videos', '#music')).toBe('videos'));
  it('falls back to hash', () => expect(resolveInitialDetail(null, '#music')).toBe('music'));
  it('null when neither', () => expect(resolveInitialDetail(null, '')).toBeNull());
});
```

- [ ] **Step 2: Run, verify fail**

Run: `pnpm test -- lanes`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pure helpers first** (`src/lib/lanes.ts`)

```ts
import type Lenis from 'lenis';
import { LANE_TRANSITION_S } from '@/lib/config';

export function laneIdFromHash(hash: string): string | null {
  if (!hash) return null;
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  return id.length ? id : null;
}

export function hasDetailLane(id: string, doc: Document = document): boolean {
  return !!doc.querySelector(`[data-detail-lane="${CSS.escape(id)}"]`);
}

export function resolveInitialDetail(explicit: string | null, hash: string): string | null {
  if (explicit) return explicit;
  return laneIdFromHash(hash);
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm test -- lanes`
Expected: PASS (8 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/lanes.ts tests/unit/lanes.test.ts
git commit -m "feat: lane helper functions (hash + initialDetail resolution)"
```

### Task 5.2: `initLanes` runtime engine

Append the DOM-driven engine to `lanes.ts`. Responsibilities: intercept `[data-lane-open]` / `#id` clicks, align the main lane to the station (reuse the existing panel-scroll math), open the lane with a slide-up (or instant when reduced/mobile), trap vertical scroll, pluck the threshold string, sync the hash, close on `[data-lane-close]` / `Esc` / scroll-to-top, restore horizontal position + focus, and open `initialDetail` on load. This supersedes `anchorScroll.ts` (fold its keyboard main-lane nav in).

**Files:**
- Modify: `src/lib/lanes.ts` (append)
- Reference: `src/lib/anchorScroll.ts` (port `panelScrollY`, `scrollToPanel`, `getCurrentPanelIndex`, keyboard handler)

**Interfaces:**
- Consumes: `LANE_TRANSITION_S`; `window.__lenis`; the `DetailLane` markup contract (`[data-detail-lane]`, `[data-detail-scroll]`, `[data-detail-heading]`, `[data-lane-close]`); the `Station` down-arrow contract (`[data-lane-open]`).
- Produces: `initLanes(opts?): () => void`.

- [ ] **Step 1: Port the panel-scroll utilities**

Copy `absoluteTop`, `panelScrollY`, `getCurrentPanelIndex`, `scrollToPanel` from `anchorScroll.ts` into `lanes.ts` unchanged (they already handle pin/mobile/reduced correctly).

- [ ] **Step 2: Implement `openLane` / `closeLane` + `initLanes`**

```ts
interface LaneState { openId: string | null; restoreFocus: HTMLElement | null; }

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
    if (!lane || state.openId === id) return;
    state.restoreFocus = document.activeElement as HTMLElement | null;

    // 1) align the main lane to the station first (so exit restores exactly here)
    scrollToPanel(id);
    pluckThreshold(id);

    // 2) reveal + slide
    lane.hidden = false;
    const scroller = lane.querySelector<HTMLElement>('[data-detail-scroll]');
    if (scroller) scroller.scrollTop = 0;

    if (isDesktopMotion()) {
      const { gsap } = await import('gsap');
      gsap.fromTo(lane, { yPercent: 100, autoAlpha: 1 },
        { yPercent: 0, duration: LANE_TRANSITION_S, ease: 'power3.out' });
    }
    state.openId = id;
    document.documentElement.setAttribute('data-lane-open', id);
    history.replaceState(null, '', `#${id}`);
    lane.querySelector<HTMLElement>('[data-detail-heading]')?.focus();
  }

  async function closeLane() {
    const id = state.openId;
    if (!id) return;
    const lane = laneEl(id);
    const finish = () => {
      if (lane) lane.hidden = true;
      document.documentElement.removeAttribute('data-lane-open');
      history.replaceState(null, '', window.location.pathname + window.location.search);
      state.openId = null;
      state.restoreFocus?.focus?.();
      scrollToPanel(id); // re-align in case anything shifted
    };
    if (lane && isDesktopMotion()) {
      const { gsap } = await import('gsap');
      gsap.to(lane, { yPercent: 100, duration: LANE_TRANSITION_S, ease: 'power3.in', onComplete: finish });
    } else {
      finish();
    }
  }

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const closer = (e.target as Element | null)?.closest('[data-lane-close]');
    if (closer) { e.preventDefault(); void closeLane(); return; }
    const opener = (e.target as Element | null)?.closest<HTMLElement>('[data-lane-open], a[href^="#"]');
    if (!opener) return;
    const id = opener.getAttribute('data-lane-open')
      ?? laneIdFromHash(opener.getAttribute('href') ?? '');
    if (!id) return;
    const panel = document.querySelector(`[data-showcase-panel-id="${CSS.escape(id)}"]`);
    if (!panel) return;
    e.preventDefault();
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

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);

  // Open initialDetail (route deep-link or hash) once the showcase has laid out.
  const initial = resolveInitialDetail(opts.initialDetail ?? null, window.location.hash);
  if (initial) requestAnimationFrame(() => requestAnimationFrame(() => {
    if (hasDetailLane(initial)) void openLane(initial);
  }));

  return () => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
  };
}
```

- [ ] **Step 3: Swap the Base wiring**

In `src/layouts/Base.astro:50-53`, replace `import { initAnchorScroll } from '@/lib/anchorScroll';` with `import { initLanes } from '@/lib/lanes';` and the call `initAnchorScroll();` with reading an optional server-provided initial detail:

```astro
<script>
  import { initScroll } from '@/lib/scroll';
  import { heroEntrance } from '@/lib/motion';
  import { initShowcase } from '@/lib/showcase';
  import { initLanes } from '@/lib/lanes';
  import { initSignature } from '@/lib/string';
  const initialDetail = document.documentElement.dataset.initialDetail || null;
  initScroll();
  const run = () => { heroEntrance(); initShowcase(); initSignature(); initLanes({ initialDetail }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
</script>
```

(`Stage`/pages set `data-initial-detail` on `<html>` via an inline attribute — see Task 6.1 Step 3.)

- [ ] **Step 4: Delete `anchorScroll.ts`**

Run: `git rm src/lib/anchorScroll.ts`
Then `pnpm build` — expect no references remain (search `grep -rn anchorScroll src`; fix any).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: lane engine (open/close, keyboard, deep-link) replacing anchorScroll"
```

---

## Phase 6 — Stage rewrite

### Task 6.1: Render Station + optional DetailLane; accept `initialDetail`

**AMENDMENT:** no `contact` station/lane exists (merged into `classes`). The code below already reflects this.

**Files:**
- Modify: `src/components/Stage.astro`
- Reference: content components (Task 3.1), `AlbumStoryPlayer`, `VideoGallery`, `DetailLane`, `Station`.

**Interfaces:**
- Consumes: `Station`, `DetailLane`, content components, `discography`, `videos`, `guitar-notes`, `site`.
- Produces: `Stage({ locale, initialDetail? })`. Emits detail lanes as siblings after the track, and exposes `initialDetail` to the client via `data-initial-detail` on `<html>` (set by the page, Step 3).

- [ ] **Step 1: Map station id → detail content**

In `Stage.astro` frontmatter add:

```ts
import DetailLane from './DetailLane.astro';
import Station from './Station.astro';
import AlbumStoryPlayer from './AlbumStoryPlayer.astro';
import VideoGallery from './VideoGallery.astro';
import GuitarNotes from './content/GuitarNotes.astro';
import ClassesContent from './content/ClassesContent.astro';
import { discography } from '@/data/discography';
import { videos } from '@/data/videos';

interface Props { locale: Locale; initialDetail?: string | null; }
const { locale, initialDetail = null } = Astro.props;
```

- [ ] **Step 2: Replace the panel body + append lanes**

Inside the `stations.map(...)` return, replace the `{isHero ? <StationHero…/> : <StationTeaser…/>}` line with `<Station station={station} locale={locale} />`. After the closing `</div>` of `[data-showcase-track]` (and before `<HUD/>`), append the lanes:

```astro
  {stations.filter((s) => s.detail).map((s) => (
    <DetailLane id={s.id} title={s.heading[locale]} locale={locale}>
      {s.id === 'music'   && <AlbumStoryPlayer albums={discography} locale={locale} />}
      {s.id === 'videos'  && <VideoGallery videos={videos} locale={locale} />}
      {s.id === 'guitar'  && <GuitarNotes locale={locale} />}
      {s.id === 'classes' && <ClassesContent locale={locale} />}
    </DetailLane>
  ))}
```

- [ ] **Step 3: Publish `initialDetail` to the client**

At the top of the `Stage.astro` template (before `<section>`), add:

```astro
{initialDetail && <script is:inline set:html={`document.documentElement.dataset.initialDetail=${JSON.stringify(initialDetail)}`}></script>}
```

- [ ] **Step 4: Verify home + a deep link**

Run `pnpm dev`.
- `/` — stations pan horizontally on wheel (both directions); About shows no down-arrow; Music/Videos/Guitar/Classes each show a down-arrow with a string; clicking one slides its lane up; the up-arrow / `Esc` / scroll-to-top returns to the same horizontal position.
- `/#music` — loads home with the Music lane already open.

- [ ] **Step 5: Commit**

```bash
git add src/components/Stage.astro
git commit -m "feat: Stage renders unified Station + optional DetailLane, deep-linkable"
```

### Task 6.2: Remove the old panel components

**Files:**
- Remove: `src/components/StationHero.astro`, `src/components/StationTeaser.astro`

- [ ] **Step 1: Confirm no remaining imports**

Run: `grep -rn "StationHero\|StationTeaser" src`
Expected: no matches (Stage now uses `Station`).

- [ ] **Step 2: Delete + build**

```bash
git rm src/components/StationHero.astro src/components/StationTeaser.astro
pnpm build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove StationHero/StationTeaser (merged into Station)"
```

---

## Phase 7 — Routes become deep-link wrappers

### Task 7.1: Rewrite detail routes to `<Stage initialDetail>`

Each route renders the full home stage with its lane pre-opened, keeping its existing SEO/JSON-LD. `about` (no lane) simply scrolls to the About station.

**AMENDMENT:** `src/pages/contact.astro` and `src/pages/en/contact.astro` no longer exist (deleted by a concurrent session; contact is merged into `classes`) — do NOT recreate them. There are five routes to rewrite per locale, not six.

**Files:**
- Modify: `src/pages/{about,music,videos,guitar,classes}.astro`
- Modify: `src/pages/en/{about,music,videos,guitar,classes}.astro`

**Interfaces:**
- Consumes: `Stage({ locale, initialDetail })`, `Nav`, `Base`.

- [ ] **Step 1: Rewrite `music.astro` (es) as the template**

```astro
---
import Base from '@/layouts/Base.astro';
import Nav from '@/components/Nav.astro';
import Stage from '@/components/Stage.astro';
import { site } from '@/data/site';
import { discography } from '@/data/discography';
import { laneSwitch } from '@/lib/transitions';
// keep the existing `title`, `description`, `jsonLd` computation from the old music.astro
// ... (unchanged JSON-LD block) ...
---
<Base locale="es" title={title} description={description} jsonLd={jsonLd}>
  <Nav locale="es" />
  <main id="main-content" transition:name="page-lane" transition:animate={laneSwitch}>
    <Stage locale="es" initialDetail="music" />
  </main>
</Base>
```

- [ ] **Step 2: Apply the same shape to the other four es routes**

For each, keep its existing `title`/`description`/`jsonLd`, render `<Stage locale="es" initialDetail="<id>" />`. For `about.astro` use `initialDetail={null}` (or omit) — About has no lane; it just deep-links to the station. Ids: `videos`, `guitar`, `classes`.

- [ ] **Step 3: Apply to all five `en` routes**

Same, with `locale="en"` and `<Nav locale="en" />`. Keep each `en` page's existing English `title`/`description`/`jsonLd`.

- [ ] **Step 4: Verify routes**

Run `pnpm dev`. Visit `/music`, `/videos`, `/guitar`, `/classes` and `/en/music` … — each loads the stage with the right lane open; `/about`, `/en/about` scroll to the About station with no lane. View source: per-route JSON-LD present.

- [ ] **Step 5: Commit**

```bash
git add src/pages
git commit -m "feat: detail routes render Stage with their lane pre-opened"
```

### Task 7.2: Retire the now-unused `Detail.astro` layout if orphaned

**Files:**
- Reference/Remove: `src/layouts/Detail.astro`

- [ ] **Step 1: Check for remaining users**

Run: `grep -rn "layouts/Detail" src`
Expected: none (routes now use `Base` directly). If any remain, migrate them first.

- [ ] **Step 2: Remove + build**

```bash
git rm src/layouts/Detail.astro
pnpm build
```
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned Detail layout"
```

---

## Phase 8 — Nav & HUD

### Task 8.1: Nav/HUD always use `#id` (engine handles lane vs. scroll)

On home, nav/HUD already emit `#id`. The engine now decides: station-with-lane → open lane; without → scroll. On non-home routes, keep `#id` too (every route renders the Stage), so nav no longer needs the `localizePath(station.href)` branch.

**Files:**
- Modify: `src/components/Nav.astro:22-28,56-72`
- Modify: `src/components/HUD.astro` (already emits `#id` — verify only)

**Interfaces:**
- Consumes: `site.stations`, `useTranslations`.

- [ ] **Step 1: Simplify `Nav` items to hashes**

In `Nav.astro`, change `navItems` to always use `href: `#${station.id}`` (drop the `isHome` branch and `localizePath(station.href!)`), filtering to `station.kind !== 'hero'`. Keep the Home link and `LangToggle`. `aria-current` can key off the open lane via `document`/no-op at SSR — keep it simple: mark none current at SSR; the engine sets `aria-current` at runtime (HUD already does this in `string.ts` `initHudStatus`).

- [ ] **Step 2: Verify HUD unchanged**

`HUD.astro` already emits `href={`#${station.id}`}` and `data-hud-station-link` — no change needed. Confirm by reading it.

- [ ] **Step 3: Verify nav behavior**

`pnpm dev`: on `/`, clicking "Música" opens the Music lane; clicking a lane-less entry ("Biografía"/About) scrolls to it. On `/en/`, same in English.

- [ ] **Step 4: Commit**

```bash
git add src/components/Nav.astro
git commit -m "feat: nav routes through the lane engine via #id links"
```

---

## Phase 9 — Signature motion polish

### Task 9.1: Dial up horizontal parallax + velocity lead/lag

**Files:**
- Modify: `src/lib/showcase.desktop.ts:172-198` (parallax block)

**Interfaces:**
- Consumes: `LANE_VELOCITY_LEAN_MAX_PX`, `LANE_VELOCITY_LEAN_FACTOR`, `SHOWCASE_PARALLAX_Y_GLOBAL_SCALE` from config; `window.__lenis`.

- [ ] **Step 1: Add a velocity "lean" ticker to the parallax block**

After the existing `parallaxTweens` loop, add a subtle direction lean applied to elements marked `data-parallax-lean` (add this attribute to `.station__heading` and `.station__artifact` in `Station.astro`):

```ts
import { LANE_VELOCITY_LEAN_MAX_PX, LANE_VELOCITY_LEAN_FACTOR } from '@/lib/config';
// ...
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
```

Add to the returned cleanup: `if (leanRaf) cancelAnimationFrame(leanRaf);`. In `global.css`, consume the var: `[data-parallax-lean] { transform: translateX(var(--lean, 0)); transition: transform 0.35s ease-out; }` (note: parallax-x GSAP tweens use `x`; lean uses `translateX` via CSS var, so they compose without fighting — GSAP writes `transform: translate(x,…)` and the CSS var-based rule is on the child; if a conflict appears, move `--lean` onto an inner wrapper span).

- [ ] **Step 2: Increase authored multipliers**

The bolder `data-parallax-x` values are already set in `Station.astro` (Task 4.2: `-0.16`/`0.28`/`-0.06`, hero `-0.22`/`0.10`/`0.05`). Verify they read as clearly layered on `/` without content leaving the panel unintentionally; tune within ±0.05 if any element clips.

- [ ] **Step 3: Verify + commit**

`pnpm dev`, pan quickly on `/`: headings/artifacts lean slightly toward travel and settle on stop; reduced-motion shows none.

```bash
git add src/lib/showcase.desktop.ts src/styles/global.css
git commit -m "feat: velocity lead/lag lean on station display elements"
```

### Task 9.2: Vertical parallax inside detail lanes

**Files:**
- Modify: `src/components/DetailLane.astro` (scroll listener) OR `src/lib/lanes.ts` (on open)
- Modify: content components — add `data-parallax-y="<n>"` to a few headings/visuals.

- [ ] **Step 1: Add a y-parallax pass when a lane opens**

In `lanes.ts` `openLane`, after reveal, wire a scroll handler on `[data-detail-scroll]` that translates `[data-parallax-y]` descendants by `scrollTop * multiplier * SHOWCASE_PARALLAX_Y_GLOBAL_SCALE * 0.1`, capped, via `requestAnimationFrame`; detach it in `closeLane`. Skip entirely when `!isDesktopMotion()`.

```ts
// inside openLane, after state.openId = id:
if (isDesktopMotion() && scroller) {
  const yEls = Array.from(lane.querySelectorAll<HTMLElement>('[data-parallax-y]'));
  const onScroll = () => {
    const top = scroller.scrollTop;
    yEls.forEach((el) => {
      const m = Number(el.dataset.parallaxY) || 0;
      el.style.transform = `translateY(${(top * m * 0.1).toFixed(1)}px)`;
    });
  };
  scroller.addEventListener('scroll', onScroll, { passive: true });
  state.detachY = () => scroller.removeEventListener('scroll', onScroll);
}
```

Add `detachY?: () => void` to `LaneState`; call `state.detachY?.()` in `closeLane`'s `finish()`.

- [ ] **Step 2: Annotate content**

Add `data-parallax-y="-0.6"` to `.detail-lane__title` (via `DetailLane`) and `data-parallax-y="0.3"` to one featured visual in `AlbumStoryPlayer`/`VideoGallery` (a background/eyebrow, not interactive controls).

- [ ] **Step 3: Verify + commit**

`pnpm dev`, open a lane, scroll: title/visual drift at different rates; reduced-motion static.

```bash
git add -A
git commit -m "feat: vertical parallax inside detail lanes"
```

### Task 9.3: Container-query display type sweep

**Files:**
- Modify: `src/styles/global.css`, `src/components/Station.astro`, `src/components/DetailLane.astro`

- [ ] **Step 1: Confirm cqw type is applied**

`Station.astro` `.station__heading` / `.station-hero__title` and `DetailLane` `.detail-lane__title` already use `clamp(min, N cqw|vw, max)` inside `container-type: inline-size` wrappers (Tasks 4.2, 3.2). Add a shared token comment block in `global.css` documenting the scale (display-xl `clamp(2.5rem, 9cqw, 6.5rem)`, etc.) and ensure `--font-display`/`--font-mono` vars exist (they’re referenced); if not, map them to the existing font stack.

- [ ] **Step 2: Verify responsive scaling**

`pnpm dev`, resize from mobile→ultrawide: headings scale with panel width, never overflow.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: panel-relative container-query display type"
```

---

## Phase 10 — Tests & cleanup

### Task 10.1: E2E — cross-scroll navigation

**Files:**
- Create: `tests/e2e/lanes.spec.ts`
- Modify: `tests/e2e/stage.spec.ts` (the "lane switch navigates to About" test now stays on home)

**Interfaces:**
- Consumes: the running dev/preview server per existing Playwright config.

- [ ] **Step 1: Write `tests/e2e/lanes.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('wheel-down pans the main lane horizontally, not vertically', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.scrollHeight > window.innerHeight * 2);
  const about = page.locator('[data-showcase-panel-id="about"]');
  const before = await about.evaluate((p) => p.getBoundingClientRect().left);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => about.evaluate((p) => p.getBoundingClientRect().left)).toBeLessThan(before - 10);
});

test('clicking a station down-arrow opens its detail lane', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-lane-open="music"]').click();
  await expect(page.locator('[data-detail-lane="music"]')).toBeVisible();
  await expect(page).toHaveURL(/#music$/);
});

test('up-arrow closes the lane and returns to the main lane', async ({ page }) => {
  await page.goto('/#music');
  const lane = page.locator('[data-detail-lane="music"]');
  await expect(lane).toBeVisible();
  await lane.locator('[data-lane-close]').click();
  await expect(lane).toBeHidden();
});

test('a station without a detail lane (about) has no down-arrow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-lane-open="about"]')).toHaveCount(0);
});

test('nav entry opens the matching lane', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Inicio' }).locator('a[href="#videos"]').click();
  await expect(page.locator('[data-detail-lane="videos"]')).toBeVisible();
});

test('deep-link route opens the lane on load', async ({ page }) => {
  await page.goto('/guitar');
  await expect(page.locator('[data-detail-lane="guitar"]')).toBeVisible();
});
```

- [ ] **Step 2: Update `stage.spec.ts`**

Replace the "lane switch navigates to About" test body: About now stays on home (no `/about` navigation from the panel). Assert clicking the About nav entry scrolls the About panel into view and no lane opens:

```ts
test('About station has no detail lane and stays on home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Inicio' }).locator('a[href="#about"]').click();
  await expect(page.locator('[data-showcase-panel-id="about"]')).toBeInViewport();
  await expect(page.locator('[data-detail-lane]')).toHaveCount(4); // music,videos,guitar,classes
});
```

- [ ] **Step 3: Run e2e**

Run: `pnpm test:e2e`
Expected: PASS (new lanes spec + updated stage spec). Fix selectors if the dev server needs the pin to settle (`waitForFunction` already used).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/lanes.spec.ts tests/e2e/stage.spec.ts
git commit -m "test: e2e cross-scroll lane navigation"
```

### Task 10.2: Reconcile `music.spec.ts` / `videos.spec.ts` / `seo.spec.ts`

**AMENDMENT:** `seo.spec.ts` may already have been updated by a concurrent session for the classes/contact merge (contact route removed from data model). Read the CURRENT `seo.spec.ts` before editing — if it's already been updated/committed for the merge, only adapt its assertions to the lane model (Step 2 below) without reintroducing any `/contact` route expectations.

**Files:**
- Modify: `tests/e2e/music.spec.ts`, `tests/e2e/videos.spec.ts`, `tests/e2e/seo.spec.ts`

- [ ] **Step 1: Point content assertions at the open lane**

In `music.spec.ts` / `videos.spec.ts`, keep asserting the content components render, but scope to the lane: navigate to `/music` (deep link opens the lane) and assert `[data-detail-lane="music"]` contains the album player, etc. Update any selector that assumed a standalone page body.

- [ ] **Step 2: Confirm SEO unchanged**

`seo.spec.ts` asserts per-route JSON-LD — routes still emit it (Task 7). Run and fix only if a title/URL string changed.

- [ ] **Step 3: Run full suites**

Run: `pnpm test && pnpm test:e2e`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e
git commit -m "test: reconcile music/videos/seo specs with lane model"
```

### Task 10.3: Final verification sweep

- [ ] **Step 1: Full build + type check**

Run: `pnpm build`
Expected: succeeds, no TS/astro errors.

- [ ] **Step 2: Manual matrix** (`pnpm dev`)

Verify, and note results:
- Desktop `/`: wheel both directions pans horizontally; no vertical page scroll on the main lane.
- Each detail station: down-arrow + string; open slides up; string plucks on enter; vertical scroll works; up-arrow / `Esc` / scroll-to-top returns to the same x; focus restored.
- `about`: no arrow, no lane.
- Nav + HUD entries open lanes / scroll correctly, `es` and `en`.
- Deep links `/music`, `/en/guitar` open the right lane.
- Mobile (`<768px` devtools): everything is one vertical stack; lanes inline; arrows scroll between station and detail.
- `prefers-reduced-motion`: no slides, no lean, no string vibration; all reachable.

- [ ] **Step 3: Commit any tuning**

```bash
git add -A
git commit -m "polish: cross-scroll navigation tuning from verification sweep"
```

---

## Self-Review Notes (coverage map)

- Spec §"Interaction model" → Tasks 2.1, 5.1, 5.2, 6.1 (arrows/nav enter, wheel horizontal, Esc/ArrowUp/scroll-top exit).
- Spec §"Component architecture" → Station 4.2, DetailLane 3.2, LaneArrow 2.1, lanes.ts 5.x; old components removed 6.2.
- Spec §"Data model" (`detail?`) → 4.1; about has no lane → 4.1, verified 10.1. AMENDMENT: contact merged into classes by a concurrent session (user-confirmed final) — 4 detail lanes (music/videos/guitar/classes), not 5; no standalone contact station/route/component anywhere in this plan as of Task 3.1 onward.
- Spec §"Routes / SEO" (deep-links + JSON-LD) → 7.1, 7.2, 10.2.
- Spec §"Mobile" (single vertical stack) → CSS in 3.2 + engine `isDesktopMotion` guards in 5.2; verified 10.3.
- Spec §"Signature motion" — string threshold 1.1/1.2/2.1; direction/velocity parallax 9.1; parallax-y 9.2; cqw type 9.3.
- Spec §"Documented rule" → 0.1 (CLAUDE.md).
- Spec §"Accessibility" → LaneArrow labels/focus 2.1, focus move/restore + Esc 5.2, reduced-motion throughout.
- Spec §"Testing" → 5.1 (unit), 10.1–10.2 (e2e), 10.3 (manual matrix).
