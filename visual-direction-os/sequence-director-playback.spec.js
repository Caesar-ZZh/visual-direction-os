const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html';

test('sequence playback advances canonical scene state and drives visual response', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#sequence-root .sequence-beat-band').waitFor();

  await page.locator('#sequence-playhead').evaluate(input => {
    input.value = '40';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#sequence-beat')).toHaveText('PRESSURE');

  await page.locator('[data-sequence-action="play"]').click();
  await expect.poll(() => page.evaluate(() => window.VDOSSequenceDirectorController?.isPlaying?.())).toBe(true);
  await page.waitForTimeout(750);

  const state = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(state.playhead).toBeGreaterThan(0.43);
  await expect(page.locator('#sequence-beat')).toHaveText('RUPTURE');
  await expect(page.locator('html')).toHaveAttribute('data-vr-pressure', 'high');
});

test('manual DIRECT edits pause playback and retain the explicit user value', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#sequence-root .sequence-beat-band').waitFor();

  await page.locator('#sequence-playhead').evaluate(input => {
    input.value = '45';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('[data-sequence-action="play"]').click();
  await expect.poll(() => page.evaluate(() => window.VDOSSequenceDirectorController?.isPlaying?.())).toBe(true);
  await page.waitForTimeout(180);

  const cool = page.locator('[data-variable-family="color"][data-variable-key="temperature"][data-variable-value="cool"]');
  await cool.click();

  await expect.poll(() => page.evaluate(() => window.VDOSSequenceDirectorController?.isPlaying?.())).toBe(false);
  const state = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(state.variables.color.temperature).toBe('cool');
  await expect(page.locator('html')).toHaveAttribute('data-vr-temperature', 'cool');
});

test('reduced motion still advances sequence state while suppressing non-essential transitions', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('#sequence-root .sequence-beat-band').waitFor();
  await page.locator('[data-sequence-action="play"]').click();
  await page.waitForTimeout(420);
  const state = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(state.playhead).toBeGreaterThan(0.015);
  const transition = await page.locator('.sequence-tension-marker').evaluate(node => getComputedStyle(node).transitionDuration);
  expect(transition).toBe('0s');
  await context.close();
});
