const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html';

for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
  test(`${viewport.name} diagnostic route reaches the exact DIRECT control without auto-fixing`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url);
    await page.locator('#diagnostic-root .diagnostic-status').waitFor();
    await page.locator('[data-diagnostic="current"]').click();

    await page.evaluate(() => {
      window.VDOSScene.updateSceneState({
        agency: 'character',
        ownership: { character: 'high', world: 'low', narrative: 'medium' },
        variables: { camera: { perspective: 'world', stability: 'medium' } },
        diagnosticContext: { hasNarrativeCause: true, primaryChanges: 1 }
      }, 'test:camera-mismatch');
    });

    const finding = page.locator('[data-finding-id="camera-ownership"]');
    await expect(finding).toHaveAttribute('data-level', 'WARN');
    await expect(finding).toContainText('OWNERSHIP');
    await expect(finding.locator('[data-fix-route]')).toHaveCount(1);
    await expect(finding.locator('[data-learn-route]')).toHaveAttribute('href', 'knowledge.html#character');
    await expect(finding).toContainText('CURRENT');
    await expect(finding).toContainText('WORLD');
    await expect(finding).toContainText('MIXED → CHARACTER');

    const before = await page.evaluate(() => window.VDOSScene.getSceneState().variables.camera.perspective);
    expect(before).toBe('world');

    await finding.locator('[data-fix-route]').click();

    const afterRoute = await page.evaluate(() => window.VDOSScene.getSceneState().variables.camera.perspective);
    expect(afterRoute).toBe('world');

    const targetGroup = page.locator('.control-row.is-route-target').filter({ has: page.locator('[data-variable-family="camera"][data-variable-key="perspective"]') });
    await expect(targetGroup).toHaveCount(1);
    const targetBox = await targetGroup.evaluate(node => node.getBoundingClientRect());
    expect(targetBox.bottom).toBeGreaterThan(0);
    expect(targetBox.top).toBeLessThan(viewport.height);

    const focused = await page.evaluate(() => ({
      family: document.activeElement?.dataset?.variableFamily || null,
      key: document.activeElement?.dataset?.variableKey || null
    }));
    expect(focused).toEqual({ family: 'camera', key: 'perspective' });

    if (viewport.width <= 900) await expect(page.locator('.mobile-modes [data-mode="direct"]')).toHaveAttribute('aria-current', 'page');
    else await expect(page.locator('.v2-rail [data-mode="direct"]')).toHaveAttribute('aria-current', 'page');

    await page.locator('[data-variable-family="camera"][data-variable-key="perspective"][data-variable-value="character"]').click();
    await expect(finding).toHaveAttribute('data-level', 'PASS');
    await expect(finding.locator('[data-fix-route]')).toHaveCount(0);
    await expect(page.locator('#diagnostic-root .diagnostic-status')).toHaveAttribute('data-level', 'PASS');
    const corrected = await page.evaluate(() => window.VDOSScene.getSceneState().variables.camera.perspective);
    expect(corrected).toBe('character');
  });
}

test('real sequence-context route reports the targeted fix even when another warning legitimately remains', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#sequence-root .sequence-beat-band').waitFor();
  await page.locator('[data-diagnostic="current"]').click();

  // Enter RELEASE through the real Sequence Director so sequence-aware diagnostics remain active.
  await page.locator('#sequence-playhead').evaluate(input => {
    input.value = '62';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#sequence-beat')).toHaveText('RELEASE');

  // Create a real current-scene ownership mismatch using DIRECT controls while preserving release context.
  await page.locator('[data-owner-choice="character"]').click();
  await page.locator('[data-variable-family="camera"][data-variable-key="perspective"][data-variable-value="world"]').click();

  const cameraFinding = page.locator('[data-finding-id="camera-ownership"]');
  await expect(cameraFinding).toHaveAttribute('data-level', 'WARN');
  await expect(page.locator('[data-finding-id="sequence-recovery"]')).toHaveAttribute('data-level', 'WARN');

  await cameraFinding.locator('[data-fix-route]').click();
  await page.locator('[data-variable-family="camera"][data-variable-key="perspective"][data-variable-value="character"]').click();

  await expect(cameraFinding).toHaveAttribute('data-level', 'PASS');
  await expect(page.locator('.diagnostic-route-resolution')).toContainText('ROUTE RESOLVED');
  await expect(page.locator('.diagnostic-route-resolution')).toContainText('CAMERA');
  await expect(page.locator('#diagnostic-root .diagnostic-status')).toHaveAttribute('data-level', 'WARN');
  await expect(page.locator('#diagnostic-root .diagnostic-status')).toContainText('1 WARN REMAINS');
  await expect(page.locator('[data-finding-id="sequence-recovery"]')).toHaveAttribute('data-level', 'WARN');
});
