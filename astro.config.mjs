import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { siteConfig } from './src/config/site.ts';

export default defineConfig({
  site: siteConfig.origin,
  output: 'static',
  build: { inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: siteConfig.defaultLocale,
    locales: [...siteConfig.locales],
    routing: { prefixDefaultLocale: false }, // es at /, en at /en/
  },
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap({ i18n: { defaultLocale: siteConfig.defaultLocale, locales: siteConfig.localeTags } })],
});
