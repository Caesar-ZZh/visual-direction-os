# M5 Compiler-First Sequence Synthesis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AI-first full Sequence proposal generation with a deterministic compiler-owned Sequence Skeleton plus constrained AI completion, while preserving the existing downstream `sequenceProposal`, M3 audit, M4 Apply-time safety, and explicit Director control.

**Architecture:** The browser compiles a `SequenceSkeleton` from the confirmed Reading, selected Strategy, and resolved Visual IR before any Sequence network call. The API returns only a `sequenceCompletion`; both server and browser validate the completion against the exact dynamic Skeleton, and the browser assembles the canonical `sequenceProposal` by merging AI-open fields with compiler-derived supported fields. Legacy `sequenceProposal` remains compatible through the existing M3/M4 path.

**Tech Stack:** Vanilla JavaScript UMD modules, Node `node:test`/assert tests, Playwright browser acceptance, Vercel-style Node API handlers, JSON Schema for static response shape plus semantic validation for dynamic Skeleton ownership.

**Spec:** `docs/superpowers/specs/2026-08-21-m5-compiler-first-sequence-synthesis-design.md`

## Global Constraints

- Keep `phase2/director-intelligence-m0` isolated; PR #4 remains Draft against `integration/director-workspace-v2-1`.
- Do not merge into `integration/director-workspace-v2-1` or `master` without explicit product approval.
- Canonical beat order remains exactly `setup`, `pressure`, `rupture`, `release`, `new-ownership`.
- `sequenceProposal` remains the downstream compatibility artifact consumed by `narrative-apply.js`, Sequence Director, Project runtime, and Scene State.
- AI must never validly write compiler-owned or blocked patch paths.
- `partial`, `blocked`, latent, and unresolved claims never become exact compiler values.
- Do not infer exact Space intensity from Spatial Authorship, Texture as Medium, Line as Boundary/Edge, or numerical temporal cadence.
- M3 must retain raw-model audit semantics; M4 remains the Apply-time safety boundary.
- No Scene State or Sequence mutation before explicit **Apply to Director**.
- Manual DIRECT edits remain available after Apply.

---

### Task 1: Deterministic Sequence Skeleton Compiler

**Files:**
- Create: `visual-direction-os/visual-sequence-skeleton.js`
- Create: `visual-direction-os/visual-sequence-skeleton.test.js`

**Interfaces:**
- Consumes: `confirmedReading.agencyTransition.value`, selected Strategy hierarchy, `visualIR.grammar`, and the canonical patch vocabulary from `narrative-contracts.js`.
- Produces: `compileSequenceSkeleton({ confirmedReading, selectedStrategy, visualIR })`, `normalizeAgencyPath(path)`, and `validateSkeleton(skeleton)`.

- [ ] **Step 1: Write the failing Skeleton tests**

Cover these exact behaviors:

```js
const assert = require('node:assert/strict');
const { test } = require('node:test');
const skeleton = require('./visual-sequence-skeleton.js');

test('normalizes adjacent agency duplicates but preserves distinct shared/contested states', () => {
  assert.deepEqual(
    skeleton.normalizeAgencyPath(['world','world','contested','shared','character']),
    ['world','contested','shared','character']
  );
});

test('compiles five canonical beats and compiler-owned strategy hierarchy', () => {
  const result = skeleton.compileSequenceSkeleton({ confirmedReading, selectedStrategy, visualIR });
  assert.deepEqual(result.beats.map(beat => beat.id), ['setup','pressure','rupture','release','new-ownership']);
  assert.equal(result.beats[0].structure.primaryVariable, selectedStrategy.primaryVariable);
  assert.deepEqual(result.beats[0].structure.restrainedVariables, selectedStrategy.restrainedVariables);
});

test('camera authority claims camera.perspective as derived compiler-owned and leaves legal unclaimed paths open', () => {
  const result = skeleton.compileSequenceSkeleton({ confirmedReading, selectedStrategy: cameraStrategy, visualIR: cameraIR });
  assert.equal(result.beats[2].patchSlots['camera.perspective'].status, 'compiler-derived');
  assert.equal(result.beats[2].patchSlots['camera.perspective'].derivation, 'agency->camera.perspective');
  assert.equal(result.beats[2].patchSlots['camera.distance'].status, 'open');
});

test('spatial authorship blocks exact space fields and does not promote partial camera mapping to exact ownership', () => {
  const result = skeleton.compileSequenceSkeleton({ confirmedReading, selectedStrategy: spaceStrategy, visualIR: spaceIR });
  assert.equal(result.beats[2].patchSlots['space.compression'].status, 'blocked');
  assert.equal(result.beats[2].patchSlots['camera.perspective'].status, 'blocked');
});
```

