import { expect, test } from '@playwright/test';

test('videos page renders facades and loads YouTube only after click', async ({ page }) => {
  await page.goto('/videos');

  await expect(page.getByRole('heading', { name: 'Sala de interpretaciones' })).toBeVisible();

  const firstFacade = page.locator('[data-media-facade]').first();
  await expect(firstFacade).toBeVisible();
  await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(0);

  await firstFacade.getByRole('button').click();
  await expect(firstFacade.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeVisible();
});
