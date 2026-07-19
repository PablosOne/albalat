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

test('opening a detail animates both lanes through intermediate positions', async ({ page }) => {
  await page.goto('/');

  const resultPromise = page.evaluate(async () => {
    const lane = document.querySelector<HTMLElement>('[data-detail-lane="music"]')!;
    const main = document.querySelector<HTMLElement>('[data-showcase-descent]')!;
    const frames: Array<{ laneY: number; mainY: number; hidden: boolean }> = [];
    const started = performance.now();

    await new Promise<void>((resolve) => {
      const sample = () => {
        frames.push({
          laneY: new DOMMatrix(getComputedStyle(lane).transform).m42,
          mainY: new DOMMatrix(getComputedStyle(main).transform).m42,
          hidden: lane.hidden,
        });
        if (performance.now() - started < 750) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });

    return { frames, height: window.innerHeight };
  });

  // Use a real pointer click: this verifies the same event path as a visitor
  // and gives the page's async showcase/lane bootstrap time to attach.
  await page.locator('[data-showcase-panel-id="music"] [data-lane-open="music"]').click();
  const result = await resultPromise;

  const intermediateFrames = result.frames.filter(({ laneY, mainY, hidden }) =>
    !hidden
    && laneY > 1
    && laneY < result.height - 1
    && mainY < -1
    && mainY > -result.height + 1
  );

  expect(intermediateFrames.length).toBeGreaterThan(3);
  const maxLockstepError = Math.max(...intermediateFrames.map(({ laneY, mainY }) =>
    Math.abs((laneY - mainY) - result.height),
  ));
  expect(maxLockstepError).toBeLessThan(2);
});

test('desktop detail reveal pauses competing descendant motion', async ({ page }) => {
  await page.goto('/');
  const lane = page.locator('[data-detail-lane="videos"]');

  await page.locator('[data-showcase-panel-id="videos"] [data-lane-open="videos"]').click();
  await expect(lane).toHaveClass(/is-opening/);

  const runningTransformEffects = await lane.evaluate((element) =>
    element.getAnimations({ subtree: true }).filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      return effect?.target !== element
        && animation.playState === 'running'
        && effect.getKeyframes().some((frame) => frame.transform || frame.scale);
    }).length,
  );

  expect(runningTransformEffects).toBe(0);
});

test('up-arrow closes the lane and returns to the main lane', async ({ page }) => {
  await page.goto('/#music');
  const lane = page.locator('[data-detail-lane="music"]');
  await expect(lane).toBeVisible();
  await lane.locator('[data-lane-close]').click();
  await expect(lane).toBeHidden();
});

test('the about panel opens its biography detail lane', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-showcase-panel-id="about"] [data-lane-open="about"]').click();
  await expect(page.locator('[data-detail-lane="about"]')).toBeVisible();
  await expect(page).toHaveURL(/#about$/);
});

test('nav entry opens the matching lane', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Inicio' }).locator('a[data-lane-open="videos"]').click();
  await expect(page.locator('[data-detail-lane="videos"]')).toBeVisible();
});

test('deep-link route opens the lane on load', async ({ page }) => {
  await page.goto('/classes');
  await expect(page.locator('[data-detail-lane="classes"]')).toBeVisible();
});
