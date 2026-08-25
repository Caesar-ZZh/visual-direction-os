# M4 Iteration Memory & Comparative Direction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent generation lineage, A/B comparative QA, correction effectiveness tracking, and branch-aware Director Memory on top of the working M3 generation/evaluation loop.

**Architecture:** Keep M3 generation and evaluation responsibilities intact. Add a local-first IndexedDB persistence boundary, pure comparison and memory-policy engines, a small M4 orchestration controller, and a view-only lineage/A-B UI. M4 listens to M3 generation/evaluation events, persists complete artifacts including image Blobs, derives parent/child comparisons and memory state, and compiles bounded future iteration context without recursively accumulating historical deltas.

**Tech Stack:** Browser JavaScript (UMD-style runtime modules), IndexedDB, Blob/Object URL, CustomEvent, Node.js 24 regression scripts, existing GitHub Actions runtime workflow.

**Spec:** `docs/superpowers/specs/2026-08-25-m4-iteration-memory-comparative-direction-design.md`, with the user-approved 2026-08-25 revised review rules as the implementation authority.

## Global Constraints

- Preserve the M3 stage semantics: `DIRECT → GENERATE → MEASURE → JUDGE → RE-DIRECT`.
- Full B1 persistence: every generation retains image, request/prompt, Visual IR, measurements, evaluation, judgments, delta, lineage, and comparison metadata.
- Use IndexedDB, not `localStorage`, for project history and images.
- `persistenceStatus` values are exactly `persisted`, `not_persisted`, `meta_only`.
- URL image-fetch failure produces `meta_only`; full IndexedDB/quota write failure produces `not_persisted` without deleting existing history.
- Comparison State and Effectiveness State are independent enums. `warn → warn` is Comparison `stable_warn` and correction Effectiveness `unresolved`.
- Comparison summary counters are exactly `resolved`, `regressed`, `stablePass`, `stableWarn`, `unresolved`.
- Measured rules lock only after pass across two consecutive comparable generations.
- Semantic rules never auto-lock; they require explicit director confirmation.
- Memory state is branch-aware. Sibling branches do not mutate one another's path conclusions.
- M4 may not infer semantic/narrative certainty from pixel measurements.
- M4 must degrade independently; M3 must remain usable if IndexedDB restore/write fails.
- No automatic deletion, generation cap, cloud sync, account system, ZIP export, or single composite quality score in M4 first release.

---

## File Structure

**Create**
- `visual-direction-os/runtime/director-memory.js` — persistence record shaping + IndexedDB adapter + repository API.
- `visual-direction-os/runtime/director-memory-tests.js` — pure repository/fake-store regression tests.
- `visual-direction-os/runtime/comparison-engine.js` — deterministic measured/semantic A/B comparison.
- `visual-direction-os/runtime/comparison-engine-tests.js` — comparison-state regressions.
- `visual-direction-os/runtime/memory-engine.js` — effectiveness state, LOCKED/ACTIVE/WATCH policy, bounded memory appendix.
- `visual-direction-os/runtime/memory-engine-tests.js` — policy/branch-isolation regressions.
- `visual-direction-os/runtime/m4-controller.js` — event orchestration, restore, persistence, selection, branch generation.
- `visual-direction-os/runtime/m4-controller-tests.js` — orchestration tests with fake memory/generation adapters.
- `visual-direction-os/runtime/lineage-ui.js` — view-only Iteration Memory / lineage / A-B / Director Memory UI.
- `visual-direction-os/runtime/lineage.css` — M4 visual styles matching the existing runtime.

**Modify**
- `visual-direction-os/runtime/evaluation-engine.js` — add structured delta entries while preserving current arrays and prompt appendix.
- `visual-direction-os/runtime/evaluation-engine-tests.js` — verify structured delta compatibility.
- `visual-direction-os/runtime/generation-client.js` — persist an immutable `baseRequest` snapshot on artifacts.
- `visual-direction-os/runtime/generation-client-tests.js` — verify base request isolation.
- `visual-direction-os/runtime/generation-ui-m3.js` — propagate `baseRequest`, parent context, and completion metadata.
- `visual-direction-os/runtime/evaluation-ui.js` — publish evaluation-updated events including current human decisions.
- `visual-direction-os/runtime/iteration-controller.js` — allow a structured/base request override for bounded M4 iteration.
- `visual-direction-os/runtime/iteration-controller-tests.js` — verify non-recursive iteration base.
- `visual-direction-os/app.js` — load M4 runtime modules and stylesheet after M3 dependencies.
- `.github/workflows/m3-runtime-tests.yml` — add M4 suites and syntax checks.

---

### Task 1: Persistence Boundary and Lineage Record Model

**Files:**
- Create: `visual-direction-os/runtime/director-memory.js`
- Create: `visual-direction-os/runtime/director-memory-tests.js`

**Interfaces:**
- Produces: `dataUrlToBlob(src)`, `shapeArtifactRecord({ artifact, projectId, rootArtifactId, parentArtifactId, generationIndex, imageBlob, persistenceStatus })`, `createDirectorMemory({ store, storageManager, fetchImpl })`, `createIndexedDbStore(root)`.
- Repository methods: `ensureProject()`, `saveArtifact()`, `getArtifact(id)`, `listArtifacts(projectId)`, `getChildren(parentArtifactId)`, `getLatestProject()`, `estimateStorage()`, `deleteSubtree(id)`, `clearProject(projectId)`.

