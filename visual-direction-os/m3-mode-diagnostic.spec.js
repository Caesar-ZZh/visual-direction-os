const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

async function waitForReady(page) {
  await page.goto(url);
  await expect.poll(() => page.evaluate(() => Boolean(window.VDOSProjectContext) || Boolean(document.querySelector('.project-bootstrap-error')))).toBe(true);
  await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
}

test('diagnostic: mode navigation with Shadow Adapter active', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await waitForReady(page);
  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  const state = await page.evaluate(() => ({
    mode: window.VDOSScene.getSceneState().mode,
    learnCurrent: document.querySelector('.mode-btn[data-mode="learn"]')?.getAttribute('aria-current'),
    narrativeCurrent: document.querySelector('.mode-btn[data-mode="narrative"]')?.getAttribute('aria-current'),
    scrollY: window.scrollY,
    shadow: Boolean(window.VDOSVisualIRShadowController)
  }));
  console.log('M3_MODE_ACTIVE', JSON.stringify(state));
  expect(state.mode).toBe('narrative');
  expect(state.narrativeCurrent).toBe('page');
});

test('diagnostic: mode navigation after Shadow Adapter is destroyed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await waitForReady(page);
  await page.evaluate(() => window.VDOSVisualIRShadowController?.destroy?.());
  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  const state = await page.evaluate(() => ({
    mode: window.VDOSScene.getSceneState().mode,
    learnCurrent: document.querySelector('.mode-btn[data-mode="learn"]')?.getAttribute('aria-current'),
    narrativeCurrent: document.querySelector('.mode-btn[data-mode="narrative"]')?.getAttribute('aria-current'),
    scrollY: window.scrollY,
    shadow: Boolean(window.VDOSVisualIRShadowController)
  }));
  console.log('M3_MODE_DESTROYED', JSON.stringify(state));
  expect(state.mode).toBe('narrative');
  expect(state.narrativeCurrent).toBe('page');
});
