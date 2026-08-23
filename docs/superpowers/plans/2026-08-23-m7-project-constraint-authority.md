# M7 Project Constraint Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build M7 Project Constraint Authority so high-evidence cross-Scene ownership relationships can become Director-confirmed, revisioned Project commitments that guard future M5 Sequence synthesis without creating a new Scene State writer.

**Architecture:** M6 remains read-only and derives the evidence basis. M7 adds a dependency-light Project Constraint Registry, pure Candidate derivation, a pure runtime Authority resolver, and a thin Sequence bridge that blocks AI completion before request time when a confirmed constraint is stale or conflicts with current Scene Compiler truth. Project decisions persist in Project State; runtime states remain derived. M5 remains the exact value writer through the existing Scene Compiler and assembler, while M7 only adds guard semantics and provenance annotations.

**Tech Stack:** Vanilla JavaScript UMD modules, Node `node:test`, browser Playwright, existing Project Store/localStorage persistence, existing M5 Visual Compiler/Skeleton/Completion pipeline, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-23-m7-project-constraint-authority-design.md`

## Global Constraints

- M6 `PROJECT INTELLIGENCE · SHADOW` remains read-only.
- Candidate authority is zero until explicit Director confirmation.
- M7 v1 never introduces `owner: project` as a Scene State writer.
- Project constraints never silently override a supported Scene Compiler expectation.
- Project/Scene conflicts and stale confirmed constraints block Sequence **before** the AI request.
- AI never arbitrates Project-vs-Scene authority.
- Authority-bearing Candidate generation is prospective, immediate-next-Scene only, and primarily `SETUP` scoped.
- Exact authority paths in v1 are limited to `agency`, `camera.perspective`, and `color.territory`; cross-Scene Candidate generation primarily uses Camera/Color.
- `ai-completed`, `legacy`, `unknown`, `blocked`, partial, unsupported, divergent, handoff-mismatched, non-adjacent, or already-directed targets never produce authority Candidates.
- M6 `WARN` is diagnostic evidence, not auto-repair input.
- Missing `projectConstraints` is valid legacy state and normalizes to an empty registry.
- Persist only Director decisions/history; derive `ACTIVE`, `SATISFIED`, `CONFLICT`, `STALE`, `INAPPLICABLE` at runtime.
- Staleness compares canonical evidence snapshot content, not digest alone.
- Fingerprint digest is deterministic 64-bit FNV-1a over UTF-8 canonical JSON using `BigInt`; it is not a security signature.
- Revision history is explicit: `currentRevision` + immutable `revisions{}`.
- Release exceptions bind to exactly one constraint revision and never auto-transfer to a new revision.
- Grammar changes remain allowed; unsupported target Grammar for a confirmed path yields review conflict, not forced Grammar change.
- Existing M3/M4/M5/M6 semantics remain unchanged unless this plan explicitly adds read-only M7 annotations.
- Canonical Scene State still mutates only through explicit Apply.
- Existing PR #4 stays Draft and must not be merged during M7 implementation.

---

## File Map

### New runtime modules

- `visual-direction-os/project-constraint-registry.js` — canonical serialization/fingerprints, registry validation, Director decision transforms, revisions, dismissals, release exceptions.
- `visual-direction-os/project-constraint-candidates.js` — pure prospective Candidate derivation from M6 + Project State and current dismissal ledger.
- `visual-direction-os/project-constraint-authority.js` — pure runtime revalidation and `ACTIVE/SATISFIED/CONFLICT/STALE/INAPPLICABLE` resolution.
- `visual-direction-os/visual-sequence-project-constraints.js` — thin pre-AI bridge from base M5 Skeleton to M7 authority resolution and Sequence gate/context.
- `visual-direction-os/project-constraint-inspector.js` — pure Project Constraint Director Control renderer.
- `visual-direction-os/project-constraint.css` — restrained styles for Candidate/confirmed/conflict/stale cards.

### New tests

- `visual-direction-os/project-constraint-registry.test.js`
- `visual-direction-os/project-constraint-project-state.test.js`
- `visual-direction-os/project-constraint-candidates.test.js`
- `visual-direction-os/project-constraint-authority.test.js`
- `visual-direction-os/visual-sequence-project-constraints.test.js`
- `visual-direction-os/project-constraint-inspector.test.js`
- `visual-direction-os/project-constraint-browser.spec.js`

### Existing files to modify

- `visual-direction-os/project-contracts.js` — accept optional registry and delegate validation to the registry module.
- `visual-direction-os/project-state.js` — expose a validated `setProjectConstraints(registry)` mutation for explicit Director decisions only.
- `visual-direction-os/project-persistence.test.js` — prove legacy load and registry round-trip.
- `visual-direction-os/project-bootstrap.js` — load M7 dependencies in deterministic order and provide current Project constraint context to Narrative Workspace.
- `visual-direction-os/project-workspace.js` — render Director Control after M6 and wire confirm/reject/revoke/review/release actions through Project Store.
- `visual-direction-os/narrative-workspace.js` — run M7 gate after base Skeleton compilation and before `beginRequest('sequence')`/AI call.
- `visual-direction-os/visual-sequence-completion.js` — add optional satisfied Project constraint provenance annotations without changing value ownership.
- `visual-direction-os/visual-sequence-completion.test.js` — prove annotations preserve `owner: compiler` and do not change values.
- `visual-direction-os/narrative-api-client.js` — pass optional read-only `projectConstraintContext` to Sequence API.
- `api/narrative/_contracts.js` — accept/validate optional read-only Project constraint Sequence context.
- `api/narrative/_prompts.js` — explain Project constraint context to AI while explicitly forbidding constrained-path writes.
- `api/narrative/_contracts-sequence-completion.test.js`
- `api/narrative/_prompts.test.js`
- `.github/workflows/director-intelligence-ci.yml` — add M7 contracts, syntax, Pages assets, and browser acceptance.

---

### Task 1: Registry primitives, canonical evidence identity, revisions, and Director decisions

**Files:**
- Create: `visual-direction-os/project-constraint-registry.js`
- Create: `visual-direction-os/project-constraint-registry.test.js`

**Interfaces:**
- Produces:
  - `REGISTRY_VERSION = '0.1.0'`
  - `AUTHORITY_CONTRACT_VERSION = '0.1.0'`
  - `createEmptyRegistry() -> {schemaVersion,constraints,dismissals}`
  - `canonicalize(value) -> JSON-compatible value`
  - `canonicalJSONString(value) -> string`
  - `fnv1a64(input) -> 16-char lowercase hex string`
  - `fingerprintSnapshot(prefix, snapshot) -> string`
  - `validateRegistry(registry) -> {valid,errors,value?}`
  - `confirmCandidate(registry, candidate) -> registry`
  - `rejectCandidate(registry, candidate) -> registry`
  - `revokeConstraint(registry, constraintId) -> registry`
  - `releaseConstraintScope(registry, constraintId, {sceneId,beatId}) -> registry`
  - `reconfirmConstraint(registry, constraintId, candidate) -> registry`
  - `getCurrentRevision(constraint) -> revision|null`
- Consumes no Project Store and no M6 modules; keep this module dependency-light so it can load before `project-contracts.js`.

- [ ] **Step 1: Write failing canonicalization/fingerprint tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('./project-constraint-registry.js');

test('canonical JSON ignores object insertion order but preserves arrays', () => {
  const a = { z: 1, a: { y: 2, x: 3 }, list: ['b','a'] };
  const b = { list: ['b','a'], a: { x: 3, y: 2 }, z: 1 };
  assert.equal(registry.canonicalJSONString(a), registry.canonicalJSONString(b));
  assert.equal(registry.fingerprintSnapshot('pcf', a), registry.fingerprintSnapshot('pcf', b));
  assert.match(registry.fingerprintSnapshot('pcf', a), /^pcf-[0-9a-f]{16}$/);
});

test('canonicalization omits undefined object keys', () => {
  assert.equal(registry.canonicalJSONString({ a:1, b:undefined }), '{"a":1}');
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test visual-direction-os/project-constraint-registry.test.js
```

