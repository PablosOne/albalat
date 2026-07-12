/** Viewport / motion-mode helpers. The single source of truth for the media
 *  queries that used to be duplicated across showcase.ts and lanes.ts. `win`
 *  is injectable so the logic is unit-testable without a real browser. */
import { MOBILE_BREAKPOINT_PX } from '@/lib/config';

type Win = { matchMedia: (q: string) => { matches: boolean } };

export function isMobileViewport(win: Win = window): boolean {
  return win.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
}

export function prefersReducedMotion(win: Win = window): boolean {
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** How a detail lane should open at the current viewport / preference:
 *  - 'descend' : desktop pinned lane — detail rises from below (Y slide)
 *  - 'slide'   : mobile — detail enters from the right (X slide)
 *  - 'inline'  : reduced-motion — detail revealed inline in the vertical stack */
export type LaneMotion = 'descend' | 'slide' | 'inline';

export function laneMotion(win: Win = window): LaneMotion {
  if (prefersReducedMotion(win)) return 'inline';
  if (isMobileViewport(win)) return 'slide';
  return 'descend';
}
