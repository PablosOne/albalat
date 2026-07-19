export const CONSENT_STORAGE_KEY = 'site-consent-v1';
export const CONSENT_EVENT = 'site:consent-change';
export const CONSENT_REQUEST_EVENT = 'site:consent-request';
export const SITE_CONTENT_READY_EVENT = 'site:content-ready';
export const CONSENT_MAX_AGE_MONTHS = 24;

export type ConsentCategory = 'analytics' | 'externalMedia';

export interface ConsentPreferences {
  version: 1;
  necessary: true;
  analytics: boolean;
  externalMedia: boolean;
  updatedAt: string;
  expiresAt: string;
}

function expiryFrom(updatedAt: string): string | null {
  const updated = new Date(updatedAt);
  if (!Number.isFinite(updated.getTime())) return null;
  const expiry = new Date(updated);
  expiry.setUTCMonth(expiry.getUTCMonth() + CONSENT_MAX_AGE_MONTHS);
  return expiry.toISOString();
}

export function readConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? 'null') as Partial<ConsentPreferences> | null;
    if (!value || value.version !== 1) return null;
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : '';
    const derivedExpiry = expiryFrom(updatedAt);
    if (!derivedExpiry) {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }
    const storedExpiry = typeof value.expiresAt === 'string' ? value.expiresAt : '';
    const storedExpiryTime = new Date(storedExpiry).getTime();
    const maximumExpiryTime = new Date(derivedExpiry).getTime();
    const expiresAt = Number.isFinite(storedExpiryTime) && storedExpiryTime <= maximumExpiryTime
      ? storedExpiry
      : derivedExpiry;
    if (new Date(expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }
    return {
      version: 1,
      necessary: true,
      analytics: value.analytics === true,
      externalMedia: value.externalMedia === true,
      updatedAt,
      expiresAt,
    };
  } catch {
    return null;
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  return readConsent()?.[category] === true;
}

export function requestConsent(category?: ConsentCategory): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CONSENT_REQUEST_EVENT, { detail: { category } }));
}

export function saveConsent(preferences: Pick<ConsentPreferences, 'analytics' | 'externalMedia'>): ConsentPreferences {
  const updatedAt = new Date().toISOString();
  const consent: ConsentPreferences = {
    version: 1,
    necessary: true,
    analytics: preferences.analytics,
    externalMedia: preferences.externalMedia,
    updatedAt,
    expiresAt: expiryFrom(updatedAt)!,
  };

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent<ConsentPreferences>(CONSENT_EVENT, { detail: consent }));
  return consent;
}
