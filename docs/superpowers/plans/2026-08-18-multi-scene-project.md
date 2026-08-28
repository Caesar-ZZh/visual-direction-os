# Multi-Scene Project / Project Arc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project-level Scene structure, isolated multi-Scene snapshots, AI Scene Breakdown, derived Project Arc, and deterministic Cross-Scene Continuity around the existing single Active Scene Director without turning Project into a fifth mode.

**Architecture:** `ProjectState` owns ordered independent `SceneRecord` snapshots. A `ProjectRuntime` transaction saves the current Scene, aborts transient work, restores the target snapshot into the existing single `VDOSScene`, and rebinds Scene-local state. AI writes only to `ProjectBreakdownDraft` until explicit structure confirmation. `deriveProjectArc()` and `deriveContinuity()` are pure deterministic functions over Project snapshots; Project visual values are never persisted as a second source of truth.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, UMD/CommonJS browser-core modules, Node.js `assert` tests, Playwright 1.55.0, native `fetch`, Vercel-style serverless Node handlers, existing OpenAI Responses Structured Outputs adapter.

**Spec:** `docs/superpowers/specs/2026-08-18-multi-scene-project-design.md`

## Global Constraints

- Project is a context layer; existing modes remain exactly `learn`, `narrative`, `direct`, `diagnose`.
- Single Scene remains a supported special case of Multi-Scene.
- AI Project Breakdown may generate only Project Reading and narrative Scene-structure fields; visual-direction fields are forbidden.
- Breakdown Proposal must not mutate canonical Project State before `CONFIRM SCENE STRUCTURE`.
- New technical default Scene State must render as `—` while `status.visual !== 'directed'`.
- Project Store uses clone-on-read and clone-on-write; Scene snapshots never share mutable nested state.
- Scene switch transaction is `save → abort transient work → unload/unbind → load target → rebind`.
- Stale AI responses cannot write into another Scene after a Scene switch.
- Project Arc is derived from Scene snapshots and is not manually persisted as a competing editable copy.
- Continuity is deterministic, outputs `PASS / WARN / FAIL / UNRESOLVED`, identifies Scene boundaries, and never auto-mutates Scene State.
- Project Arc rows are exactly Narrative Role, Agency, Camera Authority, Color Territory, Spatial Pressure, Graphic Density, Rhythmic Energy.
- Scene roles are limited to `setup`, `development`, `pressure`, `recognition`, `escalation`, `rupture`, `reversal`, `release`, `resolution`, `transition`.
- Agency vocabulary remains `world`, `contested`, `shared`, `character`.
- Existing Narrative / Direct / Sequence / Diagnose, Knowledge Atlas, mobile, reduced-motion, accessibility and Pages rollout behavior must remain green.
- Do not merge to `master` without explicit user authorization.

## File Map

**Create core Project modules:**
- `visual-direction-os/project-contracts.js`
- `visual-direction-os/project-state.js`
- `visual-direction-os/project-runtime.js`
- `visual-direction-os/project-arc.js`
- `visual-direction-os/project-continuity.js`

**Create Breakdown modules:**
- `visual-direction-os/project-breakdown-state.js`
- `visual-direction-os/project-breakdown-api-client.js`
- `visual-direction-os/project-breakdown-fixtures.js`

**Create Project UI:**
- `visual-direction-os/project-workspace.js`
- `visual-direction-os/project-workspace.css`

**Create Node tests:**
- `visual-direction-os/project-contracts.test.js`
- `visual-direction-os/project-state.test.js`
- `visual-direction-os/project-runtime.test.js`
- `visual-direction-os/project-arc.test.js`
- `visual-direction-os/project-continuity.test.js`
- `visual-direction-os/project-breakdown-state.test.js`
- `visual-direction-os/project-breakdown-api-client.test.js`

**Create browser acceptance:**
- `visual-direction-os/project-workspace.spec.js`

**Create server API:**
- `api/project/_contracts.js`
- `api/project/_prompts.js`
- `api/project/_handler.js`
- `api/project/breakdown.js`
- `api/project/_handler.test.js`

**Modify existing integration:**
- `visual-direction-os/director-v2.html`
- `visual-direction-os/director-v2-app.js`
- `visual-direction-os/narrative-contracts.js`
- `visual-direction-os/narrative-api-client.js`
- `visual-direction-os/narrative-workspace.js`
- `visual-direction-os/narrative-apply.js`
- `.github/workflows/director-v2-ci.yml`
- `README.md`

---

### Task 1: Lock Project and Breakdown contracts

**Files:**
- Create: `visual-direction-os/project-contracts.test.js`
- Create: `visual-direction-os/project-contracts.js`

**Interfaces:**
- Produces constants `SCENE_ROLES`, `AGENCIES`, `VISUAL_STATUSES`, `NARRATIVE_STATUSES`, `CONTINUITY_STATUSES`.
- Produces `createEmptySceneRecord(input)`.
- Produces `validateSceneRecord(value)`.
- Produces `validateProjectState(value)`.
- Produces `validateBreakdownResponse(value)`.
- Produces `assertNoVisualDirectionFields(value)`.
- All successful validators return cloned `value` so downstream modules never retain caller-owned mutable references.

- [ ] **Step 1: Write the failing contract test**

Create `visual-direction-os/project-contracts.test.js`:

```js
const assert = require('assert');
const c = require('./project-contracts.js');

const scene = c.createEmptySceneRecord({
  id: 'scene-01',
  order: 1,
  title: 'Compliance',
  narrativeRole: {
    role: 'setup',
    narrativeFunction: 'Establish accepted institutional authority.',
    startingState: 'The order is accepted as normal.',
    endingState: 'The assignment is accepted.',
    turningPoint: 'The assignment becomes binding.',
    agencyTransition: ['world', 'world'],
    relationToPrevious: null
  }
});
assert.equal(c.validateSceneRecord(scene).valid, true);
assert.equal(scene.status.visual, 'undirected');

const breakdown = {
  projectReading: {
    narrativeProblem: 'Compliance becomes recognition of control.',
    coreConflict: 'Institutional order versus self-authorship.',
    startingState: 'The system defines the available action.',
    endingState: 'The character acts outside that structure.',
    agencyArc: ['world', 'contested', 'character']
  },
  scenes: [{
    id: 'proposal-scene-01',
    title: 'Compliance',
    role: 'setup',
    narrativeFunction: 'Establish compliance.',
    startingState: 'Order is normal.',
    endingState: 'Assignment accepted.',
    turningPoint: 'Assignment becomes binding.',
    agencyTransition: ['world', 'world'],
    relationToPrevious: null,
    sourceBasis: 'The opening describes routine acceptance.',
    breakBasis: 'A later state change has not happened yet.'
  }]
};
assert.equal(c.validateBreakdownResponse(breakdown).valid, true);
assert.equal(c.validateBreakdownResponse({
  ...breakdown,
  scenes: [{ ...breakdown.scenes[0], camera: { perspective: 'character' } }]
}).valid, false);
assert.equal(c.validateBreakdownResponse({
  ...breakdown,
  scenes: [{ ...breakdown.scenes[0], role: 'cool-climax' }]
}).valid, false);
console.log('project-contracts.test.js passed');
```

- [ ] **Step 2: Run RED**

Run:

```bash
node visual-direction-os/project-contracts.test.js
```

Expected: `Cannot find module './project-contracts.js'`.

- [ ] **Step 3: Implement minimal UMD/CommonJS contracts**

Use the established module pattern:

```js
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const SCENE_ROLES = ['setup','development','pressure','recognition','escalation','rupture','reversal','release','resolution','transition'];
  const AGENCIES = ['world','contested','shared','character'];
  const VISUAL_STATUSES = ['undirected','in-progress','directed'];
  const NARRATIVE_STATUSES = ['defined','in-progress','confirmed'];
  const CONTINUITY_STATUSES = ['pass','warn','fail','unresolved'];
  // clone, validation helpers, createEmptySceneRecord, validators
  return { SCENE_ROLES, AGENCIES, VISUAL_STATUSES, NARRATIVE_STATUSES, CONTINUITY_STATUSES, createEmptySceneRecord, validateSceneRecord, validateProjectState, validateBreakdownResponse, assertNoVisualDirectionFields };
});
```

`assertNoVisualDirectionFields()` recursively rejects these keys anywhere inside a Breakdown response: `camera`, `color`, `space`, `line`, `texture`, `rhythm`, `shot`, `shotSize`, `lens`, `lighting`, `composition`, `editRhythm`, `visualStyle`, `style`, `sceneState`, `sceneStatePatch`, `variables`.

`createEmptySceneRecord()` creates `workspace.sceneState = null`, `workspace.narrativeState = null`, `workspace.sequenceState = null` and `status.visual = 'undirected'`; it must not pretend runtime defaults are direction.

- [ ] **Step 4: Run GREEN**

```bash
node visual-direction-os/project-contracts.test.js
node --check visual-direction-os/project-contracts.js
```

Expected: test prints `project-contracts.test.js passed` and syntax check exits 0.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/project-contracts.js visual-direction-os/project-contracts.test.js
git commit -m "feat: add project contracts"
```

---

### Task 2: Build clone-safe Project Store and explicit proposal confirmation boundary

**Files:**
- Create: `visual-direction-os/project-state.test.js`
- Create: `visual-direction-os/project-state.js`

**Interfaces:**
- Consumes: `VDOSProjectContracts.createEmptySceneRecord`, `validateSceneRecord`, `validateProjectState`.
- Produces `createProjectStore(initial?)` with methods:
  - `getProject()`
  - `subscribe(listener)`
  - `createProject(input)`
  - `addScene(sceneInput, options?)`
  - `updateScene(sceneId, patch)`
  - `removeScene(sceneId)`
  - `reorderScenes(sceneIds)`
  - `setActiveScene(sceneId)`
  - `saveSceneSnapshot(sceneId, snapshot)`
  - `confirmBreakdown(draft)`
- `confirmBreakdown()` is the only Task-2 path that transforms a Breakdown Draft into canonical SceneRecords.

- [ ] **Step 1: Write failing Store test**

```js
const assert = require('assert');
const { createProjectStore } = require('./project-state.js');

const store = createProjectStore();
store.createProject({ id:'project-1', title:'Film', projectIntent:'Recover agency', sourceNarrative:'story' });
assert.deepEqual(store.getProject().sceneOrder, []);

const draft = {
  status: 'proposal',
  proposedScenes: [
    { id:'proposal-1', title:'Compliance', role:'setup', narrativeFunction:'Establish order.', startingState:'Order accepted.', endingState:'Task accepted.', turningPoint:'Task binds.', agencyTransition:['world','world'], relationToPrevious:null, sourceBasis:'opening', breakBasis:'first state' },
    { id:'proposal-2', title:'Refusal', role:'rupture', narrativeFunction:'Recognition becomes refusal.', startingState:'Pressure.', endingState:'Open refusal.', turningPoint:'Control is recognized.', agencyTransition:['contested','character'], relationToPrevious:'Recognition becomes action.', sourceBasis:'refusal', breakBasis:'agency changes' }
  ]
};
assert.equal(store.getProject().sceneOrder.length, 0, 'proposal must not mutate project');
store.confirmBreakdown(draft);
assert.deepEqual(store.getProject().sceneOrder, ['scene-01','scene-02']);

