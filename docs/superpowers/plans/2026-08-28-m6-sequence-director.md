# M6 Sequence Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-shot Sequence Director where every Shot owns an isolated M4 lineage, an Approved Frame can drive same-Sequence continuity into Agnes generation, downstream continuity risk is reviewable without destructive automation, and the entire structure round-trips through `.vdos` schema v2.

**Architecture:** Add an M6 domain layer above M4. `sequence-model.js` defines stable records and deterministic migration identities; `continuity-engine.js` computes current continuity and invalidation without side effects; `m6-controller.js` owns Sequence/Shot CRUD, active context, Approved Frame, continuity review, and generation context. Director Memory is upgraded in place so Project/Sequence/Shot/Artifact/Comparison data participates in one IndexedDB transaction; M4 is narrowed to the Active Shot; M5 export/import is upgraded to whole-project schema v2 while package version stays 1.

**Tech Stack:** Zero-build browser JavaScript, Node.js 24 `node:assert/strict` regression tests, IndexedDB, existing M3/M4/M5 runtime, Agnes Image 2.1 Flash, ZIP-compatible `.vdos` via vendored `fflate`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-28-m6-sequence-director-design.md`

## Global Constraints

- Work only on branch `m6-sequence-director`; do not modify or merge `master` without explicit authorization.
- Preserve hierarchy exactly: `Project → Sequence → Shot → M4 generation lineage`.
- M4 lineage never crosses Shot boundaries; continuity never uses `parentArtifactId`.
- Continuity never crosses Sequence boundaries in M6 v1.
- Each Shot has zero or one `approvedArtifactId`; never auto-approve latest generation.
- `continuityMode` is exactly `auto | manual`; new Shots default to `auto`.
- Auto continuity resolves the current previous Shot by order; manual continuity preserves the explicit source ID.
- Missing/unavailable continuity warns but does not block explicit Generate Anyway.
- Generation-time provenance statuses are exactly `resolved | missing_at_generation | unavailable_at_generation | not_applicable`.
- Generation-time continuity provenance is immutable historical fact; current Shot continuity remains dynamic.
- Upstream invalidation changes status only; never auto-delete, regenerate, re-approve, or silently redirect continuity.
- Approved identity survives image-byte loss; source asset availability is a separate concern.
- `.vdos` `packageVersion` remains `1`; `schemaVersion` becomes `2`.
- Sequence/Shot/Approved/continuity facts are portable core data; current `approvalStatus` / `continuityStatus` are derived and recomputed.
- Core package corruption blocks import; image/reference corruption remains recoverable where M5 already permits degraded import.
- Preserve existing M3/M4/M5 behavior unless the spec explicitly changes its scope.
- No cloud sync, Project Bible, automated continuity score, multiple Approved Frames, cross-Sequence continuity, screenplay import, video timeline, or automatic camera planning in M6 v1.
- Use TDD: failing test first, minimal implementation, focused regression run, then commit.

---

## File Structure / Responsibility Map

### New runtime files

- `visual-direction-os/runtime/sequence-model.js` — record shaping, deterministic legacy IDs, order helpers, legacy bundle conversion.
- `visual-direction-os/runtime/sequence-model-tests.js` — model/migration tests.
- `visual-direction-os/runtime/continuity-engine.js` — pure source resolution, derived health, dependency graph, invalidation/reorder impact.
- `visual-direction-os/runtime/continuity-engine-tests.js` — continuity behavior tests.
- `visual-direction-os/runtime/m6-controller.js` — Sequence/Shot lifecycle, active context, approval, continuity review, generation-context resolution.
- `visual-direction-os/runtime/m6-controller-tests.js` — controller orchestration tests with fakes.
- `visual-direction-os/runtime/sequence-director-ui.js` — Sequence Board, navigator, Shot intent, continuity controls, review UI.
- `visual-direction-os/runtime/sequence-director.css` — M6 layout/status styling.
- `visual-direction-os/runtime/m6-browser-acceptance-tests.js` — real browser end-to-end M6 + `.vdos` round trip.

### Existing files to modify

- `visual-direction-os/runtime/director-memory.js` / `director-memory-tests.js`
- `visual-direction-os/runtime/m4-controller.js` / `m4-controller-tests.js`
- `visual-direction-os/runtime/agnes-adapter.js` / `agnes-adapter-tests.js`
- `visual-direction-os/runtime/generation-ui-m3.js`
- `visual-direction-os/runtime/iteration-controller-tests.js`
- `visual-direction-os/runtime/lineage-ui.js` / `lineage.css`
- `visual-direction-os/runtime/schema-migrations.js` / `schema-migrations-tests.js`
- `visual-direction-os/runtime/project-package.js` / `project-package-tests.js`
- `visual-direction-os/runtime/project-package-ui.js` / `project-library-tests.js` / `project-package-browser-acceptance-tests.js`
- `visual-direction-os/runtime/runtime-fingerprint.js` / `runtime-fingerprint-tests.js`
- `visual-direction-os/app.js` / `app-boot-tests.js`
- `.github/workflows/m3-runtime-tests.yml`

---

### Task 1: Sequence Model and Deterministic Legacy Structure

**Files:**
- Create: `visual-direction-os/runtime/sequence-model.js`
- Create: `visual-direction-os/runtime/sequence-model-tests.js`

**Interfaces:**
- Produces: `legacySequenceIdForProject(projectId): string`
- Produces: `legacyShotIdForProject(projectId): string`
- Produces: `shapeSequence(input): Sequence`
- Produces: `shapeShot(input): Shot`
- Produces: `sortSequences(rows): Sequence[]`
- Produces: `sortShots(rows): Shot[]`
- Produces: `migrateLegacyBundleToM6({project,artifacts,comparisons})`

- [ ] **Step 1: Write the failing test**

```js
const assert = require('node:assert/strict');
const {
  legacySequenceIdForProject,
  legacyShotIdForProject,
  migrateLegacyBundleToM6
} = require('./sequence-model.js');

const project = { id:'project-a', title:'Legacy', createdAt:'2026-01-01', updatedAt:'2026-01-02' };
const artifacts = [
  { id:'g1', projectId:'project-a', rootArtifactId:'g1', parentArtifactId:null, generationIndex:1 },
  { id:'g2', projectId:'project-a', rootArtifactId:'g1', parentArtifactId:'g1', generationIndex:2 }
];
const comparisons = [{ id:'g1::g2', projectId:'project-a', artifactAId:'g1', artifactBId:'g2' }];

