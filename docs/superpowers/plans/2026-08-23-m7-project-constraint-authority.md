# M7 Project Constraint Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build M7 Project Constraint Authority so high-evidence cross-Scene ownership relationships can become Director-confirmed, revisioned Project commitments that guard future M5 Sequence synthesis without creating a new Scene State writer.

**Architecture:** M6 stays read-only. M7 adds a dependency-light Registry, pure prospective Candidate derivation, a pure runtime Authority resolver, and a thin pre-AI Sequence guard. Project decisions persist; runtime authority status is recomputed. M5 remains the exact Scene State value writer and M4 remains the final Apply-time Scene authority.

**Tech Stack:** Vanilla JavaScript UMD modules, Node `node:test`, Playwright, existing Project Store/localStorage persistence, M5 Visual Compiler/Skeleton/Completion pipeline, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-23-m7-project-constraint-authority-design.md`

## Global Constraints

- M6 `PROJECT INTELLIGENCE · SHADOW` remains read-only.
- Candidate authority is zero until explicit Director confirmation.
- M7 v1 never introduces `owner: project` as a Scene State writer.
- Project constraints never silently override supported Scene Compiler truth.
- Conflict/stale review happens before `beginRequest('sequence')`; AI request count must remain zero.
- AI never arbitrates Project-vs-Scene authority.
- Authority Candidates are prospective, immediate-next-Scene only, and initially `SETUP` scoped.
- Exact authority paths are limited to `agency`, `camera.perspective`, `color.territory`; initial Candidate generation emits Camera/Color `ownership-carry` only.
- `ai-completed`, `legacy`, `unknown`, `blocked`, partial, unsupported, divergent, handoff-mismatched, non-adjacent, already-directed targets, and M6 `WARN` never create authority Candidates.
- Missing `projectConstraints` remains valid legacy Project state.
- Persist only Director decisions/history; derive `ACTIVE`, `SATISFIED`, `CONFLICT`, `STALE`, `INAPPLICABLE`.
- Staleness compares canonical evidence snapshot content, not digest alone.
- Digest is deterministic UTF-8 FNV-1a 64-bit using `BigInt`; it is not a security signature.
- Registry history uses `currentRevision` + immutable `revisions{}`.
- Release exceptions are revision-local.
- Grammar diversity remains valid. An unsupported target Grammar is a review conflict, not a reason to rewrite Grammar.
- Canonical Scene State still mutates only after explicit Apply.
- M3/M4/M5/M6 behavior remains intact except read-only M7 provenance annotation.
- PR #4 remains Draft and unmerged.

---

## File Map

### Create runtime
- `visual-direction-os/project-constraint-registry.js` — fingerprints, validation, revisions, dismissals, Director decision transforms.
- `visual-direction-os/project-constraint-candidates.js` — pure prospective Candidate derivation.
- `visual-direction-os/project-constraint-authority.js` — pure current-evidence + Scene Compiler resolution.
- `visual-direction-os/visual-sequence-project-constraints.js` — thin pre-AI Sequence guard/context bridge.
- `visual-direction-os/project-constraint-inspector.js` — pure Director Control renderer.
- `visual-direction-os/project-constraint.css` — Director Control styling.

### Create tests
- `visual-direction-os/project-constraint-registry.test.js`
- `visual-direction-os/project-constraint-project-state.test.js`
- `visual-direction-os/project-constraint-candidates.test.js`
- `visual-direction-os/project-constraint-authority.test.js`
- `visual-direction-os/visual-sequence-project-constraints.test.js`
- `visual-direction-os/project-constraint-inspector.test.js`
- `visual-direction-os/project-constraint-workspace.test.js`
- `visual-direction-os/project-constraint-browser.spec.js`

### Modify
- `visual-direction-os/project-contracts.js`
- `visual-direction-os/project-state.js`
- `visual-direction-os/project-persistence.test.js`
- `visual-direction-os/project-bootstrap.js`
- `visual-direction-os/project-workspace.js`
- `visual-direction-os/narrative-workspace.js`
- `visual-direction-os/narrative-api-client.js`
- `visual-direction-os/visual-sequence-completion.js`
- `visual-direction-os/visual-sequence-completion.test.js`
- `api/narrative/_contracts.js`
- `api/narrative/_contracts-sequence-completion.test.js`
- `api/narrative/_prompts.js`
- `api/narrative/_prompts.test.js`
- `.github/workflows/director-intelligence-ci.yml`

---

### Task 1: Registry primitives and revisioned Director decisions

**Files:**
- Create: `visual-direction-os/project-constraint-registry.js`
- Create: `visual-direction-os/project-constraint-registry.test.js`

**Interfaces:**

```js
REGISTRY_VERSION = '0.1.0'
AUTHORITY_CONTRACT_VERSION = '0.1.0'
createEmptyRegistry()
canonicalize(value)
canonicalJSONString(value)
fnv1a64(input)
fingerprintSnapshot(prefix, snapshot)
validateRegistry(registry)
confirmCandidate(registry, candidate)
rejectCandidate(registry, candidate)
revokeConstraint(registry, constraintId)
releaseConstraintScope(registry, constraintId, {sceneId, beatId})
reconfirmConstraint(registry, constraintId, candidate)
getCurrentRevision(constraint)
```

The module has no Project Store or M6 dependency so it can load before `project-contracts.js`.

- [ ] **Step 1: Write RED canonical identity tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('./project-constraint-registry.js');

test('canonical JSON sorts object keys and preserves array order', () => {
  const a = {z:1,a:{y:2,x:3},list:['b','a']};
  const b = {list:['b','a'],a:{x:3,y:2},z:1};
  assert.equal(registry.canonicalJSONString(a), registry.canonicalJSONString(b));
  assert.match(registry.fingerprintSnapshot('pcf', a), /^pcf-[0-9a-f]{16}$/);
});

test('undefined object keys are omitted', () => {
  assert.equal(registry.canonicalJSONString({a:1,b:undefined}), '{"a":1}');
});
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/project-constraint-registry.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement canonicalization + FNV-1a**

```js
const MASK_64 = (1n << 64n) - 1n;
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  Object.keys(value).sort().forEach(key => {
    if (value[key] !== undefined) out[key] = canonicalize(value[key]);
  });
  return out;
}
function canonicalJSONString(value) { return JSON.stringify(canonicalize(value)); }
function fnv1a64(input) {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(String(input))) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash.toString(16).padStart(16, '0');
}
```

- [ ] **Step 4: Add RED lifecycle tests**

Fixture:

```js
const candidate = {
  candidateId:'candidate-scene02-scene03-camera-carry',
  candidateFingerprint:'pcand-1111111111111111',
  type:'ownership-carry', family:'camera', path:'camera.perspective', expected:'mixed',
  scope:{sourceSceneId:'scene-02',targetSceneId:'scene-03',beatIds:['setup']},
  evidenceSnapshot:{sourceSceneId:'scene-02',targetSceneId:'scene-03',path:'camera.perspective',expected:'mixed'}
};
```

Tests:

```js
test('confirm creates REV 01', () => {
  const next = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const item = Object.values(next.constraints)[0];
  assert.equal(item.decision, 'confirmed');
  assert.equal(item.currentRevision, 1);
  assert.equal(item.revisions['1'].state, 'current');
  assert.deepEqual(item.revisions['1'].evidence.canonicalSnapshot, candidate.evidenceSnapshot);
});

