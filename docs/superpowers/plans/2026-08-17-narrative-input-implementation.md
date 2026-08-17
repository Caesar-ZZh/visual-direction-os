# Narrative Input / Narrative → Direction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class Narrative Input workspace that turns free-text scene descriptions into user-confirmed Narrative Readings, Visual Direction Strategies, and five-beat Sequence Proposals, then explicitly applies all or selected beats into the existing Director Workspace without allowing AI output to mutate canonical Scene State before Apply.

**Architecture:** Keep narrative generation state isolated from `VDOSScene`. Add small UMD/CommonJS-compatible modules for contracts, draft-state transitions, transport, rendering, and apply semantics. Extend Sequence Director so its active sequence can be replaced deliberately. Add a separate serverless Narrative API whose provider adapter calls OpenAI Responses with strict JSON-schema output; production secrets remain server-side. GitHub Pages remains the static application host, while the Narrative API is configured through an explicit base URL. For branch/UI review only, an explicit `?narrativeDemo=1` mode may use labelled deterministic fixtures; normal mode must never fabricate a fallback result.

**Tech Stack:** Vanilla HTML/CSS/JavaScript; CommonJS + browser UMD modules; Node.js model tests; Playwright 1.55.0 browser acceptance; native `fetch`; OpenAI Responses API with Structured Outputs; Vercel-style Node serverless handlers for the separate Narrative API.

## Global Constraints

- Preserve the existing Director Workspace visual system: dark background, restrained surfaces, orange action accent, serif display hierarchy, mono metadata/status labels, and no generic chatbot bubbles.
- The staged pipeline is fixed: `Interpret → user confirm → Strategy → user select → Sequence → Preview → Apply`.
- Interpret returns 2–3 candidate Narrative Readings.
- The selected Reading remains editable until explicit confirmation.
- Strategy returns 2–3 causal directing mechanisms, not style presets.
- Sequence Proposal contains exactly five ordered beats: `SETUP`, `PRESSURE`, `RUPTURE`, `RELEASE`, `NEW OWNERSHIP`.
- Each important Narrative field exposes provenance as `EXPLICIT`, `INFERRED`, or `DIRECTOR INTENT`, plus concise Basis text; never expose model chain-of-thought.
- Weak/partial narrative signals are surfaced rather than blocked. At most one targeted clarification question is presented at a time.
- Narrative draft state is separate from canonical `VDOSScene` until explicit Apply.
- `Apply All` and `Apply Selected Beats` are the only AI-proposal paths that may transfer data into Sequence Director / `VDOSScene`.
- Production model API keys must never appear in browser code.
- Provider/network/schema failures preserve user input and confirmed upstream decisions and retry only the failed stage.
- Stale asynchronous responses must not overwrite a newer draft.
- Existing DIRECT, Sequence, Diagnose, route-to-control, visual QA, mobile, focus-visible, and reduced-motion behavior must remain green.
- No multi-scene projects, visual bible, storyboard/image generation, model picker, collaboration, or arbitrary chat in this release.
- Do not merge this feature branch to `master` without explicit user authorization.

---

## File Structure

### New browser/core files

- `visual-direction-os/narrative-contracts.js` — enums, strict validators, response normalization, proposal compatibility checks.
- `visual-direction-os/narrative-state.js` — isolated `NarrativeDraft` state machine, stage gates, downstream invalidation, request-generation tokens.
- `visual-direction-os/narrative-api-client.js` — stage-specific HTTP transport, AbortController handling, stale-response protection, API-base configuration.
- `visual-direction-os/narrative-demo-fixtures.js` — deterministic labelled demo-only responses; never used unless `?narrativeDemo=1` is explicit.
- `visual-direction-os/narrative-apply.js` — proposal impact summary, proposal→Sequence mapping, selective-beat merge rules.
- `visual-direction-os/narrative-workspace.js` — DOM rendering and interaction orchestration for Input, Interpret, Edit, Strategy, Sequence, Apply, errors, clarification.
- `visual-direction-os/narrative-workspace.css` — all Narrative workspace styling and responsive/reduced-motion rules.

### New tests

- `visual-direction-os/narrative-contracts.test.js`
- `visual-direction-os/narrative-state.test.js`
- `visual-direction-os/narrative-api-client.test.js`
- `visual-direction-os/narrative-apply.test.js`
- `visual-direction-os/narrative-workspace.spec.js`

### New serverless API files

- `api/narrative/_contracts.js` — imports/reuses browser contract semantics for server validation.
- `api/narrative/_prompts.js` — stage-specific system instructions that request concise directing judgments and never chain-of-thought.
- `api/narrative/_openai-adapter.js` — provider-specific Responses API call and Structured Output extraction.
- `api/narrative/_handler.js` — CORS, method/body validation, stage dispatch, provider/error normalization.
- `api/narrative/interpret.js`
- `api/narrative/strategy.js`
- `api/narrative/sequence.js`
- `api/narrative/_handler.test.js`
- `vercel.json` — serverless runtime configuration only; it must not replace the existing GitHub Pages deployment contract.

### Existing files to modify

- `visual-direction-os/director-v2.html` — add Narrative mode navigation, workspace root, API-base metadata hook, new scripts/styles.
- `visual-direction-os/director-v2-app.js` — add `narrative` mode routing and initialize Narrative Workspace.
- `visual-direction-os/director-v2.css` — adapt desktop rail/mobile primary modes from 3 to 4 entries without weakening current behavior.
- `visual-direction-os/sequence-director.js` — change fixed sequence reference into a replaceable validated sequence and expose `setSequence()` / `getSequence()`.
- `visual-direction-os/build-pages-site.js` — ensure all new browser assets publish into `_site` through existing recursive copy behavior; add tests rather than changing behavior unless necessary.
- `visual-direction-os/site-publish.test.js` — lock publication of new browser modules/styles.
- `.github/workflows/director-v2-ci.yml` — run new model tests, syntax checks, source QA, asset checks, and browser acceptance.

---

### Task 1: Lock Narrative data contracts and validation

**Files:**
- Create: `visual-direction-os/narrative-contracts.js`
- Create: `visual-direction-os/narrative-contracts.test.js`