const first = migrateLegacyBundleToM6({ project, artifacts, comparisons });
const second = migrateLegacyBundleToM6({ project, artifacts, comparisons });
assert.equal(first.sequences[0].id, legacySequenceIdForProject('project-a'));
assert.equal(first.shots[0].id, legacyShotIdForProject('project-a'));
assert.deepEqual(first.sequences, second.sequences);
assert.deepEqual(first.shots, second.shots);
assert.equal(first.shots[0].approvedArtifactId, null);
assert.equal(first.project.activeSequenceId, first.sequences[0].id);
assert.equal(first.project.activeShotId, first.shots[0].id);
assert.equal(first.artifacts[1].parentArtifactId, 'g1');
assert.equal(first.artifacts[1].rootArtifactId, 'g1');
assert.equal(first.artifacts[1].shotId, first.shots[0].id);
assert.equal(first.comparisons[0].shotId, first.shots[0].id);
```

- [ ] **Step 2: Run test to verify failure**

Run: `node visual-direction-os/runtime/sequence-model-tests.js`

Expected: FAIL because `sequence-model.js` does not exist.

- [ ] **Step 3: Implement stable IDs and record shapers**

```js
function safeIdentity(value) {
  return encodeURIComponent(String(value || '').trim());
}
function legacySequenceIdForProject(projectId) {
  return `sequence-legacy-${safeIdentity(projectId)}`;
}
function legacyShotIdForProject(projectId) {
  return `shot-legacy-${safeIdentity(projectId)}`;
}
function shapeSequence(input = {}) {
  if (!input.id || !input.projectId) throw new Error('Sequence requires id and projectId');
  return {
    id:String(input.id), projectId:String(input.projectId), order:Number(input.order) || 1,
    title:String(input.title || 'Sequence 01'), intent:String(input.intent || ''),
    createdAt:String(input.createdAt), updatedAt:String(input.updatedAt)
  };
}
function shapeShot(input = {}) {
  if (!input.id || !input.projectId || !input.sequenceId) throw new Error('Shot requires id, projectId, and sequenceId');
  return {
    id:String(input.id), projectId:String(input.projectId), sequenceId:String(input.sequenceId),
    order:Number(input.order) || 1, title:String(input.title || 'Shot 01'), intent:String(input.intent || ''),
    approvedArtifactId:input.approvedArtifactId || null,
    continuityMode:input.continuityMode === 'manual' ? 'manual' : 'auto',
    continuitySourceShotId:input.continuitySourceShotId || null,
    continuityReview:input.continuityReview || null,
    continuityInvalidation:input.continuityInvalidation || null,
    createdAt:String(input.createdAt), updatedAt:String(input.updatedAt)
  };
}
```

`migrateLegacyBundleToM6()` preserves all artifact/comparison IDs, image metadata, timestamps, and parent/root relationships; it only adds deterministic Sequence/Shot records, `sequenceId`/`shotId`, and project active IDs. It sets `approvedArtifactId:null`.

- [ ] **Step 4: Run test to verify pass**

Run: `node visual-direction-os/runtime/sequence-model-tests.js`

Expected: `sequence model tests passed`.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/sequence-model.js visual-direction-os/runtime/sequence-model-tests.js
git commit -m "feat(m6): add sequence and shot model"
```

---

### Task 2: Pure Continuity Engine

**Files:**
- Create: `visual-direction-os/runtime/continuity-engine.js`
- Create: `visual-direction-os/runtime/continuity-engine-tests.js`

**Interfaces:**
- Consumes: `sortShots()` from Task 1.
- Produces: `resolveContinuitySource({shot,shots,artifactsById})`
- Produces: `deriveContinuityStatus({shot,shots,artifactsById})`
- Produces: `buildContinuityDependents(shots)`
- Produces: `collectContinuityDescendants(sourceShotId,shots)`
- Produces: `detectAutoSourceChange({shotId,beforeShots,afterShots})`
- Produces: `isContinuityReviewCurrent({shot,resolution})`

- [ ] **Step 1: Write failing continuity tests**

```js
const assert = require('node:assert/strict');
const {
  resolveContinuitySource,
  deriveContinuityStatus,
  collectContinuityDescendants,
  detectAutoSourceChange,
  isContinuityReviewCurrent
} = require('./continuity-engine.js');

const blob = new Blob(['x'], {type:'image/webp'});
const shots = [
  { id:'s1', sequenceId:'q1', order:1, continuityMode:'auto', approvedArtifactId:'g1' },
  { id:'s2', sequenceId:'q1', order:2, continuityMode:'auto', approvedArtifactId:'h1' },
  { id:'s3', sequenceId:'q1', order:3, continuityMode:'manual', continuitySourceShotId:'s1', approvedArtifactId:'k1' }
];
const artifactsById = new Map([
  ['g1', { id:'g1', shotId:'s1', imageBlob:blob }],
  ['h1', { id:'h1', shotId:'s2', imageBlob:blob }],
  ['k1', { id:'k1', shotId:'s3', imageBlob:blob }]
]);

assert.equal(resolveContinuitySource({ shot:shots[1], shots, artifactsById }).sourceShotId, 's1');
assert.equal(resolveContinuitySource({ shot:shots[2], shots, artifactsById }).sourceShotId, 's1');
assert.equal(deriveContinuityStatus({ shot:shots[0], shots, artifactsById }), 'not_applicable');
assert.deepEqual(collectContinuityDescendants('s1', shots).sort(), ['s2','s3']);

const noApproved = shots.map((s) => ({...s}));
noApproved[0].approvedArtifactId = null;
assert.equal(deriveContinuityStatus({ shot:noApproved[1], shots:noApproved, artifactsById }), 'source_missing');

const missingBytes = new Map(artifactsById);
missingBytes.set('g1', { id:'g1', shotId:'s1', imageBlob:null });
assert.equal(deriveContinuityStatus({ shot:shots[1], shots, artifactsById:missingBytes }), 'source_unavailable');

const reordered = [
  {...shots[1], order:1},
  {...shots[0], order:2},
  {...shots[2], order:3}
];
assert.deepEqual(detectAutoSourceChange({ shotId:'s2', beforeShots:shots, afterShots:reordered }), {
  previousSourceShotId:'s1', currentSourceShotId:null
});

const outOfOrder = {...shots[2], order:1};
assert.equal(deriveContinuityStatus({ shot:outOfOrder, shots:[outOfOrder,{...shots[0],order:2},{...shots[1],order:3}], artifactsById }), 'source_out_of_order');

const reviewed = {...shots[1], continuityReview:{ status:'accepted', reviewedArtifactId:'h1', sourceArtifactId:'g1' }};
assert.equal(isContinuityReviewCurrent({ shot:reviewed, resolution:resolveContinuitySource({shot:reviewed,shots:[shots[0],reviewed,shots[2]],artifactsById}) }), true);
assert.equal(isContinuityReviewCurrent({ shot:{...reviewed,continuityReview:{...reviewed.continuityReview,sourceArtifactId:'old'}}, resolution:resolveContinuitySource({shot:reviewed,shots:[shots[0],reviewed,shots[2]],artifactsById}) }), false);

const crossSequence = {...shots[2], sequenceId:'q2', continuitySourceShotId:'s1'};
assert.equal(resolveContinuitySource({ shot:crossSequence, shots:[shots[0],crossSequence], artifactsById }).status, 'missing');
```

- [ ] **Step 2: Run test to verify failure**

Run: `node visual-direction-os/runtime/continuity-engine-tests.js`

Expected: FAIL because `continuity-engine.js` does not exist.

- [ ] **Step 3: Implement side-effect-free resolution**

```js
function previousShot(shot, shots) {
  const ordered = shots.filter((row) => row.sequenceId === shot.sequenceId)
    .slice().sort((a,b) => a.order - b.order || a.id.localeCompare(b.id));
  const index = ordered.findIndex((row) => row.id === shot.id);
  return index > 0 ? ordered[index - 1] : null;
}
function sourceShotFor(shot, shots) {
  if (shot.continuityMode === 'manual') {
    return shots.find((row) => row.id === shot.continuitySourceShotId && row.sequenceId === shot.sequenceId) || null;
  }
  return previousShot(shot, shots);
}
```

