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
 * Merge order: if curated override exists, use it + album base (skip heuristic).
 * Otherwise, use heuristic + album base. Pure and deterministic.
 */
export function resolveTrackTheme(album: Album, track: Track): AlbumTheme {
  if (track.theme) {
    return { ...album.palette, ...track.theme };
  }
  return { ...album.palette, ...heuristic(track.title) };
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
