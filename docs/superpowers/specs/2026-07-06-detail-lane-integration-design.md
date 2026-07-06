# Detail-Lane Integration & Descent Affordance — Design

**Date:** 2026-07-06
**Status:** Approved
**Builds on:** `2026-07-05-cross-scroll-navigation-design.md` (the cross-scroll model
this repairs)

## Problem

The cross-scroll engine works (horizontal main lane; three slide-up detail lanes:
`music`, `videos`, `classes`), but the *entry into* a detail is undiscoverable and
the detail lane itself is partly broken:

1. **No descent affordance is rendered.** `LaneArrow` has a designed `direction="down"`
   variant (animated triple-chevron on a pluckable guitar-string threshold), and
   `lanes.ts` already anticipates it (`pluckThreshold` targets
   `[data-lane-open="${id}"] svg[data-string]`), and `initSignature()` already
   auto-attaches string physics to any `svg[data-string]`. But the down-arrow is
   **never rendered** — dead code. Only the `up` variant (inside `DetailLane`) is used.
2. **The only desktop entry is a weak text link.** On a detail station the entry is a
   small underlined `Open music →` link sitting next to `Spotify`, pointing *right* —
   contradicting the "detail is *below* you" spatial model. Continuing to scroll music
   just keeps panning the lane right with no cue that a detail hangs below.
3. **The detail lane is unusable once open (desktop).** Lenis (global smooth-scroll)
   keeps hijacking the wheel and scrubbing the horizontal pin behind the fixed overlay,
   so the detail's own `overflow-y:auto` container never receives the wheel — **wheel
   does nothing** — and the tall pinned `<body>` scrollbar shows alongside the detail's
   own scrollbar — **two scrollbars**.
4. **The overlay reads as disconnected** — a full-screen `position:fixed` takeover with
   no spatial tie to the station it belongs to.

## Goal

Make "there is a detail below this station" obvious, make the descent feel like crossing
a threshold, and make the detail lane actually scroll — all while preserving the
horizontal-wheel invariant (wheel always pans the main lane horizontally; vertical
scrolling happens *only* inside an open detail lane).

## Non-goals

- No change to the GSAP pinned horizontal scrub mechanism.
- No redesign of detail *content* components (`AlbumStoryPlayer`, `VideoGallery`,
  `ClassesContent`).
- No rework of the mobile stacked flow. Mobile keeps its existing `gfdu-mobile-next`
  panel-to-panel affordance; the new CTA button still works there via the same click
  handler. The scroll bug (F) is desktop-Lenis-only, so mobile is unaffected.

## Design

Sections A–F. F (the scroll-handoff fix) is sequenced **first** — without it the detail
lane is unusable, so it is the highest-value change.

### F. Lenis scroll-handoff (fix wheel + double scrollbar) — do first

**Cause:** Lenis hijacks the wheel globally and drives `window` scroll (→ horizontal
pin), and nothing releases it when a detail lane opens.

