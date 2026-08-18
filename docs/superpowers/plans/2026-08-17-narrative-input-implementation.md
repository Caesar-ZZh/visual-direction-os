# Narrative Input / Narrative → Direction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-class Narrative Input workspace that turns free-text scene descriptions into user-confirmed Narrative Readings, Visual Direction Strategies, and a five-beat Sequence Proposal, then applies all or selected beats to the existing Sequence Director only after explicit user confirmation.

**Architecture:** Narrative generation lives in an isolated `NarrativeDraft`; `VDOSScene` remains untouched until Apply. Browser modules follow the repo's existing UMD/CommonJS pattern. The frontend calls a separate Narrative API through three stage-specific endpoints. A thin provider adapter uses OpenAI Responses Structured Outputs server-side; the existing GitHub Pages app only receives validated domain JSON. The UI can use deterministic fixtures only when `?narrativeDemo=1` is explicitly present and must visibly label that mode `DEMO FIXTURE`.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js tests, Playwright 1.55.0, native `fetch`, OpenAI Responses API, Vercel-style Node serverless functions.

## Global Constraints

- Pipeline is fixed: `Interpret → Confirm Reading → Select Strategy → Sequence Preview → Apply`.
- Interpret returns 2–3 readings; Strategy returns 2–3 strategies; Sequence returns exactly `SETUP`, `PRESSURE`, `RUPTURE`, `RELEASE`, `NEW OWNERSHIP` in that order.
- Model-generated grounding source values are only `explicit`, `inferred`, `director_intent`; UI renders `EXPLICIT`, `INFERRED`, `DIRECTOR INTENT`.
- When the user edits a generated field, keep the original source metadata internally, add `directorEdited: true`, and display `DIRECTOR EDIT` instead of pretending the edited value came directly from the source text.
- At most one clarification question is shown at a time.
- Narrative proposal state must not call `VDOSScene.updateSceneState()` before Apply.
- `Apply All` and `Apply Selected Beats` are the only Narrative paths allowed to mutate Sequence Director / canonical Scene State.
- Production secrets stay server-side; no API key in HTML/JS.
- No silent fallback to demo data on network/provider/schema failure.
- Existing DIRECT, Sequence, Diagnose, route-to-control, visual QA, accessibility, mobile, and reduced-motion behavior remains green.
- No multi-scene project management, visual bible, storyboard/image generation, model picker, collaboration, or arbitrary chat in this release.
- Do not merge to `master` without explicit user authorization.

## File Map

**Create browser/core:**
- `visual-direction-os/narrative-contracts.js`
- `visual-direction-os/narrative-state.js`
- `visual-direction-os/narrative-demo-fixtures.js`
- `visual-direction-os/narrative-api-client.js`
- `visual-direction-os/narrative-apply.js`
- `visual-direction-os/narrative-workspace.js`
- `visual-direction-os/narrative-workspace.css`

**Create tests:**
- `visual-direction-os/narrative-contracts.test.js`
- `visual-direction-os/narrative-state.test.js`
- `visual-direction-os/narrative-api-client.test.js`
- `visual-direction-os/narrative-apply.test.js`
- `visual-direction-os/narrative-workspace.spec.js`

**Create serverless API:**
- `api/narrative/_contracts.js`
- `api/narrative/_prompts.js`
- `api/narrative/_openai-adapter.js`
- `api/narrative/_handler.js`
- `api/narrative/interpret.js`
- `api/narrative/strategy.js`
- `api/narrative/sequence.js`
- `api/narrative/_handler.test.js`
- `vercel.json`

**Modify existing:**
- `visual-direction-os/director-v2.html`
- `visual-direction-os/director-v2-app.js`
- `visual-direction-os/director-v2.css`
- `visual-direction-os/sequence-director.js`
- `visual-direction-os/sequence-director-playback.spec.js`
- `visual-direction-os/site-publish.test.js`
- `.github/workflows/director-v2-ci.yml`
- `README.md`

---

### Task 1: Lock response contracts

**Files:**
- Create: `visual-direction-os/narrative-contracts.js`
- Create: `visual-direction-os/narrative-contracts.test.js`

**Interfaces:**
- `validateInterpretResponse(value)`
- `validateStrategyResponse(value)`
- `validateSequenceResponse(value)`
- `validateSceneStatePatch(patch)`
- constants `SOURCE_TYPES`, `SIGNAL_LEVELS`, `CONFIDENCE_LEVELS`, `AGENCIES`, `VARIABLE_FAMILIES`, `BEAT_IDS`