Status precedence is: first Shot `not_applicable`; invalid Manual ordering `source_out_of_order`; missing source/Approved `source_missing`; missing Approved bytes `source_unavailable`; stale invalidation/review `review_required`; otherwise `current`.

- [ ] **Step 4: Run test to verify pass**

Run: `node visual-direction-os/runtime/continuity-engine-tests.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/continuity-engine.js visual-direction-os/runtime/continuity-engine-tests.js
git commit -m "feat(m6): add continuity resolution engine"
```

---

### Task 3: Upgrade Director Memory to Atomic Project / Sequence / Shot Storage

**Files:**
- Modify: `visual-direction-os/runtime/director-memory.js`
- Modify: `visual-direction-os/runtime/director-memory-tests.js`

**Interfaces:**
- Produces: `listSequences(projectId)`, `putSequence(sequence)`, `deleteSequence(id)`.
- Produces: `listShots(sequenceId)`, `putShot(shot)`, `deleteShot(id)`.
- Produces: `listArtifactsForShot(projectId,sequenceId,shotId)`.
- Produces: `listComparisonsForShot(projectId,sequenceId,shotId)`.
- Changes `saveGenerationArtifact()` lineage to require `projectId,sequenceId,shotId,rootArtifactId,parentArtifactId,generationIndex`.
- Changes `loadProjectBundle(projectId)` to return `{project,sequences,shots,artifacts,comparisons}`.
- Changes `commitProjectBundle()` to atomically commit all five stores.

- [ ] **Step 1: Extend failing memory tests**

```js
const row = shapeArtifactRecord({
  artifact:{ id:'h1', continuityProvenance:{ sourceShotId:'s1', sourceArtifactId:'g1', status:'resolved' } },
  projectId:'p1', sequenceId:'q1', shotId:'s2', rootArtifactId:'h1', parentArtifactId:null,
  generationIndex:1, persistenceStatus:'meta_only'
});
assert.equal(row.sequenceId, 'q1');
assert.equal(row.shotId, 's2');
assert.deepEqual(row.continuityProvenance, { sourceShotId:'s1', sourceArtifactId:'g1', status:'resolved' });

const bundle = await memory.loadProjectBundle('p1');
assert.deepEqual(bundle.sequences.map((x) => x.id), ['q1']);
assert.deepEqual(bundle.shots.map((x) => x.id), ['s1','s2']);
assert.deepEqual((await memory.listArtifactsForShot('p1','q1','s2')).map((x) => x.id), ['h1']);
assert.deepEqual((await memory.listComparisonsForShot('p1','q1','s2')).map((x) => x.id), ['h1::h2']);
```

For atomic Replace, create a bundle containing a duplicate key that makes `add()` fail; after rejection assert the original Project, Sequence, Shot, Artifact, and Comparison IDs are still present and none of the staged IDs exist.

```js
await assert.rejects(() => memory.commitProjectBundle(badReplace));
const after = await memory.loadProjectBundle('p1');
assert.equal(after.project.title, 'Original');
assert.deepEqual(after.sequences.map((x)=>x.id), ['q1']);
assert.deepEqual(after.shots.map((x)=>x.id), ['s1']);
assert.deepEqual(after.artifacts.map((x)=>x.id), ['g1']);
assert.deepEqual(after.comparisons.map((x)=>x.id), []);
```

- [ ] **Step 2: Run test to verify failure**

Run: `node visual-direction-os/runtime/director-memory-tests.js`

Expected: FAIL on missing stores/M6 fields/query methods.

- [ ] **Step 3: Bump IndexedDB and add stores/indexes**

```js
const DB_VERSION = 2;
ensureIndex(sequenceStore, 'projectId', 'projectId');
ensureIndex(sequenceStore, 'order', 'order');
ensureIndex(shotStore, 'projectId', 'projectId');
ensureIndex(shotStore, 'sequenceId', 'sequenceId');
ensureIndex(shotStore, 'order', 'order');
ensureIndex(artifactStore, 'sequenceId', 'sequenceId');
ensureIndex(artifactStore, 'shotId', 'shotId');
ensureIndex(comparisonStore, 'sequenceId', 'sequenceId');
ensureIndex(comparisonStore, 'shotId', 'shotId');
```

- [ ] **Step 4: Expand bundle validation and transaction scope**

`assertProjectBundle()` verifies Sequence→Project, Shot→Sequence/Project, Artifact→Shot/Sequence/Project, and Comparison→Shot. Replace/Clear touches `projects,sequences,shots,artifacts,comparisons` in one transaction.

- [ ] **Step 5: Run test to verify pass**

Run: `node visual-direction-os/runtime/director-memory-tests.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/director-memory.js visual-direction-os/runtime/director-memory-tests.js
git commit -m "feat(m6): persist sequence and shot bundles"
```

---

### Task 4: M6 Controller Boot, Legacy Local Migration, CRUD, Active Context

**Files:**
- Create: `visual-direction-os/runtime/m6-controller.js`
- Create: `visual-direction-os/runtime/m6-controller-tests.js`

**Interfaces:**
- Consumes Tasks 1–3 and an M4 object exposing `openShot({projectId,sequenceId,shotId})`.
- Produces `createM6Controller({memory,m4,now,makeSequenceId,makeShotId,onState})`.
- Produces: `boot`, `openProject`, `createSequence`, `updateSequence`, `deleteSequence`, `createShot`, `updateShot`, `reorderShots`, `deleteShot`, `setActiveShot`, `getState`, `resolveContinuity`.

- [ ] **Step 1: Write failing boot/CRUD tests**

```js
const state = await controller.boot({ projectId:'p1' });
assert.equal(state.sequences.length, 1);
assert.equal(state.shots.length, 1);
assert.equal(state.activeShotId, state.shots[0].id);
assert.deepEqual(m4Calls.at(-1), { projectId:'p1', sequenceId:state.sequences[0].id, shotId:state.shots[0].id });
assert.deepEqual((await memory.loadProjectBundle('p1')).artifacts.map((x)=>x.id), ['g1','g2']);

const seq2 = await controller.createSequence({ title:'Sequence 02', intent:'Gwen street passage' });
assert.equal(seq2.order, 2);
const shot2 = await controller.createShot({ sequenceId:state.sequences[0].id, title:'Shot 02', intent:'Gwen reveal' });
assert.equal(shot2.continuityMode, 'auto');
assert.equal(shot2.approvedArtifactId, null);
await controller.setActiveShot(shot2.id);
assert.equal(controller.getState().activeShotId, shot2.id);
assert.equal(controller.getState().activeSequenceId, state.sequences[0].id);
```

- [ ] **Step 2: Run test to verify failure**

Run: `node visual-direction-os/runtime/m6-controller-tests.js`

Expected: FAIL because controller is missing.

- [ ] **Step 3: Implement controller state and boot migration**

```js
const state = {
  project:null, sequences:[], shots:[], activeSequenceId:null, activeShotId:null,
  continuityByShotId:{}, restoreError:'', persistenceWarning:''
};
```

