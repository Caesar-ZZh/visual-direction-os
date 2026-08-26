# M5 Project Package & Reproducibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a complete Visual Direction OS director project exportable as a safe, versioned, ZIP-compatible `.vdos` package and fully restorable across browser instances while preserving provenance, lineage, evidence, and reference assets without carrying runtime credentials.

**Architecture:** Keep M4 generation/evaluation/memory orchestration unchanged and add a portable project layer between the UI and persistence. `project-package.js` owns runtime↔portable transformations and staged import semantics, `vdos-codec.js` owns ZIP/bytes/checksum/safety, `schema-migrations.js` owns schema version movement, `project-library.js` owns multi-project selection, and `director-memory.js` remains the IndexedDB boundary with new atomic bundle primitives.

**Tech Stack:** Browser JavaScript, Node.js 24 regression tests, IndexedDB, Web Crypto SHA-256, vendored `fflate` 0.8.2, existing zero-build GitHub Pages runtime, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-25-m5-project-package-reproducibility-design.md` — approved by the user in this conversation on 2026-08-26.

## Global Constraints

- `.vdos` v1 is a standard ZIP-compatible archive; whole-project export only.
- `packageVersion = 1` and `schemaVersion = 1`; forward schema versions are rejected.
- Vendor fixed `fflate` 0.8.2 in-repo; no CDN dependency and no frontend npm build pipeline.
- Generated and reference image bytes/MIME must survive export/import without re-encoding.
- Portable requests are fail-closed allowlists; unknown fields, credentials, headers, session data, temporary URLs, and secrets are excluded.
- Core integrity failure blocks import; single non-structural asset failure is recoverable partial import.
- Import as Copy is the conflict default and remaps all runtime project/artifact references while preserving earliest source identity.
- Replace Existing validates/stages first, then changes old rows only inside one IndexedDB transaction.
- `memory.json` and comparison results are historical snapshots; current engines recompute derived runtime state.
- Project Library is lightweight; explicit `activeProjectId` controls reload behavior.
- Project/package failures must not block M3 DIRECT / GENERATE / EVALUATE for an already-open project.
- Existing M3/M4 suites and browser acceptance must remain green throughout.

---

## File Structure

### New runtime files

- `visual-direction-os/runtime/runtime-fingerprint.js` — authoritative app/engine/package version constants.
- `visual-direction-os/runtime/vdos-codec.js` — stable JSON, SHA-256, ZIP encode/decode, path normalization, archive guardrails, manifest file verification.
- `visual-direction-os/runtime/schema-migrations.js` — current-schema validation, forward-version rejection, registered stepwise migration runner.
- `visual-direction-os/runtime/project-package.js` — portable allowlists, export preflight/model build, reference extraction/dedup, lineage validation, import staging, copy remap, runtime rehydration, reports.
- `visual-direction-os/runtime/project-library.js` — project CRUD/open semantics and explicit active-project preference.
- `visual-direction-os/runtime/project-package-ui.js` — lightweight project switcher, import/export/preflight/report interactions.
- `visual-direction-os/runtime/project-package.css` — package/library UI styling.

### New test files

- `visual-direction-os/runtime/runtime-fingerprint-tests.js`
- `visual-direction-os/runtime/vdos-codec-tests.js`
- `visual-direction-os/runtime/schema-migrations-tests.js`
- `visual-direction-os/runtime/project-package-tests.js`
- `visual-direction-os/runtime/project-library-tests.js`
- `visual-direction-os/runtime/project-package-browser-acceptance-tests.js`

### Vendor files

- `visual-direction-os/vendor/fflate.min.js` — exact upstream browser build for fflate 0.8.2.
- `visual-direction-os/vendor/FFLATE-LICENSE.txt` — upstream MIT license.

### Focused modifications

- `visual-direction-os/runtime/director-memory.js` — list/get projects, atomic project bundle commit, complete project reads.
- `visual-direction-os/runtime/director-memory-tests.js` — new persistence/transaction tests.
- `visual-direction-os/runtime/generation-ui-m3.js` — attach rich reference snapshot to artifact at generation time.
- `visual-direction-os/runtime/generation-client.js` — artifact accepts explicit `references` snapshot without changing request execution.
- `visual-direction-os/runtime/generation-client-tests.js` — reference snapshot regression.
- `visual-direction-os/runtime/m4-controller.js` — `openProject(projectId)`, export-safe current snapshot, URL cleanup.
- `visual-direction-os/runtime/m4-controller-tests.js` — switching/export snapshot regression.
- `visual-direction-os/app.js` — load vendor/runtime/UI assets in dependency order without blocking M3 readiness.
- `.github/workflows/m3-runtime-tests.yml` — run M5 suites on M5 branch/PR/master and syntax-check new runtime files.

---

### Task 1: Runtime Fingerprint and Schema Migration Boundary

**Files:**
- Create: `visual-direction-os/runtime/runtime-fingerprint.js`
- Create: `visual-direction-os/runtime/runtime-fingerprint-tests.js`
- Create: `visual-direction-os/runtime/schema-migrations.js`
- Create: `visual-direction-os/runtime/schema-migrations-tests.js`

**Interfaces:**
- Produces: `VDOS_RUNTIME_FINGERPRINT`, `VDOS_PACKAGE_VERSION`, `VDOS_SCHEMA_VERSION`.
- Produces: `createSchemaMigrator({ currentVersion, migrations })`, returning `{ migrate(packageModel), assertSupported(version) }`.
- Later tasks consume the constants and migrator; neither module accesses IndexedDB or ZIP bytes.

- [ ] **Step 1: Write failing fingerprint and migration tests**

```js
const assert = require('node:assert/strict');
const {
  VDOS_PACKAGE_VERSION,
  VDOS_SCHEMA_VERSION,
  VDOS_RUNTIME_FINGERPRINT
} = require('./runtime-fingerprint.js');
const { createSchemaMigrator } = require('./schema-migrations.js');