- [ ] **Step 1: Write failing record-shaping and repository tests**

```js
const assert = require('node:assert/strict');
const { dataUrlToBlob, shapeArtifactRecord, createDirectorMemory } = require('./director-memory.js');

(async () => {
  const blob = dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=');
  assert.equal(blob.type, 'image/png');

  const artifact = {
    id:'gen-1', createdAt:'2026-08-25T00:00:00.000Z', provider:'agnes-image-2.1-flash',
    request:{ prompt:'BASE', ratio:'16:9' }, baseRequest:{ prompt:'BASE', ratio:'16:9' },
    visualIR:{ metadata:{version:'0.1.0'} }, measurements:{ meanSaturation:0.31 },
    evaluation:{ checks:[] }, iterationDelta:null, result:{ kind:'base64', src:'data:image/png;base64,iVBORw0KGgo=' }
  };
  const record = shapeArtifactRecord({ artifact, projectId:'project-1', rootArtifactId:'gen-1', parentArtifactId:null, generationIndex:1, imageBlob:blob, persistenceStatus:'persisted' });
  assert.equal(record.projectId, 'project-1');
  assert.equal(record.rootArtifactId, 'gen-1');
  assert.equal(record.persistenceStatus, 'persisted');
  assert.equal(record.result?.src, undefined, 'raw base64 must not be duplicated into persisted metadata');

  const rows = new Map();
  const store = {
    async putArtifact(row){ rows.set(row.id, structuredClone(row)); },
    async getArtifact(id){ return rows.get(id) || null; },
    async listArtifacts(projectId){ return [...rows.values()].filter((row) => row.projectId === projectId); },
    async getChildren(parentId){ return [...rows.values()].filter((row) => row.parentArtifactId === parentId); },
    async putProject(project){ rows.set(`project:${project.id}`, structuredClone(project)); },
    async getLatestProject(){ return rows.get('project:project-1') || null; },
    async deleteArtifacts(ids){ ids.forEach((id) => rows.delete(id)); },
    async clearProject(projectId){ for (const [key,row] of rows) if (row?.projectId === projectId) rows.delete(key); }
  };
  const memory = createDirectorMemory({ store });
  await memory.saveArtifact(record);
  assert.equal((await memory.getArtifact('gen-1')).id, 'gen-1');
  assert.equal((await memory.getChildren('gen-1')).length, 0);
  console.log('director memory tests passed');
})().catch((error) => { console.error(error); process.exit(1); });
```

- [ ] **Step 2: Run the test and confirm red**

Run: `node visual-direction-os/runtime/director-memory-tests.js`

Expected: FAIL because `director-memory.js` does not exist.

- [ ] **Step 3: Implement record shaping and abstract repository**

```js
function dataUrlToBlob(src) {
  const match = String(src || '').match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error('Expected a Base64 data URL');
  const bytes = Uint8Array.from(BufferLike.fromBase64(match[2]));
  return new Blob([bytes], { type: match[1] });
}

function shapeArtifactRecord(input) {
  const { artifact, imageBlob = null, persistenceStatus } = input;
  const result = artifact?.result ? { ...artifact.result } : null;
  if (result) delete result.src;
  return {
    id: artifact.id,
    projectId: input.projectId,
    rootArtifactId: input.rootArtifactId,
    parentArtifactId: input.parentArtifactId ?? null,
    generationIndex: input.generationIndex,
    createdAt: artifact.createdAt,
    provider: artifact.provider,
    request: clone(artifact.request),
    baseRequest: clone(artifact.baseRequest || artifact.request),
    result,
    visualIR: clone(artifact.visualIR),
    measurements: clone(artifact.measurements),
    evaluation: clone(artifact.evaluation),
    humanJudgments: clone(artifact.humanJudgments || {}),
    iterationDelta: clone(artifact.iterationDelta),
    comparison: clone(artifact.comparison || null),
    imageBlob,
    imageMimeType: imageBlob?.type || null,
    persistenceStatus
  };
}
```

Implementation note: in browser use `atob`; in Node 24 use `Buffer` when available. Do not reference `Buffer` unguarded in browser.

- [ ] **Step 4: Implement IndexedDB adapter with versioned object stores**

Use database name `visual-direction-os-m4`, version `1`, object stores:

```text
projects       keyPath=id, index updatedAt
artifacts      keyPath=id, indexes projectId, parentArtifactId, rootArtifactId, generationIndex
comparisons    keyPath=id, indexes projectId, artifactAId, artifactBId
```

`createIndexedDbStore(root)` must expose the same abstract methods used by tests and wrap each IDB transaction in a Promise.

- [ ] **Step 5: Add persistence-status failure paths**

For `saveGenerationArtifact({ artifact, lineage })` inside `createDirectorMemory`:

