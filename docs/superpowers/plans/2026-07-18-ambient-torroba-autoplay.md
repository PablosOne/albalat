# Ambient Torroba Autoplay + Floating Sound Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start the featured Torroba album playing on the visitor's first gesture without showing the bottom now-playing bar, controlled by a floating mute/unmute button that hands off to the full bar when the visitor plays from the music tab.

**Architecture:** One shared engine singleton (`window.__nowPlaying`) gains an "ambient" play mode (plays but keeps the bar hidden) plus mute state. A bootstrap module arms a once-per-session first-gesture listener that ambient-loads Torroba. A persisted floating-button component subscribes to the engine, showing only in the ambient state and toggling mute.

**Tech Stack:** Astro 5, TypeScript, Vitest (unit), Tailwind utility classes + scoped `<style>`.

## Global Constraints

- Bilingual: `es` (default) and `en`. Persisted UI resolves the active locale from `document.documentElement.lang` (NOT a serialized `data-*` attribute), same as `NowPlayingBar.astro`.
- The engine is a browser singleton surviving `ClientRouter` page swaps; persisted DOM nodes use `transition:persist` and re-bind with a `data-bound` guard on `astro:page-load`.
- Respect `prefers-reduced-motion: reduce` — no looping animation.
- Do NOT add E2E/browser tests (project rule: no browser testing unless asked). Unit tests only.
- No changes to the bottom bar's controls; mute lives only on the floating toggle.

---

### Task 1: Engine — ambient play mode + mute state

**Files:**
- Modify: `src/lib/nowPlaying.ts`
- Test: `tests/unit/nowPlaying.test.ts`

**Interfaces:**
- Consumes: existing `buildQueue`, `createEngine`, `PlayerState`, `AudioLike`.
- Produces:
  - `AudioLike` gains `muted: boolean`.
  - `PlayerState` gains `muted: boolean`.
  - `NowPlayingEngine` gains `loadAmbient(queue: PlayerTrack[], index: number): void`, `setMuted(m: boolean): void`, `toggleMute(): void`.

- [ ] **Step 1: Update the mock audio in the test to carry `muted`**

In `tests/unit/nowPlaying.test.ts`, change the object returned by `mockAudio()` to include `muted: false` in its initial literal (add it next to `paused: true`):

```ts
    src: '', currentTime: 0, duration: 0, paused: true, muted: false,
```

- [ ] **Step 2: Write the failing tests**

Append these tests inside the `describe('createEngine', ...)` block in `tests/unit/nowPlaying.test.ts`:

```ts
  it('loadAmbient plays the track but keeps the bar hidden', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.loadAmbient(buildQueue(torroba), 0);
    const s = engine.getState();
    expect(s.visible).toBe(false);
    expect(s.track?.title).toContain('Turégano');
    expect(audio.play).toHaveBeenCalled();
  });

  it('ambient playback stays hidden across auto-advance', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.loadAmbient(buildQueue(torroba), 0);
    audio.emit('ended');
    expect(engine.getState().index).toBe(1);
    expect(engine.getState().visible).toBe(false);
  });

  it('a normal load after ambient reveals the bar', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.loadAmbient(buildQueue(torroba), 0);
    engine.load(buildQueue(torroba), 1);
    expect(engine.getState().visible).toBe(true);
  });

  it('setMuted and toggleMute flip state.muted and audio.muted', () => {
    const audio = mockAudio();
    const engine = createEngine({ audio });
    engine.loadAmbient(buildQueue(torroba), 0);
    expect(engine.getState().muted).toBe(false);
    engine.toggleMute();
    expect(engine.getState().muted).toBe(true);
    expect(audio.muted).toBe(true);
    engine.setMuted(false);
    expect(engine.getState().muted).toBe(false);
    expect(audio.muted).toBe(false);
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test -- nowPlaying`
Expected: FAIL — `engine.loadAmbient is not a function` (and `toggleMute`/`setMuted` undefined).

- [ ] **Step 4: Add `muted` to the `AudioLike` interface**

