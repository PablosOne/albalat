import { describe, expect, it } from 'vitest';
import { getVideosByCategory, videos } from '@/data/videos';

describe('video data', () => {
  it('defines typed bilingual YouTube facade data', () => {
    expect(videos.length).toBeGreaterThan(3);

    for (const video of videos) {
      expect(video.id).toMatch(/^[a-z0-9-]+$/);
      expect(video.title.es).toBeTruthy();
      expect(video.title.en).toBeTruthy();
      expect(video.category.es).toBeTruthy();
      expect(video.category.en).toBeTruthy();
      expect(video.youtubeId).toMatch(/^[\w-]{11}$/);
    }
  });

  it('groups videos by localized category', () => {
    const groups = getVideosByCategory('en');

    expect(groups.length).toBeGreaterThan(1);
    expect(groups.flatMap((group) => group.videos)).toHaveLength(videos.length);
    expect(groups.some((group) => group.category === 'J. S. Bach')).toBe(true);
  });
});
