const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1&projectDemo=1';

test('Project Workspace survives when optional persistence script cannot load', async ({ page }) => {
  await page.route('**/project-persistence.js*', route => route.abort('failed'));
  await page.goto(url);

  await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await expect(page.locator('.project-progress')).toContainText('00 SCENES');

  const persistenceStatus = await page.evaluate(() => ({
    contextReady:Boolean(window.VDOSProjectContext),
    persistenceEnabled:window.VDOSProjectContext?.persistenceEnabled
  }));
  expect(persistenceStatus.contextReady).toBe(true);
  expect(persistenceStatus.persistenceEnabled).toBe(false);

  await page.getByRole('button', { name:'BREAK DOWN STORY' }).first().click();
  await expect(page.getByRole('heading', { name:'Break down story' })).toBeVisible();
});
