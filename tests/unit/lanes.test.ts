// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { laneIdFromHash, hasDetailLane, resolveInitialDetail } from '@/lib/lanes';

describe('laneIdFromHash', () => {
  it('strips a leading #', () => expect(laneIdFromHash('#music')).toBe('music'));
  it('returns null for empty', () => expect(laneIdFromHash('')).toBeNull());
  it('returns null for bare #', () => expect(laneIdFromHash('#')).toBeNull());
});

describe('hasDetailLane', () => {
  beforeEach(() => { document.body.innerHTML = '<section data-detail-lane="music"></section>'; });
  it('true when a lane exists', () => expect(hasDetailLane('music', document)).toBe(true));
  it('false when it does not', () => expect(hasDetailLane('about', document)).toBe(false));
});

describe('resolveInitialDetail', () => {
  it('prefers explicit prop', () => expect(resolveInitialDetail('videos', '#music')).toBe('videos'));
  it('falls back to hash', () => expect(resolveInitialDetail(null, '#music')).toBe('music'));
  it('null when neither', () => expect(resolveInitialDetail(null, '')).toBeNull());
});
