const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html';

test('desktop ownership summary stays inside its column when contested', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('[data-owner-choice="contested"]').click();
  await expect(page.locator('#ownership-primary')).toHaveText('CONTESTED');

  const metrics = await page.locator('.ownership-board').evaluate(board => {
    const summary = board.querySelector('.ownership-summary');
    const primary = board.querySelector('#ownership-primary');
    const tracks = board.querySelector('.ownership-tracks');
    const s = summary.getBoundingClientRect();
    const p = primary.getBoundingClientRect();
    const t = tracks.getBoundingClientRect();
    return {
      summaryRight: s.right,
      primaryRight: p.right,
      tracksLeft: t.left,
      summaryOverflow: summary.scrollWidth - summary.clientWidth
    };
  });

  expect(metrics.summaryOverflow).toBeLessThanOrEqual(1);
  expect(metrics.primaryRight).toBeLessThanOrEqual(metrics.summaryRight - 6);
  expect(metrics.tracksLeft - metrics.summaryRight).toBeGreaterThanOrEqual(24);
});

test('desktop rail stays collapsed until hover and expands as an overlay without shifting stage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);

  const rail = page.locator('.v2-rail');
  const stage = page.locator('.stage');
  const before = await Promise.all([
    rail.evaluate(node => node.getBoundingClientRect().width),
    stage.evaluate(node => node.getBoundingClientRect().left)
  ]);
  expect(before[0]).toBeLessThanOrEqual(72);

  await rail.hover();
  await page.waitForTimeout(220);
  const after = await Promise.all([
    rail.evaluate(node => node.getBoundingClientRect().width),
    stage.evaluate(node => node.getBoundingClientRect().left)
  ]);
  expect(after[0]).toBeGreaterThanOrEqual(240);
  expect(Math.abs(after[1] - before[1])).toBeLessThanOrEqual(2);

  await page.locator('.mode-btn[data-mode="direct"]').focus();
  const focusedWidth = await rail.evaluate(node => node.getBoundingClientRect().width);
  expect(focusedWidth).toBeGreaterThanOrEqual(240);
});

test('director option buttons use the same serif family as variable section titles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);

  const typography = await page.evaluate(() => {
    const title = document.querySelector('.variable-family h3');
    const button = document.querySelector('.variable-options button');
    const titleStyle = getComputedStyle(title);
    const buttonStyle = getComputedStyle(button);
    return {
      titleFamily: titleStyle.fontFamily,
      buttonFamily: buttonStyle.fontFamily,
      buttonSize: parseFloat(buttonStyle.fontSize),
      buttonWeight: Number(buttonStyle.fontWeight)
    };
  });

  expect(typography.buttonFamily).toBe(typography.titleFamily);
  expect(typography.buttonSize).toBeGreaterThanOrEqual(14);
  expect(typography.buttonWeight).toBeGreaterThanOrEqual(500);
  expect(typography.buttonWeight).toBeLessThanOrEqual(700);
});
