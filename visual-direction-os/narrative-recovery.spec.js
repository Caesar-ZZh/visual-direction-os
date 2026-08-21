const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

function apiStub({ delayed = false } = {}) {
  return `
    (() => {
      let attempts = 0;
      window.__interpretAborted = false;
      window.__interpretAttempts = 0;
      window.VDOSNarrativeApiClient = {
        createNarrativeApiClient() {
          return {
            interpret(payload, signal) {
              attempts += 1;
              window.__interpretAttempts = attempts;
              if (!${delayed ? 'true' : 'false'} && attempts === 1) {
                const error = new Error('Temporary interpretation failure.');
                error.code = 'HTTP';
                return Promise.reject(error);
              }
              if (!${delayed ? 'true' : 'false'}) {
                return Promise.resolve(window.VDOSNarrativeContracts.clone(window.VDOSNarrativeDemoFixtures.interpret));
              }
              return new Promise((resolve, reject) => {
                const timer = setTimeout(() => resolve(window.VDOSNarrativeContracts.clone(window.VDOSNarrativeDemoFixtures.interpret)), 450);
                signal?.addEventListener?.('abort', () => {
                  clearTimeout(timer);
                  window.__interpretAborted = true;
                  const error = new DOMException('Aborted', 'AbortError');
                  reject(error);
                }, { once: true });
              });
            },
            strategy() { return Promise.resolve(window.VDOSNarrativeContracts.clone(window.VDOSNarrativeDemoFixtures.strategy)); },
            sequence() { return Promise.resolve(window.VDOSNarrativeContracts.clone(window.VDOSNarrativeDemoFixtures.sequence)); }
          };
        }
      };
    })();`;
}

test('Interpret failure preserves user input and Retry Interpret reruns only the failed stage', async ({ page }) => {
  await page.route('**/narrative-api-client.js*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: apiStub() }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.getByRole('button', { name: /Turn story into direction/i }).click();

  const story = 'He notices the assignment is a control mechanism and refuses it.';
  const intent = 'Keep the refusal self-authored.';
  await page.getByLabel('Scene description').fill(story);
  await page.getByLabel('Director intent').fill(intent);
  await page.getByRole('button', { name: /Start interpretation/i }).click();

  await expect(page.locator('[data-narrative-error]')).toContainText('Temporary interpretation failure.');
  await expect(page.getByRole('button', { name: /Retry Interpret/i })).toBeVisible();
  await expect(page.getByLabel('Scene description')).toHaveValue(story);
  await expect(page.getByLabel('Director intent')).toHaveValue(intent);
  await expect(page.locator('[data-reading-card]')).toHaveCount(0);

  await page.getByRole('button', { name: /Retry Interpret/i }).click();
  await expect(page.locator('[data-reading-card]')).toHaveCount(2);
  await expect(page.locator('[data-narrative-error]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__interpretAttempts)).toBe(2);
  const state = await page.evaluate(() => window.VDOSNarrativeWorkspaceController.getDraftState());
  expect(state.stage).toBe('interpret');
  expect(state.strategies).toEqual([]);
  expect(state.sequenceProposal).toBeNull();
});

test('editing story during Interpret aborts or invalidates the old request and never lets the stale response overwrite the new input', async ({ page }) => {
  await page.route('**/narrative-api-client.js*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: apiStub({ delayed: true }) }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.getByRole('button', { name: /Turn story into direction/i }).click();

  await page.getByLabel('Scene description').fill('First version of the scene.');
  await page.getByRole('button', { name: /Start interpretation/i }).click();
  await page.waitForTimeout(60);
  await page.getByLabel('Scene description').fill('Second version that should own the next interpretation.');

  await expect.poll(() => page.evaluate(() => window.__interpretAborted)).toBe(true);
  await page.waitForTimeout(500);
  await expect(page.locator('[data-reading-card]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Start interpretation/i })).toBeEnabled();
  await expect(page.getByLabel('Scene description')).toHaveValue('Second version that should own the next interpretation.');
  const state = await page.evaluate(() => window.VDOSNarrativeWorkspaceController.getDraftState());
  expect(state.input).toBe('Second version that should own the next interpretation.');
  expect(state.stage).toBe('input');
  expect(state.readings).toEqual([]);
});