If `loadProjectBundle()` has no Sequences, call `migrateLegacyBundleToM6()` and atomically Replace the same Project ID. If persisted active IDs are invalid, select first valid Sequence/Shot, persist repaired navigation, and never invent Approved state.

- [ ] **Step 4: Implement CRUD and navigation**

Creating a Sequence creates only the Sequence record. Creating a Shot defaults to Auto. Deleting a Sequence removes only its own Shots/artifacts/comparisons because cross-Sequence continuity is forbidden. Deleting a Shot removes that Shot and its M4 data but preserves later Shots.

- [ ] **Step 5: Run test to verify pass**

Run: `node visual-direction-os/runtime/m6-controller-tests.js`

Expected: PASS for migration, CRUD, order, and active context.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/m6-controller.js visual-direction-os/runtime/m6-controller-tests.js
git commit -m "feat(m6): add sequence director controller"
```

---

### Task 5: Approved Frame, Auto/Manual Continuity, Invalidation and Human Review

**Files:**
- Modify: `visual-direction-os/runtime/m6-controller.js`
- Modify: `visual-direction-os/runtime/m6-controller-tests.js`

**Interfaces:**
- Adds: `setApprovedFrame(shotId,artifactId)`
- Adds: `clearApprovedFrame(shotId)`
- Adds: `setContinuityAuto(shotId)`
- Adds: `setContinuityManual(shotId,sourceShotId)`
- Adds: `acceptCurrentContinuity(shotId,note='')`
- Adds: `getContinuityImpact(shotId)`
- Adds async: `prepareGeneration({ordinaryReferences=[]})`

- [ ] **Step 1: Write failing approval/invalidation tests**

```js
await controller.setApprovedFrame('s1', 'g1');
await controller.setApprovedFrame('s2', 'h1');
await controller.setApprovedFrame('s1', 'g2');
assert.equal(controller.resolveContinuity('s2').sourceArtifactId, 'g2');
assert.equal(controller.getState().continuityByShotId.s2, 'review_required');
assert.equal(controller.getState().shots.find((x)=>x.id==='s2').approvedArtifactId, 'h1');

await controller.acceptCurrentContinuity('s2');
let s2 = controller.getState().shots.find((x)=>x.id==='s2');
assert.equal(s2.continuityReview.reviewedArtifactId, 'h1');
assert.equal(s2.continuityReview.sourceArtifactId, 'g2');
assert.equal(controller.getState().continuityByShotId.s2, 'current');

await controller.clearApprovedFrame('s1');
assert.equal(controller.getState().continuityByShotId.s2, 'source_missing');
assert.equal(controller.getState().continuityByShotId.s3, 'review_required');

await controller.setContinuityManual('s3','s1');
await controller.reorderShots('q1',['s3','s1','s2']);
assert.equal(controller.getState().shots.find((x)=>x.id==='s3').continuitySourceShotId, 's1');
assert.equal(controller.getState().continuityByShotId.s3, 'source_out_of_order');
await controller.setContinuityAuto('s3');
assert.equal(controller.getState().shots.find((x)=>x.id==='s3').continuitySourceShotId, null);

await assert.rejects(() => controller.setContinuityManual('s2','other-sequence-shot'), /same Sequence/);
await assert.rejects(() => controller.setApprovedFrame('s2','g1'), /same Shot/);
```

After deleting source Shot `s1`, assert direct dependent `s2` is `source_missing`, descendant `s3` is `review_required`, and neither Shot is deleted.

```js
await controller.deleteShot('s1');
assert.ok(controller.getState().shots.some((x)=>x.id==='s2'));
assert.ok(controller.getState().shots.some((x)=>x.id==='s3'));
assert.equal(controller.getState().continuityByShotId.s2, 'source_missing');
assert.equal(controller.getState().continuityByShotId.s3, 'review_required');
```

- [ ] **Step 2: Run test to verify failure**

Run: `node visual-direction-os/runtime/m6-controller-tests.js`

Expected: FAIL on missing methods/behavior.

- [ ] **Step 3: Implement non-destructive invalidation**

```js
function invalidationRecord({ reason, causedByShotId, previousArtifactId=null, currentArtifactId=null, now }) {
  return { reason, causedByShotId, previousArtifactId, currentArtifactId, invalidatedAt:now() };
}
```

Direct dependents derive precise source faults; deeper descendants retain objects and receive `continuityInvalidation` so their derived state becomes `review_required`. Never rewrite artifact provenance.

- [ ] **Step 4: Implement review validity and generation context**

`Accept Current Continuity` requires an Approved current Shot and a resolved current source; it stores `{status:'accepted',reviewedArtifactId,sourceArtifactId,reviewedAt,note}`. `prepareGeneration()` returns current Sequence/Shot intents plus one continuity reference or an explicit missing/unavailable/not-applicable provenance record.

- [ ] **Step 5: Run test to verify pass**

Run: `node visual-direction-os/runtime/m6-controller-tests.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/m6-controller.js visual-direction-os/runtime/m6-controller-tests.js
git commit -m "feat(m6): add approval and continuity review workflow"
```

---

### Task 6: Narrow M4 to the Active Shot and Persist Frozen Continuity Provenance

**Files:**
- Modify: `visual-direction-os/runtime/m4-controller.js`
- Modify: `visual-direction-os/runtime/m4-controller-tests.js`
- Modify: `visual-direction-os/runtime/director-memory.js`
- Modify: `visual-direction-os/runtime/director-memory-tests.js`

**Interfaces:**
- Adds M4 `openShot({projectId,sequenceId,shotId})`.
- M4 state adds `activeSequenceId`, `activeShotId`.
- M4 reads `listArtifactsForShot()` / `listComparisonsForShot()` only.
- Artifact persistence freezes `sequenceId`, `shotId`, `continuityProvenance`.
- Comparison persistence adds `sequenceId`, `shotId` and rejects cross-Shot pairs.

- [ ] **Step 1: Write failing isolation/provenance tests**

```js
await controller.openShot({ projectId:'p1', sequenceId:'q1', shotId:'s1' });
assert.deepEqual(controller.getState().artifacts.map((a)=>a.id), ['g1','g2']);
await controller.openShot({ projectId:'p1', sequenceId:'q1', shotId:'s2' });
assert.deepEqual(controller.getState().artifacts.map((a)=>a.id), ['h1']);
assert.throws(() => controller.selectA('g1'), /Unknown A artifact/);

