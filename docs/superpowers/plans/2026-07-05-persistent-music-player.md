# Persistent Music Player & Track-Driven Theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, provider-agnostic, free compact player that plays 30-sec preview clips (expandable to full Spotify/Apple embeds), survives navigation, and smoothly adapts the page's colors + motion to the track being played.

**Architecture:** A `window`-singleton engine (`nowPlaying.ts`) owns one HTML5 `<audio>` element and drives a persistent bar (`NowPlayingBar.astro`) mounted in `Base.astro` with `transition:persist`, so audio survives Astro `ClientRouter` page swaps. A pure resolver (`trackTheme.ts`) maps each track to a theme (album base + curated/heuristic per-track adaptation) that is written to site-wide CSS custom properties.

**Tech Stack:** Astro 5 (`ClientRouter` view transitions), TypeScript, Tailwind v4, Vitest (node env), Playwright.

## Global Constraints

- **No backend / OAuth / API keys / Apple Developer token.** Static Cloudflare site only.
- **Preview audio hotlinks Apple's CDN** (`audio-ssl.itunes.apple.com`); HTML5 `<audio>` plays cross-origin without CORS. Cover images are downloaded and served locally from `public/images/albums/`.
- **Bilingual (es/en).** Every user-facing string has both; `locale` is `'es' | 'en'`.
- **Vitest runs in `environment: 'node'`** — no DOM. Engine/resolver unit tests must NOT touch `document`/`window`/`Audio`; the engine takes an injectable `AudioLike`. Any DOM access (`applyTheme`) is guarded with `typeof document === 'undefined'` and is not unit-tested.
- **All animation gated behind `prefers-reduced-motion: reduce`** — colors still set, instantly; `--album-energy` forced to `0`.
- **Path alias:** `@/` → `src/` (both Vite and Vitest).
- **Follow existing idioms:** `.astro` component with frontmatter + `<script>` that runs on load AND `document.addEventListener('astro:page-load', init)`; idempotent init guarded by a `dataset` flag.

---

## File Structure

- Create `src/lib/trackTheme.ts` — pure theme resolver + guarded `applyTheme` CSS-var writer.
- Create `src/lib/nowPlaying.ts` — engine singleton (types, `createEngine`, `getNowPlaying`).
- Create `src/components/NowPlayingBar.astro` — persistent bar UI + bootstrap that wires engine→bar→theme.
- Modify `src/data/discography.ts` — new album/track fields, real covers, palettes, curated themes.
- Modify `src/layouts/Base.astro` — mount `<NowPlayingBar>` with `transition:persist`.
- Modify `src/components/AlbumStoryPlayer.astro` — "Play album" + per-track buttons; scroll-fallback theme; drop boxed Spotify facade.
- Modify `src/styles/global.css` — theme CSS-var defaults + energy-driven ambient animation.
- Modify `tests/unit/discography.test.ts` — replace TODO-ASSET assertions with real-asset + new-field assertions.
- Create `tests/unit/trackTheme.test.ts`, `tests/unit/nowPlaying.test.ts`.
- Modify `tests/e2e/music.spec.ts` — playback, persistence-across-nav, expand-full, close, theme var.
- Add `public/images/albums/torroba-cover.jpg`, `public/images/albums/guitarra-cover.jpg`.

---

## Task 1: Data model, real covers, and palettes

**Files:**
- Modify: `src/data/discography.ts`
- Add: `public/images/albums/torroba-cover.jpg`, `public/images/albums/guitarra-cover.jpg`
- Test: `tests/unit/discography.test.ts`

**Interfaces:**
- Produces: `Album` gains `spotifyUri: string`, `appleEmbed?: string`, `palette: AlbumTheme`. `Track` gains `previewUrl?: string`, `spotifyTrackId?: string`, `durationMs?: number`, `theme?: Partial<AlbumTheme>`. Exports `AlbumTheme` type: `{ glow: string; accent: string; depth: string; energy: number }`.

- [ ] **Step 1: Download the real covers into the repo**

Run:
```bash
mkdir -p public/images/albums
curl -s -o public/images/albums/torroba-cover.jpg "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/38/77/1d/38771d35-cef6-086b-b523-97b19cd43a5a/cover.jpg/1200x1200bb.jpg"
curl -s -o public/images/albums/guitarra-cover.jpg "https://i.scdn.co/image/ab67616d0000b27365297af972389864cca50533"
file public/images/albums/*.jpg
```
Expected: both report `JPEG image data` (torroba ~1200x1200, guitarra 640x640). If `curl`/`file` differ on Windows, use the Bash tool.

- [ ] **Step 2: Write the failing test** (replace the whole file)

`tests/unit/discography.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { discography, featuredAlbum } from '@/data/discography';

describe('discography data', () => {
  it('contains typed albums with bilingual notes and tracklists', () => {
    expect(discography.length).toBeGreaterThanOrEqual(2);
    for (const album of discography) {
      expect(album.id).toMatch(/^[a-z0-9-]+$/);
      expect(album.title).toBeTruthy();
      expect(album.year).toBeGreaterThan(1900);
      expect(album.cover).toContain('/images/albums/');
      expect(album.notes.es).toBeTruthy();
      expect(album.notes.en).toBeTruthy();
      expect(album.tracklist.length).toBeGreaterThan(0);
    }
  });

  it('uses real cover art with no leftover TODO-ASSET placeholders', () => {
    expect(discography.every((a) => /\.(jpg|jpeg|png|webp)$/.test(a.cover))).toBe(true);
    expect(discography.every((a) => !a.cover.includes('todo-cover'))).toBe(true);
    expect(discography.every((a) => !a.notes.es.includes('TODO-ASSET'))).toBe(true);
    expect(discography.every((a) => !a.notes.en.includes('TODO-ASSET'))).toBe(true);
  });

  it('derives a spotify URI and a base palette for every album', () => {
    for (const album of discography) {
      expect(album.spotifyUri).toMatch(/^spotify:album:[A-Za-z0-9]+$/);
      expect(album.palette.glow).toMatch(/^#/);
      expect(album.palette.accent).toMatch(/^#/);
      expect(album.palette.depth).toMatch(/^#/);
      expect(album.palette.energy).toBeGreaterThanOrEqual(0);
      expect(album.palette.energy).toBeLessThanOrEqual(1);
    }
  });

  it('exposes real preview clips for the Apple-catalogued album', () => {
    const torroba = discography.find((a) => a.id === 'torroba-guitar-music');
    expect(torroba).toBeTruthy();
    const withPreview = torroba!.tracklist.filter((t) => t.previewUrl);
    expect(withPreview.length).toBeGreaterThanOrEqual(8);
    expect(withPreview.every((t) => t.previewUrl!.startsWith('https://'))).toBe(true);
  });

  it('has a featured album for the listening console', () => {
    expect(featuredAlbum?.featured).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- discography`
