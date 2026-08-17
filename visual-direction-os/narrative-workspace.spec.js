const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

test('Narrative mode exposes editorial story input instead of chat', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  const appProbe = await page.evaluate(async () => {
    const text = await fetch(`director-v2-app.js?probe=${Date.now()}`).then(response => response.text());
    window.__narrativeClickCount = 0;
    window.__sceneSources = [];
    window.__pointerTrace = [];
    const describe = node => {
      if (!node || node.nodeType !== 1) return String(node?.nodeName || node);
      return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${node.className && typeof node.className === 'string' ? `.${node.className.trim().replace(/\s+/g,'.')}` : ''}[mode=${node.dataset?.mode || ''}]`;
    };
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(type => {
      document.addEventListener(type, event => {
        window.__pointerTrace.push({ type, x:event.clientX, y:event.clientY, target:describe(event.target), current:describe(event.currentTarget) });
      }, true);
    });
    document.querySelector('.mode-btn[data-mode="narrative"]').addEventListener('click', () => { window.__narrativeClickCount += 1; });
    window.addEventListener('vdos:scene-state', event => { window.__sceneSources.push(event.detail?.source || null); });
    return {
      hasNarrativeModeOrder: text.includes("['learn', 'narrative', 'direct', 'diagnose']"),
      scriptSrc: [...document.scripts].map(script => script.src).find(src => src.includes('director-v2-app.js')) || null
    };
  });
  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  await page.waitForTimeout(1400);
  const routing = await page.evaluate(() => {
    const panel = document.querySelector('#narrative-panel');
    const direct = document.querySelector('#direct-panel');
    const active = document.querySelector('.mode-btn[aria-current="page"]');
    const scene = window.VDOSScene?.getSceneState?.();
    const rect = panel.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      innerHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      narrativeOffsetTop: panel.offsetTop,
      narrativeRectTop: rect.top,
      narrativeRectBottom: rect.bottom,
      directOffsetTop: direct.offsetTop,
      activeMode: active?.dataset.mode || null,
      sceneMode: scene?.mode || null,
      clickCount: window.__narrativeClickCount,
      sceneSources: window.__sceneSources,
      pointerTrace: window.__pointerTrace
    };
  });
  console.log('NARRATIVE_APP_PROBE', JSON.stringify(appProbe));
  console.log('NARRATIVE_PAGE_ERRORS', JSON.stringify(pageErrors));
  console.log('NARRATIVE_ROUTING_DIAGNOSTIC', JSON.stringify(routing));
  await expect(page.locator('#narrative-panel')).toBeInViewport();
  await expect(page.getByRole('heading', { name: /Tell your story/i })).toBeVisible();
  await expect(page.getByLabel('Scene description')).toBeVisible();
  await expect(page.getByLabel('Director intent')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start interpretation/i })).toBeVisible();
  await expect(page.locator('[data-narrative-demo-badge]')).toHaveText('DEMO FIXTURE');
  await expect(page.locator('[data-narrative-stage]')).toHaveCount(5);
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
      return { mode: button.dataset.mode, left: rect.left, top: rect.top, width: rect.width, height: rect.height, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
    });
    rail.dataset.expanded = 'false';
    await new Promise(resolve => setTimeout(resolve, 280));
    const collapsed = read();
    rail.dataset.expanded = 'true';
    await new Promise(resolve => setTimeout(resolve, 320));
    const expanded = read();
    return { collapsed, expanded };
  });
  console.log('RAIL_TARGET_STABILITY', JSON.stringify(positions));
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
