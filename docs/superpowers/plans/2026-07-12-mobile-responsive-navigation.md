# Mobile-Responsive Navigation & Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home showcase work correctly on mobile — vertical stack for the main lane, a coordinated horizontal slide for detail lanes (the X-axis mirror of the desktop descent), axis-aware arrows, per-block content legibility, and touch-target fixes — without touching desktop behavior.

**Architecture:** Desktop and mobile share one spatial language, rotated 90°. Desktop browses stations horizontally (wheel pans X) and opens detail vertically (descend). Mobile browses stations vertically (native scroll) and opens detail horizontally (slide from the right). The mobile detail motion reuses the structure of `lanes.ts`'s existing coordinated descent, translating on X instead of Y. A dead horizontal-carousel code path (already overridden by `global.css` `!important` rules) is removed so there is a single, legible mobile path.

**Tech Stack:** Astro 5, TypeScript, GSAP (desktop + mobile slide), IntersectionObserver (mobile reveals), Vitest (unit), plain CSS (`src/styles/global.css` + per-component `<style>`).

## Global Constraints

- **Breakpoint:** mobile is `max-width: 767px` (i.e. `MOBILE_BREAKPOINT_PX = 768`, query `(max-width: 767px)`). Copied verbatim from `src/lib/config.ts:182`.
- **Reduced motion:** `prefers-reduced-motion: reduce` disables all slide/pin animation; detail lanes render inline in the vertical stack. Never gate functionality behind animation.
- **Desktop invariant (do not regress):** on desktop the wheel pans the main lane horizontally in both directions; detail lanes descend vertically. No task may change desktop feel.
- **Bilingual:** `es` at `/`, `en` at `/en/`. Any user-facing string must exist in both locales; `pnpm check` runs i18n-key validation.
- **Touch targets:** interactive controls on mobile must be ≥ 44×44px.
- **No browser/e2e tests** unless explicitly requested — verification for DOM/CSS/animation tasks is `pnpm check` passing plus a described manual check the maintainer can run with `pnpm dev`. Unit tests (Vitest) are still required where logic is pure.
- **Commands:** `pnpm test` (Vitest), `pnpm check` (astro check + i18n), `pnpm build`.

---

### Task 1: Viewport / motion-mode helper module

Centralize the viewport + reduced-motion media queries (currently duplicated across `showcase.ts` and `lanes.ts`) into one pure, testable module. This is the foundation later tasks consume.

**Files:**
- Create: `src/lib/viewport.ts`
- Test: `tests/unit/viewport.test.ts`

**Interfaces:**
- Consumes: `MOBILE_BREAKPOINT_PX` from `src/lib/config.ts`.
- Produces:
  - `isMobileViewport(win?): boolean`
  - `prefersReducedMotion(win?): boolean`
  - `type LaneMotion = 'descend' | 'slide' | 'inline'`
  - `laneMotion(win?): LaneMotion`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/viewport.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isMobileViewport, prefersReducedMotion, laneMotion } from '@/lib/viewport';

const REDUCED = '(prefers-reduced-motion: reduce)';
const MOBILE = '(max-width: 767px)';

function fakeWin(active: Partial<Record<string, boolean>>) {
  return { matchMedia: (q: string) => ({ matches: !!active[q] }) };
}

describe('isMobileViewport', () => {
  it('true when the mobile query matches', () =>
    expect(isMobileViewport(fakeWin({ [MOBILE]: true }))).toBe(true));
  it('false when it does not', () =>
    expect(isMobileViewport(fakeWin({}))).toBe(false));
});

describe('prefersReducedMotion', () => {
  it('true when the reduce query matches', () =>
    expect(prefersReducedMotion(fakeWin({ [REDUCED]: true }))).toBe(true));
  it('false otherwise', () =>
    expect(prefersReducedMotion(fakeWin({}))).toBe(false));
});

