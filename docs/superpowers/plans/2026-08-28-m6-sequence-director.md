# M6 Sequence Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-shot Sequence Director where every Shot owns an isolated M4 lineage, an Approved Frame can drive same-Sequence continuity into Agnes generation, downstream continuity risk is reviewable without destructive automation, and the entire structure round-trips through `.vdos` schema v2.

**Architecture:** Add a small M6 domain layer above M4: `sequence-model.js` defines stable records/migration identities, `continuity-engine.js` computes current continuity and invalidation without side effects, and `m6-controller.js` owns Sequence/Shot CRUD, active context, approval, continuity review, and generation context. Existing Director Memory is upgraded in place so Project/Sequence/Shot/Artifact/Comparison data participates in one IndexedDB transaction; M4 is narrowed to the Active Shot; M5 export/import is upgraded to whole-project schema v2 while preserving package version 1.

**Tech Stack:** Zero-build browser JavaScript, Node.js 24 `node:assert/strict` regression tests, IndexedDB, existing Visual Direction OS M3/M4/M5 runtime, Agnes Image 2.1 Flash, ZIP-compatible `.vdos` via vendored `fflate`, GitHub Actions.

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

- `visual-direction-os/runtime/sequence-model.js` — record shaping, deterministic legacy Sequence/Shot IDs, schema-safe ordering helpers, legacy bundle conversion.
- `visual-direction-os/runtime/sequence-model-tests.js` — pure model/migration tests.
- `visual-direction-os/runtime/continuity-engine.js` — pure continuity resolution, health derivation, dependency graph, invalidation propagation, reorder impact.
- `visual-direction-os/runtime/continuity-engine-tests.js` — pure continuity behavior tests.
- `visual-direction-os/runtime/m6-controller.js` — Sequence/Shot lifecycle, active context, Approved Frame, manual/auto continuity, review state, generation-context resolution.
- `visual-direction-os/runtime/m6-controller-tests.js` — controller orchestration tests with in-memory fakes.
- `visual-direction-os/runtime/sequence-director-ui.js` — Sequence Board, navigator, Shot intent, continuity controls, Approved/review actions.
- `visual-direction-os/runtime/sequence-director.css` — Sequence/Shot status and board styling.
- `visual-direction-os/runtime/m6-browser-acceptance-tests.js` — real browser end-to-end M6 + `.vdos` round-trip scenario.

### Existing runtime files to modify

- `visual-direction-os/runtime/director-memory.js` / `director-memory-tests.js` — IndexedDB v2 stores, shot-scoped queries, M6-aware atomic bundles, artifact provenance persistence.
- `visual-direction-os/runtime/m4-controller.js` / `m4-controller-tests.js` — Active Shot scoping only; no whole-project lineage state.
- `visual-direction-os/runtime/agnes-adapter.js` / `agnes-adapter-tests.js` — dedicated `continuity` semantics and idempotent M6 context injection.
- `visual-direction-os/runtime/generation-ui-m3.js` — resolve M6 context at generation click, reserve continuity as reference #1, preserve ordinary reference CRUD.
- `visual-direction-os/runtime/iteration-controller-tests.js` — prove branch redirects re-resolve current continuity through `generation.generate()`.
- `visual-direction-os/runtime/lineage-ui.js` / `lineage.css` — expose Set/Clear Approved Frame actions without changing lineage graph semantics.
- `visual-direction-os/runtime/schema-migrations.js` / `schema-migrations-tests.js` — default v1→v2 migration registry.
- `visual-direction-os/runtime/project-package.js` / `project-package-tests.js` — schema v2 portable records, validation, full graph remap including dangling provenance identity.
- `visual-direction-os/runtime/project-package-ui.js` / `project-library-tests.js` / `project-package-browser-acceptance-tests.js` — export from whole Director Memory bundle and switch projects through M6.
- `visual-direction-os/runtime/runtime-fingerprint.js` / `runtime-fingerprint-tests.js` — `schemaVersion:2`, M6 fingerprint versions.
- `visual-direction-os/app.js` / `app-boot-tests.js` — load M6 modules in dependency order and boot M6 as the active project/shot coordinator.
- `.github/workflows/m3-runtime-tests.yml` — run M6 unit/browser suites and syntax checks on the M6 branch.

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
- Produces: `migrateLegacyBundleToM6({project, artifacts, comparisons}): {project,sequences,shots,artifacts,comparisons}`