**Interfaces:**
- Produces: `VDOSNarrativeContracts.SOURCE_TYPES`, `CONFIDENCE_LEVELS`, `AGENCIES`, `VARIABLE_FAMILIES`, `BEAT_IDS`.
- Produces: `validateInterpretResponse(value)`, `validateStrategyResponse(value)`, `validateSequenceResponse(value)`, each returning `{ valid: boolean, errors: string[], value?: object }`.
- Produces: `validateSceneStatePatch(patch)` and `clone(value)`.
- Later tasks must consume only validated response objects.

- [ ] **Step 1: Write failing contract tests**

```js
const assert = require('assert');
const contracts = require('./narrative-contracts.js');

const field = (value, sourceType = 'inferred') => ({ value, sourceType, basis: 'supported by the scene text' });
const validInterpret = {
  signal: 'strong',
  readings: [{
    id: 'r1', title: 'AGENCY RECOVERY', confidence: 'high',
    narrativeProblem: field('External authority becomes control.'),
    coreConflict: field('External authority vs self-determination.'),
    startingState: field('Compliance', 'explicit'),
    endingState: field('Self-directed', 'director_intent'),
    turningPoint: field('The assignment is recognized as control.'),
    agencyTransition: { value: ['world', 'contested', 'character'], sourceType: 'inferred', basis: 'authority transfers through the scene' }
  }],
  clarification: null
};

assert.equal(contracts.validateInterpretResponse(validInterpret).valid, true);
assert.equal(contracts.validateInterpretResponse({ ...validInterpret, readings: [] }).valid, false);
assert.equal(contracts.validateInterpretResponse({ ...validInterpret, readings: [validInterpret.readings[0], validInterpret.readings[0], validInterpret.readings[0], validInterpret.readings[0]] }).valid, false);
assert.equal(contracts.validateInterpretResponse({ ...validInterpret, readings: [{ ...validInterpret.readings[0], confidence: 'certain' }] }).valid, false);

const validSequence = {
  sequenceProposal: {
    beats: contracts.BEAT_IDS.map((id, index) => ({
      id,
      label: id === 'new-ownership' ? 'NEW OWNERSHIP' : id.toUpperCase(),
      narrativeBeat: `beat ${index}`,
      agency: index < 2 ? 'world' : index < 4 ? 'contested' : 'character',
      primaryVariable: index === 4 ? 'agency' : 'camera',
      supportingVariables: ['space'],
      restrainedVariables: ['texture'],
      visualEvents: [],
      sceneStatePatch: { agency: index === 4 ? 'character' : 'world' },
      rationale: 'causal rationale'
    }))
  }
};
assert.equal(contracts.validateSequenceResponse(validSequence).valid, true);
assert.equal(contracts.validateSequenceResponse({ sequenceProposal: { beats: validSequence.sequenceProposal.beats.slice(0, 4) } }).valid, false);
console.log('narrative-contracts.test.js passed');
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
node visual-direction-os/narrative-contracts.test.js
```

Expected: FAIL because `./narrative-contracts.js` does not exist.

- [ ] **Step 3: Implement strict validators with UMD/CommonJS export**

Core shape:

```js
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const SOURCE_TYPES = ['explicit', 'inferred', 'director_intent'];
  const CONFIDENCE_LEVELS = ['low', 'medium', 'high'];
  const SIGNAL_LEVELS = ['weak', 'partial', 'strong'];
  const AGENCIES = ['world', 'contested', 'shared', 'character'];
  const VARIABLE_FAMILIES = ['color', 'space', 'camera', 'line', 'texture', 'rhythm', 'agency'];
  const BEAT_IDS = ['setup', 'pressure', 'rupture', 'release', 'new-ownership'];
  const clone = value => JSON.parse(JSON.stringify(value));

  function result(errors, value) {
    return errors.length ? { valid: false, errors } : { valid: true, errors: [], value: clone(value) };
  }

  function validateGroundedField(field, path, errors) {
    if (!field || typeof field !== 'object') return errors.push(`${path} must be an object`);
    if (typeof field.value !== 'string' || !field.value.trim()) errors.push(`${path}.value is required`);
    if (!SOURCE_TYPES.includes(field.sourceType)) errors.push(`${path}.sourceType is invalid`);
    if (typeof field.basis !== 'string' || !field.basis.trim()) errors.push(`${path}.basis is required`);
  }

  function validateInterpretResponse(value = {}) {
    const errors = [];
    if (!SIGNAL_LEVELS.includes(value.signal)) errors.push('signal is invalid');
    if (!Array.isArray(value.readings) || value.readings.length < 2 || value.readings.length > 3) errors.push('readings must contain 2 or 3 candidates');
    (value.readings || []).forEach((reading, i) => {
      if (!reading.id || !reading.title) errors.push(`readings[${i}] requires id and title`);
      if (!CONFIDENCE_LEVELS.includes(reading.confidence)) errors.push(`readings[${i}].confidence is invalid`);
      ['narrativeProblem','coreConflict','startingState','endingState','turningPoint'].forEach(key => validateGroundedField(reading[key], `readings[${i}].${key}`, errors));
      const transition = reading.agencyTransition;
      if (!transition || !Array.isArray(transition.value) || transition.value.length < 2 || transition.value.some(item => !AGENCIES.includes(item))) errors.push(`readings[${i}].agencyTransition is invalid`);
      if (transition) {
        if (!SOURCE_TYPES.includes(transition.sourceType)) errors.push(`readings[${i}].agencyTransition.sourceType is invalid`);
        if (typeof transition.basis !== 'string' || !transition.basis.trim()) errors.push(`readings[${i}].agencyTransition.basis is required`);
      }
    });
    if (value.clarification != null) {
      if (typeof value.clarification?.question !== 'string' || !value.clarification.question.trim()) errors.push('clarification.question is required');
      if (!Array.isArray(value.clarification?.options) || value.clarification.options.length < 2 || value.clarification.options.length > 4) errors.push('clarification.options must contain 2–4 choices');
    }
    return result(errors, value);
  }

  // validateStrategyResponse and validateSequenceResponse follow the same explicit checks,
  // including exactly 2–3 strategies and exactly five BEAT_IDS in order.

  return { SOURCE_TYPES, CONFIDENCE_LEVELS, SIGNAL_LEVELS, AGENCIES, VARIABLE_FAMILIES, BEAT_IDS, clone, validateInterpretResponse, validateStrategyResponse, validateSequenceResponse, validateSceneStatePatch };
});
```