```js
try {
  const imageBlob = await resolveImageBlob(artifact.result, fetchImpl);
  const status = imageBlob ? 'persisted' : 'meta_only';
  const record = shapeArtifactRecord({ ...lineage, artifact, imageBlob, persistenceStatus:status });
  await store.putArtifact(record);
  return record;
} catch (error) {
  if (isImageFetchFailure(error)) {
    const record = shapeArtifactRecord({ ...lineage, artifact, imageBlob:null, persistenceStatus:'meta_only' });
    await store.putArtifact(record);
    return record;
  }
  return { ...shapeArtifactRecord({ ...lineage, artifact, imageBlob:null, persistenceStatus:'not_persisted' }), persistenceError:String(error.message || error) };
}
```

A full write failure must not call delete/clear and must leave existing persisted rows untouched.

- [ ] **Step 6: Run persistence tests**

Run: `node visual-direction-os/runtime/director-memory-tests.js`

Expected: `director memory tests passed`.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/runtime/director-memory.js visual-direction-os/runtime/director-memory-tests.js
git commit -m "feat(m4): add persistent director memory boundary"
```

---

### Task 2: Deterministic A/B Comparison Engine

**Files:**
- Create: `visual-direction-os/runtime/comparison-engine.js`
- Create: `visual-direction-os/runtime/comparison-engine-tests.js`

**Interfaces:**
- Produces: `compareArtifacts({ artifactA, artifactB, directorJudgments = {} })`.
- Comparison State enum: `resolved`, `regressed`, `stable_pass`, `stable_warn`, `unresolved`.
- Semantic judgment enum: `improved`, `unchanged`, `regressed`, `not_sure`.

- [ ] **Step 1: Write transition tests**

```js
const assert = require('node:assert/strict');
const { compareArtifacts } = require('./comparison-engine.js');

const artifact = (id, measuredStatus, humanStatus='needs_judgment') => ({
  id,
  measurements:{ meanSaturation:id === 'a' ? 0.61 : 0.37 },
  evaluation:{ checks:[
    { id:'saturation-direction', label:'Saturation Direction', evidenceMode:'measured', status:measuredStatus, target:'low', observed:id === 'a' ? 'mean saturation 0.61' : 'mean saturation 0.37' },
    { id:'narrative-verb', label:'Narrative Verb', evidenceMode:'human_required', status:humanStatus, target:'WITHDRAW' },
    { id:'unsupported', label:'Unsupported', evidenceMode:'unsupported', status:'unsupported' }
  ]}
});

let result = compareArtifacts({ artifactA:artifact('a','warn'), artifactB:artifact('b','pass') });
assert.equal(result.measuredComparisons[0].state, 'resolved');
assert.equal(result.summary.resolved, 1);
assert.equal(result.summary.stableWarn, 0);
assert.equal(result.semanticComparisons[0].state, null, 'semantic comparison requires explicit director input');
assert.equal(result.measuredComparisons.some((row) => row.checkId === 'unsupported'), false);

result = compareArtifacts({ artifactA:artifact('a','warn'), artifactB:artifact('b','warn') });
assert.equal(result.measuredComparisons[0].state, 'stable_warn');
assert.equal(result.summary.stableWarn, 1);

result = compareArtifacts({ artifactA:artifact('a','pass'), artifactB:artifact('b','warn') });
assert.equal(result.measuredComparisons[0].state, 'regressed');

result = compareArtifacts({ artifactA:artifact('a','pass'), artifactB:artifact('b','pass'), directorJudgments:{ 'narrative-verb':{ state:'improved', note:'Withdrawal reads more clearly.' } } });
assert.equal(result.semanticComparisons[0].state, 'improved');
console.log('comparison engine tests passed');
```

- [ ] **Step 2: Run and confirm red**

Run: `node visual-direction-os/runtime/comparison-engine-tests.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement comparison classification**

```js
function comparisonState(a, b) {
  if (!a || !b || a.evidenceMode !== 'measured' || b.evidenceMode !== 'measured') return 'unresolved';
  if (a.status === 'warn' && b.status === 'pass') return 'resolved';
  if (a.status === 'pass' && b.status === 'warn') return 'regressed';
  if (a.status === 'pass' && b.status === 'pass') return 'stable_pass';
  if (a.status === 'warn' && b.status === 'warn') return 'stable_warn';
  return 'unresolved';
}
```

Only measured checks present in both artifacts participate. `human_required` checks become semantic rows; `unsupported` checks are excluded entirely.

- [ ] **Step 4: Add numeric evidence extraction for known measured IDs**

Return `metricA`, `metricB`, and `metricDelta` for:

```js
const METRICS = {
  'saturation-direction': (m) => m?.meanSaturation,
  'detail-density': (m) => Number.isFinite(m?.edgeDensity) && Number.isFinite(m?.entropyProxy) ? m.edgeDensity * 0.45 + m.entropyProxy * 0.55 : null,
  'value-contrast': (m) => Number.isFinite(m?.luminanceStdDev) && Number.isFinite(m?.localContrast) ? m.luminanceStdDev * 0.6 + m.localContrast * 0.4 : null,
  'edge-activity': (m) => m?.edgeDensity,
  'canvas-ratio': (m) => m?.aspectRatio
};
```

Classification continues to use evaluation status, not numeric thresholds duplicated in M4.