- [ ] **Step 1: Write failing test**

```js
const assert = require('assert');
const c = require('./narrative-contracts.js');
const f = (value, sourceType = 'inferred') => ({ value, sourceType, basis: 'short evidence' });
const reading = {
  id: 'agency', title: 'AGENCY RECOVERY', confidence: 'high',
  narrativeProblem: f('External authority becomes control.'),
  coreConflict: f('Authority vs self-determination.'),
  startingState: f('Compliance', 'explicit'),
  endingState: f('Self-directed', 'director_intent'),
  turningPoint: f('The assignment is recognized as control.'),
  agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'authority visibly transfers' }
};
const interpret = { signal: 'strong', readings: [reading, { ...reading, id: 'rupture', title: 'INSTITUTIONAL RUPTURE' }], clarification: null };
assert.equal(c.validateInterpretResponse(interpret).valid, true);
assert.equal(c.validateInterpretResponse({ ...interpret, readings: [reading] }).valid, false);

const strategies = { strategies: [
  { id: 'space', title: 'SPACE-LED', primaryVariable: 'space', supportingVariables: ['camera','color'], restrainedVariables: ['texture','rhythm'], mechanism: 'Pressure accumulates spatially before agency transfers.', rationale: 'Loss of freedom is the first visible causal change.' },
  { id: 'camera', title: 'CAMERA-LED', primaryVariable: 'camera', supportingVariables: ['space','line'], restrainedVariables: ['color'], mechanism: 'Viewpoint authority moves from institution to character.', rationale: 'The scene is fundamentally about who defines perspective.' }
]};
assert.equal(c.validateStrategyResponse(strategies).valid, true);

const ids = ['setup','pressure','rupture','release','new-ownership'];
const seq = { sequenceProposal: { beats: ids.map((id, i) => ({
  id, label: id === 'new-ownership' ? 'NEW OWNERSHIP' : id.toUpperCase(), narrativeBeat: `beat ${i}`,
  agency: i < 2 ? 'world' : i < 4 ? 'contested' : 'character', primaryVariable: i === 4 ? 'agency' : 'camera',
  supportingVariables: ['space'], restrainedVariables: ['texture'], visualEvents: [],
  sceneStatePatch: { agency: i < 2 ? 'world' : i < 4 ? 'contested' : 'character' }, rationale: 'causal reason'
})) } };
assert.equal(c.validateSequenceResponse(seq).valid, true);
assert.equal(c.validateSequenceResponse({ sequenceProposal: { beats: seq.sequenceProposal.beats.slice(0,4) } }).valid, false);
console.log('narrative-contracts.test.js passed');
```

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/narrative-contracts.test.js
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement UMD/CommonJS validators**

```js
const SOURCE_TYPES = ['explicit','inferred','director_intent'];
const SIGNAL_LEVELS = ['weak','partial','strong'];
const CONFIDENCE_LEVELS = ['low','medium','high'];
const AGENCIES = ['world','contested','shared','character'];
const VARIABLE_FAMILIES = ['color','space','camera','line','texture','rhythm','agency'];
const BEAT_IDS = ['setup','pressure','rupture','release','new-ownership'];
```

Validation rules are explicit: 2–3 readings, 2–3 strategies, exactly five ordered beats, non-empty Basis strings, enum membership, and whitelisted Scene State patch keys/families only. Return `{ valid, errors, value }` on success and `{ valid:false, errors }` on failure.

- [ ] **Step 4: Run GREEN**

```bash
node visual-direction-os/narrative-contracts.test.js
node --check visual-direction-os/narrative-contracts.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/narrative-contracts.js visual-direction-os/narrative-contracts.test.js
git commit -m "feat: add narrative response contracts"
```

---

### Task 2: Build isolated NarrativeDraft state and explicit demo fixtures

**Files:**
- Create: `visual-direction-os/narrative-state.js`
- Create: `visual-direction-os/narrative-state.test.js`
- Create: `visual-direction-os/narrative-demo-fixtures.js`