- [ ] **Step 2: Run the Skeleton tests and verify RED**

Run:

```bash
node --test visual-direction-os/visual-sequence-skeleton.test.js
```

Expected: failure because `visual-sequence-skeleton.js` or `compileSequenceSkeleton` does not exist.

- [ ] **Step 3: Implement the minimal Skeleton compiler**

Use these constants and rules:

```js
const BEATS = [
  ['setup','SETUP'],
  ['pressure','PRESSURE'],
  ['rupture','RUPTURE'],
  ['release','RELEASE'],
  ['new-ownership','NEW OWNERSHIP']
];

const PATCH_PATHS = [
  'ownership.character','ownership.world','ownership.narrative',
  'color.temperature','color.saturation','color.contrast','color.territory',
  'space.depth','space.compression','space.openness','space.negativeSpace',
  'camera.distance','camera.stability','camera.perspective','camera.movement',
  'line.stability','line.density','line.direction',
  'texture.noise','texture.granularity','texture.materiality',
  'rhythm.cutDensity','rhythm.motionEnergy','rhythm.repetition'
];
```

Skeleton rules:

- normalize adjacent duplicate agency states;
- reject fewer than two valid states after normalization;
- `SETUP` agency slot is fixed to the first state;
- `NEW OWNERSHIP` agency slot is fixed to the last state;
- intermediate agency slots expose the normalized ordered path but no fixed state;
- every beat copies Strategy Primary/Supporting/Restrained arrays into compiler-owned `structure`;
- `camera-authority-transfer` marks `camera.perspective` `compiler-derived` with derivation `agency->camera.perspective`;
- `color-ownership-transfer` marks `color.territory` `compiler-derived` with derivation `agency->color.territory`;
- `agency-ownership-transfer` treats top-level agency as compiler assembly output after completion validation;
- `spatial-authorship` blocks all canonical `space.*` plus `camera.perspective` because the current camera expectation is partial without a finite exact allowed set;
- `surface-assignment` does not create a noncanonical `texture.surfaceOwnership` open slot; canonical texture fields remain AI-open unless separately blocked by a canonical rule;
- unresolved grammar claims no grammar-owned patch path and records `grammarStatus: 'unresolved'`.

- [ ] **Step 4: Run Skeleton tests and verify GREEN**

Run:

```bash
node --test visual-direction-os/visual-sequence-skeleton.test.js
node --test visual-direction-os/visual-compiler.test.js
```

Expected: all pass.

- [ ] **Step 5: Commit Task 1**

Commit message:

```text
feat: add compiler-first sequence skeleton
```

---

### Task 2: Completion Validator and Deterministic Assembler

**Files:**
- Create: `visual-direction-os/visual-sequence-completion.js`
- Create: `visual-direction-os/visual-sequence-completion.test.js`

**Interfaces:**
- Consumes: Task 1 `SequenceSkeleton`, raw `{ sequenceCompletion: { beats } }`, existing `VDOSVisualCompiler.compileBeatExpectations()`, and `VDOSNarrativeContracts.validateSceneStatePatch()`.
- Produces: `validateSequenceCompletion({ skeleton, completion })`, `assembleSequenceProposal({ skeleton, completion, visualIR })`, `flattenOpenPatch(openPatch)`, `setPatchPath(patch,path,value)`.

- [ ] **Step 1: Write failing validation tests**

Test structured error codes for:

```text
BEAT_COUNT_MISMATCH
BEAT_ID_MISMATCH
AGENCY_OUTSIDE_CONFIRMED_PATH
AGENCY_REGRESSION
FINAL_AGENCY_NOT_REACHED
COMPILER_OWNED_FIELD_WRITE
BLOCKED_FIELD_WRITE
UNDECLARED_OPEN_FIELD_WRITE
INVALID_VISUAL_EVENT
INVALID_SCENE_STATE_VALUE
```

Use a valid completion shaped as:

```js
{
  sequenceCompletion: {
    beats: [
      { id:'setup', narrativeBeat:'Establish world control.', agency:'world', visualEvents:['hold'], rationale:'World owns the setup.', openPatch:{ variables:{ camera:{ distance:'wide' } } } },
      { id:'pressure', narrativeBeat:'Pressure increases.', agency:'world', visualEvents:['tighten'], rationale:'Pressure rises without transfer.', openPatch:{} },
      { id:'rupture', narrativeBeat:'Control becomes contestable.', agency:'contested', visualEvents:['break'], rationale:'Authority splits.', openPatch:{} },
      { id:'release', narrativeBeat:'Character acts.', agency:'character', visualEvents:['move'], rationale:'Action transfers authorship.', openPatch:{} },
      { id:'new-ownership', narrativeBeat:'Character owns exit.', agency:'character', visualEvents:['resolve'], rationale:'New ownership stabilizes.', openPatch:{} }
    ]
  }
}
```

Explicitly verify a completion that puts `variables.camera.perspective` in `openPatch` under Camera Authority fails as `COMPILER_OWNED_FIELD_WRITE`.

- [ ] **Step 2: Run validation tests and verify RED**

Run:

```bash
node --test visual-direction-os/visual-sequence-completion.test.js
```

Expected: failure because validator/assembler does not exist.

- [ ] **Step 3: Implement validator**

Validation algorithm:

1. require five beats matching Skeleton order;
2. validate agency exists in `skeleton.agencyConstraint.path`;
3. map each agency to its index in the normalized path and reject decreasing indices;
4. require first and last states to equal Skeleton fixed endpoints;
5. flatten `openPatch` paths;
6. for each returned path, look up the corresponding Skeleton beat `patchSlots[path]`;
7. accept only `status === 'open'`;
8. return `COMPILER_OWNED_FIELD_WRITE` for `compiler-owned` or `compiler-derived`;
9. return `BLOCKED_FIELD_WRITE` for `blocked`;
10. return `UNDECLARED_OPEN_FIELD_WRITE` for unknown paths;
11. validate ownership values are `low|medium|high` and variable values are non-empty strings;
12. validate at most three non-empty events.

Return:

```js
{ valid:boolean, errors:[{ code, beatId, path, message }], value?: clonedCompletion }
```

- [ ] **Step 4: Implement assembler tests and minimal assembler**

Assembler rules:

```js
const checked = validateSequenceCompletion({ skeleton, completion });
if (!checked.valid) throw Object.assign(new Error('Invalid sequence completion.'), { code:'SEQUENCE_COMPLETION_INVALID', errors:checked.errors });
```

For each beat:

- start with a deep clone of `openPatch`;
- set top-level `agency` to the validated completion agency;
- call `compileBeatExpectations({ visualIR, beat:{ id,label,agency } })` only after agency validation;
- write only `assertion.status === 'supported'` values to the patch;
- validate final patch through `validateSceneStatePatch()`;
- construct canonical proposal beat using Skeleton label and Strategy hierarchy, never AI-supplied hierarchy;
- construct provenance entries for AI-open and compiler-derived paths.

Return:

```js
{
  sequenceProposal:{ beats:[...] },
  sequenceProvenance:{ origin:'compiler-first', skeletonVersion:skeleton.version, grammarId:skeleton.grammarId, fields:{} },
  rawCompletion: clone(completion)
}
```

- [ ] **Step 5: Run validator/assembler tests and verify GREEN**

Run:

```bash
node --test visual-direction-os/visual-sequence-completion.test.js
node --test visual-direction-os/visual-compiler-authority.test.js
```

Expected: all pass.

- [ ] **Step 6: Commit Task 2**

Commit message:

```text
feat: validate and assemble compiler-first completion
```

---

### Task 3: Browser and Server Completion Contracts

**Files:**
- Modify: `visual-direction-os/narrative-contracts.js`
- Modify: `visual-direction-os/narrative-contracts.test.js`
- Modify: `api/narrative/_contracts.js`
- Create: `api/narrative/_contracts-sequence-completion.test.js`
- Modify: `api/narrative/_handler.js`
- Modify: `api/narrative/_handler.test.js`
- Modify: `api/narrative/_prompts.js`
- Modify: `api/narrative/_prompts.test.js`

