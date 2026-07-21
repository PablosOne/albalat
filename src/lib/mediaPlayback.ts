import { getNowPlaying } from '@/lib/nowPlaying';

export const PLAYBACK_CHANGE_EVENT = 'site:playback-change';

type PlaybackKind = 'music' | 'video';

function announce(kind: PlaybackKind): void {
  window.dispatchEvent(new CustomEvent(PLAYBACK_CHANGE_EVENT, { detail: { kind } }));
}

function pauseYouTubeFrame(frame: HTMLIFrameElement): void {
  frame.contentWindow?.postMessage(JSON.stringify({
    event: 'command',
    func: 'pauseVideo',
    args: [],
  }), '*');
}

function pauseVideos(except?: HTMLVideoElement | HTMLIFrameElement): void {
  document.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
    if (video !== except && !video.paused) video.pause();
  });
  document.querySelectorAll<HTMLIFrameElement>('iframe[data-playback-video]').forEach((frame) => {
    if (frame !== except) pauseYouTubeFrame(frame);
  });
}

/** Call immediately before music starts or resumes. */
export function activateMusicPlayback(): void {
  pauseVideos();
  announce('music');
}

/** Call immediately before a video starts. Music and every other video yield. */
export function activateVideoPlayback(activeVideo?: HTMLVideoElement | HTMLIFrameElement): void {
  getNowPlaying().pause();
  pauseVideos(activeVideo);
  announce('video');
}

/**
 * Adds the parameters needed for autoplay and later pause commands while
 * retaining privacy-enhanced YouTube URLs.
 */
export function prepareYouTubeEmbed(src: string): string {
  const url = new URL(src, window.location.href);
  url.searchParams.set('autoplay', '1');
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('rel', '0');
  if (window.location.origin.startsWith('http')) {
    url.searchParams.set('origin', window.location.origin);
  }
  return url.toString();
}

/**
 * Native videos are coordinated even when a future component calls play()
 * directly instead of going through a facade.
 */
export function initMediaPlayback(): void {
  const w = window as typeof window & { __mediaPlaybackInit?: boolean };
  if (w.__mediaPlaybackInit) return;
  w.__mediaPlaybackInit = true;

  document.addEventListener('play', (event) => {
    const target = event.target;
    if (target instanceof HTMLVideoElement) activateVideoPlayback(target);
  }, true);
}