const external = store.getProject();
external.scenes['scene-01'].narrativeRole.endingState = 'MUTATED OUTSIDE';
assert.notEqual(store.getProject().scenes['scene-01'].narrativeRole.endingState, 'MUTATED OUTSIDE');

store.saveSceneSnapshot('scene-01', { sceneState:{ variables:{ camera:{ perspective:'world' } } }, narrativeState:{ stage:'input' }, sequenceState:null });
store.saveSceneSnapshot('scene-02', { sceneState:{ variables:{ camera:{ perspective:'character' } } }, narrativeState:{ stage:'input' }, sequenceState:null });
const p = store.getProject();
p.scenes['scene-02'].workspace.sceneState.variables.camera.perspective = 'mixed';
assert.equal(store.getProject().scenes['scene-01'].workspace.sceneState.variables.camera.perspective, 'world');
assert.equal(store.getProject().scenes['scene-02'].workspace.sceneState.variables.camera.perspective, 'character');
console.log('project-state.test.js passed');
```

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/project-state.test.js
```

Expected: missing `project-state.js`.

- [ ] **Step 3: Implement Store**

Use private `state`, `clone()` on every external read/write, normalized order numbering after add/remove/reorder, and subscriber snapshots. `confirmBreakdown()` converts proposal IDs into stable `scene-01`, `scene-02`, ... IDs in current proposal order and creates fresh undirected SceneRecords.

`saveSceneSnapshot(sceneId, snapshot)` accepts only these workspace keys:

```js
{
  narrativeState: snapshot.narrativeState ?? null,
  sceneState: snapshot.sceneState ?? null,
  sequenceState: snapshot.sequenceState ?? null
}
```

It must not change `status.visual` merely because a Scene State object exists. Visual status is changed only by an explicit status update / integration event.

- [ ] **Step 4: Run GREEN**

```bash
node visual-direction-os/project-contracts.test.js
node visual-direction-os/project-state.test.js
node --check visual-direction-os/project-state.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/project-state.js visual-direction-os/project-state.test.js
git commit -m "feat: add multi-scene project store"
```

---

### Task 3: Derive Project Arc without leaking technical defaults

**Files:**
- Create: `visual-direction-os/project-arc.test.js`
- Create: `visual-direction-os/project-arc.js`

**Interfaces:**
- Consumes: canonical Project snapshot.
- Produces `deriveProjectArc(projectState)`.
- Produces deterministic helpers `deriveSpatialPressure(sceneState)`, `deriveGraphicDensity(sceneState)`, `deriveRhythmicEnergy(sceneState)` for direct unit testing.
- Output per Scene includes `narrativeRole`, `narrativeAgency`, `visualAgency`, `cameraAuthority`, `colorTerritory`, `spatialPressure`, `graphicDensity`, `rhythmicEnergy`.

- [ ] **Step 1: Write failing derivation test**

```js
const assert = require('assert');
const { deriveProjectArc } = require('./project-arc.js');

const project = {
  sceneOrder:['scene-01','scene-02'],
  scenes:{
    'scene-01':{
      id:'scene-01', title:'Compliance',
      narrativeRole:{ role:'setup', agencyTransition:['world','world'] },
      status:{ visual:'directed' },
      workspace:{ sceneState:{ agency:'world', variables:{
        camera:{ perspective:'world' }, color:{ territory:'world' },
        space:{ compression:'low', openness:'high', negativeSpace:'medium' },
        line:{ density:'low' }, texture:{ noise:'low', granularity:'low' },
        rhythm:{ motionEnergy:'low', cutDensity:'low', repetition:'stable' }
      } } }
    },
    'scene-02':{
      id:'scene-02', title:'Refusal',
      narrativeRole:{ role:'rupture', agencyTransition:['contested','character'] },
      status:{ visual:'undirected' },
      workspace:{ sceneState:{ agency:'character', variables:{ camera:{ perspective:'character' }, color:{ territory:'character' } } } }
    }
  }
};
const arc = deriveProjectArc(project);
assert.equal(arc.scenes[0].cameraAuthority, 'WORLD');
assert.equal(arc.scenes[0].spatialPressure, 'LOW');
assert.equal(arc.scenes[1].narrativeRole, 'RUPTURE');
assert.equal(arc.scenes[1].cameraAuthority, null, 'undirected technical state must be hidden');
assert.equal(arc.scenes[1].visualAgency, null);
console.log('project-arc.test.js passed');
```

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/project-arc.test.js
```

Expected: missing module.

- [ ] **Step 3: Implement deterministic semantic compression**

Rules:

```js
camera.perspective: world → WORLD, mixed → CONTESTED, character → CHARACTER
color.territory: world → WORLD, contested/mixed/shared → CONTESTED, character → CHARACTER
```

Spatial pressure:
- compression `high` → `HIGH`
- compression `medium` → `MEDIUM`
- compression `low` + openness `low` → `MEDIUM`
- compression `low` + openness `medium|high` → `LOW`
- otherwise `MEDIUM`

Graphic density maps `low=0`, `medium=1`, `high=2` for line density, texture noise, texture granularity; average `<0.67 → LOW`, `<1.34 → MEDIUM`, otherwise `HIGH`.

Rhythmic energy maps motion energy and cut density with the same 0/1/2 scale; repetition `unstable|irregular|fragmented` contributes 2, `building|variable|medium` contributes 1, otherwise 0; use the same thresholds.

If `status.visual !== 'directed'`, every visual semantic field is `null` regardless of `workspace.sceneState` content.

- [ ] **Step 4: Run GREEN**

```bash
node visual-direction-os/project-arc.test.js
node --check visual-direction-os/project-arc.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/project-arc.js visual-direction-os/project-arc.test.js
git commit -m "feat: derive project visual arc"
```

---

### Task 4: Add deterministic Cross-Scene Continuity

**Files:**
- Create: `visual-direction-os/project-continuity.test.js`
- Create: `visual-direction-os/project-continuity.js`

**Interfaces:**
- Consumes: Project snapshot and `deriveProjectArc()` output.
- Produces `deriveContinuity(projectState)` returning `{ status, findings }`.
- Each finding has `{ id, status, rule, sceneIds, boundary, title, detail }`.
- Never mutates Project or Scene input.

- [ ] **Step 1: Write failing continuity test**

```js
const assert = require('assert');
const { deriveContinuity } = require('./project-continuity.js');
const project = {
  sceneOrder:['scene-01','scene-02','scene-03'],
  scenes:{
    'scene-01':{ id:'scene-01', title:'Compliance', narrativeRole:{ role:'setup', agencyTransition:['world','world'] }, status:{visual:'directed'}, workspace:{sceneState:{agency:'world',variables:{camera:{perspective:'world'},color:{territory:'world'},space:{compression:'low',openness:'high'},line:{density:'low'},texture:{noise:'low',granularity:'low'},rhythm:{motionEnergy:'low',cutDensity:'low',repetition:'stable'}}}} },
    'scene-02':{ id:'scene-02', title:'Recognition', narrativeRole:{ role:'recognition', agencyTransition:['world','contested'] }, status:{visual:'directed'}, workspace:{sceneState:{agency:'world',variables:{camera:{perspective:'character'},color:{territory:'world'},space:{compression:'low',openness:'high'},line:{density:'low'},texture:{noise:'low',granularity:'low'},rhythm:{motionEnergy:'low',cutDensity:'low',repetition:'stable'}}}} },
    'scene-03':{ id:'scene-03', title:'Refusal', narrativeRole:{ role:'rupture', agencyTransition:['contested','character'] }, status:{visual:'undirected'}, workspace:{sceneState:null} }
  }
};
const before = JSON.stringify(project);
const result = deriveContinuity(project);
assert.ok(result.findings.some(f => f.rule === 'agency-alignment' && f.status === 'WARN'));
assert.ok(result.findings.some(f => f.rule === 'unresolved-scene' && f.sceneIds.includes('scene-03')));
assert.equal(JSON.stringify(project), before, 'diagnostics must not mutate project');
console.log('project-continuity.test.js passed');
```

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/project-continuity.test.js
```

