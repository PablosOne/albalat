import type { Album, AlbumTheme } from '@/data/discography';
import { resolveTrackTheme } from '@/lib/trackTheme';

export interface PlayerTrack {
  albumId: string;
  trackNo: number;
  title: string;
  albumTitle: string;
  cover: string;
  previewUrl?: string;
  spotifyUri?: string;
  appleEmbed?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  youtubeUrl?: string;
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
  muted: boolean;
}

/** Minimal HTMLAudioElement surface — injectable so tests avoid the DOM. */
export interface AudioLike {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, cb: () => void): void;
}

export interface NowPlayingEngine {
  load(queue: PlayerTrack[], index: number): void;
  loadAmbient(queue: PlayerTrack[], index: number): void;
  setMuted(m: boolean): void;
  toggleMute(): void;
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
    youtubeUrl: album.links.youtube,
    theme: resolveTrackTheme(album, track),
  }));
}

export function createEngine(opts: { audio?: AudioLike } = {}): NowPlayingEngine {
  const audio: AudioLike =
    opts.audio ?? (typeof Audio !== 'undefined' ? (new Audio() as unknown as AudioLike) : stubAudio());

  let queue: PlayerTrack[] = [];
  let ambient = false;
  const state: PlayerState = {
    track: null, index: -1, queueLength: 0, isPaused: true,
    position: 0, duration: 0, mode: 'preview', provider: null, visible: false, muted: false,
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
    const track = queue[i]!;
    state.index = i;
    state.track = track;
    state.mode = 'preview';
    state.provider = null;
    state.visible = !ambient;
    state.position = 0;
    if (track.previewUrl) {
      audio.src = track.previewUrl;
      audio.currentTime = 0;
      void audio.play().catch(() => {});
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
    load(q, index) { ambient = false; queue = q; state.queueLength = q.length; playIndex(index); },
    loadAmbient(q, index) { ambient = true; queue = q; state.queueLength = q.length; playIndex(index); },
    setMuted(m) { audio.muted = m; state.muted = m; emit(); },
    toggleMute() { audio.muted = !state.muted; state.muted = !state.muted; emit(); },
    toggle() {
      if (state.mode === 'full') return;
      if (audio.paused) void audio.play().catch(() => {});
      else audio.pause();
    },
    seek(seconds) { audio.currentTime = seconds; state.position = seconds; emit(); },
    next, prev,
    expandFull(provider) { audio.pause(); state.mode = 'full'; state.provider = provider; state.isPaused = true; emit(); },
    collapse() { state.mode = 'preview'; state.provider = null; emit(); },
    close() { ambient = false; audio.pause(); state.isPaused = true; state.visible = false; state.mode = 'preview'; state.provider = null; emit(); },
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    getState() { return { ...state }; },
  };
}

function stubAudio(): AudioLike {
  return { src: '', currentTime: 0, duration: 0, paused: true, muted: false, play: async () => {}, pause: () => {}, addEventListener: () => {} };
}

/** Browser singleton — one engine survives ClientRouter page swaps. */
export function getNowPlaying(): NowPlayingEngine {
  const w = window as unknown as { __nowPlaying?: NowPlayingEngine };
  if (!w.__nowPlaying) w.__nowPlaying = createEngine({ audio: new Audio() as unknown as AudioLike });
  return w.__nowPlaying;
}
