/**
 * Reusable guitar-string controller. Renders a horizontal polyline into an
 * <svg> and animates a damped standing-wave whose amplitude is driven by an
 * ambient source (default: scroll velocity) plus discrete plucks.
 *
 * Extracted from string.ts so LaneArrow / Station / Nav all share one physics
 * model. The internal rAF loop is self-owned; a `tickForTest()` hook lets unit
 * tests advance frames deterministically without a real animation frame.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_POINTS = 72;
const WIDTH = 1000;
const MID_Y = 50;

export interface StringHandle {
  pluck(strength?: number): void;
  setVelocitySource(fn: () => number): void;
  tickForTest(): void;
  destroy(): void;
}

interface Opts { pointCount?: number; hoverAmplitude?: number; pluckDefault?: number; }

function ensureLine(svg: SVGSVGElement): SVGPolylineElement {
  svg.setAttribute('viewBox', `0 0 ${WIDTH} 100`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('focusable', 'false');
  const existing = svg.querySelector<SVGPolylineElement>('[data-string-line]');
  if (existing) return existing;
  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('data-string-line', '');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '1.4');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(line);
  return line;
}

function prefersReduced(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function attachString(svg: SVGSVGElement, opts: Opts = {}): StringHandle {
  const pointCount = opts.pointCount ?? DEFAULT_POINTS;
  const hoverAmplitude = opts.hoverAmplitude ?? 14;
  const pluckDefault = opts.pluckDefault ?? 18;
  const line = ensureLine(svg);
  const state = { amplitude: 0, target: 0, phase: 0, hovered: false, impulse: 0 };
  let velocitySource = () => 0;

  const write = () => {
    const pts: string[] = [];
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const x = t * WIDTH;
      const envelope = Math.pow(Math.sin(Math.PI * t), 1.35);
      const fast = Math.sin(t * Math.PI * 8 + state.phase);
      const slow = Math.sin(t * Math.PI * 2 - state.phase * 0.55);
      const y = MID_Y + envelope * state.amplitude * (fast * 0.78 + slow * 0.22);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    line.setAttribute('points', pts.join(' '));
  };

  const step = () => {
    const velocity = velocitySource();
    const ambient = Math.min(18, velocity * 0.07);
    state.target = Math.max(ambient, state.hovered ? hoverAmplitude : 0, state.impulse);
    state.amplitude += (state.target - state.amplitude) * 0.095;
    state.impulse *= 0.88; // decay pluck
    state.phase += 0.075 + Math.min(0.08, velocity * 0.00045);
    write();
  };

  const enter = () => { state.hovered = true; };
  const leave = () => { state.hovered = false; };
  svg.addEventListener('pointerenter', enter);
  svg.addEventListener('pointerleave', leave);

  let rafId = 0;
  const loop = () => { step(); rafId = requestAnimationFrame(loop); };
  const reduced = prefersReduced();
  if (!reduced && typeof requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(loop);
  }
  write(); // initial flat line

  return {
    pluck(strength = pluckDefault) { if (!reduced) state.impulse = Math.max(state.impulse, strength); },
    setVelocitySource(fn) { velocitySource = fn; },
    tickForTest() { step(); },
    destroy() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      svg.removeEventListener('pointerenter', enter);
      svg.removeEventListener('pointerleave', leave);
    },
  };
}