In `src/lib/nowPlaying.ts`, add `muted: boolean;` to the `AudioLike` interface (next to `paused: boolean;`):

```ts
export interface AudioLike {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, cb: () => void): void;
}
```

Also update `stubAudio()` at the bottom of the file to include `muted: false`:

```ts
function stubAudio(): AudioLike {
  return { src: '', currentTime: 0, duration: 0, paused: true, muted: false, play: async () => {}, pause: () => {}, addEventListener: () => {} };
}
```

- [ ] **Step 5: Add `muted` to `PlayerState` and the engine interface**

In `src/lib/nowPlaying.ts`, add `muted: boolean;` to the `PlayerState` interface (after `visible: boolean;`):

```ts
  visible: boolean;
  muted: boolean;
```

And add the three new methods to the `NowPlayingEngine` interface (after `load(...)`):

```ts
  load(queue: PlayerTrack[], index: number): void;
  loadAmbient(queue: PlayerTrack[], index: number): void;
  setMuted(m: boolean): void;
  toggleMute(): void;
```

- [ ] **Step 6: Implement ambient mode + mute in `createEngine`**

In `createEngine`, add `muted: false` to the initial `state` literal:

```ts
    position: 0, duration: 0, mode: 'preview', provider: null, visible: false, muted: false,
```

Add an `ambient` flag above the `state` declaration:

```ts
  let queue: PlayerTrack[] = [];
  let ambient = false;
```

Change the `state.visible = true;` line inside `playIndex` to honor the flag:

```ts
    state.visible = !ambient;
```

In the returned object, update `load` and add the new methods. `load` must clear the ambient flag; `close` must also clear it:

```ts
    load(q, index) { ambient = false; queue = q; state.queueLength = q.length; playIndex(index); },
    loadAmbient(q, index) { ambient = true; queue = q; state.queueLength = q.length; playIndex(index); },
    setMuted(m) { audio.muted = m; state.muted = m; emit(); },
    toggleMute() { audio.muted = !state.muted; state.muted = !state.muted; emit(); },
```

And add `ambient = false;` to the start of the existing `close` method body:

```ts
    close() { ambient = false; audio.pause(); state.isPaused = true; state.visible = false; state.mode = 'preview'; state.provider = null; emit(); },
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm test -- nowPlaying`
Expected: PASS — all `nowPlaying` tests green (existing + 4 new).

- [ ] **Step 8: Commit**

```bash
git add src/lib/nowPlaying.ts tests/unit/nowPlaying.test.ts
git commit -m "feat: add ambient play mode and mute state to now-playing engine"
```

---

### Task 2: First-gesture autoplay bootstrap

**Files:**
- Create: `src/lib/ambientAutoplay.ts`

**Interfaces:**
- Consumes: `featuredAlbum` from `@/data/discography`; `buildQueue`, `getNowPlaying` from `@/lib/nowPlaying` (with `loadAmbient` from Task 1).
- Produces: `initAmbientAutoplay(): void`.

- [ ] **Step 1: Create the bootstrap module**

Create `src/lib/ambientAutoplay.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck the new module**

Run: `pnpm check`
Expected: PASS — no `astro check` type errors (module compiles; `loadAmbient` resolves against Task 1's engine interface).

- [ ] **Step 3: Commit**

```bash
git add src/lib/ambientAutoplay.ts
git commit -m "feat: add first-gesture ambient autoplay bootstrap"
```

---

### Task 3: Floating sound toggle component

**Files:**
- Create: `src/components/AmbientToggle.astro`

**Interfaces:**
- Consumes: `getNowPlaying`, `PlayerState` from `@/lib/nowPlaying` (with `muted` + `toggleMute` from Task 1).
- Produces: an `<AmbientToggle locale={locale} />` component; renders `#ambient-toggle`.

- [ ] **Step 1: Create the component markup + styles + script**

Create `src/components/AmbientToggle.astro`:

```astro
---
interface Props {
  locale: 'es' | 'en';
}
const { locale } = Astro.props;
const copy = {
  es: { mute: 'Silenciar música', unmute: 'Activar sonido' },
  en: { mute: 'Mute music', unmute: 'Unmute' },
}[locale];
---
<button
  id="ambient-toggle"
  transition:persist="ambient-toggle"
  type="button"
  data-active="false"
  data-muted="false"
  hidden
  aria-pressed="false"
  aria-label={copy.mute}
  class="ambient-toggle"
>
  <span class="ambient-toggle__bars" aria-hidden="true">
    <span></span><span></span><span></span><span></span>
  </span>
</button>

<style>
  .ambient-toggle {
    position: fixed;
    top: max(1.5rem, env(safe-area-inset-top));
    left: max(1.5rem, env(safe-area-inset-left));
    z-index: 50;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border: 1px solid rgba(244, 239, 231, 0.16);
    border-radius: 999px;
    background: rgba(11, 10, 9, 0.72);
    color: var(--color-accent, #d9a441);
    box-shadow: 0 0.75rem 2.5rem rgba(0, 0, 0, 0.28), 0 0 0 0 rgba(198, 146, 62, 0);
    backdrop-filter: blur(18px) saturate(125%);
    -webkit-backdrop-filter: blur(18px) saturate(125%);
    cursor: pointer;
    opacity: 0;
    transform: translateY(-0.4rem) scale(0.94);
    transition: opacity 320ms ease, transform 420ms cubic-bezier(.22,1,.36,1),
      box-shadow 320ms ease, border-color 320ms ease;
  }

  .ambient-toggle[data-active='true'] {
    opacity: 1;
    transform: translateY(0) scale(1);
    box-shadow: 0 0.75rem 2.5rem rgba(0, 0, 0, 0.28), 0 0 1.4rem rgba(198, 146, 62, 0.28);
  }

  .ambient-toggle:hover,
  .ambient-toggle:focus-visible {
    border-color: var(--color-accent, #d9a441);
    outline: none;
  }

  .ambient-toggle__bars {
    display: flex;
    align-items: flex-end;
    gap: 0.18rem;
    height: 1.1rem;
  }

  .ambient-toggle__bars span {
    width: 0.18rem;
    height: 100%;
    border-radius: 999px;
    background: currentColor;
    transform-origin: bottom;
    animation: ambient-eq 900ms ease-in-out infinite;
  }

  .ambient-toggle__bars span:nth-child(1) { animation-delay: -200ms; }
  .ambient-toggle__bars span:nth-child(2) { animation-delay: -520ms; }
  .ambient-toggle__bars span:nth-child(3) { animation-delay: -80ms; }
  .ambient-toggle__bars span:nth-child(4) { animation-delay: -360ms; }

  /* Muted: bars stop and flatten to a quiet baseline. */
  .ambient-toggle[data-muted='true'] {
    color: rgba(244, 239, 231, 0.5);
  }

  .ambient-toggle[data-muted='true'] .ambient-toggle__bars span {
    animation: none;
    transform: scaleY(0.22);
  }

  @keyframes ambient-eq {
    0%, 100% { transform: scaleY(0.28); }
    50% { transform: scaleY(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .ambient-toggle,
    .ambient-toggle__bars span {
      transition-duration: 0.01ms;
      animation: none;
    }
    .ambient-toggle:not([data-muted='true']) .ambient-toggle__bars span {
      transform: scaleY(0.7);
    }
  }
</style>

<script>
  import { getNowPlaying, type PlayerState } from '@/lib/nowPlaying';

  // Copy is inlined (not read off a data-* attribute) because #ambient-toggle
  // carries transition:persist: the persisted node is reused across navigations,
  // so any serialized locale would freeze. Resolve locale from <html lang>, which
  // Astro keeps fresh on every swap — same approach as NowPlayingBar.astro.
  const COPY: Record<'es' | 'en', { mute: string; unmute: string }> = {
    es: { mute: 'Silenciar música', unmute: 'Activar sonido' },
    en: { mute: 'Mute music', unmute: 'Unmute' },
  };
  const currentLocale = (): 'es' | 'en' =>
    document.documentElement.lang.startsWith('en') ? 'en' : 'es';

  const initAmbientToggle = () => {
    const btn = document.getElementById('ambient-toggle');
    if (!btn) return;

    const copy = COPY[currentLocale()];
    const applyLabel = (muted: boolean) =>
      btn.setAttribute('aria-label', muted ? copy.unmute : copy.mute);

    // Re-apply the current locale's label on every page-load, even when already
    // bound, so the persisted node's label follows navigation.
    if (btn.dataset.bound === 'true') {
      applyLabel(btn.dataset.muted === 'true');
      return;
    }
    btn.dataset.bound = 'true';

    const engine = getNowPlaying();
    btn.addEventListener('click', () => engine.toggleMute());

    const render = (s: PlayerState) => {
      const isAmbient = !!s.track && !s.visible;
      btn.hidden = !isAmbient;
      btn.dataset.active = String(isAmbient);
      btn.dataset.muted = String(s.muted);
      btn.setAttribute('aria-pressed', String(s.muted));
      applyLabel(s.muted);
    };

    engine.subscribe(render);
    render(engine.getState());
  };

  initAmbientToggle();
  document.addEventListener('astro:page-load', initAmbientToggle);
</script>
```

