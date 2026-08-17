const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html';

test('desktop ownership summary stays inside its column when contested', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('[data-owner-choice="contested"]').click();
  await expect(page.locator('#ownership-primary')).toHaveText('CONTESTED');

  const metrics = await page.locator('.ownership-board').evaluate(board => {
    const summary = board.querySelector('.ownership-summary');
    const primary = board.querySelector('#ownership-primary');
    const tracks = board.querySelector('.ownership-tracks');
    const s = summary.getBoundingClientRect();
    const p = primary.getBoundingClientRect();
    const t = tracks.getBoundingClientRect();
    return {
      summaryRight: s.right,
      primaryRight: p.right,
      tracksLeft: t.left,
      summaryOverflow: summary.scrollWidth - summary.clientWidth
    };
  });

  expect(metrics.summaryOverflow).toBeLessThanOrEqual(1);
  expect(metrics.primaryRight).toBeLessThanOrEqual(metrics.summaryRight - 6);
  expect(metrics.tracksLeft - metrics.summaryRight).toBeGreaterThanOrEqual(24);
});

test('desktop rail stays collapsed until hover and expands as an overlay without shifting stage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.mouse.move(1200, 500);
  await page.waitForTimeout(80);

  const rail = page.locator('.v2-rail');
  const stage = page.locator('.stage');
  const before = await Promise.all([
    rail.evaluate(node => node.getBoundingClientRect().width),
    stage.evaluate(node => node.getBoundingClientRect().left)
  ]);
  expect(before[0]).toBeLessThanOrEqual(72);

  await rail.hover();
  await page.waitForTimeout(420);
  const after = await Promise.all([
    rail.evaluate(node => node.getBoundingClientRect().width),
    stage.evaluate(node => node.getBoundingClientRect().left)
  ]);
  expect(after[0]).toBeGreaterThanOrEqual(240);
  expect(Math.abs(after[1] - before[1])).toBeLessThanOrEqual(2);

  await page.locator('.mode-btn[data-mode="direct"]').focus();
  const focusedWidth = await rail.evaluate(node => node.getBoundingClientRect().width);
  expect(focusedWidth).toBeGreaterThanOrEqual(240);
});

test('desktop rail remains a viewport-edge hover target after deep page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 900 });
  await page.goto(url);
  await page.mouse.move(1200, 500);
  await page.waitForTimeout(180);
  await page.locator('#sequence-root').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);

  const rail = page.locator('.v2-rail');
  const stage = page.locator('.stage');
  const before = await Promise.all([
    rail.evaluate(node => {
      const r = node.getBoundingClientRect();
      return { width: r.width, top: r.top, bottom: r.bottom };
    }),
    stage.evaluate(node => node.getBoundingClientRect().left)
  ]);

  expect(before[0].width).toBeLessThanOrEqual(72);
  expect(before[0].top).toBeLessThanOrEqual(1);
  expect(before[0].bottom).toBeGreaterThanOrEqual(899);

  await page.mouse.move(18, 420);
  await page.waitForTimeout(420);

  const after = await Promise.all([
    rail.evaluate(node => node.getBoundingClientRect().width),
    stage.evaluate(node => node.getBoundingClientRect().left)
  ]);
  expect(after[0]).toBeGreaterThanOrEqual(240);
  expect(Math.abs(after[1] - before[1])).toBeLessThanOrEqual(2);
});