- [ ] **Step 1: Write failing model tests**

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
assert.deepEqual(first.sequences, second.sequences, 'legacy migration IDs must be deterministic');
assert.equal(first.shots[0].approvedArtifactId, null);
assert.equal(first.artifacts[1].parentArtifactId, 'g1');
assert.equal(first.artifacts[1].shotId, first.shots[0].id);
assert.equal(first.comparisons[0].shotId, first.shots[0].id);
```

- [ ] **Step 2: Run the test and verify the module is missing**

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

`migrateLegacyBundleToM6()` must preserve artifact IDs, parent/root lineage, image metadata, comparison IDs, and timestamps; add only `sequenceId`/`shotId`, deterministic default records, and active IDs on the project. It must never choose an Approved Frame.

- [ ] **Step 4: Run the focused test**

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
- Produces: `resolveContinuitySource({shot, shots, artifactsById}): ContinuityResolution`
- Produces: `deriveContinuityStatus({shot, shots, artifactsById}): string`
- Produces: `buildContinuityDependents(shots): Map<string,string[]>`
- Produces: `collectContinuityDescendants(sourceShotId, shots): string[]`
- Produces: `detectAutoSourceChange({shotId,beforeShots,afterShots}): {previousSourceShotId,currentSourceShotId}|null`
- Produces: `isContinuityReviewCurrent({shot,resolution}): boolean`

- [ ] **Step 1: Write failing continuity tests**

```js
const assert = require('node:assert/strict');
const { resolveContinuitySource, collectContinuityDescendants, deriveContinuityStatus } = require('./continuity-engine.js');

const shots = [
  { id:'s1', sequenceId:'q1', order:1, continuityMode:'auto', approvedArtifactId:'g1' },
  { id:'s2', sequenceId:'q1', order:2, continuityMode:'auto', approvedArtifactId:'h1' },
  { id:'s3', sequenceId:'q1', order:3, continuityMode:'manual', continuitySourceShotId:'s1', approvedArtifactId:null }
];
const artifactsById = new Map([
  ['g1', { id:'g1', shotId:'s1', imageBlob:new Blob(['g1'], {type:'image/webp'}) }],
  ['h1', { id:'h1', shotId:'s2', imageBlob:new Blob(['h1'], {type:'image/webp'}) }]
]);

assert.equal(resolveContinuitySource({ shot:shots[1], shots, artifactsById }).sourceShotId, 's1');
assert.equal(resolveContinuitySource({ shot:shots[2], shots, artifactsById }).sourceShotId, 's1');
assert.deepEqual(collectContinuityDescendants('s1', shots).sort(), ['s2','s3']);
assert.equal(deriveContinuityStatus({ shot:shots[0], shots, artifactsById }), 'not_applicable');
```

Add explicit cases for `source_missing`, `source_unavailable`, `source_out_of_order`, valid/expired `continuityReview`, same-Sequence enforcement, and auto source changing after reorder.

- [ ] **Step 2: Run and verify failure**

Run: `node visual-direction-os/runtime/continuity-engine-tests.js`

Expected: FAIL because the module is missing.

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

Resolution must distinguish no source, source with no Approved Frame, Approved metadata with missing `imageBlob`, and manual source after the current Shot. It must never substitute latest generation.

- [ ] **Step 4: Run focused tests**

Run: `node visual-direction-os/runtime/continuity-engine-tests.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/continuity-engine.js visual-direction-os/runtime/continuity-engine-tests.js
git commit -m "feat(m6): add continuity resolution engine"
```

---

### Task 3: Upgrade Director Memory to Project / Sequence / Shot Atomic Storage

**Files:**
- Modify: `visual-direction-os/runtime/director-memory.js`
- Modify: `visual-direction-os/runtime/director-memory-tests.js`

**Interfaces:**
- Consumes: Sequence/Shot records from Task 1.
- Produces: `listSequences(projectId)`
- Produces: `putSequence(sequence)` / `deleteSequence(id)`
- Produces: `listShots(sequenceId)` / `putShot(shot)` / `deleteShot(id)`
- Produces: `listArtifactsForShot(projectId, sequenceId, shotId)`
- Produces: `listComparisonsForShot(projectId, sequenceId, shotId)`
- Changes: `saveGenerationArtifact({artifact,lineage})` lineage now requires `projectId,sequenceId,shotId,rootArtifactId,parentArtifactId,generationIndex`.
- Changes: `loadProjectBundle(projectId)` returns `{project,sequences,shots,artifacts,comparisons}`.
- Changes: `commitProjectBundle()` atomically commits all five stores.

- [ ] **Step 1: Extend failing memory tests**

```js
const row = shapeArtifactRecord({
  artifact:{ id:'h1', continuityProvenance:{ sourceShotId:'s1', sourceArtifactId:'g1', status:'resolved' } },
  projectId:'p1', sequenceId:'q1', shotId:'s2', rootArtifactId:'h1', parentArtifactId:null,
  generationIndex:1, persistenceStatus:'meta_only'
});
assert.equal(row.sequenceId, 'q1');
assert.equal(row.shotId, 's2');
assert.equal(row.continuityProvenance.sourceArtifactId, 'g1');
```

Add fake IndexedDB coverage proving `loadProjectBundle('p1')` returns both structural stores and `commitProjectBundle({mode:'replace', ...})` does not leave partial new data when a duplicate/add failure aborts the transaction.

- [ ] **Step 2: Run and verify failures**

Run: `node visual-direction-os/runtime/director-memory-tests.js`

Expected: FAIL on missing M6 fields/stores/query methods.

- [ ] **Step 3: Bump IndexedDB version and create stores/indexes**

```js
const DB_VERSION = 2;
// onupgradeneeded
const sequenceStore = db.objectStoreNames.contains('sequences')
  ? request.transaction.objectStore('sequences')
  : db.createObjectStore('sequences', { keyPath:'id' });