assert.equal(VDOS_PACKAGE_VERSION, 1);
assert.equal(VDOS_SCHEMA_VERSION, 1);
assert.equal(typeof VDOS_RUNTIME_FINGERPRINT.appVersion, 'string');
for (const key of ['visualIRVersion','promptCompilerVersion','evaluationEngineVersion','comparisonEngineVersion','memoryPolicyVersion']) {
  assert.ok(key in VDOS_RUNTIME_FINGERPRINT, `missing ${key}`);
}

const migrator = createSchemaMigrator({
  currentVersion:3,
  migrations:{
    1:(model) => ({ ...model, schemaVersion:2, migrated:[...(model.migrated || []), '1→2'] }),
    2:(model) => ({ ...model, schemaVersion:3, migrated:[...(model.migrated || []), '2→3'] })
  }
});
const original = { schemaVersion:1, payload:{x:1} };
const migrated = migrator.migrate(original);
assert.equal(migrated.model.schemaVersion, 3);
assert.deepEqual(migrated.steps, ['1→2','2→3']);
assert.equal(original.schemaVersion, 1, 'migration must not mutate source model');
assert.throws(() => migrator.assertSupported(4), /newer|update/i);
```

- [ ] **Step 2: Run tests and confirm RED**

Run:
```bash
node visual-direction-os/runtime/runtime-fingerprint-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
```
Expected: FAIL because the modules/exports do not exist.

- [ ] **Step 3: Implement minimal authoritative constants and migration registry**

```js
const VDOS_PACKAGE_VERSION = 1;
const VDOS_SCHEMA_VERSION = 1;
const VDOS_RUNTIME_FINGERPRINT = Object.freeze({
  appVersion:'m5',
  visualIRVersion:1,
  promptCompilerVersion:1,
  evaluationEngineVersion:1,
  comparisonEngineVersion:1,
  memoryPolicyVersion:1
});
```

`createSchemaMigrator` must deep-clone input, reject versions greater than current, no-op current v1, and execute exactly one registered transform per version step while recording `['1→2', ...]`.

- [ ] **Step 4: Run tests and confirm GREEN**

Run the two commands from Step 2. Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/runtime-fingerprint.js visual-direction-os/runtime/runtime-fingerprint-tests.js visual-direction-os/runtime/schema-migrations.js visual-direction-os/runtime/schema-migrations-tests.js
git commit -m "feat(m5): define package runtime versions"
```

---

### Task 2: Vendored fflate and Safe `.vdos` Codec

**Files:**
- Create: `visual-direction-os/vendor/fflate.min.js`
- Create: `visual-direction-os/vendor/FFLATE-LICENSE.txt`
- Create: `visual-direction-os/runtime/vdos-codec.js`
- Create: `visual-direction-os/runtime/vdos-codec-tests.js`

**Interfaces:**
- Consumes: `VDOS_PACKAGE_VERSION`, `VDOS_SCHEMA_VERSION`.
- Produces: `stableJsonBytes(value)`, `sha256Hex(bytes)`, `encodeVdos({files, manifestBase})`, `decodeVdos(bytes, options)`, `verifyManifestFiles(decoded)`, `normalizeArchivePath(path)`.
- `decodeVdos` returns `{ manifest, entries:Map<string,Uint8Array>, warnings:[] }` without interpreting project semantics.

- [ ] **Step 1: Vendor exact fflate 0.8.2 browser build and MIT license**

