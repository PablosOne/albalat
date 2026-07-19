import { expect, test } from '@playwright/test';
import { siteConfig } from '../../src/config/site';

const site = siteConfig.origin;

const routes = [
  { path: '/', canonical: '/', es: '/', en: '/en/' },
  { path: '/en/', canonical: '/en/', es: '/', en: '/en/' },
  { path: '/about', canonical: '/about/', es: '/about/', en: '/en/about/' },
  { path: '/en/about', canonical: '/en/about/', es: '/about/', en: '/en/about/' },
  { path: '/music', canonical: '/music/', es: '/music/', en: '/en/music/' },
  { path: '/en/music', canonical: '/en/music/', es: '/music/', en: '/en/music/' },
  { path: '/videos', canonical: '/videos/', es: '/videos/', en: '/en/videos/' },
  { path: '/en/videos', canonical: '/en/videos/', es: '/videos/', en: '/en/videos/' },
  { path: '/classes', canonical: '/classes/', es: '/classes/', en: '/en/classes/' },
  { path: '/en/classes', canonical: '/en/classes/', es: '/classes/', en: '/en/classes/' },
];

for (const route of routes) {
  test(`${route.path} has launch-ready metadata`, async ({ page }) => {
    await page.goto(route.path);

    await expect(page).toHaveTitle(new RegExp(siteConfig.identity.name));

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site}${route.canonical}`);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute('href', `${site}${route.es}`);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', `${site}${route.en}`);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', `${site}${route.es}`);

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', new RegExp(siteConfig.identity.name));
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`^${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`));
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  });
}

test('homepage exposes crawlable links while retaining interactive lanes', async ({ page }) => {
  await page.goto('/');
  for (const id of ['about', 'music', 'videos', 'classes']) {
    await expect(page.locator(`a[data-lane-open="${id}"]`).first()).toHaveAttribute('href', `/${id}/`);
  }
  await expect(page.locator('[data-detail-lane]')).toHaveCount(4);
});

test('a detail route emits only its own long-form detail', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('[data-detail-lane]')).toHaveCount(1);
  await expect(page.locator('[data-detail-lane="about"]')).toHaveCount(1);
});

test('robots advertises the canonical sitemap', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain(`Sitemap: ${siteConfig.origin}/sitemap-index.xml`);
});

test.describe('mobile legal navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ['/privacy/', '/cookies/']) {
    test(`${path} keeps the standard navbar geometry`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('site-consent-v1', JSON.stringify({
          version: 1,
          necessary: true,
          analytics: false,
          externalMedia: false,
          updatedAt: new Date().toISOString(),
        }));
      });
      await page.goto('/');
      const initialNav = await page.locator('.nav-mobile-bar').boundingBox();
      expect(initialNav).not.toBeNull();

      await page.evaluate((href) => {
        const link = document.createElement('a');
        link.href = href;
        document.body.append(link);
        link.click();
      }, path);
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`));

      const legalNav = page.locator('[data-mobile-nav]');
      await expect(legalNav).toBeVisible();
      await expect(legalNav).not.toHaveAttribute('data-nav-variant', /.+/);
      const legalNavBox = await legalNav.locator('.nav-mobile-bar').boundingBox();
      expect(legalNavBox).not.toBeNull();
      expect(Math.abs(legalNavBox!.width - initialNav!.width)).toBeLessThan(1);
    });
  }
});
