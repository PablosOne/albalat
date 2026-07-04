# Albalat Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an elegant, bilingual, SEO- and conversion-optimized website for classical guitarist Eulogio Albalat, featuring a horizontal "stage" home that switches to vertical detail pages, a discography-by-album media library (Spotify/Apple Music/YouTube), a guitar-knowledge hub, and inquiry forms for private classes and concert bookings.

**Architecture:** Astro static site reusing gfdu's proven `showcase` engine (GSAP ScrollTrigger pinned horizontal scrub + Lenis smooth scroll, with built-in mobile vertical-stack and reduced-motion fallbacks) for the horizontal Home; Astro View Transitions animate a 90° "lane switch" into vertical detail pages. Content lives in typed data files (`{ es, en }` prose) plus namespaced JSON message files (rondo's i18n pattern) validated by a ported key-parity script. Hosted free on Cloudflare Pages.

**Tech Stack:** Astro 5, Tailwind v4 (`@tailwindcss/vite`), GSAP + ScrollTrigger, Lenis, Astro i18n routing + View Transitions, `@astrojs/sitemap`, Web3Forms (inquiries), Cloudflare Web Analytics, Vitest + Playwright.

## Global Constraints

- **Node/package manager:** pnpm (matches gfdu/rondo). `pnpm` scripts only.
- **Astro version floor:** `astro@^5.5.0`. **Tailwind:** `tailwindcss@^4.2.4` via `@tailwindcss/vite`.
- **Output:** `output: 'static'`. No SSR runtime. Forms use third-party (Web3Forms); no server code.
- **No external runtime assets:** self-host all fonts (`/public/fonts/*.woff2`, `font-display: swap`); no CDN `<link>`/`<script>` for fonts or libs. Embeds (YouTube/Spotify/Apple) load only via click-to-load facades.
- **Languages:** Spanish (`es`, canonical/default) + English (`en`). Routes `/` (es) and `/en/…`. Every UI string in both `es.json` and `en.json`; **build fails if keys diverge** (parity script in `pnpm check`).
- **Prose in data files** uses `{ es: string; en: string }` (or `{es:string[];en:string[]}` for paragraph arrays).
- **Voice of all copy:** professional, elegant, polite, human; ES and EN each idiomatic/native, not literal translations.
- **Accessibility:** WCAG AA contrast; keyboard nav; `prefers-reduced-motion` → vertical stack + fades, no scroll-jacking.
- **SEO on every page:** unique `<title>`, meta description, canonical, hreflang (`es`/`en`/`x-default`), Open Graph + Twitter card, relevant JSON-LD; `sitemap.xml` + `robots.txt`.
- **Path alias:** `@/*` → `src/*` (tsconfig `baseUrl: "."`).
- **Commits:** frequent, one per task minimum; end messages with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Placeholder assets:** until real media arrives, copy images from `../gfdu/src/assets/images/` or `../rondo/public/`; album covers/portraits use these as stand-ins with clear `TODO-ASSET` alt notes.

---

## File Structure