const h2 = await controller.ingestGeneration({
  id:'h2', parentArtifactId:'h1', iterationOf:'h1',
  continuityProvenance:{ sourceShotId:'s1', sourceArtifactId:'g2', status:'resolved' }
});
assert.equal(h2.parentArtifactId, 'h1');
assert.equal(h2.shotId, 's2');
assert.equal(h2.continuityProvenance.sourceArtifactId, 'g2');
assert.notEqual(h2.parentArtifactId, h2.continuityProvenance.sourceArtifactId);
```

Persist/evaluate `h2` and assert the stored row still has `parentArtifactId:'h1'` and continuity source `g2`.

- [ ] **Step 2: Run test to verify failure**

Run: `node visual-direction-os/runtime/m4-controller-tests.js`

Expected: FAIL because M4 still loads Project-wide state.

- [ ] **Step 3: Implement Shot-scoped reads and ingestion**

```js
async function readShotState({ projectId, sequenceId, shotId }) {
  const [artifacts, comparisons] = await Promise.all([
    memory.listArtifactsForShot(projectId, sequenceId, shotId),
    memory.listComparisonsForShot(projectId, sequenceId, shotId)
  ]);
  return { artifacts, comparisons };
}
```

`ingestGeneration()` requires an active Shot and rejects any parent not loaded in that Shot. `deleteSubtree()` remains same-Shot by construction.

- [ ] **Step 4: Persist M6 lineage fields with each generation**

```js
lineage:{
  projectId:enriched.projectId,
  sequenceId:enriched.sequenceId,
  shotId:enriched.shotId,
  rootArtifactId:enriched.rootArtifactId,
  parentArtifactId:enriched.parentArtifactId,
  generationIndex:enriched.generationIndex
}
```

`shapeArtifactRecord()` copies `artifact.continuityProvenance` without recomputation.

- [ ] **Step 5: Run focused regressions**

```bash
node visual-direction-os/runtime/director-memory-tests.js
node visual-direction-os/runtime/m4-controller-tests.js
node visual-direction-os/runtime/comparison-engine-tests.js
node visual-direction-os/runtime/memory-engine-tests.js
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/director-memory.js visual-direction-os/runtime/director-memory-tests.js visual-direction-os/runtime/m4-controller.js visual-direction-os/runtime/m4-controller-tests.js
git commit -m "refactor(m6): scope M4 lineage to active shot"
```

---

### Task 7: Agnes Sequence Context and Click-Time Continuity Injection

**Files:**
- Modify: `visual-direction-os/runtime/agnes-adapter.js`
- Modify: `visual-direction-os/runtime/agnes-adapter-tests.js`
- Modify: `visual-direction-os/runtime/generation-ui-m3.js`
- Modify: `visual-direction-os/runtime/iteration-controller-tests.js`
- Modify: `visual-direction-os/runtime/m6-controller.js`
- Modify: `visual-direction-os/runtime/m6-controller-tests.js`

**Interfaces:**
- Adds Agnes role `continuity`.
- Produces `applyAgnesSequenceContext(request,{sequenceIntent,shotIntent,continuityReference})`.
- M6 `prepareGeneration()` is authoritative on every `generation.generate()` call, including redirects.

- [ ] **Step 1: Write failing Agnes tests**

```js
const base = buildAgnesRequest({
  compiled,
  responseFormat:'b64_json',
  references:[{ source:'data:image/png;base64,CHAR', role:'character' }]
});
const snapshot = JSON.stringify(base);
const finalRequest = applyAgnesSequenceContext(base, {
  sequenceIntent:'Move from isolation toward action.',
  shotIntent:'Cut to a frontal close-up.',
  continuityReference:{ source:'data:image/webp;base64,CONT', role:'continuity' }
});
assert.equal(JSON.stringify(base), snapshot, 'base request must remain context-neutral');
assert.equal(finalRequest.extra_body.image[0], 'data:image/webp;base64,CONT');
assert.equal(finalRequest.extra_body.image[1], 'data:image/png;base64,CHAR');
assert.equal('return_base64' in finalRequest, false);
assert.match(finalRequest.prompt, /SEQUENCE DIRECTION/);
assert.match(finalRequest.prompt, /CURRENT SHOT INTENT/);
assert.match(finalRequest.prompt, /same visual world/i);

const rerun = applyAgnesSequenceContext(base, {
  sequenceIntent:'Move from isolation toward action.',
  shotIntent:'Cut to a frontal close-up.',
  continuityReference:{ source:'data:image/webp;base64,NEW', role:'continuity' }
});
assert.equal(rerun.extra_body.image[0], 'data:image/webp;base64,NEW');
assert.equal(rerun.extra_body.image.filter((x)=>x.includes('CONT')).length, 0);
```

- [ ] **Step 2: Run test to verify failure**

Run: `node visual-direction-os/runtime/agnes-adapter-tests.js`

Expected: FAIL on missing helper/role.

- [ ] **Step 3: Implement continuity semantics and request application**

`continuity` preserves stable identity/wardrobe/props/environment state/palette ownership/lighting logic while allowing current Shot Intent to change framing, pose, action, and camera. `applyAgnesSequenceContext()` prepends Sequence/Shot/continuity sections and unshifts continuity image before ordinary references.

- [ ] **Step 4: Make click-time M6 resolution authoritative**

```js
const prepared = await root.VisualDirectionOS?.m6?.prepareGeneration?.({ ordinaryReferences:state.references }) || null;
const executionRequest = prepared
  ? applyAgnesSequenceContext(request, prepared)
  : request;
```

`state.references` remains ordinary references only. The created artifact receives `continuityProvenance` from `prepared`; continuity image is never copied into ordinary reference metadata.

- [ ] **Step 5: Test the 8-image slot rule**

```js
state.references = Array.from({length:8}, (_,i) => ({ id:`r${i}`, source:`data:image/png;base64,R${i}`, role:'subject', preserve:[] }));
const prepared = await m6.prepareGeneration({ ordinaryReferences:state.references });
assert.equal(prepared.continuityReference.role, 'continuity');
assert.equal(prepared.ordinaryReferences.length, 8);
assert.equal(prepared.referenceOverflow, true);
```

Generation must show a clear error and skip proxy invocation until one ordinary reference is removed. With `missing_at_generation` / `unavailable_at_generation` Generate Anyway, all 8 ordinary references remain usable.

- [ ] **Step 6: Prove redirect uses current continuity**

```js
await generation.generate(revised, { iterationOf:'h1', baseRequest:cleanBase });
assert.equal(generation.lastArtifact.parentArtifactId, 'h1');
assert.equal(generation.lastArtifact.continuityProvenance.sourceArtifactId, 'g5');
assert.notEqual(generation.lastArtifact.continuityProvenance.sourceArtifactId, 'g3');
```

The fixture starts with historical `h1 → continuity g3`, changes current source to `g5`, then redirects from `h1`.

- [ ] **Step 7: Run focused tests**

```bash
node visual-direction-os/runtime/agnes-adapter-tests.js
node visual-direction-os/runtime/iteration-controller-tests.js
node visual-direction-os/runtime/m6-controller-tests.js
node visual-direction-os/runtime/generation-client-tests.js
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/runtime/agnes-adapter.js visual-direction-os/runtime/agnes-adapter-tests.js visual-direction-os/runtime/generation-ui-m3.js visual-direction-os/runtime/iteration-controller-tests.js visual-direction-os/runtime/m6-controller.js visual-direction-os/runtime/m6-controller-tests.js
git commit -m "feat(m6): inject continuity into Agnes generation"
```

---

### Task 8: Sequence Board, Active Shot UX, Approved Actions and Review UI

**Files:**
- Create: `visual-direction-os/runtime/sequence-director-ui.js`
- Create: `visual-direction-os/runtime/sequence-director.css`
- Modify: `visual-direction-os/runtime/lineage-ui.js`
- Modify: `visual-direction-os/runtime/lineage.css`

**Interfaces:**
- Consumes `VisualDirectionOS.m6.getState()` and actions from Tasks 4/5.
- Consumes `vdos:m4-state`; introduces `vdos:m6-state`.
- Board View and Director View are two renderings of the same controller state.

- [ ] **Step 1: Write explicit DOM assertions in the new UI fixture**

```js
renderSequenceBoard({
  shots:[
    { id:'s1', title:'Rooftop', approvedArtifactId:'g1', approvalStatus:'approved', continuityStatus:'not_applicable' },
    { id:'s2', title:'Close-up', approvedArtifactId:'h1', approvalStatus:'approved', continuityStatus:'review_required' }
  ],
  thumbnails:{ g1:'blob:g1', h1:'blob:h1' }
});
assert.match(document.body.textContent, /Rooftop/);
assert.match(document.body.textContent, /Close-up/);
assert.match(document.body.textContent, /Review Required/);
assert.equal(document.querySelector('[data-shot-id="s2"] img').getAttribute('src'), 'blob:h1');
```

For a Draft Shot with no Approved but a latest generation, assert the latest image is used only by the board thumbnail function while `m6.resolveContinuity(nextShot)` remains `source_missing`.

- [ ] **Step 2: Render Sequence context around M4**

```html
<section class="sequence-director" aria-label="Sequence Director">
  <header class="sequence-director-head"></header>
  <aside class="sequence-navigator"></aside>
  <main class="active-shot-context"></main>
