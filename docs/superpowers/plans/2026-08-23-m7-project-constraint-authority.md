# M7 Project Constraint Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build M7 Project Constraint Authority so high-evidence cross-Scene ownership relationships can become Director-confirmed, revisioned Project commitments that guard future M5 Sequence synthesis without creating a new Scene State writer.

**Architecture:** M6 stays read-only. M7 adds a dependency-light Registry, pure prospective Candidate derivation, a pure runtime Authority resolver, and a thin pre-AI Sequence guard. Project decisions persist; runtime status is recomputed. M5 remains the exact Scene State value writer and M4 remains the final Apply-time Scene authority.

**Tech Stack:** Vanilla JavaScript UMD modules, Node `node:test`, Playwright, existing Project Store/localStorage persistence, existing M5 Visual Compiler/Skeleton/Completion pipeline, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-23-m7-project-constraint-authority-design.md`

## Global Constraints

- M6 `PROJECT INTELLIGENCE · SHADOW` remains read-only.
- Candidate authority is zero until explicit Director confirmation.
- M7 v1 never introduces `owner: project` as a Scene State writer.
- Project constraints never silently override supported Scene Compiler truth.
- Conflict or stale review gates run before `beginRequest('sequence')`; AI request count must remain zero.
- AI never arbitrates Project-vs-Scene authority.
- Authority Candidates are prospective, immediate-next-Scene only, and initially `SETUP` scoped.
- Exact authority paths are limited to `agency`, `camera.perspective`, `color.territory`; Candidate generation initially emits Camera/Color `ownership-carry` only.
- `ai-completed`, `legacy`, `unknown`, `blocked`, partial, unsupported, divergent, handoff-mismatched, non-adjacent, already-directed targets, and M6 `WARN` never create authority Candidates.
- Missing `projectConstraints` remains valid legacy Project state.
- Persist only Director decisions/history; derive `ACTIVE`, `SATISFIED`, `CONFLICT`, `STALE`, `INAPPLICABLE`.
- Staleness compares canonical evidence snapshot content, not digest alone.
- Digest is deterministic UTF-8 FNV-1a 64-bit using `BigInt`; it is an identity helper, not a security signature.
- Registry history uses `currentRevision` + immutable `revisions{}`.
- Release exceptions are revision-local.
- Grammar diversity remains valid. A confirmed path unsupported by the target Grammar is a review conflict, not a reason to rewrite Grammar.
- Canonical Scene State still mutates only after explicit Apply.
- M3/M4/M5/M6 behavior stays intact except for read-only M7 provenance annotation.
- PR #4 remains Draft and unmerged.

---

## File Map

**Create runtime**
- `visual-direction-os/project-constraint-registry.js` — fingerprints, validation, revisions, dismissals, Director decision transforms.
- `visual-direction-os/project-constraint-candidates.js` — pure prospective Candidate derivation.
- `visual-direction-os/project-constraint-authority.js` — pure current-evidence + Scene Compiler resolution.
- `visual-direction-os/visual-sequence-project-constraints.js` — thin pre-AI Sequence guard/context bridge.
- `visual-direction-os/project-constraint-inspector.js` — pure Director Control renderer.
- `visual-direction-os/project-constraint.css` — UI styling.

**Create tests**
- `visual-direction-os/project-constraint-registry.test.js`
- `visual-direction-os/project-constraint-project-state.test.js`
- `visual-direction-os/project-constraint-candidates.test.js`
- `visual-direction-os/project-constraint-authority.test.js`
- `visual-direction-os/visual-sequence-project-constraints.test.js`
- `visual-direction-os/project-constraint-inspector.test.js`
- `visual-direction-os/project-constraint-workspace.test.js`
- `visual-direction-os/project-constraint-browser.spec.js`

**Modify**
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

This module has no dependency on Project Store or M6 so Bootstrap can load it before `project-contracts.js`.

- [ ] **Step 1: Write RED canonicalization/fingerprint tests**

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

test('undefined object properties are omitted', () => {
  assert.equal(registry.canonicalJSONString({a:1,b:undefined}), '{"a":1}');
});
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/project-constraint-registry.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement canonical identity**

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

Use this fixture:

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
```

