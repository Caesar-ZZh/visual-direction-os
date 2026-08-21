const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

async function waitForReady(page) {
  await page.goto(url);
  await expect.poll(() => page.evaluate(() => Boolean(window.VDOSProjectContext) || Boolean(document.querySelector('.project-bootstrap-error')))).toBe(true);
  await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
}

async function installTrace(page) {
  await page.evaluate(() => {
    const button = document.querySelector('.mode-btn[data-mode="narrative"]');
    window.__m3ModeTrace = {
      documentCapture: [],
      buttonCapture: [],
      buttonBubble: [],
      sceneEvents: []
    };
    const pack = event => ({
      type: event.type,
      targetTag: event.target?.tagName || null,
      targetClass: event.target?.className || null,
      targetMode: event.target?.dataset?.mode || null,
      currentTag: event.currentTarget?.tagName || null,
      currentMode: event.currentTarget?.dataset?.mode || null,
      defaultPrevented: event.defaultPrevented
    });
    document.addEventListener('click', event => window.__m3ModeTrace.documentCapture.push(pack(event)), true);
    button?.addEventListener('click', event => window.__m3ModeTrace.buttonCapture.push(pack(event)), true);
    button?.addEventListener('click', event => window.__m3ModeTrace.buttonBubble.push(pack(event)));
    window.addEventListener('vdos:scene-state', event => {
      window.__m3ModeTrace.sceneEvents.push({
        source: event.detail?.source || null,
        mode: event.detail?.state?.mode || null
      });
    });
  });
}

async function snapshot(page, locator) {
  const box = await locator.boundingBox();
  return page.evaluate(({ box }) => {
    const button = document.querySelector('.mode-btn[data-mode="narrative"]');
    const center = box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null;
    const hit = center ? document.elementFromPoint(center.x, center.y) : null;
    return {
      mode: window.VDOSScene.getSceneState().mode,
      learnCurrent: document.querySelector('.mode-btn[data-mode="learn"]')?.getAttribute('aria-current'),
      narrativeCurrent: button?.getAttribute('aria-current'),
      scrollY: window.scrollY,
      buttonConnected: Boolean(button?.isConnected),
      buttonText: button?.textContent?.replace(/\s+/g, ' ').trim() || null,
      buttonOuter: button?.outerHTML || null,
      center,
      hitTag: hit?.tagName || null,
      hitClass: hit?.className || null,
      hitMode: hit?.dataset?.mode || null,
      trace: window.__m3ModeTrace
    };
  }, { box });
}

test('diagnostic: trace Playwright click into Director mode state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await waitForReady(page);
  await installTrace(page);

  const button = page.locator('.mode-btn[data-mode="narrative"]');
  console.log('M3_MODE_BEFORE', JSON.stringify(await snapshot(page, button)));
  await button.click();
  await page.waitForTimeout(100);
  const after = await snapshot(page, button);
  console.log('M3_MODE_AFTER_PLAYWRIGHT', JSON.stringify(after));

  expect(after.trace.documentCapture.length).toBeGreaterThan(0);
  expect(after.trace.buttonCapture.length).toBeGreaterThan(0);
  expect(after.trace.buttonBubble.length).toBeGreaterThan(0);
  expect(after.trace.sceneEvents.some(event => event.source === 'mode-switch')).toBe(true);
  expect(after.mode).toBe('narrative');
  expect(after.narrativeCurrent).toBe('page');
});

test('diagnostic: trace direct DOM click into Director mode state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await waitForReady(page);
  await installTrace(page);

  const button = page.locator('.mode-btn[data-mode="narrative"]');
  await page.evaluate(() => document.querySelector('.mode-btn[data-mode="narrative"]')?.click());
  await page.waitForTimeout(100);
  const after = await snapshot(page, button);
  console.log('M3_MODE_AFTER_DOM', JSON.stringify(after));

  expect(after.trace.buttonBubble.length).toBeGreaterThan(0);
  expect(after.trace.sceneEvents.some(event => event.source === 'mode-switch')).toBe(true);
  expect(after.mode).toBe('narrative');
  expect(after.narrativeCurrent).toBe('page');
});
