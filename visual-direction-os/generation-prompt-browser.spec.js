const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1&projectDemo=1';

async function confirmProjectAndOpenFirstScene(page) {
  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await page.getByRole('button', { name:'BREAK DOWN STORY' }).first().click();
  await expect(page.getByRole('heading', { name:'Break down story' })).toBeVisible();
  await page.getByRole('button', { name:'BREAK DOWN STORY' }).last().click();
  await expect(page.getByRole('heading', { name:'PROJECT READING' })).toBeVisible();
  await expect(page.locator('[data-proposal-scene-id]')).toHaveCount(4);
  await page.getByRole('button', { name:'CONFIRM SCENE STRUCTURE' }).click();
  await expect(page.locator('.project-scene-node')).toHaveCount(4);
  await page.locator('.project-scene-node').first().click();
  await expect(page.locator('#project-scene-context-bar')).toContainText('01 / 04');
  await expect(page.getByLabel('Scene description')).toBeVisible();
}

async function reachPromptPreview(page) {
  await page.getByLabel('Scene description').fill('He enters the office expecting to accept an assignment. During the conversation he realizes the assignment is a mechanism of control. He refuses and leaves.');
  await page.getByLabel('Director intent').fill('End with the character reclaiming control.');
  await page.getByRole('button', { name:/Start interpretation/i }).click();
  await expect(page.locator('[data-reading-card]')).toHaveCount(2);
  await page.locator('[data-reading-card]').first().click();
  await page.getByRole('button', { name:/Confirm reading/i }).click();
  await expect(page.locator('[data-strategy-card]')).toHaveCount(3);
  await page.locator('[data-strategy-card][data-strategy-id="camera"]').click();
  await page.getByRole('button', { name:/Select strategy/i }).click();
  await expect(page.locator('[data-sequence-proposal-beat]')).toHaveCount(5);
  await expect(page.locator('[data-generation-prompt-panel]')).toBeVisible();
}

async function promptStatus(page, beatId) {
  await page.locator(`[data-generation-prompt-beat="${beatId}"]`).click();
  return page.locator('[data-generation-prompt-panel]');
}

test('M8 Prompt Inspector stays DRAFT before Apply and selected Apply authorizes only selected Beats', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:1100 });
  await page.goto(url);
  await confirmProjectAndOpenFirstScene(page);
  await reachPromptPreview(page);

  const panel = page.locator('[data-generation-prompt-panel]');
  await expect(panel).toContainText('GENERATION PROMPT · DRAFT');
  await expect(page.locator('[data-generation-prompt-beat]')).toHaveCount(5);
  await expect(panel).toContainText('REQUIRED');
  await expect(panel).toContainText('GUIDED');
  await expect(panel).toContainText('OPEN');
  await expect(panel).toContainText('BLOCKED');
  await expect(panel).toContainText('APPLY EVIDENCE');

  const placement = await page.evaluate(() => {
    const slot = document.querySelector('[data-generation-prompt-slot]');
    const apply = document.querySelector('.narrative-apply-preview');
    return Boolean(slot && apply && (slot.compareDocumentPosition(apply) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(placement).toBe(true);

  await page.locator('[data-generation-prompt-view="rendered"]').click();
  await expect(panel).toContainText('GENERATION-FACING');
  await expect(panel).toContainText('NEGATIVE GUIDANCE');
  await expect(panel).toContainText('AUDIT / PROVENANCE');
  await page.locator('[data-generation-prompt-view="structure"]').click();

  await page.getByRole('button', { name:/^Apply selected$/i }).click();
  await page.locator('[data-apply-beat="setup"]').click();
  await page.locator('[data-apply-beat="pressure"]').click();
  await page.locator('[data-apply-beat="new-ownership"]').click();
  await page.getByRole('button', { name:/^Apply to Director$/i }).click();
  await expect(page.locator('[data-apply-status]')).toContainText('RUPTURE');
  await expect(page.locator('[data-apply-status]')).toContainText('RELEASE');

  await expect(await promptStatus(page,'rupture')).toContainText('GENERATION PROMPT · READY');
  await expect(panel).toContainText('APPLY REV');
  await expect(await promptStatus(page,'release')).toContainText('GENERATION PROMPT · READY');
  await expect(await promptStatus(page,'setup')).toContainText('GENERATION PROMPT · DRAFT');
  await expect(await promptStatus(page,'pressure')).toContainText('GENERATION PROMPT · DRAFT');
  await expect(await promptStatus(page,'new-ownership')).toContainText('GENERATION PROMPT · DRAFT');
  await expect(page.getByRole('button', { name:/^generate$/i })).toHaveCount(0);
});

test('Apply all makes current Beat READY and a manual DIRECT exact-field edit removes generation authority', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:1100 });
  await page.goto(url);
  await confirmProjectAndOpenFirstScene(page);
  await reachPromptPreview(page);

  await page.getByRole('button', { name:/^Apply to Director$/i }).click();
  const panel = page.locator('[data-generation-prompt-panel]');
  await expect(panel).toContainText('GENERATION PROMPT · READY');

  const before = await page.evaluate(() => window.VDOSScene.getSceneState().variables.camera.perspective);
  expect(before).not.toBe('character');
  await page.locator('[data-mode="direct"]').first().click();
  await page.locator('[data-variable-family="camera"][data-variable-key="perspective"][data-variable-value="character"]').click();
  await expect.poll(() => page.evaluate(() => window.VDOSScene.getSceneState().variables.camera.perspective)).toBe('character');
  await page.locator('[data-mode="narrative"]').first().click();
  await expect(panel).toContainText('GENERATION PROMPT · BLOCKED');
  await expect(panel).toContainText('SCENE_PROVENANCE_DIVERGENCE');
  await expect(page.getByRole('button', { name:/^generate$/i })).toHaveCount(0);
});
