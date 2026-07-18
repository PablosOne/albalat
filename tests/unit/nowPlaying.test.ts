import { describe, expect, it, vi } from 'vitest';
import { buildQueue, createEngine, type AudioLike } from '@/lib/nowPlaying';
import { discography } from '@/data/discography';

function mockAudio(): AudioLike & { emit: (t: string) => void } {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    src: '', currentTime: 0, duration: 0, paused: true, muted: false,
    play: vi.fn(async function (this: AudioLike) { this.paused = false; }),
    pause: vi.fn(function (this: AudioLike) { this.paused = true; }),
    addEventListener: (t: string, cb: () => void) => { (listeners[t] ??= []).push(cb); },
    emit: (t: string) => (listeners[t] ?? []).forEach((cb) => cb()),
  };
}

const torroba = discography.find((a) => a.id === 'torroba-guitar-music')!;

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

  it('auto-advances to the next track when the clip ends', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.load(buildQueue(torroba), 0);
    const firstSrc = audio.src;
    audio.emit('ended');
    expect(engine.getState().index).toBe(1);
    expect(audio.src).not.toBe(firstSrc);
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
    engine.loadAmbient(buildQueue(torroba), 0);
    engine.toggleMute();
    expect(engine.getState().muted).toBe(true);
    engine.load(buildQueue(torroba), 1);
    expect(engine.getState().muted).toBe(false);
    expect(audio.muted).toBe(false);
  });

  it('loadAmbient plays the track but keeps the bar hidden', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.loadAmbient(buildQueue(torroba), 0);
    const s = engine.getState();
    expect(s.visible).toBe(false);
    expect(s.track?.title).toContain('Turégano');
    expect(audio.play).toHaveBeenCalled();
  });

  it('ambient playback stays hidden across auto-advance', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.loadAmbient(buildQueue(torroba), 0);
    audio.emit('ended');
    expect(engine.getState().index).toBe(1);
    expect(engine.getState().visible).toBe(false);
  });

  it('a normal load after ambient reveals the bar', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.loadAmbient(buildQueue(torroba), 0);
    engine.load(buildQueue(torroba), 1);
    expect(engine.getState().visible).toBe(true);
  });

  it('setMuted and toggleMute flip state.muted and audio.muted', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.loadAmbient(buildQueue(torroba), 0);
    expect(engine.getState().muted).toBe(false);
    engine.toggleMute();
    expect(engine.getState().muted).toBe(true);
    expect(audio.muted).toBe(true);
    engine.setMuted(false);
    expect(engine.getState().muted).toBe(false);
    expect(audio.muted).toBe(false);
  });
});
