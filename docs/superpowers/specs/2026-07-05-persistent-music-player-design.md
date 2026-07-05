# Persistent Music Player & Music-Driven Theme — Design

**Date:** 2026-07-05
**Status:** Approved (pending spec review)
**Touches:** `src/pages/music.astro`, `src/components/AlbumStoryPlayer.astro`,
`src/data/discography.ts`, `src/layouts/Base.astro`, plus new
`src/components/NowPlayingBar.astro`, `src/lib/nowPlaying.ts`,
`src/lib/trackTheme.ts`.

## Problem

The music page is visually strong (living record shelf, sticky console,
scroll-synced cards) but functionally a link-out shell:

1. **No real playback** — clicking the console facade only swaps in the stock
   `open.spotify.com/embed/album/...` iframe. No play/pause/track control from
   our own UI.
2. **Album-level only** — `discography.ts` has album embed URLs but no per-track
   IDs or preview clips, so "play the tracks" is impossible.
3. **Playback dies on navigation** — the site uses Astro `ClientRouter`; every
   page swap tears the iframe down. Nothing is `transition:persist`, so visiting
   Videos/About kills audio.
4. **No single "now playing" source** — Spotify + YouTube facades stack in the
   console with no shared state.
5. **Placeholder art** — covers are temporary SVGs, not the real CDs.

## Goal

- Play tracks **directly** from an on-site, provider-agnostic, **free** (no
  login) compact player.
- The player is **persistent**: it keeps playing while scrolling and while
  navigating to other subpages, rendered as one compact, beautiful bar.
- Real CD cover art, fetched and served locally.
- The page's **colors, background effects, and animation energy smoothly adapt
  to the track being played**, authored from each piece's character/history,
  with a rule-based fallback so future tracks self-adapt.

## Non-goals

- No backend, OAuth, API keys, or Apple Developer token. Everything works on the
  static Cloudflare site.
- No custom control of Apple Music playback (MusicKit needs a paid dev token) —
  Apple full playback is its own embed.
- No change to the cross-scroll navigation engine, i18n structure, or the
  YouTube video facade model (video ≠ the audio bar).

## Decided architecture (hybrid: preview bar + expand-to-full)

Three transports behind one interface, so `ClientRouter` page swaps never
re-create the engine:

1. **Preview (default, agnostic, free):** one HTML5 `<audio>` element plays free
   30-sec preview clips. Our bar fully drives it: play/pause, seek, progress,
   per-track, and **auto-advance** to the next track's preview so audio keeps
   flowing. Always available; identical for every album.
2. **Expand → full (Spotify):** swaps in Spotify's **IFrame API** iframe (full
   track if the visitor is logged into Spotify). Pauses the preview `<audio>` so
   there is never double sound.
