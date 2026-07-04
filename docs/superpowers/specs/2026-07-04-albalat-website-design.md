# Albalat — Eulogio Albalat, Classical Guitarist — Website Design

**Date:** 2026-07-04
**Status:** Approved direction, pending spec review
**Reference projects:** `gfdu` (Astro/GSAP/Lenis showcase — architecture & animation base), `rondo` (i18n pattern)

---

## 1. Goal

A public website for **Eulogio Albalat**, classical guitarist. It should:

- Host a **library of his recordings and videos** (via YouTube, Spotify, Apple Music — no self-hosted files).
- Present a body of work **organized by CD/album** (discography).
- Share **guitar knowledge** (playing tips, the question of sound/strings, guitars — cedar vs spruce).
- Provide **about/biography** context.
- Generate **leads for private classes and concert bookings** via inquiry forms.
- Be **elegant, classy, modern, very visual and unique**, with cool, tasteful animations.
- Be **bilingual (Spanish + English)**, Spanish canonical.
- Run on **free hosting** (Cloudflare Pages).

## 2. Non-goals (v1)

- No self-hosted media (no NAS, no R2, no Archive.org). Only embeds: YouTube, Spotify, Apple Music.
- No scheduling/payments. Bookings & classes are **inquiry forms → email** only.
- No CMS/admin UI. Content is edited in structured data files by a developer.
- No user accounts, no e-commerce.
- "News" and "Publications" are **not** full sections in v1 (folded lightly into Home/About/Guitar; can graduate later).

## 3. Aesthetic direction

**"Concert program meets modern editorial."** Timeless and alive — neither a tech site nor a dated classical-music site.

- **Palette:** deep warm charcoal / near-black "stage" background; ivory/cream text; a single warm accent from **tonewood & stage light** (amber / cedar-gold). Restrained.
- **Typography:** a refined **serif display** for headings (classical gravitas) + a clean sans for body. Large, confident type. Fonts self-hosted (no external CDN, for Cloudflare + privacy + performance).
- **Signature motif:** a **vibrating guitar string / resonance line** that ripples on scroll and hover — the visual thread across the whole site. Hero has subtle spotlight "dust" particles. Thematically earned, not decorative.

## 4. Interaction model — the "stage" (horizontal main axis, vertical lanes)

The defining interaction:

- **Home is a horizontal stage.** Full-viewport "stations" translate **left → right** as the user scrolls, via GSAP **ScrollTrigger** (pinned track, translate X) driven by **Lenis** smooth scroll. Reads like moving across a concert stage.
  - Stations (teasers): **Intro/Hero → About → Music → Videos → The Guitar → Classes & Bookings → Contact.**
- **Diving into a section switches lanes to vertical.** Selecting a station navigates to a dedicated **vertical detail page**. An Astro **View Transition** animates a 90° "camera turn" so horizontal→vertical feels continuous ("switching lanes").
- **Detail pages are vertical** and reuse the panel/showcase components: `/music`, `/videos`, `/guitar`, `/about`, `/classes`, `/contact`.
- **Returning** to Home restores the horizontal axis at the originating station.

### Responsiveness & accessibility (hard requirements)

- **Mobile:** horizontal stage becomes a **swipe carousel** between stations; vertical scroll within detail pages.
- **`prefers-reduced-motion`:** horizontal stage **degrades to a vertical stack**; view transitions reduce to simple fades. No scroll-jacking when reduced motion is requested.
- **Keyboard + direct nav always available:** a persistent nav menu jumps directly to any section; arrow keys move between stations; focus management on lane switches.
- **SEO:** every section is a real, crawlable page/route with proper `<title>`/meta and semantic headings — the horizontal effect is presentation, not a barrier to content.

### Architecture decision: hub + pages (not one infinite scroll)

The horizontal stage is the **Home hub**; depth lives in **real vertical pages**. Rationale: a media library grows, and one endless horizontal scroll neither scales, SEOs, nor stays accessible. View Transitions make the hub↔page handoff feel like one continuous world.

## 5. Tech stack

Reuse gfdu's foundation; copy libs/components where possible and reskin.

| Concern | Choice |
|---|---|
| Framework | **Astro 5** (static output) |
| Styling | **Tailwind v4** (`@tailwindcss/vite`) + a new theme (palette, fonts) |
| Animation | **GSAP + ScrollTrigger** |
| Smooth scroll | **Lenis** |
| Page transitions | **Astro View Transitions** |
| i18n | **Astro built-in i18n routing** + JSON message files (rondo pattern) |
| Forms | **Web3Forms** (free, no backend) → email |
| Images | **Astro `<Image>` / sharp**, WebP |
| Hosting/CI | **Cloudflare Pages** (git-connected, auto-deploy, free, custom domain) |
| Testing | **Vitest** (unit: data integrity, i18n parity) + **Playwright** (smoke: nav, lane-switch, reduced-motion) |

### Ports from gfdu (copy + adapt, don't rewrite)