test('reject persists fingerprint only', () => {
  const next = registry.rejectCandidate(registry.createEmptyRegistry(), candidate);
  assert.equal(next.dismissals[candidate.candidateFingerprint].decision, 'rejected');
  assert.deepEqual(next.constraints, {});
});

test('REV 02 supersedes REV 01 and does not inherit release', () => {
  let next = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const id = Object.keys(next.constraints)[0];
  next = registry.releaseConstraintScope(next, id, {sceneId:'scene-03',beatId:'setup'});
  next = registry.reconfirmConstraint(next, id, {
    ...candidate,
    expected:'character',
    evidenceSnapshot:{...candidate.evidenceSnapshot,expected:'character'}
  });
  assert.equal(next.constraints[id].currentRevision, 2);
  assert.equal(next.constraints[id].revisions['1'].state, 'superseded');
  assert.equal(next.constraints[id].revisions['1'].exceptions.length, 1);
  assert.equal(next.constraints[id].revisions['2'].exceptions.length, 0);
});
```

- [ ] **Step 5: Implement lifecycle + validator**

Reject wrong schema version, invalid `confirmed|revoked` decision, missing current revision, non-current `currentRevision`, missing evidence snapshot/fingerprint, and revision-mismatched release exceptions. Never persist runtime authority statuses.

- [ ] **Step 6: Run GREEN**

```bash
node --test visual-direction-os/project-constraint-registry.test.js
node --check visual-direction-os/project-constraint-registry.js
```

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/project-constraint-registry.js visual-direction-os/project-constraint-registry.test.js
git commit -m "feat: add project constraint registry primitives"
```

---

### Task 2: Backward-compatible Project State and persistence

**Files:**
- Modify: `visual-direction-os/project-contracts.js`
- Modify: `visual-direction-os/project-state.js`
- Modify: `visual-direction-os/project-bootstrap.js`
- Modify: `visual-direction-os/project-persistence.test.js`
- Create: `visual-direction-os/project-constraint-project-state.test.js`

