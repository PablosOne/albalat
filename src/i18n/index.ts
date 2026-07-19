import es from './es.json';
import en from './en.json';
import { siteConfig } from '@/config/site';

export const LOCALES = siteConfig.locales;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = siteConfig.defaultLocale;

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