3. **Expand → full (Apple):** swaps in Apple's `embed.music.apple.com` iframe
   (Apple's chrome; previews free). Same pause handshake.

Full tracks for people who want them are one tap away via "Full track" /
open-out links; the honest default is a free preview.

### Component & module boundaries

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `src/lib/nowPlaying.ts` | `window`-level **singleton** engine. Owns the `<audio>` element + provider iframes. API: `load(queue, index)`, `toggle()`, `seek(s)`, `next()`, `prev()`, `expandFull(provider)`, `collapse()`, `subscribe(cb)`. Emits state `{ track, album, provider, isPaused, position, duration, mode: 'preview'\|'full', theme }`. Singleton guard = page swaps reuse it. | `trackTheme.ts`, discography types |
| `src/components/NowPlayingBar.astro` | The persistent compact bar UI. Mounted once in `Base.astro` with `transition:persist`. Binds to the singleton idempotently on `astro:page-load`. | `nowPlaying.ts` |
| `src/lib/trackTheme.ts` | `resolveTrackTheme(album, track) → TrackTheme`. Pure, deterministic, unit-tested. | discography types |
| `src/data/discography.ts` | Adds `spotifyUri`, `appleEmbed`, `palette` per album; `previewUrl?`, `spotifyTrackId?`, `durationMs?`, `theme?` per track. | — |
| `src/components/AlbumStoryPlayer.astro` | Music-page wiring: "Play album" + per-track play buttons call the singleton; active-row state; drives the scroll-fallback theme. | `nowPlaying.ts` |

### Persistence mechanism

`NowPlayingBar` lives in `Base.astro` (shared by every page) with
`transition:persist="now-playing"`. Astro's `ClientRouter` keeps the exact DOM
node — and the live `<audio>` — across every navigation and scroll. The engine
is a `window.__nowPlaying` singleton so re-run scripts never re-instantiate it;
the bar re-binds listeners idempotently each `astro:page-load`.

## Player bar UI

- **Hidden** until first play; slides up from the bottom (respects
  `prefers-reduced-motion` and `safe-area-inset-bottom`). Bottom-fixed,
  full-width.
- **Compact:** cover thumb · "Track — Album" · agnostic play/pause · accessible
  scrubber (`role="slider"`, keyboard) · elapsed/total · prev/next · **"Full
  track"** button · **Spotify / Apple** open-out icons · close.
- **Expanded:** reveals the chosen provider embed above the bar; collapse
  returns to preview.
- Honest hint: *"Preview · full track on Spotify / Apple Music."*
- i18n (es/en), `role="region"` with an `aria-label`, all controls labelled.
- Body gets bottom padding while the bar is visible so it never covers content.

## Data & assets (`discography.ts`, `public/images/albums/`)

- **Real cover art**: fetch high-res artwork (iTunes `artworkUrl` upscaled to
  600, or Spotify oEmbed `thumbnail_url`) and **download into
  `public/images/albums/`** — served locally, no hotlink/CSP issues, no layout
  shift. Retire the placeholder SVGs and remove the "TODO-ASSET / sleeve"
  placeholder copy.
- **Per album (new fields):** `spotifyUri` (`spotify:album:<id>` from
  `links.spotify`), `appleEmbed` (`https://embed.music.apple.com/...` from
  `links.appleMusic` when it is an album URL), `palette` (base theme).
- **Per track (new fields):** `previewUrl?` (30-sec clip), `spotifyTrackId?`,
  `durationMs?`, `theme?` (curated override).
- **Sourcing / fallback (best-effort, non-blocking):**
  - Album 1 (`torroba-guitar-music`) has an Apple **album** id (`1849357917`) →
    `itunes.apple.com/lookup?id=1849357917&entity=song` yields clean per-track
    `previewUrl`, `trackTimeMillis`, artwork.
  - Album 2 (`guitarra`) is Spotify-only (Apple link is an *artist* URL) →
    artwork via Spotify oEmbed; previews via fuzzy iTunes track search, else the
    row **falls back to album play / expand-to-full**.
  - A track with no `previewUrl` never dead-ends: it loads the album preview
    queue or offers expand-to-full.

## Music-driven theme system

**Two data layers:**
- **Album base** — `album.palette` (`glow`, `accent`, `depth`), the record's
  identity.
- **Per-track adaptation** — optional `track.theme` override authored from the
  piece's character/history. Curated for the known repertoire, e.g. *Nocturno* →
  cool dim indigo, low energy; *Burgalesa* → warm Castilian gold (a Burgos
  dance); *Sonatina III. Allegro* → bright, energetic, warm; *Weiss/Galilei*
  lute → aged candlelit sepia; *Suite Compostelana: Muñeira* → lively Galician
  green-gold; *Castillos de España* → stone-and-dusk per castle. Curation
  involves a quick look at each piece so the colors mean something.

**Resolver — `resolveTrackTheme(album, track)`** merges in priority:
1. **Curated `track.theme` override** if present.
2. **Heuristic derivation** — parse the title for musical signals mapped to
   adjustments over the album base: tempo markings (*Allegro/Allegretto* →
   brighter/warmer/higher energy; *Preludio/Sarabande/Nocturno* →
   darker/cooler/lower energy), form, mood keywords. **This is the fallback that
   makes future/unknown tracks self-adapting.**
3. **Album base** if nothing matches.

`TrackTheme = { glow, accent, depth, energy }` where `energy ∈ [0,1]`.

**Rendering & priority.** Resolved theme drives site-wide CSS custom properties
(`--album-glow`, `--album-accent`, `--album-depth`, `--album-energy`) with a
~600ms cross-fade + a subtle pulse on track change. Priority:
1. **Now-playing track theme wins** (persists site-wide via the persistent bar).
2. **Scroll fallback** — on the music page with nothing playing, the in-view
   album's base palette tints the page (existing `IntersectionObserver`).
3. **Site default** — neither active → current stage colors.

**Motion adaptation (light).** `--album-energy` gently scales — within clamped,
tasteful ranges — the ambient gradient drift speed, glow-pulse amplitude, and
parallax depth (e.g. `animation-duration: calc(18s - var(--album-energy)*8s)`).
A driving *Allegro* breathes faster/warmer; a *Nocturno* is slow, dim, still.
`prefers-reduced-motion` forces `energy → 0` and disables the animations; colors
still set, instantly.

## Music-page wiring

- Console's boxed Spotify facade → primary **"Play album"** action (loads the
  album's preview queue into the bar).
- Each tracklist row → a play button: per-track preview when `previewUrl`
  exists, else album fallback. Active track gets a "now playing" row state.
- **YouTube stays** as an on-page video facade (unchanged).

## Testing (TDD)

- **Unit (vitest):**
  - `discography.test.ts` (extend): `spotifyUri` / `appleEmbed` derivation from
    `links`; every album has a `palette`; preview-queue builder.
  - `trackTheme.test.ts` (new): curated override wins; heuristic maps
    `Allegro`→high energy/warm and `Nocturno`→low energy/cool; unknown title →
    deterministic album-base fallback; same input always same output.
  - `nowPlaying.test.ts` (new): engine state machine with a **mocked** `<audio>`
    and mocked provider controllers (no network) — load/toggle/seek/next,
    auto-advance at preview end, expand-full pauses preview.
- **e2e (playwright, extend `music.spec.ts`):**
  - Click a track → bar appears with correct "Track — Album" title and the
    `<audio>` has a `src`.
  - Play/pause toggles state.
  - **Navigate Music → Videos → the same bar node persists** (stable id, still
    visible/audible).
  - Expand-full swaps in a provider iframe and pauses the preview `<audio>`.
  - Close hides the bar.
  - Active-album scroll updates the `--album-*` CSS custom properties.
  - We assert the UI/state contract, not real external Spotify/Apple audio
    (external + autoplay-gated).

## Risks & mitigations

- **Preview availability** is best-effort per catalogue → explicit fallback to
  album play / expand-to-full; unit test the fallback path.
- **Autoplay policies** — first play is always a user gesture (button), so the
  `<audio>` is allowed; auto-advance continues within that gesture's session.
- **Persistence correctness** — covered by the Music→Videos e2e node-identity
  assertion.
- **Motion/accessibility** — every animated effect gated behind
  `prefers-reduced-motion`.