**Interfaces:**
- `project-contracts.js` delegates optional Registry validation to `VDOSProjectConstraintRegistry.validateRegistry`.
- Project Store adds `setProjectConstraints(nextRegistry)`.

- [ ] **Step 1: Write RED contract/store tests**

```js
test('legacy Project without Registry remains valid', () => {
  const project = validProjectFixture();
  delete project.projectConstraints;
  assert.equal(contracts.validateProjectState(project).valid, true);
});

test('Store commits validated Registry only', () => {
  const store = stateApi.createProjectStore(validProjectFixture());
  const nextRegistry = registry.rejectCandidate(registry.createEmptyRegistry(), candidateFixture());
  const result = store.setProjectConstraints(nextRegistry);
  assert.deepEqual(result.projectConstraints, nextRegistry);
  assert.throws(() => store.setProjectConstraints({schemaVersion:'bad'}), /Invalid Project Constraint Registry/);
});
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/project-constraint-project-state.test.js
node visual-direction-os/project-persistence.test.js
```

- [ ] **Step 3: Implement Project contract dependency and Store mutation**

Change the UMD wrapper so `project-contracts.js` receives `root` and registry; Node requires `./project-constraint-registry.js`, browser reads `root.VDOSProjectConstraintRegistry`.

```js
if (value.projectConstraints != null) {
  const checked = constraintRegistry.validateRegistry(value.projectConstraints);
  checked.errors.forEach(error => errors.push(`projectConstraints.${error}`));
}
```

Store:

```js
function setProjectConstraints(nextRegistry) {
  requireProject();
  const checked = constraintRegistry.validateRegistry(nextRegistry);
  if (!checked.valid) throw new Error(`Invalid Project Constraint Registry: ${checked.errors.join('; ')}`);
  const next = getProject();
  next.projectConstraints = checked.value;
  return validateAndCommit(next, 'project:constraints');
}
```

Expose it from `createProjectStore()`.

- [ ] **Step 4: Lock Bootstrap load order**

Before the existing contracts group:

```js
await loadScript(`project-constraint-registry.js?v=${VERSION}`, 'VDOSProjectConstraintRegistry');
```

Then load `project-contracts.js`; never put these two in the same `Promise.all`.

- [ ] **Step 5: Add persistence round-trip**

Save/load a Project containing a confirmed Registry; separately load a legacy Project without the field. Both validate and preserve their original shape.

- [ ] **Step 6: Run GREEN**

```bash
node --test visual-direction-os/project-constraint-project-state.test.js
node visual-direction-os/project-contracts.test.js
node visual-direction-os/project-state.test.js
node visual-direction-os/project-persistence.test.js
node --check visual-direction-os/project-contracts.js
node --check visual-direction-os/project-state.js
node --check visual-direction-os/project-bootstrap.js
```

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/project-contracts.js visual-direction-os/project-state.js visual-direction-os/project-bootstrap.js visual-direction-os/project-persistence.test.js visual-direction-os/project-constraint-project-state.test.js
git commit -m "feat: persist project constraint decisions"
```

---

### Task 3: Prospective Candidate derivation

**Files:**
- Create: `visual-direction-os/project-constraint-candidates.js`
- Create: `visual-direction-os/project-constraint-candidates.test.js`

**Interfaces:**

```js
buildConstraintEvidenceSnapshot({projectState,projectIntelligence,sourceSceneId,targetSceneId,family,path,type,beatIds})
deriveProjectConstraintCandidates({projectState,projectIntelligence,registry})
```

Exact `expected` comes from source final `workspace.sceneState`, never from normalized M6 `CONTESTED` labels.

- [ ] **Step 1: Write RED positive Camera carry test**

```js
test('derives immediate-next SETUP Camera carry', () => {
  const intelligence = deriveProjectIntelligence(project);
  const candidates = api.deriveProjectConstraintCandidates({
    projectState:project,
    projectIntelligence:intelligence,
    registry:registry.createEmptyRegistry()
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].path, 'camera.perspective');
  assert.equal(candidates[0].expected, 'mixed');
  assert.deepEqual(candidates[0].scope.beatIds, ['setup']);
  assert.match(candidates[0].candidateFingerprint, /^pcand-[0-9a-f]{16}$/);
});
```

Fixture requirements: Scene 01→02 is an existing `PASS` material compiler-backed Camera transfer; Scene 03 is immediate, undirected, and starts with Scene 02 ending agency.

- [ ] **Step 2: Write RED ineligibility matrix**

Zero Candidates for AI-completed, legacy/missing/unknown/divergent, blocked, M6 WARN, handoff mismatch, non-adjacent, already-directed target, and unsupported path.

- [ ] **Step 3: Write RED dismissal identity test**

Reject Candidate A and rerun unchanged -> zero. Then change target `agencyTransition` from `['contested','character']` to `['contested','shared','character']`; starting agency remains compatible but canonical evidence changes, so a new fingerprint Candidate appears.

- [ ] **Step 4: Run RED**

```bash
node --test visual-direction-os/project-constraint-candidates.test.js
```

- [ ] **Step 5: Implement pure derivation**

```text
for source indexes 1 .. length-2:
  sourceBoundary = boundary where toSceneId == sourceSceneId
  target = immediate next Scene
  require sourceBoundary PASS + material changed compiler-backed response
  require target status.visual != directed
  require source ending agency == target starting agency
  for camera/color:
    require source M6 family source == compiler-backed
    read exact final value from source Scene State
    build canonical evidence snapshot
    fingerprint pcand-...
    skip identical dismissal
    emit ownership-carry -> target SETUP