```
albalat/
├─ astro.config.mjs            # static, tailwind vite, sitemap, i18n config
├─ tsconfig.json               # strict, @/* alias
├─ package.json                # pnpm scripts incl. check (astro check + i18n parity)
├─ playwright.config.ts        # smoke tests
├─ scripts/
│  └─ check-i18n-keys.ts       # PORTED from rondo, framework-agnostic
├─ public/
│  ├─ fonts/                   # self-hosted woff2 (serif display + sans)
│  ├─ robots.txt
│  ├─ favicon.svg
│  └─ images/                  # placeholder + real assets, og images
├─ src/
│  ├─ i18n/
│  │  ├─ es.json               # namespaced UI strings (canonical)
│  │  ├─ en.json
│  │  └─ index.ts              # useTranslations(locale), LOCALES, getLocale(url)
│  ├─ data/
│  │  ├─ site.ts               # config, nav, hero, socials, stations ({es,en} prose)
│  │  ├─ discography.ts        # Album[] (Phase 2)
│  │  ├─ videos.ts             # Video[] (Phase 3)
│  │  └─ guitar-notes.ts       # GuitarNote[] (Phase 3)
│  ├─ lib/                     # PORTED from gfdu, reskinned
│  │  ├─ config.ts   scroll.ts   showcase.ts
│  │  ├─ showcase.desktop.ts   showcase.mobile.ts
│  │  ├─ motion.ts   panelWash.ts   pointer.ts
│  │  ├─ anchorScroll.ts   textHighlight.ts
│  │  └─ string.ts             # NEW: signature vibrating-string animation
│  ├─ components/
│  │  ├─ Seo.astro             # NEW: per-page meta+hreflang+OG+JSON-LD
│  │  ├─ LangToggle.astro      # NEW
│  │  ├─ Nav.astro   HUD.astro   Wordmark.astro   TextReveal.astro
│  │  ├─ Stage.astro           # NEW: horizontal showcase wrapper (Home)
│  │  ├─ Station*.astro        # station panels (hero/about/music/…)
│  │  ├─ Embed.astro           # NEW: click-to-load facade (Phase 2/3)
│  │  └─ InquiryForm.astro     # NEW (Phase 4)
│  ├─ layouts/
│  │  ├─ Base.astro            # SEO head + global scripts (PORTED, generalized)
│  │  └─ Detail.astro          # NEW: vertical detail-page layout + View Transition
│  ├─ pages/
│  │  ├─ index.astro           # es Home (horizontal stage)
│  │  ├─ about.astro   music.astro   videos.astro   guitar.astro
│  │  ├─ classes.astro   contact.astro   404.astro
│  │  └─ en/                   # English mirror of every route
│  └─ styles/global.css        # PORTED, reskinned tokens/theme
└─ tests/
   ├─ unit/                    # data integrity, i18n parity, useTranslations
   └─ e2e/                     # Playwright smoke
```

---

# PHASE 0 — Foundation

Delivers: a deployed, bilingual, SEO-capable Astro skeleton with the ported animation libs available. End state: `pnpm build` + `pnpm check` pass; skeleton live on Cloudflare Pages.