- [ ] **Step 5: Run tests**

Run: `node visual-direction-os/runtime/comparison-engine-tests.js`

Expected: `comparison engine tests passed`.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/comparison-engine.js visual-direction-os/runtime/comparison-engine-tests.js
git commit -m "feat(m4): add comparative QA engine"
```

---

### Task 3: Structured Delta Entries, Effectiveness, and Branch-Aware Memory Policy

**Files:**
- Modify: `visual-direction-os/runtime/evaluation-engine.js`
- Modify: `visual-direction-os/runtime/evaluation-engine-tests.js`
- Create: `visual-direction-os/runtime/memory-engine.js`
- Create: `visual-direction-os/runtime/memory-engine-tests.js`

**Interfaces:**
- Extend M3 delta output with `entries` while preserving `preserve`, `correct`, `unresolved`, `promptAppendix`.
- Produce: `evaluateEffectiveness({ parentDelta, comparison, directorJudgments })`, `deriveMemoryForPath({ artifacts, comparisons, semanticLocks = {} })`, `compileMemoryAppendix({ currentDelta, memory })`.
- Effectiveness State enum: `resolved`, `regressed`, `unresolved`, `not_applicable`.

- [ ] **Step 1: Add a failing backward-compatible delta test**

```js
const report = { checks:[
  { id:'detail-density', label:'Detail Density', status:'warn', evidenceMode:'measured', target:'low', observed:'density proxy 0.51', reason:'too dense' },
  { id:'canvas-ratio', label:'Canvas Ratio', status:'pass', evidenceMode:'measured', target:'16:9', observed:'16:9', reason:'correct' }
] };
const delta = compileReDirectionDelta(report);
assert.equal(delta.correct.length, 1);
assert.equal(delta.entries.find((entry) => entry.checkId === 'detail-density').intent, 'correct');
assert.equal(delta.entries.find((entry) => entry.checkId === 'canvas-ratio').intent, 'preserve');
```

- [ ] **Step 2: Run evaluation suite and confirm red**

Run: `node visual-direction-os/runtime/evaluation-engine-tests.js`

Expected: FAIL because `entries` is not present.

- [ ] **Step 3: Extend `compileReDirectionDelta()`**

Each structured entry is:

```js
{
  checkId: check.id,
  label: check.label,
  intent: 'preserve' | 'correct' | 'unresolved',
  sourceStatus: check.status,
  evidenceMode: check.evidenceMode,
  instruction: '<same text used in current preserve/correct/unresolved arrays>'
}
```

Continue deriving legacy arrays and `promptAppendix` from those entries so M3 behavior remains unchanged.

- [ ] **Step 4: Write memory-policy failing tests**

```js
const assert = require('node:assert/strict');
const { evaluateEffectiveness, deriveMemoryForPath, compileMemoryAppendix } = require('./memory-engine.js');

const comparison = {
  measuredComparisons:[
    { checkId:'saturation-direction', label:'Saturation Direction', state:'resolved' },
    { checkId:'detail-density', label:'Detail Density', state:'stable_warn' }
  ],
  semanticComparisons:[]
};
const parentDelta = { entries:[
  { checkId:'saturation-direction', label:'Saturation Direction', intent:'correct', evidenceMode:'measured' },
  { checkId:'detail-density', label:'Detail Density', intent:'correct', evidenceMode:'measured' }
] };
const effectiveness = evaluateEffectiveness({ parentDelta, comparison });
assert.equal(effectiveness.find((row) => row.checkId === 'saturation-direction').state, 'resolved');
assert.equal(effectiveness.find((row) => row.checkId === 'detail-density').state, 'unresolved', 'stable_warn comparison is unresolved effectiveness');

const artifacts = [
  { id:'g1', parentArtifactId:null, evaluation:{ checks:[{id:'canvas-ratio',label:'Canvas Ratio',evidenceMode:'measured',status:'pass'}] } },
  { id:'g2', parentArtifactId:'g1', evaluation:{ checks:[{id:'canvas-ratio',label:'Canvas Ratio',evidenceMode:'measured',status:'pass'}] } }
];
const memory = deriveMemoryForPath({ artifacts, comparisons:[], pathHeadId:'g2' });
assert.equal(memory.locked.some((row) => row.checkId === 'canvas-ratio'), true);

