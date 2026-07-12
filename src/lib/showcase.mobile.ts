import { revealPanel, revealProblemCard } from '@/lib/motion';

/**
 * Mobile showcase: panels stack vertically. `global.css`'s `@media
 * (max-width: 767px)` block owns the column layout (via `!important`), so this
 * module only wires the native IntersectionObserver reveals and the decorative
 * halo/loop gating — no GSAP ScrollTrigger, no Lenis, no inline layout styles.
 * Imported dynamically from showcase.ts for mobile and reduced-motion.
 */
export function initShowcaseMobile(
  panels: NodeListOf<HTMLElement>,
): () => void {
  const revealOnce = (panel: HTMLElement) => {
    if (panel.dataset.showcaseRevealed === 'true') return;
    panel.dataset.showcaseRevealed = 'true';
    revealPanel(panel);
    revealProblemCard(panel);
  };

  // Reveal IO — fires once per panel, then unobserves.
  const revealIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const panel = entry.target as HTMLElement;
        revealOnce(panel);
        revealIo.unobserve(panel);
      }
    });
  }, { rootMargin: '0px 0px -15% 0px' });
  panels.forEach((p) => revealIo.observe(p));

  // Halo / decorative-loop activity IO — toggles `data-halo-active` /
  // `data-active-mobile` as each panel enters/leaves the viewport. Decorative
  // CSS keyframes default to paused and resume only on these attributes.
  const activeIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
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
  panels.forEach((p) => activeIo.observe(p));

  return () => {
    revealIo.disconnect();
    activeIo.disconnect();
  };
}
