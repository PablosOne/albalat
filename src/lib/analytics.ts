/** Fires a GA4 event via gtag if it's loaded (PUBLIC_GA_ID set); no-ops otherwise. */
export function trackEvent(name: string, params: Record<string, string | number | boolean> = {}): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('event', name, params);
}
