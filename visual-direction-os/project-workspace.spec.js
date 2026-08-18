const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1&projectDemo=1';

async function applyNarrativeDemo(page, description) {
  const sceneDescription = page.getByLabel('Scene description');
  await sceneDescription.fill(description);
  await page.getByLabel('Director intent').fill('End with the character reclaiming control.');
  await page.getByRole('button', { name:/Start interpretation/i }).click();
  await expect(page.locator('[data-reading-card]').first()).toBeVisible();
  await page.locator('[data-reading-card]').first().click();
  await page.getByRole('button', { name:/Confirm reading/i }).click();
  await expect(page.locator('[data-strategy-card]').first()).toBeVisible();
  await page.locator('[data-strategy-card]').first().click();
  await page.getByRole('button', { name:/Select strategy/i }).click();
  await expect(page.getByRole('button', { name:/Apply to Director/i })).toBeVisible();
  await page.getByRole('button', { name:/Apply to Director/i }).click();
  await expect(page.getByRole('button', { name:/Applied to Director/i })).toBeVisible();
}

test('Project Breakdown becomes an isolated five-Scene directing workflow', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:1100 });
  await page.goto(url);

  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await expect(page.locator('.project-progress')).toContainText('00 SCENES');
  await page.getByRole('button', { name:'BREAK DOWN STORY' }).first().click();
  await expect(page.getByRole('heading', { name:'Break down story' })).toBeVisible();
  await page.getByRole('button', { name:'BREAK DOWN STORY' }).last().click();

  await expect(page.getByRole('heading', { name:'PROJECT READING' })).toBeVisible();
  await expect(page.locator('[data-proposal-scene-id]')).toHaveCount(4);
  await page.locator('[data-action="split-scene"]').nth(1).click();
  await expect(page.locator('[data-proposal-scene-id]')).toHaveCount(5);
  await page.getByRole('button', { name:'CONFIRM SCENE STRUCTURE' }).click();

  await expect(page.locator('.project-scene-node')).toHaveCount(5);
  const cameraCells = page.locator('[data-project-arc-row="camera"] [data-scene-id]');
  await expect(cameraCells).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await expect(cameraCells.nth(index)).toHaveText('—');

  await page.locator('.project-scene-node').first().click();
  await expect(page.locator('#project-scene-context-bar')).toContainText('01 / 05');
  await expect(page.locator('.project-narrative-context')).toContainText('PROJECT CONTEXT');
  await expect(page.locator('.project-narrative-context')).toContainText('UPSTREAM INTENT', { ignoreCase:true });

  await applyNarrativeDemo(page, 'He accepts the assignment because the institutional order still feels normal and unavoidable.');
  const sceneOneSnapshot = await page.evaluate(() => window.VDOSScene.getSceneState());

  await page.getByRole('button', { name:/PROJECT ARC/i }).click();
  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  const directedCameraCells = page.locator('[data-project-arc-row="camera"] [data-scene-id]');
  await expect(directedCameraCells.nth(0)).not.toHaveText('—');
  await expect(directedCameraCells.nth(1)).toHaveText('—');

  await page.locator('.project-scene-node').nth(1).click();
  await expect(page.locator('#project-scene-context-bar')).toContainText('02 / 05');
  await page.locator('[data-mode="direct"]').first().click();
  await page.locator('[data-owner-choice="character"]').click();
  await page.evaluate(async () => {
    await window.VDOSProjectContext.runtime.captureActiveScene();
    window.VDOSProjectContext.runtime.markVisualDirected();
  });
  const sceneTwoSnapshot = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(sceneTwoSnapshot.agency).toBe('character');

  await page.getByRole('button', { name:/PROJECT ARC/i }).click();
  const twoDirectedCameraCells = page.locator('[data-project-arc-row="camera"] [data-scene-id]');
  await expect(twoDirectedCameraCells.nth(0)).not.toHaveText('—');
  await expect(twoDirectedCameraCells.nth(1)).not.toHaveText('—');
  await expect(page.locator('.project-continuity')).toContainText(/PASS|WARN|FAIL|UNRESOLVED/);
  await expect(page.getByRole('button', { name:/auto.?fix|fix automatically/i })).toHaveCount(0);

  await page.locator('.project-scene-node').first().click();
  const restoredSceneOne = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(restoredSceneOne.agency).toBe(sceneOneSnapshot.agency);
  expect(restoredSceneOne.variables.camera.perspective).toBe(sceneOneSnapshot.variables.camera.perspective);
  expect(restoredSceneOne.variables.color.territory).toBe(sceneOneSnapshot.variables.color.territory);
});

test('Project Context does not create a fifth Director mode', async ({ page }) => {
  await page.goto(url);
  const modeNames = await page.locator('[data-mode]').evaluateAll(nodes => [...new Set(nodes.map(node => node.dataset.mode))]);
  expect(modeNames.sort()).toEqual(['diagnose','direct','learn','narrative']);
});