**Interfaces:**
- Browser produces `validateSequenceCompletionResponse(value)` for static response shape.
- Server `validateInput('sequence', body)` requires `sequenceSkeleton`.
- Server `validateOutput('sequence', generated, { input })` validates static completion shape and dynamic Skeleton write permissions.

- [ ] **Step 1: Write RED contract tests**

Require the browser static contract:

```js
{
  sequenceCompletion: {
    beats:[{
      id,
      narrativeBeat,
      agency,
      visualEvents,
      rationale,
      openPatch
    }]
  }
}
```

Static schema permits partial `ownership` / `variables` objects in `openPatch`; dynamic path permission is not encoded in JSON Schema.

Server tests must verify:

- Sequence input without `sequenceSkeleton` fails;
- output key is `sequenceCompletion`, not `sequenceProposal`;
- a completion returning a path marked `compiler-derived` by the supplied Skeleton fails semantic validation;
- a valid open path passes;
- `validateOutput('sequence', value, { input: checkedInput.value })` is used by handler.

- [ ] **Step 2: Run contract tests and verify RED**

Run:

```bash
node visual-direction-os/narrative-contracts.test.js
node api/narrative/_contracts-sequence-completion.test.js
node api/narrative/_handler.test.js
node api/narrative/_prompts.test.js
```

Expected: new M5 assertions fail against the AI-first contract.

- [ ] **Step 3: Add browser static completion validator**

Keep `validateSequenceResponse()` unchanged for legacy/downstream assembled proposal validation. Add `validateSequenceCompletionResponse()` and export it. It validates five canonical IDs/order, narrativeBeat, agency, events, rationale, and structurally legal partial `openPatch` values.

- [ ] **Step 4: Replace server Sequence output schema with completion schema**

`OUTPUT_SCHEMAS.sequence` becomes the static `sequenceCompletion` shape. Do not require complete Scene State families.

`validateInput('sequence', body)` must clone and preserve `sequenceSkeleton` after basic object validation.

Add semantic helper:

```js
validateCompletionAgainstSkeleton(value, skeleton)
```

It rejects returned patch paths unless the exact beat slot has `status === 'open'`.

- [ ] **Step 5: Pass checked Sequence input into server output validation**

Change handler call from:

```js
validateOutput(stage, generated)
```

to:

```js
validateOutput(stage, generated, { input: checkedInput.value })
```

Other stages ignore the context argument.

- [ ] **Step 6: Rewrite Sequence prompt for constrained completion**

The prompt must explicitly state:

- Skeleton beat IDs/order are authoritative;
- choose legal agency timing only within supplied Agency Constraint;
- return only `openPatch` fields declared `open`;
- do not return compiler-owned, compiler-derived, constrained, or blocked paths;
- do not return label or Strategy hierarchy;
- return narrative purpose, visual events, rationale, and open patch detail only;
- do not imitate copyrighted styles.

- [ ] **Step 7: Run Task 3 tests and verify GREEN**

Run the four commands from Step 2 plus:

```bash
node api/narrative/_openai-adapter.test.js
```

Expected: all pass.

- [ ] **Step 8: Commit Task 3**

Commit message:

```text
feat: constrain sequence API to compiler skeleton
```

---

### Task 4: Narrative Draft Artifacts and API Client

**Files:**
- Modify: `visual-direction-os/narrative-state.js`
- Modify: `visual-direction-os/narrative-state.test.js`
- Modify: `visual-direction-os/narrative-api-client.js`
- Modify: `visual-direction-os/narrative-api-client.test.js`
- Modify: `visual-direction-os/narrative-demo-fixtures.js`

**Interfaces:**
- Draft state adds `sequenceSkeleton`, `sequenceCompletion`, `sequenceProposal`, `sequenceProvenance`.
- Produces explicit methods `setSequenceSkeleton(skeleton)` and `setSequenceCompletionResult({ completion, proposal, provenance })`.
- API client validates live/demo `sequence` responses with `validateSequenceCompletionResponse()`.

- [ ] **Step 1: Write state invalidation RED tests**

Verify:

- initial M5 artifacts are null;
- changing input/confirmed Reading/selected Strategy clears all four artifacts;
- `setSequenceSkeleton()` clears stale completion/proposal/provenance but preserves upstream state;
- stale Sequence response token remains ignored;
- `setSequenceCompletionResult()` stores raw completion plus assembled proposal/provenance.

- [ ] **Step 2: Implement Draft state additions**

