const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1&projectDemo=1';

async function visualSceneState(page) {
  return page.evaluate(() => {
    const { mode, ...visualState } = window.VDOSScene.getSceneState();
    return visualState;
  });
}

async function reachCameraSequence(page) {
  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  await page.getByLabel('Scene description').fill('He enters the office expecting to accept an assignment. During the conversation he realizes the assignment itself is a mechanism of control. He refuses and leaves.');
  await page.getByLabel('Director intent').fill('End with the character reclaiming control.');
  await page.getByRole('button', { name: /Start interpretation/i }).click();
  await expect(page.locator('[data-reading-card]')).toHaveCount(2);
  await page.locator('[data-reading-card]').first().click();
  await page.getByRole('button', { name: /Confirm reading/i }).click();
  await expect(page.locator('[data-strategy-card]')).toHaveCount(3);
  await page.locator('[data-strategy-card][data-strategy-id="camera"]').click();
  await expect(page.locator('[data-visual-ir-shadow]')).toContainText('CAMERA AUTHORITY TRANSFER');
  await page.getByRole('button', { name: /Select strategy/i }).click();
  await expect(page.locator('[data-sequence-proposal-beat]')).toHaveCount(5);
}

test('M3 compares the AI camera sequence against the deterministic compiler without mutating Scene State', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(url);
  await expect.poll(() => page.evaluate(() => Boolean(window.VDOSNarrativeWorkspaceController && window.VDOSVisualIRShadowController))).toBe(true);

  const before = await visualSceneState(page);
  await reachCameraSequence(page);

  const comparePanel = page.locator('[data-visual-compiler-compare]');
  await expect(comparePanel).toBeVisible();
  await expect(comparePanel).toContainText('AI Proposal vs Director Compiler');
  await expect(comparePanel).toContainText('DETERMINISTIC / READ-ONLY');
  await expect(comparePanel).toContainText('CAMERA AUTHORITY TRANSFER');
  await expect(comparePanel).toContainText('MATCH · 5');
  await expect(comparePanel).toContainText('CONFLICT · 0');
  await expect(comparePanel).toContainText('MISSING · 0');
  await expect(comparePanel).toContainText('BLOCKED · 0');
  await expect(page.locator('[data-compiler-beat]')).toHaveCount(5);
  await expect(page.locator('[data-compiler-beat][data-result="MATCH"]')).toHaveCount(5);

  const position = await page.evaluate(() => {
    const compare = document.querySelector('[data-visual-compiler-compare]');
    const apply = document.querySelector('.narrative-apply-preview');
    return Boolean(compare && apply && (compare.compareDocumentPosition(apply) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(position).toBe(true);

  const exposed = await page.evaluate(() => window.VDOSVisualIRShadowController.getCompilerComparison());
  expect(exposed.grammarId).toBe('camera-authority-transfer');
  expect(exposed.beats).toHaveLength(5);
  expect(exposed.totals).toEqual({ MATCH:5, CONFLICT:0, MISSING:0, BLOCKED:0 });
  expect('score' in exposed).toBe(false);

  const after = await visualSceneState(page);
  expect(after).toEqual(before);
});