- `src/lib/`: `motion.ts`, `scroll.ts`, `panelWash.ts`, `pointer.ts`, `anchorScroll.ts`, `textHighlight.ts`, `showcase*.ts`, `config.ts`.
- `src/layouts/Base.astro`; components `TextReveal`, `Panel*` scaffolding, `Nav`, `HUD`, `Wordmark` — adapted to the horizontal stage + new theme.

## 6. Content & data model

Content lives in structured, typed data files (gfdu's `site.ts` philosophy). Long-form prose uses `{ es, en }` fields; UI chrome uses JSON message files.

- `src/data/site.ts` — config, nav, hero, socials; prose fields as `{ es, en }`.
- `src/data/discography.ts` — **albums** (the library backbone):
  ```ts
  interface Album {
    id: string;
    title: string;              // usually language-neutral
    year: number;
    cover: string;              // local WebP asset
    label?: string;             // CD / label info
    notes?: { es: string; en: string };
    tracklist: { no: number; title: string; duration?: string }[];
    links: { spotify?: string; appleMusic?: string; youtube?: string };
    embeds?: { spotify?: string; appleMusic?: string }; // embed URLs
    featured?: boolean;
  }
  ```
- `src/data/videos.ts` — `{ id, title: {es,en}, youtubeId, category, date? }`.
- `src/data/guitar-notes.ts` — `{ id, kind: 'trick' | 'sound' | 'guitars', title: {es,en}, body: {es,en}[] }` (consolidates *Guitar Tricks*, *The Sound*, *Guitars*).

### i18n specifics (rondo pattern, Astro runtime)

- `src/i18n/es.json`, `src/i18n/en.json` — namespaced, nested UI strings.
- `src/i18n/index.ts` — `useTranslations(locale)` helper.
- `scripts/check-i18n-keys.ts` — **ported from rondo**, run in CI/`check`, fails on missing keys.
- Routes: `/es/…` (canonical) and `/en/…`; language toggle in nav preserving current section.

## 7. Sections (image → optimized IA)

| Page | From the image | Content |
|---|---|---|
| **Home** | Home | Horizontal stage; hero (name, "classical guitarist"), station teasers, featured recording |
| **About** | About, Publications(light) | Biography, artistic story, photos; select publications listed |
| **Music** | Discography, Media(Audio) | Discography **by album/CD**; each album: cover, tracklist, Spotify/Apple/YouTube |
| **Videos** | Media(Video) | YouTube performances in an elegant gallery |
| **The Guitar** | Guitar Tricks, The Sound, Guitars | Editorial knowledge hub (tips, sound/strings essay, cedar vs spruce) |
| **Classes & Bookings** | Classes, Bookings | Info + **inquiry form → email** for each |
| **Contact** | Contact | Email, socials, direct contact |
| **Photos** | Media(Photo) | Optional gallery (Phase 5 / later) |

## 8. Inquiry forms

- Two variants (Classes, Bookings) posting to **Web3Forms**; single access key.
- Fields: name, email, type (class/concert), message; **honeypot** anti-spam.
- Bilingual labels; inline success/error states; graceful no-JS fallback.
- Emails route to your father's address.

## 9. Error handling & resilience

- **Embeds:** each album/video renders even if an embed fails — always show cover + external link as fallback (never a blank iframe).
- **Missing translation key:** build fails via parity script (caught pre-deploy), never ships half-translated.
- **Reduced motion / no JS:** content fully reachable as a vertical document.
- **404 page:** on-brand, bilingual, links back to Home.

## 10. Testing strategy

- **Unit (Vitest):** data-file integrity (required fields, valid embed URLs), i18n key parity, `useTranslations` fallback.
- **Smoke (Playwright):** horizontal nav advances stations; lane-switch navigates to correct page; reduced-motion renders vertical stack; language toggle preserves section; forms validate.

## 11. Phased delivery

Each phase is independently shippable to Cloudflare Pages.

- **Phase 0 — Foundation.** Scaffold Astro; copy gfdu stack + libs; Tailwind theme (palette/fonts); Astro i18n routing + JSON messages + ported parity script; `Base` layout; deploy skeleton to Cloudflare Pages.
- **Phase 1 — The Stage + About.** Horizontal stage hub (Home) with station teasers, signature string/resonance animation, spotlight hero; lane-switch View Transition; About page. Bilingual wired end-to-end.
- **Phase 2 — Music.** Discography by album/CD; Spotify + Apple Music + YouTube integration; featured recording on Home. (The heart of the library.)
- **Phase 3 — Videos + The Guitar.** YouTube gallery; editorial knowledge hub.
- **Phase 4 — Classes & Bookings + Contact.** Inquiry forms (Web3Forms); Contact page.
- **Phase 5 — Polish & launch.** Reduced-motion/mobile passes, a11y, SEO/meta/sitemap, performance, optional Photos gallery, custom domain, launch.

## 12. Open questions (non-blocking)

- Final domain name?
- Web3Forms destination email address?
- Which album gets "featured" on Home?
- Font choices (specific serif + sans) — decided in Phase 0 theming.