### Task 0.1: Scaffold project, dependencies, config

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore` (exists), `src/env.d.ts`

**Interfaces:**
- Produces: pnpm scripts `dev`, `build`, `preview`, `check`, `test`, `test:e2e`; `@/*` alias.

- [ ] **Step 1: Create `package.json`** (copy dep versions from `../gfdu/package.json`)

```json
{
  "name": "albalat",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check && tsx scripts/check-i18n-keys.ts",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@astrojs/sitemap": "^3.7.2",
    "astro": "^5.5.0",
    "gsap": "^3.15.0",
    "lenis": "^1.3.23"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "@playwright/test": "^1.59.1",
    "@tailwindcss/vite": "^4.2.4",
    "playwright": "^1.59.1",
    "sharp": "^0.34.5",
    "tailwindcss": "^4.2.4",
    "tsx": "^4.19.2",
    "typescript": "^5.4.0",
    "vitest": "^1.6.1"
  },
  "pnpm": { "onlyBuiltDependencies": ["esbuild", "sharp"] }
}
```

- [ ] **Step 2: Create `astro.config.mjs`** (i18n routing: es default at root, en prefixed)

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://albalat.pages.dev', // TODO: swap to final domain
  output: 'static',
  build: { inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false }, // es at /, en at /en/
  },
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap({ i18n: { defaultLocale: 'es', locales: { es: 'es-ES', en: 'en-US' } } })],
});
```

- [ ] **Step 3: Create `tsconfig.json`** (copy from `../gfdu/tsconfig.json`, drop the React jsx lines — not needed)

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "allowJs": true,
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*", "astro.config.mjs"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Create `src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
```

- [ ] **Step 5: Install and verify build**

Run: `cd /c/Users/pablo/Projects/albalat && pnpm install`
Expected: installs without error.

- [ ] **Step 6: Add a temporary `src/pages/index.astro`** so build has a page

```astro
---
---
<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Albalat</title></head><body><h1>Albalat</h1></body></html>
```

- [ ] **Step 7: Verify build**

Run: `pnpm build`
Expected: build completes, `dist/index.html` emitted.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: scaffold Astro project with i18n + tailwind config"
```

---

### Task 0.2: i18n helper, message files, ported parity script

**Files:**
- Create: `src/i18n/es.json`, `src/i18n/en.json`, `src/i18n/index.ts`, `scripts/check-i18n-keys.ts`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces:
  - `LOCALES = ['es','en'] as const`; `type Locale = 'es'|'en'`
  - `getLocaleFromUrl(url: URL): Locale`
  - `useTranslations(locale: Locale): (key: string) => string` — dot-path lookup, falls back to `es` then returns key.

- [ ] **Step 1: Port `scripts/check-i18n-keys.ts` from rondo** (read `../rondo/scripts/check-i18n-keys.ts`), changing `MESSAGES_DIR` to `join(process.cwd(), 'src/i18n')` and comparing only `es.json`/`en.json`. Keep the recursive `collectKeys` logic; exit 1 on any key present in one locale but missing in the other, printing the diff.

- [ ] **Step 2: Create seed `src/i18n/es.json`**

```json
{
  "nav": { "home": "Inicio", "about": "Biografía", "music": "Música", "videos": "Vídeos", "guitar": "La guitarra", "classes": "Clases y conciertos", "contact": "Contacto" },
  "cta": { "listen": "Escuchar", "bookConcert": "Reservar un concierto", "bookClass": "Reservar una clase" },
  "a11y": { "skipToContent": "Saltar al contenido", "toggleLang": "English" }
}
```

- [ ] **Step 3: Create `src/i18n/en.json`** (same keys, English values; `a11y.toggleLang` = `"Español"`)

```json
{
  "nav": { "home": "Home", "about": "About", "music": "Music", "videos": "Videos", "guitar": "The Guitar", "classes": "Classes & Concerts", "contact": "Contact" },
  "cta": { "listen": "Listen", "bookConcert": "Book a concert", "bookClass": "Book a private class" },
  "a11y": { "skipToContent": "Skip to content", "toggleLang": "Español" }
}
```

- [ ] **Step 4: Create `src/i18n/index.ts`**

```ts
import es from './es.json';
import en from './en.json';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

const DICTS: Record<Locale, unknown> = { es, en };

export function getLocaleFromUrl(url: URL): Locale {
  const seg = url.pathname.split('/').filter(Boolean)[0];
  return (LOCALES as readonly string[]).includes(seg as string) ? (seg as Locale) : DEFAULT_LOCALE;
}

function lookup(dict: unknown, key: string): string | undefined {
  return key.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), dict) as string | undefined;
}

export function useTranslations(locale: Locale) {
  return (key: string): string => lookup(DICTS[locale], key) ?? lookup(DICTS[DEFAULT_LOCALE], key) ?? key;
}
```

- [ ] **Step 5: Write failing test `tests/unit/i18n.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { useTranslations, getLocaleFromUrl } from '@/i18n';

describe('i18n', () => {
  it('resolves a key in the requested locale', () => {
    expect(useTranslations('en')('nav.music')).toBe('Music');
    expect(useTranslations('es')('nav.music')).toBe('Música');
  });
  it('falls back to es then to the raw key', () => {
    expect(useTranslations('en')('nav.missing')).toBe('nav.missing');
  });
  it('detects locale from url', () => {
    expect(getLocaleFromUrl(new URL('https://x/en/music'))).toBe('en');
    expect(getLocaleFromUrl(new URL('https://x/music'))).toBe('es');
  });
});
```

- [ ] **Step 6: Add `vitest.config.ts`** so `@/` resolves in tests

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node' },
});
```

- [ ] **Step 7: Run tests + parity**

Run: `pnpm test && pnpm exec tsx scripts/check-i18n-keys.ts`
Expected: tests PASS; parity exits 0.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: i18n helper, message files, ported key-parity script"
```

---

### Task 0.3: Theme + tokens + self-hosted fonts

**Files:**
- Create: `src/styles/global.css`, `public/fonts/*.woff2`
- Reference: `../gfdu/src/styles/global.css` (structure to adapt)

**Interfaces:**
- Produces CSS custom properties consumed everywhere: `--stage`, `--ink`, `--ink-muted`, `--accent` (cedar-gold), `--font-display`, `--font-sans`; Tailwind `@theme` tokens.

- [ ] **Step 1: Choose + add fonts.** Pick a refined serif display (e.g. Cormorant / Fraunces) + clean sans (e.g. Geist / Inter). Download woff2 weights to `public/fonts/`. (Interim: copy `../gfdu/public/fonts/Geist-*.woff2` for the sans; add a serif.)

- [ ] **Step 2: Create `src/styles/global.css`** — adapt gfdu's file: keep its reset/base and `@theme`, replace the palette with the stage/ink/cedar-gold tokens and `@font-face` declarations. Core tokens:

```css
@import "tailwindcss";
@font-face { font-family: "Display"; src: url("/fonts/Fraunces.woff2") format("woff2"); font-weight: 300 700; font-display: swap; }
@font-face { font-family: "Sans"; src: url("/fonts/Geist-Regular.woff2") format("woff2"); font-weight: 400; font-display: swap; }
:root {
  --stage: #0B0A09;      /* warm near-black */
  --ink: #F4EFE7;        /* ivory */
  --ink-muted: #B9AE9E;
  --accent: #C6923E;     /* cedar-gold */
  --font-display: "Display", Georgia, serif;
  --font-sans: "Sans", system-ui, sans-serif;
}
@theme {
  --color-stage: var(--stage);
  --color-ink: var(--ink);
  --color-accent: var(--accent);
  --font-display: var(--font-display);
  --font-sans: var(--font-sans);
}
html { background: var(--stage); color: var(--ink); font-family: var(--font-sans); }
```

- [ ] **Step 3: Verify dev renders theme** — temporarily import in index, run `pnpm dev`, confirm background/ink colors.

Run: `pnpm build`  Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: stage theme tokens + self-hosted fonts"
```