```

Do not emit `transfer-completion` in v1.

- [ ] **Step 6: Run GREEN + determinism/immutability**

```bash
node --test visual-direction-os/project-constraint-candidates.test.js
node --check visual-direction-os/project-constraint-candidates.js
```

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/project-constraint-candidates.js visual-direction-os/project-constraint-candidates.test.js
git commit -m "feat: derive prospective project constraint candidates"
```

---

### Task 4: Runtime Authority resolver

**Files:**
- Create: `visual-direction-os/project-constraint-authority.js`
- Create: `visual-direction-os/project-constraint-authority.test.js`

**Interface:**

```js
resolveProjectConstraintAuthority({projectState,projectIntelligence,registry,targetSceneId,visualIR,baseSkeleton})
```

Return:

```js
{
  mode:'guarded', targetSceneId, safeToComplete,
  resolutions:[{
    constraintId,revision,
    status:'ACTIVE'|'SATISFIED'|'CONFLICT'|'STALE'|'INAPPLICABLE',
    path,beatId,expected,sceneExpected,reason
  }],
  conflicts:[],
  projectConstraintContext:{targetSceneId,constraints:[]}
}
```

- [ ] **Step 1: Write RED staleness tests**

Change source final value, Reading/Strategy/Grammar/applied Beat, target agency transition, and source/target adjacency one at a time. Each yields `STALE`, `safeToComplete=false`, zero exact authority.

- [ ] **Step 2: Write RED SATISFIED and reachable target-Grammar CONFLICT tests**

```js
test('matching Camera expectation is SATISFIED', () => {
  const result = api.resolveProjectConstraintAuthority(satisfiedFixture());
  assert.equal(result.safeToComplete, true);
  assert.equal(result.resolutions[0].status, 'SATISFIED');
  assert.equal(result.resolutions[0].sceneExpected, 'mixed');
});

test('confirmed Camera carry under target Color-only Grammar is review conflict', () => {
  const result = api.resolveProjectConstraintAuthority(unsupportedGrammarFixture());
  assert.equal(result.safeToComplete, false);
  assert.equal(result.resolutions[0].status, 'CONFLICT');
  assert.equal(result.resolutions[0].reason, 'TARGET_GRAMMAR_UNSUPPORTED');
});
```

- [ ] **Step 3: Write defensive supported-value disagreement test**

Construct a deliberately contradictory confirmed Registry fixture whose snapshot is current but stored expected disagrees with the supported Scene Compiler assertion. Expect `CONFLICT/SCENE_COMPILER_DISAGREES`. This is invariant hardening, not the normal ownership-carry UX.

- [ ] **Step 4: Write release/revoke/ACTIVE tests**

Current-revision release -> `INAPPLICABLE`; revoked -> omitted; current evidence with no Skeleton -> `ACTIVE`.

- [ ] **Step 5: Run RED**

```bash
node --test visual-direction-os/project-constraint-authority.test.js
```

- [ ] **Step 6: Implement strict resolution order**

```text
1 ignore revoked
2 current-revision release -> INAPPLICABLE
3 rebuild current canonical snapshot
4 snapshot differs -> STALE/block
5 no baseSkeleton -> ACTIVE
6 locate SETUP Beat
7 ask Visual Compiler for supported assertion
8 missing supported path -> CONFLICT/TARGET_GRAMMAR_UNSUPPORTED
9 equal exact value -> SATISFIED
10 different exact value -> CONFLICT/SCENE_COMPILER_DISAGREES
```

Only `SATISFIED` enters `projectConstraintContext`.

- [ ] **Step 7: Run GREEN**

