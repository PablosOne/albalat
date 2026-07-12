# Mobile-responsive navigation & content — design

**Date:** 2026-07-12
**Status:** Draft for review
**Scope:** Home showcase mobile redesign + full-site responsive audit fixes

## Problem

The home page (`/`, `/en/`) is a horizontal "main lane": on desktop the mouse
wheel pans stations horizontally, and some stations open a "detail lane" that
descends vertically. This desktop model is correct and stays untouched.

On mobile the experience is broken and self-contradictory:

1. **A dead horizontal-carousel code path.** `showcase.ts` dispatches normal
   phones to `initShowcaseMobile(..., 'carousel')`, which sets the track to a
   horizontal scroll-snap row. But `global.css`'s `@media (max-width: 767px)`
   block forces the track to a vertical column with `!important`, so the
   carousel's inline styles are overridden. The result: mobile is *already*
   vertical, but there are two contradictory systems fighting, and the carousel
   code is confusing dead weight.

2. **Detail lanes are unreachable/orphaned on mobile.** The rich content for
   music/videos/classes lives in `DetailLane` sections rendered as siblings
   after the panel track (`Showcase.astro`). On mobile, `openLane` merely
   unhides them and CSS makes them `position: relative` inline, so they render
   at the very bottom of the page (below Contact), with no in-context way to
   reach them. The `/music`, `/videos`, `/classes` routes are just
   `<Showcase initialDetail="…">`, so they inherit the same broken behavior.

3. **Arrows point the wrong way for the mobile flow.** The detail-open /
   back / next affordances (`LaneArrow`) and the separator `→` cues assume the
   desktop axes (down = open detail, → = horizontal progression). In a vertical
   mobile flow with a horizontal detail slide, several of these point the wrong
   direction.

4. **Per-block content is a squeezed desktop layout, not a mobile design.**
   Several panels (notably Hero and About) only survive mobile because
   `global.css` force-overrides their absolute/`nowrap` desktop positioning.
   Each block needs a deliberate mobile content pass so it *reads* as a vertical
   mobile section.

5. **Component-level touch issues.** `NowPlayingBar` packs 8 controls into one
   non-wrapping row with 32px tap targets; `LangToggle` (~33px),
   `AlbumStoryPlayer` music links (~40px), and `PanelMinimal`'s `nowrap` email
   (fragile fit formula) are below-par on touch.

6. **Debug noise.** `lanes.ts` `descend()` contains leftover `console.log`
   statements.

## Guiding model

**Desktop and mobile are the same spatial language, rotated 90°.**

| | Browse stations | Open detail | Close detail |
|---|---|---|---|
| **Desktop** | horizontal (wheel pans X) | descend (detail rises from below, stack slides up) | ascend |
| **Mobile** | vertical (native scroll) | slide right (detail enters from the right, stack slides left) | slide back |

Mobile detail motion is the **X-axis mirror of the existing desktop
coordinated descent** — we reuse the structure of `descend()` in `lanes.ts`,
translating on X instead of Y.

## Design

### 1. Main lane: one true vertical stack

- **`showcase.mobile.ts`**: remove the `carousel` mode entirely. The module
  keeps only the `stack` behavior: IntersectionObserver-driven reveals and
  halo/`data-active-mobile` gating. No inline flex-direction/scroll-snap
  juggling (global.css owns the column layout).
- **`showcase.ts`**: mobile and reduced-motion both call the simplified
  `initShowcaseMobile(track, panels)` (no mode argument).
- **`lanes.ts`** `panelScrollY` / `getCurrentPanelIndex`: delete the
  mobile-carousel branches that call `scrollContainer.scrollTo({ left })`.
  Mobile uses the vertical `absoluteTop(panel)` path (already present for
  reduced-motion).
- Result: a single, legible mobile code path. Native vertical scroll through
  stations, per-panel down-arrow to advance (already implemented via
  `.gfdu-mobile-next` in `Panel.astro`).

### 2. Detail: coordinated horizontal slide

New mobile branch in `lanes.ts` `openLane` / `closeLane`, parallel to the
existing `isDesktopMotion()` branch:

- The detail lane becomes a **fixed, full-viewport layer** on mobile (like
  desktop), starting off-screen to the right (`translateX(100%)`).
- **Open**: slide the detail `100% → 0` from the right while the panel stack
  layer (`[data-showcase-descent]`) slides `0 → -100%` on **X** (off to the
  left) — coordinated, mirroring the Y-axis `descend()`. This is a new
  `slideX()` helper (or a parameterized `descend(axis)`); reuse the same
  kill-stale-tween / atomic `fromTo` discipline that fixed the
  descent-only-works-once bug.
- **Vertical scroll inside** the detail (unchanged `detail-lane__scroll`).
- **Back**: reverse — detail slides right `0 → 100%`, stack slides back
  `-100% → 0`, re-aligning the originating station.
- **Next** (bottom of detail): slide back, then advance to the next station in
  the vertical stack (parity with the desktop `data-lane-next` release-forward).
- Preserve/restore the stack's vertical scroll position across open/close so
  Back lands on the same station the user left from.
- **Reduced-motion**: no slide — the detail is revealed as an inline vertical
  section in the stack (current behavior), so nothing depends on animation.

**DOM/CSS changes:**
- `DetailLane.astro` + `global.css`: on mobile (non-reduced-motion) the detail
  is `position: fixed; inset: 0` and transform-driven, **not** the current
  inline `position: relative` at page bottom. Reduced-motion keeps the inline
  treatment.
- Ensure the detail layer sits above the nav and stack (z-index), and that its
  internal scroll uses `100dvh` / `overscroll-behavior: contain` (already the
  case).

### 3. Axis-aware arrows

Every arrow points in the direction of the motion it triggers, per breakpoint.

- **`LaneArrow`**: introduce a mobile axis so the base right-pointing chevron is
  rotated correctly:
  - Detail-open ("down" on desktop) → **right** (0°) on mobile — the detail
    enters from the right.
  - Back ("up" on desktop) → **left** (180°) on mobile.
  - Next: points in the direction its motion begins (the slide-back), decided
    during implementation; default to a forward/right cue that resolves to the
    next station.
- **`.gfdu-mobile-next`** (scroll to next station): stays **down** — that motion
  is vertical on mobile. No change.
- **`PanelSeparator`** arrows (`→`): the horizontal-progression cue is
  misleading in a vertical mobile flow. On mobile, switch the separator arrows
  to a **downward** cue (rotate/replace), consistent with vertical stacking.
  Desktop keeps `→`.

Implementation: drive rotation from a CSS custom property that a
`@media (max-width: 767px)` block overrides, so the same SVG serves both axes
(the chevron already rotates via `--rot`).

### 4. Per-block mobile content pass

Review each panel variant so it reads as an intentional vertical mobile
section, not a shrunk desktop layout. Concretely:

- **PanelHero**: verify the foreground portrait, headline, and signature stack
  legibly at 375px (it already has a mobile block — confirm no overlap/clipping
  and that the signature/subtitle don't collide).
- **PanelAbout**: currently absolute + `nowrap` + `clip-path`, salvaged only by
  global.css overrides. Give it a real mobile layout (relative flow, wrapping
  headline, sensible order) rather than relying on `!important` rescues.
- **PanelSeparator**: mobile font clamp exists; adjust arrow direction (see §3)
  and confirm left-aligned text reads well.
- **PanelPhoto / PanelCard / PanelServices / PanelMinimal**: confirm single-
  column reflow, image aspect, and that no decorative element overflows;
  fix PanelMinimal's `nowrap` email fragility (allow wrap/`overflow-wrap` on
  mobile rather than depending on the fit formula).
- Hide or downscale purely-decorative desktop-only elements (parallax washes,
  large offset artifacts) where they add noise on mobile.

This pass is scoped to *fit and legibility*, not a visual rebrand — match the
existing design language.

### 5. Component touch fixes

- **NowPlayingBar** (*priority*): mobile layout — wrap controls into two rows or
  reduce to essential controls (prev / play-pause / next / close) with the
  platform links + full-track chip on a second row; bump `.np-btn` to ≥44px
  touch targets. Keep bottom-fixed + safe-area padding.