ensureIndex(sequenceStore, 'projectId', 'projectId');
ensureIndex(sequenceStore, 'order', 'order');

const shotStore = db.objectStoreNames.contains('shots')
  ? request.transaction.objectStore('shots')
  : db.createObjectStore('shots', { keyPath:'id' });
ensureIndex(shotStore, 'projectId', 'projectId');
ensureIndex(shotStore, 'sequenceId', 'sequenceId');
ensureIndex(shotStore, 'order', 'order');
ensureIndex(artifactStore, 'sequenceId', 'sequenceId');
ensureIndex(artifactStore, 'shotId', 'shotId');
ensureIndex(comparisonStore, 'sequenceId', 'sequenceId');
ensureIndex(comparisonStore, 'shotId', 'shotId');
```

- [ ] **Step 4: Expand atomic bundle validation and transaction scope**

`assertProjectBundle()` must verify every Sequence belongs to the Project, every Shot belongs to an included Sequence, every Artifact belongs to an included Shot, and every Comparison belongs to one Shot. `clearProject()` / Replace must delete `sequences`, `shots`, `artifacts`, and `comparisons` within the same transaction.

- [ ] **Step 5: Run focused tests**

Run: `node visual-direction-os/runtime/director-memory-tests.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/director-memory.js visual-direction-os/runtime/director-memory-tests.js
git commit -m "feat(m6): persist sequence and shot bundles"
```

---

### Task 4: M6 Controller — Project Boot, Legacy Local Migration, CRUD, Active Context

**Files:**
- Create: `visual-direction-os/runtime/m6-controller.js`
- Create: `visual-direction-os/runtime/m6-controller-tests.js`

**Interfaces:**
- Consumes: Task 1 model helpers, Task 2 continuity engine, Task 3 Director Memory, existing M4 controller.
- Produces: `createM6Controller({memory,m4,now,makeSequenceId,makeShotId,onState})`
- Produces methods: `boot`, `openProject`, `createSequence`, `updateSequence`, `deleteSequence`, `createShot`, `updateShot`, `reorderShots`, `deleteShot`, `setActiveShot`, `getState`, `resolveContinuity`.
- M4 contract required by this task: temporary fake exposes `openShot({projectId,sequenceId,shotId})`; Task 6 makes real M4 satisfy it.

- [ ] **Step 1: Write failing controller boot/CRUD tests**

```js
const state = await controller.boot({ projectId:'p1' });
assert.equal(state.sequences.length, 1, 'legacy project should gain one default sequence');
assert.equal(state.shots.length, 1, 'legacy project should gain one default shot');
assert.equal(state.activeShotId, state.shots[0].id);
assert.deepEqual(m4Calls.at(-1), {
  projectId:'p1', sequenceId:state.sequences[0].id, shotId:state.shots[0].id
});

const shot2 = await controller.createShot({ sequenceId:state.sequences[0].id, title:'Shot 02', intent:'Gwen reveal' });
assert.equal(shot2.continuityMode, 'auto');
await controller.setActiveShot(shot2.id);
assert.equal(controller.getState().activeShotId, shot2.id);
```

Also assert local legacy migration uses one atomic Replace bundle and does not alter legacy artifact IDs or parent/root IDs.

- [ ] **Step 2: Run and verify failure**

Run: `node visual-direction-os/runtime/m6-controller-tests.js`

Expected: FAIL because `m6-controller.js` is missing.

- [ ] **Step 3: Implement controller state and boot migration**

```js
const state = {
  project:null, sequences:[], shots:[], activeSequenceId:null, activeShotId:null,
  continuityByShotId:{}, restoreError:'', persistenceWarning:''
};
```

On `openProject()` / `boot()`: load the whole bundle; if `sequences.length === 0`, call `migrateLegacyBundleToM6()` then atomically Replace the same project ID; repair invalid active navigation to the first valid Sequence/Shot and persist that navigation repair without inventing Approved decisions.

- [ ] **Step 4: Implement CRUD and active navigation**

Creating a Sequence appends order and creates no implicit Shot unless the UI explicitly calls `createShot`. Creating a Shot defaults to `continuityMode:'auto'`. Sequence deletion cascades only inside that Sequence; because cross-Sequence continuity is forbidden, no other Sequence may depend on it. Shot deletion removes its own M4 data but not later dependent Shots.

- [ ] **Step 5: Run focused tests**

Run: `node visual-direction-os/runtime/m6-controller-tests.js`

Expected: PASS for boot, migration, CRUD, order, and active context.

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
- Adds: `setApprovedFrame(shotId, artifactId)`
- Adds: `clearApprovedFrame(shotId)`
- Adds: `setContinuityAuto(shotId)`
- Adds: `setContinuityManual(shotId, sourceShotId)`
- Adds: `acceptCurrentContinuity(shotId, note='')`
- Adds: `getContinuityImpact(shotId)`
- Adds: `resolveGenerationContext({ordinaryReferences=[]})`

- [ ] **Step 1: Add failing approval/invalidation tests**

```js
await controller.setApprovedFrame('s1', 'g1');
await controller.setApprovedFrame('s2', 'h1');
await controller.setApprovedFrame('s1', 'g2');
let s2 = controller.getState().shots.find((row) => row.id === 's2');
assert.equal(controller.resolveContinuity('s2').sourceArtifactId, 'g2');
assert.equal(controller.getState().continuityByShotId.s2, 'review_required');
assert.equal(s2.approvedArtifactId, 'h1', 'invalidation must not clear downstream approval');