Expected: FAIL — `spotifyUri`/`palette`/`previewUrl` undefined, cover still `.svg`.

- [ ] **Step 4: Update the data model and data** (replace `src/data/discography.ts`)

```ts
export interface LocalizedText {
  es: string;
  en: string;
}

export interface AlbumTheme {
  /** Primary ambient radial-glow color. */
  glow: string;
  /** UI accent tint. */
  accent: string;
  /** Deep base / vignette color. */
  depth: string;
  /** Motion energy 0..1 — scales drift speed, glow pulse, parallax. */
  energy: number;
}

export interface Track {
  no: number;
  title: string;
  duration?: string;
  previewUrl?: string;
  spotifyTrackId?: string;
  durationMs?: number;
  /** Per-track theme adaptation, merged over the album palette. */
  theme?: Partial<AlbumTheme>;
}

export interface Album {
  id: string;
  title: string;
  year: number;
  cover: string;
  label?: string;
  notes: LocalizedText;
  tracklist: Track[];
  links: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
  };
  embeds?: {
    spotify?: string;
    youtube?: string;
  };
  /** `spotify:album:<id>` used by expand-to-full. */
  spotifyUri: string;
  /** `https://embed.music.apple.com/...` when an Apple album exists. */
  appleEmbed?: string;
  /** Base theme identity for the record. */
  palette: AlbumTheme;
  featured?: boolean;
}

const APPLE = 'https://audio-ssl.itunes.apple.com/itunes-assets';

export const discography = [
  {
    id: 'torroba-guitar-music',
    title: 'Federico Moreno Torroba: Guitar Music, Yesterday and Today of a Great Maestro',
    year: 2025,
    cover: '/images/albums/torroba-cover.jpg',
    label: 'Da Vinci Classics',
    featured: true,
    notes: {
      es: 'Monografico dedicado a Federico Moreno Torroba, presentado como un recorrido por castillos, danzas y sonatinas para guitarra.',
      en: 'A Federico Moreno Torroba monograph shaped as a journey through castles, dances, and guitar sonatinas.',
    },
    spotifyUri: 'spotify:album:7dRT52ybtElgNDbHqcFZoF',
    appleEmbed: 'https://embed.music.apple.com/us/album/1849357917',
    palette: { glow: '#c6923e', accent: '#d9a441', depth: '#14110d', energy: 0.5 },
    tracklist: [
      { no: 1, title: 'Castillos de Espana, Vol. 1: No. 1, Turegano', duration: '2:58', durationMs: 178439,
        previewUrl: `${APPLE}/AudioPreview221/v4/08/cb/e2/08cbe2b7-71c2-15fe-be2d-c9faf7466e0b/mzaf_18290329146510751130.plus.aac.p.m4a`,
        theme: { glow: '#8a8172', accent: '#b39a63', energy: 0.42 } },
      { no: 2, title: 'Castillos de Espana, Vol. 1: No. 2, Torija', duration: '2:13', durationMs: 133136,
        previewUrl: `${APPLE}/AudioPreview211/v4/f8/9c/fe/f89cfeff-3dd2-5559-86f6-cc0f06cdc145/mzaf_17769706013069457437.plus.aac.p.m4a`,
        theme: { glow: '#7f7360', accent: '#a98f57', energy: 0.38 } },
      { no: 3, title: 'Castillos de Espana, Vol. 1: No. 3, Manzanares el Real', duration: '1:29', durationMs: 89166,
        previewUrl: `${APPLE}/AudioPreview221/v4/c8/b5/ef/c8b5efd3-75fd-b570-4551-c714b7f9b980/mzaf_2027352862036534195.plus.aac.p.m4a`,
        theme: { glow: '#9c8b63', accent: '#c6a24e', energy: 0.5 } },
      { no: 4, title: 'Romance de los pinos: No. 4, Montemayor', duration: '1:41', durationMs: 101873,
        previewUrl: `${APPLE}/AudioPreview211/v4/6d/e9/1d/6de91d46-c185-f89b-1081-6c6505484160/mzaf_2449211025769951982.plus.aac.p.m4a`,
        theme: { glow: '#6f7a4f', accent: '#9caf5e', energy: 0.4 } },
      { no: 9, title: 'Burgalesa', duration: '2:26', durationMs: 146456,
        previewUrl: `${APPLE}/AudioPreview221/v4/e9/e8/2f/e9e82fc9-b866-8260-927a-add08c541e93/mzaf_2022886457840797067.plus.aac.p.m4a`,
        theme: { glow: '#c6923e', accent: '#e0a83f', energy: 0.72 } },
      { no: 13, title: 'Nocturno', duration: '4:32', durationMs: 272941,
        previewUrl: `${APPLE}/AudioPreview221/v4/45/fc/e0/45fce04d-64d1-37de-3ca2-6e9020a67762/mzaf_8407402004681094402.plus.aac.p.m4a`,
        theme: { glow: '#3f4a63', accent: '#6d7ba0', depth: '#0c0e14', energy: 0.22 } },
      { no: 26, title: 'Sonatina: I. Allegretto', duration: '4:23', durationMs: 263516,
        previewUrl: `${APPLE}/AudioPreview211/v4/6f/9e/8f/6f9e8f48-9b27-f828-2d53-a16617d94e1a/mzaf_4359568736295582167.plus.aac.p.m4a`,
        theme: { glow: '#c89a4a', accent: '#e6bb55', energy: 0.66 } },
      { no: 28, title: 'Sonatina: III. Allegro', duration: '4:53', durationMs: 293061,
        previewUrl: `${APPLE}/AudioPreview221/v4/6c/b2/37/6cb237ba-5729-7c1e-c14d-9ca541b8ed69/mzaf_8636292215092312280.plus.aac.p.m4a`,
        theme: { glow: '#d98a36', accent: '#f2a844', energy: 0.85 } },
    ],
    links: {
      spotify: 'https://open.spotify.com/album/7dRT52ybtElgNDbHqcFZoF',
      appleMusic: 'https://classical.music.apple.com/us/album/1849357917',
      youtube: 'https://www.youtube.com/watch?v=frxwefmz2zI',
    },
    embeds: {
      spotify: 'https://open.spotify.com/embed/album/7dRT52ybtElgNDbHqcFZoF',
      youtube: 'https://www.youtube-nocookie.com/embed/frxwefmz2zI',
    },
  },
  {
    id: 'guitarra',
    title: 'Guitarra',
    year: 2018,
    cover: '/images/albums/guitarra-cover.jpg',
    notes: {
      es: 'Album digital de repertorio para guitarra que abre la estanteria historica de Eulogio Albalat en plataformas.',
      en: 'A digital guitar-repertoire album that opens the historical shelf for Eulogio Albalat on streaming platforms.',
    },
    spotifyUri: 'spotify:album:5vUZx32NxcgkM0F5aU8be7',
    palette: { glow: '#e6c534', accent: '#f2d43a', depth: '#0a0a0a', energy: 0.5 },
    tracklist: [
      { no: 1, title: 'Galilei: Ricercare: Intavolatura di liuto', duration: '0:51' },
      { no: 2, title: 'Weiss: Sonata No. 2: Prelude Sarabande Courante', duration: '1:44' },
      { no: 3, title: 'Weiss: Lute Suite No. 16: I. Sarabande', duration: '1:51' },
      { no: 4, title: 'Mompou: Suite Compostelana: I. Preludio', duration: '2:48' },
      { no: 5, title: 'Mompou: Suite Compostelana: Cancion', duration: '3:08' },
      { no: 6, title: 'Mompou: Suite Compostelana: Muneira', duration: '2:42',
        theme: { glow: '#7fa14a', accent: '#b7c85a', energy: 0.8 } },
    ],
    links: {
      spotify: 'https://open.spotify.com/album/5vUZx32NxcgkM0F5aU8be7',
      appleMusic: 'https://music.apple.com/us/artist/eulogio-albalat/1849308945',
      youtube: 'https://www.youtube.com/c/EulogioAlbalat/videos',
    },
    embeds: {
      spotify: 'https://open.spotify.com/embed/album/5vUZx32NxcgkM0F5aU8be7',
      youtube: 'https://www.youtube-nocookie.com/embed/CDERynrKA2s',
    },
  },
] satisfies Album[];

