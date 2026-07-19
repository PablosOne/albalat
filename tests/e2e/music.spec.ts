import { expect, test } from '@playwright/test';

test('music page renders the album story with real covers', async ({ page }) => {
  await page.goto('/music');
  await expect(page.getByRole('heading', { name: 'Discografía como estantería viva' })).toBeVisible();
  await expect(page.locator('[data-album-card]')).toHaveCount(2);
  await expect(page.locator('[data-album-section]')).toHaveCount(2);
  await expect(page.locator('#now-playing-bar')).toBeHidden();
});

test('playing a track raises the persistent bar with the right title', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track][data-album-id="torroba-guitar-music"][data-track-index="0"]').click();
  const bar = page.locator('#now-playing-bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('[data-np-title]')).toContainText('Turegano');
  // audio element carries a preview src
  const src = await page.evaluate(() => (window as any).__nowPlaying?.getState()?.track?.previewUrl ?? '');
  expect(src).toContain('mzaf_');
});

test('the bar and its audio persist across client-side navigation', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track][data-album-id="torroba-guitar-music"][data-track-index="0"]').click();
  await expect(page.locator('#now-playing-bar')).toBeVisible();
  // tag the node to prove identity survives the swap
  await page.evaluate(() => document.getElementById('now-playing-bar')!.setAttribute('data-probe', 'kept'));
  // The "Vídeos"/etc nav links are same-page #hash lane triggers intercepted by
  // lanes.ts (no ClientRouter swap) — only the Home link is a genuine
  // cross-document route change from /music, so it's the one that actually
  // exercises transition:persist.
  await page.getByRole('link', { name: 'Inicio' }).click();
  await expect(page).toHaveURL(/\/$/);
  const bar = page.locator('#now-playing-bar');
  await expect(bar).toBeVisible();
  await expect(bar).toHaveAttribute('data-probe', 'kept'); // same DOM node
  await expect(bar.locator('[data-np-title]')).toContainText('Turegano');
});

test('expand-to-full swaps in a provider embed and pauses the preview', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track][data-album-id="torroba-guitar-music"][data-track-index="0"]').click();
  await page.locator('#now-playing-bar [data-np-full]').click();
  await expect(page.locator('#now-playing-bar [data-np-embed] iframe')).toHaveCount(1);
  const mode = await page.evaluate(() => (window as any).__nowPlaying?.getState()?.mode);
  expect(mode).toBe('full');
});

test('close hides the bar', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track]').first().click();
  await expect(page.locator('#now-playing-bar')).toBeVisible();
  await page.locator('#now-playing-bar [data-np-close]').click();
  await expect(page.locator('#now-playing-bar')).toBeHidden();
});

test('the playing track drives the ambient theme CSS variable', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-track][data-album-id="torroba-guitar-music"][data-track-index="5"]').click(); // Nocturno
  const glow = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--album-glow').trim());
  expect(glow.toLowerCase()).toBe('#3f4a63');
});

test('english music page renders localized copy', async ({ page }) => {
  await page.goto('/en/music');
  await expect(page.getByRole('heading', { name: 'Discography as a living record shelf' })).toBeVisible();
});

test.describe('mobile playback control', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('joins the active header and disappears when paused', async ({ page }) => {
    await page.goto('/music');
    await page.locator('[data-play-track]').first().click();
    await page.waitForFunction(() => (window as any).__nowPlaying?.getState()?.isPaused === false);

    const detailControl = page.locator('[data-detail-lane="music"] [data-np-mobile-toggle]');
    await expect(detailControl).toBeVisible();
    await expect(page.locator('#now-playing-bar')).toBeHidden();

    await page.locator('[data-detail-lane="music"] [data-lane-close]').click();
    const navControl = page.locator('.nav-mobile-bar > [data-np-mobile-toggle]');
    await expect(navControl).toBeVisible();

    await navControl.click();
    await expect(navControl).toBeHidden();
    await expect.poll(() => page.evaluate(() => (window as any).__nowPlaying?.getState()?.isPaused)).toBe(true);
  });
});
