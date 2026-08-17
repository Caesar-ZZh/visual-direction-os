const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

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