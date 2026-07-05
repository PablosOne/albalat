import { expect, test } from '@playwright/test';

test('music page renders the album story and defers embeds', async ({ page }) => {
  await page.goto('/music');

  await expect(page.getByRole('heading', { name: 'Discografia como estanteria viva' })).toBeVisible();
  await expect(page.locator('[data-album-story]')).toBeVisible();
  await expect(page.locator('[data-album-card]')).toHaveCount(2);
  await expect(page.locator('[data-album-section]')).toHaveCount(2);
  await expect(page.locator('[data-embed-facade]')).toHaveCount(2);
  await expect(page.locator('iframe')).toHaveCount(0);

  await page.getByRole('button', { name: /Cargar reproductor de Spotify/ }).first().click();
  await expect(page.locator('iframe[src*="open.spotify.com/embed"]')).toHaveCount(1);
});

test('english music page renders localized story copy', async ({ page }) => {
  await page.goto('/en/music');

  await expect(page.getByRole('heading', { name: 'Discography as a living record shelf' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Spotify' }).first()).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});