Use the upstream npm package files for version `0.8.2`; do not minify/rewrite the vendored source locally. Record the version in the license notice header if upstream file naming does not make it visible.

- [ ] **Step 2: Write failing codec tests**

```js
const assert = require('node:assert/strict');
const {
  stableJsonBytes, sha256Hex, encodeVdos, decodeVdos, normalizeArchivePath
} = require('./vdos-codec.js');

(async () => {
  const a = stableJsonBytes({ z:1, a:{ y:2, x:3 }, list:[{b:2,a:1}] });
  const b = stableJsonBytes({ list:[{a:1,b:2}], a:{x:3,y:2}, z:1 });
  assert.deepEqual([...a], [...b]);
  assert.equal((await sha256Hex(new TextEncoder().encode('abc'))).length, 64);

  const png = Uint8Array.from([137,80,78,71,1,2,3]);
  const archive = await encodeVdos({
    manifestBase:{ format:'vdos-project', packageVersion:1, schemaVersion:1, packageId:'pkg-1', exportedAt:'2026-08-26T00:00:00Z', createdWith:{}, project:{id:'p1',title:'P'}, packageCompleteness:'complete', missingAssets:[] },
    files:[
      { path:'project.json', role:'core', bytes:stableJsonBytes({schemaVersion:1,id:'p1'}) },
      { path:'images/gen-1.png', role:'asset', bytes:png }
    ]
  });
  const decoded = await decodeVdos(archive);
  assert.deepEqual([...decoded.entries.get('images/gen-1.png')], [...png]);
  assert.throws(() => normalizeArchivePath('../evil.json'), /unsafe/i);
  assert.throws(() => normalizeArchivePath('artifacts\\..\\evil.json'), /unsafe/i);
})();
```

Add injected malformed archive tests for duplicate normalized names, unknown root entries, excessive entry count, and inflated-byte guardrail.

- [ ] **Step 3: Run codec tests and confirm RED**

Run:
```bash
node visual-direction-os/runtime/vdos-codec-tests.js
```
Expected: FAIL because codec is absent.

- [ ] **Step 4: Implement codec safety and manifest hashing**

Use fflate only for ZIP mechanics. Before project parsing:

```js
const ALLOWED_ROOT = new Set(['manifest.json','project.json','lineage.json','comparisons.json','memory.json']);
const ALLOWED_PREFIXES = ['artifacts/','images/','references/'];
const DEFAULT_LIMITS = Object.freeze({ maxEntries:4096, maxInflatedBytes:512 * 1024 * 1024 });
```

`normalizeArchivePath` must reject absolute paths, drive-letter paths, NUL/control chars, `.`/`..` segments, backslashes, empty normalized names, duplicates after normalization, and names outside allowed roots/prefixes. `encodeVdos` hashes exact bytes for every payload file, puts size/hash/role in manifest, then ZIPs manifest + files. `decodeVdos` validates path/entry guardrails before returning bytes wherever fflate metadata permits; otherwise enforce total inflated bytes immediately after decode before parsing JSON.

- [ ] **Step 5: Run codec tests and confirm GREEN**

Run the command from Step 3. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/vendor visual-direction-os/runtime/vdos-codec.js visual-direction-os/runtime/vdos-codec-tests.js
git commit -m "feat(m5): add safe vdos archive codec"
```

---

### Task 3: Expand Director Memory for Multi-Project and Atomic Bundles

**Files:**
- Modify: `visual-direction-os/runtime/director-memory.js`
- Modify: `visual-direction-os/runtime/director-memory-tests.js`

**Interfaces:**
- Produces new memory methods: `listProjects()`, `getProject(id)`, `loadProjectBundle(projectId)`, `commitProjectBundle({mode, project, artifacts, comparisons, replaceProjectId})`.
- `commitProjectBundle` performs one IndexedDB readwrite transaction across `projects`, `artifacts`, `comparisons`.
- Existing `saveGenerationArtifact`, `clearProject`, and degradation semantics remain unchanged.

- [ ] **Step 1: Add failing fake-store tests for list/get/bundle and atomic replace**

```js
const bundle = {
  project:{ id:'project-import', title:'Imported', createdAt:'2026-08-26T00:00:00Z', updatedAt:'2026-08-26T00:00:00Z' },
  artifacts:[{ id:'g1', projectId:'project-import', rootArtifactId:'g1', parentArtifactId:null, generationIndex:1 }],
  comparisons:[]
};
await memory.commitProjectBundle({ mode:'copy', ...bundle });
assert.equal((await memory.getProject('project-import')).title, 'Imported');
assert.equal((await memory.loadProjectBundle('project-import')).artifacts.length, 1);
assert.ok((await memory.listProjects()).some((p) => p.id === 'project-import'));
```

Extend the fake store with a bundle transaction hook that can throw before commit; assert forced replace failure leaves the old project/artifacts unchanged.

- [ ] **Step 2: Run director-memory tests and confirm RED**

Run:
```bash
node visual-direction-os/runtime/director-memory-tests.js
```
Expected: FAIL on missing new methods.

- [ ] **Step 3: Implement IndexedDB primitives**

Add store methods `listProjects`, `getProject`, `loadProjectBundle`, and `commitProjectBundle`. For IndexedDB replace, use exactly one transaction:

```js
const tx = db.transaction(['projects','artifacts','comparisons'], 'readwrite');
// delete old project rows through projectId indexes inside tx
// put staged project/artifacts/comparisons inside same tx
await transactionToPromise(tx);
```

Do not mutate `activeProjectId` here; that belongs to Project Library.

- [ ] **Step 4: Run director-memory regression and confirm GREEN**

Run Step 2 command. Expected: PASS including all old M4 persistence/degradation cases.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/director-memory.js visual-direction-os/runtime/director-memory-tests.js
git commit -m "feat(m5): add atomic multi-project persistence"
```