</section>
```

Shot Intent stays visible. Sequence Intent appears in the Sequence header and compact Director context.

- [ ] **Step 3: Implement exact status/control labels**

Use: `✓ Approved`, `⚠ Review Required`, `! Source Missing`, `! Source Asset Missing`, `↗ Source Out of Order`, `Auto · Previous Shot`, `Manual · <Shot title>`. Manual choices list only earlier Shots in the same Sequence. Out-of-order UI offers `Keep Manual Source` and `Reset to Previous Shot`.

- [ ] **Step 4: Add Approved actions to lineage UI**

Each artifact exposes `Set as Approved Frame`; current selection shows `★ Approved Frame`. Deleting the Approved artifact is blocked until `Choose Another` or `Clear Approval` is used.

- [ ] **Step 5: Implement Review Required actions**

Render previous/current source from invalidation/current resolution and only two primary actions: `Accept Current Continuity` and `Generate New Version`. `Generate New Version` prepares/activates the Shot; it does not call Agnes automatically.

- [ ] **Step 6: Implement Shot create/reorder/delete UX**

`+ Add Shot` creates `Untitled Shot`, blank intent, Auto continuity, null Approved, and activates it. After reorder, show changed Auto-source count and Manual out-of-order count. Delete confirmation displays this Shot's generation/comparison counts and downstream impact; downstream Shots remain.

- [ ] **Step 7: Run syntax and existing browser regression**

```bash
node --check visual-direction-os/runtime/sequence-director-ui.js
node --check visual-direction-os/runtime/lineage-ui.js
node visual-direction-os/runtime/browser-acceptance-tests-v2.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/runtime/sequence-director-ui.js visual-direction-os/runtime/sequence-director.css visual-direction-os/runtime/lineage-ui.js visual-direction-os/runtime/lineage.css
git commit -m "feat(m6): add sequence director workspace"
```

---

### Task 9: `.vdos` Schema v2, v1→v2 Migration, Structural Validation

**Files:**
- Modify: `visual-direction-os/runtime/runtime-fingerprint.js`
- Modify: `visual-direction-os/runtime/runtime-fingerprint-tests.js`
- Modify: `visual-direction-os/runtime/schema-migrations.js`
- Modify: `visual-direction-os/runtime/schema-migrations-tests.js`
- Modify: `visual-direction-os/runtime/project-package.js`
- Modify: `visual-direction-os/runtime/project-package-tests.js`

**Interfaces:**
- `VDOS_PACKAGE_VERSION = 1` unchanged.
- `VDOS_SCHEMA_VERSION = 2`.
- Fingerprint adds `appVersion:'2.1-m6'`, `sequenceDirectorVersion:1`, `continuityEngineVersion:1`.
- `VDOS_SCHEMA_MIGRATIONS[1] = migrateV1ToV2`.
- Portable model adds `sequences`, `shots`; portable Artifact adds `sequenceId`, `shotId`, `continuityProvenance`.

- [ ] **Step 1: Write failing fingerprint/migration assertions**

```js
assert.equal(VDOS_PACKAGE_VERSION, 1);
assert.equal(VDOS_SCHEMA_VERSION, 2);
assert.equal(VDOS_RUNTIME_FINGERPRINT.appVersion, '2.1-m6');
assert.equal(VDOS_RUNTIME_FINGERPRINT.sequenceDirectorVersion, 1);
assert.equal(VDOS_RUNTIME_FINGERPRINT.continuityEngineVersion, 1);