const appendix = compileMemoryAppendix({ currentDelta:{ entries:[] }, memory });
assert.match(appendix, /PRESERVE LOCKED/);
console.log('memory engine tests passed');
```

- [ ] **Step 5: Implement Effectiveness State mapping**

```js
function effectivenessState(entry, comparisonRow, semanticRow) {
  if (entry.intent === 'preserve' && comparisonRow?.state === 'regressed') return 'regressed';
  if (entry.intent !== 'correct') return 'not_applicable';
  if (entry.evidenceMode === 'measured') {
    if (comparisonRow?.state === 'resolved') return 'resolved';
    if (comparisonRow?.state === 'stable_warn') return 'unresolved';
    return comparisonRow?.state === 'regressed' ? 'regressed' : 'unresolved';
  }
  if (semanticRow?.state === 'improved') return 'resolved';
  if (semanticRow?.state === 'regressed') return 'regressed';
  return 'unresolved';
}
```

- [ ] **Step 6: Implement branch-aware path memory**

`deriveMemoryForPath()` must first build the ancestor chain from `pathHeadId` through `parentArtifactId`; it must never inspect sibling descendants when deriving the selected branch state.

Measured lock rule:

```text
previous comparable artifact = PASS
current comparable artifact  = PASS
→ LOCKED
```

A current-path `PASS → WARN` removes the lock and creates ACTIVE CORRECTION. `needs_judgment`, `not_sure`, unsupported, or missing evidence becomes WATCH. Semantic entries only enter LOCKED when `semanticLocks[checkId] === true` for the selected path.

- [ ] **Step 7: Add sibling isolation regression**

Construct `g1 → g2a` with two passes and a sibling `g1 → g2b` with warn. Deriving memory for `pathHeadId:'g2a'` must still show the rule locked; deriving for `g2b` must show active correction/watch as appropriate.

- [ ] **Step 8: Implement bounded memory appendix**

```js
function compileMemoryAppendix({ currentDelta, memory }) {
  const preserve = dedupe([
    ...(memory.locked || []).map((row) => row.instruction || `${row.label}: preserve the validated behavior.`),
    ...(currentDelta?.entries || []).filter((e) => e.intent === 'preserve').map((e) => e.instruction)
  ]);
  const correct = dedupe([
    ...(memory.active || []).map((row) => row.instruction || `${row.label}: correct the regressed or unresolved behavior.`),
    ...(currentDelta?.entries || []).filter((e) => e.intent === 'correct').map((e) => e.instruction)
  ]);
  return buildBoundedAppendix(preserve, correct);
}
```

WATCH items are returned as structured memory but never inserted into deterministic generation instructions.

- [ ] **Step 9: Run suites**

Run:

```bash
node visual-direction-os/runtime/evaluation-engine-tests.js
node visual-direction-os/runtime/memory-engine-tests.js
```

Expected: both pass.

- [ ] **Step 10: Commit**

```bash
git add visual-direction-os/runtime/evaluation-engine.js visual-direction-os/runtime/evaluation-engine-tests.js visual-direction-os/runtime/memory-engine.js visual-direction-os/runtime/memory-engine-tests.js
git commit -m "feat(m4): add structured delta and director memory policy"
```

---

### Task 4: Artifact Base Request and Non-Recursive Iteration

**Files:**
- Modify: `visual-direction-os/runtime/generation-client.js`
- Modify: `visual-direction-os/runtime/generation-client-tests.js`
- Modify: `visual-direction-os/runtime/generation-ui-m3.js`
- Modify: `visual-direction-os/runtime/iteration-controller.js`
- Modify: `visual-direction-os/runtime/iteration-controller-tests.js`

**Interfaces:**
- Artifact gains immutable `baseRequest` snapshot.
- `runGenerationIteration()` accepts optional `baseRequest` and optional `promptAppendix` so M4 can compile from a clean base while preserving M3 compatibility.

- [ ] **Step 1: Add failing `baseRequest` artifact test**

```js
const request = { model:'agnes-image-2.1-flash', prompt:'BASE\n\nOLD DELTA', ratio:'16:9' };
const baseRequest = { model:'agnes-image-2.1-flash', prompt:'BASE', ratio:'16:9' };
const artifact = createGenerationArtifact({ provider:'agnes-image-2.1-flash', request, baseRequest, result:{kind:'base64',src:'data:image/png;base64,AAAA'}, ir:{} });
assert.deepEqual(artifact.baseRequest, baseRequest);
assert.notEqual(artifact.baseRequest, baseRequest);
```

- [ ] **Step 2: Add failing non-recursive iteration test**

```js
const generated = [];
const root = { VisualDirectionOS:{ generation:{
  setRequest(request){ generated.push(['set', request]); },
  async generate(request, context){ generated.push(['generate', request, context]); return { id:'g2' }; }
} } };
await runGenerationIteration({
  root,
  artifact:{ id:'g1', request:{prompt:'BASE\n\nOLD DELTA'}, baseRequest:{prompt:'BASE'}, visualIR:{} },
  delta:{ promptAppendix:'NEW DELTA' },
  applyIterationDelta
});
assert.equal(generated[1][1].prompt, 'BASE\n\nNEW DELTA');
```

- [ ] **Step 3: Implement `baseRequest` snapshot in `createGenerationArtifact()`**

`baseRequest` defaults to the executed request for root generation; iterated generation passes its inherited root/base request explicitly.

- [ ] **Step 4: Propagate base request through generation UI**

In `generate(requestOverride, context)`:

```js
const baseRequest = clone(context.baseRequest || state.activeArtifact?.baseRequest || request);
const artifact = createGenerationArtifact({ provider:AGNES_MODEL, request, baseRequest, result, ir:context.visualIR || currentIR() });
artifact.iterationOf = context.iterationOf || null;
artifact.parentArtifactId = context.iterationOf || null;
```

Root generation must use its own request as base. M3 direct iteration inherits the parent's `baseRequest` once available.

- [ ] **Step 5: Update iteration controller**

```js
const cleanBase = artifact.baseRequest || artifact.request;
const revised = applyIterationDelta(cleanBase, { ...delta, promptAppendix:promptAppendix || delta.promptAppendix });
return generation.generate(revised, {
  iterationOf:artifact.id,
  iterationDelta:delta,
  visualIR:artifact.visualIR,
  baseRequest:cleanBase
});
```

- [ ] **Step 6: Run generation/iteration suites**

Run:

```bash
node visual-direction-os/runtime/generation-client-tests.js
node visual-direction-os/runtime/iteration-controller-tests.js
node visual-direction-os/runtime/iteration-tests.js
```

Expected: all pass; existing M3 iteration behavior remains compatible.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/runtime/generation-client.js visual-direction-os/runtime/generation-client-tests.js visual-direction-os/runtime/generation-ui-m3.js visual-direction-os/runtime/iteration-controller.js visual-direction-os/runtime/iteration-controller-tests.js
git commit -m "feat(m4): preserve clean base request across iterations"
```