Expected: FAIL because `project-constraint-registry.js` does not exist.

- [ ] **Step 3: Implement canonicalization and deterministic FNV-1a**

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

function canonicalJSONString(value) {
  return JSON.stringify(canonicalize(value));
}

function fnv1a64(input) {
  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(String(input))) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash.toString(16).padStart(16, '0');
}
```

- [ ] **Step 4: Add RED tests for registry lifecycle**

Use a deterministic Candidate fixture:

```js
const candidate = {
  candidateId:'candidate-scene02-scene03-camera-carry',
  candidateFingerprint:'pcand-1111111111111111',
  type:'ownership-carry',
  family:'camera',
  path:'camera.perspective',
  expected:'mixed',
  scope:{sourceSceneId:'scene-02',targetSceneId:'scene-03',beatIds:['setup']},
  evidenceSnapshot:{sourceSceneId:'scene-02',targetSceneId:'scene-03',path:'camera.perspective',expected:'mixed'}
};

test('confirm creates revision 1 and preserves immutable evidence snapshot', () => {
  const next = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const item = Object.values(next.constraints)[0];
  assert.equal(item.decision, 'confirmed');
  assert.equal(item.currentRevision, 1);
  assert.equal(item.revisions['1'].state, 'current');
  assert.equal(item.revisions['1'].expected, 'mixed');
  assert.deepEqual(item.revisions['1'].evidence.canonicalSnapshot, candidate.evidenceSnapshot);
});

test('reject stores only candidate fingerprint', () => {
  const next = registry.rejectCandidate(registry.createEmptyRegistry(), candidate);
  assert.equal(next.dismissals[candidate.candidateFingerprint].decision, 'rejected');
  assert.deepEqual(next.constraints, {});
});

test('reconfirm supersedes old revision and release exception stays revision-local', () => {
  let state = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const id = Object.keys(state.constraints)[0];
  state = registry.releaseConstraintScope(state, id, {sceneId:'scene-03',beatId:'setup'});
  const changed = {...candidate, expected:'character', evidenceSnapshot:{...candidate.evidenceSnapshot,expected:'character'}};
  state = registry.reconfirmConstraint(state, id, changed);
  assert.equal(state.constraints[id].currentRevision, 2);
  assert.equal(state.constraints[id].revisions['1'].state, 'superseded');
  assert.equal(state.constraints[id].revisions['1'].exceptions.length, 1);
  assert.equal(state.constraints[id].revisions['2'].exceptions.length, 0);
});
```

- [ ] **Step 5: Implement registry lifecycle + validator minimally**

Validation must reject:
- unknown `schemaVersion`;
- `confirmed` constraint with missing current revision;
- current revision whose `state !== 'current'`;
- release exception whose `revision` differs from containing revision;
- missing `canonicalSnapshot` or fingerprint;
- invalid decision other than `confirmed`/`revoked`.

Do not persist `ACTIVE/SATISFIED/CONFLICT/STALE/INAPPLICABLE` anywhere in registry data.

- [ ] **Step 6: Run GREEN**

```bash
node --test visual-direction-os/project-constraint-registry.test.js
node --check visual-direction-os/project-constraint-registry.js
```

Expected: PASS, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/project-constraint-registry.js visual-direction-os/project-constraint-registry.test.js
git commit -m "feat: add project constraint registry primitives"
```