const migrated = createSchemaMigrator({ currentVersion:2, migrations:VDOS_SCHEMA_MIGRATIONS }).migrate(v1Model).model;
assert.equal(migrated.schemaVersion, 2);
assert.equal(migrated.sequences.length, 1);
assert.equal(migrated.shots.length, 1);
assert.equal(migrated.shots[0].approvedArtifactId, null);
assert.equal(migrated.artifacts[1].parentArtifactId, v1Model.artifacts[1].parentArtifactId);
```

- [ ] **Step 2: Run test to verify failure**

```bash
node visual-direction-os/runtime/runtime-fingerprint-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
```

Expected: FAIL while runtime remains v1.

- [ ] **Step 3: Add schema v2 core files**

```js
{ path:'sequences.json', role:'core', bytes:stableJsonBytes({ schemaVersion:2, projectId:stage.project.id, sequences:stage.sequences }) },
{ path:'shots.json', role:'core', bytes:stableJsonBytes({ schemaVersion:2, projectId:stage.project.id, shots:stage.shots }) }
```

`parsePortableModel()` branches on manifest schema: v1 accepts absent structural files so migration can create them; native v2 requires both files before validation.

- [ ] **Step 4: Write exact validation tests**

```js
assert.throws(() => validatePortableModel(modelWithCrossShotParent, manifest), /same Shot/);
assert.throws(() => validatePortableModel(modelWithForeignApprovedArtifact, manifest), /Approved.*Shot/);
assert.throws(() => validatePortableModel(modelWithCrossShotComparison, manifest), /comparison.*Shot/i);
assert.throws(() => validatePortableModel(modelWithCrossSequenceManualSource, manifest), /same Sequence/);
assert.doesNotThrow(() => validatePortableModel(modelWithDanglingHistoricalContinuityProvenance, manifest));
```

- [ ] **Step 5: Preserve degraded asset recovery**

Corrupt the Approved image asset but leave Artifact metadata intact; stage import must succeed, retain `approvedArtifactId`, report an asset error, and let current runtime derive `source_unavailable`.

```js
assert.equal(staged.shots.find((x)=>x.id==='s1').approvedArtifactId, 'g1');
assert.ok(staged.importAudit.assetErrors.some((x)=>x.path.includes('g1')));
assert.equal(staged.artifacts.find((x)=>x.id==='g1').imageBlob, null);
```

- [ ] **Step 6: Run package tests**

```bash
node visual-direction-os/runtime/runtime-fingerprint-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
node visual-direction-os/runtime/project-package-tests.js
node visual-direction-os/runtime/vdos-codec-tests.js
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/runtime/runtime-fingerprint.js visual-direction-os/runtime/runtime-fingerprint-tests.js visual-direction-os/runtime/schema-migrations.js visual-direction-os/runtime/schema-migrations-tests.js visual-direction-os/runtime/project-package.js visual-direction-os/runtime/project-package-tests.js
git commit -m "feat(m6): add vdos schema v2 sequence structure"
```

---

### Task 10: Copy/Replace Full-Graph Remap and Whole-Project Export Source

**Files:**
- Modify: `visual-direction-os/runtime/project-package.js`
- Modify: `visual-direction-os/runtime/project-package-tests.js`
- Modify: `visual-direction-os/runtime/project-package-ui.js`
- Modify: `visual-direction-os/runtime/project-library-tests.js`
- Modify: `visual-direction-os/runtime/project-package-browser-acceptance-tests.js`

**Interfaces:**
- `stageImport()` adds `makeSequenceId`, `makeShotId`.
- Copy remaps live and dangling identity references.
- Export uses whole `memory.loadProjectBundle(activeProjectId)` membership.
- Project switching uses M6 `director.openProject(id)`.

- [ ] **Step 1: Write failing full-graph Copy assertions**

```js
const staged = await stageImport({
  decoded, migrator, existingProjectIds:new Set(['project-a']), mode:'copy',
  makeProjectId:()=>'project-copy',
  makeSequenceId:(id)=>`copy-${id}`,
  makeShotId:(id)=>`copy-${id}`,
  makeArtifactId:(id)=>`copy-${id}`,
  recomputeDerived
});
assert.equal(staged.shots[1].continuitySourceShotId, 'copy-shot-01');
assert.equal(staged.shots[0].approvedArtifactId, 'copy-g3');
assert.equal(staged.artifacts.find((a)=>a.id==='copy-h1').continuityProvenance.sourceArtifactId, 'copy-g3');
assert.equal(staged.project.activeSequenceId, 'copy-sequence-01');
assert.equal(staged.project.activeShotId, 'copy-shot-02');
```

For deleted provenance identity:

```js
const copied = staged.artifacts.find((a)=>a.sourceIdentity?.sourceArtifactId === 'h1');
assert.notEqual(copied.continuityProvenance.sourceShotId, 'deleted-shot-01');
assert.notEqual(copied.continuityProvenance.sourceArtifactId, 'deleted-g3');
assert.equal(staged.shots.some((s)=>s.id===copied.continuityProvenance.sourceShotId), false);
```

- [ ] **Step 2: Run test to verify failure**

Run: `node visual-direction-os/runtime/project-package-tests.js`

Expected: FAIL because M5 remap does not know M6 identities.

- [ ] **Step 3: Build complete identity closure and revalidate after remap**

Collect entity IDs plus every ID-bearing reference (`approvedArtifactId`, manual source, provenance source IDs, active IDs), assign Copy identities once, rewrite every field, then call portable validation again. Dangling provenance gets a remapped identity but no materialized entity.

- [ ] **Step 4: Replace Active-Shot export membership with whole bundle**

```js
const activeProjectId = library.getActiveProjectId();
const persisted = await memory.loadProjectBundle(activeProjectId);
const live = m4.getState?.() || null;
const runtimeArtifacts = persisted.artifacts.map((row) => {
  if (row.shotId !== live?.activeShotId) return row;
  return live.artifacts?.find((candidate)=>candidate.id===row.id) || row;
});
const stage = await packageRuntime.buildExportStage({
  project:persisted.project,
  sequences:persisted.sequences,
  shots:persisted.shots,
  runtimeArtifacts,
  persistedArtifacts:persisted.artifacts,
  comparisons:persisted.comparisons,
  memorySnapshot:null
});
```

Active Shot M4 state may enrich matching rows but never decides which Project artifacts exist.

- [ ] **Step 5: Switch package workspace coordinator to M6**

`createProjectPackageWorkspace({memory,library,director,...})` requires `director.openProject()`. Import order is atomic commit → Project Library active ID → M6 `openProject()`.

- [ ] **Step 6: Run package/workspace regressions**

```bash
node visual-direction-os/runtime/project-package-tests.js
node visual-direction-os/runtime/project-library-tests.js
node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/runtime/project-package.js visual-direction-os/runtime/project-package-tests.js visual-direction-os/runtime/project-package-ui.js visual-direction-os/runtime/project-library-tests.js visual-direction-os/runtime/project-package-browser-acceptance-tests.js
git commit -m "feat(m6): round trip sequence projects through vdos"
```

---

### Task 11: Browser Boot, Runtime Wiring and CI Protection

**Files:**
- Modify: `visual-direction-os/app.js`
- Modify: `visual-direction-os/runtime/app-boot-tests.js`
- Modify: `.github/workflows/m3-runtime-tests.yml`

**Interfaces:**
- `VisualDirectionOS.m4` remains available.
- `VisualDirectionOS.m6` becomes Project/Sequence/Shot coordinator.
- Browser emits `vdos:m6-state` snapshots.

- [ ] **Step 1: Write failing boot-order assertions**

```js
assert.ok(runtimeAssets.indexOf('runtime/sequence-model.js') < runtimeAssets.indexOf('runtime/m6-controller.js'));
assert.ok(runtimeAssets.indexOf('runtime/continuity-engine.js') < runtimeAssets.indexOf('runtime/m6-controller.js'));
assert.ok(runtimeAssets.indexOf('runtime/m4-controller.js') < runtimeAssets.indexOf('runtime/m6-controller.js'));
assert.ok(runtimeAssets.indexOf('runtime/m6-controller.js') < runtimeAssets.indexOf('runtime/sequence-director-ui.js'));
```

- [ ] **Step 2: Update critical runtime order/styles**

```js
'runtime/sequence-model.js',
'runtime/continuity-engine.js',
'runtime/director-memory.js',
'runtime/comparison-engine.js',
'runtime/memory-engine.js',
'runtime/m4-controller.js',
'runtime/m6-controller.js',
'runtime/lineage-ui.js',
'runtime/sequence-director-ui.js'
```

Load `runtime/sequence-director.css` with existing styles.

- [ ] **Step 3: Boot M6 as the coordinator**

`app.js` reads `vdos-active-project-id`, calls `VisualDirectionOS.m6.boot({projectId})`, and lets M6 call M4 `openShot()`. Package tooling remains optional after M6 mounts.

- [ ] **Step 4: Expand CI**

Add `m6-sequence-director` to push branches and these steps:

```bash
node visual-direction-os/runtime/sequence-model-tests.js
node visual-direction-os/runtime/continuity-engine-tests.js
node visual-direction-os/runtime/m6-controller-tests.js
node visual-direction-os/runtime/m6-browser-acceptance-tests.js
```

Add `node --check` for `sequence-model.js`, `continuity-engine.js`, `m6-controller.js`, `sequence-director-ui.js`, and `m6-browser-acceptance-tests.js`.

- [ ] **Step 5: Run focused boot/syntax tests**

```bash
node visual-direction-os/runtime/app-boot-tests.js
node --check visual-direction-os/runtime/sequence-model.js
node --check visual-direction-os/runtime/continuity-engine.js
node --check visual-direction-os/runtime/m6-controller.js
node --check visual-direction-os/runtime/sequence-director-ui.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/app.js visual-direction-os/runtime/app-boot-tests.js .github/workflows/m3-runtime-tests.yml
git commit -m "chore(m6): wire sequence director into browser boot and ci"
```

---

### Task 12: Real Browser M6 Acceptance and Full Regression Gate

**Files:**
- Create: `visual-direction-os/runtime/m6-browser-acceptance-tests.js`
- Modify only modules that fail a verified assertion from this acceptance scenario.

**Interfaces:**
- Uses the deployed-style zero-build browser runtime.
- Produces the final M6 release gate.

- [ ] **Step 1: Write the complete browser acceptance scenario**

The test must execute and assert this exact flow:

```text
Create/open Project
→ create Sequence 01 with intent
→ create Shot 01 with intent
→ generate g1
→ set g1 Approved
→ create Shot 02
→ assert Shot 01/g1 is continuity reference #1
→ generate h1
→ assert h1.parentArtifactId === null
→ assert h1.continuityProvenance.sourceArtifactId === g1
→ generate/approve g2 in Shot 01
→ assert Shot 02 is Review Required and h1 still exists
→ Accept Current Continuity on Shot 02
→ assert review source is g2
→ export `.vdos`
→ delete local Project
→ import `.vdos`
→ assert Sequence/Shot order, intents, Approved IDs, review, frozen h1→g1 provenance, current Shot 02→g2 continuity, and image bytes
```

Manual reorder assertion:

```js
await page.evaluate(() => VisualDirectionOS.m6.setContinuityManual('shot-03','shot-01'));
await page.evaluate(() => VisualDirectionOS.m6.reorderShots('sequence-01',['shot-03','shot-01','shot-02']));
assert.equal(await page.evaluate(() => VisualDirectionOS.m6.getState().continuityByShotId['shot-03']), 'source_out_of_order');
```

Approved asset-loss recovery assertion reuses M5 archive corruption helpers: after import, `approvedArtifactId` remains the same while derived continuity reads `source_unavailable`.

- [ ] **Step 2: Run test to expose first integration defect**

Run: `node visual-direction-os/runtime/m6-browser-acceptance-tests.js`

Expected initially: FAIL on the first missing integration behavior. Keep the assertions unchanged.

- [ ] **Step 3: Fix verified defects only**

For each failing assertion, patch the owning module, run its focused unit test, then rerun M6 browser acceptance. Do not add M7 or unrelated UI behavior.

- [ ] **Step 4: Run complete local regression matrix**

```bash
node visual-direction-os/runtime/runtime-tests.js
node visual-direction-os/runtime/agnes-adapter-tests.js
node visual-direction-os/runtime/generation-client-tests.js
node visual-direction-os/runtime/image-measurements-tests.js
node visual-direction-os/runtime/evaluation-engine-tests.js
node visual-direction-os/runtime/iteration-tests.js
node visual-direction-os/runtime/iteration-controller-tests.js
node visual-direction-os/runtime/director-memory-tests.js
node visual-direction-os/runtime/comparison-engine-tests.js
node visual-direction-os/runtime/memory-engine-tests.js
node visual-direction-os/runtime/m4-controller-tests.js
node visual-direction-os/runtime/sequence-model-tests.js
node visual-direction-os/runtime/continuity-engine-tests.js
node visual-direction-os/runtime/m6-controller-tests.js
node visual-direction-os/runtime/app-boot-tests.js
node visual-direction-os/runtime/runtime-fingerprint-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
node visual-direction-os/runtime/vdos-codec-tests.js
node visual-direction-os/runtime/project-package-tests.js
node visual-direction-os/runtime/project-library-tests.js
node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
node visual-direction-os/runtime/browser-acceptance-tests-v2.js
node visual-direction-os/runtime/m6-browser-acceptance-tests.js
node cloudflare/agnes-proxy-worker-tests.mjs
```

Expected: every command exits `0`.

- [ ] **Step 5: Run syntax/deployment validation**

Run the workflow's full `node --check` matrix plus new M6 files, then:

```bash
node -e "JSON.parse(require('fs').readFileSync('wrangler.jsonc','utf8')); JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('deployment config json passed')"
```

Expected: PASS.

- [ ] **Step 6: Commit acceptance gate**

```bash
git add visual-direction-os/runtime/m6-browser-acceptance-tests.js
git add visual-direction-os/runtime/*.js visual-direction-os/runtime/*.css visual-direction-os/app.js .github/workflows/m3-runtime-tests.yml
git commit -m "test(m6): add multi-shot browser acceptance gate"
```

- [ ] **Step 7: Push and verify CI on exact HEAD**

```bash
git rev-parse HEAD
git push origin m6-sequence-director
```

Record the exact HEAD SHA. GitHub Actions must be green on that exact SHA before a PR is considered merge-ready.

---

## Self-Review Checklist

### Spec coverage

- Sequence/Shot hierarchy and intents → Tasks 1, 4, 8.
- Active Shot M4 isolation → Task 6.
- Approved Frame / clear approval → Tasks 5, 8.
- Auto/manual continuity, reorder, out-of-order → Tasks 2, 5, 8.
- Dynamic source + frozen provenance → Tasks 5, 6, 7.
- Missing/unavailable + Generate Anyway → Tasks 2, 5, 7, 8.
- Non-destructive recursive review propagation → Tasks 2, 5.
- Human Accept Current Continuity → Tasks 5, 8.
- Source Shot deletion without downstream cascade → Tasks 4, 5.
- Same-Sequence-only continuity → Tasks 2, 5, 9.
- Agnes continuity reference #1 and intent precedence → Task 7.
- M5 schema v2, deterministic migration, validation, degraded asset recovery → Task 9.
- Copy/Replace remap including dangling provenance → Task 10.
- Whole-project export independent of Active Shot → Task 10.
- Sequence Board / Active Shot UX → Task 8.
- Real multi-shot `.vdos` round trip → Task 12.
- M3/M4/M5 protection → Tasks 6, 10, 11, 12.

### Placeholder scan

No `TBD`, `TODO`, “implement later”, unspecified “write tests for the above”, or unnamed error-handling steps remain. Every test task contains concrete assertions and every implementation task names the exact behavior/interface it must produce.

### Type/name consistency

Canonical names:

```text
Sequence.id / projectId / order / title / intent
Shot.id / projectId / sequenceId / order / title / intent
Shot.approvedArtifactId
Shot.continuityMode
Shot.continuitySourceShotId
Shot.continuityReview
Shot.continuityInvalidation
Artifact.projectId / sequenceId / shotId
Artifact.parentArtifactId / rootArtifactId
Artifact.continuityProvenance.sourceShotId
Artifact.continuityProvenance.sourceArtifactId
Artifact.continuityProvenance.status
VisualDirectionOS.m4.openShot(...)
VisualDirectionOS.m6.openProject(...)
VisualDirectionOS.m6.prepareGeneration(...)
```

No M6 edge is represented through M4 `parentArtifactId`, and no portable current-status field is treated as source of truth.