---

### Task 4: Project Library and Explicit Active Project

**Files:**
- Create: `visual-direction-os/runtime/project-library.js`
- Create: `visual-direction-os/runtime/project-library-tests.js`

**Interfaces:**
- Consumes Director Memory `listProjects/getProject/ensureProject/clearProject` and a key-value preference adapter.
- Produces `createProjectLibrary({ memory, preferences, now, makeId })` with `boot()`, `list()`, `newProject(title)`, `open(projectId)`, `rename(projectId,title)`, `delete(projectId)`, `getActiveProjectId()`.
- Preference key is exactly `vdos-active-project-id`.

- [ ] **Step 1: Write failing project-library tests**

```js
const library = createProjectLibrary({ memory, preferences, now:()=>'2026-08-26T00:00:00Z', makeId:()=> 'project-new' });
const boot = await library.boot();
assert.equal(boot.activeProject.id, 'project-old');
await library.open('project-b');
assert.equal(preferences.getItem('vdos-active-project-id'), 'project-b');
await memory.putProject({ id:'project-c', title:'Touched', createdAt:'2026-08-25', updatedAt:'2099-01-01' });
assert.equal((await library.boot()).activeProject.id, 'project-b', 'updatedAt must not steal active identity');
await library.delete('project-b');
assert.notEqual(library.getActiveProjectId(), 'project-b');
```

Also test empty DB creates `Untitled Director Project`, rename trims/falls back safely, and deleting active uses latest fallback then persists the fallback ID.

- [ ] **Step 2: Run tests and confirm RED**

```bash
node visual-direction-os/runtime/project-library-tests.js
```
Expected: FAIL because module is missing.

- [ ] **Step 3: Implement library state machine**

`boot()` resolution order is explicit active → latest updated existing project → create Untitled. `open()` alone changes active ID. `rename()` updates title/updatedAt but does not switch active. `delete()` clears through memory and only re-resolves active when deleting the active project.

- [ ] **Step 4: Run tests and confirm GREEN**