**Interfaces:**
- `createNarrativeState()` returns `getState`, `subscribe`, `setInput`, `setInterpretResult`, `selectReading`, `editSelectedReadingField`, `confirmReading`, `setStrategyResult`, `selectStrategy`, `setSequenceResult`, `toggleBeat`, `setApplyMode`, `setClarificationAnswer`, `beginRequest`, `acceptResponse`, `failRequest`.

- [ ] **Step 1: Create the demo fixture first**

Use this exact fixture content pattern:

```js
const grounded = (value, sourceType, basis) => ({ value, sourceType, basis });
const interpret = {
  signal: 'strong',
  readings: [
    {
      id: 'reading-agency', title: 'AGENCY RECOVERY', confidence: 'high',
      narrativeProblem: grounded('An assigned role is revealed as a mechanism of control.', 'inferred', 'The scene shifts when the character recognizes the assignment as control.'),
      coreConflict: grounded('External authority versus self-determination.', 'inferred', 'Acceptance changes into refusal.'),
      startingState: grounded('The character expects to comply with the assignment.', 'explicit', 'The scene begins with acceptance of the task.'),
      endingState: grounded('The character leaves after making an independent decision.', 'director_intent', 'The Director Intent asks for reclaimed control.'),
      turningPoint: grounded('The character realizes the assignment itself is control.', 'explicit', 'The realization is stated in the scene description.'),
      agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'Authority begins external, becomes contested, then transfers to the character.' }
    },
    {
      id: 'reading-rupture', title: 'INSTITUTIONAL RUPTURE', confidence: 'medium',
      narrativeProblem: grounded('A functional relationship becomes an explicit break with an institution.', 'inferred', 'The refusal converts a routine assignment into rupture.'),
      coreConflict: grounded('Institutional continuity versus personal refusal.', 'inferred', 'The scene ends by breaking the expected relationship.'),
      startingState: grounded('The institution defines the available role.', 'inferred', 'The assignment is presented as a given.'),
      endingState: grounded('The relationship is left unresolved after refusal.', 'inferred', 'Leaving resolves the immediate action but not the institution.'),
      turningPoint: grounded('The task changes meaning from work to control.', 'explicit', 'The character recognizes the controlling function.'),
      agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'The refusal transfers immediate decision authority to the character.' }
    }
  ],
  clarification: null
};
const strategy = { strategies: [
  { id:'space', title:'SPACE-LED', primaryVariable:'space', supportingVariables:['camera','color'], restrainedVariables:['texture','rhythm'], mechanism:'Let environmental compression embody external authority before opening after refusal.', rationale:'The conflict first becomes visible as loss and recovery of freedom.' },
  { id:'camera', title:'CAMERA-LED', primaryVariable:'camera', supportingVariables:['space','line'], restrainedVariables:['color'], mechanism:'Keep viewpoint institution-led until the recognition beat, then transfer framing authority.', rationale:'Who defines perspective directly expresses the scene’s agency conflict.' },
  { id:'color', title:'COLOR OWNERSHIP', primaryVariable:'color', supportingVariables:['camera','texture'], restrainedVariables:['rhythm'], mechanism:'Move color territory from environment to contested space and finally to the character.', rationale:'Ownership can change without reducing the scene to warm-versus-cool mood.' }
] };
const beatData = [
  ['setup','SETUP','The character enters expecting to accept the assignment.','world','camera',['space'],['texture'],[],{agency:'world',variables:{camera:{perspective:'world',stability:'high'},space:{compression:'low'},color:{territory:'world'}}}],
  ['pressure','PRESSURE','The conversation increasingly limits the character’s perceived freedom.','world','space',['camera','line'],['texture','rhythm'],['SPACE COMPRESSION'],{agency:'world',variables:{space:{compression:'high'},camera:{perspective:'world',stability:'medium'}}}],
  ['rupture','RUPTURE','The character recognizes that the assignment itself is control.','contested','camera',['space','color'],['rhythm'],['CAMERA BREAK','COLOR MIGRATION'],{agency:'contested',variables:{camera:{perspective:'mixed',stability:'low'},color:{territory:'contested'}}}],
  ['release','RELEASE','The character stops accepting the institutional frame.','contested','camera',['space'],['texture','rhythm'],['AGENCY TRANSFER'],{agency:'contested',variables:{space:{compression:'low'},camera:{perspective:'mixed',stability:'medium'}}}],
  ['new-ownership','NEW OWNERSHIP','The character leaves after defining the next action.','character','agency',['camera','color'],['texture','rhythm'],['OWNERSHIP SHIFT'],{agency:'character',variables:{camera:{perspective:'character'},color:{territory:'character'}}}]
];
const sequence = { sequenceProposal: { beats: beatData.map(([id,label,narrativeBeat,agency,primaryVariable,supportingVariables,restrainedVariables,visualEvents,sceneStatePatch]) => ({ id,label,narrativeBeat,agency,primaryVariable,supportingVariables,restrainedVariables,visualEvents,sceneStatePatch,rationale:`${label} advances the selected directing mechanism without letting every variable peak at once.` })) } };
```

