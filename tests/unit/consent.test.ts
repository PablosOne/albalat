import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_MAX_AGE_MONTHS,
  CONSENT_STORAGE_KEY,
  readConsent,
  saveConsent,
} from '@/lib/consent';

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

describe('consent lifetime', () => {
  let localStorage: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-19T12:00:00.000Z'));
    localStorage = storageMock();
    vi.stubGlobal('window', { localStorage, dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it(`expires new choices after ${CONSENT_MAX_AGE_MONTHS} months`, () => {
    const saved = saveConsent({ analytics: true, externalMedia: false });

    expect(saved.updatedAt).toBe('2026-07-19T12:00:00.000Z');
    expect(saved.expiresAt).toBe('2028-07-19T12:00:00.000Z');
    expect(readConsent()).toEqual(saved);
  });

  it('removes an expired choice so the visitor is asked again', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      version: 1,
      necessary: true,
      analytics: true,
      externalMedia: true,
      updatedAt: '2024-07-18T12:00:00.000Z',
      expiresAt: '2026-07-18T12:00:00.000Z',
    }));

    expect(readConsent()).toBeNull();
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  it('applies the same maximum lifetime to choices saved before expiresAt existed', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      version: 1,
      necessary: true,
      analytics: false,
      externalMedia: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));

    expect(readConsent()?.expiresAt).toBe('2028-01-01T00:00:00.000Z');
  });
});
