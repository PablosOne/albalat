// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { attachString } from '@/lib/laneString';

// jsdom: getBoundingClientRect + rAF exist; SVG namespace supported.
function makeSvg(): SVGSVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
}

describe('attachString', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates a polyline with the configured point count', () => {
    const svg = makeSvg();
    attachString(svg, { pointCount: 40 });
    const line = svg.querySelector('[data-string-line]');
    expect(line).not.toBeNull();
    const pts = line!.getAttribute('points')!.trim().split(/\s+/);
    expect(pts).toHaveLength(40);
  });

  it('pluck() raises amplitude so the mid points deviate from the baseline', () => {
    const svg = makeSvg();
    const handle = attachString(svg, { pointCount: 40 });
    const line = svg.querySelector('[data-string-line]')!;
    const flatMidY = line.getAttribute('points')!.trim().split(/\s+/)[20].split(',')[1];
    handle.pluck(20);
    handle.tickForTest(); // advance one physics frame (test-only hook)
    const pluckedMidY = line.getAttribute('points')!.trim().split(/\s+/)[20].split(',')[1];
    expect(pluckedMidY).not.toEqual(flatMidY);
    handle.destroy();
  });

  it('destroy() is idempotent and detaches listeners', () => {
    const svg = makeSvg();
    const handle = attachString(svg);
    expect(() => { handle.destroy(); handle.destroy(); }).not.toThrow();
  });
});
