const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html';

test('sequence playback advances canonical scene state and drives visual response', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#sequence-root .sequence-beat-band').waitFor();

  await page.locator('#sequence-playhead').evaluate(input => {
    input.value = '40';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#sequence-beat')).toHaveText('PRESSURE');

  await page.locator('[data-sequence-action="play"]').click();
  await expect.poll(() => page.evaluate(() => window.VDOSSequenceDirectorController?.isPlaying?.())).toBe(true);
  await page.waitForTimeout(750);

  const state = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(state.playhead).toBeGreaterThan(0.43);
  await expect(page.locator('#sequence-beat')).toHaveText('RUPTURE');
  await expect(page.locator('html')).toHaveAttribute('data-vr-pressure', 'high');
});

test('manual DIRECT edits pause playback and retain the explicit user value', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#sequence-root .sequence-beat-band').waitFor();

  await page.locator('#sequence-playhead').evaluate(input => {
    input.value = '45';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('[data-sequence-action="play"]').click();
  await expect.poll(() => page.evaluate(() => window.VDOSSequenceDirectorController?.isPlaying?.())).toBe(true);
  await page.waitForTimeout(180);

  const cool = page.locator('[data-variable-family="color"][data-variable-key="temperature"][data-variable-value="cool"]');
  await cool.click();

  await expect.poll(() => page.evaluate(() => window.VDOSSequenceDirectorController?.isPlaying?.())).toBe(false);
  const state = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(state.variables.color.temperature).toBe('cool');
  await expect(page.locator('html')).toHaveAttribute('data-vr-temperature', 'cool');
});

test('tension probe uses a restrained ring and core that remain on the SVG curve', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#sequence-root .sequence-tension-chart').waitFor();

  const ring = page.locator('[data-tension-probe-ring]');
  const core = page.locator('[data-tension-probe-core]');
  await expect(ring).toHaveCount(1);
  await expect(core).toHaveCount(1);

  const visual = await page.evaluate(() => {
    const ring = document.querySelector('[data-tension-probe-ring]');
    const core = document.querySelector('[data-tension-probe-core]');
    const ringStyle = getComputedStyle(ring);
    const coreStyle = getComputedStyle(core);
    return {
      ringFill: ringStyle.fill,
      ringStroke: ringStyle.stroke,
      ringStrokeWidth: Number.parseFloat(ringStyle.strokeWidth),
      coreFill: coreStyle.fill,
      ringRadius: Number(ring.getAttribute('r')),
      coreRadius: Number(core.getAttribute('r'))
    };
  });
  expect(visual.ringFill).toBe('none');
  expect(visual.ringStrokeWidth).toBeLessThanOrEqual(1.5);
  expect(visual.ringRadius).toBeGreaterThan(visual.coreRadius);
  expect(visual.coreRadius).toBeLessThanOrEqual(1);

  for (const value of [0, 17, 34, 50, 66, 82, 100]) {
    await page.locator('#sequence-playhead').evaluate((input, next) => {
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);

    const geometry = await page.evaluate(() => {
      const path = document.querySelector('[data-tension-path]');
      const ring = document.querySelector('[data-tension-probe-ring]');
      const core = document.querySelector('[data-tension-probe-core]');
      const input = document.querySelector('#sequence-playhead');
      if (!path || !ring || !core) return null;
      const rx = Number(ring.getAttribute('cx'));
      const ry = Number(ring.getAttribute('cy'));
      const cx = Number(core.getAttribute('cx'));
      const cy = Number(core.getAttribute('cy'));
      const total = path.getTotalLength();
      let minDistance = Infinity;
      for (let index = 0; index <= 500; index += 1) {
        const point = path.getPointAtLength(total * index / 500);
        const distance = Math.hypot(point.x - rx, point.y - ry);
        if (distance < minDistance) minDistance = distance;
      }
      return {
        minDistance,
        markerX: rx,
        expectedX: Number(input.value),
        centersMatch: Math.hypot(rx - cx, ry - cy)
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry.minDistance).toBeLessThan(0.45);
    expect(Math.abs(geometry.markerX - geometry.expectedX)).toBeLessThan(1.6);
    expect(geometry.centersMatch).toBeLessThan(0.001);
  }
});

for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
  test(`${viewport.name} event rail keeps six nodes but only the current event label visible`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url);

    const events = page.locator('#sequence-root [data-sequence-event]');
    await expect(events).toHaveCount(6);
    await expect(page.locator('#sequence-root .sequence-event-visible-label:visible')).toHaveCount(1);

    await page.locator('#sequence-playhead').evaluate(input => {
      input.value = '50';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#sequence-root .sequence-event-visible-label:visible')).toHaveCount(1);

    const activeLabel = page.locator('#sequence-root [data-sequence-event][aria-pressed="true"] .sequence-event-visible-label');
    await expect(activeLabel).toBeVisible();
    await expect(page.locator('#sequence-root .sequence-event-detail')).not.toBeEmpty();
  });
}

test('reduced motion still advances sequence state while suppressing non-essential transitions', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('#sequence-root .sequence-beat-band').waitFor();
  await page.locator('[data-sequence-action="play"]').click();
  await page.waitForTimeout(420);
  const state = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(state.playhead).toBeGreaterThan(0.015);
  const transition = await page.locator('[data-tension-probe-ring]').evaluate(node => getComputedStyle(node).transitionDuration);
  expect(transition).toBe('0s');
  await context.close();
});