Implement `validateSceneStatePatch()` by whitelisting current `VDOSScene` families and primitive values rather than accepting arbitrary objects.

- [ ] **Step 4: Run contract tests GREEN**

```bash
node visual-direction-os/narrative-contracts.test.js
node --check visual-direction-os/narrative-contracts.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/narrative-contracts.js visual-direction-os/narrative-contracts.test.js
git commit -m "feat: add narrative response contracts"
```

---

### Task 2: Build isolated NarrativeDraft state machine and stage gates

**Files:**
- Create: `visual-direction-os/narrative-state.js`
- Create: `visual-direction-os/narrative-state.test.js`

**Interfaces:**
- Consumes: `VDOSNarrativeContracts.clone`.
- Produces: `createNarrativeState(initial?)` returning controller with `getState()`, `subscribe(listener)`, `setInput()`, `setInterpretResult()`, `selectReading()`, `editSelectedReadingField()`, `confirmReading()`, `setStrategyResult()`, `selectStrategy()`, `setSequenceResult()`, `toggleBeat()`, `setApplyMode()`, `setClarificationAnswer()`, `beginRequest(stage)`, `acceptResponse(stage, token, payload)`, `failRequest(stage, token, error)`.
- State shape is draft-only and never references `VDOSScene.updateSceneState()`.

- [ ] **Step 1: Write failing state-transition tests**

```js
const assert = require('assert');
const { createNarrativeState } = require('./narrative-state.js');
const draft = createNarrativeState();

draft.setInput('A character recognizes an assignment is also a mechanism of control.', 'End with reclaimed agency.');
assert.equal(draft.getState().stage, 'input');

// Fixtures contain valid 2-reading/2-strategy/five-beat shapes.
draft.setInterpretResult(require('./narrative-demo-fixtures.js').interpret);
draft.selectReading('reading-agency');
draft.editSelectedReadingField('endingState', 'Self-authored departure');
assert.equal(draft.getState().selectedReading.endingState.sourceType, 'explicit');
assert.equal(draft.getState().strategies.length, 0);

draft.confirmReading();
assert.equal(draft.getState().stage, 'strategy');
assert.ok(draft.getState().confirmedReading);

assert.throws(() => draft.setSequenceResult({ sequenceProposal: { beats: [] } }), /strategy/i);

const staleToken = draft.beginRequest('strategy');
const currentToken = draft.beginRequest('strategy');
assert.equal(draft.acceptResponse('strategy', staleToken, { strategies: [] }), false);
assert.equal(draft.getState().requests.strategy.token, currentToken);
console.log('narrative-state.test.js passed');
```

- [ ] **Step 2: Run to verify RED**

```bash
node visual-direction-os/narrative-state.test.js
```

Expected: FAIL because state/fixture modules do not exist.

- [ ] **Step 3: Implement the state controller**

Use a closed-over state object and immutable snapshots. Editing any confirmed upstream Reading field must clear `confirmedReading`, `strategies`, `selectedStrategy`, and `sequenceProposal`. Selecting a different Strategy clears `sequenceProposal`. `beginRequest(stage)` increments a monotonic token per stage; `acceptResponse()` ignores mismatched tokens.

Required initial shape:

```js
const INITIAL = {
  stage: 'input',
  input: '',
  directorIntent: '',
  signal: null,
  readings: [],
  selectedReadingId: null,
  selectedReading: null,
  confirmedReading: null,
  strategies: [],
  selectedStrategyId: null,
  selectedStrategy: null,
  sequenceProposal: null,
  selectedBeatIds: ['setup','pressure','rupture','release','new-ownership'],
  applyMode: 'all',
  clarification: null,
  clarificationAnswer: null,
  requests: {
    interpret: { status: 'idle', token: 0, error: null },
    strategy: { status: 'idle', token: 0, error: null },
    sequence: { status: 'idle', token: 0, error: null }
  }
};
```

When a user edits a grounded field, replace provenance with:

```js
{ value: newValue, sourceType: 'explicit', basis: 'Edited and confirmed by the director.' }
```

- [ ] **Step 4: Add deterministic demo fixtures used only by tests and explicit demo mode**

Create `visual-direction-os/narrative-demo-fixtures.js` with:

```js
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeDemoFixtures = api;
})(typeof window !== 'undefined' ? window : globalThis, () => ({
  interpret: { signal: 'strong', readings: [/* exactly 2 complete valid readings */], clarification: null },
  strategy: { strategies: [/* exactly 3 complete valid strategies */] },
  sequence: { sequenceProposal: { beats: [/* exactly 5 complete valid beats */] } }
}));
```

The fixture copy must match the approved office-control example and be visibly labelled `DEMO FIXTURE` by the UI whenever used.

- [ ] **Step 5: Run state tests GREEN**

```bash
node visual-direction-os/narrative-contracts.test.js
node visual-direction-os/narrative-state.test.js
node --check visual-direction-os/narrative-state.js
node --check visual-direction-os/narrative-demo-fixtures.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/narrative-state.js visual-direction-os/narrative-state.test.js visual-direction-os/narrative-demo-fixtures.js
git commit -m "feat: add narrative draft state machine"
```

---

### Task 3: Add stage-specific Narrative API client and stale-response protection

**Files:**
- Create: `visual-direction-os/narrative-api-client.js`
- Create: `visual-direction-os/narrative-api-client.test.js`

**Interfaces:**
- Consumes: validators from `VDOSNarrativeContracts`.
- Produces: `createNarrativeApiClient({ baseUrl, fetchImpl, demoMode, fixtures })`.
- Client methods: `interpret(payload, signal?)`, `strategy(payload, signal?)`, `sequence(payload, signal?)`.
- Each returns validated domain data or throws typed error with `.code` in `NOT_CONFIGURED`, `NETWORK`, `HTTP`, `SCHEMA`.

- [ ] **Step 1: Write failing API client tests**