Export `{ interpret, strategy, sequence }` with the same UMD/CommonJS pattern as existing model files.

- [ ] **Step 2: Write failing state test**

```js
const assert = require('assert');
const fixtures = require('./narrative-demo-fixtures.js');
const { createNarrativeState } = require('./narrative-state.js');
const draft = createNarrativeState();
draft.setInput('scene', 'intent');
draft.setInterpretResult(fixtures.interpret);
draft.selectReading('reading-agency');
draft.editSelectedReadingField('endingState', 'The character defines the next action.');
assert.equal(draft.getState().selectedReading.endingState.directorEdited, true);
assert.equal(draft.getState().strategies.length, 0);
draft.confirmReading();
assert.equal(draft.getState().stage, 'strategy');
const stale = draft.beginRequest('strategy');
const current = draft.beginRequest('strategy');
assert.equal(draft.acceptResponse('strategy', stale, fixtures.strategy), false);
assert.equal(draft.getState().requests.strategy.token, current);
console.log('narrative-state.test.js passed');
```

- [ ] **Step 3: Run RED**

```bash
node visual-direction-os/narrative-state.test.js
```

Expected: `narrative-state.js` missing.

- [ ] **Step 4: Implement state gates and invalidation**

Initial state contains input, Director Intent, readings, selected/confirmed Reading, strategies, selected Strategy, sequenceProposal, selectedBeatIds, applyMode, clarification, and per-stage `{status, token, error}`. Editing a Reading field sets `directorEdited:true`, preserves the original `sourceType` and `basis`, and adds `directorEditBasis:'Edited by the director.'`. Editing confirmed upstream content clears downstream Strategy and Sequence. Selecting another Strategy clears Sequence. Stale request tokens are ignored.

- [ ] **Step 5: Run GREEN and commit**

```bash
node visual-direction-os/narrative-state.test.js
node --check visual-direction-os/narrative-state.js
node --check visual-direction-os/narrative-demo-fixtures.js
git add visual-direction-os/narrative-state.js visual-direction-os/narrative-state.test.js visual-direction-os/narrative-demo-fixtures.js
git commit -m "feat: add narrative draft state machine"
```

---

### Task 3: Add stage API client

**Files:**
- Create: `visual-direction-os/narrative-api-client.js`
- Create: `visual-direction-os/narrative-api-client.test.js`

**Interfaces:**
- `createNarrativeApiClient({ baseUrl, fetchImpl, demoMode, fixtures })`
- methods `interpret`, `strategy`, `sequence`
- typed error `.code`: `NOT_CONFIGURED`, `NETWORK`, `HTTP`, `SCHEMA`

- [ ] **Step 1: Write RED client test**

