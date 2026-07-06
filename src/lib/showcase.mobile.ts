import { revealPanel, revealProblemCard } from '@/lib/motion';

/**
 * Mobile showcase: panels stack vertically, IntersectionObserver drives reveals
 * and decorative-loop activation. No GSAP ScrollTrigger, no Lenis — only the
 * native IntersectionObserver API. Imported dynamically from showcase.ts.
 */

export function initShowcaseMobile(
  track: HTMLElement,
  panels: NodeListOf<HTMLElement>,
  mode: 'carousel' | 'stack' = 'stack',
): () => void {
  const section = track.closest<HTMLElement>('[data-showcase]');
  const revealOnce = (panel: HTMLElement) => {
    if (panel.dataset.showcaseRevealed === 'true') return;
    panel.dataset.showcaseRevealed = 'true';
    revealPanel(panel);
    revealProblemCard(panel);
  };

  track.style.width = mode === 'carousel' ? 'max-content' : '100%';
  track.style.flexDirection = mode === 'carousel' ? 'row' : 'column';
  track.style.scrollSnapType = mode === 'carousel' ? 'x mandatory' : '';

  if (section) {
    section.style.overflowX = mode === 'carousel' ? 'auto' : 'hidden';
    section.style.overflowY = mode === 'carousel' ? 'hidden' : 'visible';
    section.style.scrollSnapType = mode === 'carousel' ? 'x mandatory' : '';
    section.style.scrollBehavior = 'smooth';
    section.style.setProperty('-webkit-overflow-scrolling', 'touch');
  }

  panels.forEach(p => {
    p.style.width = '100vw';
    p.style.marginRight = '0';
    p.style.scrollSnapAlign = mode === 'carousel' ? 'start' : '';
  });

  // Reveal IO — fires once per panel, then unobserves.
  const revealIo = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const panel = entry.target as HTMLElement;
        revealOnce(panel);
        revealIo.unobserve(panel);
      }
    });
  }, { rootMargin: '0px 0px -15% 0px' });

  panels.forEach(p => revealIo.observe(p));

  // Halo / decorative-loop activity IO — follows scroll continuously, toggling
  // `data-halo-active` / `data-active-mobile` on the panel as it enters/leaves
  // viewport. Decorative CSS keyframes default to paused and resume only on
  // these attributes.
  const activeIo = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const panel = entry.target as HTMLElement;
      if (entry.isIntersecting) {
        panel.setAttribute('data-halo-active', '');
        panel.setAttribute('data-active-mobile', '');
      } else {
        panel.removeAttribute('data-halo-active');
        panel.removeAttribute('data-active-mobile');
      }
    });
  }, { threshold: 0 });

  panels.forEach(p => activeIo.observe(p));

  return () => {
    revealIo.disconnect();
    activeIo.disconnect();
    track.style.width = '';
    track.style.flexDirection = '';
    track.style.scrollSnapType = '';
    if (section) {
      section.style.overflowX = '';
      section.style.overflowY = '';
      section.style.scrollSnapType = '';
      section.style.scrollBehavior = '';
      section.style.removeProperty('-webkit-overflow-scrolling');
    }
    panels.forEach(p => {
      p.style.width = '';
      p.style.marginRight = '';
      p.style.scrollSnapAlign = '';
    });
  };
}