Expected: missing module.

- [ ] **Step 3: Implement the five v1 rule families**

Implement exactly:

1. `agency-alignment`
2. `change-without-narrative-cause`
3. `rupture-without-visual-response`
4. `simultaneous-maximum-escalation`
5. `unresolved-scene`

Boundary comparisons use adjacent Scene IDs only. A large visual change is not itself a warning; it requires lack of corresponding narrative transition for rule 2. Rule 4 fires when at least four of Camera, Color, Spatial Pressure, Graphic Density, Rhythmic Energy make a maximum categorical jump at the same boundary.

Overall status uses precedence `FAIL > WARN > UNRESOLVED > PASS`, but an unresolved later Scene must not erase an existing WARN.

- [ ] **Step 4: Run GREEN**

```bash
node visual-direction-os/project-arc.test.js
node visual-direction-os/project-continuity.test.js
node --check visual-direction-os/project-continuity.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/project-continuity.js visual-direction-os/project-continuity.test.js
git commit -m "feat: add cross-scene continuity diagnostics"
```

---

### Task 5: Build isolated Breakdown Draft editing and stale-request safety

**Files:**
- Create: `visual-direction-os/project-breakdown-fixtures.js`
- Create: `visual-direction-os/project-breakdown-state.test.js`
- Create: `visual-direction-os/project-breakdown-state.js`

**Interfaces:**
- Consumes: `VDOSProjectContracts.validateBreakdownResponse`.
- Produces `createProjectBreakdownState(initial?)` with:
  - `getState()`
  - `subscribe(listener)`
  - `setInput(sourceNarrative, directorIntent)`
  - `beginRequest()`
  - `acceptResponse(token, payload)`
  - `failRequest(token, error)`
  - `editProjectReadingField(key, value)`
  - `editSceneField(sceneId, key, value)`
  - `addScene(scene, index?)`
  - `removeScene(sceneId)`
  - `reorderScenes(ids)`
  - `splitScene(sceneId, children)`
  - `mergeScenes(firstId, secondId, merged)`
- Does not import or invoke `project-state.js`.

- [ ] **Step 1: Create explicit demo fixture**

Fixture exports one Project Reading and four scenes: `COMPLIANCE`, `RECOGNITION`, `REFUSAL`, `EXIT`, with semantic roles `setup`, `recognition`, `rupture`, `resolution` and agency progression `world → world → contested → character`.

The fixture contains no visual-direction field names prohibited by Task 1.

- [ ] **Step 2: Write failing Draft test**

```js
const assert = require('assert');
const fixture = require('./project-breakdown-fixtures.js');
const { createProjectBreakdownState } = require('./project-breakdown-state.js');
const draft = createProjectBreakdownState();
draft.setInput('story', 'End with reclaimed agency.');
const stale = draft.beginRequest();
const current = draft.beginRequest();
assert.equal(draft.acceptResponse(stale, fixture.breakdown), false);
assert.equal(draft.acceptResponse(current, fixture.breakdown), true);
assert.equal(draft.getState().proposedScenes.length, 4);

draft.editSceneField('proposal-scene-03', 'endingState', 'The refusal becomes public.');
assert.equal(draft.getState().proposedScenes[2].directorEdits.endingState, true);

draft.splitScene('proposal-scene-02', [
  { ...draft.getState().proposedScenes[1], id:'proposal-scene-02a', title:'Recognition' },
  { ...draft.getState().proposedScenes[1], id:'proposal-scene-02b', title:'Hesitation', role:'pressure' }
]);
assert.equal(draft.getState().proposedScenes.length, 5);
assert.throws(() => draft.mergeScenes('proposal-scene-01','proposal-scene-03',{ id:'merged' }), /adjacent/i);
console.log('project-breakdown-state.test.js passed');
```

