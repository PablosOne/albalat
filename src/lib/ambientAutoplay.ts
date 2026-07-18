import { featuredAlbum } from '@/data/discography';
import { buildQueue, getNowPlaying } from '@/lib/nowPlaying';

const ARM_KEY = 'albalat:ambient-armed';

/**
 * Arms a once-per-session, first-user-gesture start of the featured (Torroba)
 * album in ambient mode (playing, bottom bar hidden). Audible autoplay is
 * blocked by browsers, so we wait for the visitor's first pointer/key gesture
 * and start with sound then. Safe to call on every astro:page-load — guarded.
 */
export function initAmbientAutoplay(): void {
  if (typeof window === 'undefined') return;

  const w = window as unknown as { __ambientAutoplayInit?: boolean };
  if (w.__ambientAutoplayInit) return;
  w.__ambientAutoplayInit = true;

  try {
    if (sessionStorage.getItem(ARM_KEY)) return;
  } catch {
    // sessionStorage unavailable (private mode / disabled) — proceed without it.
  }

  const arm = () => {
    window.removeEventListener('pointerdown', arm, true);
    window.removeEventListener('keydown', arm, true);
    try { sessionStorage.setItem(ARM_KEY, '1'); } catch { /* ignore */ }

    // Defer to the next tick so that if this very gesture was a click on a
    // discography play button, that handler loads its album first and we bail
    // instead of stomping the visitor's explicit choice with Torroba.
    setTimeout(() => {
      const engine = getNowPlaying();
      if (engine.getState().track) return;
      engine.loadAmbient(buildQueue(featuredAlbum), 0);
    }, 0);
  };

  window.addEventListener('pointerdown', arm, { once: true, capture: true });
  window.addEventListener('keydown', arm, { once: true, capture: true });
}
