const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';
const terminalPeriod = /[.。]\s*$/;

function expectNoTerminalPeriod(items) {
  for (const text of items) expect(text, `interface copy should not end with a period: ${text}`).not.toMatch(terminalPeriod);
}

test('Director interface copy omits terminal periods while user-authored prose preserves punctuation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(url);

  const staticDisplayCopy = await page.locator('.hero h1, #workspace-title, .rail-note').allTextContents();
  expectNoTerminalPeriod(staticDisplayCopy.flatMap(text => text.split(/\n+/).map(value => value.trim()).filter(Boolean)));

  await page.getByRole('button', { name: /Turn story into direction/i }).click();
  const initialNarrativeDisplay = await page.locator('#narrative-panel h2, #narrative-panel h3, .narrative-aside-block>strong').allTextContents();
  expectNoTerminalPeriod(initialNarrativeDisplay.map(text => text.trim()));

  const helperCopy = await page.locator('.narrative-editor>p, .narrative-aside-block>p').allTextContents();
  expectNoTerminalPeriod(helperCopy.map(text => text.trim()));
  helperCopy.forEach(text => expect(text).not.toContain('。'));

  const sceneText = 'He enters the office expecting to accept an assignment. During the conversation he realizes the assignment itself is a mechanism of control. He refuses and leaves.';
  const intentText = 'End with the character reclaiming control.';
  await page.getByLabel('Scene description').fill(sceneText);
  await page.getByLabel('Director intent').fill(intentText);
  await expect(page.getByLabel('Scene description')).toHaveValue(sceneText);
  await expect(page.getByLabel('Director intent')).toHaveValue(intentText);

  await page.getByRole('button', { name: /Start interpretation/i }).click();
  await expect(page.locator('[data-reading-card]')).toHaveCount(2);

  const readingHeading = (await page.locator('.narrative-section-head h3').textContent()).trim();
  expectNoTerminalPeriod([readingHeading]);

  await page.locator('[data-reading-card]').first().click();
  expectNoTerminalPeriod([(await page.locator('.narrative-section-head h3').textContent()).trim()]);
  await page.getByRole('button', { name: /Confirm reading/i }).click();
  await expect(page.locator('[data-strategy-card]')).toHaveCount(3);
  expectNoTerminalPeriod([(await page.locator('.narrative-section-head h3').textContent()).trim()]);

  await page.locator('[data-strategy-card][data-strategy-id="camera"]').click();
  await page.getByRole('button', { name: /Select strategy/i }).click();
  await expect(page.locator('[data-sequence-proposal-beat]')).toHaveCount(5);
  expectNoTerminalPeriod([
    (await page.locator('.narrative-section-head h3').textContent()).trim(),
    (await page.locator('.narrative-apply-title>div>strong').textContent()).trim()
  ]);
});