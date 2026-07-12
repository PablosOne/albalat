// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isMobileViewport, prefersReducedMotion, laneMotion } from '@/lib/viewport';

const REDUCED = '(prefers-reduced-motion: reduce)';
const MOBILE = '(max-width: 767px)';

function fakeWin(active: Partial<Record<string, boolean>>) {
  return { matchMedia: (q: string) => ({ matches: !!active[q] }) };
}

describe('isMobileViewport', () => {
  it('true when the mobile query matches', () =>
    expect(isMobileViewport(fakeWin({ [MOBILE]: true }))).toBe(true));
  it('false when it does not', () =>
    expect(isMobileViewport(fakeWin({}))).toBe(false));
});

describe('prefersReducedMotion', () => {
  it('true when the reduce query matches', () =>
    expect(prefersReducedMotion(fakeWin({ [REDUCED]: true }))).toBe(true));
  it('false otherwise', () =>
    expect(prefersReducedMotion(fakeWin({}))).toBe(false));
});

describe('laneMotion', () => {
  it('descend on desktop with motion allowed', () =>
    expect(laneMotion(fakeWin({}))).toBe('descend'));
  it('slide on mobile with motion allowed', () =>
    expect(laneMotion(fakeWin({ [MOBILE]: true }))).toBe('slide'));
  it('inline whenever reduced motion is set (desktop)', () =>
    expect(laneMotion(fakeWin({ [REDUCED]: true }))).toBe('inline'));
  it('inline whenever reduced motion is set (mobile)', () =>
    expect(laneMotion(fakeWin({ [MOBILE]: true, [REDUCED]: true }))).toBe('inline'));
});
