const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html';
const sizes = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop-small', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 1000 }
];

for (const size of sizes) {
  test(`${size.name} has no page overflow and keeps primary modes usable`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url);
    await page.locator('#state-machine-root .case-tabs').waitFor();
    const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    if (size.width <= 900) await expect(page.locator('.mobile-modes')).toBeVisible();
    else await expect(page.locator('.v2-rail')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('mobile page reaches the real diagnostic end and primary mode navigation remains tappable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator('#diagnostic-root .diagnostic-status').waitFor();
  await expect(page.locator('.mobile-modes a[data-mode="direct"]')).toHaveAttribute('href', '#direct-panel');
  await expect(page.locator('.mobile-modes a[data-mode="diagnose"]')).toHaveAttribute('href', '#diagnose-panel');
  await page.locator('.mobile-modes a[data-mode="diagnose"]').click();
  await expect(page.locator('.mobile-modes a[data-mode="diagnose"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#diagnostic-root')).toBeVisible();
  const afterDiagnose = await page.evaluate(() => ({ y: window.scrollY, max: document.documentElement.scrollHeight - innerHeight }));
  expect(afterDiagnose.y).toBeGreaterThan(0);
  expect(afterDiagnose.max - afterDiagnose.y).toBeLessThan(220);
  await page.locator('.mobile-modes a[data-mode="direct"]').click();
  await expect(page.locator('.mobile-modes a[data-mode="direct"]')).toHaveAttribute('aria-current', 'page');
  const directTop = await page.locator('#direct-panel').evaluate(node => node.getBoundingClientRect().top);
  expect(Math.abs(directTop)).toBeLessThan(100);
});

test('mobile mode highlight follows manual scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator('#diagnostic-root .diagnostic-status').waitFor();
  await page.locator('#direct-panel').evaluate(node => node.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(80);
  await expect(page.locator('.mobile-modes [data-mode="direct"]')).toHaveAttribute('aria-current', 'page');
  await page.locator('#diagnose-panel').evaluate(node => node.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(80);
  await expect(page.locator('.mobile-modes [data-mode="diagnose"]')).toHaveAttribute('aria-current', 'page');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
  await expect(page.locator('.mobile-modes [data-mode="learn"]')).toHaveAttribute('aria-current', 'page');
});

test('advanced tools are part of the deterministic document structure', async ({ page }) => {
  await page.goto(url);
  await expect(page.locator('#state-machine-panel')).toHaveCount(1);
  await expect(page.locator('#sequence-panel')).toHaveCount(1);
  await expect(page.locator('#color-ownership-panel')).toHaveCount(1);
  await expect(page.locator('#diagnose-panel')).toContainText('Visual system diagnostic');
  await expect(page.locator('script[src*="state-machine.js?v="]')).toHaveCount(1);
  await expect(page.locator('link[href*="director-v2-tools.css?v="]')).toHaveCount(1);
});

test('mobile hero presents a connected system map rather than a loose word row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(page.locator('.hero-visual')).toBeVisible();
  await expect(page.locator('.hero-system-map')).toBeVisible();
  await expect(page.locator('.hero-system-map [data-hero-node]')).toHaveCount(5);
  await expect(page.locator('.hero-system-path')).toBeVisible();
  const active = page.locator('.hero-system-map [data-active="true"]');
  await expect(active).toHaveCount(1);
  const opacity = await page.locator('.hero-system-map').evaluate(node => Number(getComputedStyle(node).opacity));
  expect(opacity).toBeGreaterThan(0.35);
});

test('mobile ownership field explains the conclusion with directional tracks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(page.locator('#ownership-primary')).toHaveText('WORLD');
  await expect(page.locator('[data-ownership-track]')).toHaveCount(3);
  await expect(page.locator('#ownership-reason')).toContainText('WORLD');
  await page.locator('[data-owner-choice="character"]').click();
  await expect(page.locator('#ownership-primary')).toHaveText('CHARACTER');
  await expect(page.locator('#ownership-reason')).toContainText('CHARACTER');
  await expect(page.locator('#ownership-status')).toContainText('WORLD → CHARACTER');
});