```js
const assert = require('assert');
const fixtures = require('./narrative-demo-fixtures.js');
const { createNarrativeApiClient } = require('./narrative-api-client.js');
(async () => {
  const calls = [];
  const fakeFetch = async (url, options) => ({ ok:true, status:200, json:async () => { calls.push({url,options}); return fixtures.interpret; } });
  const client = createNarrativeApiClient({ baseUrl:'https://api.example.test/api/narrative', fetchImpl:fakeFetch });
  const result = await client.interpret({ narrative:'scene', directorIntent:'' });
  assert.equal(result.readings.length, 2);
  assert.equal(calls[0].url, 'https://api.example.test/api/narrative/interpret');
  await assert.rejects(() => createNarrativeApiClient({ baseUrl:'', fetchImpl:fakeFetch }).interpret({narrative:'scene'}), e => e.code === 'NOT_CONFIGURED');
  const demo = await createNarrativeApiClient({ baseUrl:'', demoMode:true, fixtures }).strategy({ confirmedReading:{} });
  assert.equal(demo.strategies.length, 3);
  console.log('narrative-api-client.test.js passed');
})();
```

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/narrative-api-client.test.js
```

- [ ] **Step 3: Implement POST transport**

`request(stage,payload,signal)` must: return fixture only when `demoMode`; reject empty baseUrl otherwise; POST JSON to `${baseUrl}/${stage}`; normalize network/HTTP errors; validate returned JSON with the stage contract; throw `SCHEMA` on invalid output.

- [ ] **Step 4: Run GREEN and commit**

```bash
node visual-direction-os/narrative-api-client.test.js
node --check visual-direction-os/narrative-api-client.js
git add visual-direction-os/narrative-api-client.js visual-direction-os/narrative-api-client.test.js
git commit -m "feat: add narrative api client"
```

---

### Task 4: Add Narrative navigation and editorial input workspace

**Files:**
- Modify: `visual-direction-os/director-v2.html`
- Modify: `visual-direction-os/director-v2-app.js`
- Modify: `visual-direction-os/director-v2.css`
- Create: `visual-direction-os/narrative-workspace.js`
- Create: `visual-direction-os/narrative-workspace.css`
- Create: `visual-direction-os/narrative-workspace.spec.js`

**Interfaces:**
- `VDOSNarrativeWorkspace.initNarrativeWorkspace(rootNode,{ scene, api, draft, demoMode })`
- Director app mode order becomes `learn`, `narrative`, `direct`, `diagnose`.

- [ ] **Step 1: Write browser RED tests**

```js
const { test, expect } = require('@playwright/test');
test('Narrative mode exposes editorial story input', async ({ page }) => {
  await page.goto('/director-v2.html?narrativeDemo=1');
  await page.getByRole('button', { name:/Turn story into direction/i }).click();
  await expect(page.locator('#narrative-panel')).toBeInViewport();
  await expect(page.getByLabel('Scene description')).toBeVisible();
  await expect(page.getByLabel('Director intent')).toBeVisible();
  await expect(page.getByRole('button',{name:/Start interpretation/i})).toBeVisible();
  await expect(page.locator('[data-narrative-demo-badge]')).toHaveText('DEMO FIXTURE');
});
test('mobile has four primary modes without overflow', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/director-v2.html?narrativeDemo=1');
  await expect(page.locator('.mobile-modes [data-mode]')).toHaveCount(4);
  const box = await page.locator('.mobile-modes').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390.5);
});
```

- [ ] **Step 2: Run RED**

```bash
python3 -m http.server 4173 --directory visual-direction-os >/tmp/vdos-server.log 2>&1 &
npx playwright test visual-direction-os/narrative-workspace.spec.js --reporter=line --workers=1
```

- [ ] **Step 3: Add mode + panel + assets**

Use `modeOrder = ['learn','narrative','direct','diagnose']`; add `#narrative-panel` before `#direct-panel`; add `<meta name="vdos-narrative-api-base" content="">`; add stylesheet and scripts in this order: contracts, state, fixtures, API client, apply, workspace, app. Mobile nav becomes four equal columns.

- [ ] **Step 4: Render input stage**

Render semantic labels, Scene Description textarea capped at 2000 chars, optional Director Intent textarea, character count, five-stage progress, `START INTERPRETATION`, `aria-live` status, and an `AI SERVICE NOT CONFIGURED` state when no API base exists outside demo mode.

- [ ] **Step 5: Run GREEN/regressions and commit**

```bash
npx playwright test visual-direction-os/narrative-workspace.spec.js visual-direction-os/director-v2-browser.spec.js visual-direction-os/director-v2-desktop-polish.spec.js --reporter=line --workers=1
git add visual-direction-os/director-v2.html visual-direction-os/director-v2-app.js visual-direction-os/director-v2.css visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.css visual-direction-os/narrative-workspace.spec.js
git commit -m "feat: add narrative input workspace shell"
```

---

### Task 5: Implement Interpret, editable Grounding, Strategy, and Sequence Preview

