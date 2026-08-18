const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

async function reachSequencePreview(page) {
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
}

const fontRole = family => {
  const value = family.toLowerCase();
  if (value.includes('georgia') || value.includes('times new roman')) return 'serif';
  if (value.includes('ui-monospace') || value.includes('sfmono') || value.includes('menlo') || value.includes('monospace')) return 'mono';
  return 'sans';
};

async function computedFont(page, selector) {
  return page.locator(selector).first().evaluate(node => {
    const style = getComputedStyle(node);
    return { family: style.fontFamily, size: parseFloat(style.fontSize), weight: style.fontWeight };
  });
}

test('Narrative mode exposes editorial story input instead of chat', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  await expect(page.locator('.mode-btn[data-mode="narrative"]')).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => page.evaluate(() => window.VDOSScene.getSceneState().mode)).toBe('narrative');
  await expect(page.locator('#narrative-panel')).toBeInViewport();
  await expect(page.getByRole('heading', { name: /Tell your story/i })).toBeVisible();
  await expect(page.getByLabel('Scene description')).toBeVisible();
  await expect(page.getByLabel('Director intent')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start interpretation/i })).toBeVisible();
  await expect(page.locator('[data-narrative-demo-badge]')).toHaveText('DEMO FIXTURE');
  await expect(page.locator('[data-narrative-stage]')).toHaveCount(5);
});

test('Narrative typography separates directing decisions readable copy and system metadata', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(url);
  await page.getByRole('button', { name: /Turn story into direction/i }).click();

  const stageLabel = await computedFont(page, '[data-narrative-stage="1"] strong');
  const startAction = await computedFont(page, '[data-narrative-entry] button[type="submit"]');
  const liveCopy = await computedFont(page, '[data-narrative-live]');
  const fieldMeta = await computedFont(page, '.narrative-field label');

  expect(fontRole(stageLabel.family)).toBe('serif');
  expect(stageLabel.size).toBeGreaterThanOrEqual(13);
  expect(fontRole(startAction.family)).toBe('serif');
  expect(startAction.size).toBeGreaterThanOrEqual(14);
  expect(fontRole(liveCopy.family)).toBe('sans');
  expect(liveCopy.size).toBeGreaterThanOrEqual(12);
  expect(fontRole(fieldMeta.family)).toBe('mono');

  await reachSequencePreview(page);

  const applyAll = await computedFont(page, '[data-apply-mode="all"]');
  const applySelected = await computedFont(page, '[data-apply-mode="selected"]');
  const beatChoice = await computedFont(page, '[data-apply-beat="setup"] small');
  const sequenceMeta = await computedFont(page, '.narrative-beat-variables');
  const visualEvent = await computedFont(page, '.narrative-events span');

  expect(fontRole(applyAll.family)).toBe('serif');
  expect(fontRole(applySelected.family)).toBe('serif');
  expect(applyAll.size).toBeGreaterThanOrEqual(13);
  expect(fontRole(beatChoice.family)).toBe('serif');
  expect(beatChoice.size).toBeGreaterThanOrEqual(12);
  expect(fontRole(sequenceMeta.family)).toBe('mono');
  expect(fontRole(visualEvent.family)).toBe('serif');
  expect(visualEvent.size).toBeGreaterThanOrEqual(12);
});

test('Narrative demo flows through editable Reading and Strategy into a five-beat preview without mutating Scene State', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(url);
  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  await page.getByLabel('Scene description').fill('He enters the office expecting to accept an assignment. During the conversation he realizes the assignment itself is a mechanism of control. He refuses and leaves.');
  await page.getByLabel('Director intent').fill('End with the character reclaiming control.');

  const before = await page.evaluate(() => window.VDOSScene.getSceneState());
  await page.getByRole('button', { name: /Start interpretation/i }).click();

  await expect(page.locator('[data-reading-card]')).toHaveCount(2);
  await expect(page.locator('[data-narrative-stage="1"]')).toHaveAttribute('aria-current', 'step');
  await page.locator('[data-reading-card]').first().click();
  await expect(page.getByLabel('Narrative Problem')).toBeVisible();
  await expect(page.getByLabel('Core Conflict')).toBeVisible();
  await expect(page.getByLabel('Starting State')).toBeVisible();
  await expect(page.getByLabel('Ending State')).toBeVisible();
  await expect(page.getByLabel('Turning Point')).toBeVisible();
  await expect(page.getByLabel('Agency Transition')).toBeVisible();
  await expect(page.locator('[data-field="endingState"] [data-grounding-badge]')).toHaveText('DIRECTOR INTENT');
  await page.getByLabel('Ending State').fill('He leaves with the next decision visibly belonging to him.');
  await expect(page.locator('[data-field="endingState"] [data-grounding-badge]')).toHaveText('DIRECTOR EDIT');
  await page.getByRole('button', { name: /Confirm reading/i }).click();

  await expect(page.locator('[data-strategy-card]')).toHaveCount(3);
  await expect(page.locator('[data-narrative-stage="3"]')).toHaveAttribute('aria-current', 'step');
  await page.locator('[data-strategy-card][data-strategy-id="camera"]').click();
  await page.getByRole('button', { name: /Select strategy/i }).click();

  const beats = page.locator('[data-sequence-proposal-beat]');
  await expect(beats).toHaveCount(5);
  await expect(page.locator('[data-narrative-stage="4"]')).toHaveAttribute('aria-current', 'step');
  await expect(beats.locator('[data-beat-label]')).toHaveText(['SETUP', 'PRESSURE', 'RUPTURE', 'RELEASE', 'NEW OWNERSHIP']);
  await expect(page.getByText('CAMERA BREAK', { exact: true })).toBeVisible();
  await expect(page.getByText('OWNERSHIP SHIFT', { exact: true })).toBeVisible();

  const after = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(after).toEqual(before);
});