export const featuredAlbum = discography.find((album) => album.featured) ?? discography[0];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- discography`
Expected: PASS (all 5).

- [ ] **Step 6: Type-check**

Run: `pnpm check`
Expected: no new errors from `discography.ts`. (The `AlbumStoryPlayer` still compiles — its `embeds.spotify` usage is unchanged; it is rewired in Task 5.)

- [ ] **Step 7: Commit**

```bash
git add src/data/discography.ts tests/unit/discography.test.ts public/images/albums/torroba-cover.jpg public/images/albums/guitarra-cover.jpg
git rm --ignore-unmatch public/images/albums/torroba-todo-cover.svg public/images/albums/guitarra-todo-cover.svg
git commit -m "feat: real album art, preview clips, and base palettes"
```

---

## Task 2: Track theme resolver

**Files:**
- Create: `src/lib/trackTheme.ts`
- Test: `tests/unit/trackTheme.test.ts`

**Interfaces:**
- Consumes: `Album`, `Track`, `AlbumTheme` from `@/data/discography`.
- Produces:
  - `resolveTrackTheme(album: Album, track: Track): AlbumTheme` — pure, deterministic.
  - `applyTheme(source: 'nowplaying' | 'scroll', theme: AlbumTheme | null): void` — guarded DOM CSS-var writer with priority (nowplaying wins).

- [ ] **Step 1: Write the failing test**

`tests/unit/trackTheme.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { resolveTrackTheme } from '@/lib/trackTheme';
import type { Album, Track } from '@/data/discography';

const album: Album = {
  id: 'x', title: 'X', year: 2020, cover: '/images/albums/x.jpg',
  notes: { es: 'a', en: 'b' }, tracklist: [], links: {},
  spotifyUri: 'spotify:album:x',
  palette: { glow: '#111111', accent: '#222222', depth: '#000000', energy: 0.5 },
};
const track = (title: string, theme?: Track['theme']): Track => ({ no: 1, title, theme });