**Files:**
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-workspace.css`
- Modify: `visual-direction-os/narrative-workspace.spec.js`

**Interfaces:**
- Interpret payload `{ narrative, directorIntent, clarificationAnswer:null|string }`
- Strategy payload `{ confirmedReading }`
- Sequence payload `{ confirmedReading, selectedStrategy, currentSceneCompatibility }`

- [ ] **Step 1: Add RED end-to-end demo test**

Test exact flow: fill story+intent → Start Interpretation → 2 cards → select Reading → six editable fields visible → edit Ending State → `DIRECTOR EDIT` badge visible → Confirm Reading → 3 Strategy cards → choose Camera-led → `SELECT STRATEGY` → five Sequence beats visible in exact order. Snapshot `VDOSScene` before selecting Strategy and assert it is byte-for-byte unchanged after Sequence Preview.

- [ ] **Step 2: Run RED**

```bash
npx playwright test visual-direction-os/narrative-workspace.spec.js -g "end-to-end demo" --reporter=line --workers=1
```

- [ ] **Step 3: Implement Interpret UI**

Candidate card shows title, Narrative Problem summary, agency transition, confidence. Selected Reading detail shows Narrative Problem, Core Conflict, Starting State, Ending State, Turning Point, Agency Transition. Generated fields show original provenance; user-edited fields display `DIRECTOR EDIT` using `directorEdited:true`.

- [ ] **Step 4: Implement clarification**

If Interpret returns `clarification`, render exactly one question and 2–4 options. Selecting an answer reruns only Interpret. Preserve story/intent. Invalidate Strategy/Sequence until the revised Reading is reconfirmed.

- [ ] **Step 5: Implement Strategy + Sequence Preview**

Strategy cards show Primary / Support / Restrain / Mechanism / Why this Primary. Sequence preview shows five beats with Narrative Beat, Agency, Primary, Support, Restrain, Visual Events, proposed Scene State summary, rationale. Use only a read-only compatibility snapshot `{agency,ownership,variables}` from `VDOSScene`; never call `updateSceneState` here.

- [ ] **Step 6: Run GREEN and commit**

```bash
npx playwright test visual-direction-os/narrative-workspace.spec.js --reporter=line --workers=1
git add visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.css visual-direction-os/narrative-workspace.spec.js
git commit -m "feat: add narrative interpretation and sequence preview"
```

---

### Task 6: Add Apply semantics and dynamic Sequence Director replacement

**Files:**
- Create: `visual-direction-os/narrative-apply.js`
- Create: `visual-direction-os/narrative-apply.test.js`
- Modify: `visual-direction-os/sequence-director.js`
- Modify: `visual-direction-os/sequence-director-playback.spec.js`
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-workspace.spec.js`

**Interfaces:**
- `buildSequenceFromProposal(proposal,currentSequence,selectedBeatIds)`
- `summarizeImpact(currentSequence,nextSequence)`
- Sequence controller adds `setSequence(nextSequence,{playhead?})`, `getSequence()`.

- [ ] **Step 1: Write RED apply unit test**