Assert:

```js
test('confirm creates immutable REV 01', () => {
  const next = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const item = Object.values(next.constraints)[0];
  assert.equal(item.decision, 'confirmed');
  assert.equal(item.currentRevision, 1);
  assert.equal(item.revisions['1'].state, 'current');
  assert.equal(item.revisions['1'].expected, 'mixed');
  assert.deepEqual(item.revisions['1'].evidence.canonicalSnapshot, candidate.evidenceSnapshot);
});

test('reject persists only the Candidate fingerprint', () => {
  const next = registry.rejectCandidate(registry.createEmptyRegistry(), candidate);
  assert.equal(next.dismissals[candidate.candidateFingerprint].decision, 'rejected');
  assert.deepEqual(next.constraints, {});
});

test('reconfirm supersedes REV 01 and does not inherit its release exception', () => {
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

- [ ] **Step 5: Implement lifecycle + validation**

`validateRegistry()` must reject:
- wrong `schemaVersion`;
- invalid decision outside `confirmed|revoked`;
- confirmed constraint without `currentRevision`;
- current revision whose `state !== 'current'`;
- missing evidence `canonicalSnapshot`/fingerprint;
- exception whose `revision` differs from containing revision.

Never persist runtime statuses.

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

### Task 2: Backward-compatible Project State and persistence

**Files:**
- Modify: `visual-direction-os/project-contracts.js`
- Modify: `visual-direction-os/project-state.js`
- Modify: `visual-direction-os/project-bootstrap.js`
- Modify: `visual-direction-os/project-persistence.test.js`
- Create: `visual-direction-os/project-constraint-project-state.test.js`

**Interfaces:**
- `project-contracts.js` delegates optional registry validation to `VDOSProjectConstraintRegistry.validateRegistry`.
- Project Store adds `setProjectConstraints(nextRegistry)`.

- [ ] **Step 1: Write RED legacy/new contract tests**

```js
test('legacy Project without projectConstraints remains valid', () => {
  const project = validProjectFixture();
  delete project.projectConstraints;
  assert.equal(contracts.validateProjectState(project).valid, true);
});