---

### Task 5: M4 Orchestration, Evaluation Events, Persistence, and Restore

**Files:**
- Create: `visual-direction-os/runtime/m4-controller.js`
- Create: `visual-direction-os/runtime/m4-controller-tests.js`
- Modify: `visual-direction-os/runtime/evaluation-ui.js`

**Interfaces:**
- Produces browser API `VisualDirectionOS.m4` with `boot()`, `getState()`, `selectA(id)`, `selectB(id)`, `setSemanticJudgment(checkId,state,note)`, `redirectFromArtifact(id)`, `deleteSubtree(id)`, `clearProject()`.
- Emits `vdos:m4-state` whenever lineage/comparison/memory/persistence state changes.
- M3 evaluation emits `vdos:evaluation-updated` with `{ artifact, human, report, delta }`.

- [ ] **Step 1: Add evaluation event after recompute**

After M3 recompute has updated `artifact.measurements` and `artifact.evaluation`, dispatch:

```js
root.dispatchEvent(new CustomEvent('vdos:evaluation-updated', {
  detail:{ artifact:state.artifact, human:clone(state.human), report:state.report, delta:state.delta }
}));
```

Also set:

```js
state.artifact.humanJudgments = clone(state.human);
state.artifact.iterationDelta = clone(state.delta);
```

- [ ] **Step 2: Write failing controller test with fake dependencies**

Test sequence:

```text
boot empty project
→ ingest generation g1
→ ingest evaluation g1
→ ingest child g2(parent=g1)
→ ingest evaluation g2
→ state lineage has 2 artifacts
→ default A = g1, B = g2
→ comparison exists
→ memory derived for g2 path
```

Use dependency injection rather than DOM/IndexedDB in Node:

```js
const controller = createM4Controller({ memory, compareArtifacts, deriveMemoryForPath, compileMemoryAppendix, generationRunner, now:()=>'2026-08-25T00:00:00.000Z' });
```

- [ ] **Step 3: Implement lineage metadata assignment**

For root:

```js
parentArtifactId = null;
rootArtifactId = artifact.id;
generationIndex = nextProjectIndex;
```

For child:

```js
parentArtifactId = artifact.iterationOf || artifact.parentArtifactId;
rootArtifactId = parent.rootArtifactId || parent.id;
generationIndex = nextProjectIndex;
```

`generationIndex` is display order only; never use it as identity.

- [ ] **Step 4: Persist after evaluation update**

The controller may register an in-memory artifact on `vdos:generation-complete`, but full persistence is finalized on `vdos:evaluation-updated` so measurements, human judgments, evaluation, and delta are stored together.

If persistence returns `not_persisted`, keep the in-memory artifact in controller state and expose a warning. If `meta_only`, keep metadata in lineage and mark the image unavailable after reload.

- [ ] **Step 5: Implement restore**

`boot()`:

```text
open memory repository
→ getLatestProject()
→ listArtifacts(project.id)
→ sort by generationIndex
→ reconstruct parent/root links
→ latest artifact with parent => default A=parent, B=latest
→ derive comparison and memory
→ emit state
```

If restore throws, store `restoreError` in M4 state and continue without throwing into M3 boot.

- [ ] **Step 6: Add object-URL lifecycle API**

Controller exposes `getRenderableImage(id)` that creates an object URL lazily from `imageBlob`; retain one URL per artifact in a Map and revoke on subtree deletion, clear project, or page unload.

- [ ] **Step 7: Run controller tests**

Run: `node visual-direction-os/runtime/m4-controller-tests.js`

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/runtime/m4-controller.js visual-direction-os/runtime/m4-controller-tests.js visual-direction-os/runtime/evaluation-ui.js
git commit -m "feat(m4): orchestrate persistent lineage and restore"
```

---

### Task 6: Iteration Memory UI and A/B Comparative QA

**Files:**
- Create: `visual-direction-os/runtime/lineage-ui.js`
- Create: `visual-direction-os/runtime/lineage.css`

**Interfaces:**
- Consumes only `VisualDirectionOS.m4` public API and `vdos:m4-state` events.
- Must not write persistence records or classify comparison/memory states itself.

- [ ] **Step 1: Build the hidden M4 panel below evaluation**

Create `#iteration-memory-console` with sections:

```text
ITERATION MEMORY / project storage
LINEAGE STRIP
A/B VIEWER
COMPARATIVE QA
DIRECTOR MEMORY
STORAGE / BRANCH ACTIONS
```

- [ ] **Step 2: Render branch-aware lineage nodes**

Render nodes from `state.artifacts` using parent IDs. Each node shows:

```text
GEN 01 / GEN 02 / ...
creation time
parent label
resolved + regressed counts
persisted / meta_only / not_persisted
```

Do not flatten children into a fake linear chain. Use nested child containers or explicit branch indentation/connectors.

- [ ] **Step 3: Implement A/B selectors and default display**

When controller state has default A/B, render both images side-by-side. Changing A or B calls `m4.selectA(id)` / `m4.selectB(id)`.

If a persisted artifact is `meta_only`, render an explicit `IMAGE NOT PERSISTED` placeholder while still showing metadata and QA.

- [ ] **Step 4: Render measured comparative rows**

Columns:

```text
CHECK | TARGET | A | B | RESULT
```

Use the five exact comparison states and summary labels:

```text
RESOLVED
REGRESSED
STABLE PASS
STABLE WARN
UNRESOLVED
```

Do not merge stable pass and stable warn.

- [ ] **Step 5: Render semantic comparison controls**

For each semantic row render:

```text
IMPROVED | UNCHANGED | REGRESSED | NOT SURE
```

Click calls:

```js
m4.setSemanticJudgment(checkId, button.dataset.state, noteInput.value);
```

No default semantic improvement is inferred from measurements.

- [ ] **Step 6: Render Director Memory**

Three columns:

```text
LOCKED
ACTIVE CORRECTION
WATCH / UNRESOLVED
```

Every row displays `evidenceSource` (`measured`, `director-confirmed`, `unresolved`) and source artifact/check ID.

- [ ] **Step 7: Add storage/status actions**

Show `N generations · X MB` when `navigator.storage.estimate()` is available. Provide explicit buttons for:

```text
RE-DIRECT FROM THIS GENERATION
DELETE THIS BRANCH
CLEAR PROJECT MEMORY
```

Deletion/clear require browser `confirm()` before invoking controller methods.

- [ ] **Step 8: Style in the existing editorial runtime**

Use existing typography, border, spacing, and `color-mix()` conventions. No new design system and no unrelated page redesign.

- [ ] **Step 9: Syntax check**

Run:

```bash
node --check visual-direction-os/runtime/lineage-ui.js
```

Expected: exit 0.

- [ ] **Step 10: Commit**

```bash
git add visual-direction-os/runtime/lineage-ui.js visual-direction-os/runtime/lineage.css
git commit -m "feat(m4): add lineage and comparative QA workspace"
```

---

### Task 7: Branch Re-Direction and Bounded Director-Memory Prompt

**Files:**
- Modify: `visual-direction-os/runtime/m4-controller.js`
- Modify: `visual-direction-os/runtime/m4-controller-tests.js`
- Modify: `visual-direction-os/runtime/iteration-controller.js`

**Interfaces:**
- `redirectFromArtifact(artifactId)` always uses the selected artifact as the direct parent.
- It compiles a fresh bounded appendix from that artifact's current evaluation delta plus the selected branch's memory state.

- [ ] **Step 1: Write failing branch-generation test**

Given:

```text
g1
└─ g2
```

Call `redirectFromArtifact('g1')`. Assert generation context has:

```js
{
  iterationOf:'g1',
  baseRequest:g1.baseRequest,
  visualIR:g1.visualIR
}
```

and generated request prompt contains exactly one current `ITERATION / DIRECTOR MEMORY` appendix, not g2's historical delta.

- [ ] **Step 2: Compile fresh structured appendix**

Controller flow:

```js
const parent = await getArtifact(id);
const branchMemory = deriveMemoryForPath({ artifacts, comparisons, pathHeadId:id, semanticLocks });
const currentDelta = parent.iterationDelta || compileReDirectionDelta(parent.evaluation);
const promptAppendix = compileMemoryAppendix({ currentDelta, memory:branchMemory });
return runGenerationIteration({ root, artifact:parent, delta:currentDelta, promptAppendix, applyIterationDelta });
```

- [ ] **Step 3: Preserve branch isolation**

When the child later evaluates, its comparison and memory derivation must use only its ancestor path. The sibling branch's semantic judgments/comparison outcomes must not be copied into the child state.

- [ ] **Step 4: Add regression test for locked rule on sibling branch**

Create:

```text
g1 PASS
├─ g2a PASS  => canvas locked on path A
└─ g2b WARN
```

Assert `getMemoryFor('g2a')` keeps canvas LOCKED and `getMemoryFor('g2b')` does not.

- [ ] **Step 5: Run M4 controller/memory/iteration suites**

Run:

```bash
node visual-direction-os/runtime/memory-engine-tests.js
node visual-direction-os/runtime/m4-controller-tests.js
node visual-direction-os/runtime/iteration-controller-tests.js
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/m4-controller.js visual-direction-os/runtime/m4-controller-tests.js visual-direction-os/runtime/iteration-controller.js
git commit -m "feat(m4): support branch-aware memory redirection"
```