describe('resolveTrackTheme', () => {
  it('returns the album palette when nothing matches', () => {
    expect(resolveTrackTheme(album, track('Untitled Piece'))).toEqual(album.palette);
  });

  it('lets a curated per-track override win over the album base', () => {
    const t = resolveTrackTheme(album, track('Nocturno', { glow: '#abcdef', energy: 0.2 }));
    expect(t.glow).toBe('#abcdef');
    expect(t.energy).toBe(0.2);
    expect(t.accent).toBe('#222222'); // untouched keys fall back to album base
  });

  it('derives high energy + warmth from allegro-family markings', () => {
    const t = resolveTrackTheme(album, track('Sonatina: III. Allegro'));
    expect(t.energy).toBeGreaterThan(0.6);
  });

  it('derives low energy + cool from nocturne/sarabande/preludio markings', () => {
    for (const title of ['Nocturno', 'I. Sarabande', 'Suite: I. Preludio']) {
      const t = resolveTrackTheme(album, track(title));
      expect(t.energy).toBeLessThan(0.4);
    }
  });

  it('is deterministic — same input yields identical output', () => {
    const a = resolveTrackTheme(album, track('Muneira'));
    const b = resolveTrackTheme(album, track('Muneira'));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- trackTheme`
Expected: FAIL — `Cannot find module '@/lib/trackTheme'`.

- [ ] **Step 3: Implement `src/lib/trackTheme.ts`**

```ts
import type { Album, AlbumTheme, Track } from '@/data/discography';

type Partial4 = Partial<AlbumTheme>;

const HIGH_ENERGY = /\b(allegro|allegretto|danza|fandanguillo|mu(?:n|ñ)eira|vivo|presto|jota)\b/i;
const LOW_ENERGY = /\b(nocturno|sarabande|zarabanda|andante|adagio|lento|preludio|prelude|cancion|canci(?:o|ó)n|ricercare)\b/i;

/** Heuristic fallback so future/unknown tracks still adapt. */
function heuristic(title: string): Partial4 {
  if (HIGH_ENERGY.test(title)) return { energy: 0.75, accent: '#e6b23f' };
  if (LOW_ENERGY.test(title)) return { energy: 0.3, glow: '#4a5163', accent: '#7d88a6' };
  return {};
}

/**
 * Merge order (later wins): album base → title heuristic → curated track.theme.
 * Pure and deterministic.
 */
export function resolveTrackTheme(album: Album, track: Track): AlbumTheme {
  return { ...album.palette, ...heuristic(track.title), ...(track.theme ?? {}) };
}

let current: { nowplaying: AlbumTheme | null; scroll: AlbumTheme | null } = {
  nowplaying: null,
  scroll: null,
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Write the effective theme to :root CSS vars. Now-playing wins over scroll;
 * null on both reverts to stylesheet defaults. Guarded for the node test env.
 */
export function applyTheme(source: 'nowplaying' | 'scroll', theme: AlbumTheme | null): void {
  if (typeof document === 'undefined') return;
  current[source] = theme;
  const effective = current.nowplaying ?? current.scroll;
  const root = document.documentElement;
  if (!effective) {
    for (const prop of ['--album-glow', '--album-accent', '--album-depth', '--album-energy']) {
      root.style.removeProperty(prop);
    }
    return;
  }
  root.style.setProperty('--album-glow', effective.glow);
  root.style.setProperty('--album-accent', effective.accent);
  root.style.setProperty('--album-depth', effective.depth);
  root.style.setProperty('--album-energy', String(prefersReducedMotion() ? 0 : effective.energy));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- trackTheme`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trackTheme.ts tests/unit/trackTheme.test.ts
git commit -m "feat: track theme resolver with curated + heuristic adaptation"
```

---

## Task 3: Now-playing engine singleton

**Files:**
- Create: `src/lib/nowPlaying.ts`
- Test: `tests/unit/nowPlaying.test.ts`

**Interfaces:**
- Consumes: `resolveTrackTheme` from `@/lib/trackTheme`; `Album`, `Track`, `AlbumTheme` types.
- Produces:
  - Types `PlayerTrack`, `PlayerState`, `AudioLike`, `NowPlayingEngine`.
  - `buildQueue(album: Album): PlayerTrack[]` — pure.
  - `createEngine(opts?: { audio?: AudioLike }): NowPlayingEngine`.
  - `getNowPlaying(): NowPlayingEngine` — browser singleton on `window.__nowPlaying`.

- [ ] **Step 1: Write the failing test**

`tests/unit/nowPlaying.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { buildQueue, createEngine, type AudioLike } from '@/lib/nowPlaying';
import { discography } from '@/data/discography';

function mockAudio(): AudioLike & { emit: (t: string) => void } {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    src: '', currentTime: 0, duration: 0, paused: true,
    play: vi.fn(async function (this: AudioLike) { this.paused = false; }),
    pause: vi.fn(function (this: AudioLike) { this.paused = true; }),
    addEventListener: (t: string, cb: () => void) => { (listeners[t] ??= []).push(cb); },
    emit: (t: string) => (listeners[t] ?? []).forEach((cb) => cb()),
  };
}

const torroba = discography.find((a) => a.id === 'torroba-guitar-music')!;

describe('buildQueue', () => {
  it('maps an album to player tracks carrying resolved themes', () => {
    const q = buildQueue(torroba);
    expect(q.length).toBe(torroba.tracklist.length);
    expect(q[0].albumTitle).toBe(torroba.title);
    expect(q[0].theme.glow).toMatch(/^#/);
    expect(q[0].spotifyUri).toBe(torroba.spotifyUri);
  });
});

describe('createEngine', () => {
  it('loads a queue, sets audio src, and plays the chosen index', async () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 5); // Nocturno
    const state = engine.getState();
    expect(state.visible).toBe(true);
    expect(state.track?.title).toContain('Nocturno');
    expect(audio.src).toContain('mzaf_');
    expect(audio.play).toHaveBeenCalled();
  });

  it('toggles pause/play', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0);
    engine.toggle();
    expect(audio.pause).toHaveBeenCalled();
    engine.toggle();
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it('auto-advances to the next track when the clip ends', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0);
    const firstSrc = audio.src;
    audio.emit('ended');
    expect(engine.getState().index).toBe(1);
    expect(audio.src).not.toBe(firstSrc);
  });

  it('notifies subscribers on state change', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    const cb = vi.fn();
    engine.subscribe(cb);
    engine.load(buildQueue(torroba), 0);
    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls.at(-1)![0].track.title).toContain('Turegano');
  });

  it('expandFull switches mode and pauses the preview audio', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0);
    engine.expandFull('spotify');
    expect(engine.getState().mode).toBe('full');
    expect(engine.getState().provider).toBe('spotify');
    expect(audio.pause).toHaveBeenCalled();
  });

  it('close hides the bar and pauses', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0);
    engine.close();
    expect(engine.getState().visible).toBe(false);
    expect(audio.paused).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- nowPlaying`
Expected: FAIL — `Cannot find module '@/lib/nowPlaying'`.

- [ ] **Step 3: Implement `src/lib/nowPlaying.ts`**

```ts
import type { Album, AlbumTheme } from '@/data/discography';
import { resolveTrackTheme } from '@/lib/trackTheme';

export interface PlayerTrack {
  albumId: string;
  trackNo: number;
  title: string;
  albumTitle: string;
  cover: string;
  previewUrl?: string;
  spotifyUri: string;
  appleEmbed?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  theme: AlbumTheme;
}

export interface PlayerState {
  track: PlayerTrack | null;
  index: number;
  queueLength: number;
  isPaused: boolean;
  position: number;
  duration: number;
  mode: 'preview' | 'full';
  provider: 'spotify' | 'apple' | null;
  visible: boolean;
}

/** Minimal HTMLAudioElement surface — injectable so tests avoid the DOM. */
export interface AudioLike {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, cb: () => void): void;
}

export interface NowPlayingEngine {
  load(queue: PlayerTrack[], index: number): void;
  toggle(): void;
  seek(seconds: number): void;
  next(): void;
  prev(): void;
  expandFull(provider: 'spotify' | 'apple'): void;
  collapse(): void;
  close(): void;
  subscribe(cb: (state: PlayerState) => void): () => void;
  getState(): PlayerState;
}

/** Pure: album → player queue with resolved per-track themes. */
export function buildQueue(album: Album): PlayerTrack[] {
  return album.tracklist.map((track) => ({
    albumId: album.id,
    trackNo: track.no,
    title: track.title,
    albumTitle: album.title,
    cover: album.cover,
    previewUrl: track.previewUrl,
    spotifyUri: album.spotifyUri,
    appleEmbed: album.appleEmbed,
    spotifyUrl: album.links.spotify,
    appleUrl: album.links.appleMusic,
    theme: resolveTrackTheme(album, track),
  }));
}

export function createEngine(opts: { audio?: AudioLike } = {}): NowPlayingEngine {
  const audio: AudioLike =
    opts.audio ?? (typeof Audio !== 'undefined' ? (new Audio() as unknown as AudioLike) : stubAudio());

  let queue: PlayerTrack[] = [];
  const state: PlayerState = {
    track: null, index: -1, queueLength: 0, isPaused: true,
    position: 0, duration: 0, mode: 'preview', provider: null, visible: false,
  };
  const subs = new Set<(s: PlayerState) => void>();
  const emit = () => subs.forEach((cb) => cb({ ...state }));

  audio.addEventListener('timeupdate', () => {
    state.position = audio.currentTime;
    state.duration = Number.isFinite(audio.duration) ? audio.duration : state.duration;
    emit();
  });
  audio.addEventListener('play', () => { state.isPaused = false; emit(); });
  audio.addEventListener('pause', () => { state.isPaused = true; emit(); });
  audio.addEventListener('ended', () => next());

  function playIndex(i: number) {
    if (i < 0 || i >= queue.length) return;
    const track = queue[i];
    state.index = i;
    state.track = track;
    state.mode = 'preview';
    state.provider = null;
    state.visible = true;
    state.position = 0;
    if (track.previewUrl) {
      audio.src = track.previewUrl;
      audio.currentTime = 0;
      void audio.play();
    } else {
      // No preview for this track: hold on the bar; the user can expand to full.
      audio.pause();
      state.isPaused = true;
    }
    emit();
  }

  function next() {
    if (state.index + 1 < queue.length) playIndex(state.index + 1);
    else { audio.pause(); state.isPaused = true; emit(); }
  }
  function prev() {
    if (state.index > 0) playIndex(state.index - 1);
    else playIndex(0);
  }

  return {
    load(q, index) { queue = q; state.queueLength = q.length; playIndex(index); },
    toggle() {
      if (state.mode === 'full') return;
      if (audio.paused) void audio.play();
      else audio.pause();
    },
    seek(seconds) { audio.currentTime = seconds; state.position = seconds; emit(); },
    next, prev,
    expandFull(provider) { audio.pause(); state.mode = 'full'; state.provider = provider; state.isPaused = true; emit(); },
    collapse() { state.mode = 'preview'; state.provider = null; emit(); },
    close() { audio.pause(); state.isPaused = true; state.visible = false; state.mode = 'preview'; state.provider = null; emit(); },
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    getState() { return { ...state }; },
  };
}

function stubAudio(): AudioLike {
  return { src: '', currentTime: 0, duration: 0, paused: true, play: async () => {}, pause: () => {}, addEventListener: () => {} };
}

/** Browser singleton — one engine survives ClientRouter page swaps. */
export function getNowPlaying(): NowPlayingEngine {
  const w = window as unknown as { __nowPlaying?: NowPlayingEngine };
  if (!w.__nowPlaying) w.__nowPlaying = createEngine({ audio: new Audio() as unknown as AudioLike });
  return w.__nowPlaying;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- nowPlaying`
Expected: PASS (7).

- [ ] **Step 5: Full unit run + type-check**

Run: `pnpm test && pnpm check`
Expected: all unit tests PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nowPlaying.ts tests/unit/nowPlaying.test.ts
git commit -m "feat: now-playing engine singleton with auto-advance and expand-to-full"
```

---

## Task 4: Persistent NowPlayingBar component + Base mount

**Files:**
- Create: `src/components/NowPlayingBar.astro`
- Modify: `src/layouts/Base.astro`

**Interfaces:**
- Consumes: `getNowPlaying`, `PlayerState`, `PlayerTrack` from `@/lib/nowPlaying`; `applyTheme` from `@/lib/trackTheme`.
- Produces: DOM contract used by e2e and Task 5 — root `#now-playing-bar` (`transition:persist="now-playing"`), `[data-np-toggle]`, `[data-np-title]`, `[data-np-cover]`, `[data-np-seek]` (`role="slider"`), `[data-np-elapsed]`, `[data-np-duration]`, `[data-np-prev]`, `[data-np-next]`, `[data-np-full]`, `[data-np-spotify]`, `[data-np-apple]`, `[data-np-close]`, `[data-np-embed]` (expand host), `[data-np-hint]`. Hidden via `hidden` attribute + `data-visible="false"`. The engine is reached from other components via `getNowPlaying()`.

- [ ] **Step 1: Implement `src/components/NowPlayingBar.astro`**

```astro
---
interface Props {
  locale: 'es' | 'en';
}
const { locale } = Astro.props;
const copy = {
  es: { region: 'Reproductor', play: 'Reproducir', pause: 'Pausar', prev: 'Anterior', next: 'Siguiente',
        full: 'Pista completa', spotify: 'Abrir en Spotify', apple: 'Abrir en Apple Music', close: 'Cerrar',
        hint: 'Vista previa - pista completa en Spotify / Apple Music', seek: 'Buscar en la pista' },
  en: { region: 'Player', play: 'Play', pause: 'Pause', prev: 'Previous', next: 'Next',
        full: 'Full track', spotify: 'Open in Spotify', apple: 'Open in Apple Music', close: 'Close',
        hint: 'Preview - full track on Spotify / Apple Music', seek: 'Seek within track' },
}[locale];
---
<aside
  id="now-playing-bar"
  transition:persist="now-playing"
  data-visible="false"
  hidden
  role="region"
  aria-label={copy.region}
  data-copy={JSON.stringify(copy)}
  class="fixed inset-x-0 bottom-0 z-50 border-t border-ink/15 bg-[#0d0c0a]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] transition-transform duration-300 data-[visible=false]:translate-y-full"
>
  <div data-np-embed hidden class="border-b border-ink/10 bg-black"></div>
  <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 md:gap-4">
    <img data-np-cover src="" alt="" width="48" height="48" class="size-12 shrink-0 border border-ink/10 object-cover" />
    <div class="min-w-0 flex-1">
      <p data-np-title class="truncate text-sm font-medium text-ink">-</p>
      <div class="mt-1 flex items-center gap-2">
        <span data-np-elapsed class="font-mono text-[0.65rem] text-ink-muted">0:00</span>
        <input data-np-seek type="range" min="0" max="1000" value="0" step="1"
          aria-label={copy.seek}
          class="h-1 w-full flex-1 cursor-pointer appearance-none rounded bg-ink/15 accent-[var(--album-accent,theme(colors.accent))]" />
        <span data-np-duration class="font-mono text-[0.65rem] text-ink-muted">0:30</span>
      </div>
      <p data-np-hint class="mt-0.5 truncate text-[0.6rem] text-ink-muted">{copy.hint}</p>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <button data-np-prev type="button" aria-label={copy.prev} class="np-btn">⏮</button>
      <button data-np-toggle type="button" aria-label={copy.play} class="np-btn np-btn--primary">▶</button>
      <button data-np-next type="button" aria-label={copy.next} class="np-btn">⏭</button>
      <button data-np-full type="button" class="np-chip">{copy.full}</button>
      <a data-np-spotify href="#" target="_blank" rel="noreferrer" aria-label={copy.spotify} class="np-btn">S</a>
      <a data-np-apple href="#" target="_blank" rel="noreferrer" aria-label={copy.apple} class="np-btn">A</a>
      <button data-np-close type="button" aria-label={copy.close} class="np-btn">✕</button>
    </div>
  </div>
</aside>

<style>
  .np-btn { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem;
    border: 1px solid rgba(244,239,231,0.14); color: var(--ink); font-size: 0.8rem; }
  .np-btn:hover, .np-btn:focus-visible { border-color: var(--accent); color: var(--accent); outline: none; }
  .np-btn--primary { border-color: var(--album-accent, var(--accent)); color: var(--album-accent, var(--accent)); }
  .np-chip { padding: 0 0.6rem; height: 2rem; border: 1px solid rgba(244,239,231,0.14); font-size: 0.7rem; white-space: nowrap; }
  .np-chip:hover, .np-chip:focus-visible { border-color: var(--accent); color: var(--accent); outline: none; }
  [data-np-apple][hidden], [data-np-full][hidden] { display: none; }
</style>

<script>
  import { getNowPlaying, type PlayerState } from '@/lib/nowPlaying';
  import { applyTheme } from '@/lib/trackTheme';

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) s = 0;
    const m = Math.floor(s / 60); const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const initNowPlayingBar = () => {
    const bar = document.getElementById('now-playing-bar');
    if (!bar || bar.dataset.bound === 'true') return;
    bar.dataset.bound = 'true';
    const engine = getNowPlaying();
    const copy = JSON.parse(bar.dataset.copy || '{}');

    const q = <T extends Element>(sel: string) => bar.querySelector<T>(sel)!;
    const cover = q<HTMLImageElement>('[data-np-cover]');
    const title = q<HTMLElement>('[data-np-title]');
    const toggle = q<HTMLButtonElement>('[data-np-toggle]');
    const seek = q<HTMLInputElement>('[data-np-seek]');
    const elapsed = q<HTMLElement>('[data-np-elapsed]');
    const duration = q<HTMLElement>('[data-np-duration]');
    const embed = q<HTMLElement>('[data-np-embed]');
    const spotify = q<HTMLAnchorElement>('[data-np-spotify]');
    const apple = q<HTMLAnchorElement>('[data-np-apple]');
    const full = q<HTMLButtonElement>('[data-np-full]');

    toggle.addEventListener('click', () => engine.toggle());
    q<HTMLButtonElement>('[data-np-prev]').addEventListener('click', () => engine.prev());
    q<HTMLButtonElement>('[data-np-next]').addEventListener('click', () => engine.next());
    q<HTMLButtonElement>('[data-np-close]').addEventListener('click', () => { engine.close(); embed.hidden = true; embed.replaceChildren(); });
    seek.addEventListener('input', () => {
      const s = engine.getState();
      if (s.duration) engine.seek((Number(seek.value) / 1000) * s.duration);
    });
    full.addEventListener('click', () => {
      const s = engine.getState();
      if (!s.track) return;
      const provider: 'spotify' | 'apple' = s.track.appleEmbed ? 'apple' : 'spotify';
      const src = provider === 'apple' ? s.track.appleEmbed! : `https://open.spotify.com/embed/${s.track.spotifyUri.split(':').slice(1).join('/')}`;
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.loading = 'lazy';
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.className = 'h-[152px] w-full border-0 md:h-[232px]';
      embed.replaceChildren(iframe);
      embed.hidden = false;
      engine.expandFull(provider);
    });

    const render = (s: PlayerState) => {
      bar.hidden = !s.visible;
      bar.dataset.visible = String(s.visible);
      applyTheme('nowplaying', s.visible && s.track ? s.track.theme : null);
      if (!s.track) return;
      cover.src = s.track.cover;
      cover.alt = s.track.albumTitle;
      title.textContent = `${s.track.title} — ${s.track.albumTitle}`;
      toggle.textContent = s.isPaused ? '▶' : '⏸';
      toggle.setAttribute('aria-label', s.isPaused ? copy.play : copy.pause);
      elapsed.textContent = fmt(s.position);
      duration.textContent = fmt(s.duration || 30);
      seek.value = String(s.duration ? Math.round((s.position / s.duration) * 1000) : 0);
      seek.setAttribute('aria-valuenow', String(Math.round(s.position)));
      spotify.href = s.track.spotifyUrl ?? '#';
      apple.hidden = !s.track.appleUrl;
      if (s.track.appleUrl) apple.href = s.track.appleUrl;
      full.hidden = !(s.track.appleEmbed || s.track.spotifyUri);
    };

    engine.subscribe(render);
    render(engine.getState());
  };

  initNowPlayingBar();
  document.addEventListener('astro:page-load', initNowPlayingBar);
</script>
```

- [ ] **Step 2: Mount the bar in `Base.astro`**

In `src/layouts/Base.astro`, add the import in the frontmatter (after the existing `Seo` import):
```astro
import NowPlayingBar from '@/components/NowPlayingBar.astro';
```
Then, inside `<body>`, immediately after `<slot />` (before the `<script>`), add:
```astro
    <NowPlayingBar locale={locale} />
```
`locale` is already destructured from `Astro.props` in `Base.astro`.

- [ ] **Step 3: Verify it builds and mounts**

Run: `pnpm build`
Expected: build succeeds. Then:
Run: `pnpm test -- discography trackTheme nowPlaying` (sanity — unaffected, all PASS).

- [ ] **Step 4: Manual smoke via the run skill**

Use the `run` skill (or `pnpm dev`) to load `/music`, confirm the bar is absent initially (it has the `hidden` attribute), and that no console errors are thrown by the bar's bootstrap.

- [ ] **Step 5: Commit**

```bash
git add src/components/NowPlayingBar.astro src/layouts/Base.astro
git commit -m "feat: persistent now-playing bar mounted site-wide"
```

---

## Task 5: Wire the music page to the engine

**Files:**
- Modify: `src/components/AlbumStoryPlayer.astro`

**Interfaces:**
- Consumes: `getNowPlaying`, `buildQueue` from `@/lib/nowPlaying`; `applyTheme`, `resolveTrackTheme` from `@/lib/trackTheme`; album data already passed as `albums` prop.
- Produces: `[data-play-album={album.id}]` buttons and `[data-play-track]` buttons carrying `data-album-id` + `data-track-index`. Active row marked `data-track-active="true"`.

- [ ] **Step 1: Replace the console's boxed Spotify facade with a "Play album" action**

In `src/components/AlbumStoryPlayer.astro`, remove the Spotify `MediaEmbedFacade` block (the `{selected?.embeds?.spotify && (...)}` lines) and replace the whole `<div class="mt-4 grid gap-3 ...">` block with:
```astro
          <div class="mt-4 grid gap-3">
            <button
              type="button"
              data-play-album={selected?.id}
              class="inline-flex items-center justify-center gap-2 border border-ink/20 bg-ink px-4 py-3 text-sm font-semibold text-stage transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span aria-hidden="true">▶</span>
              <span>{locale === 'es' ? 'Reproducir album' : 'Play album'}</span>
            </button>
            {selected?.embeds?.youtube && (
              <MediaEmbedFacade provider="youtube" title={`${copy.youtube}: ${selected.title}`} src={selected.embeds.youtube} locale={locale} />
            )}
          </div>
```
(The YouTube facade stays; only the Spotify facade is removed.)

- [ ] **Step 2: Make each tracklist row a play button**

In the same file, replace the tracklist `<ol>…</ol>` block with:
```astro
                    <ol class="mt-4 divide-y divide-ink/10 border-y border-ink/10">
                      {album.tracklist.map((track, trackIndex) => (
                        <li>
                          <button
                            type="button"
                            data-play-track
                            data-album-id={album.id}
                            data-track-index={trackIndex}
                            class="track-row grid w-full grid-cols-[3ch_minmax(0,1fr)_auto] items-center gap-4 py-3 text-left text-sm text-ink/90 transition-colors hover:text-accent focus-visible:outline-none focus-visible:text-accent"
                          >
                            <span class="font-mono text-ink-muted">{track.no}</span>
                            <span class="truncate">{track.title}</span>
                            {track.duration && <span class="font-mono text-ink-muted">{track.duration}</span>}
                          </button>
                        </li>
                      ))}
                    </ol>
```

- [ ] **Step 3: Add active-row styling** — append to the component `<style>` block:
```css
  .track-row[data-track-active="true"] {
    color: var(--accent);
  }
  .track-row[data-track-active="true"] span:first-child::before {
    content: "▶ ";
    color: var(--accent);
  }
```

- [ ] **Step 4: Wire clicks + scroll-fallback theme** — in the component `<script>`, inside the `initAlbumStory` per-root block (after `setActive(...)` is defined), add:

```ts
      // --- playback wiring ---
      import('@/lib/nowPlaying').then(({ getNowPlaying, buildQueue }) => {
        import('@/lib/trackTheme').then(({ applyTheme, resolveTrackTheme }) => {
          const engine = getNowPlaying();
          const albumById = new Map<string, any>();
          (window as any).__albalatAlbums?.forEach?.((a: any) => albumById.set(a.id, a));

          root.querySelectorAll<HTMLButtonElement>('[data-play-album]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const album = albumById.get(btn.dataset.playAlbum!);
              if (album) engine.load(buildQueue(album), 0);
            });
          });
          root.querySelectorAll<HTMLButtonElement>('[data-play-track]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const album = albumById.get(btn.dataset.albumId!);
              if (album) engine.load(buildQueue(album), Number(btn.dataset.trackIndex));
            });
          });

          const trackButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-play-track]'));
          engine.subscribe((s) => {
            trackButtons.forEach((btn) => {
              const active = !!s.track && btn.dataset.albumId === s.track.albumId
                && Number(btn.dataset.trackIndex) === s.index && s.visible;
              btn.dataset.trackActive = String(active);
            });
          });

          // Scroll fallback: tint the page to the in-view album when nothing is playing.
          const applyScrollTheme = (id: string) => {
            const album = albumById.get(id);
            if (album) applyTheme('scroll', resolveTrackTheme(album, album.tracklist[0]));
          };
          (root as any).__onActive = applyScrollTheme;
          applyScrollTheme(sections[0]?.dataset.albumSection ?? '');
        });
      });
