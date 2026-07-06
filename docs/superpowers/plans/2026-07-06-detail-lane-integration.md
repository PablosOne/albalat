# Detail-Lane Integration & Descent Affordance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each detail station (music, videos, classes) advertise its detail lane with a visible descent affordance, fix the broken wheel/double-scrollbar inside open lanes, and make the descent feel like crossing a plucked guitar-string threshold.

**Architecture:** The home page is a GSAP-pinned horizontal "showcase"; three detail lanes are `position:fixed` slide-up overlays with their own vertical scroll. This plan (F) hands the wheel to the open lane by stopping Lenis + `data-lenis-prevent`, (A) single-sources the detail-station list, (B/C) renders a down-arrow + CTA button entry on each detail station, and (D) adds cross-string pluck motion. No change to the GSAP scrub mechanism.

**Tech Stack:** Astro 5, TypeScript, GSAP + ScrollTrigger, Lenis (smooth scroll), Vitest (unit), Playwright (e2e).

## Global Constraints

- Home navigation invariant: the wheel ALWAYS pans the main lane horizontally; vertical scroll happens ONLY inside an open detail lane. Never wire wheel-down to scroll the main lane vertically.
- Bilingual: every new UI string needs a key in BOTH `src/i18n/en.json` and `src/i18n/es.json` (validated by `pnpm check` → `scripts/check-i18n-keys.ts`). `useTranslations(locale)(key)` has NO interpolation — use `.replace('{station}', …)` at the call site.
- Respect `prefers-reduced-motion: reduce` and mobile (`max-width: 767px`): affordances degrade to static; the scroll fix (F) is desktop-Lenis-only.
- Commands: `pnpm check` (astro check + i18n keys), `pnpm test` (Vitest unit), `pnpm test:e2e` (Playwright).
- TDD: write the failing test first; commit after each green task.

---

### Task 1: Hand the wheel to an open detail lane (fix wheel + double scrollbar)

Highest-value change — without it the detail lane is unusable. Cause: Lenis hijacks the wheel globally and drives the horizontal pin behind the fixed overlay; nothing releases it on open, and the tall pinned `<body>` keeps its scrollbar alongside the detail's own.

**Files:**
- Modify: `src/components/DetailLane.astro:14` (add `data-lenis-prevent`)
- Modify: `src/lib/lanes.ts` (stop/start Lenis on open/close)
- Modify: `src/styles/global.css` (lock page scroll while a lane is open)
- Test: `tests/e2e/lanes.spec.ts` (append)

**Interfaces:**
- Consumes: `window.__lenis` — a `Lenis` instance with `.stop()` / `.start()`, set by `initScroll()` (absent on mobile/reduced-motion, where `initScroll` returns a no-op).
- Produces: while a lane is open, `document.documentElement` has attribute `data-open-lane` (already set by `openLane`) and computed `overflow-y: hidden`; the detail's `[data-detail-scroll]` container owns the wheel.

- [ ] **Step 1: Write the failing e2e tests**

Append to `tests/e2e/lanes.spec.ts`:

```ts
test('inside an open detail lane the wheel scrolls the detail, not the background', async ({ page }) => {
  await page.goto('/#music');
  const lane = page.locator('[data-detail-lane="music"]');
  await expect(lane).toBeVisible();
  const scroller = lane.locator('[data-detail-scroll]');
  const bgBefore = await page.evaluate(() => window.scrollY);
  const topBefore = await scroller.evaluate((el) => el.scrollTop);
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 400);
  await page.mouse.wheel(0, 400);
  // the detail content (album list) is taller than the viewport, so it scrolls:
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(topBefore + 10);
  // and the pinned background did NOT move while the lane owns the wheel:
  const bgAfter = await page.evaluate(() => window.scrollY);
  expect(Math.abs(bgAfter - bgBefore)).toBeLessThan(5);
});

test('an open detail lane hides the page scrollbar (no double scrollbar)', async ({ page }) => {
  await page.goto('/#music');
  await expect(page.locator('[data-detail-lane="music"]')).toBeVisible();
  const overflowY = await page.evaluate(() => getComputedStyle(document.documentElement).overflowY);
  expect(overflowY).toBe('hidden');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:e2e -- lanes.spec.ts -g "wheel scrolls the detail|hides the page scrollbar"`
