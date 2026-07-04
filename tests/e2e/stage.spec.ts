import { expect, test } from '@playwright/test';

test('home renders hero and nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.locator('[data-showcase]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Eulogio Albalat' })).toBeVisible();
});

test('lane switch navigates to About', async ({ page }) => {
  await page.goto('/');
  await page.locator('nav a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about\/?$/);
  await expect(page.getByRole('heading', { name: 'Eulogio Albalat' })).toBeVisible();
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
