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

async function confirmFiveSceneProject(page) {
  await page.getByRole('button', { name:'BREAK DOWN STORY' }).first().click();
  await expect(page.getByRole('heading', { name:'Break down story' })).toBeVisible();
  await page.getByRole('button', { name:'BREAK DOWN STORY' }).last().click();
  await expect(page.getByRole('heading', { name:'PROJECT READING' })).toBeVisible();
  await expect(page.locator('[data-proposal-scene-id]')).toHaveCount(4);
  await page.locator('[data-action="split-scene"]').nth(1).click();
  await expect(page.locator('[data-proposal-scene-id]')).toHaveCount(5);
  await page.getByRole('button', { name:'CONFIRM SCENE STRUCTURE' }).click();
  await expect(page.locator('.project-scene-node')).toHaveCount(5);
}

test('Project Breakdown becomes an isolated five-Scene directing workflow', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:1100 });
  await page.goto(url);

  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await expect(page.locator('.project-progress')).toContainText('00 SCENES');
  await confirmFiveSceneProject(page);

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

test('Project metadata and directed Scene state survive a reload without inventing undirected Arc values', async ({ page }) => {
  await page.setViewportSize({ width:1280, height:960 });
  await page.goto(url);
  await confirmFiveSceneProject(page);

  await page.getByRole('button', { name:'EDIT PROJECT' }).click();
  await expect(page.getByRole('heading', { name:'EDIT PROJECT' })).toBeVisible();
  await page.locator('[data-project-meta-field="title"]').fill('Agency Recovery Study');
  await page.locator('[data-project-meta-field="projectIntent"]').fill('Track when visual authority moves from institution to character.');
  await page.getByRole('button', { name:'SAVE PROJECT' }).click();
  await expect(page.getByRole('heading', { name:'Agency Recovery Study' })).toBeVisible();

  await page.locator('.project-scene-node').first().click();
  await applyNarrativeDemo(page, 'The institution still owns the frame until recognition begins to destabilize compliance.');
  const beforeReload = await page.evaluate(() => window.VDOSScene.getSceneState());

  await page.getByRole('button', { name:/PROJECT ARC/i }).click();
  const beforeCells = page.locator('[data-project-arc-row="camera"] [data-scene-id]');
  await expect(beforeCells.nth(0)).not.toHaveText('—');
  await expect(beforeCells.nth(1)).toHaveText('—');

  await page.reload();
  await expect(page.getByRole('heading', { name:'Agency Recovery Study' })).toBeVisible();
  await expect(page.locator('.project-progress')).toContainText('05 SCENES');

  const afterCells = page.locator('[data-project-arc-row="camera"] [data-scene-id]');
  await expect(afterCells).toHaveCount(5);
  await expect(afterCells.nth(0)).not.toHaveText('—');
  await expect(afterCells.nth(1)).toHaveText('—');

  await page.locator('.project-scene-node').first().click();
  const afterReload = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(afterReload.agency).toBe(beforeReload.agency);
  expect(afterReload.variables.camera.perspective).toBe(beforeReload.variables.camera.perspective);
  expect(afterReload.variables.color.territory).toBe(beforeReload.variables.color.territory);

  await page.getByRole('button', { name:/PROJECT ARC/i }).click();
  await page.locator('.project-scene-node').nth(1).click();
  const sceneTwo = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(sceneTwo.variables.camera.perspective).not.toBe(beforeReload.variables.camera.perspective);
});

test('Continuity routes a deterministic rupture boundary without auto-fix', async ({ page }) => {
  await page.setViewportSize({ width:1024, height:900 });
  await page.goto(url);
  await confirmFiveSceneProject(page);

  await page.evaluate(() => {
    const project = window.VDOSProjectContext;
    const base = window.VDOSScene.getSceneState();
    const clone = value => JSON.parse(JSON.stringify(value));
    project.store.updateScene('scene-03', { workspace:{ sceneState:clone(base) }, status:{ visual:'directed' } });
    project.store.updateScene('scene-04', { workspace:{ sceneState:clone(base) }, status:{ visual:'directed' } });
  });

  const warning = page.locator('.project-finding[data-status="WARN"]').filter({ hasText:/scene-03 → scene-04/i });
  await expect(warning).toHaveCount(1);
  await expect(warning).toContainText('Narrative rupture has no visible system response');
  await expect(warning.getByRole('button', { name:'OPEN SCENE-03' })).toBeVisible();
  await expect(warning.getByRole('button', { name:'OPEN SCENE-04' })).toBeVisible();
  await expect(page.getByRole('button', { name:/auto.?fix|fix automatically/i })).toHaveCount(0);

  await warning.getByRole('button', { name:'OPEN SCENE-04' }).click();
  await expect(page.locator('#project-scene-context-bar')).toContainText('04 / 05');
  await expect(page.locator('#project-scene-context-bar')).toContainText('REFUSAL');
});

test('Project Context does not create a fifth Director mode', async ({ page }) => {
  await page.goto(url);
  const modeNames = await page.locator('[data-mode]').evaluateAll(nodes => [...new Set(nodes.map(node => node.dataset.mode))]);
  expect(modeNames.sort()).toEqual(['diagnose','direct','learn','narrative']);
});