```js
const assert = require('assert');
const { createNarrativeApiClient } = require('./narrative-api-client.js');
const fixtures = require('./narrative-demo-fixtures.js');

(async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => fixtures.interpret };
  };
  const client = createNarrativeApiClient({ baseUrl: 'https://api.example.test/api/narrative', fetchImpl: fakeFetch });
  const result = await client.interpret({ narrative: 'scene', directorIntent: '' });
  assert.equal(result.readings.length, 2);
  assert.equal(calls[0].url, 'https://api.example.test/api/narrative/interpret');
  assert.equal(JSON.parse(calls[0].options.body).narrative, 'scene');

  const unconfigured = createNarrativeApiClient({ baseUrl: '', fetchImpl: fakeFetch });
  await assert.rejects(() => unconfigured.interpret({ narrative: 'scene' }), error => error.code === 'NOT_CONFIGURED');

  const demo = createNarrativeApiClient({ baseUrl: '', demoMode: true, fixtures });
  const demoResult = await demo.interpret({ narrative: 'scene' });
  assert.equal(demoResult.readings[0].id, fixtures.interpret.readings[0].id);
  console.log('narrative-api-client.test.js passed');
})();
```

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/narrative-api-client.test.js
```

Expected: FAIL because client module does not exist.

- [ ] **Step 3: Implement client**

Use JSON POST only:

```js
async function request(stage, payload, signal) {
  if (demoMode) return validate(stage, fixtures[stage]);
  if (!baseUrl) throw createError('NOT_CONFIGURED', 'Narrative AI service is not configured.');
  let response;
  try {
    response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/${stage}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('NETWORK', 'Narrative AI service could not be reached.');
  }
  if (!response.ok) throw createError('HTTP', `Narrative AI service returned HTTP ${response.status}.`);
  const data = await response.json();
  const checked = validate(stage, data);
  if (!checked.valid) throw createError('SCHEMA', checked.errors.join('; '));
  return checked.value;
}
```

- [ ] **Step 4: Run tests GREEN**

```bash
node visual-direction-os/narrative-api-client.test.js
node --check visual-direction-os/narrative-api-client.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/narrative-api-client.js visual-direction-os/narrative-api-client.test.js
git commit -m "feat: add narrative api client"
```

---

### Task 4: Add Narrative mode shell, navigation, and stage UI foundation

**Files:**
- Modify: `visual-direction-os/director-v2.html`
- Modify: `visual-direction-os/director-v2-app.js`
- Modify: `visual-direction-os/director-v2.css`
- Create: `visual-direction-os/narrative-workspace.js`
- Create: `visual-direction-os/narrative-workspace.css`
- Create: `visual-direction-os/narrative-workspace.spec.js`

**Interfaces:**
- Consumes: `VDOSNarrativeContracts`, `VDOSNarrativeState`, `VDOSNarrativeApiClient`.
- Produces: `VDOSNarrativeWorkspace.initNarrativeWorkspace(rootNode, options)` returning `{ destroy(), getDraftState() }`.
- `director-v2-app.js` owns mode navigation; Narrative Workspace owns only its internal stages.

- [ ] **Step 1: Write browser RED tests for navigation and input shell**

Add tests:

```js
const { test, expect } = require('@playwright/test');

test('Narrative mode is first-class and input is editorial, not chat', async ({ page }) => {
  await page.goto('/director-v2.html?narrativeDemo=1');
  await page.getByRole('button', { name: /turn story into direction/i }).click();
  await expect(page.locator('#narrative-panel')).toBeInViewport();
  await expect(page.getByRole('heading', { name: /Tell your story/i })).toBeVisible();
  await expect(page.getByLabel('Scene description')).toBeVisible();
  await expect(page.getByLabel('Director intent')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start interpretation/i })).toBeVisible();
  await expect(page.locator('[data-narrative-demo-badge]')).toHaveText(/DEMO FIXTURE/);
});

test('mobile primary mode navigation exposes Learn Narrative Direct Diagnose without horizontal trap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/director-v2.html?narrativeDemo=1');
  await expect(page.locator('.mobile-modes [data-mode]')).toHaveCount(4);
  const box = await page.locator('.mobile-modes').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390.5);
});
```

- [ ] **Step 2: Run targeted browser tests RED**

```bash
python3 -m http.server 4173 --directory visual-direction-os >/tmp/vdos-server.log 2>&1 &
npx playwright test visual-direction-os/narrative-workspace.spec.js --reporter=line --workers=1
```

Expected: FAIL because Narrative mode and workspace do not exist.

- [ ] **Step 3: Add Narrative mode to desktop/mobile navigation and mode routing**

`director-v2-app.js` changes:

```js
const modeOrder = ['learn', 'narrative', 'direct', 'diagnose'];

function modeTarget(mode) {
  if (mode === 'learn') return $('#learn-panel');
  if (mode === 'narrative') return $('#narrative-panel');
  if (mode === 'direct') return $('#direct-panel');
  return $('#diagnose-panel');
}
```

Update `modeFromScroll()` so Narrative occupies the interval between its panel and DIRECT. Preserve existing scroll-spy behavior.

HTML navigation copy:

```html
<nav class="mode-group" aria-label="NARRATIVE">
  <p class="mode-label">Narrative</p>
  <button class="mode-btn" type="button" data-mode="narrative"><strong>02</strong>Turn story into direction</button>
</nav>
```

Renumber DIRECT/DIAGNOSE visually to `03` / `04`; this is display copy only.

- [ ] **Step 4: Add Narrative panel and script/style imports**

Add before `#direct-panel`:

```html
<section class="workspace narrative-workspace" id="narrative-panel" aria-labelledby="narrative-title">
  <div id="narrative-root"></div>
</section>
```

Add metadata hook:

```html
<meta name="vdos-narrative-api-base" content="">
```

Add `narrative-workspace.css`, then scripts in dependency order: contracts → state → demo fixtures → API client → apply → workspace → app.

- [ ] **Step 5: Implement initial workspace renderer**

Initial render must contain semantic `<label>` + `<textarea>` fields, optional Director Intent, a `0 / 2000` counter, five-stage progress (`Interpret`, `Edit Reading`, `Strategy`, `Sequence`, `Apply`), and `aria-live` status.

Resolve configuration:

```js
const params = new URLSearchParams(window.location.search);
const demoMode = params.get('narrativeDemo') === '1';
const configuredBase = document.querySelector('meta[name="vdos-narrative-api-base"]')?.content?.trim() || '';
```

Do not show fake content unless `demoMode === true`.

- [ ] **Step 6: Style shell and mobile modes**

Use the existing variables from `director-v2.css`. The Narrative stylesheet must include its own `@media (prefers-reduced-motion: reduce)` rule. Change mobile modes to four equal columns, not overflow scrolling.