Run Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/project-library.js visual-direction-os/runtime/project-library-tests.js
git commit -m "feat(m5): add local project library"
```

---

### Task 5: Capture Rich Reference Evidence on Generation Artifacts

**Files:**
- Modify: `visual-direction-os/runtime/generation-client.js`
- Modify: `visual-direction-os/runtime/generation-client-tests.js`
- Modify: `visual-direction-os/runtime/generation-ui-m3.js`

**Interfaces:**
- `createGenerationArtifact({ ..., references=[] })` now returns `artifact.references` as a deep-cloned array.
- Generation UI passes its existing rich state records `{id,name,source,role,preserve}` into artifact creation.
- Agnes request execution remains unchanged.

- [ ] **Step 1: Add failing artifact-reference regression**

```js
const refs = [{ id:'r1', name:'hero.png', source:'data:image/png;base64,AA==', role:'character', preserve:['identity'] }];
const artifact = createGenerationArtifact({
  request:{model:'agnes-image-2.1-flash',prompt:'P'},
  result:{kind:'base64',src:'data:image/png;base64,AA=='},
  references:refs
});
assert.deepEqual(artifact.references, refs);
assert.notEqual(artifact.references, refs);
refs[0].role = 'world';
assert.equal(artifact.references[0].role, 'character');
```

- [ ] **Step 2: Run generation client tests and confirm RED**

```bash
node visual-direction-os/runtime/generation-client-tests.js
```
Expected: FAIL because references are not stored.

- [ ] **Step 3: Implement reference snapshot and UI handoff**

Update artifact creation:

```js
references: clone(Array.isArray(references) ? references : [])
```

Update `generation-ui-m3.js` call:

```js
const artifact = createGenerationArtifact({
  provider:AGNES_MODEL,
  request,
  baseRequest,
  result,
  ir:context.visualIR || currentIR(),
  references:state.references
});
```

For historical branch iteration, preserve/reuse the parent artifact's rehydrated reference context through the existing request; do not change Agnes adapter semantics in this task.

- [ ] **Step 4: Run generation client + existing M3 iteration/controller tests**

```bash
node visual-direction-os/runtime/generation-client-tests.js
node visual-direction-os/runtime/iteration-tests.js
node visual-direction-os/runtime/iteration-controller-tests.js
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/generation-client.js visual-direction-os/runtime/generation-client-tests.js visual-direction-os/runtime/generation-ui-m3.js
git commit -m "feat(m5): capture generation reference evidence"
```

---

### Task 6: Portable Project Model, Export Preflight, and Reference Deduplication

**Files:**
- Create: `visual-direction-os/runtime/project-package.js`
- Create: `visual-direction-os/runtime/project-package-tests.js`

**Interfaces:**
- Consumes codec hash/JSON helpers and runtime fingerprint.
- Produces pure functions: `portableRequestV1(request)`, `validateLineage({project,artifacts,lineage})`, `mergeRuntimeAndPersistedArtifacts(runtimeArtifacts,persistedArtifacts)`, `buildExportStage({project,runtimeArtifacts,persistedArtifacts,comparisons,memorySnapshot,fetchImpl})`, `buildExportReport(stage)`, `buildArchiveFiles(stage)`.
- `buildExportStage` returns portable JSON models plus binary asset maps and `packageCompleteness` without creating ZIP bytes.

- [ ] **Step 1: Write failing allowlist/preflight/reference tests**

```js
const safe = portableRequestV1({
  model:'agnes-image-2.1-flash', prompt:'P', size:'2K', ratio:'16:9', return_base64:true,
  Authorization:'secret', headers:{Cookie:'x'}, unknown:'drop-me',
  extra_body:{ response_format:'b64_json', image:['data:image/png;base64,AA=='], token:'drop' }
});
assert.deepEqual(safe, {
  model:'agnes-image-2.1-flash', prompt:'P', size:'2K', ratio:'16:9', return_base64:true,
  extra_body:{ response_format:'b64_json' }
});
assert.doesNotMatch(JSON.stringify(safe), /secret|drop-me|Cookie/);

const merged = mergeRuntimeAndPersistedArtifacts(
  [{id:'g2', projectId:'p1', persistenceStatus:'not_persisted', parentArtifactId:'g1', rootArtifactId:'g1', generationIndex:2}],
  [{id:'g1', projectId:'p1', persistenceStatus:'persisted', imageBlob:new Blob([Uint8Array.of(1,2,3)],{type:'image/png'}), parentArtifactId:null, rootArtifactId:'g1', generationIndex:1}]
);
assert.deepEqual(merged.map((x)=>x.id), ['g1','g2']);
```

Create two artifacts referencing identical data-URI bytes with different `role/preserve`; assert `stage.referenceAssets.size === 1` while two usage records remain distinct. Add cycle/broken-parent/root mismatch tests that must throw. Add remote fetch failure test that sets partial `remote_unavailable` without retaining URL query/path secrets.

- [ ] **Step 2: Run tests and confirm RED**

```bash
node visual-direction-os/runtime/project-package-tests.js
```
Expected: FAIL because package model module is missing.

- [ ] **Step 3: Implement portable model builders**

`portableRequestV1` must construct a new object field-by-field, never clone then delete. `mergeRuntimeAndPersistedArtifacts` merges by ID with runtime metadata precedence but reuses persisted Blob where runtime row lacks one. Reference assets become `references/<sha256>.<ext>` and generated images become `images/<artifact-id>.<ext>` based on MIME mapping (`png`, `webp`, `jpg`; unknown MIME uses `.bin` but keeps MIME metadata). `not_persisted` metadata is included and forces partial completeness.

- [ ] **Step 4: Add archive-byte secret regression**

Build an export stage whose runtime artifact contains token-shaped values outside the allowlist, then `buildArchiveFiles(stage)` and concatenate all UTF-8 JSON bytes. Assert none of `Bearer`, `VDOS_PROXY_TOKEN`, `session-secret`, or the injected unknown-field secret occur.

- [ ] **Step 5: Run tests and confirm GREEN**

Run Step 2 command. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/project-package.js visual-direction-os/runtime/project-package-tests.js
git commit -m "feat(m5): build portable project export model"
```