Expected: FAIL — background moves (wheel not handed off) and `overflowY` is `auto`/`visible`.

- [ ] **Step 3: Add `data-lenis-prevent` to the detail scroll container**

In `src/components/DetailLane.astro`, line 14, add the attribute:

```astro
  <div class="detail-lane__scroll" data-detail-scroll data-lenis-prevent>
```

- [ ] **Step 4: Stop/start Lenis on open/close in `src/lib/lanes.ts`**

Add a module-scope helper near the top of the file (after the imports, before `laneIdFromHash`):

```ts
function getLenis(): Lenis | undefined {
  return (window as unknown as { __lenis?: Lenis }).__lenis;
}
```

In `openLane`, immediately after the existing `scrollToPanel(id);` / `pluckThreshold(id);` pair (currently around line 173), add:

```ts
    // Release the wheel to the detail's own scroll container: Lenis otherwise
    // keeps scrubbing the horizontal pin behind this fixed overlay.
    getLenis()?.stop();
```

In `closeLane`'s `finish()` (currently around line 217-226), insert a `getLenis()?.start();` line right BEFORE the final `scrollToPanel(id);`, so the re-align smooth-scroll runs again:

```ts
      state.openId = null;
      state.restoreFocus?.focus?.();
      getLenis()?.start();
      scrollToPanel(id); // re-align in case anything shifted
```

(`Lenis` is already imported as a type at the top of `lanes.ts`.)

- [ ] **Step 5: Lock the page scroll while a lane is open in `src/styles/global.css`**

Add this rule (place it near the other `[data-open-lane]` / detail-lane rules, or at the end of the file):

```css
/* While a detail lane owns the screen, remove the page's own scrollbar so it
   never doubles up with the detail's scrollbar. Lenis is stopped in lanes.ts,
   so nothing tries to scroll the page underneath. */
html[data-open-lane] {
  overflow: hidden;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test:e2e -- lanes.spec.ts`
Expected: PASS (all lane tests, including the two new ones).

If the wheel still does nothing, this needs live diagnosis (Lenis `stop()` vs `data-lenis-prevent` behavior) — use superpowers:systematic-debugging in a real browser (`pnpm dev`), confirming the detail scrolls and the background `window.scrollY` is frozen, before adjusting.

- [ ] **Step 7: Commit**

```bash
git add src/components/DetailLane.astro src/lib/lanes.ts src/styles/global.css tests/e2e/lanes.spec.ts
git commit -m "fix: hand the wheel to open detail lanes; remove double scrollbar"
```

---

### Task 2: Single-source the detail-station list

Replace the hardcoded `['music','videos','classes']` in `Showcase.astro` with a shared constant so `Panel.astro` (Task 3) and `Showcase.astro` agree on which stations have a detail.

**Files:**
- Modify: `src/lib/config.ts` (add constant + helper)
- Modify: `src/components/Showcase.astro:31` (use the constant)
- Test: `tests/unit/config.test.ts` (create)

**Interfaces:**
- Produces: `DETAIL_LANE_IDS: readonly ['music','videos','classes']`; `stationHasDetail(id: string): boolean`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DETAIL_LANE_IDS, stationHasDetail } from '@/lib/config';