- [ ] **Step 7: Run browser tests GREEN plus current navigation regression**

```bash
npx playwright test visual-direction-os/narrative-workspace.spec.js visual-direction-os/director-v2-browser.spec.js visual-direction-os/director-v2-desktop-polish.spec.js --reporter=line --workers=1
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/director-v2.html visual-direction-os/director-v2-app.js visual-direction-os/director-v2.css visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.css visual-direction-os/narrative-workspace.spec.js
git commit -m "feat: add narrative input workspace shell"
```

---

### Task 5: Implement Interpret → Edit → Confirm, grounding, and clarification

**Files:**
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-workspace.css`
- Modify: `visual-direction-os/narrative-workspace.spec.js`

**Interfaces:**
- Consumes: `draft.beginRequest('interpret')`, `api.interpret()`, `draft.acceptResponse()`, `draft.selectReading()`, `draft.editSelectedReadingField()`, `draft.confirmReading()`.
- Produces: a confirmed Reading before any Strategy request is possible.

- [ ] **Step 1: Add RED browser acceptance for candidate comparison and field grounding**

```js
test('Interpret offers multiple readings, exposes grounding, and allows editing before confirm', async ({ page }) => {
  await page.goto('/director-v2.html?narrativeDemo=1');
  await page.getByLabel('Scene description').fill('He enters the office expecting to accept an assignment, recognizes it as control, refuses, and leaves.');
  await page.getByLabel('Director intent').fill('End with reclaimed agency.');
  await page.getByRole('button', { name: /Start interpretation/i }).click();
  await expect(page.locator('[data-reading-card]')).toHaveCount(2);
  await page.locator('[data-reading-card]').first().click();
  await expect(page.locator('[data-grounding-source="inferred"]').first()).toBeVisible();
  const ending = page.getByLabel('Ending State');
  await ending.fill('The character defines the next action.');
  await expect(page.locator('[data-field="endingState"] [data-grounding-source="explicit"]')).toBeVisible();
  await page.getByRole('button', { name: /Confirm reading/i }).click();
  await expect(page.locator('[data-stage="strategy"]')).toHaveAttribute('data-active', 'true');
});
```

- [ ] **Step 2: Verify RED**

Run the single new test and confirm it fails on missing candidate/edit UI.

- [ ] **Step 3: Implement Interpret request lifecycle**

On submit:

```js
const token = draft.beginRequest('interpret');
try {
  const result = await api.interpret({ narrative: state.input, directorIntent: state.directorIntent, clarificationAnswer: state.clarificationAnswer || null });
  draft.acceptResponse('interpret', token, result);
} catch (error) {
  if (error.name !== 'AbortError') draft.failRequest('interpret', token, { code: error.code || 'UNKNOWN', message: error.message });
}
```

Render 2–3 cards with title, short Narrative Problem, agency transition, confidence, and no dense detail table until selection.

- [ ] **Step 4: Implement editable Reading detail sheet**

Render the six approved fields. For `agencyTransition`, use three compact `<select>` controls or a semantically equivalent editable structured control restricted to valid agency enums. Editing any field calls the state controller and changes provenance to `EXPLICIT` with Basis `Edited and confirmed by the director.`

- [ ] **Step 5: Implement one-question clarification loop**

If `clarification` exists, render one question and 2–4 options. Answering sets `clarificationAnswer` and re-runs only Interpret. Do not call Strategy or Sequence automatically. Preserve scene text and Director Intent.

- [ ] **Step 6: Run targeted tests GREEN**

```bash
npx playwright test visual-direction-os/narrative-workspace.spec.js --reporter=line --workers=1
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.css visual-direction-os/narrative-workspace.spec.js
git commit -m "feat: add grounded narrative interpretation"
```

---

### Task 6: Implement Strategy selection and five-beat Sequence Proposal preview

**Files:**
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-workspace.css`
- Modify: `visual-direction-os/narrative-workspace.spec.js`

**Interfaces:**
- Consumes confirmed Reading only.
- Strategy request payload: `{ confirmedReading }`.
- Sequence request payload: `{ confirmedReading, selectedStrategy, currentSceneCompatibility }` where compatibility is a read-only snapshot.
- Produces preview-only `sequenceProposal`; must not call `VDOSScene.updateSceneState()`.

- [ ] **Step 1: Add RED test that confirms stage gates and no Scene mutation**

```js
test('Strategy and Sequence are gated by user decisions and proposal preview does not mutate scene state', async ({ page }) => {
  await page.goto('/director-v2.html?narrativeDemo=1');
  // Complete input/read/confirm using helper.
  await page.getByRole('button', { name: /Confirm reading/i }).click();
  await expect(page.locator('[data-strategy-card]')).toHaveCount(3);
  const before = await page.evaluate(() => window.VDOSScene.getSceneState());
  await page.locator('[data-strategy-card]').nth(1).click();
  await page.getByRole('button', { name: /Select strategy/i }).click();
  await expect(page.locator('[data-sequence-proposal-beat]')).toHaveCount(5);
  const labels = await page.locator('[data-sequence-proposal-beat] [data-beat-label]').allTextContents();
  expect(labels).toEqual(['SETUP','PRESSURE','RUPTURE','RELEASE','NEW OWNERSHIP']);
  const after = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(after).toEqual(before);
});
```

- [ ] **Step 2: Verify RED**

Run the new test and confirm failure before production changes.

- [ ] **Step 3: Render 2–3 Strategy cards**

Each card must visibly compare:

```text
PRIMARY
SUPPORT
RESTRAIN
MECHANISM
WHY THIS PRIMARY
```

Only one strategy may be selected. `SELECT STRATEGY` triggers Sequence generation; merely clicking a card does not mutate Scene State.

- [ ] **Step 4: Render five-beat proposal**

Desktop: structured five-row/timeline view. Mobile: stacked beat sections. Each beat shows Narrative Beat, Agency, Primary, Support, Restrain, Visual Events, proposed state summary, and rationale. Avoid raw JSON.

- [ ] **Step 5: Add read-only current Scene compatibility snapshot**

Create snapshot only at Sequence request time:

```js
const currentSceneCompatibility = {
  agency: sceneSnapshot.agency,
  ownership: sceneSnapshot.ownership,
  variables: sceneSnapshot.variables
};
```

Do not send unrelated app state.