- [ ] **Step 3: Run RED**

```bash
node visual-direction-os/project-breakdown-state.test.js
```

Expected: missing state module.

- [ ] **Step 4: Implement Draft state machine**

Use request `{ status:'idle', token:0, error:null }`. `beginRequest()` increments token; stale `acceptResponse()` returns `false` without mutation. `editSceneField()` supports exactly the Project Scene proposal fields and records `directorEdits[key] = true`. `mergeScenes()` checks current list adjacency. All returned state is cloned.

- [ ] **Step 5: Run GREEN and commit**

```bash
node visual-direction-os/project-contracts.test.js
node visual-direction-os/project-breakdown-state.test.js
node --check visual-direction-os/project-breakdown-state.js
node --check visual-direction-os/project-breakdown-fixtures.js
git add visual-direction-os/project-breakdown-fixtures.js visual-direction-os/project-breakdown-state.js visual-direction-os/project-breakdown-state.test.js
git commit -m "feat: add project breakdown draft"
```

---

### Task 6: Add Project Breakdown HTTP client and server contract boundary

**Files:**
- Create: `visual-direction-os/project-breakdown-api-client.test.js`
- Create: `visual-direction-os/project-breakdown-api-client.js`
- Create: `api/project/_contracts.js`
- Create: `api/project/_prompts.js`
- Create: `api/project/_handler.test.js`
- Create: `api/project/_handler.js`
- Create: `api/project/breakdown.js`

**Interfaces:**
- Browser: `createProjectBreakdownApiClient({ baseUrl, fetchImpl, timeoutMs })` with `breakdown(payload, options?)`.
- Server: `handleProjectBreakdownRequest(req, res, dependencies?)`.
- Server reuses the existing Narrative OpenAI adapter rather than duplicating provider transport.

- [ ] **Step 1: Write failing browser client test**

```js
const assert = require('assert');
const fixture = require('./project-breakdown-fixtures.js');
const { createProjectBreakdownApiClient } = require('./project-breakdown-api-client.js');
let captured;
const client = createProjectBreakdownApiClient({
  baseUrl:'https://api.example.test',
  fetchImpl: async (url, init) => {
    captured = { url, init };
    return { ok:true, json:async () => fixture.breakdown };
  }
});
(async () => {
  const result = await client.breakdown({ sourceNarrative:'story', directorIntent:'intent' });
  assert.equal(captured.url, 'https://api.example.test/api/project/breakdown');
  assert.equal(JSON.parse(captured.init.body).sourceNarrative, 'story');
  assert.equal(result.scenes.length, 4);
  console.log('project-breakdown-api-client.test.js passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
```

- [ ] **Step 2: Run browser-client RED**

```bash
node visual-direction-os/project-breakdown-api-client.test.js
```

Expected: missing client module.

- [ ] **Step 3: Implement browser client and run GREEN**

The client POSTs JSON to `/api/project/breakdown`, forwards optional `signal`, validates successful JSON with `validateBreakdownResponse`, throws structured errors on configuration/network/schema failures, and never silently falls back to fixtures.

Run:

```bash
node visual-direction-os/project-breakdown-api-client.test.js
node --check visual-direction-os/project-breakdown-api-client.js
```

- [ ] **Step 4: Write failing server handler test**

The test stubs the provider boundary only, sends a POST body with source narrative / optional Director Intent, and asserts:

```js
assert.equal(providerCall.store, false);
assert.match(providerCall.instructions, /narrative state transitions/i);
assert.doesNotMatch(providerCall.instructions, /recommend a lens/i);
assert.equal(response.statusCode, 200);
assert.equal(response.body.scenes.length, 4);
```

Also send a provider payload containing `camera` and assert handler returns schema error rather than forwarding it.

- [ ] **Step 5: Run server RED**

```bash
node api/project/_handler.test.js
```

Expected: missing handler module.

- [ ] **Step 6: Implement server boundary**

`api/project/_contracts.js` mirrors the browser Breakdown schema. `_prompts.js` instructs:

> Identify narrative state transitions, not cinematic treatments. Explain why each proposed boundary constitutes a new narrative state. Do not output Camera, Color, Space, Line, Texture, Rhythm, shot, lens, lighting, composition, edit rhythm, visual style, or Scene State values.

`_handler.js` accepts POST only, rejects empty source, invokes the existing OpenAI adapter with a Project Breakdown Structured Output schema and `store:false`, validates the returned domain object, and sends normalized JSON.

- [ ] **Step 7: Run GREEN and commit**

```bash
node api/project/_handler.test.js
node --check api/project/_handler.js
node --check api/project/breakdown.js
node --check api/project/_prompts.js
git add visual-direction-os/project-breakdown-api-client.js visual-direction-os/project-breakdown-api-client.test.js api/project
git commit -m "feat: add project breakdown api"
```

---

### Task 7: Add Project Runtime transaction and prove Scene isolation

**Files:**
- Create: `visual-direction-os/project-runtime.test.js`
- Create: `visual-direction-os/project-runtime.js`
- Modify: `visual-direction-os/narrative-state.js` only if a serialization/restoration method is required; prefer adapter functions in Project Runtime to avoid changing stable Narrative behavior.

