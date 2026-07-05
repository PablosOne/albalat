# Cross-Scroll Navigation — Design

**Date:** 2026-07-05
**Status:** Approved (pending spec review)
**Supersedes parts of:** `2026-07-04-albalat-website-design.md` (station teaser → detail-page model)

## Problem

The home page is a pinned horizontal "showcase" of stations. Each non-hero
station is a compact *teaser* that links out to a **separate detail page**
(`/about`, `/music`, `/videos`, `/guitar`, `/classes`, `/contact`). Navigation
is therefore inconsistent: the wheel pans horizontally on home, but a nav click
or teaser click jumps to a wholly separate vertically-scrolled page. There is no
single, coherent spatial model, and content is split between teaser summaries on
home and full content on the routes.

## Goal

One coherent **cross / T-scroll** navigation:

- A horizontal **main lane** of stations (hero → about → music → videos → guitar
  → classes → contact).
- Some stations have an optional **detail lane** hanging *below* them, holding
  the full content for that station.
- The mouse wheel **always** pans the main lane horizontally (both directions).
- You enter a detail lane by clicking a down-arrow on the station or by clicking
  its nav entry; inside the detail the wheel scrolls vertically; an up-arrow,
  scroll-to-top, or `Esc`/`ArrowUp` returns you to the exact main-lane position.
- Not every station has a detail — `detail` is opt-in per station.
- Unify components so main-lane panels, detail lanes, and the arrow indicators
  are single-sourced (no hero/teaser/detail-page duplication).

## Non-goals

- No redesign of the individual content components (`AlbumStoryPlayer`,
  `VideoGallery`, `InquiryForm`, guitar notes, contact) — they are reused as-is,
  slotted into detail lanes.
- No change to the GSAP pinned horizontal engine's core scrub mechanism.
- No change to the i18n structure or the data model of the content itself.

## Interaction model (decided)

- **Main lane:** wheel always pans horizontally. Wheel-down = move right,
  wheel-up = move left. The wheel is **never** hijacked to scroll the main lane
  vertically. This is an invariant (see "Documented rule").
- **Entering a detail:** click the station's down-`LaneArrow`, **or** click a
  nav/HUD entry for a station that has a detail. Engine: (1) align the main lane
  to that station, (2) animate the detail in (slide up from below — station
  rises/fades up, detail rises in), (3) trap vertical scroll to the detail.
- **Leaving a detail:** click the up-`LaneArrow`, scroll back to the detail's
  top, or press `Esc` / `ArrowUp` at top. Engine reverses the transition and
  restores the exact horizontal scroll position and focus.
- **Transition feel:** slide up from below (directional), honoring the "detail
  is below; you descend into it" spatial model.

### Why an overlay-style detail context (not a taller DOM sibling)

The main lane is GSAP-pinned; vertical page scroll is already consumed by
horizontal scrubbing. A detail lane implemented as a plain taller section would
be scrubbed horizontally, not scrolled vertically. So each detail lane is a
**self-contained vertical scroll context** that is revealed on enter and
restored on exit. This is the only robust way to provide true vertical scrolling
without fighting the pin, and it maps exactly to "arrows/nav enter, wheel stays
horizontal." Visually it still reads as descending because the station rises out
of view as the detail slides up.

## Component architecture

### New / unified components

| Component | Responsibility | Absorbs |
|---|---|---|
| `Station.astro` | One main-lane panel. `kind` switches hero vs. standard presentation. Standard renders a richer preview (heading, tagline, station artifact/visual) plus a down-`LaneArrow` **iff** the station has a detail. | `StationHero.astro` + `StationTeaser.astro` |
| `DetailLane.astro` | Consistent chrome for every detail lane: an up-`LaneArrow` return header + station title/eyebrow, then a `<slot />` for content. Guarantees all details look and behave identically. Owns the per-lane vertical scroll container. | body role of `Detail.astro` |
| `LaneArrow.astro` | Reusable animated triple-chevron indicator (ported from gfdu `PanelSeparator`), rendered as a **clickable button**. Props: `direction: 'down' \| 'up'`, `targetId`, `label`. Single source for the arrow visual + click-to-navigate behavior. | inline arrow SVGs |
| `lanes.ts` | Engine: `openLane(stationId)` / `closeLane()`. Aligns main lane, runs the slide transition, traps/releases vertical scroll, syncs the URL hash, manages keyboard (`Esc`, `ArrowUp`-at-top → close; `ArrowDown` on a station → open), and focus. Extends/absorbs `anchorScroll.ts`. | new |

### Reused unchanged (slotted into `DetailLane`)

