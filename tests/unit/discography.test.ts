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
      // Video-only releases (no streaming tracklist) must at least link out.
      if (album.tracklist.length === 0) {
        expect(album.links.youtube).toBeTruthy();
      }
    }
  });

  it('uses real cover art with no leftover TODO-ASSET placeholders', () => {
    expect(discography.every((a) => /\.(jpg|jpeg|png|webp)$/.test(a.cover))).toBe(true);
    expect(discography.every((a) => !a.cover.includes('todo-cover'))).toBe(true);
    expect(discography.every((a) => !a.notes.es.includes('TODO-ASSET'))).toBe(true);
    expect(discography.every((a) => !a.notes.en.includes('TODO-ASSET'))).toBe(true);
  });

  it('derives a spotify URI (when streamable) and a base palette for every album', () => {
    for (const album of discography) {
      if (album.spotifyUri !== undefined) {
        expect(album.spotifyUri).toMatch(/^spotify:album:[A-Za-z0-9]+$/);
      } else {
        expect(album.links.youtube).toBeTruthy();
      }
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