- [ ] **Step 6: Run targeted tests GREEN**

```bash
npx playwright test visual-direction-os/narrative-workspace.spec.js --reporter=line --workers=1
```

Expected: PASS and the before/after canonical Scene snapshot is identical.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.css visual-direction-os/narrative-workspace.spec.js
git commit -m "feat: add narrative strategy and sequence preview"
```

---

### Task 7: Implement proposal→Sequence mapping, impact preview, Apply All, and Apply Selected Beats

**Files:**
- Create: `visual-direction-os/narrative-apply.js`
- Create: `visual-direction-os/narrative-apply.test.js`
- Modify: `visual-direction-os/sequence-director.js`
- Modify: `visual-direction-os/sequence-director-playback.spec.js`
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-workspace.spec.js`

**Interfaces:**
- Produces: `VDOSNarrativeApply.buildSequenceFromProposal(proposal, currentSequence, selectedBeatIds)`.
- Produces: `VDOSNarrativeApply.summarizeImpact(currentSequence, nextSequence)`.
- Sequence controller newly produces `setSequence(nextSequence, options?)` and `getSequence()`.
- `setSequence()` validates with `VDOSSequenceDirectorModel.validateSequence()` before replacing active sequence.

- [ ] **Step 1: Write RED unit tests for selective merge semantics**

```js
const assert = require('assert');
const apply = require('./narrative-apply.js');
const model = require('./sequence-director-model.js');
const fixtures = require('./narrative-demo-fixtures.js');

const next = apply.buildSequenceFromProposal(fixtures.sequence.sequenceProposal, model.DEFAULT_SEQUENCE, ['rupture','release']);
assert.equal(next.beats.find(b => b.id === 'setup').narrativePurpose, model.DEFAULT_SEQUENCE.beats.find(b => b.id === 'setup').narrativePurpose);
assert.equal(next.beats.find(b => b.id === 'rupture').narrativePurpose, fixtures.sequence.sequenceProposal.beats.find(b => b.id === 'rupture').narrativeBeat);
assert.equal(model.validateSequence(next).valid, true);

const impact = apply.summarizeImpact(model.DEFAULT_SEQUENCE, next);
assert.deepEqual(impact.changedBeatIds, ['rupture','release']);
console.log('narrative-apply.test.js passed');
```

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/narrative-apply.test.js
```

Expected: FAIL because apply module does not exist.

- [ ] **Step 3: Implement proposal→Sequence mapping**

Use existing beat timing boundaries from `currentSequence` for the five canonical beat IDs. Convert each proposal beat:

```js
{
  id: proposalBeat.id,
  label: proposalBeat.label,
  start: currentBeat.start,
  end: currentBeat.end,
  narrativePurpose: proposalBeat.narrativeBeat,
  primaryVariable: proposalBeat.primaryVariable,
  supportingVariables: clone(proposalBeat.supportingVariables),
  restrainedVariables: clone(proposalBeat.restrainedVariables),
  tensionLevel: inferTension(proposalBeat.id),
  scenePatch: clone(proposalBeat.sceneStatePatch)
}
```

Convert proposal Visual Events only for selected beats, assigning event `at` values from stable canonical slots inside the beat: 25%, 50%, 75% of beat duration, capped at three events per beat. Preserve unselected current events untouched. Generate deterministic IDs `${beat.id}-proposal-${index}`.

If a selected proposal beat lacks a valid patch, throw rather than inventing one.

- [ ] **Step 4: Extend Sequence Director controller**

Change:

```js
const sequence = sequenceModel.DEFAULT_SEQUENCE;
```

to:

```js
let sequence = clone(sequenceModel.DEFAULT_SEQUENCE);
```

Add:

```js
function setSequence(nextSequence, options = {}) {
  const checked = sequenceModel.validateSequence(nextSequence);
  if (!checked.valid) throw new Error(`Invalid sequence: ${checked.errors.join('; ')}`);
  pause();
  sequence = clone(nextSequence);
  selectedEventId = null;
  rebuildSequenceMarkup();
  const playhead = options.playhead ?? scene.getSceneState().playhead ?? 0;
  renderView(sequenceModel.deriveSequenceState(sequence, playhead));
}
function getSequence() { return clone(sequence); }
```

Refactor beat/event-specific markup into `rebuildSequenceMarkup()` without re-creating the transport range or losing listeners. If listener rebinding is simpler, isolate it in `bindDynamicSequenceControls()` and ensure old listeners are removed before rebinding.

- [ ] **Step 5: Add RED→GREEN browser test that Apply is the first mutation point**

Test:

1. Complete Sequence Proposal.
2. Save `VDOSScene.getSceneState()` before Apply.
3. Toggle `Apply Selected Beats`, select only RUPTURE + RELEASE.
4. Inspect visible impact summary listing only those beats.
5. Click `APPLY TO DIRECTOR`.
6. Assert `window.VDOSSequenceDirectorController.getSequence()` contains proposal content only in selected beats.
7. Assert the current `VDOSScene` is updated only after Apply, using the current playhead state from the newly installed sequence.
8. Navigate to DIRECT and confirm normal manual controls still work.

- [ ] **Step 6: Run unit + Sequence + Narrative browser suites GREEN**

```bash
node visual-direction-os/narrative-apply.test.js
npx playwright test visual-direction-os/narrative-workspace.spec.js visual-direction-os/sequence-director-playback.spec.js --reporter=line --workers=1
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/narrative-apply.js visual-direction-os/narrative-apply.test.js visual-direction-os/sequence-director.js visual-direction-os/sequence-director-playback.spec.js visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.spec.js
git commit -m "feat: apply narrative proposals to sequence director"
```

---

### Task 8: Build serverless Narrative API with one provider adapter

**Files:**
- Create: `api/narrative/_contracts.js`
- Create: `api/narrative/_prompts.js`
- Create: `api/narrative/_openai-adapter.js`
- Create: `api/narrative/_handler.js`
- Create: `api/narrative/interpret.js`
- Create: `api/narrative/strategy.js`
- Create: `api/narrative/sequence.js`
- Create: `api/narrative/_handler.test.js`
- Create: `vercel.json`

**Interfaces:**
- HTTP endpoints: `POST /api/narrative/interpret`, `/strategy`, `/sequence`.
- Environment: `OPENAI_API_KEY` required, `OPENAI_MODEL` optional with default `gpt-5.6`, `VDOS_ALLOWED_ORIGIN` required for production CORS.
- Provider adapter: `createOpenAIAdapter({ apiKey, model, fetchImpl })` with `generate({ stage, input, schema, instructions })`.
- Server always re-validates model output before returning it.

- [ ] **Step 1: Write RED server handler tests with fake provider**

```js
const assert = require('assert');
const { createHandler } = require('./_handler.js');
const fixtures = require('../../visual-direction-os/narrative-demo-fixtures.js');

