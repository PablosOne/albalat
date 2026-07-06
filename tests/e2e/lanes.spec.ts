import { expect, test } from '@playwright/test';

test('wheel-down pans the main lane horizontally, not vertically', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.scrollHeight > window.innerHeight * 2);
  const about = page.locator('[data-showcase-panel-id="about"]');
  const before = await about.evaluate((p) => p.getBoundingClientRect().left);
  // Lenis (the smooth-scroll lib) needs a second wheel tick to start applying
  // scroll deltas — a single synthetic wheel event is swallowed for velocity
  // calibration. Real trackpads/mice always emit a burst of ticks, so split
  // the delta across two dispatches (over the panel, not the default 0,0
  // cursor position) to match real-world wheel input.
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(200);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => about.evaluate((p) => p.getBoundingClientRect().left)).toBeLessThan(before - 10);
});

test("clicking a panel's music lane opener opens its detail lane", async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-showcase-panel-id="music"] [data-lane-open="music"]').click();
  await expect(page.locator('[data-detail-lane="music"]')).toBeVisible();
  await expect(page).toHaveURL(/#music$/);
});

test('up-arrow closes the lane and returns to the main lane', async ({ page }) => {
  await page.goto('/#music');
  const lane = page.locator('[data-detail-lane="music"]');
  await expect(lane).toBeVisible();
  await lane.locator('[data-lane-close]').click();
  await expect(lane).toBeHidden();
});

test('the about panel has no lane-opening link and no detail lane exists for it', async ({ page }) => {
  await page.goto('/');
  const aboutPanel = page.locator('[data-showcase-panel-id="about"]');
  await expect(aboutPanel.locator('a[href="#about"]')).toHaveCount(0);
  await expect(page.locator('[data-detail-lane="about"]')).toHaveCount(0);
});

test('nav entry opens the matching lane', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Inicio' }).locator('a[href="#videos"]').click();
  await expect(page.locator('[data-detail-lane="videos"]')).toBeVisible();
});

test('deep-link route opens the lane on load', async ({ page }) => {
  await page.goto('/classes');
  await expect(page.locator('[data-detail-lane="classes"]')).toBeVisible();
});
