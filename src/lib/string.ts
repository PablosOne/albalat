type Gsap = typeof import('gsap').gsap;
type Tween = ReturnType<Gsap['to']>;

interface LenisLike {
  velocity?: number;
}

interface RunningString {
  line: SVGPolylineElement;
  state: {
    amplitude: number;
    target: number;
    phase: number;
    hovered: boolean;
  };
  cleanup: () => void;
}

interface HudEls {
  station: HTMLElement;
  index: HTMLElement;
  progress: HTMLElement | null;
  links: HTMLAnchorElement[];
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const POINT_COUNT = 72;
const WIDTH = 1000;
const MID_Y = 50;
const MOBILE_MEDIA = '(max-width: 767px)';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readScrollVelocity(): number {
  const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
  const v = Math.abs(lenis?.velocity ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function ensureLine(svg: SVGSVGElement): SVGPolylineElement {
  svg.setAttribute('viewBox', `0 0 ${WIDTH} 100`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('focusable', 'false');

  const existing = svg.querySelector<SVGPolylineElement>('[data-string-line]');
  if (existing) return existing;

  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('data-string-line', '');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '1.4');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(line);
  return line;
}

function writePoints(item: RunningString): void {
  const { line, state } = item;
  const points: string[] = [];

  for (let i = 0; i < POINT_COUNT; i++) {
    const t = i / (POINT_COUNT - 1);
    const x = t * WIDTH;
    const envelope = Math.pow(Math.sin(Math.PI * t), 1.35);
    const fast = Math.sin(t * Math.PI * 8 + state.phase);
    const slow = Math.sin(t * Math.PI * 2 - state.phase * 0.55);
    const y = MID_Y + envelope * state.amplitude * (fast * 0.78 + slow * 0.22);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  line.setAttribute('points', points.join(' '));
}

function initString(svg: SVGSVGElement): RunningString {
  const line = ensureLine(svg);
  const state = { amplitude: 0, target: 0, phase: 0, hovered: false };
  const enter = () => { state.hovered = true; };
  const leave = () => { state.hovered = false; };

  svg.addEventListener('pointerenter', enter);
  svg.addEventListener('pointerleave', leave);

  const item: RunningString = {
    line,
    state,
    cleanup: () => {
      svg.removeEventListener('pointerenter', enter);
      svg.removeEventListener('pointerleave', leave);
    },
  };

  writePoints(item);
  return item;
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

  void import('gsap').then(({ gsap }) => {
    if (!active) return;

    const running = strings.map(initString);
    cleanupFns.push(...running.map((item) => item.cleanup));
    cleanupFns.push(...spotlights.map((root) => mountSpotlight(root, gsap)));

    const tick = () => {
      const velocity = readScrollVelocity();
      const impulse = Math.min(18, velocity * 0.07);

      running.forEach((item, i) => {
        item.state.target = Math.max(impulse, item.state.hovered ? 14 : 0);
        item.state.amplitude += (item.state.target - item.state.amplitude) * 0.095;
        item.state.phase += 0.075 + i * 0.002 + Math.min(0.08, velocity * 0.00045);
        writePoints(item);
      });
    };

    gsap.ticker.add(tick);
    cleanupFns.push(() => gsap.ticker.remove(tick));
  });

  return () => {
    active = false;
    cleanupHud();
    cleanupFns.forEach((cleanup) => cleanup());
    cleanupFns = [];
  };
}