describe('detail-lane station registry', () => {
  it('lists the three detail stations', () => {
    expect([...DETAIL_LANE_IDS]).toEqual(['music', 'videos', 'classes']);
  });

  it('stationHasDetail is true for detail stations and false otherwise', () => {
    expect(stationHasDetail('music')).toBe(true);
    expect(stationHasDetail('videos')).toBe(true);
    expect(stationHasDetail('classes')).toBe(true);
    expect(stationHasDetail('about')).toBe(false);
    expect(stationHasDetail('hero')).toBe(false);
    expect(stationHasDetail('contact')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- config.test.ts`
Expected: FAIL — `DETAIL_LANE_IDS`/`stationHasDetail` not exported.

- [ ] **Step 3: Add the constant + helper to `src/lib/config.ts`**

Append to `src/lib/config.ts`:

```ts
/** Stations that have a detail lane hanging below them (single source of truth,
 *  used by Showcase.astro to render <DetailLane> and Panel.astro to render the
 *  descent affordance). */
export const DETAIL_LANE_IDS = ['music', 'videos', 'classes'] as const;
export type DetailLaneId = (typeof DETAIL_LANE_IDS)[number];
export function stationHasDetail(id: string): boolean {
  return (DETAIL_LANE_IDS as readonly string[]).includes(id);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- config.test.ts`
Expected: PASS.

- [ ] **Step 5: Use the constant in `src/components/Showcase.astro`**

Add to the frontmatter imports (top of `Showcase.astro`):

```ts
import { DETAIL_LANE_IDS } from '@/lib/config';
```

Replace line 31 `{['music', 'videos', 'classes'].map((id) => (` with:

```astro
  {DETAIL_LANE_IDS.map((id) => (
```

- [ ] **Step 6: Verify the build still type-checks**

Run: `pnpm check`
Expected: PASS (no type errors, i18n keys in sync).

- [ ] **Step 7: Commit**

```bash
git add src/lib/config.ts src/components/Showcase.astro tests/unit/config.test.ts
git commit -m "refactor: single-source detail-lane station ids"
```

---

### Task 3: Render the descent affordance on each detail station

Render the animated triple-chevron + pluckable string (`LaneArrow direction="down"`) at the bottom-center of every station that has a detail. `initSignature()` auto-attaches string physics to the `svg[data-string]`; `lanes.ts onClick` already opens the lane for `[data-lane-open]`.

**Files:**
- Modify: `src/i18n/en.json`, `src/i18n/es.json` (add `a11y.openDetail`)
- Modify: `src/components/Showcase.astro:29` (pass `locale` to `Panel`)
- Modify: `src/components/Panel.astro` (props + render the arrow + scoped style)
- Test: `tests/e2e/lanes.spec.ts` (append)

**Interfaces:**
- Consumes: `stationHasDetail(id)` (Task 2); `LaneArrow` component (`direction`, `targetId`, `label`, `withString`).
- Produces: on a detail station's `<article data-showcase-panel>`, a descendant `a.lane-arrow.lane-arrow--down[data-lane-open="<id>"]` containing `svg[data-string]`.

- [ ] **Step 1: Write the failing e2e test**

Append to `tests/e2e/lanes.spec.ts`:

```ts
test('a detail station shows a descent arrow that opens its lane', async ({ page }) => {
  await page.goto('/');
  const arrow = page.locator('[data-showcase-panel-id="music"] a.lane-arrow--down[data-lane-open="music"]');
  await expect(arrow).toBeVisible();
  await expect(arrow.locator('svg[data-string]')).toHaveCount(1);
  await arrow.click();
  await expect(page.locator('[data-detail-lane="music"]')).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:e2e -- lanes.spec.ts -g "descent arrow"`
Expected: FAIL — no `.lane-arrow--down` inside the music panel.

- [ ] **Step 3: Add the i18n label key to both locales**

In `src/i18n/en.json`, extend the `a11y` object:

```json
  "a11y": { "skipToContent": "Skip to content", "toggleLang": "Español", "openDetail": "Open {station} details" }
```

In `src/i18n/es.json`, extend the `a11y` object:

```json
  "a11y": { "skipToContent": "Saltar al contenido", "toggleLang": "English", "openDetail": "Ver detalles de {station}" }
```

- [ ] **Step 4: Pass `locale` from `Showcase.astro` to `Panel.astro`**

In `src/components/Showcase.astro`, line 29, change:

```astro
    {panels.map((panel, i) => <Panel panel={panel} isLast={i === panels.length - 1} />)}
```

to:

```astro
    {panels.map((panel, i) => <Panel panel={panel} locale={locale} isLast={i === panels.length - 1} />)}
```

- [ ] **Step 5: Render the arrow in `src/components/Panel.astro`**

In the frontmatter of `src/components/Panel.astro`, add imports and the `locale` prop. Update the imports block (add these lines):

```ts
import LaneArrow from './LaneArrow.astro';
import { stationHasDetail } from '@/lib/config';
import { useTranslations } from '@/i18n';
import type { HomeLocale } from '@/data/site';
```

Change the `Props` interface and destructure to include `locale`:

```ts
interface Props {
  panel: PanelType;
  locale: HomeLocale;
  isLast?: boolean;
}

const { panel, locale, isLast = false } = Astro.props;
```

Just before the closing `---` of the frontmatter, compute the affordance label:

```ts
const hasDetail = stationHasDetail(panel.id);
const t = useTranslations(locale);
const stationName = (panel.heading ?? panel.id).replace(/[.·]+\s*$/, '').trim();
const detailLabel = t('a11y.openDetail').replace('{station}', stationName);
```

Inside the `<article>` (after the existing `gfdu-mobile-next` button block, before `</article>`), add:

```astro
  {hasDetail && (
    <div class="panel-descent">
      <LaneArrow direction="down" targetId={panel.id} label={detailLabel} withString />
    </div>
  )}
```

Add a scoped `<style>` block at the end of `Panel.astro` (after the existing `<script>`):

```astro
<style>
  .panel-descent {
    position: absolute;
    left: 50%;
    bottom: clamp(1.5rem, 5vh, 3.5rem);
    transform: translateX(-50%);
    z-index: 20;
  }
  /* Mobile keeps the gfdu-mobile-next affordance for panel-to-panel movement;
     the CTA button (Task 4) is the mobile entry into a detail. */
  @media (max-width: 767px) {
    .panel-descent { display: none; }
  }
</style>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test:e2e -- lanes.spec.ts -g "descent arrow"`
Expected: PASS.

- [ ] **Step 7: Verify i18n + types**

Run: `pnpm check`
Expected: PASS (both locales have `a11y.openDetail`).

- [ ] **Step 8: Commit**

```bash
git add src/i18n/en.json src/i18n/es.json src/components/Showcase.astro src/components/Panel.astro tests/e2e/lanes.spec.ts
git commit -m "feat: render descent arrow + string threshold on detail stations"
```

---

### Task 4: Promote the self-referential CTA to a descent button

On music/videos (`PanelPhoto`) and classes (`PanelServices`), the link pointing at the station's own hash (`#music` etc.) becomes a prominent pill button with a ↓ glyph instead of a small right-pointing text link. Secondary links (Spotify/YouTube/Email) stay unchanged.

**Files:**
- Modify: `src/components/PanelPhoto.astro:27-43` (link map)
- Modify: `src/components/PanelServices.astro:36-52` (link map)
- Modify: `src/styles/global.css` (add `.panel-cta-button`)
- Test: `tests/e2e/lanes.spec.ts` (append)

**Interfaces:**
- Consumes: `panel.id`, `panel.links` (each `{ label, href }`).
- Produces: for the link whose `href === '#' + panel.id`, an `a.panel-cta-button[data-lane-open="<id>"]`.

- [ ] **Step 1: Write the failing e2e test**

Append to `tests/e2e/lanes.spec.ts`:

```ts
test('the detail-station CTA renders as a descent button and opens the lane', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('[data-showcase-panel-id="videos"] a.panel-cta-button[href="#videos"]');
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page.locator('[data-detail-lane="videos"]')).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:e2e -- lanes.spec.ts -g "descent button"`
Expected: FAIL — no `a.panel-cta-button`.

- [ ] **Step 3: Update the link map in `src/components/PanelPhoto.astro`**

Replace the links block (currently lines 27-43) with:

```astro
    {panel.links && (
      <div class="mt-8 flex flex-wrap items-center gap-5 text-label">
        {panel.links.map((link) => (
          link.href === `#${panel.id}` ? (
            <a
              href={link.href}
              data-lane-open={panel.id}
              class="panel-cta-button"
              data-reveal="cta"
              data-text-reveal="block"
              data-text-reveal-preset="label"
            >
              {link.label} <span aria-hidden="true">&#8595;</span>
            </a>
          ) : (
            <a
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              class="underline decoration-1 underline-offset-4 hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-sm"
              data-reveal="cta"
              data-text-reveal="block"
              data-text-reveal-preset="label"
            >
              {link.label} -&gt;
            </a>
          )
        ))}
      </div>
    )}
```

- [ ] **Step 4: Update the link map in `src/components/PanelServices.astro`**

Replace the links block (currently lines 36-52) with the same conditional (note the wrapper keeps its `services-links` class):

```astro
    {panel.links && (
      <div class="services-links mt-12 flex flex-wrap items-center gap-6 text-label">
        {panel.links.map((link) => (
          link.href === `#${panel.id}` ? (
            <a
              href={link.href}
              data-lane-open={panel.id}
              class="panel-cta-button"
              data-reveal="cta"
              data-text-reveal="block"
              data-text-reveal-preset="label"
            >
              {link.label} <span aria-hidden="true">&#8595;</span>
            </a>
          ) : (
            <a
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              class="underline decoration-1 underline-offset-4 hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-sm"
              data-reveal="cta"
              data-text-reveal="block"
              data-text-reveal-preset="label"
            >
              {link.label} -&gt;
            </a>
          )
        ))}
      </div>
    )}
```

- [ ] **Step 5: Add the button style to `src/styles/global.css`**

Add (near the other component styles):

```css
/* Primary "descend into detail" call-to-action on a detail station. */
.panel-cta-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.25rem;
  border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
  border-radius: 9999px;
  color: var(--color-accent);
  text-decoration: none;
  line-height: 1;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.panel-cta-button:hover {
  background: var(--color-accent);
  color: var(--color-bg);
  border-color: var(--color-accent);
}
.panel-cta-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
.panel-cta-button span { transition: transform 0.2s ease; }
.panel-cta-button:hover span { transform: translateY(2px); }
@media (prefers-reduced-motion: reduce) {
  .panel-cta-button, .panel-cta-button span { transition: none; }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test:e2e -- lanes.spec.ts -g "descent button"`
Expected: PASS.

- [ ] **Step 7: Confirm the existing music-link test still passes**

Run: `pnpm test:e2e -- lanes.spec.ts`
Expected: PASS — the `a[href="#music"]` in the existing "clicking a panel's music link" test now also carries `.panel-cta-button`/`data-lane-open`, and still opens the lane.

- [ ] **Step 8: Commit**

```bash
git add src/components/PanelPhoto.astro src/components/PanelServices.astro src/styles/global.css tests/e2e/lanes.spec.ts
git commit -m "feat: promote detail-station CTA to a descent button"
```

---

### Task 5: Cross-the-string descent motion

Make the panel's down-string and the detail's up-string the SAME crossed threshold: give the up-arrow a string, let external code fire a real pluck via a `pluck` CustomEvent, pluck both strings on enter AND exit, and dim the showcase behind the rising detail.

**Files:**
- Modify: `src/lib/laneString.ts` (add `pluck` CustomEvent listener)
- Test: `tests/unit/laneString.test.ts` (append)
- Modify: `src/components/LaneArrow.astro` (render string in the `up` variant too)
- Modify: `src/components/DetailLane.astro:16` (up-arrow gets `withString`)
- Modify: `src/lib/lanes.ts` (`pluckThreshold` via CustomEvent on both strings; pluck on close)
- Modify: `src/styles/global.css` (dim the showcase while a lane is open)
- Test: `tests/e2e/lanes.spec.ts` (append)

**Interfaces:**
- Consumes: `attachString(svg)` returning a handle whose `pluck(strength?)` raises amplitude.
- Produces: dispatching `new CustomEvent('pluck', { detail: <number> })` on an `svg[data-string]` plucks it. Detail lane header contains an `svg[data-string]`.

- [ ] **Step 1: Write the failing unit test**

Append to `tests/unit/laneString.test.ts` (inside the `describe`):

```ts
  it('responds to a "pluck" CustomEvent by raising amplitude', () => {
    const svg = makeSvg();
    const handle = attachString(svg, { pointCount: 40 });
    const line = svg.querySelector('[data-string-line]')!;
    const flatMidY = line.getAttribute('points')!.trim().split(/\s+/)[20].split(',')[1];
    svg.dispatchEvent(new CustomEvent('pluck', { detail: 20 }));
    handle.tickForTest();
    const pluckedMidY = line.getAttribute('points')!.trim().split(/\s+/)[20].split(',')[1];
    expect(pluckedMidY).not.toEqual(flatMidY);
    handle.destroy();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- laneString.test.ts -t "pluck.*CustomEvent"`
Expected: FAIL — the CustomEvent does nothing (no listener), so mid-Y is unchanged.

- [ ] **Step 3: Add the `pluck` CustomEvent listener in `src/lib/laneString.ts`**

Refactor the pluck logic out of the return object so the listener and the public API share it. Replace the tail of `attachString` (the `enter`/`leave` listeners through the `return { … }`) with:

```ts
  const pluck = (strength = pluckDefault) => {
    if (!reduced) state.impulse = Math.max(state.impulse, strength);
  };

  const enter = () => { state.hovered = true; };
  const leave = () => { state.hovered = false; };
  const onPluck = (e: Event) => {
    const s = (e as CustomEvent<number>).detail;
    pluck(typeof s === 'number' ? s : undefined);
  };
  svg.addEventListener('pointerenter', enter);
  svg.addEventListener('pointerleave', leave);
  svg.addEventListener('pluck', onPluck as EventListener);

  let rafId = 0;
  const loop = () => { step(); rafId = requestAnimationFrame(loop); };
  const reduced = prefersReduced();
  if (!reduced && typeof requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(loop);
  }
  write(); // initial flat line

  return {
    pluck,
    setVelocitySource(fn) { velocitySource = fn; },
    tickForTest() { step(); },
    destroy() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      svg.removeEventListener('pointerenter', enter);
      svg.removeEventListener('pointerleave', leave);
      svg.removeEventListener('pluck', onPluck as EventListener);
    },
  };
```

Note: `const reduced` is referenced inside `pluck` but declared below it. Move the `const reduced = prefersReduced();` line up to just before `const pluck = …` so `pluck` closes over an initialized value:

```ts
  const reduced = prefersReduced();
  const pluck = (strength = pluckDefault) => {
    if (!reduced) state.impulse = Math.max(state.impulse, strength);
  };
```

and delete the later duplicate `const reduced = prefersReduced();`.

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `pnpm test -- laneString.test.ts`
Expected: PASS (all three original tests + the new one).

- [ ] **Step 5: Render the string in the `up` variant of `src/components/LaneArrow.astro`**

The string SVG is currently only in the `down` branch. Add it to the `up` (button) branch too, above the chevrons. Replace the `up` branch (currently lines 31-42) with:

```astro
) : (
  <button type="button" class="lane-arrow lane-arrow--up group" data-lane-close aria-label={label}>
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
  </button>
)}
```

- [ ] **Step 6: Give the detail's up-arrow a string in `src/components/DetailLane.astro`**

Line 16, change:

```astro
      <LaneArrow direction="up" label={back} />
```

to:

```astro
      <LaneArrow direction="up" label={back} withString />
```

- [ ] **Step 7: Pluck both strings on enter/exit in `src/lib/lanes.ts`**

Replace the existing `pluckThreshold` helper (currently lines 148-153) with a version that fires a real pluck on BOTH the panel's down-string and the detail's up-string:

```ts
  const pluckThreshold = (id: string) => {
    const strength = 24;
    const fire = (svg: SVGSVGElement | null | undefined) =>
      svg?.dispatchEvent(new CustomEvent('pluck', { detail: strength }));
    // the down-string on the station's descent arrow:
    fire(document.querySelector<SVGSVGElement>(`[data-lane-open="${CSS.escape(id)}"] svg[data-string]`));
    // the up-string at the top of the detail lane (same threshold, crossed):
    fire(laneEl(id)?.querySelector<SVGSVGElement>('svg[data-string]'));
  };
```

`openLane` already calls `pluckThreshold(id)`. Add the same call to `closeLane`, right after `const lane = laneEl(id);` (so the exit re-plucks the crossed threshold):

```ts
    const lane = laneEl(id);
    pluckThreshold(id);
```

- [ ] **Step 8: Dim the showcase behind an open lane in `src/styles/global.css`**

Add:

```css
/* Recede the main lane behind a rising detail. filter (not transform) so it
   never fights ScrollTrigger's pin transforms. */
html[data-open-lane] [data-showcase] {
  filter: brightness(0.6);
}
[data-showcase] {
  transition: filter 0.5s ease;
}
@media (prefers-reduced-motion: reduce) {
  [data-showcase] { transition: none; }
}
```

- [ ] **Step 9: Write + run the e2e assertion for the crossed threshold**

Append to `tests/e2e/lanes.spec.ts`:

```ts
test('the detail lane header carries a threshold string', async ({ page }) => {
  await page.goto('/#music');
  await expect(page.locator('[data-detail-lane="music"] .detail-lane__header svg[data-string]')).toHaveCount(1);
});
```

Run: `pnpm test:e2e -- lanes.spec.ts -g "threshold string"`
Expected: PASS.

- [ ] **Step 10: Full check + commit**

Run: `pnpm check && pnpm test && pnpm test:e2e -- lanes.spec.ts`
Expected: all PASS.

```bash
git add src/lib/laneString.ts tests/unit/laneString.test.ts src/components/LaneArrow.astro src/components/DetailLane.astro src/lib/lanes.ts src/styles/global.css tests/e2e/lanes.spec.ts
git commit -m "feat: cross-the-string pluck on lane enter/exit; dim main lane behind detail"
```

---

### Task 6: Full-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Run the entire test suite**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: all PASS. If any pre-existing e2e (e.g. `videos.spec.ts`, `stage.spec.ts`) breaks because it depended on the old right-pointing text link, update the selector to the new `.panel-cta-button` / `[data-lane-open]` and re-run.

- [ ] **Step 2: Manual browser smoke (superpowers:verification-before-completion)**

Run `pnpm dev`, then on `/`:
- Pan to the music station; confirm the descent arrow + string threshold is visible and the CTA reads as a button with ↓.
- Click either → the detail slides up, both strings pluck, the main lane dims.
- Wheel inside the detail → the detail scrolls; the background does not; exactly one scrollbar.
- Up-arrow / `Esc` → returns to the same station and horizontal position; main lane un-dims.
- Repeat for videos and classes.
- Toggle `prefers-reduced-motion` → arrows/CTA static, lane still opens/closes and scrolls.

- [ ] **Step 3: Commit any test-selector fixups from Step 1**

```bash
git add -A
git commit -m "test: update lane e2e selectors for the new descent affordance"
```

---

## Notes for the implementer

- The horizontal-wheel invariant is sacred — never wire wheel-down to vertical main-lane scroll (see `CLAUDE.md`).
- If Task 1's wheel handoff doesn't work first try, it is almost certainly Lenis still preventing default on the wheel; confirm live with systematic-debugging before changing the approach. `data-lenis-prevent` (Lenis's documented opt-out) plus `lenis.stop()` is the intended combination.
- Panels render horizontally off-screen; Playwright `.click()` auto-scrolls them into view via the pin (the existing `#music` link test relies on this), so clicking a music/videos element is fine.