- **LangToggle**: raise touch target to ≥44px.
- **AlbumStoryPlayer**: music-platform links to ≥44px.
- **PanelMinimal**: email wrapping on mobile (see §4).

### 6. Cleanup & robustness

- Remove the `console.log` debug statements from `lanes.ts` `descend()`.
- **Breakpoint re-init**: `Base.astro` decides desktop-vs-mobile once at load.
  Add a `matchMedia('(max-width: 767px)')` change listener that tears down and
  re-runs `initShowcase` / `initLanes` when crossing 768px, so a rotate/resize
  doesn't leave a stale engine. (Nice-to-have; can be deferred if it risks
  destabilizing the load sequence — call out in the plan.)

## Components & interfaces (what changes)

| File | Change |
|---|---|
| `src/lib/showcase.mobile.ts` | Drop `carousel`; keep IO reveals/halo only; simplify signature |
| `src/lib/showcase.ts` | Call simplified mobile init (no mode arg) |
| `src/lib/lanes.ts` | Mobile horizontal open/close (`slideX`); remove carousel scroll branches; remove `console.log` |
| `src/components/DetailLane.astro` | Mobile = fixed sliding layer (non-reduced-motion) |
| `src/styles/global.css` | Mobile detail-layer positioning; separator arrow direction; per-block tweaks |
| `src/components/LaneArrow.astro` | Axis-aware rotation (mobile = right/left) |
| `src/components/PanelSeparator.astro` | Mobile downward arrow cue |
| `src/components/PanelAbout.astro` | Real mobile layout (drop reliance on `!important` rescues) |
| `src/components/PanelHero.astro` | Confirm/adjust mobile stack legibility |
| `src/components/PanelMinimal.astro` | Mobile email wrapping |
| `src/components/NowPlayingBar.astro` | Mobile control layout + ≥44px targets |
| `src/components/LangToggle.astro` | ≥44px target |
| `src/components/AlbumStoryPlayer.astro` | ≥44px music links |
| `src/layouts/Base.astro` | Breakpoint re-init listener (nice-to-have) |

## Data flow (mobile detail open)

1. User taps a station's detail arrow (`[data-lane-open="music"]`) or a nav
   `#music` link.
2. `lanes.ts` `onClick` → `hasDetailLane('music')` → `openLane('music')`.
3. Mobile branch: record stack scroll position; set detail layer to
   `translateX(100%)`, `hidden=false`; animate detail `→ 0` and descent layer
   `→ -100%` (X) in lockstep; focus the detail scroll container.
4. User scrolls the detail vertically.
5. Back → reverse slide, restore stack scroll, re-align station.
   Next → reverse slide, then vertical-scroll to the next station.

## Error handling / edge cases

- **Reduced-motion**: no horizontal slide; detail is inline in the vertical
  stack (existing behavior preserved).
- **Deep links / `initialDetail`** (`/music` etc.): on mobile, auto-open must
  place the detail as the fixed layer with the stack already positioned at the
  originating station, not orphaned at page bottom.
- **Rapid open/close/back**: keep the existing re-entry guards
  (`state.closing`, kill-stale-tween) that fixed the desktop "back doesn't
  work" bug; apply the same discipline to the X-axis slide.
- **Resize across 768px mid-open**: close any open lane and re-init cleanly.

## Testing

- **Vitest (unit)**: lane open/close state machine on mobile —
  `resolveInitialDetail`, `hasDetailLane`, and the open→back→next transitions
  (mock `matchMedia` for mobile). Assert scroll-position save/restore and that
  no stale listeners remain after close.
- **`pnpm check`**: astro + i18n key validation must pass.
- **Browser/Playwright**: not added unless requested (per standing preference).

## Out of scope

- Any change to the desktop pinned-lane behavior or feel.
- Visual rebrand of panels beyond mobile fit/legibility.
- 404 pages (already fine and independent).

## Open decisions (resolved)

- Detail motion on mobile: **coordinated slide** (stack moves left as detail
  enters from right). ✓
- Detail exit: **Back + Next** (desktop parity). ✓
- Scope: **home showcase + full responsive audit**. ✓
