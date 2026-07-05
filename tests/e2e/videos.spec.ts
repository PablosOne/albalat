import { expect, test } from '@playwright/test';

test('videos page renders facades and loads YouTube only after click', async ({ page }) => {
  await page.goto('/videos');

  // Scope to the open videos lane: the music lane's (hidden) album console
  // also renders elements carrying [data-media-facade], so an unscoped
  // locator's `.first()` can resolve to a facade that never opens on this
  // route and hang waiting for visibility.
  const lane = page.locator('[data-detail-lane="videos"]');
  await expect(lane.getByRole('heading', { name: 'Sala de interpretaciones' })).toBeVisible();

  const firstFacade = lane.locator('[data-media-facade]').first();
  await expect(firstFacade).toBeVisible();
  await expect(lane.locator('iframe[src*="youtube"]')).toHaveCount(0);

  await firstFacade.getByRole('button').click();
  await expect(firstFacade.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toBeVisible();
});
