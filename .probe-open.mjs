import { chromium } from 'playwright';

const BASE = 'http://localhost:4341';

async function sampleOpen(page, label) {
  // Instrument: sample transforms of the lane + descent layer around the click.
  const result = await page.evaluate(async () => {
    const lane = document.querySelector('[data-detail-lane="music"]');
    const descent = document.querySelector('[data-showcase-descent]');
    const samples = [];
    const t0 = performance.now();
    const tick = () => {
      samples.push({
        t: Math.round(performance.now() - t0),
        laneHidden: lane.hidden,
        lane: getComputedStyle(lane).transform,
        descent: descent ? getComputedStyle(descent).transform : 'none',
      });
    };
    const id = setInterval(tick, 50);
    tick();
    document.querySelector('[data-showcase-panel-id="music"] [data-lane-open="music"]')?.click();
    await new Promise((r) => setTimeout(r, 900));
    clearInterval(id);
    tick();
    return samples;
  });
  console.log(`\n=== ${label} ===`);
  for (const s of result) console.log(s.t, 'hidden:', s.laneHidden, '| lane:', s.lane.slice(0, 60), '| descent:', s.descent.slice(0, 60));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
console.log('reducedMotion match:', await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
console.log('initialDetail attr on home:', await page.evaluate(() => document.documentElement.dataset.initialDetail ?? '(unset)'));
await sampleOpen(page, 'fresh home load -> click Abrir Musica');

// close it, reopen to test repeat-open
await page.keyboard.press('Escape');
await page.waitForTimeout(1000);
await sampleOpen(page, 'repeat open after Escape-close');

await browser.close();
