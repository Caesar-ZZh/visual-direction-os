const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1';

test('partial Narrative signal asks one targeted question and reruns only Interpret without losing user input', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  await page.getByRole('button', { name: /Turn story into direction/i }).click();

  await page.evaluate(() => {
    const base = window.VDOSNarrativeContracts.clone(window.VDOSNarrativeDemoFixtures.interpret);
    window.__baseInterpretFixture = base;
    window.VDOSNarrativeDemoFixtures.interpret = {
      ...window.VDOSNarrativeContracts.clone(base),
      signal: 'partial',
      clarification: {
        question: 'Is leaving the office a self-authored decision or a response to another authority?',
        options: ['Self-authored decision', 'Another authority requires it']
      }
    };
  });

  const story = 'He receives an assignment, recognizes control, and leaves the office.';
  const intent = 'Keep the reason for leaving open until I decide it.';
  await page.getByLabel('Scene description').fill(story);
  await page.getByLabel('Director intent').fill(intent);
  await page.getByRole('button', { name: /Start interpretation/i }).click();

  const clarification = page.locator('[data-narrative-clarification]');
  await expect(clarification).toHaveCount(1);
  await expect(clarification).toContainText('Is leaving the office a self-authored decision or a response to another authority?');
  await expect(clarification.locator('[data-clarification-option]')).toHaveCount(2);
  await expect(page.locator('[data-reading-card]')).toHaveCount(2);

  await page.evaluate(() => {
    const refined = window.VDOSNarrativeContracts.clone(window.__baseInterpretFixture);
    refined.clarification = null;
    refined.readings[0].title = 'REFINED AGENCY RECOVERY';
    refined.readings[0].endingState.value = 'The character leaves by a self-authored decision.';
    window.VDOSNarrativeDemoFixtures.interpret = refined;
  });
  await page.getByRole('button', { name: 'Self-authored decision', exact: true }).click();

  await expect(page.locator('[data-narrative-clarification]')).toHaveCount(0);
  await expect(page.locator('[data-reading-card]').first()).toContainText('REFINED AGENCY RECOVERY');
  await expect(page.getByLabel('Scene description')).toHaveValue(story);
  await expect(page.getByLabel('Director intent')).toHaveValue(intent);

  const state = await page.evaluate(() => window.VDOSNarrativeWorkspaceController.getDraftState());
  expect(state.clarificationAnswer).toBe('Self-authored decision');
  expect(state.strategies).toEqual([]);
  expect(state.sequenceProposal).toBeNull();
  expect(state.stage).toBe('interpret');
});