**Fix:**
- Mark `.detail-lane__scroll` with `data-lenis-prevent` (Lenis's built-in opt-out) so a
  wheel over the detail scrolls it natively and Lenis ignores it.
- In `lanes.ts`: `window.__lenis?.stop()` on `openLane`, `window.__lenis?.start()` on
  `closeLane` (finish), so the background pin never moves while a detail is open. Guard
  for the no-Lenis case (mobile/reduced-motion return `() => {}` from `initScroll`).
- Kill the second scrollbar: while a lane is open (`html[data-open-lane]` is already set
  by `openLane`), lock the page scroll root — `html[data-open-lane] { overflow: hidden }`
  — with `scrollbar-gutter: stable` on `html` so removing the window scrollbar does not
  shift layout.

**Verification (systematic-debugging, real browser):** Lenis's exact `stop()` +
`data-lenis-prevent` interaction is confirmed live, not assumed. Acceptance: open a
detail → wheel scrolls the detail content (not the background), exactly one scrollbar,
close → main lane restored to the same station and horizontal position.

### A. Single-source which stations have a detail

`['music','videos','classes']` is hardcoded in `Showcase.astro`. Extract
`DETAIL_LANE_IDS` (readonly tuple) + a `stationHasDetail(id): boolean` helper to
`src/lib/config.ts`. Use it in `Showcase.astro` (to render `<DetailLane>`) and in
`Panel.astro` (to decide whether to render the descent affordance). Removes drift.

### B. Descent affordance on each detail station (`Panel.astro`)

When `stationHasDetail(panel.id)`, render
`<LaneArrow direction="down" targetId={panel.id} withString label={…} />` absolutely
positioned bottom-center of the panel (panels are `h-dvh`). This is the animated
triple-chevron on the pluckable guitar-string threshold.

- `initSignature()` auto-wires the string (no new init needed).
- `lanes.ts` `onClick` already opens the lane for `[data-lane-open]`.
- Reduced-motion: `LaneArrow` already renders a static chevron; `attachString` no-ops.
- Applies to all three detail stations identically.
- Desktop-focused: hidden on mobile (`max-width: 767px`) to avoid competing with
  `gfdu-mobile-next`; the CTA button (C) is the mobile entry.

### C. Promote the self-referential CTA link to a button

In `PanelPhoto.astro` and `PanelServices.astro`, the single link whose
`href === '#' + panel.id` renders as a prominent pill/ghost **button** with a `↓` glyph
and `data-lane-open={panel.id}`, instead of the current right-pointing underlined text
link. Secondary links (Spotify / YouTube / Email) stay as text links unchanged.
Single-source the button styling (shared class in `global.css`).

### D. Cross-the-string descent motion

The down-string at the panel bottom and the up-string at the detail top are the *same*
threshold you cross.

- Add `withString` to the `up` `LaneArrow` in `DetailLane.astro` header so the detail's
  top carries the matching threshold string.
- `laneString.ts` `attachString`: add a `pluck` `CustomEvent` listener
  (`svg.addEventListener('pluck', e => pluck(e.detail))`) so external code can trigger a
  real pluck (today `lanes.ts` only fakes a pointer-hover).
- `lanes.ts` `openLane`/`closeLane`: dispatch a strong `pluck` `CustomEvent` on **both**
  the panel's down-string and the detail's up-string at the crossing (replacing the
  pointerenter/leave hack in `pluckThreshold`).
- Dim scrim: a scrim behind the rising detail fades in (`html[data-open-lane]`) so the
  station visibly recedes as the detail rises. Implemented as CSS on the detail lane / a
  scrim element — **not** by animating GSAP's pinned transforms (low risk).

### E. Unchanged (verify preserved)

Keyboard (`ArrowDown` opens a detail station, `Esc` / `ArrowUp`-at-top closes),
deep-links (`/music`, `#music`), focus management, and the horizontal-wheel invariant.
This work only adds the missing *visible* affordance + connective motion + the scroll fix.

## i18n

Add one key per locale for the descent label, e.g. `a11y.openDetail` →
`"Open {station} details"` / `"Ver detalles de {station}"` (or per-station keys if the
existing `nav.*` labels read better). Wired through `check-i18n-keys.ts`.

## Testing

- **Unit:** `stationHasDetail` (config); `attachString` responds to a `pluck`
  `CustomEvent` (extend `laneString.test.ts`).
- **E2E (desktop):** descent arrow is visible on the music station; clicking it (and the
  CTA button) opens the Music detail; **wheel scrolls the detail content, background pin
  does not move, exactly one scrollbar**; up-arrow / `Esc` restores the same station and
  horizontal position; deep-link `/music` opens with the lane open.
- **E2E (mobile):** unchanged stacked flow still passes; CTA button opens the detail.
- Reuse/extend existing `lanes.spec.ts` / `videos.spec.ts`.

## Files touched

- `src/lib/config.ts` — `DETAIL_LANE_IDS`, `stationHasDetail`.
- `src/components/Showcase.astro` — use `DETAIL_LANE_IDS`.
- `src/components/Panel.astro` — render down-`LaneArrow` on detail stations.
- `src/components/PanelPhoto.astro`, `PanelServices.astro` — CTA button.
- `src/components/DetailLane.astro` — `data-lenis-prevent`; `withString` on up-arrow.
- `src/lib/lanes.ts` — `lenis.stop()/start()`; pluck CustomEvent on both strings.
- `src/lib/laneString.ts` — `pluck` CustomEvent listener.
- `src/styles/global.css` — page-scroll lock while open; scrim; CTA button style;
  down-affordance positioning; `scrollbar-gutter: stable`.
- `src/i18n/en.json`, `src/i18n/es.json` — descent label key.
- Tests: `tests/unit/*`, `tests/e2e/*`.

## Risks

- **Lenis stop / `data-lenis-prevent` behavior** must be verified live (F) — primary risk.
- **Page-scroll lock shift:** removing the window scrollbar must not shift layout →
  `scrollbar-gutter: stable`.
- **Focus/scroll restoration** on close must land on the same station and x (already
  covered by existing e2e; keep asserting).
