# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stage.spec.ts >> lane switch navigates to About
- Location: tests\e2e\stage.spec.ts:10:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-showcase-panel-id="about"] a[href="/about"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Saltar al contenido" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - link "Home" [ref=e3] [cursor=pointer]:
    - /url: "#hero"
    - text: Eulogio Albalat
  - navigation "Inicio" [ref=e4]:
    - link "Inicio" [ref=e5] [cursor=pointer]:
      - /url: /
    - generic [ref=e6]:
      - link "Biografía" [ref=e7] [cursor=pointer]:
        - /url: "#about"
      - link "Música" [ref=e8] [cursor=pointer]:
        - /url: "#music"
      - link "Vídeos" [ref=e9] [cursor=pointer]:
        - /url: "#videos"
      - link "La guitarra" [ref=e10] [cursor=pointer]:
        - /url: "#guitar"
      - link "Clases y conciertos" [ref=e11] [cursor=pointer]:
        - /url: "#classes"
    - link "English" [ref=e12] [cursor=pointer]:
      - /url: /en/
  - main [ref=e13]:
    - region "Eulogio Albalat" [ref=e15]:
      - generic [ref=e16]:
        - article [ref=e17]:
          - generic [ref=e26]:
            - heading "Eulogio Albalat" [level=1] [ref=e27]
            - paragraph [ref=e28]: Guitarrista clásico
        - article [ref=e29]:
          - generic [ref=e36]:
            - generic [ref=e37]: "01"
            - heading "Biografía" [level=2] [ref=e38]
            - paragraph [ref=e39]: Una trayectoria dedicada a la guitarra clásica.
        - article [ref=e40]:
          - generic [ref=e41]:
            - generic [ref=e47]:
              - generic [ref=e48]: "02"
              - heading "Música" [level=2] [ref=e49]
              - paragraph [ref=e50]: Grabaciones reunidas por álbum, disponibles para escuchar.
            - link "Abrir Música" [ref=e52] [cursor=pointer]:
              - /url: "#music"
              - img [ref=e53]
              - generic [ref=e54]:
                - img [ref=e55]
                - img [ref=e57]
                - img [ref=e59]
        - article [ref=e61]:
          - generic [ref=e62]:
            - generic [ref=e68]:
              - generic [ref=e69]: "03"
              - heading "Vídeos" [level=2] [ref=e70]
              - paragraph [ref=e71]: Interpretaciones y momentos de concierto en imagen.
            - link "Abrir Vídeos" [ref=e73] [cursor=pointer]:
              - /url: "#videos"
              - img [ref=e74]
              - generic [ref=e75]:
                - img [ref=e76]
                - img [ref=e78]
                - img [ref=e80]
        - article [ref=e82]:
          - generic [ref=e83]:
            - generic [ref=e89]:
              - generic [ref=e90]: "04"
              - heading "La guitarra" [level=2] [ref=e91]
              - paragraph [ref=e92]: Notas sobre técnica, sonido e instrumentos.
            - link "Abrir La guitarra" [ref=e94] [cursor=pointer]:
              - /url: "#guitar"
              - img [ref=e95]
              - generic [ref=e96]:
                - img [ref=e97]
                - img [ref=e99]
                - img [ref=e101]
        - article [ref=e103]:
          - generic [ref=e104]:
            - generic [ref=e110]:
              - generic [ref=e111]: "05"
              - heading "Clases y conciertos" [level=2] [ref=e112]
              - paragraph [ref=e113]: Clases privadas, conciertos y contacto directo en una sola consulta.
            - link "Abrir Clases y conciertos" [ref=e115] [cursor=pointer]:
              - /url: "#classes"
              - img [ref=e116]
              - generic [ref=e117]:
                - img [ref=e118]
                - img [ref=e120]
                - img [ref=e122]
      - generic:
        - generic:
          - generic:
            - generic: "00"
            - generic: Eulogio Albalat
        - navigation "Estaciones" [ref=e124]:
          - link "01 Biografía" [ref=e125] [cursor=pointer]:
            - /url: "#about"
            - generic [ref=e126]: "01"
            - generic [ref=e127]: Biografía
          - link "02 Música" [ref=e128] [cursor=pointer]:
            - /url: "#music"
            - generic [ref=e129]: "02"
            - generic [ref=e130]: Música
          - link "03 Vídeos" [ref=e131] [cursor=pointer]:
            - /url: "#videos"
            - generic [ref=e132]: "03"
            - generic [ref=e133]: Vídeos
          - link "04 La guitarra" [ref=e134] [cursor=pointer]:
            - /url: "#guitar"
            - generic [ref=e135]: "04"
            - generic [ref=e136]: La guitarra
          - link "05 Clases y conciertos" [ref=e137] [cursor=pointer]:
            - /url: "#classes"
            - generic [ref=e138]: "05"
            - generic [ref=e139]: Clases y conciertos
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('home renders hero and nav', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await expect(page.getByRole('navigation', { name: 'Inicio' })).toBeVisible();
  6  |   await expect(page.locator('[data-showcase]')).toBeVisible();
  7  |   await expect(page.getByRole('heading', { name: 'Eulogio Albalat' })).toBeVisible();
  8  | });
  9  | 
  10 | test('lane switch navigates to About', async ({ page }) => {
  11 |   await page.goto('/');
> 12 |   await page.locator('[data-showcase-panel-id="about"] a[href="/about"]').click();
     |                                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  13 |   await expect(page).toHaveURL(/\/about\/?$/);
  14 |   await expect(page.getByRole('heading', { name: 'Eulogio Albalat' })).toBeVisible();
  15 | });
  16 | 
  17 | test('home nav jumps between horizontal stage stations', async ({ page }) => {
  18 |   await page.goto('/');
  19 |   await page.getByRole('navigation', { name: 'Inicio' }).locator('a[href="#about"]').click();
  20 |   await expect(page).toHaveURL(/\/#about$/);
  21 |   await expect(page.locator('[data-showcase-panel-id="about"]')).toBeInViewport();
  22 | });
  23 | 
  24 | test('desktop vertical scroll scrubs the stage horizontally and updates HUD station', async ({ page }) => {
  25 |   await page.goto('/');
  26 |   await page.waitForFunction(() => document.documentElement.scrollHeight > window.innerHeight * 2);
  27 |   const about = page.locator('[data-showcase-panel-id="about"]');
  28 |   const before = await about.evaluate((panel) => panel.getBoundingClientRect().left);
  29 | 
  30 |   await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  31 |   await expect.poll(() => about.evaluate((panel) => panel.getBoundingClientRect().left)).toBeLessThan(before - 20);
  32 | 
  33 |   await expect(page.locator('[data-hud-station]')).not.toHaveText('');
  34 | });
  35 | 
  36 | test('HUD station links jump to stage panels', async ({ page }) => {
  37 |   await page.goto('/');
  38 |   await page.locator('[data-hud-station-link="music"]').click();
  39 |   await expect(page).toHaveURL(/\/#music$/);
  40 |   await expect(page.locator('[data-showcase-panel-id="music"]')).toBeInViewport();
  41 |   await expect(page.locator('[data-hud-station-link="music"]')).toHaveAttribute('aria-current', 'true');
  42 | });
  43 | 
  44 | test('mobile home uses a swipeable horizontal carousel', async ({ browser }) => {
  45 |   const context = await browser.newContext({
  46 |     viewport: { width: 390, height: 844 },
  47 |     isMobile: true,
  48 |     hasTouch: true,
  49 |   });
  50 |   const page = await context.newPage();
  51 | 
  52 |   await page.goto('/');
  53 |   const section = page.locator('[data-showcase]');
  54 |   await expect(section).toBeVisible();
  55 | 
  56 |   await expect.poll(() => section.evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto');
  57 |   await expect.poll(() => page.locator('[data-showcase-track]').evaluate((el) => getComputedStyle(el).flexDirection)).toBe('row');
  58 | 
  59 |   await section.evaluate((el) => el.scrollTo({ left: window.innerWidth, behavior: 'instant' }));
  60 |   await expect.poll(() => section.evaluate((el) => el.scrollLeft)).toBeGreaterThan(40);
  61 | 
  62 |   await context.close();
  63 | });
  64 | 
  65 | test('reduced motion renders a vertical stack', async ({ browser }) => {
  66 |   const context = await browser.newContext({ reducedMotion: 'reduce' });
  67 |   const page = await context.newPage();
  68 | 
  69 |   await page.goto('/');
  70 |   await expect(page.locator('[data-showcase]')).toBeVisible();
  71 | 
  72 |   const positions = await page.locator('[data-showcase-panel]').evaluateAll((panels) =>
  73 |     panels.slice(0, 2).map((panel) => Math.round(panel.getBoundingClientRect().top)),
  74 |   );
  75 |   expect(positions[1]).toBeGreaterThan(positions[0] ?? -1);
  76 | 
  77 |   await context.close();
  78 | });
  79 | 
  80 | test('language toggle preserves section', async ({ page }) => {
  81 |   await page.goto('/about');
  82 |   await page.getByRole('link', { name: 'English' }).click();
  83 |   await expect(page).toHaveURL(/\/en\/about\/?$/);
  84 |   await expect(page.locator('nav a[href="/about"], nav a[href="/about/"]')).toHaveCount(1);
  85 | });
  86 | 
```