test('director workspace uses separated dark segmented controls instead of native/default buttons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(page.locator('#direct-panel select')).toHaveCount(0);
  const group = page.locator('#direct-panel .variable-options').first();
  const buttons = group.locator('button');
  await expect(buttons).toHaveCount(3);
  const visuals = await group.evaluate(node => {
    const children = [...node.querySelectorAll('button')];
    const boxes = children.map(child => child.getBoundingClientRect());
    return {
      bg: getComputedStyle(children[0]).backgroundColor,
      color: getComputedStyle(children[0]).color,
      gaps: [boxes[1].left - boxes[0].right, boxes[2].left - boxes[1].right]
    };
  });
  expect(visuals.bg).not.toBe('rgb(239, 239, 239)');
  expect(Math.min(...visuals.gaps)).toBeGreaterThanOrEqual(6);
  const warm = page.locator('[data-variable-family="color"][data-variable-key="temperature"][data-variable-value="warm"]');
  await warm.click();
  await expect(warm).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#summary-color')).toContainText('WARM');
});

test('learn mode preserves the existing knowledge atlas', async ({ page }) => {
  await page.goto(url);
  await page.locator('#knowledge-atlas').waitFor();
  const links = page.locator('#knowledge-atlas a[data-knowledge-route]');
  await expect(links).toHaveCount(11);
  await expect(page.locator('#knowledge-atlas a[data-knowledge-route="character"]')).toHaveAttribute('href', 'knowledge.html#character');
  await expect(page.locator('#knowledge-atlas a[data-knowledge-route="qa"]')).toHaveAttribute('href', 'knowledge.html#qa');
});

test('color palette tabs render genuinely different analysis views', async ({ page }) => {
  await page.goto(url);
  await page.locator('#color-ownership-root .color-view-tabs').waitFor();
  await page.locator('[data-color-view="base"]').click();
  await expect(page.locator('#palette-panel')).toHaveAttribute('data-view', 'base');
  await expect(page.locator('#palette-panel .palette-mode-title')).toContainText('Base');
  await page.locator('[data-color-view="emotion"]').click();
  await expect(page.locator('#palette-panel')).toHaveAttribute('data-view', 'emotion');
  await expect(page.locator('#palette-panel .palette-mode-title')).toContainText('Emotion');
  await page.locator('[data-color-view="conflict"]').click();
  await expect(page.locator('#palette-panel')).toHaveAttribute('data-view', 'conflict');
  await expect(page.locator('#palette-panel .palette-mode-title')).toContainText('Conflict');
});

test('state machine, sequence score and diagnostic share one scene state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#state-machine-root .case-tabs').waitFor();
  await page.locator('[data-case="gwen"]').click();
  await page.locator('#case-playhead').evaluate(input => { input.value = '50'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#case-state-title')).toContainText('Gwen / rupture');
  await expect(page.locator('#summary-narrative')).toHaveText('RUPTURE');
  await expect(page.locator('#sequence-playhead')).toHaveValue('50');

  await page.locator('#sequence-playhead').evaluate(input => { input.value = '82'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect(page.locator('#summary-agency')).toHaveText('CHARACTER');
  await expect(page.locator('#case-playhead')).toHaveValue('82');

  await page.locator('[data-diagnostic="incoherent"]').click();
  await expect(page.locator('.diagnostic-status')).toContainText('SYSTEM COHERENCE · FAIL');
  await expect(page.locator('.diagnostic-list article[data-level="FAIL"]')).toContainText('Character and World both claim primary ownership.');
});

test('reduced motion keeps information and disables staged transitions', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('#state-machine-root .case-tabs').waitFor();
  await expect(page.locator('#ownership-status')).toBeVisible();
  const transition = await page.locator('.ownership-marker').first().evaluate(node => getComputedStyle(node).transitionDuration);
  expect(transition).toBe('0s');
  await context.close();
});