---

### Task 0.4: `Seo.astro` component + `Base.astro` layout + sitemap/robots + analytics

**Files:**
- Create: `src/components/Seo.astro`, `src/layouts/Base.astro`, `public/robots.txt`, `public/favicon.svg`
- Reference: `../gfdu/src/layouts/Base.astro`

**Interfaces:**
- `Seo.astro` props: `{ title: string; description: string; ogImage?: string; jsonLd?: object }`. Emits title/description/canonical, **hreflang alternates** for es/en/x-default (computed from `Astro.url`), OG + Twitter tags, and optional `<script type="application/ld+json">`.
- `Base.astro` props: `{ locale: Locale; title; description; ogImage?; jsonLd? }`. Renders `<html lang={locale}>`, includes `<Seo>`, font preloads, Cloudflare Web Analytics beacon, `<slot/>`, and the global init script (added in Task 0.5).

- [ ] **Step 1: Create `src/components/Seo.astro`.** Adapt the head of gfdu's Base.astro (canonical/OG/Twitter/JSON-LD already there). Add hreflang: for the current path, derive the es and en URLs (`/path` ↔ `/en/path`) and emit:

```astro
<link rel="alternate" hreflang="es" href={esURL} />
<link rel="alternate" hreflang="en" href={enURL} />
<link rel="alternate" hreflang="x-default" href={esURL} />
```

- [ ] **Step 2: Create `src/layouts/Base.astro`** wrapping `<Seo>`, font preloads (`<link rel=preload as=font ... crossorigin>` for the two woff2), theme-color meta, and the Cloudflare Web Analytics snippet (token via `import.meta.env.PUBLIC_CF_BEACON`, rendered only when set). Include `<slot/>`.