---

### Task 7: Import Staging, Graded Recovery, ID Remap, and Reference Rehydration

**Files:**
- Modify: `visual-direction-os/runtime/project-package.js`
- Modify: `visual-direction-os/runtime/project-package-tests.js`

**Interfaces:**
- Adds `stageImport({decoded,migrator,existingProjectIds,mode,makeProjectId,makeArtifactId})`.
- Adds `remapImportedProject(stage,{projectId,artifactIdMap})`.
- Adds `rehydrateRuntimeArtifact(portableArtifact,assetLookup)`.
- Adds `buildImportReport(stage)`.
- Staging never calls Director Memory; it returns `{project,artifacts,comparisons,lineage,importAudit,recoveryStatus,idMap}` for Task 8/9 to commit.

- [ ] **Step 1: Add failing import/copy/partial tests**

```js
const staged = await stageImport({
  decoded,
  migrator,
  existingProjectIds:new Set(['project-source']),
  mode:'copy',
  makeProjectId:()=> 'project-copy',
  makeArtifactId:(old)=> `copy-${old}`
});
assert.equal(staged.project.id, 'project-copy');
assert.equal(staged.project.provenance.sourceProjectId, 'project-source');
assert.equal(staged.artifacts.find((a)=>a.sourceIdentity.sourceArtifactId === 'g2').parentArtifactId, 'copy-g1');
assert.equal(staged.lineage.nodes.find((n)=>n.artifactId === 'copy-g2').parentArtifactId, 'copy-g1');
```

Add comparison ID/A/B remap, memory path-head remap, copy-of-copy earliest provenance, corrupt single image → `recoveryStatus:'partial'` + artifact metadata-only, corrupt core checksum → throw, schema 2 with current 1 → throw update-required, and identical reference asset rehydration back to ordered `request.extra_body.image` data URIs.

- [ ] **Step 2: Run package tests and confirm RED**

Run:
```bash
node visual-direction-os/runtime/project-package-tests.js
```
Expected: FAIL on missing import functions.

- [ ] **Step 3: Implement staging pipeline in spec order**

Implement exactly: decoded safety already passed → manifest/version → checksum classification → parse core → migrate → structural validation → recover assets → rehydrate refs → recompute-ready metadata → conflict mode → remap if Copy → final structural validation. Keep `comparisonSnapshot` and `memorySnapshot` only under project `importAudit`; runtime comparison/memory recomputation happens through M4 after commit/open.

For unavailable references, leave history viewable but set `artifact.reproducibility = { status:'partial', missingReferences:[...] }` so historical redirect UI can warn.

- [ ] **Step 4: Run package + migration tests and confirm GREEN**

```bash
node visual-direction-os/runtime/project-package-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/project-package.js visual-direction-os/runtime/project-package-tests.js
git commit -m "feat(m5): stage safe vdos imports"
```

---

### Task 8: M4 Project Switching and Export Snapshot Integration

**Files:**
- Modify: `visual-direction-os/runtime/m4-controller.js`
- Modify: `visual-direction-os/runtime/m4-controller-tests.js`

**Interfaces:**
- Adds controller methods `openProject(projectId)`, `getExportSnapshot()`, `setProject(project)` if needed internally.
- `getExportSnapshot()` returns current in-memory project/artifacts/comparisons/memory selection data by deep clone and never exposes object URLs as portable truth.
- `openProject` revokes prior object URLs, loads selected project bundle, restores A/B defaults, and recomputes memory using existing M4 engines.

- [ ] **Step 1: Add failing project switch/snapshot tests**

```js
await controller.boot();
await controller.openProject('project-b');
const state = controller.getState();
assert.equal(state.project.id, 'project-b');
assert.deepEqual(state.artifacts.map((a)=>a.projectId), ['project-b']);
assert.equal(revokedUrls.includes(oldUrl), true);

const snapshot = controller.getExportSnapshot();
snapshot.artifacts[0].id = 'mutated';
assert.notEqual(controller.getState().artifacts[0].id, 'mutated');
```

Test opening missing project throws without clearing the currently working in-memory M3/M4 state.

- [ ] **Step 2: Run M4 controller tests and confirm RED**

```bash
node visual-direction-os/runtime/m4-controller-tests.js
```
Expected: FAIL on missing methods.

- [ ] **Step 3: Implement project switch without changing M3 boot critical path**

Refactor the existing boot-load logic into an internal `loadProject(project)` used by both `boot` and `openProject`. Keep restore asynchronous and independent of M3 readiness. Preserve `judgmentsByPair`, semantic locks, and comparison reconstruction from the selected project's persisted comparisons only.

