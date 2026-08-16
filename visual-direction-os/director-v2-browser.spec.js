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
  const transition = await page.locator('.ownership-focus').evaluate(node => getComputedStyle(node).transitionDuration);
  expect(transition).toBe('0s');
  await context.close();
});