**Interfaces:**
- Consumes Project Store, an injected Scene runtime adapter, optional Narrative runtime adapter, optional Sequence runtime adapter.
- Produces `createProjectRuntime({ projectStore, sceneRuntime, narrativeRuntime, sequenceRuntime, abortTransient })`.
- Produces:
  - `captureActiveScene()`
  - `switchScene(sceneId)`
  - `markVisualDirected(sceneId?)`
- `switchScene()` serializes transitions so concurrent switches cannot interleave.

- [ ] **Step 1: Write failing runtime test**

```js
const assert = require('assert');
const { createProjectStore } = require('./project-state.js');
const { createProjectRuntime } = require('./project-runtime.js');
const store = createProjectStore({
  id:'p', title:'Film', projectIntent:'', sourceNarrative:'', sceneOrder:['scene-01','scene-02'], activeSceneId:'scene-01',
  scenes:{
    'scene-01':{ id:'scene-01',order:1,title:'A',narrativeRole:{role:'setup',narrativeFunction:'a',startingState:'a',endingState:'a',turningPoint:'a',agencyTransition:['world','world'],relationToPrevious:null},workspace:{sceneState:{agency:'world',variables:{camera:{perspective:'world'}}},narrativeState:{stage:'input'},sequenceState:null},status:{narrative:'defined',visual:'directed',continuity:'unresolved'} },
    'scene-02':{ id:'scene-02',order:2,title:'B',narrativeRole:{role:'rupture',narrativeFunction:'b',startingState:'b',endingState:'b',turningPoint:'b',agencyTransition:['contested','character'],relationToPrevious:'a'},workspace:{sceneState:{agency:'character',variables:{camera:{perspective:'character'}}},narrativeState:{stage:'input'},sequenceState:null},status:{narrative:'defined',visual:'directed',continuity:'unresolved'} }
  }
});
let liveScene = JSON.parse(JSON.stringify(store.getProject().scenes['scene-01'].workspace.sceneState));
let aborts = 0;
const runtime = createProjectRuntime({
  projectStore:store,
  sceneRuntime:{ getState:()=>JSON.parse(JSON.stringify(liveScene)), restore:s=>{ liveScene=JSON.parse(JSON.stringify(s)); } },
  narrativeRuntime:{ getState:()=>({stage:'input'}), restore:()=>{} },
  sequenceRuntime:{ getState:()=>null, restore:()=>{} },
  abortTransient:()=>{ aborts += 1; }
});
liveScene.variables.camera.perspective = 'mixed';
(async () => {
  await runtime.switchScene('scene-02');
  assert.equal(aborts, 1);
  assert.equal(store.getProject().scenes['scene-01'].workspace.sceneState.variables.camera.perspective, 'mixed');
  assert.equal(liveScene.variables.camera.perspective, 'character');
  liveScene.variables.camera.perspective = 'world';
  assert.equal(store.getProject().scenes['scene-01'].workspace.sceneState.variables.camera.perspective, 'mixed');
  console.log('project-runtime.test.js passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
```

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/project-runtime.test.js
```

Expected: missing runtime module.

- [ ] **Step 3: Implement transaction**

`switchScene(targetId)`:

1. no-op if target already active after still capturing stable state only when explicitly requested;
2. validate target exists;
3. capture current Scene / Narrative / Sequence stable states;
4. save snapshot through Project Store;
5. invoke `abortTransient()`;
6. set active Scene in Store;
7. deep-clone target workspace and restore Scene / Narrative / Sequence adapters;
8. notify subscribers with target context.

Use a promise chain / internal switch token so two rapid `switchScene()` calls cannot restore out of order.

- [ ] **Step 4: Run GREEN**

```bash
node visual-direction-os/project-state.test.js
node visual-direction-os/project-runtime.test.js
node --check visual-direction-os/project-runtime.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/project-runtime.js visual-direction-os/project-runtime.test.js
git commit -m "feat: add active scene project runtime"
```

---

### Task 8: Add Project Workspace shell and Breakdown editor UI

**Files:**
- Create: `visual-direction-os/project-workspace.spec.js`
- Create: `visual-direction-os/project-workspace.js`
- Create: `visual-direction-os/project-workspace.css`
- Modify: `visual-direction-os/director-v2.html`
- Modify: `visual-direction-os/director-v2-app.js`

**Interfaces:**
- Project Workspace consumes Project Store, Project Runtime, Breakdown Draft, Project Arc and Continuity APIs.
- It exposes `window.VDOSProjectWorkspace` with `initProjectWorkspace(root, options)`.
- It does not directly mutate nested Project state or Scene state.

- [ ] **Step 1: Write failing Playwright acceptance for Project shell**

Add a browser test using `?narrativeDemo=1&projectDemo=1` and assert:

```js
await expect(page.getByRole('heading', { name:/Project Arc/i })).toBeVisible();
await expect(page.getByText('COMPLIANCE')).toBeVisible();
await expect(page.getByText('REFUSAL')).toBeVisible();
await expect(page.locator('[data-project-arc-row="camera"] [data-scene-id="scene-01"]')).toHaveText('—');
await page.getByRole('button', { name:/Break down story/i }).click();
await expect(page.getByText(/Proposal/i)).toBeVisible();
```

The test also edits a proposal Scene, performs one Split, confirms structure, and asserts the Project Arc has five Scene columns before any visual row is populated.

- [ ] **Step 2: Run RED**

Run the local server and focused browser test:

```bash
python3 -m http.server 4173 --directory visual-direction-os
npx -y playwright@1.55.0 test visual-direction-os/project-workspace.spec.js --reporter=line --workers=1
```

Expected: Project workspace selectors / controls do not exist.

- [ ] **Step 3: Add Project shell markup and style**

Add a Project context region above the existing mode workspaces, not into the mode rail. First-version regions:

```html
<section id="project-workspace" class="project-workspace" aria-labelledby="project-title">
  <header class="project-header">...</header>
  <div class="project-scene-rail" aria-label="Scene structure">...</div>
  <section class="project-arc" aria-labelledby="project-arc-title">...</section>
  <section class="project-continuity" aria-labelledby="project-continuity-title">...</section>
