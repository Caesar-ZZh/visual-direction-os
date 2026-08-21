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
  await page.getByRole('button', { name: /Select strategy/i }).click();
  await expect(page.locator('[data-sequence-proposal-beat]')).toHaveCount(5);
  await expect(page.locator('[data-visual-compiler-compare]')).toBeVisible();
  await expect(page.locator('[data-visual-authority-plan]')).toBeVisible();
}

async function installRawCameraConflict(page) {
  await page.evaluate(() => {
    const controller = window.VDOSNarrativeWorkspaceController;
    const originalGetDraftState = controller.getDraftState.bind(controller);
    const rawDraft = originalGetDraftState();
    const rupture = rawDraft.sequenceProposal.beats.find(beat => beat.id === 'rupture');
    rupture.sceneStatePatch.variables.camera.perspective = 'world';
    window.__M4RawDraft = rawDraft;
    controller.getDraftState = () => JSON.parse(JSON.stringify(window.__M4RawDraft));
    window.VDOSVisualIRShadowController.sync();
    window.VDOSVisualIRShadowController.syncSequenceCompare();
    window.VDOSVisualIRShadowController.syncAuthorityPlan();
  });
}

test('M4 compiler overrides a supported AI conflict only at explicit Apply while raw proposal stays auditable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(url);
  await expect.poll(() => page.evaluate(() => Boolean(
    window.VDOSNarrativeWorkspaceController &&
    window.VDOSVisualIRShadowController &&
    window.VDOSNarrativeApplyUIController &&
    window.VDOSSequenceDirectorController
  ))).toBe(true);

  const before = await visualSceneState(page);
  await reachCameraSequence(page);
  await installRawCameraConflict(page);

  const compare = page.locator('[data-visual-compiler-compare]');
  await expect(compare).toContainText('MATCH · 4');
  await expect(compare).toContainText('CONFLICT · 1');
  await expect(page.locator('[data-compiler-beat="rupture"]')).toHaveAttribute('data-result', 'CONFLICT');

  const authority = page.locator('[data-visual-authority-plan]');
  await expect(authority).toContainText('COMPILER AUTHORITY');
  await expect(authority).toContainText('GUARDED / APPLY-TIME');
  await expect(authority).toContainText('OVERRIDE');
  const override = page.locator('[data-authority-beat="rupture"] [data-authority-action="OVERRIDE"]');
  await expect(override).toContainText('AI · WORLD');
  await expect(override).toContainText('RESOLVED · MIXED');
  await expect(override).toContainText('COMPILER AUTHORITATIVE');

  const rawBeforeApply = await page.evaluate(() => window.VDOSNarrativeWorkspaceController.getDraftState().sequenceProposal.beats.find(beat => beat.id === 'rupture').sceneStatePatch.variables.camera.perspective);
  expect(rawBeforeApply).toBe('world');
  const beforeApply = await visualSceneState(page);
  expect(beforeApply).toEqual(before);

  await page.getByRole('button', { name: /^Apply to Director$/ }).click();
  await expect(page.locator('[data-apply-status]')).toContainText('COMPILER GUARDED');

  const applied = await page.evaluate(() => {
    const sequence = window.VDOSSequenceDirectorController.getSequence();
    const beat = sequence.beats.find(item => item.id === 'rupture');
    const events = sequence.events.filter(item => item.beatId === 'rupture');
    const raw = window.VDOSNarrativeWorkspaceController.getDraftState().sequenceProposal.beats.find(item => item.id === 'rupture');
    return {
      perspective: beat.scenePatch.variables.camera.perspective,
      eventPerspectives: events.map(event => event.targetPatch.variables.camera.perspective),
      rawPerspective: raw.sceneStatePatch.variables.camera.perspective
    };
  });
  expect(applied.perspective).toBe('mixed');
  expect(applied.eventPerspectives.length).toBeGreaterThan(0);
  expect(applied.eventPerspectives.every(value => value === 'mixed')).toBe(true);
  expect(applied.rawPerspective).toBe('world');

  // M3 must keep auditing raw AI output after Apply; it must not become a synthetic MATCH.
  await expect(compare).toContainText('CONFLICT · 1');

  await page.locator('.mode-btn[data-mode="direct"]').evaluate(button => button.click());
  await page.locator('[data-variable-family="camera"][data-variable-key="perspective"][data-variable-value="character"]').click();
  await expect.poll(() => page.evaluate(() => window.VDOSScene.getSceneState().variables.camera.perspective)).toBe('character');
});
