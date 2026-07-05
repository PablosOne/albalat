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
