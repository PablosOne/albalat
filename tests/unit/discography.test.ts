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
      expect(album.links.spotify ?? album.links.appleMusic ?? album.links.youtube).toBeTruthy();
    }
  });

  it('keeps temporary artwork explicitly marked as TODO-ASSET', () => {
    expect(discography.every((album) => album.cover.includes('todo-cover'))).toBe(true);
    expect(discography.some((album) => album.notes.es.includes('TODO-ASSET'))).toBe(true);
    expect(discography.some((album) => album.notes.en.includes('TODO-ASSET'))).toBe(true);
  });

  it('has a featured album for the listening console', () => {
    expect(featuredAlbum).toBeTruthy();
    expect(featuredAlbum?.featured).toBe(true);
  });

  it('includes Spotify and YouTube listening paths', () => {
    expect(discography.some((album) => album.links.spotify?.startsWith('https://open.spotify.com/album/'))).toBe(true);
    expect(discography.some((album) => album.links.youtube?.includes('youtube.com'))).toBe(true);
    expect(discography.some((album) => album.embeds?.spotify?.includes('/embed/album/'))).toBe(true);
    expect(discography.some((album) => album.embeds?.youtube?.includes('youtube-nocookie.com/embed'))).toBe(true);
  });
});
