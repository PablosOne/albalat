import { expect, test } from '@playwright/test';

const site = 'https://albalat.pages.dev';

const routes = [
  { path: '/', canonical: '/', es: '/', en: '/en/' },
  { path: '/en/', canonical: '/en/', es: '/', en: '/en/' },
  { path: '/about', canonical: '/about/', es: '/about/', en: '/en/about/' },
  { path: '/en/about', canonical: '/en/about/', es: '/about/', en: '/en/about/' },
  { path: '/music', canonical: '/music/', es: '/music/', en: '/en/music/' },
  { path: '/en/music', canonical: '/en/music/', es: '/music/', en: '/en/music/' },
  { path: '/videos', canonical: '/videos/', es: '/videos/', en: '/en/videos/' },
  { path: '/en/videos', canonical: '/en/videos/', es: '/videos/', en: '/en/videos/' },
  { path: '/guitar', canonical: '/guitar/', es: '/guitar/', en: '/en/guitar/' },
  { path: '/en/guitar', canonical: '/en/guitar/', es: '/guitar/', en: '/en/guitar/' },
  { path: '/classes', canonical: '/classes/', es: '/classes/', en: '/en/classes/' },
  { path: '/en/classes', canonical: '/en/classes/', es: '/classes/', en: '/en/classes/' },
  { path: '/contact', canonical: '/contact/', es: '/contact/', en: '/en/contact/' },
  { path: '/en/contact', canonical: '/en/contact/', es: '/contact/', en: '/en/contact/' },
];

for (const route of routes) {
  test(`${route.path} has launch-ready metadata`, async ({ page }) => {
    await page.goto(route.path);

    await expect(page).toHaveTitle(/Eulogio Albalat/);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site}${route.canonical}`);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute('href', `${site}${route.es}`);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', `${site}${route.en}`);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', `${site}${route.es}`);

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Eulogio Albalat/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/albalat\.pages\.dev\//);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  });
}