```bash
node --test visual-direction-os/project-constraint-authority.test.js
node --check visual-direction-os/project-constraint-authority.js
```

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/project-constraint-authority.js visual-direction-os/project-constraint-authority.test.js
git commit -m "feat: resolve guarded project constraint authority"
```

---

### Task 5: Guard M5 before AI and annotate compiler provenance

**Files:**
- Create: `visual-direction-os/visual-sequence-project-constraints.js`
- Create: `visual-direction-os/visual-sequence-project-constraints.test.js`
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/project-bootstrap.js`
- Modify: `visual-direction-os/narrative-api-client.js`
- Modify: `visual-direction-os/visual-sequence-completion.js`
- Modify: `visual-direction-os/visual-sequence-completion.test.js`
- Modify: `api/narrative/_contracts.js`
- Modify: `api/narrative/_contracts-sequence-completion.test.js`
- Modify: `api/narrative/_prompts.js`
- Modify: `api/narrative/_prompts.test.js`

**Interfaces:**

```js
guardProjectConstraints(args)
```

returns Authority result or throws `PROJECT_CONSTRAINT_REVIEW_REQUIRED` before AI request creation.

Narrative Workspace options:

```js
projectConstraintGuard
projectConstraintProvider() -> {projectState,projectIntelligence,registry,targetSceneId}
```

Assembler optional input:

```js
projectConstraintResolutions = []
```

- [ ] **Step 1: Write RED bridge tests**

```js
test('satisfied guard is read-only', () => {
  const before = structuredClone(skeleton);
  const result = bridge.guardProjectConstraints({...fixture,baseSkeleton:skeleton});
  assert.equal(result.safeToComplete, true);
  assert.deepEqual(skeleton, before);
});

test('stale/conflict throws review-required', () => {
  assert.throws(() => bridge.guardProjectConstraints(conflictFixture()), error => error.code === 'PROJECT_CONSTRAINT_REVIEW_REQUIRED');
});
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/visual-sequence-project-constraints.test.js
```

- [ ] **Step 3: Implement thin bridge**

```js
function guardProjectConstraints(args) {
  const result = authority.resolveProjectConstraintAuthority(args);
  if (!result.safeToComplete) {
    const error = new Error('Project constraint review is required before Sequence completion.');
    error.code = 'PROJECT_CONSTRAINT_REVIEW_REQUIRED';
    error.resolutions = clone(result.resolutions);
    throw error;
  }
  return result;
}
```

No Skeleton writes.

- [ ] **Step 4: Integrate before the AI boundary in `requestSequence()`**

After base Skeleton compile/reuse, before `beginRequest('sequence')`:

```js
const constraintInput = projectConstraintProvider?.() || null;
const constraintResult = constraintInput
  ? projectConstraintGuard.guardProjectConstraints({...constraintInput,visualIR,baseSkeleton:skeleton})
  : {projectConstraintContext:null,resolutions:[]};
```

Only then:

```js
({token,controller} = beginRequest('sequence'));
rawCompletion = await api.sequence({
  narrative:current.input,
  directorIntent:current.directorIntent,
  reading:current.confirmedReading,
  strategy:current.selectedStrategy,
  sequenceSkeleton:skeleton,
  projectConstraintContext:constraintResult.projectConstraintContext
}, controller.signal);
```

Guard failure before token creation renders a recoverable Sequence error directly; it does not create a fake failed API request.

- [ ] **Step 5: Load/provide M7 runtime in Bootstrap**

After M6:

```js
await loadScript(`project-constraint-candidates.js?v=${VERSION}`, 'VDOSProjectConstraintCandidates');
await loadScript(`project-constraint-authority.js?v=${VERSION}`, 'VDOSProjectConstraintAuthority');
await loadScript(`visual-sequence-project-constraints.js?v=${VERSION}`, 'VDOSVisualSequenceProjectConstraints');
```

Pass to Narrative restore:

```js
projectConstraintGuard:root.VDOSVisualSequenceProjectConstraints,
projectConstraintProvider:() => {
  const projectState = store.getProject();
  return {
    projectState,
    projectIntelligence:root.VDOSProjectIntelligence.deriveProjectIntelligence(projectState),
    registry:projectState?.projectConstraints || root.VDOSProjectConstraintRegistry.createEmptyRegistry(),
    targetSceneId:projectState?.activeSceneId || null
  };
}
```

- [ ] **Step 6: Add assembler provenance test**

```js
test('SATISFIED Project constraint annotates compiler provenance without changing owner/value', () => {
  const assembled = assembleSequenceProposal({
    skeleton,completion,visualIR,
    projectConstraintResolutions:[{
      constraintId:'constraint-camera-001',revision:1,status:'SATISFIED',beatId:'setup',path:'camera.perspective'
    }]
  });
  const field = assembled.sequenceProvenance.fields['setup.camera.perspective'];
  assert.equal(field.owner, 'compiler');
  assert.deepEqual(field.projectConstraintIds, ['constraint-camera-001']);
  assert.equal(assembled.sequenceProposal.beats[0].sceneStatePatch.variables.camera.perspective, 'mixed');
});
```