test('valid registry is accepted and invalid registry rejected', () => {
  const project = validProjectFixture();
  project.projectConstraints = registry.createEmptyRegistry();
  assert.equal(contracts.validateProjectState(project).valid, true);
  project.projectConstraints = {schemaVersion:'broken',constraints:{},dismissals:{}};
  assert.equal(contracts.validateProjectState(project).valid, false);
});
```

- [ ] **Step 2: Write RED Store mutation test**

```js
test('setProjectConstraints commits only validated Director decision state', () => {
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

Expected: FAIL on missing Project registry support.

- [ ] **Step 4: Implement Project contract dependency correctly**

Change the UMD wrapper so `project-contracts.js` receives both `root` and registry; Node requires `./project-constraint-registry.js`, browser reads `root.VDOSProjectConstraintRegistry`. Validate `projectConstraints` only when present.

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

Expose it from `createProjectStore()`.

- [ ] **Step 5: Lock Bootstrap load order**

Before the existing Project contracts group:

```js
await loadScript(`project-constraint-registry.js?v=${VERSION}`, 'VDOSProjectConstraintRegistry');
```

Then load `project-contracts.js`; do not put these two in the same `Promise.all`.

- [ ] **Step 6: Add persistence round-trip test**

Save/load a Project with a confirmed Registry and separately load a legacy Project without the field. Both must validate.

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

- [ ] **Step 8: Commit**

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
buildConstraintEvidenceSnapshot({
  projectState, projectIntelligence,
  sourceSceneId, targetSceneId,
  family, path, type, beatIds
})

deriveProjectConstraintCandidates({projectState, projectIntelligence, registry})
```

Exact `expected` comes from source final `workspace.sceneState`, never from M6 normalized `CONTESTED` labels.

- [ ] **Step 1: Write RED positive Camera carry fixture**

Use Scene 01→02 as an existing `PASS` compiler-backed Camera transfer, then an undirected immediate Scene 03 whose starting agency equals Scene 02 ending agency.

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

- [ ] **Step 2: Write RED ineligibility matrix**

Independently prove zero Candidates for:
- AI-completed source;
- legacy/missing/unknown/divergent source;
- blocked source;
- M6 WARN source relationship;
- handoff mismatch;
- non-adjacent target;
- target already `directed`;
- unsupported path.

- [ ] **Step 3: Write RED dismissal identity test**

Reject Candidate A, rerun unchanged -> zero. Then materially change target `agencyTransition` while preserving compatible starting agency, e.g. `['contested','character']` -> `['contested','shared','character']`; derive a new fingerprint and Candidate.

- [ ] **Step 4: Run RED**

```bash
node --test visual-direction-os/project-constraint-candidates.test.js
```

- [ ] **Step 5: Implement minimal pure algorithm**

```text
for source Scene indexes 1 .. length-2:
  sourceBoundary = boundary whose toSceneId == sourceSceneId
  target = immediate next Scene only
  require sourceBoundary PASS and material changed compiler-backed response
  require target not directed
  require source ending agency == target starting agency
  for camera/color:
    require source M6 source == compiler-backed
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

Repeated input must be deep-equal and inputs unchanged.

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

**Interfaces:**

```js
resolveProjectConstraintAuthority({
  projectState,
  projectIntelligence,
  registry,
  targetSceneId,
  visualIR,
  baseSkeleton
})
```

Return:

```js
{
  mode:'guarded',
  targetSceneId,
  safeToComplete,
  resolutions:[{
    constraintId, revision,
    status:'ACTIVE'|'SATISFIED'|'CONFLICT'|'STALE'|'INAPPLICABLE',
    path, beatId, expected, sceneExpected, reason
  }],
  conflicts:[],
  projectConstraintContext:{targetSceneId,constraints:[]}
}
```

- [ ] **Step 1: Write RED staleness tests**

Change each material canonical field separately: source final value, Reading/Strategy/Grammar/applied Beat, target agency transition, source/target adjacency. Expect `STALE`, `safeToComplete=false`, zero exact authority.

- [ ] **Step 2: Write RED SATISFIED and target-Grammar CONFLICT tests**

```js
test('matching supported Camera expectation is SATISFIED', () => {
  const result = api.resolveProjectConstraintAuthority(satisfiedFixture());
  assert.equal(result.safeToComplete, true);
  assert.equal(result.resolutions[0].status, 'SATISFIED');
  assert.equal(result.resolutions[0].expected, 'mixed');
  assert.equal(result.resolutions[0].sceneExpected, 'mixed');
});

test('confirmed Camera path under target Color-only Grammar is review conflict', () => {
  const result = api.resolveProjectConstraintAuthority(unsupportedGrammarFixture());
  assert.equal(result.safeToComplete, false);
  assert.equal(result.resolutions[0].status, 'CONFLICT');
  assert.equal(result.resolutions[0].reason, 'TARGET_GRAMMAR_UNSUPPORTED');
});
```

- [ ] **Step 3: Keep a defensive supported-value disagreement test**

Construct a deliberately contradictory confirmed Registry fixture whose canonical snapshot is internally current but whose stored expected value disagrees with the current supported Scene Compiler assertion. Expect `CONFLICT/SCENE_COMPILER_DISAGREES`.

This is an invariant-hardening path, not the normal v1 ownership-carry UX: a normal current Camera/Color carry with compatible handoff should naturally agree at `SETUP`.

- [ ] **Step 4: Write RED release/revoke/ACTIVE tests**

- current-revision release -> `INAPPLICABLE`, non-blocking;
- revoked -> omitted from participation;
- current evidence + no Skeleton -> `ACTIVE`.

- [ ] **Step 5: Run RED**

```bash
node --test visual-direction-os/project-constraint-authority.test.js
```

- [ ] **Step 6: Implement strict resolver order**

```text
1. ignore revoked
2. current-revision release? -> INAPPLICABLE
3. rebuild current canonical snapshot
4. snapshot differs? -> STALE, block
5. no baseSkeleton? -> ACTIVE
6. locate scoped deterministic Beat (SETUP)
7. ask Visual Compiler for supported assertion
8. no supported assertion for path? -> CONFLICT/TARGET_GRAMMAR_UNSUPPORTED
9. exact value equal? -> SATISFIED
10. exact value differs? -> CONFLICT/SCENE_COMPILER_DISAGREES
```

Only `SATISFIED` items enter `projectConstraintContext`.

- [ ] **Step 7: Run GREEN**

```bash
node --test visual-direction-os/project-constraint-authority.test.js
node --check visual-direction-os/project-constraint-authority.js
```

Add input-immutability and repeated-output equality assertions.

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

Narrative Workspace options gain:

```js
projectConstraintGuard
projectConstraintProvider() -> {projectState,projectIntelligence,registry,targetSceneId}
```

Assembler gains optional:

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

No Skeleton mutation.

- [ ] **Step 4: Integrate into `requestSequence()` at the correct side of the AI boundary**

After base Skeleton compile/reuse and before `beginRequest('sequence')`:

```js
const constraintInput = projectConstraintProvider?.() || null;
const constraintResult = constraintInput
  ? projectConstraintGuard.guardProjectConstraints({
      ...constraintInput,
      visualIR,
      baseSkeleton:skeleton
    })
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

If guard throws before token creation, render a recoverable Sequence error directly; do not fabricate a failed API token.

- [ ] **Step 5: Load/provide M7 runtime in Bootstrap**

After M6:

```js
await loadScript(`project-constraint-candidates.js?v=${VERSION}`, 'VDOSProjectConstraintCandidates');
await loadScript(`project-constraint-authority.js?v=${VERSION}`, 'VDOSProjectConstraintAuthority');
await loadScript(`visual-sequence-project-constraints.js?v=${VERSION}`, 'VDOSVisualSequenceProjectConstraints');
```

Pass to Narrative restore:

```js
projectConstraintGuard: root.VDOSVisualSequenceProjectConstraints,
projectConstraintProvider: () => {
  const projectState = store.getProject();
  return {
    projectState,
    projectIntelligence:root.VDOSProjectIntelligence.deriveProjectIntelligence(projectState),
    registry:projectState?.projectConstraints || root.VDOSProjectConstraintRegistry.createEmptyRegistry(),
    targetSceneId:projectState?.activeSceneId || null
  };
}
```

- [ ] **Step 6: Add assembler provenance RED test**

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

Also add:

```js
sequenceProvenance.projectConstraints = {
  registryVersion:'0.1.0',
  resolutions:[{constraintId,revision,result:'satisfied',beatId,path}]
};
```

- [ ] **Step 7: Extend Sequence API contract/prompt read-only context**

Optional input:

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

Prompt must state:

```text
Project Constraint Context is explanatory only. Do not write, override, or infer constrained paths. Return only AI-open fields allowed by the supplied Sequence Skeleton.
```

- [ ] **Step 8: Prove AI request count is zero for guard failure**

Add a Narrative Workspace test/spied demo API. Trigger Sequence with a guard that throws `PROJECT_CONSTRAINT_REVIEW_REQUIRED`; assert `sequenceCalls === 0`, no proposal, no canonical Scene mutation.

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
- Pure inspector consumes `{candidates,authorityState,registry}`.
- Project Workspace computes current candidates/overview authority read-only.
- Only explicit actions call Registry transforms then `store.setProjectConstraints()`.
- UI order: Arc → Continuity → M6 Intelligence → `PROJECT CONSTRAINTS · DIRECTOR CONTROL`.

- [ ] **Step 1: Write RED renderer tests**

```js
test('Candidate renders Confirm/Reject with zero authority wording', () => {
  const html = inspector.renderProjectConstraints({candidates:[candidate],registry:registry.createEmptyRegistry(),authorityState:null});
  assert.match(html, /PROJECT CONSTRAINTS · DIRECTOR CONTROL/);
  assert.match(html, /CANDIDATE/);
  assert.match(html, /CONFIRM/);
  assert.match(html, /REJECT/);
  assert.doesNotMatch(html, /owner: project/i);
});

test('stale and conflict copy exposes review semantics', () => {
  assert.match(inspector.renderProjectConstraints(staleState), /AUTHORITY REMOVED/);
  assert.match(inspector.renderProjectConstraints(conflictState), /AI COMPLETION[\s\S]*NOT STARTED/);
});
```

Also test HTML escaping.

- [ ] **Step 2: Write RED pure Workspace ordering test**

Require `project-workspace.js`, call exported `renderProjectWorkspace()` with deterministic Project/M6 data, and assert string position:

```js
const html = workspace.renderProjectWorkspace(project);
assert.ok(html.indexOf('PROJECT INTELLIGENCE · SHADOW') < html.indexOf('PROJECT CONSTRAINTS · DIRECTOR CONTROL'));
```

If the M6 renderer text is generated through markup rather than literal header text, assert stable data attributes instead: `[data-project-intelligence]` precedes `[data-project-constraints]` in returned HTML.

- [ ] **Step 3: Run RED**

```bash
node --test visual-direction-os/project-constraint-inspector.test.js
node --test visual-direction-os/project-constraint-workspace.test.js
```

- [ ] **Step 4: Implement inspector + CSS + Bootstrap loading**

Load style with existing Project styles and load `project-constraint-inspector.js` after Candidate/Authority modules and before `project-workspace.js`.

Do not add numeric score, auto-fix, “Force Project Value”, or automatic Grammar unification.

- [ ] **Step 5: Wire Workspace render**

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

Without Skeleton, eligible confirmed constraints may show `ACTIVE`; never fake `SATISFIED`.

- [ ] **Step 6: Wire explicit Director actions using existing delegated `data-action` pattern**

```text
confirm-project-constraint -> confirmCandidate -> setProjectConstraints
reject-project-constraint -> rejectCandidate -> setProjectConstraints
revoke-project-constraint -> revokeConstraint -> setProjectConstraints
release-project-constraint -> releaseConstraintScope -> setProjectConstraints
review-project-constraint -> derive current replacement -> reconfirmConstraint -> setProjectConstraints
```

Each action mutates only `projectConstraints`; Scene/Narrative/Sequence snapshots remain byte-for-byte unchanged.

- [ ] **Step 7: Add Workspace unit assertions for registry-only mutation**

Expose/route action helpers so the test can call the same handler path with a fake Store. Snapshot `project.scenes` before Confirm/Reject/Revoke and assert unchanged while Registry changes.

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

### Task 7: Browser acceptance, CI, exact-HEAD verification, and Draft PR handoff

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
→ M7 Candidate appears
→ Director CONFIRM REV 01
→ open Scene 03
→ confirm Reading + compatible Camera strategy
→ guard SATISFIED
→ AI completion runs
→ Sequence Preview, Scene State unchanged
→ Apply
→ SETUP Camera MIXED
→ provenance owner=compiler + constraint ID/revision annotation
```

Assert M7 DOM appears after M6.

- [ ] **Step 2: Reachable conflict browser chain**

Keep confirmed Camera carry evidence current, then choose a target Strategy/Grammar that does not provide exact Camera support (for example Color ownership). Assert:

```text
CONFIRMED · CONFLICT
TARGET GRAMMAR UNSUPPORTED
AI COMPLETION · NOT STARTED
```

and no proposal/canonical mutation. This is the primary user-reachable v1 conflict path.

- [ ] **Step 3: Stale browser chain**

After REV 01, materially edit target Reading agency transition or source evidence through existing Director/Public Project APIs. Assert:

```text
STALE · AUTHORITY REMOVED
```

and Sequence remains review-blocked until explicit Revoke or Review New Revision.

- [ ] **Step 4: Dismissal/revision browser chain**

- Reject unchanged Candidate -> it stays hidden.
- Change material compatible evidence -> new fingerprint Candidate appears.
- Confirm REV 01 -> make stale -> Review New Revision -> REV 02 current, REV 01 superseded.
- REV 01 release exception does not appear in REV 02.

- [ ] **Step 5: Extend CI contracts/syntax/Pages**

Contracts add:

```bash
node --test visual-direction-os/project-constraint-registry.test.js
node --test visual-direction-os/project-constraint-project-state.test.js
node --test visual-direction-os/project-constraint-candidates.test.js
node --test visual-direction-os/project-constraint-authority.test.js
node --test visual-direction-os/visual-sequence-project-constraints.test.js
node --test visual-direction-os/project-constraint-inspector.test.js
node --test visual-direction-os/project-constraint-workspace.test.js
```

Syntax adds all five new JS modules plus the Sequence bridge. Pages assembly asserts the six new runtime/style assets exist. Browser job appends `project-constraint-browser.spec.js` and keeps every current M0–M6 browser suite.

- [ ] **Step 6: Run complete local-equivalent Node verification**

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

- [ ] **Step 8: Commit final M7 browser/CI gate**

```bash
git add visual-direction-os/project-constraint-browser.spec.js .github/workflows/director-intelligence-ci.yml
git commit -m "test: verify project constraint authority end to end"
```

- [ ] **Step 9: Require fresh exact-HEAD GitHub Actions**

For the exact final commit, require:

```text
contracts: completed / success
browser: completed / success
```

Any subsequent fix invalidates that evidence and requires a new exact-HEAD run.

- [ ] **Step 10: Re-check baseline + PR safety**

Against Director v2.1 baseline `fbf3329557c02452a9175ab0d9ed02bf55a8368a`, require:

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

- [ ] **Step 11: Update Draft PR metadata only after verification**

Title:

```text
Phase II M7: guarded Project Constraint Authority
```

Body must include Candidate eligibility, Director Confirm/Reject, revision/staleness, pre-AI conflict blocking, no Project write owner, exact final HEAD/CI run, commit-pinned raw.githack review URL, and explicit “keep Draft / do not merge yet”.

---

## Final Acceptance Checklist

- Prospective immediate-next Candidate generation only.
- Exact expected value comes from current compiler-backed final source Scene State.
- Dismissal identity works and materially changed compatible evidence can re-propose.
- REV 01/REV N history is immutable and explicit.
- Release is revision-local.
- Legacy Projects load without Registry migration.
- Staleness is canonical snapshot inequality, not digest inequality alone.
- STALE has zero exact authority and requires Director review.
- Matching supported Scene Compiler result is `SATISFIED`.
- Unsupported target Grammar is a reachable `CONFLICT`; defensive supported-value disagreement is also handled.
- Conflict/stale causes zero AI Sequence requests.
- M7 never mutates base Skeleton to invent an exact value.
- Assembler value provenance remains `owner: compiler`; M7 IDs/revisions are annotations only.
- Canonical Scene State changes only after Apply.
- M6 remains read-only; Arc/Continuity/M3/M4/M5/M6 regressions pass.
- Director Control renders after M6 and has no auto-fix/force-Project action.
- Fresh exact-HEAD contracts + browser CI pass.
- PR #4 remains Draft and unmerged.