Do not overload `setSequenceResult()` with two incompatible meanings. Keep it for legacy assembled responses if existing tests require it; route M5 orchestration through the new explicit methods.

- [ ] **Step 3: Update API client validator map**

Change:

```js
sequence: contracts.validateSequenceResponse
```

to:

```js
sequence: contracts.validateSequenceCompletionResponse
```

Demo fixture `sequence` becomes a completion fixture, not a preassembled proposal.

- [ ] **Step 4: Run state/client tests and verify GREEN**

Run:

```bash
node visual-direction-os/narrative-state.test.js
node visual-direction-os/narrative-api-client.test.js
```

Expected: all pass.

- [ ] **Step 5: Commit Task 4**

Commit message:

```text
feat: store compiler-first narrative artifacts
```

---

### Task 5: Sequence Orchestration in Narrative Workspace

**Files:**
- Modify: `visual-direction-os/director-v2.html`
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-workspace.spec.js`
- Modify: `visual-direction-os/visual-ir-shadow.js`

**Interfaces:**
- Depends on global `VDOSVisualSequenceSkeleton` and `VDOSVisualSequenceCompletion` loaded before `narrative-workspace.js`.
- `requestSequence()` compiles Skeleton before API call and assembles proposal after completion validation.

- [ ] **Step 1: Write integration/load-order RED tests**

Assert load order:

```text
visual-compiler.js
→ visual-sequence-skeleton.js
→ visual-sequence-completion.js
→ narrative-workspace.js
→ visual-ir-shadow.js
```

Also assert `narrative-workspace.js` contains `compileSequenceSkeleton`, sends `sequenceSkeleton`, and calls `assembleSequenceProposal`.

- [ ] **Step 2: Update Director V2 script loading**

Add the two new runtime modules after `visual-compiler.js` and before Narrative Workspace orchestration.

- [ ] **Step 3: Rewrite `requestSequence()` transaction**

Pseudo-flow:

```js
const current = draft.getState();
const visualIR = root.VDOSVisualIRShadowController?.getVisualIR?.();
const skeleton = root.VDOSVisualSequenceSkeleton.compileSequenceSkeleton({
  confirmedReading: current.confirmedReading,
  selectedStrategy: current.selectedStrategy,
  visualIR
});
draft.setSequenceSkeleton(skeleton);

const result = await api.sequence({
  narrative: current.input,
  directorIntent: current.directorIntent,
  reading: current.confirmedReading,
  strategy: current.selectedStrategy,
  sequenceSkeleton: skeleton
}, controller.signal);

const assembled = root.VDOSVisualSequenceCompletion.assembleSequenceProposal({
  skeleton,
  completion: result,
  visualIR
});