- [ ] **Step 3: Create `public/robots.txt`**

```
User-agent: *
Allow: /
Sitemap: https://albalat.pages.dev/sitemap-index.xml
```

- [ ] **Step 4: Add a placeholder `public/favicon.svg`** (simple cedar-gold monogram "EA").

- [ ] **Step 5: Point `index.astro` at `Base`**, pass locale/title/description; `pnpm build`.

Expected: `dist/index.html` has one `<title>`, canonical, hreflang pair, OG tags, sitemap emitted.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: SEO component, Base layout, sitemap/robots, analytics beacon"
```

---

### Task 0.5: Port animation libs (scroll, showcase, motion, config, helpers)

**Files:**
- Create by copying + adapting from `../gfdu/src/lib/`: `config.ts`, `scroll.ts`, `showcase.ts`, `showcase.desktop.ts`, `showcase.mobile.ts`, `motion.ts`, `panelWash.ts`, `pointer.ts`, `anchorScroll.ts`, `textHighlight.ts`
- Modify: `src/layouts/Base.astro` (add the global init `<script>`)

**Interfaces:**
- Consumes: DOM contract — a `<section data-showcase>` containing `<div data-showcase-track>` of `[data-showcase-panel]` elements, each with `data-showcase-panel-weight`, `data-showcase-panel-gap-after-px`, `data-showcase-panel-id`; optional `[data-parallax-x]`, `[data-hud-progress]`, `[data-about-headline]`.
- Produces: `initScroll()`, `initShowcase()`, `initAnchorScroll()`, `heroEntrance()`, `revealPanel(el)`, `revealProblemCard(el)` (names preserved from gfdu so ported modules stay consistent).

- [ ] **Step 1: Copy the ten lib files verbatim** from `../gfdu/src/lib/` into `src/lib/`. They use only `@/lib/*` imports and the DOM contract above — no gfdu-content coupling. Read each after copying; delete any gfdu-specific reveal helpers that reference panels we won't port (keep `revealPanel`, `revealProblemCard`, `heroEntrance`; drop space/brand-specific ones if present, and their imports).

- [ ] **Step 2: Add the global init script to `Base.astro`** (same shape as gfdu Base lines 105–124):

```astro
<script>
  import { initScroll } from '@/lib/scroll';
  import { heroEntrance } from '@/lib/motion';
  import { initShowcase } from '@/lib/showcase';
  import { initAnchorScroll } from '@/lib/anchorScroll';
  initScroll(); initAnchorScroll();
  const run = () => { heroEntrance(); initShowcase(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
</script>
```

- [ ] **Step 3: Typecheck**

Run: `pnpm check`
Expected: no type errors (fix any dangling imports from dropped helpers).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: port gfdu animation/scroll/showcase libs"
```

---

### Task 0.6: Cloudflare Pages deploy

**Files:** none in-repo beyond a short `docs/DEPLOY.md`.

- [ ] **Step 1: Push repo to a new GitHub repo** (`gh repo create albalat --private --source=. --push`).
- [ ] **Step 2: In Cloudflare Pages,** connect the repo; framework preset Astro; build `pnpm build`; output `dist`; set env vars `PUBLIC_CF_BEACON` (after enabling Web Analytics) and later `PUBLIC_WEB3FORMS_KEY`.
- [ ] **Step 3: Verify the deployed skeleton** loads at the `*.pages.dev` URL; note it in `docs/DEPLOY.md`.
- [ ] **Step 4: Commit** `docs/DEPLOY.md`.

**Phase 0 gate:** `pnpm build && pnpm check && pnpm test` all green; skeleton live.

---

# PHASE 1 — The Stage + About (the reviewable design)

Delivers: the real look-and-feel — horizontal stage Home with the signature string animation, bilingual, and one vertical detail page (About) reached via a lane-switch View Transition. **This is the phase to review design against.**

### Task 1.1: Content model — `site.ts` + stations

**Files:**
- Create: `src/data/site.ts`
- Test: `tests/unit/site.test.ts`

**Interfaces:**
- Produces: `interface Bilingual { es: string; en: string }`; `interface Station { id: string; kind: StationKind; heading: Bilingual; tagline?: Bilingual; body?: { es: string[]; en: string[] }; href?: string; accent?: string }`; `export const site` with `fullName`, `role: Bilingual`, `socials: {label; href}[]`, `stations: Station[]` (hero, about, music, videos, guitar, classes, contact).

- [ ] **Step 1: Write failing test `tests/unit/site.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { site } from '@/data/site';
describe('site data', () => {
  it('has a hero station first and a contact station', () => {
    expect(site.stations[0]?.id).toBe('hero');
    expect(site.stations.some(s => s.id === 'contact')).toBe(true);
  });
  it('every station heading is bilingual', () => {
    for (const s of site.stations) { expect(s.heading.es).toBeTruthy(); expect(s.heading.en).toBeTruthy(); }
  });
});
```

- [ ] **Step 2: Implement `src/data/site.ts`** with the interfaces above and real, voice-appropriate copy for all seven stations (ES + EN). Include `href` for about/music/videos/guitar/classes/contact pointing at their routes.
- [ ] **Step 3: Run test** — `pnpm test` → PASS.
- [ ] **Step 4: Commit** `feat: site content model with bilingual stations`.

---

### Task 1.2: Station components + `Stage.astro`

**Files:**
- Create: `src/components/Stage.astro`, `src/components/StationHero.astro`, `src/components/StationTeaser.astro`, `src/components/Wordmark.astro`, `src/components/HUD.astro`
- Reference: `../gfdu/src/components/Panel.astro`, `PanelHero.astro`, `HUD.astro`, `Wordmark.astro`

**Interfaces:**
- Consumes: showcase DOM contract from Task 0.5.
- `Stage.astro` renders `<section data-showcase><div data-showcase-track>` and slots station panels, each wrapped as `[data-showcase-panel]` with weight/gap/id data-attrs (port the wrapper logic from gfdu `Panel.astro`).
- `StationHero.astro` props `{ station: Station; locale: Locale }`; `StationTeaser.astro` props `{ station; locale }` — renders heading + a CTA link (`t('cta.…')` or "Ver / Explore") to `station.href`.

- [ ] **Step 1: Port `Panel.astro` wrapper** into `Stage.astro` (keeps the data-attr emission the showcase engine reads). Reskin to theme tokens.
- [ ] **Step 2: Build `StationHero.astro`** — big serif display name + role, spotlight container `<div data-hero-spotlight>` (animation in Task 1.4), and a scroll/He­ro entrance hook (`data-reveal`).
- [ ] **Step 3: Build `StationTeaser.astro`** — section title + one-line teaser + link to the detail route (this link is the lane-switch entry point).
- [ ] **Step 4: Port `HUD.astro`** (progress bar `[data-hud-progress]`) and `Wordmark.astro`.
- [ ] **Step 5: Typecheck** `pnpm check` → PASS. **Commit** `feat: stage + station components`.

---

### Task 1.3: Home page assembles the horizontal stage

**Files:**
- Modify: `src/pages/index.astro` (es), Create: `src/pages/en/index.astro`
- Create: `src/components/Nav.astro`, `src/components/LangToggle.astro`

**Interfaces:**
- Consumes: `site.stations`, `useTranslations(locale)`, `Stage`, station components, `Nav`, `HUD`.
- `Nav.astro` props `{ locale }` — links to all section routes + `<LangToggle>`; fixed, keyboard-accessible.
- `LangToggle.astro` props `{ locale }` — links to the counterpart URL (`/` ↔ `/en/`, `/music` ↔ `/en/music`) preserving path.

- [ ] **Step 1: Build `Nav.astro` + `LangToggle.astro`** using `t('nav.*')`; toggle computes counterpart path from `Astro.url`.
- [ ] **Step 2: Assemble `index.astro`** — `Base` → `Nav` + `HUD` + `Stage` mapping `site.stations` to `StationHero` (hero) / `StationTeaser` (rest), passing `locale='es'`. Provide per-page SEO (title/description from site + `t`).
- [ ] **Step 3: Create `src/pages/en/index.astro`** — identical, `locale='en'`.
- [ ] **Step 4: Manual verify** `pnpm dev`: desktop shows horizontal pan on wheel; resize to mobile shows vertical stack; `/en/` shows English.
- [ ] **Step 5: `pnpm build`** → PASS. **Commit** `feat: horizontal stage home (es + en)`.

---

### Task 1.4: Signature vibrating-string / spotlight animation

**Files:**
- Create: `src/lib/string.ts`, Modify: `StationHero.astro` (mount points), `Base.astro` (init call)

**Interfaces:**
- Produces: `initSignature(): () => void` — animates any `[data-string]` (an SVG/line resonance ripple on scroll + hover) and `[data-hero-spotlight]` (subtle drifting light/dust particles); respects `prefers-reduced-motion` (no-op when reduced); dynamically imports gsap.

- [ ] **Step 1: Implement `src/lib/string.ts`** — an SVG polyline whose points oscillate via a gsap timeline (damped sine), amplitude reacting to scroll velocity (read from Lenis via `window.__lenis`) and to hover; guard `prefers-reduced-motion`. Spotlight = 1–2 large radial-gradient blobs with slow gsap drift.
- [ ] **Step 2: Add `[data-string]` SVG** to `StationTeaser`/section seams and `[data-hero-spotlight]` to `StationHero`.
- [ ] **Step 3: Call `initSignature()`** in Base's init `run()`.
- [ ] **Step 4: Manual verify** the string ripples on scroll/hover; reduced-motion disables it. `pnpm build` PASS.
- [ ] **Step 5: Commit** `feat: signature vibrating-string + spotlight animation`.

---

### Task 1.5: Detail layout + About page + lane-switch View Transition

**Files:**
- Create: `src/layouts/Detail.astro`, `src/pages/about.astro`, `src/pages/en/about.astro`
- Modify: `Base.astro` (add `<ClientRouter />` from `astro:transitions`)

**Interfaces:**
- `Detail.astro` props `{ locale; title; description; jsonLd? }` — vertical scrolling layout (Nav + HUD-less), wraps `<slot/>` in a `transition:animate` container that enters as a 90° rotate/slide ("lane switch"); reduced-motion → fade.
- About content from `site` + a new `about` prose block (`{es,en}` paragraphs) added to `site.ts`.

- [ ] **Step 1: Enable View Transitions** — add `<ClientRouter />` to `Base.astro` head; define a custom transition name for the stage→detail handoff.
- [ ] **Step 2: Build `Detail.astro`** with the lane-switch enter animation (CSS `@view-transition` / `transition:animate={custom}`); ensure `prefers-reduced-motion` fallback to fade.
- [ ] **Step 3: Add `about` prose** to `site.ts` (bio paragraphs es/en, portrait image — placeholder from `../gfdu/src/assets/images/pablo_suit.webp` with `TODO-ASSET` alt).
- [ ] **Step 4: Build `about.astro` + `en/about.astro`** using `Detail`, rendering bio, portrait, and `Person`/`MusicGroup` JSON-LD (with `sameAs` socials).
- [ ] **Step 5: Manual verify** clicking About from the stage animates the lane switch and lands on the vertical page; back returns to the stage. `pnpm build` PASS.
- [ ] **Step 6: Commit** `feat: detail layout, About page, lane-switch transition`.

---

### Task 1.6: Playwright smoke tests

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/stage.spec.ts`

- [ ] **Step 1: Add `playwright.config.ts`** (baseURL from `pnpm preview`, `webServer` runs `pnpm build && pnpm preview`).
- [ ] **Step 2: Write `tests/e2e/stage.spec.ts`:**

```ts
import { test, expect } from '@playwright/test';
test('home renders hero + nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.locator('[data-showcase]')).toBeVisible();
});
test('lane switch navigates to About', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Biografía|About/ }).first().click();
  await expect(page).toHaveURL(/about/);
});
test('reduced motion renders vertical stack', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('[data-showcase]')).toBeVisible(); // no pin; content reachable
});
test('language toggle preserves section', async ({ page }) => {
  await page.goto('/about');
  await page.getByRole('link', { name: /English/ }).click();
  await expect(page).toHaveURL(/\/en\/about/);
});
```

- [ ] **Step 3: Run** `pnpm exec playwright install --with-deps && pnpm test:e2e` → PASS.
- [ ] **Step 4: Commit** `test: stage + lane-switch + i18n smoke tests`.

**Phase 1 gate:** design reviewable on the deployed preview; all tests green.

---

# PHASES 2–5 — Outline (each expanded into its own plan just-in-time)

Detailed per-task plans will be written when each phase starts (same TDD/bite-sized format). Scope locked here:

### Phase 2 — Music (discography by album)
- `src/data/discography.ts` — `Album[]` (id, title, year, cover, label, notes{es,en}, tracklist[], links{spotify,appleMusic,youtube}, embeds, featured). Unit test: every album has ≥1 platform link, valid embed URL shape.
- `src/components/Embed.astro` — click-to-load facade (cover thumbnail → loads iframe on click) for Spotify/Apple/YouTube; never blank on failure (fallback to external link).
- `src/pages/music.astro` + `en/` — vertical discography; each album card: cover, tracklist, all three platform links.
- `MusicAlbum` + `MusicRecording` JSON-LD; featured album surfaced on Home hero.
- Placeholder covers from gfdu/rondo assets.

### Phase 3 — Videos + The Guitar
- `src/data/videos.ts` (`youtubeId`, `title{es,en}`, category) → `videos.astro` gallery using the Embed facade; `VideoObject` JSON-LD.
- `src/data/guitar-notes.ts` (`kind: trick|sound|guitars`, `title{es,en}`, `body{es,en}[]`) → `guitar.astro` editorial hub consolidating Guitar Tricks + The Sound + Guitars.

### Phase 4 — Classes & Bookings + Contact
- `src/components/InquiryForm.astro` — Web3Forms POST (`PUBLIC_WEB3FORMS_KEY`), honeypot, inline validation, success/error states, bilingual labels, no-JS fallback.
- `classes.astro` (private-class info + inquiry) and its booking variant; `contact.astro` (email/WhatsApp/socials). `Course`/`Service` JSON-LD; conversion CTAs wired site-wide.

### Phase 5 — Polish, SEO/conversion, launch
- Reduced-motion + mobile QA; WCAG AA contrast audit; complete OG images per page; Lighthouse CI gate (≥95 Perf/SEO/A11y/Best-Practices); analytics goal events (inquiry submit, outbound stream click); on-brand 404; favicon/app-icon set; optional Photos gallery; custom domain; launch.

---

## Self-Review

- **Spec coverage:** aesthetic (0.3, 1.4) · horizontal stage + lane switch (0.5, 1.2–1.5) · bilingual + parity (0.2, all pages) · media by album (Ph2) · videos/guitar (Ph3) · forms (Ph4) · SEO/JSON-LD/hreflang/sitemap (0.4, per page) · conversion/analytics (0.4, Ph4/5) · voice (site.ts copy, Ph-wide) · reduced-motion/mobile (0.5 ported fallbacks, 1.6, Ph5) · testing (0.2, 1.1, 1.6, per phase). No uncovered spec section.
- **Placeholders:** none of the forbidden kind; Phases 2–5 are intentionally deferred to their own plans (scope locked), not vague within Phase 0–1.
- **Type consistency:** `Bilingual`, `Locale`, `Station`, `useTranslations`, showcase data-attrs, and lib fn names (`initScroll`/`initShowcase`/`revealPanel`/`heroEntrance`/`initSignature`) are used consistently across tasks.
