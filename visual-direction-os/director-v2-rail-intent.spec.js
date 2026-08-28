const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

async function waitForReady(page) {
  await page.goto(url);
  await expect.poll(() => page.evaluate(() => Boolean(window.VDOSProjectContext) || Boolean(document.querySelector('.project-bootstrap-error')))).toBe(true);
  await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
}

test('desktop rail preserves the first intended mode click while expanding on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await waitForReady(page);

  const before = await page.locator('.mode-btn[data-mode="narrative"]').boundingBox();
  await page.locator('.mode-btn[data-mode="narrative"]').click();

  await expect(page.locator('.mode-btn[data-mode="narrative"]')).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => page.evaluate(() => window.VDOSScene.getSceneState().mode)).toBe('narrative');
  await expect(page.locator('#narrative-panel')).toBeInViewport();

  const after = await page.locator('.mode-btn[data-mode="narrative"]').boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after.width).toBeGreaterThan(before.width);
});