---

### Task 2: Backward-compatible Project State + persistence integration

**Files:**
- Modify: `visual-direction-os/project-contracts.js`
- Modify: `visual-direction-os/project-state.js`
- Create: `visual-direction-os/project-constraint-project-state.test.js`
- Modify: `visual-direction-os/project-persistence.test.js`
- Modify: `visual-direction-os/project-bootstrap.js` load order only in this task

**Interfaces:**
- `project-contracts.js` consumes `VDOSProjectConstraintRegistry.validateRegistry`.
- `project-state.js` adds `setProjectConstraints(nextRegistry)`.
- Older Project objects with no `projectConstraints` remain valid and unchanged until the first Director decision.

- [ ] **Step 1: Write RED tests for legacy and new Project contracts**

```js
test('legacy project without projectConstraints remains valid', () => {
  const legacy = validProjectFixture();
  delete legacy.projectConstraints;
  assert.equal(contracts.validateProjectState(legacy).valid, true);
});

test('project accepts a valid M7 registry and rejects an invalid one', () => {
  const project = validProjectFixture();
  project.projectConstraints = registry.createEmptyRegistry();
  assert.equal(contracts.validateProjectState(project).valid, true);
  project.projectConstraints = {schemaVersion:'broken',constraints:{},dismissals:{}};
  assert.equal(contracts.validateProjectState(project).valid, false);
});
```

- [ ] **Step 2: Write RED store mutation test**

```js
test('setProjectConstraints commits only validated Director registry state', () => {
  const store = stateApi.createProjectStore(validProjectFixture());
  const nextRegistry = registry.rejectCandidate(registry.createEmptyRegistry(), candidateFixture());
  const result = store.setProjectConstraints(nextRegistry);
  assert.deepEqual(result.projectConstraints, nextRegistry);
  assert.throws(() => store.setProjectConstraints({schemaVersion:'bad'}), /Invalid Project Constraint Registry/);
});
```

- [ ] **Step 3: Run RED**

```bash
node --test visual-direction-os/project-constraint-project-state.test.js
node visual-direction-os/project-persistence.test.js
```

Expected: FAIL because Project contracts/store do not know `projectConstraints` or `setProjectConstraints`.

- [ ] **Step 4: Implement Project contract delegation and store mutation**

At UMD load:

```js
const constraintRegistry = typeof module === 'object' && module.exports
  ? require('./project-constraint-registry.js')
  : root?.VDOSProjectConstraintRegistry;
```

In `validateProjectState`:

```js
if (value.projectConstraints != null) {
  const checked = constraintRegistry.validateRegistry(value.projectConstraints);
  checked.errors.forEach(error => errors.push(`projectConstraints.${error}`));
}
```

In Project Store:

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

Do not add runtime authority status fields to Project State.

- [ ] **Step 5: Update Bootstrap deterministic load order**

Load dependency-light registry first, then Project contracts:

```js
await loadScript(`project-constraint-registry.js?v=${VERSION}`, 'VDOSProjectConstraintRegistry');
await Promise.all([
  loadStyle(`project-workspace.css?v=${VERSION}`),
  loadStyle(`project-context.css?v=${VERSION}`),
  loadStyle(`project-intelligence.css?v=${VERSION}`),
  loadScript(`project-contracts.js?v=${VERSION}`, 'VDOSProjectContracts'),
  loadScript(`project-context.js?v=${VERSION}`, 'VDOSProjectContextContract')
]);
```

Do not load Candidates/Authority/UI yet; later tasks add them.

- [ ] **Step 6: Add persistence round-trip test**

```js
test('persistence round-trips a confirmed registry and still loads legacy projects', () => {
  const storage = memoryStorage();
  const persistence = createProjectPersistence({storage,key:'m7'});
  const project = validProjectFixture();
  project.projectConstraints = confirmedRegistryFixture();
  persistence.save(project);
  assert.deepEqual(persistence.load().projectConstraints, project.projectConstraints);

  storage.setItem('m7', JSON.stringify({version:1,project:legacyProjectFixture()}));
  assert.equal(persistence.load().projectConstraints, undefined);
});
```

- [ ] **Step 7: Run GREEN**

```bash
node --test visual-direction-os/project-constraint-project-state.test.js
node visual-direction-os/project-contracts.test.js
node visual-direction-os/project-state.test.js
node visual-direction-os/project-persistence.test.js
node --check visual-direction-os/project-contracts.js
node --check visual-direction-os/project-state.js
node --check visual-direction-os/project-bootstrap.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/project-contracts.js visual-direction-os/project-state.js visual-direction-os/project-bootstrap.js visual-direction-os/project-constraint-project-state.test.js visual-direction-os/project-persistence.test.js
git commit -m "feat: persist project constraint decisions"
```

---

### Task 3: Prospective Candidate derivation from M6 evidence

**Files:**
- Create: `visual-direction-os/project-constraint-candidates.js`
- Create: `visual-direction-os/project-constraint-candidates.test.js`

**Interfaces:**
- Consumes:
  - `projectIntelligence` from `deriveProjectIntelligence(projectState)`.
  - registry `canonicalJSONString()` + `fingerprintSnapshot()`.
- Produces:
  - `buildConstraintEvidenceSnapshot({projectState,projectIntelligence,sourceSceneId,targetSceneId,family,path,type,beatIds})`
  - `deriveProjectConstraintCandidates({projectState,projectIntelligence,registry}) -> Candidate[]`
- Candidate exact `expected` value must be read from source final Scene State (`workspace.sceneState`) rather than M6 normalized `CONTESTED` labels.

