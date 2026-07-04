import { describe, it, expect } from 'vitest';
import { useTranslations, getLocaleFromUrl } from '@/i18n';

describe('i18n', () => {
  it('resolves a key in the requested locale', () => {
    expect(useTranslations('en')('nav.music')).toBe('Music');
    expect(useTranslations('es')('nav.music')).toBe('Música');
  });
  it('falls back to es then to the raw key', () => {
    expect(useTranslations('en')('nav.missing')).toBe('nav.missing');
  });
  it('detects locale from url', () => {
    expect(getLocaleFromUrl(new URL('https://x/en/music'))).toBe('en');
    expect(getLocaleFromUrl(new URL('https://x/music'))).toBe('es');
  });
});
