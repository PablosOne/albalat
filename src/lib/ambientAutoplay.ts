import { featuredAlbum } from '@/data/discography';
import { buildQueue, getNowPlaying } from '@/lib/nowPlaying';
import { CONSENT_EVENT, hasConsent, type ConsentPreferences } from '@/lib/consent';
import { PLAYBACK_CHANGE_EVENT } from '@/lib/mediaPlayback';

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

  const disarm = () => {
    window.removeEventListener('pointerdown', onActivation, true);
    window.removeEventListener('keydown', onActivation, true);
    window.removeEventListener('touchstart', onActivation, true);
    window.removeEventListener('click', onClick);
    window.removeEventListener('wheel', onScrollGesture);
    window.removeEventListener('touchmove', onScrollGesture);
    window.removeEventListener(CONSENT_EVENT, onConsent);
    window.removeEventListener(PLAYBACK_CHANGE_EVENT, onPlaybackChange);
  };

  const startAmbient = (muted: boolean) => {
    // Audio previews are fetched from Apple/Spotify. A general page gesture is
    // not consent to contact those providers, so keep the player armed but
    // dormant until the visitor has enabled external media.
    if (!hasConsent('externalMedia')) return;
    const engine = getNowPlaying();
    const state = engine.getState();

    // A visible track is an explicit visitor choice and always wins.
    if (state.track && state.visible) {
      disarm();
      return;
    }

    if (state.track) {
      if (!muted) {
        engine.setMuted(false);
        if (state.isPaused) engine.toggle();
        disarm();
      }
      return;
    }

    // Scrolling is not a browser user-activation gesture, so start muted in
    // that case. Muted media may autoplay and can be unmuted by the next real
    // activation without creating a second player or queue.
    if (muted) engine.setMuted(true);
    engine.load(buildQueue(featuredAlbum), 0, { ambient: true });
    if (!muted) disarm();
  };

  const isInteractive = (event: Event) => {
    const target = event.target as Element | null;
    return !!target?.closest?.('a, button, input, select, textarea, [role="button"]');
  };

  // Start synchronously so browsers retain the gesture's autoplay permission.
  // Interactive controls wait for their click handler first, allowing an
  // explicit track selection to take precedence over ambient playback.
  const onActivation = (event: Event) => {
    if (!isInteractive(event)) startAmbient(false);
  };
  const onClick = () => startAmbient(false);
  const onScrollGesture = () => startAmbient(true);

  // The pointerdown for an Accept/Save button happens before its click handler
  // stores consent. React to that synchronous consent event too, while the same
  // user activation is still live, instead of requiring another page gesture.
  const onConsent = (event: Event) => {
    const consent = (event as CustomEvent<ConsentPreferences>).detail;
    if (consent?.externalMedia) startAmbient(false);
  };

  // An explicit video choice owns playback just like an explicit music choice.
  // In particular, do not let the ambient window click handler start music
  // immediately after the video facade's own click handler has started video.
  const onPlaybackChange = (event: Event) => {
    const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
    if (kind === 'video') disarm();
  };

  // pointerdown covers mouse + touch on modern browsers; touchstart is a
  // fallback for older mobile Safari. Click runs after interactive controls,
  // and wheel/touchmove provide the muted scroll fallback.
  window.addEventListener('pointerdown', onActivation, { capture: true });
  window.addEventListener('keydown', onActivation, { capture: true });
  window.addEventListener('touchstart', onActivation, { capture: true });
  window.addEventListener('click', onClick);
  window.addEventListener('wheel', onScrollGesture, { passive: true });
  window.addEventListener('touchmove', onScrollGesture, { passive: true });
  window.addEventListener(CONSENT_EVENT, onConsent);
  window.addEventListener(PLAYBACK_CHANGE_EVENT, onPlaybackChange);
}