- [ ] **Step 1: Write positive RED Camera carry test**

Create a 3-Scene fixture:
- Scene 01 and Scene 02 directed with compiler-first provenance.
- M6 boundary `scene-01->scene-02` is `PASS`.
- Scene 02 final `camera.perspective === 'mixed'` and M6 source is `compiler-backed`.
- Scene 02 narrative ends `contested`.
- Scene 03 is `undirected` and starts `contested`.

```js
test('derives immediate-next Scene SETUP Camera carry from material compiler-backed evidence', () => {
  const intelligence = deriveProjectIntelligence(project);
  const candidates = deriveProjectConstraintCandidates({projectState:project,projectIntelligence:intelligence,registry:createEmptyRegistry()});
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].type, 'ownership-carry');
  assert.equal(candidates[0].path, 'camera.perspective');
  assert.equal(candidates[0].expected, 'mixed');
  assert.deepEqual(candidates[0].scope.beatIds, ['setup']);
  assert.match(candidates[0].candidateFingerprint, /^pcand-[0-9a-f]{16}$/);
});
```

- [ ] **Step 2: Write RED ineligibility matrix**

Cover each case independently:

```js
for (const name of [
  'ai-completed source',
  'legacy source',
  'unknown/divergent source',
  'blocked source',
  'handoff mismatch',
  'non-adjacent target',
  'already directed target',
  'M6 WARN source relation'
]) {
  test(`${name} does not produce authority Candidate`, () => {
    assert.deepEqual(deriveProjectConstraintCandidates(fixtureFor(name)), []);
  });
}
```

Also prove exact Camera/Color values come from final Scene State, not normalized M6 authority labels.

- [ ] **Step 3: Write dismissal RED test**

```js
test('identical rejected Candidate stays hidden until evidence changes', () => {
  const first = deriveProjectConstraintCandidates(input)[0];
  const dismissed = rejectCandidate(createEmptyRegistry(), first);
  assert.deepEqual(deriveProjectConstraintCandidates({...input,registry:dismissed}), []);

  const changed = deepClone(input.projectState);
  changed.scenes['scene-03'].narrativeRole.turningPoint = 'A materially revised transition.';
  const next = deriveProjectConstraintCandidates({...input,projectState:changed,projectIntelligence:deriveProjectIntelligence(changed),registry:dismissed});
  assert.equal(next.length, 1);
  assert.notEqual(next[0].candidateFingerprint, first.candidateFingerprint);
});
```

- [ ] **Step 4: Run RED**

```bash
node --test visual-direction-os/project-constraint-candidates.test.js
```

Expected: FAIL because Candidate module is missing.

- [ ] **Step 5: Implement minimal pure derivation**

Algorithm:

```js
for each sourceSceneId at index 1..sceneOrder.length-2:
  sourceBoundary = intelligence.boundaries.find(toSceneId === sourceSceneId)
  targetSceneId = sceneOrder[index + 1]
  require sourceBoundary.status === 'PASS'
  require target.status.visual !== 'directed'
  require source narrative end === target narrative start
  for family/path in [['camera','camera.perspective'],['color','color.territory']]:
    require source record sources[family] === 'compiler-backed'
    require sourceBoundary visualResponse contains changed compiler-backed item for family
    read exact expected from source workspace.sceneState
    build canonical evidence snapshot
    candidateFingerprint = fingerprintSnapshot('pcand', snapshot)
    skip if registry.dismissals[candidateFingerprint]
    emit Candidate scoped to target SETUP
```

Keep `transfer-completion` reserved; do not emit it in Task 3.

- [ ] **Step 6: Run GREEN + immutability/determinism**

```bash
node --test visual-direction-os/project-constraint-candidates.test.js
node --check visual-direction-os/project-constraint-candidates.js
```

Add assertions that inputs are unchanged and repeated derivation is deep-equal.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/project-constraint-candidates.js visual-direction-os/project-constraint-candidates.test.js
git commit -m "feat: derive prospective project constraint candidates"
```

---

### Task 4: Runtime Project Constraint Authority resolver

**Files:**
- Create: `visual-direction-os/project-constraint-authority.js`
- Create: `visual-direction-os/project-constraint-authority.test.js`

**Interfaces:**
- Consumes registry, Candidate evidence snapshot builder, and `visual-compiler.js`.
- Produces:
  - `resolveProjectConstraintAuthority({projectState,projectIntelligence,registry,targetSceneId,visualIR,baseSkeleton})`
  - return shape:

```js
{
  mode:'guarded',
  targetSceneId,
  safeToComplete,
  resolutions:[{
    constraintId,
    revision,
    status:'ACTIVE'|'SATISFIED'|'CONFLICT'|'STALE'|'INAPPLICABLE',
    path,
    beatId,
    expected,
    sceneExpected,
    reason
  }],
  conflicts:[],
  projectConstraintContext:{targetSceneId,constraints:[]}
}
```

- [ ] **Step 1: Write RED staleness tests**

```js
test('changed canonical evidence makes confirmed constraint STALE with zero authority', () => {
  const result = resolveProjectConstraintAuthority(staleFixture());
  assert.equal(result.safeToComplete, false);
  assert.equal(result.resolutions[0].status, 'STALE');
  assert.equal(result.resolutions[0].sceneExpected, null);
});
```

Test staleness for:
- source final value change;
- source Reading/Strategy/Grammar/applied Beat change;
- target narrative transition change;
- source/target adjacency reorder.

- [ ] **Step 2: Write RED satisfied/conflict tests**

Use target Scene `SETUP` agency from base Skeleton.

```js
test('matching Scene Compiler expectation is SATISFIED', () => {
  const result = resolveProjectConstraintAuthority(cameraSatisfiedFixture());
  assert.equal(result.safeToComplete, true);
  assert.equal(result.resolutions[0].status, 'SATISFIED');
  assert.equal(result.resolutions[0].expected, 'mixed');
  assert.equal(result.resolutions[0].sceneExpected, 'mixed');
});

