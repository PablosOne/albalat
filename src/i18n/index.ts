import es from './es.json';
import en from './en.json';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

const DICTS: Record<Locale, unknown> = { es, en };

export function getLocaleFromUrl(url: URL): Locale {
  const seg = url.pathname.split('/').filter(Boolean)[0];
  return (LOCALES as readonly string[]).includes(seg as string) ? (seg as Locale) : DEFAULT_LOCALE;
}

function lookup(dict: unknown, key: string): string | undefined {
  return key.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), dict) as string | undefined;
}

export function useTranslations(locale: Locale) {
  return (key: string): string => lookup(DICTS[locale], key) ?? lookup(DICTS[DEFAULT_LOCALE], key) ?? key;
}
