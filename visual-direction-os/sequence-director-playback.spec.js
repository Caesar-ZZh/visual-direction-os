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

test('tension marker remains geometrically on the SVG curve across the full sequence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#sequence-root .sequence-tension-chart').waitFor();

  for (const value of [0, 17, 34, 50, 66, 82, 100]) {
    await page.locator('#sequence-playhead').evaluate((input, next) => {
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);

    const geometry = await page.evaluate(() => {
      const path = document.querySelector('[data-tension-path]');
      const marker = document.querySelector('[data-tension-marker]');
      const input = document.querySelector('#sequence-playhead');
      if (!path || !marker || marker.tagName.toLowerCase() !== 'circle') return null;
      const mx = Number(marker.getAttribute('cx'));
      const my = Number(marker.getAttribute('cy'));
      const total = path.getTotalLength();
      let minDistance = Infinity;
      for (let index = 0; index <= 500; index += 1) {
        const point = path.getPointAtLength(total * index / 500);
        const distance = Math.hypot(point.x - mx, point.y - my);
        if (distance < minDistance) minDistance = distance;
      }
      return {
        minDistance,
        markerX: mx,
        expectedX: Number(input.value)
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry.minDistance).toBeLessThan(0.45);
    expect(Math.abs(geometry.markerX - geometry.expectedX)).toBeLessThan(1.6);
  }
});

for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
  test(`${viewport.name} visual-event labels never overlap`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url);
    const labels = page.locator('#sequence-root .sequence-event-visible-label:visible');
    await expect(labels).toHaveCount(6);

    const overlaps = await labels.evaluateAll(nodes => {
      const boxes = nodes.map((node, index) => ({ index, text: node.textContent.trim(), rect: node.getBoundingClientRect() }));
      const collisions = [];
      for (let a = 0; a < boxes.length; a += 1) {
        for (let b = a + 1; b < boxes.length; b += 1) {
          const A = boxes[a].rect;
          const B = boxes[b].rect;
          const horizontal = Math.min(A.right, B.right) - Math.max(A.left, B.left);
          const vertical = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (horizontal > 0.5 && vertical > 0.5) collisions.push(`${boxes[a].text} <> ${boxes[b].text}`);
        }
      }
      return collisions;
    });
    expect(overlaps).toEqual([]);
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
  const transition = await page.locator('.sequence-tension-marker').evaluate(node => getComputedStyle(node).transitionDuration);
  expect(transition).toBe('0s');
  await context.close();
});