```

Then, inside the existing `setActive(id)` function, add as its last line:
```ts
        (root as any).__onActive?.(id);
```

- [ ] **Step 5: Expose album data to the client** — at the end of the component frontmatter (after `const copy = ...`), add a serialized data island. Just before the closing `---`, nothing changes; instead, right after the opening `<section ...>` tag in the template add:
```astro
  <script is:inline set:html={`window.__albalatAlbums = ${JSON.stringify(albums)}`}></script>
```

- [ ] **Step 6: Build + smoke**

Run: `pnpm build`
Expected: success. Then via the `run` skill, load `/music`, click a track row → the bar rises and audio plays; the active row shows the ▶ marker; the page tint shifts to that track's theme.

- [ ] **Step 7: Commit**

```bash
git add src/components/AlbumStoryPlayer.astro
git commit -m "feat: play album and per-track from the music page"
```

---

## Task 6: Track-driven ambient theme + motion in CSS

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: CSS vars `--album-glow`, `--album-accent`, `--album-depth`, `--album-energy` set by `applyTheme`.
- Produces: an ambient background layer on the music page that morphs color and (energy-scaled) motion.

- [ ] **Step 1: Add theme defaults + smooth transition** — append to `src/styles/global.css`:

```css
:root {
  --album-glow: #c6923e;
  --album-accent: var(--accent);
  --album-depth: #14110d;
  --album-energy: 0.5;
}

