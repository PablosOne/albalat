export const CONSENT_STORAGE_KEY = 'site-consent-v1';
export const CONSENT_EVENT = 'site:consent-change';
export const CONSENT_REQUEST_EVENT = 'site:consent-request';

export type ConsentCategory = 'analytics' | 'externalMedia';

export interface ConsentPreferences {
  version: 1;
  necessary: true;
  analytics: boolean;
  externalMedia: boolean;
  updatedAt: string;
}

export function readConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? 'null') as Partial<ConsentPreferences> | null;
    if (!value || value.version !== 1) return null;
    return {
      version: 1,
      necessary: true,
      analytics: value.analytics === true,
      externalMedia: value.externalMedia === true,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
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
  const consent: ConsentPreferences = {
    version: 1,
    necessary: true,
    analytics: preferences.analytics,
    externalMedia: preferences.externalMedia,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent<ConsentPreferences>(CONSENT_EVENT, { detail: consent }));
  return consent;
}