await controller.acceptCurrentContinuity('s2');
s2 = controller.getState().shots.find((row) => row.id === 's2');
assert.equal(s2.continuityReview.reviewedArtifactId, 'h1');
assert.equal(s2.continuityReview.sourceArtifactId, 'g2');
```

Add cases for clear approval → direct `source_missing`, descendants → `review_required`; manual source preservation after reorder; auto source change after reorder; manual out-of-order; deleted source Shot; cross-Sequence source rejection; Approved artifact must belong to same Shot.

- [ ] **Step 2: Run and verify failures**

Run: `node visual-direction-os/runtime/m6-controller-tests.js`

Expected: FAIL on missing approval/review methods.

- [ ] **Step 3: Implement non-destructive invalidation**

```js
function invalidationRecord({ reason, causedByShotId, previousArtifactId = null, currentArtifactId = null, now }) {
  return { reason, causedByShotId, previousArtifactId, currentArtifactId, invalidatedAt:now() };
}
```

Direct dependents receive the precise current fault (`source_missing` is derived when the source vanishes); deeper descendants retain their objects and receive `continuityInvalidation` so their derived state becomes `review_required`. Never rewrite historical artifact provenance.

- [ ] **Step 4: Implement review validity**

`Accept Current Continuity` is permitted only when the Shot has an Approved Frame and current resolved source Artifact. The stored `continuityReview.sourceArtifactId` must match the current resolved source to be considered valid; any later source change makes the review stale automatically through derived status.

- [ ] **Step 5: Run focused tests**

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
- Adds to M4: `openShot({projectId,sequenceId,shotId})`.
- M4 state adds: `activeSequenceId`, `activeShotId`.
- M4 reads: `memory.listArtifactsForShot()` and `memory.listComparisonsForShot()` only.
- Artifact persistence freezes: `sequenceId`, `shotId`, `continuityProvenance`.
- Comparison persistence adds: `sequenceId`, `shotId` and rejects cross-Shot A/B.

- [ ] **Step 1: Add failing M4 isolation tests**

```js
await controller.openShot({ projectId:'p1', sequenceId:'q1', shotId:'s1' });
assert.deepEqual(controller.getState().artifacts.map((a) => a.id), ['g1','g2']);
await controller.openShot({ projectId:'p1', sequenceId:'q1', shotId:'s2' });
assert.deepEqual(controller.getState().artifacts.map((a) => a.id), ['h1']);
assert.throws(() => controller.selectA('g1'), /Unknown A artifact/);
```

Add a persistence assertion that a generated `h2` with `parentArtifactId:'h1'` and `continuityProvenance:{sourceShotId:'s1',sourceArtifactId:'g2',status:'resolved'}` keeps those as separate relationships.

- [ ] **Step 2: Run and verify failure**

Run: `node visual-direction-os/runtime/m4-controller-tests.js`

Expected: FAIL because M4 still loads Project-wide artifacts.

- [ ] **Step 3: Replace Project-wide read with Shot-scoped read**

```js
async function readShotState({ projectId, sequenceId, shotId }) {
  const [artifacts, comparisons] = await Promise.all([
    memory.listArtifactsForShot(projectId, sequenceId, shotId),
    memory.listComparisonsForShot(projectId, sequenceId, shotId)
  ]);
  return { artifacts, comparisons };
}
```

`ingestGeneration()` must require an active Shot and reject a parent Artifact that is not currently loaded in that Shot. `deleteSubtree()` therefore remains inherently same-Shot.

- [ ] **Step 4: Persist frozen M6 provenance with the artifact**

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

`shapeArtifactRecord()` copies `artifact.continuityProvenance` verbatim. It must not resolve or update it later.

- [ ] **Step 5: Run M4 + memory tests**

Run:
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

### Task 7: Agnes Sequence Context and Generation-Time Continuity Injection

**Files:**
- Modify: `visual-direction-os/runtime/agnes-adapter.js`
- Modify: `visual-direction-os/runtime/agnes-adapter-tests.js`
- Modify: `visual-direction-os/runtime/generation-ui-m3.js`
- Modify: `visual-direction-os/runtime/iteration-controller-tests.js`
- Modify: `visual-direction-os/runtime/m6-controller.js`
- Modify: `visual-direction-os/runtime/m6-controller-tests.js`

**Interfaces:**
- Adds Agnes role: `continuity`.
- Produces: `applyAgnesSequenceContext(request,{sequenceIntent,shotIntent,continuityReference}): request`.
- M6 produces async: `prepareGeneration({ordinaryReferences}): {sequenceIntent,shotIntent,continuityReference,continuityProvenance,status}`.
- Browser `generation.generate()` re-resolves M6 context every invocation, including M4 redirects.

- [ ] **Step 1: Write failing Agnes context tests**

```js
const base = buildAgnesRequest({ compiled, references:[{ source:'data:image/png;base64,CHAR', role:'character' }] });
const finalRequest = applyAgnesSequenceContext(base, {
  sequenceIntent:'Move from isolation toward action.',
  shotIntent:'Cut to a frontal close-up.',
  continuityReference:{ source:'data:image/webp;base64,CONT', role:'continuity' }
});
assert.equal(finalRequest.extra_body.image[0], 'data:image/webp;base64,CONT');
assert.equal(finalRequest.extra_body.image[1], 'data:image/png;base64,CHAR');
assert.match(finalRequest.prompt, /SEQUENCE DIRECTION/);
assert.match(finalRequest.prompt, /CURRENT SHOT INTENT/);
assert.match(finalRequest.prompt, /same visual world/i);
```

Add test that base request is unchanged, sequence context application is idempotent when rerun from the context-neutral base, and continuity removes `return_base64` when an image input is added.

- [ ] **Step 2: Run and verify failure**

Run: `node visual-direction-os/runtime/agnes-adapter-tests.js`

Expected: FAIL on missing `applyAgnesSequenceContext` and unsupported `continuity` role.

- [ ] **Step 3: Implement dedicated continuity semantics**

Add `continuity` to `REFERENCE_ROLES` with wording that preserves character identity, wardrobe, props, environment state, palette ownership, and lighting logic while explicitly allowing current Shot Intent to change framing, pose, action, and camera.

`applyAgnesSequenceContext()` prepends M6 sections to the prompt and unshifts continuity into `extra_body.image`; ordinary references keep their existing order.

- [ ] **Step 4: Make generation click-time resolution authoritative**

In `generation-ui-m3.js`, keep `state.references` as ordinary references only. Before proxy execution:

```js
const m6 = root.VisualDirectionOS?.m6;
const prepared = await m6?.prepareGeneration?.({ ordinaryReferences:state.references }) || null;
const executionRequest = prepared
  ? applyAgnesSequenceContext(request, prepared)
  : request;