:root {
  transition: none;
}
/* Smoothly morph the ambient theme when the now-playing track changes. */
[data-album-story]::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.75;
  background:
    radial-gradient(circle at 16% 10%, color-mix(in srgb, var(--album-glow) 45%, transparent), transparent 30%),
    radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--album-accent) 30%, transparent), transparent 32%),
    linear-gradient(180deg, color-mix(in srgb, var(--album-depth) 40%, transparent), transparent 72%);
  transition: background 600ms ease, opacity 600ms ease;
}

@media (prefers-reduced-motion: no-preference) {
  [data-album-story]::before {
    animation: album-drift calc(20s - (var(--album-energy) * 8s)) ease-in-out infinite alternate;
  }
  @keyframes album-drift {
    from { transform: translate3d(0, 0, 0) scale(1); opacity: calc(0.62 + var(--album-energy) * 0.12); }
    to   { transform: translate3d(0, calc(var(--album-energy) * -1.2rem), 0) scale(calc(1 + var(--album-energy) * 0.02)); opacity: 0.82; }
  }
}
```

Note: `[data-album-story]` is `position: relative` already (it is `relative overflow-hidden`), so `::before` anchors correctly and sits behind content (the existing decorative div uses `absolute inset-0`; keep `::before` at `z-index: 0` and ensure the content wrapper `.relative` remains above it — it already has `class="relative"`).

- [ ] **Step 2: Build + verify motion + reduced-motion**

Run: `pnpm build`
Expected: success (Tailwind v4 tolerates raw CSS appended to global.css). Then via the `run` skill:
- Play the *Sonatina III. Allegro* (high energy) → background drifts noticeably faster/warmer.
- Play *Nocturno* (low energy) → slow, dim, cool.
- Toggle OS "reduce motion" → no animation, colors still change.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: energy-scaled ambient theme driven by the playing track"
```