test('different supported Scene Compiler expectation is CONFLICT', () => {
  const result = resolveProjectConstraintAuthority(cameraConflictFixture());
  assert.equal(result.safeToComplete, false);
  assert.equal(result.resolutions[0].status, 'CONFLICT');
  assert.equal(result.resolutions[0].reason, 'SCENE_COMPILER_DISAGREES');
});

test('target Grammar without exact path support is review conflict', () => {
  const result = resolveProjectConstraintAuthority(unsupportedTargetGrammarFixture());
  assert.equal(result.safeToComplete, false);
  assert.equal(result.resolutions[0].reason, 'TARGET_GRAMMAR_UNSUPPORTED');
});
```

- [ ] **Step 3: Write RED release/revoke tests**

```js
test('matching revision-local release makes constraint INAPPLICABLE and non-blocking', () => {
  const result = resolveProjectConstraintAuthority(releasedFixture());
  assert.equal(result.safeToComplete, true);
  assert.equal(result.resolutions[0].status, 'INAPPLICABLE');
});

test('revoked constraints do not participate', () => {
  const result = resolveProjectConstraintAuthority(revokedFixture());
  assert.deepEqual(result.resolutions, []);
  assert.equal(result.safeToComplete, true);
});
```

- [ ] **Step 4: Run RED**

```bash
node --test visual-direction-os/project-constraint-authority.test.js
```

Expected: FAIL because authority module is missing.

- [ ] **Step 5: Implement resolver in strict order**

Per confirmed current revision targeting `targetSceneId`:

```text
1. matching current-revision release? -> INAPPLICABLE
2. rebuild current canonical evidence snapshot
3. snapshot content differs? -> STALE, safeToComplete=false
4. no baseSkeleton yet? -> ACTIVE
5. locate scoped deterministic endpoint Beat (`setup` in v1)
6. derive Scene Compiler supported assertion using Visual Compiler
7. no supported assertion for path? -> CONFLICT/TARGET_GRAMMAR_UNSUPPORTED
8. assertion.expected === revision.expected? -> SATISFIED
9. otherwise -> CONFLICT/SCENE_COMPILER_DISAGREES
```

`projectConstraintContext.constraints` includes only `SATISFIED` entries and is explanatory/read-only.

- [ ] **Step 6: Run GREEN + immutability**

```bash
node --test visual-direction-os/project-constraint-authority.test.js
node --check visual-direction-os/project-constraint-authority.js
```

Assert no input mutation and deterministic repeat output.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/project-constraint-authority.js visual-direction-os/project-constraint-authority.test.js
git commit -m "feat: resolve guarded project constraint authority"
```

---

### Task 5: Guard M5 Sequence before AI and annotate compiler provenance

**Files:**
- Create: `visual-direction-os/visual-sequence-project-constraints.js`
- Create: `visual-direction-os/visual-sequence-project-constraints.test.js`
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/project-bootstrap.js`
- Modify: `visual-direction-os/visual-sequence-completion.js`
- Modify: `visual-direction-os/visual-sequence-completion.test.js`
- Modify: `visual-direction-os/narrative-api-client.js`
- Modify: `api/narrative/_contracts.js`
- Modify: `api/narrative/_contracts-sequence-completion.test.js`
- Modify: `api/narrative/_prompts.js`
- Modify: `api/narrative/_prompts.test.js`

**Interfaces:**
- `guardProjectConstraints(args)` returns authority result or throws `PROJECT_CONSTRAINT_REVIEW_REQUIRED` before AI request.
- Narrative Workspace receives:
  - `projectConstraintGuard`
  - `projectConstraintProvider() -> {projectState,projectIntelligence,registry,targetSceneId}`
- `assembleSequenceProposal` gains optional `projectConstraintResolutions=[]`.

- [ ] **Step 1: Write RED bridge tests**

```js
test('guard returns satisfied read-only context without mutating Skeleton', () => {
  const before = structuredClone(skeleton);
  const result = bridge.guardProjectConstraints({...fixture,skeleton});
  assert.equal(result.safeToComplete, true);
  assert.equal(result.projectConstraintContext.constraints[0].resolution, 'satisfied');
  assert.deepEqual(skeleton, before);
});

test('guard throws review-required for conflict or stale', () => {
  assert.throws(
    () => bridge.guardProjectConstraints(conflictFixture()),
    error => error.code === 'PROJECT_CONSTRAINT_REVIEW_REQUIRED'
  );
});
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/visual-sequence-project-constraints.test.js
```

Expected: FAIL because bridge is missing.

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

- [ ] **Step 4: Integrate guard into `requestSequence()` before AI request creation**

After base Skeleton compilation/reuse, but before:

```js
({ token,controller } = beginRequest('sequence'));
rawCompletion = await api.sequence(...);
```

insert:

```js
const constraintInput = projectConstraintProvider?.() || null;
const constraintResult = constraintInput
  ? projectConstraintGuard.guardProjectConstraints({
      ...constraintInput,
      visualIR,
      baseSkeleton:skeleton
    })
  : { projectConstraintContext:null, resolutions:[] };
