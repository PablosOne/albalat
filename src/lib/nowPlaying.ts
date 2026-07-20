import type { Album, AlbumTheme } from '@/data/discography';
import { resolveTrackTheme } from '@/lib/trackTheme';
import { trackEvent } from '@/lib/analytics';

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
  volume: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, cb: () => void): void;
}

export interface NowPlayingEngine {
  load(queue: PlayerTrack[], index: number, options?: { ambient?: boolean }): void;
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

/** Three seconds down, then three seconds up. No audible track overlap. */
export const CROSSFADE_MS = 6_000;

export function createEngine(opts: {
  audio?: AudioLike;
  secondaryAudio?: AudioLike;
  crossfadeMs?: number;
} = {}): NowPlayingEngine {
  const createAudio = (): AudioLike =>
    typeof Audio !== 'undefined' ? (new Audio() as unknown as AudioLike) : stubAudio();
  const decks = [opts.audio ?? createAudio(), opts.secondaryAudio ?? createAudio()] as const;
  const crossfadeMs = Math.max(0, opts.crossfadeMs ?? CROSSFADE_MS);

  let queue: PlayerTrack[] = [];
  let ambient = false;
  let activeDeck = 0;
  let outgoingDeck: number | null = null;
  let fadeTimer: ReturnType<typeof setInterval> | null = null;
  let fadeGeneration = 0;
  const state: PlayerState = {
    track: null, index: -1, queueLength: 0, isPaused: true,
    position: 0, duration: 0, mode: 'preview', provider: null, visible: false, muted: false,
  };
  const subs = new Set<(s: PlayerState) => void>();
  const emit = () => subs.forEach((cb) => cb({ ...state }));

  decks.forEach((audio, deck) => {
    audio.volume = 1;
    audio.addEventListener('timeupdate', () => {
      if (deck !== activeDeck) return;
      state.position = audio.currentTime;
      state.duration = Number.isFinite(audio.duration) ? audio.duration : state.duration;
      emit();

      // Start the next preview before this one ends. Both the visible player
      // and hidden ambient mode reach this shared path.
      const remaining = audio.duration - audio.currentTime;
      if (
        outgoingDeck === null &&
        Number.isFinite(remaining) &&
        remaining > 0 &&
        remaining * 1_000 <= crossfadeMs / 2 &&
        state.index + 1 < queue.length &&
        queue[state.index + 1]?.previewUrl
      ) {
        // The first half is the fade-out. If this timeupdate arrived late,
        // shorten both halves equally so silence still lands at track end.
        playIndex(state.index + 1, Math.min(crossfadeMs, Math.round(remaining * 2_000)));
      }
    });
    audio.addEventListener('play', () => {
      if (deck !== activeDeck) return;
      state.isPaused = false;
      emit();
    });
    audio.addEventListener('pause', () => {
      if (deck !== activeDeck) return;
      state.isPaused = true;
      emit();
    });
    audio.addEventListener('ended', () => {
      if (deck !== activeDeck || outgoingDeck !== null) return;
      // Normally the early fade owns natural advancement. If the browser
      // skipped its final timeupdate, change decks immediately without a gap.
      if (state.index + 1 < queue.length) playIndex(state.index + 1, 0);
      else { audio.pause(); state.isPaused = true; emit(); }
    });
  });

  function stopFade(pauseOutgoing = true) {
    fadeGeneration += 1;
    if (fadeTimer !== null) clearInterval(fadeTimer);
    fadeTimer = null;
    if (outgoingDeck !== null) {
      const outgoing = decks[outgoingDeck]!;
      if (pauseOutgoing) outgoing.pause();
      outgoing.volume = 1;
    }
    outgoingDeck = null;
    decks[activeDeck]!.volume = 1;
  }

  function setTrack(i: number, track: PlayerTrack) {
    state.index = i;
    state.track = track;
    state.mode = 'preview';
    state.provider = null;
    state.visible = !ambient;
    state.position = 0;
    state.duration = 0;
    state.isPaused = false;
    if (!ambient) {
      trackEvent('track_play', { album_id: track.albumId, track_no: track.trackNo, title: track.title });
    }
  }

  function startCrossfade(i: number, track: PlayerTrack, durationMs: number) {
    stopFade();
    const previousDeck = activeDeck;
    const incomingDeck = previousDeck === 0 ? 1 : 0;
    const outgoing = decks[previousDeck]!;
    const incoming = decks[incomingDeck]!;
    const generation = fadeGeneration;

    incoming.pause();
    incoming.src = track.previewUrl!;
    incoming.currentTime = 0;
    incoming.muted = state.muted;
    incoming.volume = 0;
    outgoingDeck = previousDeck;
    state.visible = !ambient;
    emit();

    const startedAt = Date.now();
    const fadeOutMs = durationMs / 2;
    const fadeInMs = durationMs - fadeOutMs;
    let incomingStarted = false;

    const failIncoming = () => {
      if (
        generation !== fadeGeneration ||
        activeDeck !== incomingDeck ||
        state.track !== track
      ) return;
      if (fadeTimer !== null) clearInterval(fadeTimer);
      fadeTimer = null;
      incoming.pause();
      incoming.volume = 1;
      outgoing.pause();
      outgoingDeck = null;
      outgoing.volume = 1;
      state.isPaused = true;
      emit();
    };

    const startIncoming = () => {
      if (incomingStarted) return;
      incomingStarted = true;
      outgoing.volume = 0;
      activeDeck = incomingDeck;
      outgoing.pause();
      outgoing.volume = 1;
      setTrack(i, track);
      emit();
      void incoming.play().catch(failIncoming);
    };

    const finish = () => {
      if (generation !== fadeGeneration) return;
      startIncoming();
      incoming.volume = 1;
      outgoingDeck = null;
      if (fadeTimer !== null) clearInterval(fadeTimer);
      fadeTimer = null;
    };
    const tick = () => {
      const elapsed = Math.min(durationMs, Date.now() - startedAt);
      if (elapsed < fadeOutMs) {
        // First soften the current track all the way to silence. The incoming
        // deck remains paused at its first frame, so the pieces never overlap.
        const progress = elapsed / fadeOutMs;
        outgoing.volume = 1 - progress * progress * (3 - 2 * progress);
        incoming.volume = 0;
      } else {
        startIncoming();
        // Only after the outgoing track is silent do we raise the next one.
        const progress = Math.min(1, (elapsed - fadeOutMs) / fadeInMs);
        incoming.volume = progress * progress * (3 - 2 * progress);
      }
      if (elapsed >= durationMs) finish();
    };
    tick();
    if (outgoingDeck !== null) fadeTimer = setInterval(tick, 40);
  }

  function playIndex(i: number, durationMs = crossfadeMs) {
    if (i < 0 || i >= queue.length) return;
    const track = queue[i]!;
    const current = decks[activeDeck]!;
    if (track.previewUrl && current.src && !current.paused && durationMs > 0) {
      startCrossfade(i, track, durationMs);
      return;
    }

    stopFade();
    decks.forEach((deck) => deck.pause());
    setTrack(i, track);
    if (track.previewUrl) {
      current.src = track.previewUrl;
      current.currentTime = 0;
      current.muted = state.muted;
      current.volume = 1;
      void current.play().catch(() => {
        if (decks[activeDeck] === current && state.track === track) {
          state.isPaused = true;
          emit();
        }
      });
    } else {
      // No preview for this track: hold on the bar; the user can expand to full.
      current.pause();
      state.isPaused = true;
    }
    emit();
  }

  function next() {
    if (state.index + 1 < queue.length) playIndex(state.index + 1);
    else { stopFade(); decks[activeDeck]!.pause(); state.isPaused = true; emit(); }
  }
  function prev() {
    if (state.index > 0) playIndex(state.index - 1);
    else playIndex(0);
  }

  return {
    load(q, index, options) {
      ambient = options?.ambient === true;
      if (!ambient) {
        decks.forEach((audio) => { audio.muted = false; });
        state.muted = false;
      }
      queue = q;
      state.queueLength = q.length;
      playIndex(index);
    },
    setMuted(m) { decks.forEach((audio) => { audio.muted = m; }); state.muted = m; emit(); },
    toggleMute() {
      state.muted = !state.muted;
      decks.forEach((audio) => { audio.muted = state.muted; });
      emit();
    },
    toggle() {
      if (state.mode === 'full') return;
      const audio = decks[activeDeck]!;
      if (audio.paused) void audio.play().catch(() => {});
      else { stopFade(); audio.pause(); }
    },
    seek(seconds) { decks[activeDeck]!.currentTime = seconds; state.position = seconds; emit(); },
    next, prev,
    expandFull(provider) {
      stopFade();
      decks.forEach((audio) => audio.pause());
      state.mode = 'full'; state.provider = provider; state.isPaused = true; emit();
    },
    collapse() { state.mode = 'preview'; state.provider = null; emit(); },
    close() {
      ambient = false;
      stopFade();
      decks.forEach((audio) => audio.pause());
      state.isPaused = true;
      state.visible = false;
      state.mode = 'preview';
      state.provider = null;
      state.track = null;
      state.index = -1;
      emit();
    },
    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    getState() { return { ...state }; },
  };
}

function stubAudio(): AudioLike {
  return {
    src: '', currentTime: 0, duration: 0, paused: true, muted: false, volume: 1,
    play: async () => {}, pause: () => {}, addEventListener: () => {},
  };
}

/** Browser singleton — one engine survives ClientRouter page swaps. */
export function getNowPlaying(): NowPlayingEngine {
  const w = window as unknown as { __nowPlaying?: NowPlayingEngine };
  if (!w.__nowPlaying) w.__nowPlaying = createEngine();
  return w.__nowPlaying;
}