---

## Task 7: End-to-end tests

**Files:**
- Modify: `tests/e2e/music.spec.ts`

**Interfaces:**
- Consumes: DOM contracts from Tasks 4–5 (`#now-playing-bar`, `[data-play-track]`, `[data-np-*]`).

- [ ] **Step 1: Rewrite `tests/e2e/music.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('music page renders the album story with real covers', async ({ page }) => {
  await page.goto('/music');
  await expect(page.getByRole('heading', { name: 'Discografia como estanteria viva' })).toBeVisible();
  await expect(page.locator('[data-album-card]')).toHaveCount(2);
  await expect(page.locator('[data-album-section]')).toHaveCount(2);
  await expect(page.locator('#now-playing-bar')).toBeHidden();
});

test('playing a track raises the persistent bar with the right title', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track][data-album-id="torroba-guitar-music"][data-track-index="0"]').click();
  const bar = page.locator('#now-playing-bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('[data-np-title]')).toContainText('Turegano');
  // audio element carries a preview src
  const src = await page.evaluate(() => (window as any).__nowPlaying?.getState()?.track?.previewUrl ?? '');
  expect(src).toContain('mzaf_');
});

test('the bar and its audio persist across client-side navigation', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track][data-album-id="torroba-guitar-music"][data-track-index="0"]').click();
  await expect(page.locator('#now-playing-bar')).toBeVisible();
  // tag the node to prove identity survives the swap
  await page.evaluate(() => document.getElementById('now-playing-bar')!.setAttribute('data-probe', 'kept'));
  await page.getByRole('link', { name: /Videos/i }).first().click();
  await expect(page).toHaveURL(/\/videos/);
  const bar = page.locator('#now-playing-bar');
  await expect(bar).toBeVisible();
  await expect(bar).toHaveAttribute('data-probe', 'kept'); // same DOM node
  await expect(bar.locator('[data-np-title]')).toContainText('Turegano');
});

test('expand-to-full swaps in a provider embed and pauses the preview', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track][data-album-id="torroba-guitar-music"][data-track-index="0"]').click();
  await page.locator('#now-playing-bar [data-np-full]').click();
  await expect(page.locator('#now-playing-bar [data-np-embed] iframe')).toHaveCount(1);
  const mode = await page.evaluate(() => (window as any).__nowPlaying?.getState()?.mode);
  expect(mode).toBe('full');
});

test('close hides the bar', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track]').first().click();
  await expect(page.locator('#now-playing-bar')).toBeVisible();
  await page.locator('#now-playing-bar [data-np-close]').click();
  await expect(page.locator('#now-playing-bar')).toBeHidden();
});

test('the playing track drives the ambient theme CSS variable', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track][data-album-id="torroba-guitar-music"][data-track-index="5"]').click(); // Nocturno
  const glow = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--album-glow').trim());
  expect(glow.toLowerCase()).toBe('#3f4a63');
});

test('english music page renders localized copy', async ({ page }) => {
  await page.goto('/en/music');
  await expect(page.getByRole('heading', { name: 'Discography as a living record shelf' })).toBeVisible();
});
```

