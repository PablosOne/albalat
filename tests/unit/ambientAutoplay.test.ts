import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initAmbientAutoplay } from '@/lib/ambientAutoplay';
import { CONSENT_STORAGE_KEY, saveConsent } from '@/lib/consent';
import type { AudioLike, NowPlayingEngine } from '@/lib/nowPlaying';

function storageMock(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

class MockAudio implements AudioLike {
  src = '';
  currentTime = 0;
  duration = 30;
  paused = true;
  muted = false;
  volume = 1;
  private listeners = new Map<string, Array<() => void>>();

  async play() { this.paused = false; }
  pause() { this.paused = true; }
  addEventListener(type: string, cb: () => void) {
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(cb);
    this.listeners.set(type, callbacks);
  }
}

type TestWindow = EventTarget & {
  localStorage: Storage;
  __ambientAutoplayInit?: boolean;
  __nowPlaying?: NowPlayingEngine;
};

describe('ambient autoplay consent handoff', () => {
  let testWindow: TestWindow;

  beforeEach(() => {
    vi.useFakeTimers();
    testWindow = Object.assign(new EventTarget(), { localStorage: storageMock() });
    vi.stubGlobal('window', testWindow);
    vi.stubGlobal('Audio', MockAudio);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts from the consent-granted click without requiring another gesture', () => {
    initAmbientAutoplay();
    testWindow.dispatchEvent(new Event('pointerdown'));
    expect(testWindow.__nowPlaying).toBeUndefined();

    saveConsent({ analytics: false, externalMedia: true });
    vi.runAllTimers();

    expect(testWindow.localStorage.getItem(CONSENT_STORAGE_KEY)).not.toBeNull();
    expect(testWindow.__nowPlaying?.getState().track).not.toBeNull();
    expect(testWindow.__nowPlaying?.getState().visible).toBe(false);
  });

  it('does not start when external media is rejected', () => {
    initAmbientAutoplay();
    saveConsent({ analytics: false, externalMedia: false });
    vi.runAllTimers();

    expect(testWindow.__nowPlaying).toBeUndefined();
  });

  it('starts muted on scroll and becomes audible on the next activation', () => {
    saveConsent({ analytics: false, externalMedia: true });
    initAmbientAutoplay();

    testWindow.dispatchEvent(new Event('wheel'));
    expect(testWindow.__nowPlaying?.getState().track).not.toBeNull();
    expect(testWindow.__nowPlaying?.getState().visible).toBe(false);
    expect(testWindow.__nowPlaying?.getState().muted).toBe(true);

    testWindow.dispatchEvent(new Event('pointerdown'));
    expect(testWindow.__nowPlaying?.getState().muted).toBe(false);
  });
});