```

Then call AI only after guard succeeds:

```js
({ token,controller } = beginRequest('sequence'));
rawCompletion = await api.sequence({
  narrative:current.input,
  directorIntent:current.directorIntent,
  reading:current.confirmedReading,
  strategy:current.selectedStrategy,
  sequenceSkeleton:skeleton,
  projectConstraintContext:constraintResult.projectConstraintContext
}, controller.signal);
```

The pre-token/pre-controller guard path must render a recoverable Sequence error with code `PROJECT_CONSTRAINT_REVIEW_REQUIRED`; it must not fabricate a failed API request token.

- [ ] **Step 5: Bootstrap M7 context provider**

Load modules after M6 and before Project Workspace/Narrative use:

```js
await loadScript(`project-constraint-candidates.js?v=${VERSION}`, 'VDOSProjectConstraintCandidates');
await loadScript(`project-constraint-authority.js?v=${VERSION}`, 'VDOSProjectConstraintAuthority');
await loadScript(`visual-sequence-project-constraints.js?v=${VERSION}`, 'VDOSVisualSequenceProjectConstraints');
```

When restoring Narrative Workspace, pass:

```js
projectConstraintGuard: root.VDOSVisualSequenceProjectConstraints,
projectConstraintProvider: () => {
  const projectState = store.getProject();
  return {
    projectState,
    projectIntelligence: root.VDOSProjectIntelligence.deriveProjectIntelligence(projectState),
    registry: projectState?.projectConstraints || root.VDOSProjectConstraintRegistry.createEmptyRegistry(),
    targetSceneId: projectState?.activeSceneId || null
  };
}
```

- [ ] **Step 6: Add assembler provenance RED tests**

```js
test('satisfied Project constraint annotates compiler provenance without changing owner/value', () => {
  const assembled = assembleSequenceProposal({
    skeleton, completion, visualIR,
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

Top-level provenance:

```js
sequenceProvenance.projectConstraints = {
  registryVersion:'0.1.0',
  resolutions:[{constraintId,revision,result:'satisfied',beatId,path}]
};
```

Do not annotate conflict/stale paths because Sequence must not reach assembly.

- [ ] **Step 7: Extend API contract/prompt with read-only context**

Contract accepts optional:

```js
projectConstraintContext: {
  targetSceneId: string,
  constraints: [{
    constraintId:string,
    revision:number,
    type:string,
    beatId:'setup',
    path:'camera.perspective'|'color.territory'|'agency',
    expected:string,
    resolution:'satisfied'
  }]
}
```

Prompt text must include an explicit instruction equivalent to:

```text
Project Constraint Context is explanatory only. Do not write, override, or infer constrained paths. Return only AI-open completion fields allowed by the supplied Sequence Skeleton.
```

- [ ] **Step 8: Prove AI is never called on conflict**

Add Narrative Workspace unit/integration test with a spy API:

```js
let sequenceCalls = 0;
const api = { ...baseApi, async sequence(){ sequenceCalls += 1; return fixture; } };
// guard fixture returns conflict
await triggerSequence();
assert.equal(sequenceCalls, 0);
assert.match(rootNode.textContent, /PROJECT_CONSTRAINT_REVIEW_REQUIRED|Project constraint review/i);
```

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

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add visual-direction-os/visual-sequence-project-constraints.js visual-direction-os/visual-sequence-project-constraints.test.js visual-direction-os/narrative-workspace.js visual-direction-os/project-bootstrap.js visual-direction-os/visual-sequence-completion.js visual-direction-os/visual-sequence-completion.test.js visual-direction-os/narrative-api-client.js api/narrative/_contracts.js api/narrative/_contracts-sequence-completion.test.js api/narrative/_prompts.js api/narrative/_prompts.test.js
git commit -m "feat: guard compiler-first Sequence with project constraints"
```

---

### Task 6: Project Constraints · Director Control UI and explicit decision actions

**Files:**
- Create: `visual-direction-os/project-constraint-inspector.js`
- Create: `visual-direction-os/project-constraint-inspector.test.js`
- Create: `visual-direction-os/project-constraint.css`
- Modify: `visual-direction-os/project-workspace.js`
- Modify: `visual-direction-os/project-bootstrap.js`
- Modify: `visual-direction-os/project-workspace.spec.js` only for stable ordering/non-regression assertions if needed

**Interfaces:**
- Inspector consumes `{candidates,authorityState,registry}` and renders HTML only.
- Project Workspace derives Candidates/Authority state read-only, then invokes registry transforms + `store.setProjectConstraints()` only from explicit button actions.
- UI order:

```text
PROJECT ARC
↓
CROSS-SCENE CONTINUITY
↓
PROJECT INTELLIGENCE · SHADOW
↓
PROJECT CONSTRAINTS · DIRECTOR CONTROL
```

- [ ] **Step 1: Write RED pure renderer tests**

```js
test('renders zero-authority Candidate with Confirm and Reject', () => {
  const html = renderProjectConstraints({candidates:[candidate],registry:createEmptyRegistry(),authorityState:null});
  assert.match(html, /PROJECT CONSTRAINTS · DIRECTOR CONTROL/);
  assert.match(html, /CANDIDATE/);
  assert.match(html, /CONFIRM/);
  assert.match(html, /REJECT/);
  assert.doesNotMatch(html, /owner: project/i);
});

test('renders stale as AUTHORITY REMOVED and conflict as AI COMPLETION NOT STARTED', () => {
  assert.match(renderProjectConstraints(staleState), /AUTHORITY REMOVED/);
  assert.match(renderProjectConstraints(conflictState), /AI COMPLETION[\s\S]*NOT STARTED/);
});
```

Also test dynamic content escaping.

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/project-constraint-inspector.test.js
```

Expected: FAIL because inspector is missing.

- [ ] **Step 3: Implement pure renderer + CSS**

Required Candidate copy:

```text
PROJECT CONSTRAINTS · DIRECTOR CONTROL
CANDIDATE
OWNERSHIP CARRY
SOURCE
TARGET
EVIDENCE · COMPILER-BACKED
[REJECT] [CONFIRM]
```

Required confirmed runtime labels:

```text
CONFIRMED · ACTIVE
CONFIRMED · SATISFIED
CONFIRMED · CONFLICT
STALE · AUTHORITY REMOVED
REVOKED
```

Do not add a numeric score, `Fix automatically`, or `Force Project Value` button.

- [ ] **Step 4: Load inspector/styles in Bootstrap**

Add style:

```js
loadStyle(`project-constraint.css?v=${VERSION}`)
```

After Candidate/Authority modules:

```js
await loadScript(`project-constraint-inspector.js?v=${VERSION}`, 'VDOSProjectConstraintInspector');
```

Then load `project-workspace.js`.

- [ ] **Step 5: Wire Project Workspace rendering**

Inside Project rendering:

```js
const registryState = project?.projectConstraints || constraintRegistry.createEmptyRegistry();
const candidates = constraintCandidates.deriveProjectConstraintCandidates({
  projectState:project,
  projectIntelligence:intelligenceState,
  registry:registryState
});
const authorityState = constraintAuthority.resolveProjectConstraintAuthority({
  projectState:project,
  projectIntelligence:intelligenceState,
  registry:registryState,
  targetSceneId:project?.activeSceneId || null,
  visualIR:null,
  baseSkeleton:null
});
```

At Project overview level, no Skeleton means confirmed relevant constraints may be `ACTIVE`; do not fake `SATISFIED` without a current base Skeleton.

Render after M6:

```js
${renderProjectIntelligence(intelligenceState)}
${renderProjectConstraints({candidates,authorityState,registry:registryState})}
```

- [ ] **Step 6: Wire explicit Director actions only**

Use existing delegated `data-action` pattern:
- `confirm-project-constraint` -> find Candidate -> `confirmCandidate()` -> `store.setProjectConstraints()`.
- `reject-project-constraint` -> `rejectCandidate()` -> persist.
- `revoke-project-constraint` -> `revokeConstraint()` -> persist.
- `release-project-constraint` -> `releaseConstraintScope()` -> persist.
- `review-project-constraint` -> derive current replacement Candidate/evidence, then `reconfirmConstraint()` only after explicit Director click.

Every action must mutate only `project.projectConstraints`, never Scene/Narrative/Sequence state.

- [ ] **Step 7: Add integration mutation-boundary tests**

Before/after Confirm/Reject/Revoke:

```js
const sceneBefore = structuredClone(store.getProject().scenes);
clickConstraintAction();
assert.deepEqual(store.getProject().scenes, sceneBefore);
assert.notDeepEqual(store.getProject().projectConstraints, previousRegistry);
```

- [ ] **Step 8: Run GREEN**

```bash
node --test visual-direction-os/project-constraint-inspector.test.js
node visual-direction-os/project-workspace.test.js 2>/dev/null || true
node --check visual-direction-os/project-constraint-inspector.js
node --check visual-direction-os/project-workspace.js
node --check visual-direction-os/project-bootstrap.js
```

If there is no `project-workspace.test.js`, rely on the existing `project-workspace.spec.js` in Task 7; do not create a fake command or new unrelated unit suite solely to satisfy this step.

- [ ] **Step 9: Commit**

```bash
git add visual-direction-os/project-constraint-inspector.js visual-direction-os/project-constraint-inspector.test.js visual-direction-os/project-constraint.css visual-direction-os/project-workspace.js visual-direction-os/project-bootstrap.js
git commit -m "feat: add project constraint director controls"
```

---

### Task 7: Browser acceptance, CI gates, exact-HEAD verification, and PR metadata

**Files:**
- Create: `visual-direction-os/project-constraint-browser.spec.js`
- Modify: `.github/workflows/director-intelligence-ci.yml`
- Modify: PR #4 metadata only after exact-HEAD verification succeeds.

**Interfaces:**
- Browser tests use existing public `VDOSProjectContext.store/runtime/workspace` and Narrative UI. Do not add production test hooks.

- [ ] **Step 1: Write positive end-to-end browser acceptance**

Build a deterministic three-Scene Project via public Project Store APIs:

```text
Scene 01 directed
↓
Scene 02 directed with compiler-backed Camera MIXED
↓
M6 verifies Scene 01→02
↓
Scene 03 narrative starts CONTESTED and remains undirected
↓
M7 Candidate appears
↓
Director CONFIRM
↓
Open Scene 03
↓
Confirm Reading + compatible Camera strategy
↓
M7 SATISFIED before AI
↓
Sequence Preview
↓
canonical Scene State unchanged
↓
Apply
↓
SETUP camera = MIXED
↓
M5 provenance contains constraint ID/revision while owner remains compiler
```

Assertions must include DOM order:

```js
const intelligenceTop = await page.locator('[data-project-intelligence]').evaluate(el => el.offsetTop);
const constraintsTop = await page.locator('[data-project-constraints]').evaluate(el => el.offsetTop);
expect(constraintsTop).toBeGreaterThan(intelligenceTop);
```

- [ ] **Step 2: Write conflict browser acceptance with AI call count = 0**

Use a deterministic demo API spy or existing demo client instrumentation without adding production hooks. Confirm a Camera carry, then choose/change Scene 03 Reading/Strategy so the current Scene Compiler expects a different exact Camera authority.

Assert:

```text
CONFIRMED · CONFLICT
WRITE AUTHORITY · BLOCKED
AI COMPLETION · NOT STARTED
```

and no Sequence proposal appears; canonical Scene State remains unchanged.

- [ ] **Step 3: Write stale browser acceptance**

After confirming REV 01, mutate source Scene 02 evidence through existing Director/Public Project APIs so canonical evidence changes.

Assert:

```text
STALE · AUTHORITY REMOVED
```

Then verify Sequence remains review-blocked until Director explicitly revokes or reviews a new revision.

- [ ] **Step 4: Write dismissal/revision browser acceptance**

- Reject Candidate -> it disappears and does not reappear on rerender.
- Change material evidence -> new fingerprint Candidate appears.
- Confirm REV 01 -> change evidence -> Review New Revision -> REV 02 current, REV 01 superseded.
- A REV 01 release exception does not auto-transfer to REV 02.

- [ ] **Step 5: Add M7 Node/syntax/Pages gates to CI**

Contracts job adds:

```bash
node --test visual-direction-os/project-constraint-registry.test.js
node --test visual-direction-os/project-constraint-project-state.test.js
node --test visual-direction-os/project-constraint-candidates.test.js
node --test visual-direction-os/project-constraint-authority.test.js
node --test visual-direction-os/visual-sequence-project-constraints.test.js
node --test visual-direction-os/project-constraint-inspector.test.js
```

Syntax adds all six new JS runtime modules.

Pages assembly asserts these exist:

```bash
test -f /tmp/vdos-site/project-constraint-registry.js
test -f /tmp/vdos-site/project-constraint-candidates.js
test -f /tmp/vdos-site/project-constraint-authority.js
test -f /tmp/vdos-site/visual-sequence-project-constraints.js
test -f /tmp/vdos-site/project-constraint-inspector.js
test -f /tmp/vdos-site/project-constraint.css
```

Browser job appends `visual-direction-os/project-constraint-browser.spec.js` while keeping all M0–M6 suites, including `project-workspace.spec.js` and `project-intelligence-browser.spec.js`.

- [ ] **Step 6: Run full local-equivalent verification before final commit**

Run every M7 Node test plus existing directly touched regression suites:

```bash
node --test visual-direction-os/project-constraint-registry.test.js
node --test visual-direction-os/project-constraint-project-state.test.js
node --test visual-direction-os/project-constraint-candidates.test.js
node --test visual-direction-os/project-constraint-authority.test.js
node --test visual-direction-os/visual-sequence-project-constraints.test.js
node --test visual-direction-os/project-constraint-inspector.test.js
node --test visual-direction-os/project-intelligence.test.js
node --test visual-direction-os/project-intelligence-aggregate.test.js
node --test visual-direction-os/visual-sequence-completion.test.js
node visual-direction-os/project-contracts.test.js
node visual-direction-os/project-state.test.js
node visual-direction-os/project-persistence.test.js
node api/narrative/_contracts-sequence-completion.test.js
node api/narrative/_prompts.test.js
```

Then browser:

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

- [ ] **Step 7: Commit CI/browser gate**

```bash
git add visual-direction-os/project-constraint-browser.spec.js .github/workflows/director-intelligence-ci.yml
git commit -m "test: verify project constraint authority end to end"
```

- [ ] **Step 8: Require fresh exact-HEAD GitHub Actions success**

Do not claim M7 complete until the workflow run for the exact final commit reports:

```text
contracts: completed / success
browser: completed / success
```

If the exact HEAD changes after a fix, discard the previous verification and require a new exact-HEAD run.

- [ ] **Step 9: Re-check baseline and PR safety**

Compare final HEAD against:

```text
fbf3329557c02452a9175ab0d9ed02bf55a8368a
```

Require:

```text
status = ahead
behind_by = 0
merge_base = fbf3329557c02452a9175ab0d9ed02bf55a8368a
```

PR #4 must remain:

```text
state = open
draft = true
merged = false
base = integration/director-workspace-v2-1
```

- [ ] **Step 10: Update Draft PR metadata only after verification**

Change title to:

```text
Phase II M7: guarded Project Constraint Authority
```

PR body must include:
- Candidate eligibility;
- explicit Director Confirm/Reject;
- revisioned registry/staleness;
- Project-vs-Scene conflict blocking before AI;
- no `owner: project` write channel;
- exact final HEAD + CI run number;
- commit-pinned raw.githack review URL;
- explicit “keep Draft / do not merge yet”.

---

## Final Acceptance Checklist

M7 is ready for product review only when all are true:

- Candidate generation is prospective and immediate-next-Scene only.
- Candidate exact expected values come from current final source Scene State and compiler-backed provenance.
- Identical dismissed Candidate does not reappear; materially changed evidence can produce a new Candidate.
- Confirm creates revision 1; reconfirm creates revision N+1 and supersedes old revision without rewriting history.
- Release exceptions are revision-local.
- Missing registry remains backward-compatible.
- Runtime stale comparison uses canonical snapshot equality, not digest equality alone.
- Stale current constraint has zero exact authority and blocks for Director review.
- Matching Scene Compiler expectation yields `SATISFIED`.
- Different supported expectation yields `CONFLICT`.
- Unsupported target Grammar yields review conflict without automatic Grammar change.
- Conflict/stale prevents AI Sequence request.
- Satisfied constraint does not modify base Skeleton or Scene Compiler value.
- Assembler provenance still says `owner: compiler`; Project constraint ID/revision is annotation only.
- Canonical Scene State still changes only after explicit Apply.
- M6 remains read-only and unchanged in meaning.
- Existing Project Arc, Continuity, M3, M4, M5, and M6 regressions pass.
- `PROJECT CONSTRAINTS · DIRECTOR CONTROL` renders after M6 and exposes no auto-fix/force-Project button.
- Exact final HEAD receives fresh green contracts + browser CI.
- PR #4 remains Draft and unmerged.