function responseRecorder() {
  return {
    statusCode: 200, headers: {}, body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = JSON.stringify(value); return this; }
  };
}

(async () => {
  const provider = { generate: async ({ stage }) => fixtures[stage] };
  const handler = createHandler({ stage: 'interpret', provider, allowedOrigin: 'https://caesar-zzh.github.io' });
  const req = { method: 'POST', headers: { origin: 'https://caesar-zzh.github.io' }, body: { narrative: 'scene', directorIntent: '' } };
  const res = responseRecorder();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).readings.length, 2);

  const badOrigin = responseRecorder();
  await handler({ ...req, headers: { origin: 'https://evil.example' } }, badOrigin);
  assert.equal(badOrigin.statusCode, 403);
  console.log('_handler.test.js passed');
})();
```

- [ ] **Step 2: Verify RED**

```bash
node api/narrative/_handler.test.js
```

Expected: FAIL because API modules do not exist.

- [ ] **Step 3: Implement stage prompts without chain-of-thought requests**

Each stage instruction must request concise outputs only. Example Interpret instruction:

```text
You are the Narrative Interpretation layer of Visual Direction OS.
Return 2 or 3 plausible directing readings of the supplied scene.
Distinguish what is explicit in the user's text, what is inferred, and what comes from Director Intent.
Do not reveal private reasoning or chain-of-thought. Basis fields must be short evidence/rationale statements.
Do not prescribe visual parameters in this stage.
If one missing fact materially changes the reading, return one clarification question with 2–4 concise choices.
```

Strategy instruction must choose causal Primary/Support/Restrain mechanisms and avoid style imitation. Sequence instruction must output exactly the five canonical beats.

- [ ] **Step 4: Implement OpenAI Responses adapter with strict structured output**

Use server-side `fetch('https://api.openai.com/v1/responses', ...)` and:

```js
const body = {
  model,
  instructions,
  input: JSON.stringify(input),
  text: {
    format: {
      type: 'json_schema',
      name: `vdos_${stage}`,
      strict: true,
      schema
    }
  },
  store: false
};
```

Extract the assistant text from the completed response, parse JSON, and return it. Never pass raw provider errors or prompt bodies back to the browser.

- [ ] **Step 5: Implement request validation and CORS**

Rules:

- Reject non-POST with 405.
- Reject missing/oversized narrative text (> 2000 characters) on Interpret with 400.
- Reject Strategy without a confirmed Reading shape.
- Reject Sequence without confirmed Reading + selected Strategy.
- Allow only exact `VDOS_ALLOWED_ORIGIN`; optionally allow `http://localhost:4173` when `NODE_ENV !== 'production'`.
- Return `{ error: { code, message } }` with normalized codes `BAD_REQUEST`, `FORBIDDEN`, `PROVIDER`, `SCHEMA`.

- [ ] **Step 6: Add Vercel handlers and runtime config**

Each endpoint:

```js
const { createProductionHandler } = require('./_handler.js');
module.exports = createProductionHandler('interpret');
```

`vercel.json`:

```json
{
  "functions": {
    "api/narrative/*.js": { "maxDuration": 30 }
  }
}
```

Do not migrate or alter `.github/workflows/pages.yml` in this task.

- [ ] **Step 7: Run server tests and syntax checks GREEN**

```bash
node api/narrative/_handler.test.js
node --check api/narrative/_contracts.js
node --check api/narrative/_prompts.js
node --check api/narrative/_openai-adapter.js
node --check api/narrative/_handler.js
node --check api/narrative/interpret.js
node --check api/narrative/strategy.js
node --check api/narrative/sequence.js
```

Expected: PASS without a real API key because tests inject a fake provider.

- [ ] **Step 8: Commit**

```bash
git add api/narrative vercel.json
git commit -m "feat: add narrative serverless api"
```

---

### Task 9: Add recoverable errors, retries, accessibility, and stale-request browser coverage