describe('laneMotion', () => {
  it('descend on desktop with motion allowed', () =>
    expect(laneMotion(fakeWin({}))).toBe('descend'));
  it('slide on mobile with motion allowed', () =>
    expect(laneMotion(fakeWin({ [MOBILE]: true }))).toBe('slide'));
  it('inline whenever reduced motion is set (desktop)', () =>
    expect(laneMotion(fakeWin({ [REDUCED]: true }))).toBe('inline'));
  it('inline whenever reduced motion is set (mobile)', () =>
    expect(laneMotion(fakeWin({ [MOBILE]: true, [REDUCED]: true }))).toBe('inline'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test viewport`
Expected: FAIL — `Cannot find module '@/lib/viewport'`.

- [ ] **Step 3: Write the module**

Create `src/lib/viewport.ts`:

```ts
/** Viewport / motion-mode helpers. The single source of truth for the media
 *  queries that used to be duplicated across showcase.ts and lanes.ts. `win`
 *  is injectable so the logic is unit-testable without a real browser. */
import { MOBILE_BREAKPOINT_PX } from '@/lib/config';

type Win = { matchMedia: (q: string) => { matches: boolean } };

export function isMobileViewport(win: Win = window): boolean {
  return win.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
}

export function prefersReducedMotion(win: Win = window): boolean {
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** How a detail lane should open at the current viewport / preference:
 *  - 'descend' : desktop pinned lane — detail rises from below (Y slide)
 *  - 'slide'   : mobile — detail enters from the right (X slide)
 *  - 'inline'  : reduced-motion — detail revealed inline in the vertical stack */
export type LaneMotion = 'descend' | 'slide' | 'inline';

export function laneMotion(win: Win = window): LaneMotion {
  if (prefersReducedMotion(win)) return 'inline';
  if (isMobileViewport(win)) return 'slide';
  return 'descend';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test viewport`
Expected: PASS (10 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/viewport.ts tests/unit/viewport.test.ts
git commit -m "feat: viewport/motion-mode helper module"
```

---

### Task 2: Remove the dead mobile carousel; make the vertical stack the one mobile mode

`global.css`'s `@media (max-width: 767px)` block already forces the track to a vertical column with `!important`, so `showcase.mobile.ts`'s `carousel` inline styles are dead weight that only confuses. Strip the mode machinery down to reveals + halo gating, and route both mobile and reduced-motion through it via the Task 1 helpers.

**Files:**
- Modify: `src/lib/showcase.mobile.ts` (replace whole file body)
- Modify: `src/lib/showcase.ts:40-49`

**Interfaces:**
- Consumes: `isMobileViewport`, `prefersReducedMotion` from `src/lib/viewport.ts` (Task 1).
- Produces: `initShowcaseMobile(panels: NodeListOf<HTMLElement>): () => void` (signature changes — drops the `track` and `mode` params).

- [ ] **Step 1: Rewrite `src/lib/showcase.mobile.ts`**

Replace the entire file with:

```ts
import { revealPanel, revealProblemCard } from '@/lib/motion';

/**
 * Mobile showcase: panels stack vertically. `global.css`'s `@media
 * (max-width: 767px)` block owns the column layout (via `!important`), so this
 * module only wires the native IntersectionObserver reveals and the decorative
 * halo/loop gating — no GSAP ScrollTrigger, no Lenis, no inline layout styles.
 * Imported dynamically from showcase.ts for mobile and reduced-motion.
 */
export function initShowcaseMobile(
  panels: NodeListOf<HTMLElement>,
): () => void {
  const revealOnce = (panel: HTMLElement) => {
    if (panel.dataset.showcaseRevealed === 'true') return;
    panel.dataset.showcaseRevealed = 'true';
    revealPanel(panel);
    revealProblemCard(panel);
  };

  // Reveal IO — fires once per panel, then unobserves.
  const revealIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const panel = entry.target as HTMLElement;
        revealOnce(panel);
        revealIo.unobserve(panel);
      }
    });
  }, { rootMargin: '0px 0px -15% 0px' });
  panels.forEach((p) => revealIo.observe(p));

  // Halo / decorative-loop activity IO — toggles `data-halo-active` /
  // `data-active-mobile` as each panel enters/leaves the viewport. Decorative
  // CSS keyframes default to paused and resume only on these attributes.
  const activeIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const panel = entry.target as HTMLElement;
      if (entry.isIntersecting) {
        panel.setAttribute('data-halo-active', '');
        panel.setAttribute('data-active-mobile', '');
      } else {
        panel.removeAttribute('data-halo-active');
        panel.removeAttribute('data-active-mobile');
      }
    });
  }, { threshold: 0 });
  panels.forEach((p) => activeIo.observe(p));

  return () => {
    revealIo.disconnect();
    activeIo.disconnect();
  };
}
```

- [ ] **Step 2: Update the dispatcher in `src/lib/showcase.ts`**

Replace lines 40-49 (the `isMobile`/`prefersReduced`/dispatch block) with:

```ts
  const panels = track.querySelectorAll<HTMLElement>('[data-showcase-panel]');
  const isMobile = isMobileViewport();
  const prefersReduced = prefersReducedMotion();

  if (isMobile || prefersReduced) {
    const { initShowcaseMobile } = await import('./showcase.mobile');
    return initShowcaseMobile(panels);
  }

  const { initShowcaseDesktop } = await import('./showcase.desktop');
  return initShowcaseDesktop(section, track, panels);
```

Then update the imports at the top of `src/lib/showcase.ts` — replace `import { MOBILE_BREAKPOINT_PX } from '@/lib/config';` with:

```ts
import { isMobileViewport, prefersReducedMotion } from '@/lib/viewport';
```

- [ ] **Step 3: Verify types and existing tests**

Run: `pnpm check`
Expected: PASS (no type errors; `initShowcaseMobile` is called with the new single-arg signature everywhere).

Run: `pnpm test`
Expected: PASS (existing suites unaffected).

- [ ] **Step 4: Manual sanity check (optional, maintainer)**

`pnpm dev`, open the home page at a ≤767px width. The stations stack vertically and scroll natively; there is no horizontal scroll or scroll-snap. (No behavior change expected vs. before, since the carousel was already overridden — this step confirms nothing regressed.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/showcase.mobile.ts src/lib/showcase.ts
git commit -m "refactor: drop dead mobile carousel; single vertical-stack path"
```

---

### Task 3: Mobile detail lane becomes a fixed sliding layer

Today the detail lane is `position: relative` inline on mobile, so it renders orphaned at the bottom of the page. Make it a fixed full-viewport layer on mobile (so Task 4 can slide it in from the right). Only `prefers-reduced-motion` keeps the inline treatment. Also lock background scroll while a lane is open on mobile.

**Files:**
- Modify: `src/components/DetailLane.astro:56-58` (the `<style>` media queries)
- Modify: `src/styles/global.css` (append a body-scroll-lock rule)

**Interfaces:**
- Consumes: nothing new.
- Produces: on mobile (non-reduced-motion) `.detail-lane` is `position: fixed; inset: 0; z-index: 60` and starts hidden; when `hidden=false` it fills the viewport. `html[data-open-lane]` locks body scroll on mobile.

- [ ] **Step 1: Update `DetailLane.astro` media queries**

In `src/components/DetailLane.astro`, replace these two lines (currently lines 56-58):

```css
  /* Mobile / reduced-motion: lanes are inline in the vertical stack, not fixed. */
  @media (max-width: 767px) { .detail-lane { position: relative; inset: auto; z-index: auto; } .detail-lane__scroll { height: auto; overflow: visible; } }
  @media (prefers-reduced-motion: reduce) { .detail-lane { position: relative; inset: auto; } .detail-lane__scroll { height: auto; overflow: visible; } }
```

with (mobile now KEEPS the fixed layer for the slide; only reduced-motion goes inline):

```css
  /* Reduced-motion: lanes are inline in the vertical stack, not a fixed slide
     layer. Mobile (with motion) keeps the fixed layer — Task 4 slides it in
     from the right. */
  @media (prefers-reduced-motion: reduce) {
    .detail-lane { position: relative; inset: auto; z-index: auto; }
    .detail-lane__scroll { height: auto; overflow: visible; }
  }
```

- [ ] **Step 2: Add the body-scroll lock to `global.css`**

Append to `src/styles/global.css` (end of file):

```css
/* While a detail lane is open on mobile it is a fixed full-viewport slide layer
   (DetailLane.astro), so lock the background scroll behind it. Reduced-motion
   lanes are inline in the flow and must NOT be locked — hence the
   no-preference guard. */
@media (max-width: 767px) and (prefers-reduced-motion: no-preference) {
  html[data-open-lane] body { overflow: hidden; }
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Manual sanity check (optional, maintainer)**

`pnpm dev` at ≤767px: tapping a station's detail arrow (e.g. Music) now shows the detail full-screen (no slide yet — that is Task 4), covering the stack instead of appearing at the page bottom. The Back arrow closes it. Background does not scroll while open.

- [ ] **Step 5: Commit**

```bash
git add src/components/DetailLane.astro src/styles/global.css
git commit -m "feat: mobile detail lane as fixed full-viewport layer"
```

---

### Task 4: Coordinated horizontal slide for mobile detail (lanes.ts)

Add the mobile branch to lane open/close: the detail slides in from the right while the panel stack slides left, mirroring the existing desktop descent on the X axis. Generalize `descend()` into an axis-aware `slide()` (dropping the leftover `console.log` debug), route open/close through `laneMotion()`, extract a pure `nextStationId()`, and delete the dead carousel branches in `panelScrollY` / `getCurrentPanelIndex`.

**Files:**
- Modify: `src/lib/lanes.ts`
- Test: `tests/unit/lanes.test.ts` (add `nextStationId` suite)

**Interfaces:**
- Consumes: `laneMotion`, `type LaneMotion` from `src/lib/viewport.ts` (Task 1); `[data-showcase-descent]` layer (already in `Showcase.astro`); `.detail-lane` fixed on mobile (Task 3).
- Produces: exported `nextStationId(orderedIds: readonly string[], currentId: string): string | null`. Internal `slide(gsap, lane, panelsLayer, axis: 'x'|'y', dir: 'open'|'close', onComplete?)` replacing `descend()`.

- [ ] **Step 1: Write the failing test for `nextStationId`**

Append to `tests/unit/lanes.test.ts`:

```ts
import { nextStationId } from '@/lib/lanes';

describe('nextStationId', () => {
  const order = ['hero', 'about', 'music', 'videos', 'classes', 'contact'];
  it('returns the following id', () =>
    expect(nextStationId(order, 'music')).toBe('videos'));
  it('null at the last station', () =>
    expect(nextStationId(order, 'contact')).toBeNull());
  it('null when the id is absent', () =>
    expect(nextStationId(order, 'nope')).toBeNull());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test lanes`
Expected: FAIL — `nextStationId` is not exported.

- [ ] **Step 3: Add the import and `nextStationId` to `lanes.ts`**

At the top of `src/lib/lanes.ts`, add to the existing import block:

```ts
import { laneMotion } from '@/lib/viewport';
```

After the `resolveInitialDetail` function (around line 18), add:

```ts
/** The station id that follows `currentId` in DOM order, or null if it is the
 *  last station (or not found). Pure — pass the ordered list of panel ids. */
export function nextStationId(orderedIds: readonly string[], currentId: string): string | null {
  const i = orderedIds.indexOf(currentId);
  if (i < 0 || i + 1 >= orderedIds.length) return null;
  return orderedIds[i + 1] ?? null;
}
```

- [ ] **Step 4: Run to verify the test passes**

Run: `pnpm test lanes`
Expected: PASS (existing `lanes` suites + 3 new assertions).

- [ ] **Step 5: Remove the carousel branch in `panelScrollY`**

In `src/lib/lanes.ts`, replace the body of `panelScrollY` from the `const isMobile = ...` line through the second `if (isMobile || prefersReduced)` return (currently lines 45-57) with:

```ts
  if (isMobileViewport() || prefersReducedMotion()) {
    return absoluteTop(panel);
  }
```

Add `isMobileViewport, prefersReducedMotion` to the `@/lib/viewport` import from Step 3:

```ts
import { laneMotion, isMobileViewport, prefersReducedMotion } from '@/lib/viewport';
```

Remove the now-unused `MOBILE_BREAKPOINT_PX` from the `@/lib/config` import line if it is no longer referenced elsewhere in the file (check with a search; `buildShowcaseGeometry` and `SHOWCASE_PARALLAX_Y_GLOBAL_SCALE` stay).

- [ ] **Step 6: Remove the carousel branch in `getCurrentPanelIndex`**

In `getCurrentPanelIndex`, delete the mobile-carousel block (currently lines 88-103, the `const isMobile = ... if (isMobile && !prefersReduced) { ... return best; }`) so the function falls straight through to the existing `const y = window.scrollY;` vertical logic. The vertical path already calls `panelScrollY`, which now returns the mobile vertical position.

- [ ] **Step 7: Replace `descend()` with axis-aware `slide()`**

Replace the entire `descend` constant (currently lines 165-205, including all the `console.log` calls) with:

```ts
  // Coordinated slide shared by open and close so both directions stay in
  // lockstep. The detail lane and the panel row (the [data-showcase-descent]
  // layer, NOT the scrubbed track — decoupling them is what lets the descent
  // slide on every open, not only the first) move as one. `axis` picks the
  // motion: 'y' = desktop descent (rise from below), 'x' = mobile slide (enter
  // from the right). state.trackTween clears any stale tween so repeat cycles
  // start from a clean 0 / -100.
  const slide = (
    gsap: GsapInstance,
    lane: HTMLElement,
    panelsLayer: HTMLElement | null,
    axis: 'x' | 'y',
    dir: 'open' | 'close',
    onComplete?: () => void,
  ) => {
    const ease = dir === 'open' ? 'power3.out' : 'power3.in';
    const prop = axis === 'x' ? 'xPercent' : 'yPercent';
    if (panelsLayer) {
      state.trackTween?.kill();
      state.trackTween = gsap.to(panelsLayer, {
        [prop]: dir === 'open' ? -100 : 0,
        duration: 0.6,
        ease,
        // Strip the inline transform once closed so the resting layer carries
        // no lingering translate (which would leave a stray stacking context).
        ...(dir === 'close' ? { clearProps: 'transform' } : {}),
      });
    }
    // fromTo (not set+to) so start/end are captured atomically in one tween —
    // a preceding set immediately followed by to left the open direction
    // rendering with no visible motion.
    if (dir === 'open') {
      gsap.fromTo(
        lane,
        { [prop]: 100, autoAlpha: 1 },
        { [prop]: 0, autoAlpha: 1, duration: 0.6, ease, overwrite: 'auto', onComplete },
      );
    } else {
      gsap.to(lane, { [prop]: 100, autoAlpha: 1, duration: 0.6, ease, overwrite: 'auto', onComplete });
    }
  };
```

- [ ] **Step 8: Route `openLane` through `laneMotion()`**

In `openLane`, replace the `if (isDesktopMotion()) { ... } else { lane.hidden = false; }` block (currently lines 230-266) with:

```ts
    const motion = laneMotion();
    if (motion === 'descend' || motion === 'slide') {
      const { gsap } = await import('gsap');
      // Drive the descent layer (panels), NOT the pinned [data-showcase] section
      // and NOT the scrubbed track (whose x the horizontal scrub owns).
      const panelsLayer = document.querySelector<HTMLElement>('[data-showcase-descent]');
      lane.hidden = false;
      gsap.killTweensOf(lane);
      slide(gsap, lane, panelsLayer, motion === 'slide' ? 'x' : 'y', 'open');

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
    }
```

Then change the overscroll-to-exit guard a few lines below from:

```ts
    if (isDesktopMotion() && scroller) {
```

to:

```ts
    if (laneMotion() === 'descend' && scroller) {
```

(The wheel-driven over-scroll gesture stays desktop-only; mobile uses native touch scroll and the Back/Next controls.)

- [ ] **Step 9: Route `closeLane` through `laneMotion()`**

In `closeLane`, replace the `if (lane && isDesktopMotion()) { ... } else { finish(); }` block (currently lines 349-362) with:

```ts
    const motion = laneMotion();
    if (lane && motion !== 'inline') {
      const { gsap } = await import('gsap');
      const panelsLayer = document.querySelector<HTMLElement>('[data-showcase-descent]');
      gsap.killTweensOf(lane);
      // Await the tween's completion (not just its kickoff) so callers that
      // `await closeLane()` before opening a different lane see state.openId
      // cleared before they proceed.
      await new Promise<void>((resolve) => {
        slide(gsap, lane, panelsLayer, motion === 'slide' ? 'x' : 'y', 'close', () => {
          finish();
          resolve();
        });
      });
    } else {
      finish();
    }
```

- [ ] **Step 10: Use `nextStationId` for the forward-release paths and remove `isDesktopMotion`**

In the `onClick` handler's `data-lane-next` branch (currently lines 370-379), replace the inline index math:

```ts
      if (state.openId) {
        const order = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'))
          .map((p) => p.dataset.showcasePanelId ?? '');
        void closeLane(nextStationId(order, state.openId) ?? undefined);
      }
```

Then delete the now-unused `isDesktopMotion` function definition (currently lines 138-141). Search the file to confirm no remaining references before deleting.

- [ ] **Step 11: Verify types and unit tests**

Run: `pnpm check`
Expected: PASS (no unused-symbol or type errors; confirm `isDesktopMotion` and `MOBILE_BREAKPOINT_PX` are fully removed if unreferenced).

Run: `pnpm test lanes`
Expected: PASS.

- [ ] **Step 12: Manual sanity check (optional, maintainer)**

`pnpm dev`:
- **Mobile (≤767px):** tapping Music/Videos/Classes slides the detail in from the right while the stack slides left; scroll the detail vertically; Back slides it out to the right and returns to the same station; the Next control at the detail's foot slides back and advances to the next station.
- **Desktop:** unchanged — detail still descends vertically; the wheel still pans horizontally.
- **Reduced-motion:** detail reveals inline with no slide.

- [ ] **Step 13: Commit**

```bash
git add src/lib/lanes.ts tests/unit/lanes.test.ts
git commit -m "feat: coordinated horizontal detail slide on mobile; drop debug logs"
```

---

### Task 5: Axis-aware arrows

Arrows must point in the direction of the motion they trigger, per breakpoint. On mobile: open-detail points right, Back points left, and the "next station" arrow still points down (that motion is vertical). The separator's `→` cue (horizontal progression) becomes a downward cue in the vertical mobile flow.

**Files:**
- Modify: `src/components/LaneArrow.astro` (append to `<style>`)
- Modify: `src/components/PanelSeparator.astro` (the `@media (max-width: 767px)` block, `.separator-arrows`)

**Interfaces:**
- Consumes: the existing `--rot` custom property that rotates the base right-pointing chevron in `LaneArrow.astro`; the `data-lane-next` attribute that marks the next-station variant.
- Produces: no JS/interface change — CSS only.

- [ ] **Step 1: Add the mobile axis rules to `LaneArrow.astro`**

Append inside the `<style>` block of `src/components/LaneArrow.astro` (before the closing `</style>`, after the reduced-motion block):

```css
  @media (max-width: 767px) {
    /* Mobile flips the detail axis: the detail slides in from the RIGHT, so the
       open-detail arrow points right and Back points left. The next-station
       arrow (data-lane-next) still advances vertically, so it stays down. */
    .lane-arrow--down:not([data-lane-next]) .arrow { --rot: 0deg; }
    .lane-arrow--up .arrow { --rot: 180deg; }
  }
```

- [ ] **Step 2: Point the separator arrows down on mobile**

In `src/components/PanelSeparator.astro`, inside the existing `@media (max-width: 767px)` block, replace the `.separator-arrows` rule (currently lines 159-165):

```css
    .separator-arrows {
      display: block;
      width: 96px;
      height: 56px;
      margin-top: 0.55rem;
      transform: none;
    }
```

with (rotate the whole cluster so the `→` cascade reads as a downward "keep scrolling" cue; the cluster is not itself animated, so rotating the container is safe — only its children animate `translateX` within the rotated frame):

```css
    .separator-arrows {
      display: block;
      width: 56px;
      height: 96px;
      margin-top: 0.75rem;
      transform-origin: center;
      transform: rotate(90deg);
    }
```

- [ ] **Step 3: Verify build**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Manual sanity check (optional, maintainer)**

`pnpm dev` at ≤767px: the detail-open arrow points right, Back points left, the per-station next arrow still points down, and the separator arrows point down. Fine-tune `.separator-arrows` `margin`/`transform-origin` if the rotated cluster sits awkwardly. On desktop the arrows are unchanged (down/up, `→`).

- [ ] **Step 5: Commit**

```bash
git add src/components/LaneArrow.astro src/components/PanelSeparator.astro
git commit -m "feat: axis-aware arrows (open=right, back=left, next=down) on mobile"
```

---

### Task 6: Per-block mobile content legibility

Ensure each panel reads as an intentional vertical mobile section. The one concrete code fix is `PanelMinimal`'s non-wrapping email (fragile fit formula); the rest is a verification checklist against the 375px viewport, applying small clamps only where something clips or overlaps.

**Files:**
- Modify: `src/components/PanelMinimal.astro` (mobile `<style>` block, `.contact-email`)
- Verify (edit only if a defect is found): `src/components/PanelAbout.astro`, `src/components/PanelHero.astro`, `src/components/PanelPhoto.astro`, `src/components/PanelCard.astro`, `src/components/PanelServices.astro`

**Interfaces:**
- Consumes: nothing new.
- Produces: no interface change.

- [ ] **Step 1: Make the contact email wrap on mobile**

In `src/components/PanelMinimal.astro`, inside its `@media (max-width: 767px)` block, add (or extend the existing `.contact-email` rule) so the email no longer depends on the fit-to-viewport formula to avoid clipping:

```css
    .contact-email {
      white-space: normal;
      overflow-wrap: anywhere;
    }
```

- [ ] **Step 2: Verify build**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Manual 375px legibility pass (maintainer)**

`pnpm dev` at 375px width, scroll the whole home stack and check each block. For each, the content must fit without horizontal overflow, headings must wrap (not clip), and no decorative element (wash, portrait, offset artifact) may overlap text:

- [ ] **Hero** — portrait, headline, subtitle, and signature stack legibly; no overlap.
- [ ] **About** — headline wraps and the body reads in order (it relies on `global.css` overrides today; if it looks squeezed, give it a real relative-flow mobile layout in `PanelAbout.astro` rather than leaning on `!important`).
- [ ] **Photo / Card / Services** — single-column reflow; image aspect intact; links wrap.
- [ ] **Minimal (contact)** — email wraps (Step 1); buttons ≥44px.
- [ ] **Separator** — left-aligned heading reads; arrows point down (Task 5).

If a block shows a real defect, fix it with a scoped `@media (max-width: 767px)` clamp/reflow in that component's `<style>`, then re-run `pnpm check`. If all blocks pass as-is, no further edits are needed. (Browser verification is maintainer-driven per the no-e2e constraint.)

- [ ] **Step 4: Commit**

```bash
git add src/components/PanelMinimal.astro
# plus any component fixed in Step 3
git commit -m "fix: mobile content legibility (contact email wrap + per-block audit)"
```

---

### Task 7: NowPlayingBar mobile layout + touch targets

The player packs 8 controls into one non-wrapping row with 32px targets. On mobile, let the bar wrap into rows and give the controls their own full-width wrapping row with ≥44px targets.

**Files:**
- Modify: `src/components/NowPlayingBar.astro` (add a class hook on the controls cluster; append mobile `<style>`)

**Interfaces:**
- Consumes: nothing new.
- Produces: a `.np-controls` class on the existing controls `<div>` for CSS targeting.

- [ ] **Step 1: Add a class hook to the controls cluster**

In `src/components/NowPlayingBar.astro`, change the controls wrapper (currently line 38) from:

```html
    <div class="flex shrink-0 items-center gap-1">
```

to:

```html
    <div class="np-controls flex shrink-0 items-center gap-1">
```

- [ ] **Step 2: Append the mobile layout to the `<style>` block**

Add before the closing `</style>` of `src/components/NowPlayingBar.astro`:

```css
  @media (max-width: 767px) {
    /* Let the bar wrap: row 1 = cover + title/seek, row 2 = controls. */
    #now-playing-bar > .mx-auto { flex-wrap: wrap; }
    /* Controls take their own full-width row and wrap centered, so they never
       overflow 375px regardless of how many (up to 8) are visible. */
    #now-playing-bar .np-controls {
      width: 100%;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.4rem;
    }
    /* ≥44px touch targets. */
    .np-btn { width: 2.75rem; height: 2.75rem; }
    .np-chip { height: 2.75rem; }
  }
```

- [ ] **Step 3: Verify build**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Manual sanity check (optional, maintainer)**

`pnpm dev` at 375px, start a track: the title + seek sit on the first row; the transport, chip, platform links, and close wrap onto a centered second row; every control is ≥44px and nothing overflows horizontally. Desktop layout unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/NowPlayingBar.astro
git commit -m "fix: mobile NowPlayingBar layout with wrapping rows + 44px targets"
```

---

### Task 8: LangToggle & AlbumStoryPlayer touch targets

Two small ≥44px touch-target bumps.

**Files:**
- Modify: `src/components/LangToggle.astro:106-110`
- Modify: `src/components/AlbumStoryPlayer.astro` (`.music-link` rule, ~line 218)

**Interfaces:**
- Consumes / Produces: none (CSS only).

- [ ] **Step 1: Bump the LangToggle mobile target**

In `src/components/LangToggle.astro`, replace the mobile block (lines 106-110):

```css
  @media (max-width: 767px) {
    .lang-toggle {
      min-height: 2.1rem;
    }
  }
```

with:

```css
  @media (max-width: 767px) {
    .lang-toggle {
      min-height: 2.75rem;
      padding: 0.35rem 0.7rem 0.35rem 0.4rem;
    }
  }
```

- [ ] **Step 2: Bump the music-link target**

In `src/components/AlbumStoryPlayer.astro`, add `min-height: 2.75rem;` to the `.music-link` rule (currently lines 218-228), so it reads:

```css
  .music-link {
    border: 1px solid rgba(244, 239, 231, 0.16);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    min-height: 2.75rem;
    padding: 0.7rem 0.95rem;
    transition: border-color 180ms ease, color 180ms ease, background 180ms ease;
  }
```

- [ ] **Step 3: Verify build**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/LangToggle.astro src/components/AlbumStoryPlayer.astro
git commit -m "fix: >=44px touch targets for LangToggle and music links"
```

---

### Task 9: Re-init on breakpoint crossing (robustness)

`Base.astro` decides desktop-vs-mobile once at load. Add a listener that tears down and re-runs the showcase/lane engines when the viewport crosses the 768px boundary (e.g. a tablet rotate or a desktop window resize), so a stale engine never lingers.

**Files:**
- Modify: `src/layouts/Base.astro` (the inline module script, around lines 108-127)

**Interfaces:**
- Consumes: the existing `run()` function (tears down `teardown[]` and re-inits `initScroll/initShowcase/initSignature/initLanes`).
- Produces: no new interface.

- [ ] **Step 1: Add the breakpoint listener**

In `src/layouts/Base.astro`, immediately after the existing `document.addEventListener('astro:page-load', run);` line (currently line 127), add:

```ts
      // Re-init when crossing the mobile/desktop boundary so a resize/rotate
      // never leaves a stale engine (desktop ScrollTrigger pin active on a phone
      // width, or vice versa). run() tears down the previous engines first.
      const breakpointMq = window.matchMedia('(max-width: 767px)');
      breakpointMq.addEventListener('change', () => { void run(); });
```

- [ ] **Step 2: Verify build**

Run: `pnpm check`
Expected: PASS.

Run: `pnpm test`
Expected: PASS (full suite).

- [ ] **Step 3: Manual sanity check (optional, maintainer)**

`pnpm dev`, resize the browser across 768px in both directions. The home page switches cleanly between the pinned horizontal lane (desktop) and the vertical stack (mobile) with no frozen pin, doubled scroll, or console errors. If a detail lane is open during the crossing, confirm it does not get stuck; if it does, close any open lane at the start of `run()`'s teardown (note for the implementer — only if observed).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat: re-init showcase/lanes on mobile/desktop breakpoint crossing"
```

---

## Self-Review

**Spec coverage** — every spec section maps to a task:
- Main lane → vertical stack; remove dead carousel → **Task 2** (+ carousel branch removal in **Task 4**).
- Detail → coordinated horizontal slide (X mirror of descent), Back + Next parity → **Task 3** (fixed layer) + **Task 4** (slide + Next via `nextStationId`).
- Axis-aware arrows (open=right, back=left, next=down; separator down) → **Task 5**.
- Per-block mobile content pass → **Task 6**.
- Component touch fixes: NowPlayingBar → **Task 7**; LangToggle + AlbumStoryPlayer → **Task 8**; PanelMinimal email → **Task 6**.
- Cleanup: remove `console.log` debug → **Task 4** (Step 7). Breakpoint re-init → **Task 9**.
- Reduced-motion inline + deep-link `initialDetail` + rapid open/close guards: preserved by routing through `laneMotion()` while keeping the existing `state.closing` / kill-stale-tween logic (**Task 4**).
- Testing: Vitest for pure logic (`viewport.ts` **Task 1**, `nextStationId` **Task 4**); no e2e per constraint.

**Placeholder scan** — no "TBD"/"handle edge cases"/"similar to Task N"; every code step shows the actual code. Task 6's per-block audit lists concrete, checkable items (not "make it responsive") and its one guaranteed edit (email wrap) has full code.

**Type consistency** — `laneMotion(): LaneMotion` with values `'descend' | 'slide' | 'inline'` used identically in Tasks 1 and 4; `initShowcaseMobile(panels)` single-arg signature defined in Task 2 and matched at the Task 2 call site; `nextStationId(orderedIds, currentId)` defined and consumed in Task 4; `slide(gsap, lane, panelsLayer, axis, dir, onComplete?)` replaces `descend` and is called with matching arity in `openLane`/`closeLane`.

**Ordering** — Task 1 (helpers) → Task 2 (adopt in showcase) → Task 3 (CSS fixed layer) → Task 4 (JS slide, depends on 1+3) → 5–9 independent polish. Each task ends green (`pnpm check` + relevant `pnpm test`) and is independently reviewable.