```js
const assert = require('assert');
const apply = require('./narrative-apply.js');
const model = require('./sequence-director-model.js');
const fixtures = require('./narrative-demo-fixtures.js');
const next = apply.buildSequenceFromProposal(fixtures.sequence.sequenceProposal, model.DEFAULT_SEQUENCE, ['rupture','release']);
assert.equal(next.beats.find(b=>b.id==='setup').narrativePurpose, model.DEFAULT_SEQUENCE.beats.find(b=>b.id==='setup').narrativePurpose);
assert.equal(next.beats.find(b=>b.id==='rupture').narrativePurpose, fixtures.sequence.sequenceProposal.beats.find(b=>b.id==='rupture').narrativeBeat);
assert.equal(model.validateSequence(next).valid, true);
assert.deepEqual(apply.summarizeImpact(model.DEFAULT_SEQUENCE,next).changedBeatIds, ['rupture','release']);
console.log('narrative-apply.test.js passed');
```

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/narrative-apply.test.js
```

- [ ] **Step 3: Implement deterministic mapping**

Reuse existing canonical beat `start/end` timings. Selected proposal beats replace Narrative Purpose, hierarchy, Scene Patch, and events. Unselected beats/events remain untouched. Map up to three proposal events per selected beat to 25%, 50%, 75% within that beat and deterministic IDs `${beat.id}-proposal-${index}`. Reject invalid/missing patch data instead of inventing it.

- [ ] **Step 4: Extend Sequence Director**

Change fixed sequence to `let sequence = clone(DEFAULT_SEQUENCE)`. `setSequence` validates via `validateSequence`, pauses playback, replaces the sequence, rebuilds dynamic beat/event markup, rebinds event controls, and renders at the current or provided playhead. `getSequence` returns a deep clone.

- [ ] **Step 5: Add RED→GREEN browser Apply test**

Sequence Preview must leave Scene unchanged. Switch to `Apply Selected Beats`, select RUPTURE+RELEASE, inspect impact summary, click `APPLY TO DIRECTOR`, assert only those two beats changed in `VDOSSequenceDirectorController.getSequence()`, and assert Scene mutation occurs only after this click. Then navigate to DIRECT and confirm a manual Camera option still updates canonical Scene State.

- [ ] **Step 6: Run GREEN and commit**

```bash
node visual-direction-os/narrative-apply.test.js
npx playwright test visual-direction-os/narrative-workspace.spec.js visual-direction-os/sequence-director-playback.spec.js --reporter=line --workers=1
git add visual-direction-os/narrative-apply.js visual-direction-os/narrative-apply.test.js visual-direction-os/sequence-director.js visual-direction-os/sequence-director-playback.spec.js visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.spec.js
git commit -m "feat: apply narrative proposals to sequence director"
```

---

### Task 7: Build serverless Narrative API and OpenAI adapter

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
- `POST /api/narrative/interpret`
- `POST /api/narrative/strategy`
- `POST /api/narrative/sequence`
- env: `OPENAI_API_KEY`, optional `OPENAI_MODEL` default `gpt-5.6`, `VDOS_ALLOWED_ORIGIN`

- [ ] **Step 1: Write RED handler test with fake provider**

```js
const assert = require('assert');
const fixtures = require('../../visual-direction-os/narrative-demo-fixtures.js');
const { createHandler } = require('./_handler.js');
const makeRes = () => ({ statusCode:200, headers:{}, body:'', setHeader(k,v){this.headers[k.toLowerCase()]=v;}, status(c){this.statusCode=c;return this;}, json(v){this.body=JSON.stringify(v);return this;} });
(async()=>{
  const provider = { generate: async ({stage}) => fixtures[stage] };
  const handler = createHandler({ stage:'interpret', provider, allowedOrigin:'https://caesar-zzh.github.io' });
  const req = { method:'POST', headers:{origin:'https://caesar-zzh.github.io'}, body:{narrative:'scene',directorIntent:''} };
  const res = makeRes(); await handler(req,res); assert.equal(res.statusCode,200); assert.equal(JSON.parse(res.body).readings.length,2);
  const blocked = makeRes(); await handler({...req,headers:{origin:'https://evil.example'}},blocked); assert.equal(blocked.statusCode,403);
  console.log('_handler.test.js passed');
})();
```

- [ ] **Step 2: Run RED**

```bash
node api/narrative/_handler.test.js
```

- [ ] **Step 3: Implement stage prompts**

Interpret instruction explicitly requests 2–3 plausible readings, short Basis fields, explicit/inferred/director-intent provenance, no visual parameter prescription, no chain-of-thought, and one clarification only when materially useful. Strategy requests causal Primary/Support/Restrain mechanisms and forbids style imitation. Sequence requests exactly the canonical five beats.

- [ ] **Step 4: Implement OpenAI adapter**

POST server-side to `https://api.openai.com/v1/responses` with `Authorization: Bearer ${apiKey}`, `store:false`, and:

```js
{
  model,
  instructions,
  input: JSON.stringify(input),
  text: { format: { type:'json_schema', name:`vdos_${stage}`, strict:true, schema } }
}
```

Extract response output text, parse JSON, revalidate with `_contracts.js`, and return validated domain JSON. Browser responses never include provider raw errors, raw prompts, or secrets.

- [ ] **Step 5: Implement handler validation/CORS**

405 non-POST; 400 invalid payload or Narrative >2000 chars; 403 unapproved origin; normalized `BAD_REQUEST`, `FORBIDDEN`, `PROVIDER`, `SCHEMA` errors. Production origin equals `VDOS_ALLOWED_ORIGIN`; localhost:4173 is allowed only outside production.

- [ ] **Step 6: Add three endpoint wrappers + Vercel config**

Each wrapper exports `createProductionHandler('<stage>')`. `vercel.json` contains:

```json
{"functions":{"api/narrative/*.js":{"maxDuration":30}}}
```

- [ ] **Step 7: Run GREEN and commit**