test('collapsed desktop rail keeps 01 02 and active 03 in identical centered cells', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.locator('#diagnose-panel').scrollIntoViewIfNeeded();
  await page.waitForTimeout(160);
  await page.mouse.move(1200, 500);
  await page.waitForTimeout(260);

  const metrics = await page.locator('.v2-rail').evaluate(rail => {
    const rr = rail.getBoundingClientRect();
    return [...rail.querySelectorAll('.mode-btn')].map(button => {
      const br = button.getBoundingClientRect();
      const strong = button.querySelector('strong');
      const sr = strong.getBoundingClientRect();
      return {
        mode: button.dataset.mode,
        current: button.getAttribute('aria-current') === 'page',
        width: br.width,
        height: br.height,
        buttonCenter: br.left + br.width / 2,
        numberCenter: sr.left + sr.width / 2,
        railCenter: rr.left + rr.width / 2
      };
    });
  });

  expect(metrics).toHaveLength(3);
  expect(metrics.filter(item => item.current).map(item => item.mode)).toEqual(['diagnose']);
  metrics.forEach(item => {
    expect(item.width).toBeGreaterThanOrEqual(42);
    expect(item.width).toBeLessThanOrEqual(46);
    expect(item.height).toBeGreaterThanOrEqual(42);
    expect(item.height).toBeLessThanOrEqual(46);
    expect(Math.abs(item.buttonCenter - item.railCenter)).toBeLessThanOrEqual(1);
    expect(Math.abs(item.numberCenter - item.buttonCenter)).toBeLessThanOrEqual(1);
  });
  expect(Math.max(...metrics.map(item => item.width)) - Math.min(...metrics.map(item => item.width))).toBeLessThanOrEqual(1);
  expect(Math.max(...metrics.map(item => item.height)) - Math.min(...metrics.map(item => item.height))).toBeLessThanOrEqual(1);
});

test('director option buttons use the same serif family as variable section titles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);

  const typography = await page.evaluate(() => {
    const title = document.querySelector('.variable-family h3');
    const button = document.querySelector('.variable-options button');
    const titleStyle = getComputedStyle(title);
    const buttonStyle = getComputedStyle(button);
    return {
      titleFamily: titleStyle.fontFamily,
      buttonFamily: buttonStyle.fontFamily,
      buttonSize: parseFloat(buttonStyle.fontSize),
      buttonWeight: Number(buttonStyle.fontWeight)
    };
  });

  expect(typography.buttonFamily).toBe(typography.titleFamily);
  expect(typography.buttonSize).toBeGreaterThanOrEqual(14);
  expect(typography.buttonWeight).toBeGreaterThanOrEqual(500);
  expect(typography.buttonWeight).toBeLessThanOrEqual(700);
});

test('site-wide metadata uses one clean sans family while display and director controls retain serif hierarchy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await expect(page.locator('.case-tabs button').first()).toBeVisible();

  const typography = await page.evaluate(() => {
    const family = selector => {
      const node = document.querySelector(selector);
      return node ? getComputedStyle(node).fontFamily : null;
    };
    const size = selector => {
      const node = document.querySelector(selector);
      return node ? parseFloat(getComputedStyle(node).fontSize) : null;
    };
    const weight = selector => {
      const node = document.querySelector(selector);
      return node ? Number(getComputedStyle(node).fontWeight) : null;
    };

    return {
      bodyFamily: getComputedStyle(document.body).fontFamily,
      displayFamily: family('.workspace h2'),
      controlFamily: family('.variable-options button'),
      metaFamilies: [
        '.eyebrow',
        '.hero-node b',
        '.system-chain small',
        '.ownership-summary > span',
        '.ownership-track-head span',
        '.ownership-axis small',
        '.status-line',
        '.vr-live-header span',
        '.vr-live-grid span',
        '.case-state-panel dt',
        '.score-track > span',
        '.palette-mode-head > span'
      ].map(family),
      tabFamily: family('.case-tabs button'),
      tabSize: size('.case-tabs button'),
      eyebrowSize: size('.eyebrow'),
      eyebrowWeight: weight('.eyebrow')
    };
  });

  expect(typography.displayFamily).not.toBe(typography.bodyFamily);
  expect(typography.controlFamily).toBe(typography.displayFamily);
  typography.metaFamilies.forEach(metaFamily => expect(metaFamily).toBe(typography.bodyFamily));
  expect(typography.tabFamily).toBe(typography.bodyFamily);
  expect(typography.tabSize).toBeGreaterThanOrEqual(14);
  expect(typography.eyebrowSize).toBeGreaterThanOrEqual(11);
  expect(typography.eyebrowWeight).toBeGreaterThanOrEqual(550);
  expect(typography.eyebrowWeight).toBeLessThanOrEqual(700);

  await page.locator('[data-color-view="base"]').click();
  const basePaletteFamily = await page.locator('.palette-readout dt').first().evaluate(node => getComputedStyle(node).fontFamily);
  expect(basePaletteFamily).toBe(typography.bodyFamily);
});
