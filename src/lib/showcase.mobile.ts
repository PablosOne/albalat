import { revealPanel, revealProblemCard } from '@/lib/motion';

/**
 * Mobile showcase: panels stack vertically, IntersectionObserver drives reveals
 * and decorative-loop activation. No GSAP ScrollTrigger, no Lenis — only the
 * native IntersectionObserver API. Imported dynamically from showcase.ts.
 */

export function initShowcaseMobile(
  track: HTMLElement,
  panels: NodeListOf<HTMLElement>,
): () => void {
  track.style.width = '100%';
  track.style.flexDirection = 'column';
  panels.forEach(p => { p.style.width = '100vw'; });

  // Reveal IO — fires once per panel, then unobserves.
  const revealIo = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const panel = entry.target as HTMLElement;
        revealPanel(panel);
        revealProblemCard(panel);
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
  };
}