```bash
node api/narrative/_handler.test.js
node --check api/narrative/_contracts.js
node --check api/narrative/_prompts.js
node --check api/narrative/_openai-adapter.js
node --check api/narrative/_handler.js
node --check api/narrative/interpret.js
node --check api/narrative/strategy.js
node --check api/narrative/sequence.js
git add api/narrative vercel.json
git commit -m "feat: add narrative serverless api"
```

---

### Task 8: Harden recovery, accessibility, publication, CI, and fixed preview

**Files:**
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-workspace.css`
- Modify: `visual-direction-os/narrative-workspace.spec.js`
- Modify: `visual-direction-os/site-publish.test.js`
- Modify: `.github/workflows/director-v2-ci.yml`
- Modify: `README.md`

- [ ] **Step 1: Add RED retry/stale/accessibility browser tests**

Use Playwright route interception on non-demo mode: first Interpret call returns 503, retry returns a valid fixture, and original story text remains. Add a delayed first Interpret response followed by a newer request and assert the old response cannot overwrite the new Reading cards. Assert focusable Reading/Strategy controls, text provenance/confidence labels, `aria-live` status/errors, stage `aria-current="step"`, no nested buttons, and reduced-motion behavior.

- [ ] **Step 2: Implement one AbortController per stage**

```js
const controllers = { interpret:null, strategy:null, sequence:null };
function replaceController(stage) {
  controllers[stage]?.abort();
  controllers[stage] = new AbortController();
  return controllers[stage];
}
```

Abort invalidated downstream requests on upstream edits; request tokens remain the final stale-response guard.

- [ ] **Step 3: Add publish test and README config**

`site-publish.test.js` must assert the seven new browser assets exist in assembled `_site`. README adds a `Narrative API configuration` section documenting: normal mode requires configured API base; `?narrativeDemo=1` is labelled demo-only; secrets use `OPENAI_API_KEY`, `OPENAI_MODEL`, `VDOS_ALLOWED_ORIGIN` server-side.

- [ ] **Step 4: Extend CI**

Add the four new browser/core Node tests plus `api/narrative/_handler.test.js`, syntax checks for all new JS, `narrative-workspace.css` in source QA/transition checks, reduced-motion requirement, and `narrative-workspace.spec.js` to Playwright.

- [ ] **Step 5: Run complete local verification**

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

Expected: every test PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/narrative-workspace.js visual-direction-os/narrative-workspace.css visual-direction-os/narrative-workspace.spec.js visual-direction-os/site-publish.test.js .github/workflows/director-v2-ci.yml README.md
git commit -m "ci: verify narrative input workspace"
```

- [ ] **Step 7: Verify exact-head GitHub Actions**

Confirm `Director Workspace v2.1 CI` is `completed/success` on the exact final SHA and that the browser job includes the Narrative suite. Do not claim completion before this succeeds.

- [ ] **Step 8: Give user a fixed review preview**

Use:

```text
https://raw.githack.com/Caesar-ZZh/visual-direction-os/<SUCCESS_SHA>/visual-direction-os/director-v2.html?narrativeDemo=1
```

The visible `DEMO FIXTURE` label is mandatory. Normal mode without API base must show `AI SERVICE NOT CONFIGURED` rather than fake results.

## Deployment Hand-off

Code can be completed and CI-green without committing credentials. A real model-backed Narrative run additionally requires a deployed serverless endpoint with:

```text
OPENAI_API_KEY=<server-side secret>
OPENAI_MODEL=gpt-5.6
VDOS_ALLOWED_ORIGIN=https://caesar-zzh.github.io
```

After deployment, configure the Director Workspace API base to that endpoint's `/api/narrative` base. Do not commit the secret.

## Self-Review

- Spec coverage: Input/Intent Task 4; Readings/Grounding/Clarification Task 5; Strategies/Sequence Preview Task 5; isolation/stale state Tasks 2–3; Apply Task 6; server API Task 7; recovery/accessibility/CI Task 8.
- Placeholder scan: no `TBD`, `TODO`, incomplete fixture arrays, or “implement similarly” instructions remain.
- Type consistency: stages are `interpret|strategy|sequence`; beats are `setup|pressure|rupture|release|new-ownership`; generated source types are `explicit|inferred|director_intent`; user edits use separate `directorEdited:true`; Sequence controller APIs are `setSequence` and `getSequence`.
- Scope check: this plan covers one coherent Narrative→Direction vertical slice. Multi-scene and Director Output remain separate future specs.
