import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://albalat.pages.dev', // TODO: swap to final domain
  output: 'static',
  build: { inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false }, // es at /, en at /en/
  },
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap({ i18n: { defaultLocale: 'es', locales: { es: 'es-ES', en: 'en-US' } } })],
});
