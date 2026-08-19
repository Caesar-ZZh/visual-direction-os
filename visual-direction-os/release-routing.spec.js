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
    const glowNode = document.querySelector('.narrative-glow');
    const railLabelNode = document.querySelector('.v2-rail .mode-label');
    if (!glowNode || !railLabelNode) throw new Error('Expected Studio material targets are missing');
    const glow = getComputedStyle(glowNode);
    const railLabel = getComputedStyle(railLabelNode);
    return {
      motionPress:root.getPropertyValue('--motion-press').trim(),
      grainPosition:grain.position,
      grainOpacity:parseFloat(grain.opacity),
      glowAnimation:glow.animationName,
      railLabelFamily:railLabel.fontFamily,
      bodyFamily:getComputedStyle(document.body).fontFamily
    };
  });

  expect(painted.motionPress).toBe('130ms');
  expect(painted.grainPosition).toBe('fixed');
  expect(painted.grainOpacity).toBeGreaterThanOrEqual(.02);
  expect(painted.grainOpacity).toBeLessThanOrEqual(.03);
  expect(painted.glowAnimation).toBe('none');
  expect(painted.railLabelFamily).toBe(painted.bodyFamily);
});

test('collapsed brand, hero marker and helper copy remain visually disciplined', async ({ page }) => {
  await page.setViewportSize({ width:1680, height:1000 });
  await page.goto(`${base}/studio/?narrativeDemo=1&projectDemo=1`);
  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(window.VDOSAuteurPolishRuntime))).toBe(true);

  await page.mouse.move(1200, 500);
  await expect(page.locator('.v2-rail')).toHaveAttribute('data-expanded', 'false');
  const chrome = await page.evaluate(() => {
    const rail = document.querySelector('.v2-rail');
    const brand = rail?.querySelector('.brand');
    const eyebrow = document.querySelector('.hero-copy .eyebrow');
    const marker = document.querySelector('.node-narrative');
    if (!rail || !brand || !eyebrow || !marker) throw new Error('Expected chrome targets are missing');
    const rr = rail.getBoundingClientRect();
    const br = brand.getBoundingClientRect();
    const er = eyebrow.getBoundingClientRect();
    const mr = marker.getBoundingClientRect();
    return {
      brandFontSize:parseFloat(getComputedStyle(brand).fontSize),
      brandPseudo:getComputedStyle(brand, '::before').content,
      brandInsideRail:br.left >= rr.left && br.right <= rr.right,
      brandWidth:br.width,
      markerClearsCopy:mr.bottom <= er.top - 2 || mr.left >= er.right + 8
    };
  });
  expect(chrome.brandFontSize).toBe(0);
  expect(chrome.brandPseudo).toContain('V');
  expect(chrome.brandInsideRail).toBe(true);
  expect(chrome.brandWidth).toBeLessThanOrEqual(44.5);
  expect(chrome.markerClearsCopy).toBe(true);

  await page.getByRole('button', { name:/Turn story into direction/i }).click();
  await expect(page.getByRole('heading', { name:/Tell your story/i })).toBeVisible();
  await expect.poll(() => page.locator('.narrative-editor > p').textContent()).not.toContain('。');
  const helperCopy = await page.locator('.narrative-aside-block > p').allTextContents();
  helperCopy.forEach(text => {
    expect(text).not.toContain('。');
    expect(text.trim()).not.toMatch(/\.$/);
  });
});

test('STUDIO demo route keeps Project mode explicit and returns to SYSTEM', async ({ page }) => {
  await page.setViewportSize({ width:1280, height:960 });
  await page.goto(`${base}/studio/?narrativeDemo=1&projectDemo=1`);

  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
  const systemHome = page.locator('.release-system-home');
  await expect(systemHome).toHaveAttribute('href', './');
  await Promise.all([
    page.waitForURL(url => url.pathname === '/', { timeout:10000 }),
    systemHome.click()
  ]);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#overview-title')).toBeVisible();
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