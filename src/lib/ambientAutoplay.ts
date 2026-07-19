import { featuredAlbum } from '@/data/discography';
import { buildQueue, getNowPlaying } from '@/lib/nowPlaying';
import { hasConsent } from '@/lib/consent';

/**
 * Arms a first-user-gesture start of the featured (Torroba) album in ambient
 * mode (playing, bottom bar hidden). Audible autoplay is blocked by browsers,
 * so we wait for the visitor's first pointer/key gesture and start with sound
 * then.
 *
 * Scope is per document load, not per browser session: this runs exactly once
 * per full page load (it is called from Base.astro's persisted-once script,
 * which ClientRouter does NOT re-execute on in-app navigations — the engine
 * singleton keeps the music playing across those swaps without re-arming). A
 * hard reload, by contrast, tears down the engine and stops playback, so we
 * deliberately re-arm on every reload so the ambient bed can start again. The
 * in-memory guard below only prevents a double-arm within a single document
 * lifetime.
 */
export function initAmbientAutoplay(): void {
  if (typeof window === 'undefined') return;

  const w = window as unknown as { __ambientAutoplayInit?: boolean };
  if (w.__ambientAutoplayInit) return;
  w.__ambientAutoplayInit = true;

  const arm = () => {
    // Audio previews are fetched from Apple/Spotify. A general page gesture is
    // not consent to contact those providers, so keep the player armed but
    // dormant until the visitor has enabled external media.
    if (!hasConsent('externalMedia')) return;
    window.removeEventListener('pointerdown', arm, true);
    window.removeEventListener('keydown', arm, true);
    window.removeEventListener('touchstart', arm, true);

    // Defer to the next tick so that if this very gesture was a click on a
    // discography play button, that handler loads its album first and we bail
    // instead of stomping the visitor's explicit choice with Torroba.
    setTimeout(() => {
      const engine = getNowPlaying();
      if (engine.getState().track) return;
      engine.loadAmbient(buildQueue(featuredAlbum), 0);
    }, 0);
  };

  // pointerdown covers mouse + touch on modern browsers; touchstart is a belt-
  // and-suspenders fallback for older mobile Safari. keydown covers keyboard-
  // first visitors. (A wheel/scroll is not a user-activation gesture, so audio
  // cannot start from it — a real click/tap/key press is required.)
  window.addEventListener('pointerdown', arm, { capture: true });
  window.addEventListener('keydown', arm, { capture: true });
  window.addEventListener('touchstart', arm, { capture: true });
}