```

The artifact stores ordinary `references` as before and receives `artifact.continuityProvenance = prepared?.continuityProvenance || {sourceShotId:null,sourceArtifactId:null,status:'not_applicable'}`. Never add the continuity image to ordinary reference CRUD or M5 reference assets.

- [ ] **Step 5: Enforce the eight-image limit without silent dropping**

When continuity resolves, only 7 ordinary references fit. If the user already has 8 ordinary references, generation shows an explicit error and does not call the proxy until one is removed. When continuity is missing/unavailable and the user confirms Generate Anyway, all 8 ordinary slots remain available.

- [ ] **Step 6: Prove M4 redirects use current continuity**

Extend `iteration-controller-tests.js` so `generation.generate(revised, context)` is called and the generation fake resolves M6 context at that call. Test scenario: `h1` historically came from `g3`, current source is `g5`, redirect from `h1` produces new artifact with `parentArtifactId:'h1'` and continuity provenance `g5`.

- [ ] **Step 7: Run focused generation tests**

Run:
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

### Task 8: Sequence Board, Active Shot UX, Approved Actions and Continuity Review UI

**Files:**
- Create: `visual-direction-os/runtime/sequence-director-ui.js`
- Create: `visual-direction-os/runtime/sequence-director.css`
- Modify: `visual-direction-os/runtime/lineage-ui.js`
- Modify: `visual-direction-os/runtime/lineage.css`

**Interfaces:**
- Consumes: `VisualDirectionOS.m6.getState()` plus M6 controller actions from Tasks 4/5.
- Consumes: `vdos:m4-state` and new `vdos:m6-state` browser events.
- Produces: Board/Director view switching without creating separate persistent state.

- [ ] **Step 1: Add DOM-level UI assertions to a new controller/UI fixture**

Use a minimal document fixture (same style as existing headless browser scripts) and assert rendered Shot cards use Approved thumbnail first, latest generation only as a display fallback, and never use latest as continuity source.

Expected card state text examples are exact:

```text
✓ Approved
⚠ Review Required
! Source Missing
! Source Asset Missing
↗ Source Out of Order
```

- [ ] **Step 2: Render persistent Sequence context around M4**

The UI must expose:

```html
<section class="sequence-director" aria-label="Sequence Director">
  <header class="sequence-director-head"></header>
  <aside class="sequence-navigator"></aside>
  <main class="active-shot-context"></main>
