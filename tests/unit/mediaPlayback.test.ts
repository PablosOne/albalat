// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pauseMusic = vi.fn();

vi.mock('@/lib/nowPlaying', () => ({
  getNowPlaying: () => ({ pause: pauseMusic }),
}));

import {
  activateMusicPlayback,
  activateVideoPlayback,
  PLAYBACK_CHANGE_EVENT,
  prepareYouTubeEmbed,
} from '@/lib/mediaPlayback';

beforeEach(() => {
  document.body.replaceChildren();
  pauseMusic.mockClear();
});

describe('exclusive media playback', () => {
  it('pauses music and any earlier YouTube player when video starts', () => {
    const earlier = document.createElement('iframe');
    earlier.dataset.playbackVideo = '';
    document.body.append(earlier);
    const postMessage = vi.fn();
    Object.defineProperty(earlier, 'contentWindow', { value: { postMessage } });

    const changes: string[] = [];
    window.addEventListener(PLAYBACK_CHANGE_EVENT, ((event: CustomEvent<{ kind: string }>) => {
      changes.push(event.detail.kind);
    }) as EventListener, { once: true });

    activateVideoPlayback();

    expect(pauseMusic).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith(expect.stringContaining('pauseVideo'), '*');
    expect(changes).toEqual(['video']);
  });

  it('pauses YouTube players when music takes over', () => {
    const video = document.createElement('iframe');
    video.dataset.playbackVideo = '';
    document.body.append(video);
    const postMessage = vi.fn();
    Object.defineProperty(video, 'contentWindow', { value: { postMessage } });

    activateMusicPlayback();

    expect(postMessage).toHaveBeenCalledWith(expect.stringContaining('pauseVideo'), '*');
    expect(pauseMusic).not.toHaveBeenCalled();
  });

  it('prepares privacy-enhanced embeds for autoplay and pause commands', () => {
    const src = prepareYouTubeEmbed('https://www.youtube-nocookie.com/embed/example1234');
    const url = new URL(src);

    expect(url.hostname).toBe('www.youtube-nocookie.com');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('enablejsapi')).toBe('1');
    expect(url.searchParams.get('playsinline')).toBe('1');
  });
});