Top-level provenance records `registryVersion` and satisfied resolution IDs/revisions only.

- [ ] **Step 7: Extend optional Sequence API context**

```js
projectConstraintContext: {
  targetSceneId:string,
  constraints:[{
    constraintId:string,
    revision:number,
    type:'ownership-carry'|'handoff-guard',
    beatId:'setup',
    path:'agency'|'camera.perspective'|'color.territory',
    expected:string,
    resolution:'satisfied'
  }]
}
```

Prompt instruction:

```text
Project Constraint Context is explanatory only. Do not write, override, or infer constrained paths. Return only AI-open fields allowed by the supplied Sequence Skeleton.
```

- [ ] **Step 8: Prove AI request count is zero on guard failure**

Use a Sequence API spy in Narrative Workspace test. Trigger a guard conflict; assert `sequenceCalls === 0`, no Sequence proposal, no Scene mutation.

- [ ] **Step 9: Run GREEN**

```bash
node --test visual-direction-os/visual-sequence-project-constraints.test.js
node --test visual-direction-os/visual-sequence-completion.test.js
node visual-direction-os/narrative-api-client.test.js
node api/narrative/_contracts-sequence-completion.test.js
node api/narrative/_prompts.test.js
node --check visual-direction-os/visual-sequence-project-constraints.js
node --check visual-direction-os/narrative-workspace.js
node --check visual-direction-os/visual-sequence-completion.js
node --check api/narrative/_contracts.js
node --check api/narrative/_prompts.js
```

- [ ] **Step 10: Commit**

```bash
git add visual-direction-os/visual-sequence-project-constraints.js visual-direction-os/visual-sequence-project-constraints.test.js visual-direction-os/narrative-workspace.js visual-direction-os/project-bootstrap.js visual-direction-os/narrative-api-client.js visual-direction-os/visual-sequence-completion.js visual-direction-os/visual-sequence-completion.test.js api/narrative/_contracts.js api/narrative/_contracts-sequence-completion.test.js api/narrative/_prompts.js api/narrative/_prompts.test.js
git commit -m "feat: guard compiler-first Sequence with project constraints"
```

---

### Task 6: Project Constraints · Director Control UI

**Files:**
- Create: `visual-direction-os/project-constraint-inspector.js`
- Create: `visual-direction-os/project-constraint-inspector.test.js`
- Create: `visual-direction-os/project-constraint-workspace.test.js`
- Create: `visual-direction-os/project-constraint.css`
- Modify: `visual-direction-os/project-workspace.js`
- Modify: `visual-direction-os/project-bootstrap.js`

**Interfaces:**
- Inspector consumes `{candidates,authorityState,registry}` and returns HTML only.
- `project-workspace.js` already exports `renderProjectWorkspace` and `initProjectWorkspace`; preserve both.
- Existing M6 root is `[data-project-intelligence-panel]`.
- New M7 root must be `[data-project-constraints]`.
- Only explicit actions call Registry transforms then `store.setProjectConstraints()`.

- [ ] **Step 1: Write RED inspector tests**

```js
test('Candidate renders Confirm/Reject and no Project write owner', () => {
  const html = inspector.renderProjectConstraints({candidates:[candidate],registry:registry.createEmptyRegistry(),authorityState:null});
  assert.match(html, /PROJECT CONSTRAINTS · DIRECTOR CONTROL/);
  assert.match(html, /CONFIRM/);
  assert.match(html, /REJECT/);
  assert.doesNotMatch(html, /owner: project/i);
});

test('stale/conflict copy is explicit', () => {
  assert.match(inspector.renderProjectConstraints(staleState), /AUTHORITY REMOVED/);
  assert.match(inspector.renderProjectConstraints(conflictState), /AI COMPLETION[\s\S]*NOT STARTED/);
});
```

Also test HTML escaping.

- [ ] **Step 2: Write RED Workspace order test using exact anchors**

```js
const html = workspace.renderProjectWorkspace(project);
assert.ok(html.indexOf('data-project-intelligence-panel') >= 0);
assert.ok(html.indexOf('data-project-constraints') >= 0);
assert.ok(html.indexOf('data-project-intelligence-panel') < html.indexOf('data-project-constraints'));
```

- [ ] **Step 3: Run RED**

```bash
node --test visual-direction-os/project-constraint-inspector.test.js
node --test visual-direction-os/project-constraint-workspace.test.js
```

- [ ] **Step 4: Implement inspector + CSS + Bootstrap loading**