`AlbumStoryPlayer.astro`, `VideoGallery.astro` (+ `VideoCard`, `MediaEmbedFacade`),
`InquiryForm.astro`, guitar-notes rendering, contact content. Data stays single-
sourced in `src/data/*`.

### Data model

Add an opt-in marker to `Station` in `src/data/site.ts`:

```ts
export interface Station {
  // ...existing...
  detail?: boolean; // true → this station has a detail lane
}
```

`Stage.astro` maps `station.id` → the correct content component when
`station.detail` is set, and renders `<DetailLane>` accordingly. `about` is
intentionally left **without** a detail lane, demonstrating the optional path.

Stations with detail lanes: **music, videos, guitar, classes, contact.**
Stations without: **hero** (exempt), **about** (richer single panel).

## Routes / SEO (decided: keep routes as deep-links)

- `/music`, `/videos`, `/guitar`, `/classes`, `/contact`, `/about` remain as
  routes but become **thin deep-link pages**: each renders the same `<Stage>`
  component with an `initialDetail="<id>"` prop, plus its own route-specific
  JSON-LD (unchanged from today).
- Result: content lives in exactly one place (`Stage` + content components);
  clean URLs and per-route structured data are preserved; visiting `/music`
  loads the home stage and auto-opens the Music detail lane on load.
- On the home page, `Nav` and `HUD` link to `#<id>` hashes. Clicking a nav entry
  for a station with a detail opens its lane; for a station without, it scrolls
  the main lane to that station.
- `initialDetail` also drives the hash-on-load path (`/#music` opens Music).

## Mobile

The cross unrolls into a single vertical line: station → its detail (if any) →
next station, all native vertical scroll. Down/up `LaneArrow`s scroll between a
station and its detail. No overlay, no GSAP. Mobile default switches from
`carousel` to the existing `stack` mode so details sit naturally in the flow.
`prefers-reduced-motion` uses the same stacked, no-transition path.

## Documented rule (deliverable)

Add a short permanent note to `CLAUDE.md`:

> **Home navigation invariant.** Home is a horizontal *main lane*: the mouse
> wheel pans horizontally in BOTH directions (wheel-down = move right,
> wheel-up = move left). Detail lanes are the ONLY vertical scroll, entered via
> the down-arrows or nav/HUD, exited via up-arrow / scroll-to-top / Esc. Never
> let wheel-down scroll the main lane vertically.

## Accessibility

- `LaneArrow` is a real `<button>`/`<a>` with an accessible label
  (e.g. "Open Music details" / "Back to main lane"), keyboard-focusable.
- Opening a lane moves focus to the detail's heading; closing restores focus to
  the triggering arrow/nav item.
- `Esc` closes an open lane. Arrow keys: `ArrowDown` on a focused station with a
  detail opens it; `ArrowUp` at a detail's top closes it. Existing
  left/right/up/down main-lane keyboard nav in `anchorScroll.ts` is preserved
  for horizontal movement.
- Respects `prefers-reduced-motion` (no slide; instant show/hide).

## Testing

- **Unit:** geometry/lane-state helpers in `lanes.ts` (open/close state, hash
  parsing, `initialDetail` resolution).
- **E2E (Playwright), desktop:** wheel-down pans horizontally (main lane x
  advances, page does not scroll vertically); clicking a station down-arrow
  opens its detail and enables vertical scroll; up-arrow/Esc restores the prior
  horizontal position; nav click to a detail station opens the lane; `/music`
  deep-link loads with the Music lane open.
- **E2E, mobile:** stations and details are one vertical flow; arrows scroll
  between them.
- **SEO:** existing `seo.spec.ts` per-route JSON-LD assertions still pass.
- Update existing `music.spec.ts` / `videos.spec.ts` / `stage.spec.ts` to the
  lane model.

## Migration / impact

- `StationHero` + `StationTeaser` → merged into `Station.astro` (old files
  removed).
- `Detail.astro` layout retained only as a thin wrapper if still needed by the
  deep-link routes; body role moves to `DetailLane`.
- Detail route pages (`music.astro`, etc., both locales) rewritten to render
  `<Stage initialDetail=...>` + their JSON-LD, instead of `<Detail>` + content.
- `Stage.astro`, `Nav.astro`, `HUD.astro` updated for the lane model.
- `anchorScroll.ts` extended/superseded by `lanes.ts`.
- `CLAUDE.md` gains the documented rule.

## Risks

- **Scroll-trap correctness** at the boundary between horizontal pin and the
  detail's vertical scroll — main risk; covered by E2E on enter/exit restoring
  exact position.
- **Deep-link on-load** must open the lane after the pinned engine initializes
  (sequence: init showcase → resolve `initialDetail` → open without animation on
  first paint, or with a short intro).
- **Focus/scroll restoration** after close must land on the same station and x.
