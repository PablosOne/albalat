import { attachString, type StringHandle } from '@/lib/laneString';

type Gsap = typeof import('gsap').gsap;
type Tween = ReturnType<Gsap['to']>;

interface HudEls {
  station: HTMLElement;
  index: HTMLElement;
  progress: HTMLElement | null;
  links: HTMLAnchorElement[];
}

const MOBILE_MEDIA = '(max-width: 767px)';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function mountSpotlight(root: HTMLElement, gsap: Gsap): () => void {
  const washes = [
    { x: '-18%', y: '8%', size: '56vw', opacity: '0.22', delay: 0 },
    { x: '58%', y: '16%', size: '42vw', opacity: '0.14', delay: 1.1 },
  ];
  const nodes: HTMLElement[] = [];
  const tweens: Tween[] = [];

  for (const wash of washes) {
    const el = document.createElement('div');
    el.setAttribute('data-signature-spotlight', '');
    el.style.position = 'absolute';
    el.style.left = wash.x;
    el.style.top = wash.y;
    el.style.width = wash.size;
    el.style.height = wash.size;
    el.style.borderRadius = '9999px';
    el.style.pointerEvents = 'none';
    el.style.opacity = wash.opacity;
    el.style.background = 'radial-gradient(circle, rgba(198,146,62,0.62) 0%, rgba(198,146,62,0.18) 34%, rgba(198,146,62,0) 70%)';
    el.style.filter = 'blur(18px)';
    el.style.mixBlendMode = 'screen';
    el.style.transform = 'translate3d(0, 0, 0)';
    root.appendChild(el);
    nodes.push(el);

    tweens.push(gsap.to(el, {
      x: wash.delay ? -34 : 42,
      y: wash.delay ? 28 : -22,
      scale: wash.delay ? 1.08 : 1.14,
      duration: wash.delay ? 11 : 13,
      delay: wash.delay,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    }));
  }

  return () => {
    tweens.forEach((tween) => tween.kill());
    nodes.forEach((node) => node.remove());
  };
}

function readStationTitle(panel: HTMLElement): string {
  const titled = panel.querySelector<HTMLElement>('[data-station-title]');
  const title = titled?.dataset.stationTitle?.trim();
  if (title) return title;

  const heading = panel.querySelector<HTMLElement>('h1, h2');
  return heading?.textContent?.trim() || panel.dataset.showcasePanelId || '';
}

function mostVisiblePanel(panels: HTMLElement[]): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestArea = -1;

  panels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const area = width * height;
    if (area > bestArea) {
      best = panel;
      bestArea = area;
    }
  });

  return best;
}

function updateStackProgress(section: HTMLElement, progress: HTMLElement): void {
  const rect = section.getBoundingClientRect();
  const total = Math.max(1, section.offsetHeight - window.innerHeight);
  const p = Math.min(1, Math.max(0, -rect.top / total));
  progress.style.transform = `scaleX(${p})`;
}

function updateCarouselProgress(section: HTMLElement, progress: HTMLElement): void {
  const max = Math.max(1, section.scrollWidth - section.clientWidth);
  const p = Math.min(1, Math.max(0, section.scrollLeft / max));
  progress.style.transform = `scaleX(${p})`;
}

function initHudStatus(): () => void {
  const hud = document.querySelector<HTMLElement>('[data-hud]');
  const section = document.querySelector<HTMLElement>('[data-showcase]');
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-showcase-panel]'));
  const station = hud?.querySelector<HTMLElement>('[data-hud-station]');
  const index = hud?.querySelector<HTMLElement>('[data-hud-index]');
  if (!hud || !section || !panels.length || !station || !index) return () => {};

  const els: HudEls = {
    station,
    index,
    progress: hud.querySelector<HTMLElement>('[data-hud-progress]'),
    links: Array.from(hud.querySelectorAll<HTMLAnchorElement>('[data-hud-station-link]')),
  };
  const mobileQuery = window.matchMedia(MOBILE_MEDIA);
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let activeId = '';

  const write = () => {
    frame = 0;
    const active = mostVisiblePanel(panels);
    if (!active) return;

    const id = active.dataset.showcasePanelId || '';
    if (id !== activeId) {
      activeId = id;
      const stationNumber = Math.max(0, panels.indexOf(active));
      els.index.textContent = stationNumber === 0 ? '00' : String(stationNumber).padStart(2, '0');
      els.station.textContent = readStationTitle(active);
      els.links.forEach((link) => {
        const isActive = link.dataset.hudStationLink === id;
        if (isActive) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }

    if (els.progress && (mobileQuery.matches || reduceQuery.matches)) {
      if (mobileQuery.matches && !reduceQuery.matches) updateCarouselProgress(section, els.progress);
      else updateStackProgress(section, els.progress);
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(write);
  };

  schedule();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  section.addEventListener('scroll', schedule, { passive: true });
  mobileQuery.addEventListener('change', schedule);
  reduceQuery.addEventListener('change', schedule);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('hashchange', schedule);
    section.removeEventListener('scroll', schedule);
    mobileQuery.removeEventListener('change', schedule);
    reduceQuery.removeEventListener('change', schedule);
  };
}

export function initSignature(): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanupHud = initHudStatus();
  if (prefersReducedMotion()) return cleanupHud;

  const strings = Array.from(document.querySelectorAll<SVGSVGElement>('svg[data-string]'));
  const spotlights = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-spotlight]'));
  if (!strings.length && !spotlights.length) return cleanupHud;

  let active = true;
  let cleanupFns: Array<() => void> = [];

  const readVelocity = () => {
    const lenis = (window as unknown as { __lenis?: { velocity?: number } }).__lenis;
    const v = Math.abs(lenis?.velocity ?? 0);
    return Number.isFinite(v) ? v : 0;
  };

  const handles: StringHandle[] = strings.map((svg) => {
    const h = attachString(svg);
    h.setVelocitySource(readVelocity);
    return h;
  });
  cleanupFns.push(...handles.map((h) => () => h.destroy()));

  // Spotlights still need gsap; keep that dynamic import for them only.
  void import('gsap').then(({ gsap }) => {
    if (!active) return;
    cleanupFns.push(...spotlights.map((root) => mountSpotlight(root, gsap)));
  });

  return () => {
    active = false;
    cleanupHud();
    cleanupFns.forEach((cleanup) => cleanup());
    cleanupFns = [];
  };
}