test('Apply selected mutates only selected Sequence beats at the explicit Apply boundary and leaves DIRECT editable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(url);
  await reachSequencePreview(page);

  const before = await page.evaluate(() => ({
    scene: window.VDOSScene.getSceneState(),
    sequence: window.VDOSSequenceDirectorController.getSequence()
  }));

  await page.getByRole('button', { name: /^Apply selected$/i }).click();
  await page.locator('[data-apply-beat="setup"]').click();
  await page.locator('[data-apply-beat="pressure"]').click();
  await page.locator('[data-apply-beat="new-ownership"]').click();
  await expect(page.locator('[data-apply-beat="rupture"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-apply-beat="release"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-apply-beat="setup"]')).toHaveAttribute('aria-pressed', 'false');

  const stillPreview = await page.evaluate(() => ({
    scene: window.VDOSScene.getSceneState(),
    sequence: window.VDOSSequenceDirectorController.getSequence()
  }));
  expect(stillPreview).toEqual(before);

  await page.evaluate(() => {
    window.__narrativeApplySources = [];
    window.addEventListener('vdos:scene-state', event => window.__narrativeApplySources.push(event.detail?.source));
  });
  await page.getByRole('button', { name: /^Apply to Director$/i }).click();

  await expect(page.locator('[data-narrative-stage="5"]')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('[data-apply-status]')).toContainText('RUPTURE');
  await expect(page.locator('[data-apply-status]')).toContainText('RELEASE');

  const after = await page.evaluate(beforeSequence => {
    const sequence = window.VDOSSequenceDirectorController.getSequence();
    return {
      scene: window.VDOSScene.getSceneState(),
      sequence,
      impact: window.VDOSNarrativeApply.summarizeImpact(beforeSequence, sequence),
      sources: window.__narrativeApplySources
    };
  }, before.sequence);

  expect(after.impact.changedBeatIds).toEqual(['rupture', 'release']);
  expect(after.impact.changedEventBeatIds).toEqual(expect.arrayContaining(['rupture', 'release']));
  expect(after.sequence.beats.find(beat => beat.id === 'setup')).toEqual(before.sequence.beats.find(beat => beat.id === 'setup'));
  expect(after.sequence.events.some(event => event.id === 'rupture-proposal-0')).toBe(true);
  expect(after.sources).toContain('narrative:apply');
  expect(after.scene).not.toEqual(before.scene);

  await page.locator('[data-variable-family="camera"][data-variable-key="perspective"][data-variable-value="character"]').click();
  await expect.poll(() => page.evaluate(() => window.VDOSScene.getSceneState().variables.camera.perspective)).toBe('character');
});

test('desktop primary mode targets keep their vertical centers when the rail expands', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.mouse.move(1200, 500);
  await page.waitForTimeout(260);
  const positions = await page.evaluate(async () => {
    const rail = document.querySelector('.v2-rail');
    const read = () => [...rail.querySelectorAll('.mode-btn')].map(button => {
      const rect = button.getBoundingClientRect();
      return { mode: button.dataset.mode, centerY: rect.top + rect.height / 2 };
    });
    rail.dataset.expanded = 'false';
    await new Promise(resolve => setTimeout(resolve, 280));
    const collapsed = read();
    rail.dataset.expanded = 'true';
    await new Promise(resolve => setTimeout(resolve, 320));
    const expanded = read();
    return { collapsed, expanded };
  });
  positions.collapsed.forEach((before, index) => {
    const after = positions.expanded[index];
    expect(after.mode).toBe(before.mode);
    expect(Math.abs(after.centerY - before.centerY)).toBeLessThanOrEqual(4);
  });
});

test('mobile exposes four primary modes without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(page.locator('.mobile-modes [data-mode]')).toHaveCount(4);
  await expect(page.locator('.mobile-modes [data-mode="narrative"]')).toBeVisible();
  const metrics = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    nav: document.querySelector('.mobile-modes').getBoundingClientRect().toJSON()
  }));
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.nav.x).toBeGreaterThanOrEqual(0);
  expect(metrics.nav.x + metrics.nav.width).toBeLessThanOrEqual(390.5);
});