const { test, expect } = require('@playwright/test');

const baseUrl = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1&projectDemo=1';
const violationUrl = `${baseUrl}&sequenceCompletionViolation=camera-owned-write`;

async function visualSceneState(page) {
  return page.evaluate(() => {
    const { mode, ...visualState } = window.VDOSScene.getSceneState();
    return visualState;
  });
}

async function waitForControllers(page) {
  await expect.poll(() => page.evaluate(() => Boolean(
    window.VDOSNarrativeWorkspaceController &&
    window.VDOSVisualIRShadowController &&
    window.VDOSNarrativeApplyUIController &&
    window.VDOSSequenceDirectorController
  ))).toBe(true);
}

async function chooseCameraStrategy(page, { expectSequence = true } = {}) {
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
  if (expectSequence) await expect(page.locator('[data-sequence-proposal-beat]')).toHaveCount(5);
}

test('M5 compiler-first Camera sequence exposes provenance, assembles deterministic ownership and stays preview-only until Apply', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(baseUrl);
  await waitForControllers(page);
  const before = await visualSceneState(page);

  await chooseCameraStrategy(page);

  const origin = page.locator('[data-sequence-origin]');
  await expect(origin).toBeVisible();
  await expect(origin).toContainText('SEQUENCE ORIGIN · COMPILER-FIRST');
  await expect(origin).toContainText('CAMERA-AUTHORITY-TRANSFER');
  await expect(page.locator('[data-visual-compiler-compare]')).toBeVisible();
  await expect(page.locator('[data-visual-authority-plan]')).toBeVisible();

  const order = await page.evaluate(() => {
    const output = document.querySelector('[data-narrative-output]');
    const children = [...output.children];
    return {
      origin: children.indexOf(output.querySelector('[data-sequence-origin-slot]')),
      compare: children.indexOf(output.querySelector('[data-visual-compiler-slot]')),
      authority: children.indexOf(output.querySelector('[data-visual-authority-slot]')),
      apply: children.indexOf(output.querySelector('.narrative-apply-preview'))
    };
  });
  expect(order.origin).toBeGreaterThanOrEqual(0);
  expect(order.origin).toBeLessThan(order.compare);
  expect(order.compare).toBeLessThan(order.authority);
  expect(order.authority).toBeLessThan(order.apply);

  const artifacts = await page.evaluate(() => {
    const state = window.VDOSNarrativeWorkspaceController.getDraftState();
    const raw = state.sequenceCompletion.sequenceCompletion.beats;
    const assembled = state.sequenceProposal.beats;
    return {
      origin: state.sequenceProvenance.origin,
      rawAgencies: raw.map(beat => beat.agency),
      rawRupturePerspective: raw.find(beat => beat.id === 'rupture').openPatch?.variables?.camera?.perspective ?? null,
      assembledPerspectives: assembled.map(beat => [beat.id, beat.sceneStatePatch.variables.camera.perspective])
    };
  });
  expect(artifacts.origin).toBe('compiler-first');
  expect(artifacts.rawAgencies).toEqual(['world','world','contested','contested','character']);
  expect(artifacts.rawRupturePerspective).toBeNull();
  expect(Object.fromEntries(artifacts.assembledPerspectives)).toEqual({
    setup:'world', pressure:'world', rupture:'mixed', release:'mixed', 'new-ownership':'character'
  });

  await expect(page.locator('[data-authority-action="CONFIRM"]')).toHaveCount(5);
  const beforeApply = await visualSceneState(page);
  expect(beforeApply).toEqual(before);

  await page.getByRole('button', { name: /^Apply to Director$/ }).click();
  await expect(page.locator('[data-apply-status]')).toContainText('COMPILER GUARDED');
  const applied = await page.evaluate(() => {
    const sequence = window.VDOSSequenceDirectorController.getSequence();
    const rupture = sequence.beats.find(beat => beat.id === 'rupture');
    return rupture.scenePatch.variables.camera.perspective;
  });
  expect(applied).toBe('mixed');

  await page.locator('.mode-btn[data-mode="direct"]').evaluate(button => button.click());
  await page.locator('[data-variable-family="camera"][data-variable-key="perspective"][data-variable-value="character"]').click();
  await expect.poll(() => page.evaluate(() => window.VDOSScene.getSceneState().variables.camera.perspective)).toBe('character');
});

test('M5 rejects a compiler-owned Camera write, retains raw evidence and never exposes Apply', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(violationUrl);
  await waitForControllers(page);
  const before = await visualSceneState(page);

  await chooseCameraStrategy(page, { expectSequence:false });
  await expect(page.locator('[data-narrative-error]')).toBeVisible();
  await expect(page.locator('[data-sequence-proposal-beat]')).toHaveCount(0);
  await expect(page.locator('[data-apply-action]')).toHaveCount(0);
  await expect(page.locator('[data-sequence-origin]')).toHaveCount(0);

  const diagnostic = await page.evaluate(() => {
    const state = window.VDOSNarrativeWorkspaceController.getDraftState();
    const rupture = state.sequenceCompletion?.sequenceCompletion?.beats?.find(beat => beat.id === 'rupture');
    return {
      hasSkeleton: Boolean(state.sequenceSkeleton),
      rawPerspective: rupture?.openPatch?.variables?.camera?.perspective ?? null,
      proposal: state.sequenceProposal,
      provenance: state.sequenceProvenance,
      requestStatus: state.requests.sequence.status,
      requestCode: state.requests.sequence.error?.code,
      nestedCodes: (state.requests.sequence.error?.errors || []).map(item => item.code)
    };
  });
  expect(diagnostic.hasSkeleton).toBe(true);
  expect(diagnostic.rawPerspective).toBe('world');
  expect(diagnostic.proposal).toBeNull();
  expect(diagnostic.provenance).toBeNull();
  expect(diagnostic.requestStatus).toBe('error');
  expect(diagnostic.requestCode).toBe('SEQUENCE_COMPLETION_INVALID');
  expect(diagnostic.nestedCodes).toContain('COMPILER_OWNED_FIELD_WRITE');

  const after = await visualSceneState(page);
  expect(after).toEqual(before);
});
