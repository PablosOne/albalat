/**
 * Global pointer tracker.
 *
 * One window-level pointermove listener feeds a shared rAF loop that smoothly
 * lerps the reported position. Components subscribe with a callback and
 * receive both the raw and smoothed pointer state every frame, even when the
 * pointer is outside the component's bounds — which lets enter/leave
 * transitions ease naturally instead of snapping.
 */

export interface PointerState {
  /** Raw viewport coords in CSS pixels. */
  x: number;
  y: number;
  /** Smoothed (lerped) viewport coords. Use these for visual effects. */
  smoothX: number;
  smoothY: number;
  /** Whether the pointer has interacted with the page yet. */
  active: boolean;
}

type Listener = (state: PointerState) => void;

const SMOOTHING = 0.18; // higher = snappier, lower = floatier

const state: PointerState = {
  x: 0,
  y: 0,
  smoothX: 0,
  smoothY: 0,
  active: false,
};

const listeners = new Set<Listener>();
let rafId = 0;
let started = false;

function tick() {
  state.smoothX += (state.x - state.smoothX) * SMOOTHING;
  state.smoothY += (state.y - state.smoothY) * SMOOTHING;
  listeners.forEach((l) => l(state));
  rafId = requestAnimationFrame(tick);
}

function onPointerMove(ev: PointerEvent) {
  state.x = ev.clientX;
  state.y = ev.clientY;
  if (!state.active) {
    state.active = true;
    // On first move, snap smoothed values so we don't sweep in from (0,0).
    state.smoothX = ev.clientX;
    state.smoothY = ev.clientY;
  }
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Initialise to viewport centre so effects rest in a neutral state pre-input.
  state.x = state.smoothX = window.innerWidth / 2;
  state.y = state.smoothY = window.innerHeight / 2;
  // Touch devices never fire `pointermove` for hover-style tracking; the rAF
  // tick would spin forever doing nothing. Subscribers receive their initial
  // (centre) state callback on subscribe and nothing further — the same
  // result as a hover that never moves.
  if (window.matchMedia('(pointer: coarse)').matches) return;
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  rafId = requestAnimationFrame(tick);
}

/** Subscribe to per-frame pointer updates. Returns an unsubscribe function. */
export function subscribePointer(listener: Listener): () => void {
  start();
  listeners.add(listener);
  // Fire once so subscribers can initialise.
  listener(state);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      window.removeEventListener('pointermove', onPointerMove);
      started = false;
    }
  };
}