</section>
```

Use the existing typography system: serif for directing decisions / scene titles, clean sans for readable content, mono only for system metadata. Display-copy headings omit terminal periods; explanatory prose keeps normal punctuation.

- [ ] **Step 4: Implement Workspace controller**

Required UI states:

- implicit single-scene Project
- empty Project
- Breakdown input
- Breakdown proposal
- confirmed Project Arc
- active Scene context

Required Breakdown actions:

- edit
- add
- split
- merge adjacent
- remove
- reorder through explicit move-left / move-right controls in v1 browser acceptance; drag-and-drop may be progressive enhancement rather than the only accessible mechanism
- confirm structure

All proposal mutation calls Breakdown Draft only. `Confirm Scene Structure` calls Project Store `confirmBreakdown()` exactly once.

- [ ] **Step 5: Run focused browser GREEN**

```bash
npx -y playwright@1.55.0 test visual-direction-os/project-workspace.spec.js --reporter=line --workers=1
```

Expected: focused Project acceptance passes.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/project-workspace.js visual-direction-os/project-workspace.css visual-direction-os/project-workspace.spec.js visual-direction-os/director-v2.html visual-direction-os/director-v2-app.js
git commit -m "feat: add project workspace shell"
```

---

### Task 9: Integrate Scene Context, Narrative Project Context, Apply propagation and Next Scene

**Files:**
- Extend: `visual-direction-os/project-workspace.spec.js`
- Modify: `visual-direction-os/narrative-contracts.js`
- Modify: `visual-direction-os/narrative-api-client.js`
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-apply.js`
- Modify: `visual-direction-os/director-v2-app.js`
- Modify: `api/narrative/_contracts.js`
- Modify: `api/narrative/_prompts.js`
- Modify: `api/narrative/_handler.test.js`

**Interfaces:**
- Narrative Interpret request gains optional `projectContext`.
- Project Context shape is `{ projectIntent, sceneRole, narrativeFunction, startingState, endingState, agencyTransition }`.
- Narrative provider prompt treats Project Context as upstream intent, not confirmed truth.
- Successful Narrative Apply triggers Project Runtime capture and marks only the active Scene `status.visual = 'directed'`.

- [ ] **Step 1: Extend browser test first**

Acceptance sequence:

```text
Confirm five-scene structure
→ Open Scene 01
→ see Project Context in Narrative
→ use explicit Narrative demo fixture
→ complete existing Reading / Strategy / Sequence / Apply
→ return Project Arc
→ Scene 01 visual values are populated
→ Scene 02 visual values remain —
→ open Scene 02
→ modify camera / agency
→ Next Scene / Project Arc round trip
→ return Scene 01
→ Scene 01 values remain unchanged
```

Also assert Scene Context Bar renders Project title, current Scene title, position `01 / 05`, `PROJECT ARC`, and `NEXT SCENE` controls.

- [ ] **Step 2: Run RED**

```bash
npx -y playwright@1.55.0 test visual-direction-os/project-workspace.spec.js --reporter=line --workers=1
```

Expected: Project Context / Apply propagation expectations fail.

- [ ] **Step 3: Add optional Project Context contract**

Allow optional `projectContext` on Interpret requests only. Validation accepts known keys and rejects unknown Project visual fields. Server prompt includes:

> Project Context describes upstream project intent. Compare it with the actual Scene Description; do not treat it as confirmed scene truth. If they diverge, preserve the divergence in the Narrative Reading rather than forcing alignment.

- [ ] **Step 4: Wire Scene Context Bar and Runtime switching**

Project Workspace calls `ProjectRuntime.switchScene()` for Open Scene / Previous / Next actions. It does not call `VDOSScene.createSceneState()` directly for switching.

- [ ] **Step 5: Wire Apply propagation**

After existing Narrative Apply succeeds, call a small integration hook such as:

```js
window.dispatchEvent(new CustomEvent('vdos:narrative-applied', { detail:{ source:'narrative' } }));
```

Project integration listens only when a Project Runtime exists, captures the active workspace, and marks that Scene directed. Existing single-scene mode remains unaffected when no Project runtime is installed.

Manual DIRECT control changes may set `visual = 'in-progress'`; explicit Narrative Apply marks `directed`. Do not globally mark every technical Scene initialization as directed.

- [ ] **Step 6: Run GREEN**

```bash
node api/narrative/_handler.test.js
node visual-direction-os/narrative-contracts.test.js
node visual-direction-os/project-state.test.js
node visual-direction-os/project-runtime.test.js
npx -y playwright@1.55.0 test visual-direction-os/project-workspace.spec.js --reporter=line --workers=1
```

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/project-workspace.spec.js visual-direction-os/narrative-contracts.js visual-direction-os/narrative-api-client.js visual-direction-os/narrative-workspace.js visual-direction-os/narrative-apply.js visual-direction-os/director-v2-app.js api/narrative
git commit -m "feat: connect project context to scene direction"
```

---

### Task 10: Add Continuity routing UI and project-scale visual polish

**Files:**
- Extend: `visual-direction-os/project-workspace.spec.js`
- Modify: `visual-direction-os/project-workspace.js`
- Modify: `visual-direction-os/project-workspace.css`

**Interfaces:**
- Continuity cards render structured findings from `deriveContinuity()`.
- Each finding may provide `OPEN SCENE`, `OPEN SCENE A`, `OPEN SCENE B`, or `COMPARE` controls based on `sceneIds`.
- UI never supplies an Auto Fix action.