- [ ] **Step 2: Confirm the nav link name** — the persistence test clicks a "Videos" nav link. Verify the visible nav/HUD link text on `/music` (check `src/components/Nav.astro` output). If the accessible name differs (e.g. localized "Videos" is the same, but the selector must match), adjust the `getByRole('link', { name: /Videos/i })` accordingly. If Videos is not in the top nav on detail pages, navigate via `page.goto` is NOT valid (full reload defeats persistence) — instead click whatever in-page client-side link exists to another route; the HUD/nav on detail pages uses `ClientRouter`, so any nav `<a>` works.

- [ ] **Step 3: Run the e2e suite**

Run: `pnpm test:e2e -- music`
Expected: all 7 PASS. If the persistence test fails because the click triggered a full reload, confirm the link is a plain `<a href>` handled by `ClientRouter` (it should be) and that `#now-playing-bar` has `transition:persist`.

- [ ] **Step 4: Full verification**

Run: `pnpm test && pnpm check && pnpm test:e2e`
Expected: unit PASS, no type errors, e2e PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/music.spec.ts
git commit -m "test: e2e for playback, cross-nav persistence, expand-full, and theming"
```

---

## Self-Review Notes (author)

- **Spec coverage:** hybrid engine (T3), preview `<audio>` + auto-advance (T3), expand-to-full Spotify/Apple (T3/T4), persistence via `transition:persist` (T4 + T7 identity assertion), real covers served locally (T1), agnostic per-track playback with album fallback (T1 data + T3 `playIndex` no-preview branch), music-driven theme album-base + curated + heuristic (T2), now-playing-wins-over-scroll priority (T2 `applyTheme`, T5 scroll source), energy-scaled motion + reduced-motion (T6 + T2), unit + e2e tests (T2/T3/T7). YouTube facade retained (T5 Step 1).
- **Known follow-ups (not blockers):** per-track *full* Spotify playback needs track IDs (Spotify API) — currently expand-full loads the album embed; album 2 has no previews by design (fallback path exercised). These match the spec's "best-effort / graceful fallback" stance.
- **Type consistency:** `AlbumTheme` shape (`glow/accent/depth/energy`) is identical across `discography.ts`, `trackTheme.ts`, `nowPlaying.ts`. `PlayerState`/`PlayerTrack` field names used in the bar (T4) and e2e (T7) match T3's definitions (`mode`, `provider`, `visible`, `track.previewUrl`, `track.theme`).
