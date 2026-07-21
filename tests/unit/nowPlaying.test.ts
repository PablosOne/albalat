import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildQueue, createEngine, type AudioLike } from '@/lib/nowPlaying';
import { discography } from '@/data/discography';

function mockAudio(): AudioLike & { emit: (t: string) => void } {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    src: '', currentTime: 0, duration: 0, paused: true, muted: false, volume: 1,
    play: vi.fn(async function (this: AudioLike) { this.paused = false; }),
    pause: vi.fn(function (this: AudioLike) { this.paused = true; }),
    addEventListener: (t: string, cb: () => void) => { (listeners[t] ??= []).push(cb); },
    emit: (t: string) => (listeners[t] ?? []).forEach((cb) => cb()),
  };
}

const torroba = discography.find((a) => a.id === 'torroba-guitar-music')!;

afterEach(() => vi.useRealTimers());

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

  it('pauses playback through the explicit pause API', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0);
    engine.pause();
    expect(audio.paused).toBe(true);
    expect(engine.getState().isPaused).toBe(true);
  });

  it('switches an explicitly selected track immediately without crossfading', () => {
    vi.useFakeTimers();
    const audio = mockAudio();
    const secondaryAudio = mockAudio();
    const engine = createEngine({ audio, secondaryAudio, crossfadeMs: 1_000 });
    const queue = buildQueue(torroba);
    engine.load(queue, 0, { ambient: true });
    const firstSrc = audio.src;

    engine.load(queue, 1);

    expect(engine.getState().index).toBe(1);
    expect(audio.src).not.toBe(firstSrc);
    expect(audio.volume).toBe(1);
    expect(secondaryAudio.src).toBe('');
    expect(secondaryAudio.play).not.toHaveBeenCalled();
  });

  it('auto-advances to the next track when the clip ends', () => {
    const audio = mockAudio();
    const secondaryAudio = mockAudio();
    const engine = createEngine({ audio, secondaryAudio });
    engine.load(buildQueue(torroba), 0);
    const firstSrc = audio.src;
    audio.emit('ended');
    expect(engine.getState().index).toBe(1);
    expect(audio.src).not.toBe(firstSrc);
  });

  it('fades the current track out before gently fading the next track in', () => {
    vi.useFakeTimers();
    const audio = mockAudio();
    const secondaryAudio = mockAudio();
    const engine = createEngine({ audio, secondaryAudio, crossfadeMs: 1_000 });
    engine.load(buildQueue(torroba), 0);
    audio.duration = 30;
    audio.currentTime = 29.6;

    audio.emit('timeupdate');
    expect(engine.getState().index).toBe(0);
    expect(secondaryAudio.src).toContain('mzaf_');
    expect(secondaryAudio.volume).toBe(0);
    expect(secondaryAudio.paused).toBe(true);

    vi.advanceTimersByTime(200);
    expect(audio.volume).toBeLessThan(1);
    expect(audio.paused).toBe(false);
    expect(secondaryAudio.volume).toBe(0);
    vi.advanceTimersByTime(200);
    expect(engine.getState().index).toBe(1);
    expect(audio.paused).toBe(true);
    expect(secondaryAudio.paused).toBe(false);
    expect(secondaryAudio.volume).toBe(0);
    vi.advanceTimersByTime(200);
    expect(secondaryAudio.volume).toBeGreaterThan(0);
    expect(audio.paused).toBe(true);
    vi.advanceTimersByTime(200);
    expect(secondaryAudio.volume).toBe(1);
  });

  it('uses the same crossfade when ambient playback auto-advances', () => {
    vi.useFakeTimers();
    const audio = mockAudio();
    const secondaryAudio = mockAudio();
    const engine = createEngine({ audio, secondaryAudio, crossfadeMs: 1_000 });
    engine.load(buildQueue(torroba), 0, { ambient: true });
    audio.duration = 30;
    audio.currentTime = 29.6;

    audio.emit('timeupdate');
    vi.advanceTimersByTime(800);

    expect(engine.getState().index).toBe(1);
    expect(engine.getState().visible).toBe(false);
    expect(audio.paused).toBe(true);
    expect(secondaryAudio.volume).toBe(1);
  });

  it('notifies subscribers on state change', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    const cb = vi.fn();
    engine.subscribe(cb);
    engine.load(buildQueue(torroba), 0);
    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls.at(-1)![0].track.title).toContain('Turégano');
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

  it('close clears the track so it does not fall back to the ambient toggle', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0);
    engine.close();
    expect(engine.getState().track).toBeNull();
  });

  it('load resets mute so explicit playback is never silently muted by a prior ambient mute', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0, { ambient: true });
    engine.toggleMute();
    expect(engine.getState().muted).toBe(true);
    engine.load(buildQueue(torroba), 1);
    expect(engine.getState().muted).toBe(false);
    expect(audio.muted).toBe(false);
  });

  it('ambient load plays the track but keeps the bar hidden', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0, { ambient: true });
    const s = engine.getState();
    expect(s.visible).toBe(false);
    expect(s.track?.title).toContain('Turégano');
    expect(audio.play).toHaveBeenCalled();
  });

  it('ambient playback stays hidden across auto-advance', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0, { ambient: true });
    audio.emit('ended');
    expect(engine.getState().index).toBe(1);
    expect(engine.getState().visible).toBe(false);
  });

  it('a normal load after ambient reveals the bar', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0, { ambient: true });
    engine.load(buildQueue(torroba), 1);
    expect(engine.getState().visible).toBe(true);
  });

  it('setMuted and toggleMute flip state.muted and audio.muted', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0, { ambient: true });
    expect(engine.getState().muted).toBe(false);
    engine.toggleMute();
    expect(engine.getState().muted).toBe(true);
    expect(audio.muted).toBe(true);
    engine.setMuted(false);
    expect(engine.getState().muted).toBe(false);
    expect(audio.muted).toBe(false);
  });
});