Load `project-constraint.css` with Project styles. Load `project-constraint-inspector.js` after Candidate/Authority modules and before `project-workspace.js`.

No score, auto-fix, `Force Project Value`, or Grammar-unification control.

- [ ] **Step 5: Wire Workspace render**

```js
const registryState = project?.projectConstraints || constraintRegistry.createEmptyRegistry();
const candidates = constraintCandidates.deriveProjectConstraintCandidates({projectState:project,projectIntelligence:intelligenceState,registry:registryState});
const authorityState = constraintAuthority.resolveProjectConstraintAuthority({
  projectState:project,
  projectIntelligence:intelligenceState,
  registry:registryState,
  targetSceneId:project?.activeSceneId || null,
  visualIR:null,
  baseSkeleton:null
});
```

Without Skeleton, current confirmed constraints may be `ACTIVE`; never fake `SATISFIED`.

Render after `${renderProjectIntelligence(intelligenceState)}`:

```js
${renderProjectConstraints({candidates,authorityState,registry:registryState})}
```

- [ ] **Step 6: Wire explicit Director actions using existing delegated `data-action` listener**

```text
confirm-project-constraint -> confirmCandidate -> setProjectConstraints
reject-project-constraint -> rejectCandidate -> setProjectConstraints
revoke-project-constraint -> revokeConstraint -> setProjectConstraints
release-project-constraint -> releaseConstraintScope -> setProjectConstraints
review-project-constraint -> derive current replacement -> reconfirmConstraint -> setProjectConstraints
```

Each action mutates only `projectConstraints`; Scene/Narrative/Sequence snapshots remain unchanged.

- [ ] **Step 7: Test registry-only mutations**

Use `initProjectWorkspace()` with a fake Store/runtime. Snapshot `store.getProject().scenes` before Confirm/Reject/Revoke, dispatch the real delegated action, then assert Scenes unchanged and Registry changed.

- [ ] **Step 8: Run GREEN**

```bash
node --test visual-direction-os/project-constraint-inspector.test.js
node --test visual-direction-os/project-constraint-workspace.test.js
node --check visual-direction-os/project-constraint-inspector.js
node --check visual-direction-os/project-workspace.js
node --check visual-direction-os/project-bootstrap.js
```

- [ ] **Step 9: Commit**

```bash
git add visual-direction-os/project-constraint-inspector.js visual-direction-os/project-constraint-inspector.test.js visual-direction-os/project-constraint-workspace.test.js visual-direction-os/project-constraint.css visual-direction-os/project-workspace.js visual-direction-os/project-bootstrap.js
git commit -m "feat: add project constraint director controls"
```

---

### Task 7: Browser acceptance, CI, exact-HEAD verification, Draft PR handoff

**Files:**
- Create: `visual-direction-os/project-constraint-browser.spec.js`
- Modify: `.github/workflows/director-intelligence-ci.yml`
- Update PR #4 metadata only after exact-HEAD verification succeeds.

- [ ] **Step 1: Positive browser chain**

Using public Project Store/Runtime APIs only:

```text
Scene 01 directed
→ Scene 02 directed with compiler-backed Camera MIXED
→ M6 verifies 01→02
→ Scene 03 undirected starts CONTESTED
→ M7 Candidate
→ Director CONFIRM REV 01
→ open Scene 03
→ confirm Reading + compatible Camera Grammar
→ guard SATISFIED
→ AI completion
→ Sequence Preview; Scene State unchanged
→ Apply
→ SETUP Camera MIXED
→ provenance owner=compiler + constraint ID/revision annotation
```

Assert `[data-project-intelligence-panel]` precedes `[data-project-constraints]`.

- [ ] **Step 2: Reachable conflict browser chain**

Keep confirmed Camera carry evidence current, then select target Color ownership Grammar so Camera has no exact supported target assertion. Assert:

```text
CONFIRMED · CONFLICT
TARGET GRAMMAR UNSUPPORTED
AI COMPLETION · NOT STARTED
```

No proposal and no canonical mutation.

- [ ] **Step 3: Stale browser chain**

After REV 01, materially edit target agency transition or source evidence through existing Director/Public Project APIs. Assert `STALE · AUTHORITY REMOVED`; Sequence remains review-blocked until explicit Revoke or Review New Revision.

- [ ] **Step 4: Dismissal/revision browser chain**

Reject unchanged Candidate -> hidden. Change compatible material evidence -> new fingerprint Candidate. Confirm REV 01 -> make stale -> Review New Revision -> REV 02 current/REV 01 superseded. REV 01 release does not transfer to REV 02.

- [ ] **Step 5: Extend CI contracts/syntax/Pages**

Contracts:

```bash
node --test visual-direction-os/project-constraint-registry.test.js
node --test visual-direction-os/project-constraint-project-state.test.js
node --test visual-direction-os/project-constraint-candidates.test.js
node --test visual-direction-os/project-constraint-authority.test.js
node --test visual-direction-os/visual-sequence-project-constraints.test.js
node --test visual-direction-os/project-constraint-inspector.test.js
node --test visual-direction-os/project-constraint-workspace.test.js
```

Syntax includes all five new runtime JS modules plus `visual-sequence-project-constraints.js`. Pages assembly asserts all six new runtime/style assets. Browser CI appends `project-constraint-browser.spec.js` and keeps every M0–M6 suite.

- [ ] **Step 6: Run complete Node verification**

```bash
node --test visual-direction-os/project-constraint-registry.test.js
node --test visual-direction-os/project-constraint-project-state.test.js
node --test visual-direction-os/project-constraint-candidates.test.js
node --test visual-direction-os/project-constraint-authority.test.js
node --test visual-direction-os/visual-sequence-project-constraints.test.js
node --test visual-direction-os/project-constraint-inspector.test.js
node --test visual-direction-os/project-constraint-workspace.test.js
node --test visual-direction-os/project-intelligence.test.js
node --test visual-direction-os/project-intelligence-aggregate.test.js
node --test visual-direction-os/visual-sequence-completion.test.js
node visual-direction-os/project-contracts.test.js
node visual-direction-os/project-state.test.js
node visual-direction-os/project-persistence.test.js
node api/narrative/_contracts-sequence-completion.test.js
node api/narrative/_prompts.test.js
```

Expected: 0 failures.

- [ ] **Step 7: Run full browser regression**

```bash
python3 -m http.server 4173 --directory visual-direction-os >/tmp/vdos-m7-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID || true' EXIT
npx playwright test \
  visual-direction-os/director-v2-rail-intent.spec.js \
  visual-direction-os/visual-ir-shadow.spec.js \
  visual-direction-os/visual-compiler-shadow.spec.js \
  visual-direction-os/visual-authority-handoff.spec.js \
  visual-direction-os/visual-sequence-compiler-first.spec.js \
  visual-direction-os/narrative-workspace.spec.js \
  visual-direction-os/project-workspace.spec.js \
  visual-direction-os/project-intelligence-browser.spec.js \
  visual-direction-os/project-constraint-browser.spec.js \
  --reporter=line --workers=1
```

Expected: 0 failures.

- [ ] **Step 8: Commit final browser/CI gate**

```bash
git add visual-direction-os/project-constraint-browser.spec.js .github/workflows/director-intelligence-ci.yml
git commit -m "test: verify project constraint authority end to end"
```

- [ ] **Step 9: Require fresh exact-HEAD GitHub Actions**

Require `contracts: success` and `browser: success` for the exact final commit. Any subsequent fix invalidates earlier verification.

- [ ] **Step 10: Re-check baseline + PR safety**

Against `fbf3329557c02452a9175ab0d9ed02bf55a8368a` require `status=ahead`, `behind_by=0`, and identical merge base. PR #4 remains `open`, `draft=true`, `merged=false`, base `integration/director-workspace-v2-1`.

- [ ] **Step 11: Update Draft PR metadata only after verification**

Title:

```text
Phase II M7: guarded Project Constraint Authority
```

Body includes Candidate eligibility, Director Confirm/Reject, revision/staleness, pre-AI conflict blocking, no Project write owner, exact final HEAD/CI run, commit-pinned raw.githack review URL, and “keep Draft / do not merge yet”.

---

## Final Acceptance Checklist

- Prospective immediate-next Candidate generation only.
- Exact expected value comes from current compiler-backed final source Scene State.
- Dismissal identity works; compatible material evidence change can re-propose.
- REV 01/REV N history is explicit and immutable.
- Release is revision-local.
- Legacy Projects load without migration.
- Staleness uses canonical snapshot inequality, not digest inequality alone.
- STALE has zero exact authority and blocks for Director review.
- Matching supported Scene Compiler result is `SATISFIED`.
- Unsupported target Grammar is a reachable `CONFLICT`; defensive supported-value disagreement is also handled.
- Conflict/stale causes zero AI Sequence requests.
- M7 never mutates base Skeleton to invent an exact value.
- Assembler provenance stays `owner: compiler`; M7 IDs/revisions are annotations only.
- Canonical Scene State changes only after Apply.
- M6 stays read-only; Arc/Continuity/M3/M4/M5/M6 regressions pass.
- Director Control renders after M6 and has no auto-fix/force-Project action.
- Fresh exact-HEAD contracts + browser CI pass.
- PR #4 remains Draft and unmerged.