- [ ] **Step 4: Run M4 controller + app boot regression**

```bash
node visual-direction-os/runtime/m4-controller-tests.js
node visual-direction-os/runtime/app-boot-tests.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/m4-controller.js visual-direction-os/runtime/m4-controller-tests.js
git commit -m "feat(m5): support switching director projects"
```

---

### Task 9: Project Package Orchestrator and Lightweight UI

**Files:**
- Create: `visual-direction-os/runtime/project-package-ui.js`
- Create: `visual-direction-os/runtime/project-package.css`
- Modify: `visual-direction-os/app.js`
- Modify: `visual-direction-os/runtime/project-library.js`
- Modify: `visual-direction-os/runtime/project-library-tests.js`

**Interfaces:**
- Browser mount creates a `VisualDirectionOS.projects` facade exposing `list/open/new/rename/delete/export/import`.
- Export flow uses `m4.getExportSnapshot()` + `memory.loadProjectBundle()` → `buildExportStage` → preflight → `encodeVdos` → browser download.
- Import flow uses file bytes → `decodeVdos` → `stageImport` → conflict modal → `memory.commitProjectBundle` → library active ID → `m4.openProject`.

- [ ] **Step 1: Add domain test for active ID changes only after successful import commit**

Inject `commitBundle` into the library/orchestrator helper. Force it to reject and assert preference still points to old project; resolve it and assert preference switches only after commit.

- [ ] **Step 2: Implement UI structure**

Mount a compact `PROJECT` control near the existing M4 Iteration Memory workspace. Required controls/copy:

```text
PROJECT
<Current Project Title> ▾
New Project
Open
Rename
Export .vdos
Import .vdos
Delete Project
```

Preflight must show complete/partial state and degraded item count; partial export primary action remains Cancel and requires explicit `Export Incomplete Package`. Import conflict modal defaults selected action to `Import as Copy`, with `Replace Existing` secondary/destructive.

- [ ] **Step 3: Wire dependency load order in `app.js`**

Load in this order after existing pure M4 engines and before package UI mount:

```js
'../vendor/fflate.min.js' // use correct path relative to app.js asset loader: 'vendor/fflate.min.js'
'runtime/runtime-fingerprint.js'
'runtime/schema-migrations.js'
'runtime/vdos-codec.js'
'runtime/project-package.js'
'runtime/project-library.js'
'runtime/project-package-ui.js'
```

Load `runtime/project-package.css`. Package restore may happen after M3 is online; package/library errors update their own status and must not set global runtime unavailable.

- [ ] **Step 4: Run project-library + app boot regression**

```bash
node visual-direction-os/runtime/project-library-tests.js
node visual-direction-os/runtime/app-boot-tests.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/project-package-ui.js visual-direction-os/runtime/project-package.css visual-direction-os/runtime/project-library.js visual-direction-os/runtime/project-library-tests.js visual-direction-os/app.js
git commit -m "feat(m5): add project package workspace"
```

---

### Task 10: Real Browser `.vdos` Acceptance

**Files:**
- Create: `visual-direction-os/runtime/project-package-browser-acceptance-tests.js`

**Interfaces:**
- Reuse the existing Chrome DevTools Protocol/static-server approach from `browser-acceptance-tests-v2.js`.
- Test actual browser IndexedDB, Blob, File, Web Crypto, vendored fflate, hard reload, and runtime UI.
- Live Agnes is not required; generation artifacts may be injected through the same runtime event/controller boundary used by the existing M4 browser harness.

- [ ] **Step 1: Write acceptance harness and make it fail before final wiring is complete**

The harness must execute these concrete scenarios in one isolated Chrome profile:

```text
1. Create/open Project A.
2. Ingest g1 → g2 → g3 and a sibling g2b; at least one artifact uses a local PNG reference.
3. Persist generated PNG/WebP byte fixtures and semantic comparison judgments.
4. Export a complete `.vdos`; inspect ZIP bytes and assert secret sentinels are absent.
5. Clear/switch local project state, import archive, and assert image bytes, MIME, lineage, judgments, comparisons, and recomputed memory restore.
6. Import same archive while original ID exists; choose Copy; assert project/artifact IDs differ but topology and source identity match.
7. Hard reload; assert explicit active imported project restores.
8. Produce archive variant with one image corrupted; assert partial recoverable import and metadata-only affected artifact.
9. Produce archive variant with `project.json` checksum corruption; assert import blocks and IndexedDB project count unchanged.
10. Force Replace IndexedDB transaction abort; assert original project/artifacts remain intact and active ID unchanged.
11. Assert duplicate reference bytes produce one `references/<sha>` entry but all per-artifact roles/preserve survive.
12. Assert imported available references rehydrate into request/baseRequest `extra_body.image` in original order.
```