- [ ] **Step 2: Typecheck the component**

Run: `pnpm check`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AmbientToggle.astro
git commit -m "feat: add floating ambient sound toggle component"
```

---

### Task 4: Wire into the layout + verify build

**Files:**
- Modify: `src/layouts/Base.astro`

**Interfaces:**
- Consumes: `AmbientToggle` component (Task 3), `initAmbientAutoplay` (Task 2).

- [ ] **Step 1: Import and render the toggle**

In `src/layouts/Base.astro`, add the import next to the existing `NowPlayingBar` import in the frontmatter (top `---` block):

```ts
import NowPlayingBar from '@/components/NowPlayingBar.astro';
import AmbientToggle from '@/components/AmbientToggle.astro';
```

Render it right after `<NowPlayingBar locale={locale} />` (line ~76):

```astro
    <NowPlayingBar locale={locale} />
    <AmbientToggle locale={locale} />
```

- [ ] **Step 2: Initialize the autoplay bootstrap**

In the `<script>` block of `src/layouts/Base.astro`, add the import alongside the other `@/lib/*` imports at the top of the block:

```ts
      import { initSignature } from '@/lib/string';
      import { initAmbientAutoplay } from '@/lib/ambientAutoplay';
```

Then add a single call after the imports, before the `let teardown` declaration (its internal guard makes it safe to run once here — the module script runs on first load, which is exactly "the first page the visitor lands on"):

```ts
      initAmbientAutoplay();
```

- [ ] **Step 3: Run the full unit suite**

Run: `pnpm test`
Expected: PASS — all unit tests green.

- [ ] **Step 4: Typecheck + i18n key validation**

Run: `pnpm check`
Expected: PASS — `astro check` and i18n-key validation both clean.

- [ ] **Step 5: Production build**

Run: `pnpm build`
Expected: build completes with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat: wire ambient autoplay bootstrap and floating toggle into layout"
```

---

## Self-Review Notes

- **Spec coverage:** ambient play mode + mute (Task 1) → engine section; first-gesture once-per-session bootstrap (Task 2) → bootstrap section; floating top-left toggle with equalizer animation + reduced-motion + bilingual persisted copy (Task 3) → toggle section; hand-off (toggle hidden when `visible`) is enforced by `render`'s `!s.track || s.visible` logic + `load()` clearing `ambient`; wiring (Task 4) → `Base.astro`. Bottom-bar unchanged (no task touches `NowPlayingBar.astro`).
- **Type consistency:** `loadAmbient`, `setMuted`, `toggleMute`, `PlayerState.muted`, `AudioLike.muted` are defined in Task 1 and consumed identically in Tasks 2–3.
- **No E2E** per project rule; engine behavior is covered by unit tests.