draft.setSequenceCompletionResult({
  completion: result,
  proposal: assembled.sequenceProposal,
  provenance: assembled.sequenceProvenance
});
```

Do not mutate Scene State in this flow.

- [ ] **Step 4: Handle invalid completion as recoverable Sequence error**

If validation throws `SEQUENCE_COMPLETION_INVALID`, preserve Skeleton and raw completion for inspection, do not produce `sequenceProposal`, and render a recoverable Sequence error with retry. Retrying Sequence reuses the existing Skeleton if Reading/Strategy/Visual IR identity has not changed.

- [ ] **Step 5: Keep M3/M4 downstream compatibility**

`renderSequence()` continues reading the assembled `state.sequenceProposal`. `visual-ir-shadow.js` continues to build M4 Authority Plan from assembled proposal, while exposing Skeleton/provenance through new getters without rewriting raw completion.

- [ ] **Step 6: Run Narrative browser/unit regressions**

Run:

```bash
node --test visual-direction-os/visual-compiler-integration.test.js
node visual-direction-os/narrative-state.test.js
node visual-direction-os/narrative-contracts.test.js
```

Expected: all pass.

- [ ] **Step 7: Commit Task 5**

Commit message:

```text
feat: orchestrate compiler-first sequence synthesis
```

---

### Task 6: Compact Provenance UI and M5 Browser Acceptance

**Files:**
- Create: `visual-direction-os/visual-sequence-origin.js`
- Create: `visual-direction-os/visual-sequence-origin.test.js`
- Modify: `visual-direction-os/visual-ir-inspector.css`
- Create: `visual-direction-os/visual-sequence-compiler-first.spec.js`
- Modify: `.github/workflows/director-intelligence-ci.yml`

**Interfaces:**
- Reads `sequenceSkeleton`, `sequenceCompletion`, `sequenceProvenance`, and assembled `sequenceProposal` from the Narrative controller/shadow controller.
- Renders read-only origin/provenance before M3 Compare without changing Scene State.

- [ ] **Step 1: Write origin UI RED test**

Required default text:

```text
SEQUENCE ORIGIN · COMPILER-FIRST
```

Expandable beat detail must distinguish:

```text
COMPILER OWNED
AI COMPLETED
BLOCKED
```

Do not add a score.

- [ ] **Step 2: Implement compact origin inspector and CSS**

Insert it at Sequence Preview above the existing M3 Compare. Keep the collapsed default small; existing M3 Compare → M4 Authority → Apply order remains unchanged below it.

- [ ] **Step 3: Add positive Camera Authority browser acceptance**

Drive demo mode through Camera Strategy and verify:

1. origin shows `COMPILER-FIRST`;
2. raw completion uses a legal monotonic agency path;
3. raw completion `openPatch` does not contain `camera.perspective`;
4. assembled proposal deterministically contains the expected perspective from agency;
5. M4 reports supported Camera claims as `CONFIRM` under normal M5 synthesis;
6. Scene State before Apply equals initial visual Scene State;
7. explicit Apply writes assembled proposal;
8. manual DIRECT edit still succeeds afterward.

- [ ] **Step 4: Add negative forbidden-write browser acceptance**

Expose a deterministic demo fixture flag such as `?sequenceCompletionViolation=camera-owned-write` that returns `camera.perspective` inside `openPatch`. Verify:

- raw invalid completion is retained for diagnostics;
- validation exposes `COMPILER_OWNED_FIELD_WRITE`;
- no assembled proposal becomes Apply-ready;
- Apply action is absent/disabled;
- canonical Scene State remains unchanged.

- [ ] **Step 5: Extend CI contracts, syntax, Pages assembly, and browser list**

Add:

```text
visual-sequence-skeleton.test.js
visual-sequence-completion.test.js
visual-sequence-origin.test.js
api/narrative/_contracts-sequence-completion.test.js
visual-sequence-compiler-first.spec.js
```

Add syntax checks and Pages asset checks for all new runtime files.

- [ ] **Step 6: Run full Director Intelligence verification**

The CI workflow must run:

- all M0–M5 contract tests;
- Narrative and Project regressions;
- changed JS syntax;
- Pages assembly;
- rail first-click browser regression;
- M2 Visual IR browser acceptance;
- M3 Shadow Compare browser acceptance;
- M4 Authority browser acceptance;
- M5 positive and negative compiler-first browser acceptance;
- original Narrative Workspace browser acceptance.

Expected: `contracts = success`, `browser = success`.

- [ ] **Step 7: Commit Task 6**

Commit message:

```text
feat: expose compiler-first sequence provenance
```

---

### Task 7: Final Compatibility and PR Review Gate

**Files:**
- Modify only if verification identifies a real gap; otherwise metadata-only PR update.

**Interfaces:**
- Verifies current head against baseline `fbf3329557c02452a9175ab0d9ed02bf55a8368a`.

- [ ] **Step 1: Verify legacy proposal compatibility**

Run existing M3/M4 tests using legacy assembled `sequenceProposal` fixtures and confirm they still work without Skeleton artifacts.

- [ ] **Step 2: Verify baseline diff**

Confirm branch remains strictly ahead of `integration/director-workspace-v2-1` with the same merge base and no accidental master merge.

- [ ] **Step 3: Verify final head with fresh CI**

Do not make a completion claim from an earlier commit. Record the exact final HEAD and exact successful Director Intelligence CI run.

- [ ] **Step 4: Update Draft PR #4 metadata**

Title:

```text
Phase II M5: compiler-first Sequence synthesis
```

Body must summarize Skeleton ownership, constrained completion, semantic validation, browser assembly, legacy compatibility, and final CI evidence. Keep Draft and base `integration/director-workspace-v2-1`.

- [ ] **Step 5: Provide commit-pinned review fixture**

Return:

```text
https://raw.githack.com/Caesar-ZZh/visual-direction-os/<FINAL_HEAD>/visual-direction-os/director-v2.html?narrativeDemo=1&projectDemo=1
```

Do not merge without explicit product review.