- [ ] **Step 1: Add failing browser assertions**

After directing two Scenes with a deliberate camera/agency mismatch, assert a continuity finding identifies the `S01 → S02` boundary, displays `WARN`, and provides controls that open the implicated Scenes. Assert the DOM contains no button matching `/auto.?fix|fix automatically/i`.

- [ ] **Step 2: Run RED**

```bash
npx -y playwright@1.55.0 test visual-direction-os/project-workspace.spec.js --reporter=line --workers=1
```

- [ ] **Step 3: Render Continuity and semantic Arc**

Render Arc cells from `deriveProjectArc()` only. Render undirected visual cells as `—`. Render Continuity findings with concise cause / response language and Scene boundary metadata. Keep detailed raw Scene State behind contextual detail, not in the primary matrix.

- [ ] **Step 4: Accessibility and responsive behavior**

- Project Arc may horizontally scroll inside its own container on narrow screens; page-level horizontal overflow is forbidden.
- Scene columns remain keyboard reachable.
- Move-left / move-right structure controls have accessible names.
- reduced-motion removes decorative motion without removing status / transition information.
- Project Context Bar remains usable at 390 / 768 / 1024 / 1440 widths.

- [ ] **Step 5: Run GREEN and commit**

```bash
npx -y playwright@1.55.0 test visual-direction-os/project-workspace.spec.js --reporter=line --workers=1
git add visual-direction-os/project-workspace.js visual-direction-os/project-workspace.css visual-direction-os/project-workspace.spec.js
git commit -m "feat: add project continuity workspace"
```

---

### Task 11: Add CI coverage, source guards, README and full regression verification

**Files:**
- Modify: `.github/workflows/director-v2-ci.yml`
- Modify: `README.md`
- Modify existing source / publish tests only where required to include the new Project modules.

**Interfaces:**
- CI runs all new Node tests and `project-workspace.spec.js` in the browser acceptance command.
- Pages assembly copies every Project browser module required by `director-v2.html`.

- [ ] **Step 1: Add a failing CI/source contract before workflow edits**

Extend an existing publish/source test or create a small Node source contract that asserts:

```js
const html = fs.readFileSync('visual-direction-os/director-v2.html','utf8');
for (const asset of ['project-contracts.js','project-state.js','project-runtime.js','project-arc.js','project-continuity.js','project-breakdown-state.js','project-workspace.js','project-workspace.css']) {
  assert.ok(html.includes(asset), `${asset} must be loaded by director-v2.html`);
}
```

Also assert the CI workflow text includes all new Node tests and `visual-direction-os/project-workspace.spec.js`.

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/site-publish.test.js
```

Expected: workflow/source coverage assertion fails before workflow update.

- [ ] **Step 3: Update CI and documentation**

Add Node test commands for:

```text
project-contracts.test.js
project-state.test.js
project-arc.test.js
project-continuity.test.js
project-breakdown-state.test.js
project-breakdown-api-client.test.js
project-runtime.test.js
api/project/_handler.test.js
```

Add `project-workspace.spec.js` to the existing Playwright command. Update README with Project / Multi-Scene architecture, Project Breakdown API and explicit statement that production API credentials remain server-side.

- [ ] **Step 4: Run complete local verification**

Run all Project Node tests, all pre-existing model / Narrative tests listed in CI, syntax checks for all modified JS, source/publish tests, then the full Playwright acceptance list exactly as CI declares it.

Expected: 0 failing commands, no console errors in representative Project and single-scene flows.

- [ ] **Step 5: Fresh GitHub verification**

Push the branch and verify the exact resulting HEAD SHA. If the connector can expose the current push-triggered Actions result, report the run conclusion. If it cannot, do not infer CI success; report local evidence plus the exact verification limitation.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/director-v2-ci.yml README.md visual-direction-os
git commit -m "test: cover multi-scene project workflow"
```

---

## Self-Review

### Spec coverage

- Project as context, not fifth mode: Tasks 8–10.
- Single Scene compatibility: Tasks 8–11.
- Project Store / independent snapshots: Tasks 1–2.
- Active Scene transaction and stale isolation: Tasks 5 and 7.
- AI Breakdown boundary / forbidden visual fields: Tasks 1, 5, 6.
- Edit / Add / Split / Merge adjacent / Remove / Reorder / Confirm: Tasks 5 and 8.
- Project Arc seven rows and undirected `—`: Tasks 3, 8, 10.
- Five Continuity rule families and no auto-fix: Tasks 4 and 10.
- Project Context inside Scene Narrative: Task 9.
- Apply propagation / Scene status: Task 9.
- CI / Pages / accessibility / responsive regression: Tasks 10–11.

### Placeholder scan

No implementation task contains `TBD`, `TODO`, `implement later`, or an unspecified generic error-handling step. Every production behavior has a named interface and a RED/GREEN command.

### Type / naming consistency

- `ProjectState.sceneOrder`, `activeSceneId`, `scenes` are used consistently.
- `SceneRecord.workspace` uses `narrativeState`, `sceneState`, `sequenceState` consistently.
- visual status uses `undirected`, `in-progress`, `directed` consistently.
- Project Arc entry point is consistently `deriveProjectArc(projectState)`.
- Continuity entry point is consistently `deriveContinuity(projectState)`.
- Project Breakdown confirmation is consistently `confirmBreakdown(draft)` / UI `CONFIRM SCENE STRUCTURE`.
- Scene switch entry point is consistently `ProjectRuntime.switchScene(sceneId)`.

## Execution Mode

The user already requested direct implementation in the current session. Execute this plan inline with `superpowers:executing-plans`; do not pause for a new execution-mode choice. Preserve the Draft PR and do not merge `master`.
