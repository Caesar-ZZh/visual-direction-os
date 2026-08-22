const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1&projectDemo=1';

async function visualState(page) {
  return page.evaluate(() => {
    const { mode, ...state } = window.VDOSScene.getSceneState();
    return state;
  });
}

async function reachStrategies(page) {
  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  await page.getByLabel('Scene description').fill('He enters expecting to accept an assignment, recognizes it as control, refuses it, and leaves on his own terms.');
  await page.getByLabel('Director intent').fill('End with agency clearly belonging to the character.');
  await page.getByRole('button', { name: /Start interpretation/i }).click();
  await expect(page.locator('[data-reading-card]')).toHaveCount(2);
  await page.locator('[data-reading-card]').first().click();
  await page.getByRole('button', { name: /Confirm reading/i }).click();
  await expect(page.locator('[data-strategy-card]')).toHaveCount(3);
}

test('Direction Logic resolves explicit grammars while remaining read-only', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await reachStrategies(page);
  const before = await visualState(page);

  const cases = [
    ['space', 'SPATIAL AUTHORSHIP', 'spatial-authorship', 'space', 'authorship-transfer'],
    ['camera', 'CAMERA AUTHORITY TRANSFER', 'camera-authority-transfer', 'camera', 'authority-transfer'],
    ['color', 'COLOR OWNERSHIP TRANSFER', 'color-ownership-transfer', 'color', 'ownership-territory-transfer']
  ];

  for (const [strategyId, label, grammarId, field, value] of cases) {
    await page.locator(`[data-strategy-card][data-strategy-id="${strategyId}"]`).click();
    const panel = page.locator('[data-visual-ir-shadow]');
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-visual-ir-grammar]')).toContainText(label);
    await expect(panel.locator('[data-visual-ir-grammar]')).toContainText('CONTRACT · SUPPORTED');
    await expect(panel.locator('[data-visual-ir-grammar]')).toContainText('EVIDENCE · SUPPORTED');

    const ir = await page.evaluate(() => window.VDOSVisualIRShadowController.getVisualIR());
    expect(ir.mode).toBe('shadow');
    expect(ir.source.grammarId).toBe(grammarId);
    expect(ir.grammar.id).toBe(grammarId);
    expect(ir.visual[field].value).toBe(value);
    expect(ir.visual.edge.value).toBe('UNKNOWN');
    expect(ir.visual.medium.value).toBe('UNKNOWN');
    expect(ir.visual.temporal.value).toBe('UNKNOWN');
  }

  expect(await visualState(page)).toEqual(before);
});