</section>
```

Shot Intent stays visible in the Active Shot workspace. Sequence Intent appears in the Sequence header and a compact/collapsible form in Director view.

- [ ] **Step 3: Implement continuity controls**

Render Auto as `Auto · Previous Shot`, Manual as `Manual · <Shot title>`. Manual choices include only earlier Shots from the same Sequence. If an existing manual source becomes later after reorder, render `Continuity Source Out of Order` with `Keep Manual Source` and `Reset to Previous Shot`.

- [ ] **Step 4: Add Approved Frame actions to lineage UI**

Each artifact action area gets `Set as Approved Frame`; the selected artifact renders `★ Approved Frame`. Deleting an Approved artifact is blocked with actions to `Choose Another` or `Clear Approval`; no automatic clear occurs.

- [ ] **Step 5: Implement Review Required actions**

A review panel shows previous/current source IDs from `continuityInvalidation` and current resolution, then offers exactly the primary actions `Accept Current Continuity` and `Generate New Version`. The latter prepares the workspace but does not auto-call Agnes.

- [ ] **Step 6: Implement Shot create/reorder/delete UX**

`+ Add Shot` creates `Untitled Shot`, blank intent, Auto continuity, no Approved Frame, then activates it. Reorder reports changed Auto sources and out-of-order Manual sources after the move rather than blocking the drag. Delete Shot confirmation states its own generation/comparison counts and continuity impact; downstream Shots are not deleted.

- [ ] **Step 7: Run syntax and existing UI regressions**

Run:
```bash
node --check visual-direction-os/runtime/sequence-director-ui.js
node --check visual-direction-os/runtime/lineage-ui.js
node visual-direction-os/runtime/browser-acceptance-tests-v2.js
```

Expected: syntax PASS and existing M4 browser acceptance remains PASS.

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/runtime/sequence-director-ui.js visual-direction-os/runtime/sequence-director.css visual-direction-os/runtime/lineage-ui.js visual-direction-os/runtime/lineage.css
git commit -m "feat(m6): add sequence director workspace"
```

---

### Task 9: `.vdos` Schema v2, v1→v2 Migration and Structural Validation

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
- Adds runtime fingerprint: `appVersion:'2.1-m6'`, `sequenceDirectorVersion:1`, `continuityEngineVersion:1`.
- Adds: `VDOS_SCHEMA_MIGRATIONS[1] = migrateV1ToV2`.
- Portable model adds `sequences`, `shots`; portable Artifact adds `sequenceId`, `shotId`, `continuityProvenance`.

- [ ] **Step 1: Write failing fingerprint/migration tests**

```js
assert.equal(VDOS_PACKAGE_VERSION, 1);
assert.equal(VDOS_SCHEMA_VERSION, 2);
assert.equal(VDOS_RUNTIME_FINGERPRINT.sequenceDirectorVersion, 1);
assert.equal(VDOS_RUNTIME_FINGERPRINT.continuityEngineVersion, 1);
```

For migration, feed a schema v1 model and assert deterministic Sequence/Shot IDs, preserved lineage, no Approved Frame, and `schemaVersion === 2`.

- [ ] **Step 2: Run and verify failures**

Run:
```bash
node visual-direction-os/runtime/runtime-fingerprint-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
```

Expected: FAIL while runtime remains schema v1.

- [ ] **Step 3: Add schema v2 core files**

`buildArchiveFiles()` must include:

```js
{ path:'sequences.json', role:'core', bytes:stableJsonBytes({ schemaVersion:2, projectId:stage.project.id, sequences:stage.sequences }) },
{ path:'shots.json', role:'core', bytes:stableJsonBytes({ schemaVersion:2, projectId:stage.project.id, shots:stage.shots }) }
```

`requiredCorePaths()` requires them only after migration/for native v2 parsing; v1 decode must remain parseable so migration can create the absent structures.

- [ ] **Step 4: Extend portable validation**

Reject: Artifact/Shot/Sequence ownership mismatch, Approved Artifact from another Shot, parent/root crossing a Shot, cross-Shot comparisons, and live manual continuity across Sequences. Allow: missing `continuityProvenance.sourceShotId/sourceArtifactId` entity when it is historical dangling provenance from a deleted source.

- [ ] **Step 5: Preserve asset failure semantics**

If an Approved Artifact metadata row exists but its image asset fails integrity, import remains recoverable and later derived continuity becomes `source_unavailable`; do not clear `approvedArtifactId` and do not substitute a different artifact.

- [ ] **Step 6: Run package tests**

Run:
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

### Task 10: Copy/Replace Full Graph Remap and Whole-Project Export Source

