# Albalat — project instructions

Astro 5 + TypeScript site for classical guitarist Eulogio Albalat. Bilingual
(`es` default at `/`, `en` at `/en/`). Content model lives in `src/data/*`.

## Home navigation invariant (do not regress)

Home (`/`, `/en/`) is a horizontal **main lane**. On desktop the mouse wheel
pans the main lane **horizontally in BOTH directions** — wheel-down = move
right, wheel-up = move left (GSAP ScrollTrigger pins the showcase and scrubs
`track.x` from vertical scroll; see `src/lib/showcase.desktop.ts`).

Some stations have an optional **detail lane** below them. Detail lanes are the
ONLY place vertical scrolling happens. A detail lane is entered via its
down-arrow (`LaneArrow`) or a nav/HUD entry, and exited via the up-arrow,
scroll-to-top, or `Esc`/`ArrowUp`-at-top (see `src/lib/lanes.ts`). Never wire
wheel-down to scroll the main lane vertically.

Mobile (`max-width: 767px`) and `prefers-reduced-motion: reduce` disable the pin
and Lenis: stations and their details stack as one native vertical scroll.

## Motion

- Reveals: `data-reveal` + `revealPanel()` in `src/lib/motion.ts`.
- Horizontal parallax: `data-parallax-x="<multiplier>"`; vertical (in lanes):
  `data-parallax-y`. Global scales in `src/lib/config.ts`.
- Guitar-string affordance: `src/lib/laneString.ts` (`attachString`/`pluck`).

## Commands

- `pnpm dev` — dev server. `pnpm build` — production build.
- `pnpm check` — `astro check` + i18n-key validation (`scripts/check-i18n-keys.ts`).
- `pnpm test` — Vitest (unit). `pnpm test:e2e` — Playwright.