---

### Task 8: Runtime Loading, Storage Degradation, CI, and Final Acceptance

**Files:**
- Modify: `visual-direction-os/app.js`
- Modify: `.github/workflows/m3-runtime-tests.yml`

**Interfaces:**
- M4 loads after M3 core/evaluation dependencies.
- M4 boot failure never prevents M3 generation/evaluation UI from loading.

- [ ] **Step 1: Load M4 modules in dependency order**

Append after M3 engine/controller dependencies:

```js
'runtime/director-memory.js',
'runtime/comparison-engine.js',
'runtime/memory-engine.js',
'runtime/m4-controller.js',
'runtime/lineage-ui.js'
```

Load `runtime/lineage.css` with the existing stylesheet loader.

After scripts load:

```js
root.VisualDirectionOS?.m4?.boot?.().catch((error) => console.error('[Visual Direction OS M4]', error));
```

Do not await M4 boot in a way that blocks M3 runtime readiness.

- [ ] **Step 2: Add all M4 Node suites to GitHub Actions**

Add steps:

```yaml
- name: Run M4 director memory suite
  run: node visual-direction-os/runtime/director-memory-tests.js
- name: Run M4 comparison engine suite
  run: node visual-direction-os/runtime/comparison-engine-tests.js
- name: Run M4 memory engine suite
  run: node visual-direction-os/runtime/memory-engine-tests.js
- name: Run M4 controller suite
  run: node visual-direction-os/runtime/m4-controller-tests.js
```

Add syntax checks for every new browser runtime file.

- [ ] **Step 3: Run the complete local-equivalent regression list**

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
node cloudflare/agnes-proxy-worker-tests.mjs
node --check visual-direction-os/runtime/director-memory.js
node --check visual-direction-os/runtime/comparison-engine.js
node --check visual-direction-os/runtime/memory-engine.js
node --check visual-direction-os/runtime/m4-controller.js
node --check visual-direction-os/runtime/lineage-ui.js
node --check visual-direction-os/app.js
```

Expected: every command exits 0.

- [ ] **Step 4: Push and verify GitHub Actions**

Verify the latest `M3 Runtime Tests` workflow run concludes `success` and includes all four M4 suite steps.

- [ ] **Step 5: Browser acceptance — persistence and restore**

On the branch preview:

```text
Generate Gen 01
→ RE-DIRECT → Gen 02
→ RE-DIRECT → Gen 03
→ hard refresh
```

Verify all three images and M3 metadata restore from IndexedDB; lineage shows parent/child links; latest parent defaults to A and latest to B.

- [ ] **Step 6: Browser acceptance — comparison and memory**

Verify measured rows classify `resolved / regressed / stable_pass / stable_warn / unresolved` exactly. Enter semantic A/B judgments and verify they update Director Memory without automatic semantic inference.

- [ ] **Step 7: Browser acceptance — lock and regression**

Produce or simulate two consecutive comparable PASS states for one measured rule; verify it becomes LOCKED. On a later direct child `pass → warn`, verify it leaves LOCKED and becomes ACTIVE CORRECTION.

- [ ] **Step 8: Browser acceptance — branching**

From Gen 01 choose `RE-DIRECT FROM THIS GENERATION`; verify the new child references Gen 01, does not overwrite Gen 02/Gen 03, and sibling branch comparison/memory conclusions remain isolated.

- [ ] **Step 9: Browser acceptance — storage failure**

Using a test hook or fake adapter in development mode, force:

```text
image fetch failure → meta_only
full store write failure → not_persisted
```

Verify M3 generation/evaluation remains usable and existing stored lineage is unchanged.

- [ ] **Step 10: Final commit if integration adjustments were required**

```bash
git add visual-direction-os/app.js .github/workflows/m3-runtime-tests.yml visual-direction-os/runtime
git commit -m "feat(m4): integrate persistent comparative director memory"
```

---

## Plan Self-Review

**Spec coverage:**
- Persistent B1 history + Blob/IndexedDB: Task 1, Task 5, Task 8.
- `persisted / meta_only / not_persisted`: Task 1, Task 5, Task 8.
- Branch lineage: Task 5, Task 6, Task 7.
- Comparison State five-way split: Task 2, Task 6.
- Independent Effectiveness State: Task 3.
- Structured correction linkage: Task 3.
- Two-pass measured locking: Task 3.
- Semantic explicit locking/judgment: Task 3, Task 6.
- Branch isolation: Task 3, Task 7, Task 8.
- Bounded non-recursive iteration: Task 4, Task 7.
- Reload/restore and object URL lifecycle: Task 5.
- Storage visibility/deletion/clear: Task 1, Task 6.
- M3 independent degradation: Task 5, Task 8.
- All 13 revised acceptance criteria: Task 8 browser acceptance sequence.

**Placeholder scan:** No `TBD`, `TODO`, "implement later", or unspecified test placeholders are present.

**Type consistency:** `parentArtifactId`, `rootArtifactId`, `generationIndex`, `persistenceStatus`, five Comparison State counters, Effectiveness State values, `baseRequest`, and `promptAppendix` use the same names across tasks.