- [ ] **Step 2: Run browser acceptance and confirm RED if integration gaps remain**

```bash
node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
```
Expected during first run: FAIL only on not-yet-wired M5 browser behavior; fix product code rather than weakening assertions.

- [ ] **Step 3: Fix browser-only integration defects with focused regression tests**

For each defect, first add/extend the smallest Node regression suite that reproduces the root cause where practical; then apply the minimal runtime fix. Do not add sleeps for readiness: wait on explicit app/controller state or IndexedDB record counts, as M4 restore is intentionally non-blocking.

- [ ] **Step 4: Run both browser acceptances**

```bash
node visual-direction-os/runtime/browser-acceptance-tests-v2.js
node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
```
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/project-package-browser-acceptance-tests.js visual-direction-os/runtime
git commit -m "test(m5): cover portable project browser round trip"
```

---

### Task 11: CI Protection and Full Regression

**Files:**
- Modify: `.github/workflows/m3-runtime-tests.yml`

**Interfaces:**
- CI runs on `master`, `m5-project-package-reproducibility`, and pull requests targeting `master` when runtime/package paths change.

- [ ] **Step 1: Add M5 trigger coverage**

Configure:

```yaml
on:
  push:
    branches:
      - master
      - m5-project-package-reproducibility
  pull_request:
    branches:
      - master
  workflow_dispatch:
```

Keep the existing path filters.

- [ ] **Step 2: Add M5 test steps**

```yaml
- name: Run M5 runtime fingerprint suite
  run: node visual-direction-os/runtime/runtime-fingerprint-tests.js
- name: Run M5 archive codec suite
  run: node visual-direction-os/runtime/vdos-codec-tests.js
- name: Run M5 schema migration suite
  run: node visual-direction-os/runtime/schema-migrations-tests.js
- name: Run M5 project package suite
  run: node visual-direction-os/runtime/project-package-tests.js
- name: Run M5 project library suite
  run: node visual-direction-os/runtime/project-library-tests.js
- name: Run M5 headless browser acceptance
  run: node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
```

Add `node --check` for every new non-vendored runtime JS file. Do not syntax-check the minified vendor file as product code; verify its presence/version through codec tests.

- [ ] **Step 3: Run the entire suite locally/CI-equivalent before committing workflow**

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
node visual-direction-os/runtime/app-boot-tests.js
node visual-direction-os/runtime/runtime-fingerprint-tests.js
node visual-direction-os/runtime/vdos-codec-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
node visual-direction-os/runtime/project-package-tests.js
node visual-direction-os/runtime/project-library-tests.js
node visual-direction-os/runtime/browser-acceptance-tests-v2.js
node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
node cloudflare/agnes-proxy-worker-tests.mjs
```
Expected: every command exits 0.

- [ ] **Step 4: Commit CI update**

```bash
git add .github/workflows/m3-runtime-tests.yml
git commit -m "ci(m5): verify project package runtime"
```

- [ ] **Step 5: Push branch and verify GitHub Actions**

Verify one complete branch run where every M3/M4/M5 test, both browser acceptances, Cloudflare suite, deployment config parse, and syntax check are `success`. If the browser acceptance is suspected flaky, rerun the same HEAD once and require a second `success` before declaring M5 complete.

---

### Task 12: Final Protocol Audit and Acceptance Evidence

**Files:**
- Modify only if audit finds a concrete defect; otherwise no product-file changes.

**Interfaces:**
- Produces final acceptance evidence for the branch; no new runtime API.

- [ ] **Step 1: Audit the implementation against all 21 spec acceptance criteria**

Create an internal checklist mapping each criterion to a passing test name or browser acceptance assertion. Any uncovered criterion requires a focused test before completion.

- [ ] **Step 2: Inspect an exported `.vdos` manually as a ZIP-compatible archive**

Verify entries exactly match allowed structure and that `manifest.json` indexes every payload file except itself. Confirm no `Authorization`, proxy token sentinel, session key, blob URL, or raw result data URL appears in JSON entries.

- [ ] **Step 3: Verify branch diff is scoped**

Compare `m5-project-package-reproducibility` to `master`; changes should be limited to M5 spec/plan, new M5 runtime/vendor/test assets, focused M4 integration files, and CI. Do not include unrelated visual redesign/refactoring.

- [ ] **Step 4: Run final GitHub Actions on exact HEAD**

Require completed `success` and record exact HEAD SHA + workflow run ID. Do not claim complete while the run is queued/in-progress.

- [ ] **Step 5: Stop before merging**

Keep the feature branch intact and present integration choices. Do not merge to `master` without explicit user authorization.
