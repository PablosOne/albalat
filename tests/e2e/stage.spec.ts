import { expect, test } from '@playwright/test';
import { siteConfig } from '../../src/config/site';

test('home renders hero and nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Inicio' })).toBeVisible();
  await expect(page.locator('[data-showcase]')).toBeVisible();
  await expect(page.getByRole('heading', { name: siteConfig.identity.name })).toBeVisible();
});

test('mobile reload returns a plain URL to the first section', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await page.reload();

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await expect(page.locator('[data-showcase-panel-id="hero"]')).toBeInViewport();
  await context.close();
});

test('reload preserves an explicit section hash', async ({ page }) => {
  await page.goto('/#about');
  await page.reload();

  await expect(page).toHaveURL(/\/#about$/);
  await expect(page.locator('[data-detail-lane="about"]')).toBeVisible();
});

test('About station opens its detail lane from the nav', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Inicio' }).locator('a[data-lane-open="about"]').click();
  await expect(page.locator('[data-detail-lane="about"]')).toBeVisible();
  await expect(page.locator('[data-detail-lane]')).toHaveCount(4); // about,music,videos,classes
});

test('home nav jumps between horizontal stage stations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Inicio' }).locator('a[href="#contact"]').click();
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.locator('[data-showcase-panel-id="contact"]')).toBeInViewport();
});

test('desktop vertical scroll scrubs the stage horizontally and updates HUD station', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.scrollHeight > window.innerHeight * 2);
  const about = page.locator('[data-showcase-panel-id="about"]');
  const before = await about.evaluate((panel) => panel.getBoundingClientRect().left);

  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await expect.poll(() => about.evaluate((panel) => panel.getBoundingClientRect().left)).toBeLessThan(before - 20);

  await expect(page.locator('[data-hud-station]')).not.toHaveText('');
});

test('HUD station links jump to stage panels', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-hud-station-link="music"]').click();
  await expect(page).toHaveURL(/\/#music$/);
  await expect(page.locator('[data-showcase-panel-id="music"]')).toBeInViewport();
  await expect(page.locator('[data-hud-station-link="music"]')).toHaveAttribute('aria-current', 'true');
});

test('mobile home uses a swipeable horizontal carousel', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto('/');
  const section = page.locator('[data-showcase]');
  await expect(section).toBeVisible();

  await expect.poll(() => section.evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto');
  await expect.poll(() => page.locator('[data-showcase-track]').evaluate((el) => getComputedStyle(el).flexDirection)).toBe('row');

  await section.evaluate((el) => el.scrollTo({ left: window.innerWidth, behavior: 'instant' }));
  await expect.poll(() => section.evaluate((el) => el.scrollLeft)).toBeGreaterThan(40);

  await context.close();
});

test('reduced motion renders a vertical stack', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();

  await page.goto('/');
  await expect(page.locator('[data-showcase]')).toBeVisible();

  const positions = await page.locator('[data-showcase-panel]').evaluateAll((panels) =>
    panels.slice(0, 2).map((panel) => Math.round(panel.getBoundingClientRect().top)),
  );
  expect(positions[1]).toBeGreaterThan(positions[0] ?? -1);

  await context.close();
});

test('language toggle preserves section', async ({ page }) => {
  await page.goto('/about');
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/about\/?$/);
  await expect(page.locator('nav a[href="/about"], nav a[href="/about/"]')).toHaveCount(1);
});