**Files:**
- Modify: `visual-direction-os/runtime/project-package.js`
- Modify: `visual-direction-os/runtime/project-package-tests.js`
- Modify: `visual-direction-os/runtime/project-package-ui.js`
- Modify: `visual-direction-os/runtime/project-library-tests.js`
- Modify: `visual-direction-os/runtime/project-package-browser-acceptance-tests.js`

**Interfaces:**
- `stageImport()` adds `makeSequenceId`, `makeShotId` factories.
- Copy remap rewrites Project, Sequence, Shot, Artifact, Comparison, Approved, manual continuity, continuity provenance, and active navigation IDs.
- Export reads full `memory.loadProjectBundle(activeProjectId)`; it must not use Active Shot M4 artifacts as the project source.
- Project switching after import/open is delegated to M6 `openProject()`.

- [ ] **Step 1: Write failing full-graph Copy test**

```js
const staged = await stageImport({
  decoded, migrator, existingProjectIds:new Set(['project-a']), mode:'copy',
  makeProjectId:() => 'project-copy',
  makeSequenceId:(id) => `copy-${id}`,
  makeShotId:(id) => `copy-${id}`,
  makeArtifactId:(id) => `copy-${id}`,
  recomputeDerived
});
assert.equal(staged.shots[1].continuitySourceShotId, 'copy-shot-01');
assert.equal(staged.shots[0].approvedArtifactId, 'copy-g3');
assert.equal(staged.artifacts.find((a) => a.id === 'copy-h1').continuityProvenance.sourceArtifactId, 'copy-g3');
```

Add a dangling provenance test: referenced deleted IDs are remapped consistently without materializing missing Shot/Artifact entities.

- [ ] **Step 2: Run and verify failure**

Run: `node visual-direction-os/runtime/project-package-tests.js`

Expected: FAIL because remap knows only current M5 IDs.

- [ ] **Step 3: Build identity closure before remap**

Collect IDs from existing entities plus every ID-bearing reference field. Create a map for dangling `continuityProvenance` identities as well as live entities. Apply remap once to all structural and historical references, then run portable validation again.

- [ ] **Step 4: Replace M4 export snapshot dependency**

In `project-package-ui.js`, export flow becomes:

```js
const activeProjectId = library.getActiveProjectId();
const persisted = await memory.loadProjectBundle(activeProjectId);
const stage = await packageRuntime.buildExportStage({
  project:persisted.project,
  sequences:persisted.sequences,
  shots:persisted.shots,
  runtimeArtifacts:persisted.artifacts,
  persistedArtifacts:persisted.artifacts,
  comparisons:persisted.comparisons,
  memorySnapshot:null
});
```

If current Active Shot M4 state contains newer in-memory evaluation metadata, merge only matching Artifact IDs into the persisted whole-project set; never use Active Shot state as the membership list.

- [ ] **Step 5: Switch package workspace coordination from M4 to M6**

`createProjectPackageWorkspace()` accepts `director` where `director.openProject(id)` is M6. Commit import atomically first, activate Project Library second, then `director.openProject(staged.project.id)` third.

- [ ] **Step 6: Run package/workspace tests**

Run:
```bash
node visual-direction-os/runtime/project-package-tests.js
node visual-direction-os/runtime/project-library-tests.js
node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
```

