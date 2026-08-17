const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

test('Narrative mode exposes editorial story input instead of chat', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  await page.waitForTimeout(1400);
  const routing = await page.evaluate(() => {
    const panel = document.querySelector('#narrative-panel');
    const direct = document.querySelector('#direct-panel');
    const active = document.querySelector('.mode-btn[aria-current="page"]');
    const scene = window.VDOSScene?.getSceneState?.();
    const rect = panel.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      innerHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      narrativeOffsetTop: panel.offsetTop,
      narrativeRectTop: rect.top,
      narrativeRectBottom: rect.bottom,
      directOffsetTop: direct.offsetTop,
      activeMode: active?.dataset.mode || null,
      sceneMode: scene?.mode || null
    };
  });
  console.log('NARRATIVE_ROUTING_DIAGNOSTIC', JSON.stringify(routing));
  await expect(page.locator('#narrative-panel')).toBeInViewport();
  await expect(page.getByRole('heading', { name: /Tell your story/i })).toBeVisible();
  await expect(page.getByLabel('Scene description')).toBeVisible();
  await expect(page.getByLabel('Director intent')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start interpretation/i })).toBeVisible();
  await expect(page.locator('[data-narrative-demo-badge]')).toHaveText('DEMO FIXTURE');
  await expect(page.locator('[data-narrative-stage]')).toHaveCount(5);
});

test('mobile exposes four primary modes without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(page.locator('.mobile-modes [data-mode]')).toHaveCount(4);
  await expect(page.locator('.mobile-modes [data-mode="narrative"]')).toBeVisible();
  const metrics = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    nav: document.querySelector('.mobile-modes').getBoundingClientRect().toJSON()
  }));
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.nav.x).toBeGreaterThanOrEqual(0);
  expect(metrics.nav.x + metrics.nav.width).toBeLessThanOrEqual(390.5);
});