**Files:**
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-workspace.css`
- Modify: `visual-direction-os/narrative-workspace.spec.js`

**Interfaces:**
- Retry buttons call only the failed stage.
- Upstream input/confirmed state remains intact.
- Abort/supersede logic uses one `AbortController` per stage plus draft request tokens.

- [ ] **Step 1: Add RED browser tests for retry and stale response**

Use Playwright routing for a non-demo page with a configured API base injected before page load. First Interpret request returns HTTP 503; retry returns valid data. Assert text input survives and only Interpret is retried.

Add a delayed first Interpret response and immediate second response after user edits the narrative. Assert the delayed first result never replaces the second result.

- [ ] **Step 2: Add RED accessibility assertions**

Lock:

- one visible focus target for each Reading/Strategy selection;
- no nested `<button>` or button-inside-label patterns;
- `aria-live` communicates loading/completion/error;
- provenance/confidence always has text;
- stage progress uses `aria-current="step"` or equivalent;
- reduced-motion style sets Narrative transitions/animations to `0s`/none.

- [ ] **Step 3: Implement isolated retry/abort behavior**

Maintain:

```js
const controllers = { interpret: null, strategy: null, sequence: null };
function startStageRequest(stage) {
  controllers[stage]?.abort();
  controllers[stage] = new AbortController();
  return controllers[stage];
}
```

On upstream edit, abort invalidated downstream requests immediately.

- [ ] **Step 4: Run Narrative browser suite GREEN at desktop + mobile**

```bash
npx playwright test visual-direction-os/narrative-workspace.spec.js --reporter=line --workers=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.css visual-direction-os/narrative-workspace.spec.js
git commit -m "test: harden narrative recovery and accessibility"
```

---

### Task 10: Publish assets, extend CI, run complete regression, and create review preview

**Files:**
- Modify: `visual-direction-os/site-publish.test.js`
- Modify: `.github/workflows/director-v2-ci.yml`
- Modify: `README.md` only if configuration instructions are not already discoverable elsewhere.

**Interfaces:**
- Existing Pages assembly remains `director-v2.html → _site/index.html`, `index.html → _site/knowledge.html`.
- Narrative API deployment stays separate; GitHub Pages HTML points to it only when API base configuration is supplied.

- [ ] **Step 1: Write RED publish assertions**

Add checks to `site-publish.test.js` for:

```js
[
  'narrative-contracts.js',
  'narrative-state.js',
  'narrative-api-client.js',
  'narrative-demo-fixtures.js',
  'narrative-apply.js',
  'narrative-workspace.js',
  'narrative-workspace.css'
].forEach(name => assert.ok(fs.existsSync(path.join(outputDir, name)), `${name} must publish`));
```

- [ ] **Step 2: Verify RED if publication/import wiring is incomplete**

```bash
node visual-direction-os/site-publish.test.js
```

If it already passes because `build-pages-site.js` recursively copies files, keep the test and do not refactor the build script.

- [ ] **Step 3: Extend CI commands**

Add new unit tests:

```yaml
node visual-direction-os/narrative-contracts.test.js
node visual-direction-os/narrative-state.test.js
node visual-direction-os/narrative-api-client.test.js
node visual-direction-os/narrative-apply.test.js
node api/narrative/_handler.test.js
```

Add syntax checks for all new JS modules.

Add `narrative-workspace.css` to source QA and `transition: all` checks, and require `prefers-reduced-motion` in it.

Add browser test:

```yaml
npx playwright test visual-direction-os/director-v2-browser.spec.js visual-direction-os/director-v2-desktop-polish.spec.js visual-direction-os/sequence-director-playback.spec.js visual-direction-os/diagnostic-routing.spec.js visual-direction-os/narrative-workspace.spec.js --reporter=line --workers=1
```

- [ ] **Step 4: Run local full verification**

```bash
node visual-direction-os/director-v2-models.test.js
node visual-direction-os/sequence-director-model.test.js
node visual-direction-os/diagnostic-routing.test.js
node visual-direction-os/visual-response.test.js
node visual-direction-os/visual-qa.test.js
node visual-direction-os/site-publish.test.js
node visual-direction-os/narrative-contracts.test.js
node visual-direction-os/narrative-state.test.js
node visual-direction-os/narrative-api-client.test.js
node visual-direction-os/narrative-apply.test.js
node api/narrative/_handler.test.js
node visual-direction-os/build-pages-site.js visual-direction-os /tmp/vdos-site
npx playwright test visual-direction-os/director-v2-browser.spec.js visual-direction-os/director-v2-desktop-polish.spec.js visual-direction-os/sequence-director-playback.spec.js visual-direction-os/diagnostic-routing.spec.js visual-direction-os/narrative-workspace.spec.js --reporter=line --workers=1
```

Expected: all tests PASS.

- [ ] **Step 5: Commit CI/publication updates**

```bash
git add visual-direction-os/site-publish.test.js .github/workflows/director-v2-ci.yml README.md
git commit -m "ci: verify narrative input workspace"
```

- [ ] **Step 6: Verify GitHub Actions on the exact head commit**

Wait for `Director Workspace v2.1 CI` on the feature branch and verify:

- workflow status `completed`
- conclusion `success`
- exact head SHA matches the final implementation commit
- browser suite includes Narrative workspace tests
- existing visual QA gates remain PASS

Do not claim completion before this evidence exists.

- [ ] **Step 7: Create a fixed branch preview for UI review**

Use the exact successful commit SHA with raw.githack:

```text
https://raw.githack.com/Caesar-ZZh/visual-direction-os/<SUCCESS_SHA>/visual-direction-os/director-v2.html?narrativeDemo=1
```

The demo parameter must visibly show `DEMO FIXTURE`; normal preview without that parameter must not pretend AI is connected.

---

## Deployment / Secret Hand-off After Code Is Green

The repository can contain the complete serverless API without embedding credentials. A real Narrative AI run still requires a deployed serverless endpoint and environment variables:

```text
OPENAI_API_KEY=<server-side secret>
OPENAI_MODEL=gpt-5.6
VDOS_ALLOWED_ORIGIN=https://caesar-zzh.github.io
```

Once the endpoint URL exists, set the Director Workspace API-base metadata/configuration to that deployed `/api/narrative` base. This is an operational deployment step, not permission to commit secrets.

Until then:

- `?narrativeDemo=1` = explicit deterministic UI review fixture.
- normal mode with no API base = visible `AI SERVICE NOT CONFIGURED` state.
- normal mode never silently falls back to demo data.

---

## Plan Self-Review

### Spec coverage

- Free text + optional Director Intent: Task 4.
- 2–3 Readings: Tasks 1, 5, 8.
- editable confirmed Reading: Tasks 2, 5.
- 2–3 Strategies: Tasks 1, 6, 8.
- five-beat Sequence Preview: Tasks 1, 6, 8.
- field-level grounding: Tasks 1, 5, 8.
- ambiguity + one clarification: Tasks 1, 5, 8.
- three sequential model calls: Tasks 3, 5, 6, 8.
- model-independent frontend / provider-specific adapter: Tasks 3, 8.
- no canonical state mutation before Apply: Tasks 2, 6, 7.
- Apply All / Selected Beats: Task 7.
- error recovery + stale responses: Tasks 2, 3, 9.
- accessibility/mobile/reduced motion: Tasks 4, 9, 10.
- API secret isolation: Task 8 + deployment hand-off.
- existing regressions: Tasks 4, 7, 10.

### Placeholder scan

No `TBD`, `TODO`, or unspecified implementation steps remain. Provider and deployment assumptions are explicit: OpenAI Responses adapter, server-side secret, Vercel-style serverless handlers, and external API-base configuration for the existing GitHub Pages frontend.

### Type/interface consistency

- Stage names are consistently `interpret`, `strategy`, `sequence`.
- Canonical beat IDs are consistently `setup`, `pressure`, `rupture`, `release`, `new-ownership`.
- Grounding source values are consistently `explicit`, `inferred`, `director_intent`; UI renders them as `EXPLICIT`, `INFERRED`, `DIRECTOR INTENT`.
- Sequence Director API is consistently `setSequence(nextSequence, options?)` and `getSequence()`.
- Narrative response validation occurs both client-side and server-side.