Expected: all PASS, including existing M5 partial recovery and Copy/Replace semantics.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/runtime/project-package.js visual-direction-os/runtime/project-package-tests.js visual-direction-os/runtime/project-package-ui.js visual-direction-os/runtime/project-library-tests.js visual-direction-os/runtime/project-package-browser-acceptance-tests.js
git commit -m "feat(m6): round trip sequence projects through vdos"
```

---

### Task 11: Browser Boot / Runtime Wiring / CI Protection

**Files:**
- Modify: `visual-direction-os/app.js`
- Modify: `visual-direction-os/runtime/app-boot-tests.js`
- Modify: `.github/workflows/m3-runtime-tests.yml`

**Interfaces:**
- Browser global: `VisualDirectionOS.m4` remains available.
- Browser global: `VisualDirectionOS.m6` becomes the Project/Sequence/Shot coordinator.
- Browser event: `vdos:m6-state` contains controller snapshot.

- [ ] **Step 1: Write failing boot-order assertions**

Assert `sequence-model.js` and `continuity-engine.js` load before `m6-controller.js`; `m4-controller.js` loads before `m6-controller.js`; `sequence-director-ui.js` loads after M6; package runtime starts only after critical M3/M4/M6 runtime is mounted.

- [ ] **Step 2: Update critical runtime asset order**

Target order around M4/M6:

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

Load `runtime/sequence-director.css` with existing runtime styles.

- [ ] **Step 3: Boot M6 instead of booting M4 directly**

`app.js` reads `vdos-active-project-id` as before, calls `VisualDirectionOS.m6.boot({projectId})`, and lets M6 call M4 `openShot()`. M4 remains usable if package tooling fails; M6 is now part of the critical directing path rather than optional package tooling.

- [ ] **Step 4: Expand CI**

Add `m6-sequence-director` to push branches. Add Node steps for:

```bash
node visual-direction-os/runtime/sequence-model-tests.js
node visual-direction-os/runtime/continuity-engine-tests.js
node visual-direction-os/runtime/m6-controller-tests.js
node visual-direction-os/runtime/m6-browser-acceptance-tests.js
```

Add `node --check` for all new M6 JS files.

- [ ] **Step 5: Run boot tests and syntax checks locally**

Run:
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
- Modify only if a verified acceptance failure requires it: files from Tasks 1–11.

**Interfaces:**
- Consumes the deployed-style zero-build browser runtime exactly as users do.
- Produces the final M6 release gate.

- [ ] **Step 1: Write the full browser scenario before fixing any remaining integration defects**

The script must execute this exact flow in a real headless browser:

```text
Create/open Project
→ create Sequence 01 with intent
→ create Shot 01 with intent
→ generate g1
→ set g1 Approved
→ create Shot 02
→ verify Shot 01/g1 resolves as continuity reference #1
→ generate h1
→ verify h1.parentArtifactId === null
→ verify h1.continuityProvenance.sourceArtifactId === g1
→ generate/approve g2 in Shot 01
→ verify Shot 02 becomes Review Required without losing h1 or its Approved identity
→ Accept Current Continuity on Shot 02
→ verify review records source g2
→ export complete `.vdos`
→ delete local Project
→ import `.vdos`
→ verify Sequence/Shot order, intents, Approved IDs, review, frozen h1→g1 provenance, current Shot 02→g2 continuity, and image bytes
```

Also include a manual continuity reorder case and an asset-missing recovery fixture if the existing M5 browser package test can supply corruption helpers without duplicating codec logic.

- [ ] **Step 2: Run the new acceptance test and capture the first real failure**

Run: `node visual-direction-os/runtime/m6-browser-acceptance-tests.js`

Expected initially: FAIL on the first missing integration behavior; do not weaken assertions.

- [ ] **Step 3: Fix only verified integration defects**

For each failure, patch the owning module, rerun its focused unit test, then rerun `m6-browser-acceptance-tests.js`. Do not add unrelated UX or M7 features.

- [ ] **Step 4: Run the complete local regression matrix**

Run:
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

Expected: every suite exits `0`.

- [ ] **Step 5: Run syntax/deployment validation**

Run the same `node --check` matrix as `.github/workflows/m3-runtime-tests.yml` plus the four new M6 JS files, then:

```bash
node -e "JSON.parse(require('fs').readFileSync('wrangler.jsonc','utf8')); JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('deployment config json passed')"
```

Expected: PASS.

- [ ] **Step 6: Commit the acceptance gate**

```bash
git add visual-direction-os/runtime/m6-browser-acceptance-tests.js
git add visual-direction-os/runtime/*.js visual-direction-os/runtime/*.css visual-direction-os/app.js .github/workflows/m3-runtime-tests.yml
git commit -m "test(m6): add multi-shot browser acceptance gate"
```

- [ ] **Step 7: Push branch and verify GitHub Actions on the exact HEAD SHA**

Run:

```bash
git rev-parse HEAD
git push origin m6-sequence-director
```

Record the exact HEAD SHA. GitHub Actions must be green on that SHA before opening or merging a PR. Do not treat a green run on an earlier SHA as evidence for the final branch.

---

## Self-Review Checklist

### Spec coverage

- Sequence/Shot hierarchy and free-text intents → Tasks 1, 4, 8.
- Active Shot M4 isolation → Task 6.
- Approved Frame and clear approval → Tasks 5, 8.
- Auto/manual continuity, reorder, out-of-order → Tasks 2, 5, 8.
- Dynamic source + frozen artifact provenance → Tasks 5, 6, 7.
- Missing/unavailable continuity and Generate Anyway → Tasks 2, 7, 8.
- Non-destructive recursive review propagation → Tasks 2, 5.
- Human Accept Current Continuity → Tasks 5, 8.
- Source deletion without downstream cascade → Tasks 4, 5.
- Same-Sequence-only continuity → Tasks 2, 5, 9.
- Dedicated Agnes continuity reference #1 and intent precedence → Task 7.
- M5 schema v2, deterministic migration, validation, degraded asset recovery → Task 9.
- Copy/Replace full graph remap including dangling provenance → Task 10.
- Whole-project export independent of Active Shot → Task 10.
- Browser board/workspace UX → Task 8.
- Real `.vdos` multi-shot round trip → Task 12.
- Existing M3/M4/M5 protection → Tasks 6, 10, 11, 12.

### Placeholder scan

This plan intentionally contains no `TBD`, `TODO`, “implement later”, or unspecified “add tests/error handling” steps. Every task names its files, interfaces, focused tests, implementation behavior, and commit.

### Type/name consistency

Canonical names used throughout the plan:

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
