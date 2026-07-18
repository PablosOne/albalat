# Ambient Torroba autoplay + floating sound toggle

**Date:** 2026-07-18
**Status:** Approved (design)

## Goal

On page open, the site should begin playing the featured Torroba album without
showing the full bottom now-playing bar. A small, beautiful floating "sound"
button lets the visitor mute/unmute this ambient playback. It is driven by the
same engine singleton as the bottom bar, so playing anything from the music tab
hands off cleanly to the full bar.

## Decisions (from brainstorming)

- **Start trigger:** Audible autoplay is blocked by browsers. Rather than start
  muted, we **wait for the visitor's first gesture** (click/tap/keypress
  anywhere) and then start Torroba **with sound**. There is a brief silent
  window on landing until that first gesture — accepted tradeoff.
- **Control placement:** A dedicated **floating button**, fixed top-left corner
  (clear of the top-right nav), visible on all breakpoints, shown only while
  ambient audio is active.
- **Scope:** Arms **once per session**, on the first page the visitor lands on;
  keeps playing across client-router navigations. Does not restart per page.
- **Hand-off:** Floating toggle exists only in the ambient state (track playing,
  bar hidden). When the visitor plays from the music tab, `engine.load()` sets
  `visible: true`: the **full bottom bar slides up** and the **floating toggle
  hides**. The two are the two faces of one engine, never both on screen.
  Closing the bar (✕) stops playback entirely; it does not fall back to ambient.
- **Bar mute:** The bottom bar is unchanged — no mute button added there. Mute
  lives only on the floating ambient toggle.

## Architecture

Three pieces, one shared engine (`window.__nowPlaying`).

### 1. Engine — `src/lib/nowPlaying.ts`

- Add `muted: boolean` to `PlayerState` (default `false`).
- Add `muted: boolean` to the `AudioLike` interface so the engine can drive
  `audio.muted` and tests can stub it.
- Add engine methods:
  - `setMuted(m: boolean): void` — sets `audio.muted`, updates `state.muted`,
    emits.
  - `toggleMute(): void` — convenience wrapper.
  - `loadAmbient(queue, index): void` — like `load()` but the played track is
    marked so the bar stays hidden. Implementation: play the track but keep
    `state.visible = false`.
- `playIndex` currently hard-sets `state.visible = true`. Introduce an internal
  flag (e.g. `ambient`) so an ambient load plays without revealing the bar,
  while a normal `load()` reveals it as today. A subsequent normal `load()`
  clears the ambient flag → `visible: true`.
- `close()` continues to fully stop and hide (already the case).

### 2. Autoplay bootstrap — `src/lib/ambientAutoplay.ts`, wired in `Base.astro`

- Exported `initAmbientAutoplay()`.
- `sessionStorage` guard key (e.g. `albalat:ambient-armed`) so it arms at most
  once per session, even across client-router navigations.
- Registers a one-time listener for the first user gesture
  (`pointerdown`/`keydown`/`touchstart`, `{ once: true, capture: true }`).
- On that gesture, on the next tick (so an explicit discography play handler on
  the same click wins): if `engine.getState().track` is still null, build the
  featured (Torroba) queue via `buildQueue(featuredAlbum)` and call
  `engine.loadAmbient(queue, 0)`. If a track already exists, do nothing.
- Imported dynamically from `Base.astro`'s inline script, alongside the existing
  page-load wiring. Guard against double-init on `astro:page-load`.

### 3. Floating toggle — `src/components/AmbientToggle.astro`, rendered in `Base.astro`

- Fixed top-left, circular, backdrop-blur + accent glow, matching the nav pill
  aesthetic. `transition:persist` so it survives page swaps.
- Subscribes to the engine:
  - **Hidden** when `!state.track` OR `state.visible` (full bar showing).
  - **Visible** when a track exists and the bar is hidden (ambient state).
- Icon: animated equalizer bars when playing & unmuted; flat bars / speaker-off
  glyph when muted. Respects `prefers-reduced-motion` (no bar animation).
- Click → `engine.toggleMute()`. `aria-pressed` / `aria-label` reflect state,
  bilingual copy resolved from `document.documentElement.lang` (same pattern as
  `NowPlayingBar.astro`).

## Data flow

```
first gesture ──▶ ambientAutoplay ──▶ engine.loadAmbient(torroba)
                                          │  visible:false, muted:false
                                          ▼
                        AmbientToggle (subscribe) shows, bars animate
                                          │
              user clicks toggle ────────┤─▶ engine.toggleMute()
                                          │
     user plays from music tab ──▶ engine.load(album)  visible:true
                                          ▼
                 AmbientToggle hides · NowPlayingBar slides up
```

## Testing

- **Unit (`tests/unit/nowPlaying.test.ts`):** extend with the injectable
  `AudioLike` stub — `loadAmbient` plays but leaves `visible:false`;
  `setMuted`/`toggleMute` flip `state.muted` and `audio.muted`; a normal
  `load()` after an ambient load sets `visible:true`.
- **E2E:** not added by default (project rule: no browser testing unless asked).
  If requested later: land on `/`, dispatch a gesture, assert the floating
  toggle appears and the bottom bar does not; play a track, assert the bar
  appears and the toggle hides.

## Out of scope

- No mute control on the bottom bar.
- No per-page restart or "resume where left off" persistence beyond the session
  arm-guard.
- No volume slider — mute/unmute only.
