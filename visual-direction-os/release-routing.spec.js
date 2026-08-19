const { test, expect } = require('@playwright/test');

const base = 'http://127.0.0.1:4180';

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
}

test('SYSTEM remains the public root and routes into STUDIO', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto(`${base}/`);

  await expect(page.locator('#overview-title')).toBeVisible();
  const studioEntry = page.locator('.studio-entry');
  await expect(studioEntry).toBeVisible();
  await expect(studioEntry).toHaveAttribute('href', 'studio/');
  await studioEntry.click();

  await expect(page).toHaveURL(/\/studio\/$/);
  await expect(page.locator('.v2-rail .brand small')).toHaveText('Director Workspace · v2.1');
  await expect(page.locator('.release-system-home')).toBeVisible();
  await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
});

test('assembled STUDIO paints the Auteur material and motion contract', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto(`${base}/studio/?narrativeDemo=1&projectDemo=1`);
  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();

  const painted = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const grain = getComputedStyle(document.body, '::after');
    const glow = getComputedStyle(document.querySelector('.narrative-glow'));
    const reading = getComputedStyle(document.querySelector('.project-reading'));
    const railLabel = getComputedStyle(document.querySelector('.v2-rail .mode-label'));
    return {
      motionPress:root.getPropertyValue('--motion-press').trim(),
      grainPosition:grain.position,
      grainOpacity:parseFloat(grain.opacity),
      glowAnimation:glow.animationName,
      readingColumns:reading.gridTemplateColumns.split(' ').map(parseFloat),
      railLabelFamily:railLabel.fontFamily,
      bodyFamily:getComputedStyle(document.body).fontFamily
    };
  });

  expect(painted.motionPress).toBe('130ms');
  expect(painted.grainPosition).toBe('fixed');
  expect(painted.grainOpacity).toBeGreaterThanOrEqual(.02);
  expect(painted.grainOpacity).toBeLessThanOrEqual(.03);
  expect(painted.glowAnimation).toBe('none');
  expect(painted.readingColumns).toHaveLength(5);
  expect(painted.readingColumns[0]).toBeGreaterThan(painted.readingColumns[4]);
  expect(painted.railLabelFamily).toBe(painted.bodyFamily);
});

test('STUDIO demo route keeps Project mode explicit and returns to SYSTEM', async ({ page }) => {
  await page.setViewportSize({ width:1280, height:960 });
  await page.goto(`${base}/studio/?narrativeDemo=1&projectDemo=1`);

  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
  await expect(page.locator('.release-system-home')).toHaveAttribute('href', './');
  await page.locator('.release-system-home').click();

  await expect(page.locator('#overview-title')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('mobile STUDIO exposes SYSTEM without adding a fifth Director mode', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await page.goto(`${base}/studio/?narrativeDemo=1&projectDemo=1`);

  const systemRoute = page.locator('.release-system-home-mobile');
  await expect(systemRoute).toBeVisible();
  const systemRouteBox = await systemRoute.boundingBox();
  expect(systemRouteBox).not.toBeNull();
  expect(systemRouteBox.height).toBeGreaterThanOrEqual(44);

  const modeNames = await page.locator('[data-mode]').evaluateAll(nodes => [...new Set(nodes.map(node => node.dataset.mode))]);
  expect(modeNames.sort()).toEqual(['diagnose','direct','learn','narrative']);
  await systemRoute.click();
  await expect(page.locator('#overview-title')).toBeVisible();
});

for (const viewport of [
  { name:'mobile', width:390, height:844 },
  { name:'desktop', width:1440, height:1000 }
]) {
  test(`release routes avoid page-level overflow on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width:viewport.width, height:viewport.height });
    await page.goto(`${base}/`);
    await expectNoPageOverflow(page);

    await page.goto(`${base}/studio/?narrativeDemo=1&projectDemo=1`);
    await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
    await expectNoPageOverflow(page);
  });
}