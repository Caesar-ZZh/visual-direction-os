# M5 Project Package & Reproducibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a complete Visual Direction OS director project exportable as a safe, versioned, ZIP-compatible `.vdos` package and fully restorable across browser instances while preserving provenance, lineage, evidence, reference assets, and reproducibility audit data without carrying runtime credentials.

**Architecture:** Preserve M4 as the generation/evaluation/comparison/memory orchestrator. Add `project-package.js` for runtime↔portable transforms and staged import, `vdos-codec.js` for ZIP/bytes/checksum/safety, `schema-migrations.js` for schema movement, `project-library.js` for multi-project identity, and extend `director-memory.js` only for persistence primitives and atomic bundle commits.

**Tech Stack:** Browser JavaScript, Node.js 24 regression tests, IndexedDB, Web Crypto SHA-256, vendored `fflate` 0.8.2, existing zero-build GitHub Pages runtime, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-25-m5-project-package-reproducibility-design.md` — approved by the user in this conversation on 2026-08-26.

## Global Constraints

- `.vdos` v1 is a standard ZIP-compatible archive; whole-project export only.
- `packageVersion = 1`, `schemaVersion = 1`; forward schema versions are rejected.
- Vendor fixed `fflate` 0.8.2 in-repo; no CDN dependency and no frontend npm build pipeline.
- Generated/reference image bytes and MIME must survive export/import without re-encoding.
- Portable request serialization is fail-closed. Unknown fields, credentials, headers, session state, object URLs, signed/transient URLs, and secrets are excluded.
- Core integrity failure blocks import; a single non-structural asset failure becomes explicit partial/recoverable import.
- Import as Copy is the conflict default and remaps every runtime project/artifact reference while preserving earliest source identity.
- Replace Existing stages first and mutates old rows only inside one IndexedDB transaction.
- `memory.json` and comparison results are audit snapshots; current engines recompute derived state during staging and again when the committed project is opened.
- Explicit `activeProjectId` controls reload behavior; `updatedAt` never implicitly selects a project.
- Project/package failures must not block M3 DIRECT / GENERATE / EVALUATE for an already-open project.
- Existing M3/M4 suites and browser acceptance remain required.

---

## File Structure

### New runtime files
- `visual-direction-os/runtime/runtime-fingerprint.js` — authoritative package/runtime engine versions.
- `visual-direction-os/runtime/vdos-codec.js` — stable JSON, SHA-256, ZIP encode/decode, safe path normalization, archive guardrails, manifest verification.
- `visual-direction-os/runtime/schema-migrations.js` — current-schema no-op, forward reject, registered stepwise migrations.
- `visual-direction-os/runtime/project-package.js` — portable allowlist, export stage/preflight, reference extraction/dedup, lineage validation, import staging, ID remap, reference rehydration, derived-state reconciliation, reports.
- `visual-direction-os/runtime/project-library.js` — project CRUD/open semantics and active-project preference.
- `visual-direction-os/runtime/project-package-ui.js` — project switcher + import/export/preflight/report UI.
- `visual-direction-os/runtime/project-package.css` — project/package UI styling.

### New tests
- `visual-direction-os/runtime/runtime-fingerprint-tests.js`
- `visual-direction-os/runtime/vdos-codec-tests.js`
- `visual-direction-os/runtime/schema-migrations-tests.js`
- `visual-direction-os/runtime/project-package-tests.js`
- `visual-direction-os/runtime/project-library-tests.js`
- `visual-direction-os/runtime/project-package-browser-acceptance-tests.js`

### Vendor
- `visual-direction-os/vendor/fflate.min.js` — exact fflate 0.8.2 browser build.
- `visual-direction-os/vendor/FFLATE-LICENSE.txt` — upstream MIT license.

### Focused modifications
- `visual-direction-os/runtime/director-memory.js`
- `visual-direction-os/runtime/director-memory-tests.js`
- `visual-direction-os/runtime/generation-client.js`
- `visual-direction-os/runtime/generation-client-tests.js`
- `visual-direction-os/runtime/generation-ui-m3.js`
- `visual-direction-os/runtime/m4-controller.js`
- `visual-direction-os/runtime/m4-controller-tests.js`
- `visual-direction-os/app.js`
- `.github/workflows/m3-runtime-tests.yml`

---

### Task 1: Runtime Fingerprint and Schema Migration Boundary

**Files:**
- Create: `visual-direction-os/runtime/runtime-fingerprint.js`
- Create: `visual-direction-os/runtime/runtime-fingerprint-tests.js`
- Create: `visual-direction-os/runtime/schema-migrations.js`
- Create: `visual-direction-os/runtime/schema-migrations-tests.js`

**Interfaces:**
- Produces: `VDOS_RUNTIME_FINGERPRINT`, `VDOS_PACKAGE_VERSION`, `VDOS_SCHEMA_VERSION`.
- Produces: `createSchemaMigrator({ currentVersion, migrations }) → { migrate(model), assertSupported(version) }`.

- [ ] **Step 1: Write failing tests**

```js
const assert = require('node:assert/strict');
const { VDOS_PACKAGE_VERSION, VDOS_SCHEMA_VERSION, VDOS_RUNTIME_FINGERPRINT } = require('./runtime-fingerprint.js');
const { createSchemaMigrator } = require('./schema-migrations.js');

assert.equal(VDOS_PACKAGE_VERSION, 1);
assert.equal(VDOS_SCHEMA_VERSION, 1);
for (const key of ['appVersion','visualIRVersion','promptCompilerVersion','evaluationEngineVersion','comparisonEngineVersion','memoryPolicyVersion']) {
  assert.ok(key in VDOS_RUNTIME_FINGERPRINT, `missing ${key}`);
}

const migrator = createSchemaMigrator({ currentVersion:3, migrations:{
  1:(m)=>({ ...m, schemaVersion:2 }),
  2:(m)=>({ ...m, schemaVersion:3 })
}});
const source = { schemaVersion:1, payload:{x:1} };
const migrated = migrator.migrate(source);
assert.equal(migrated.model.schemaVersion, 3);
assert.deepEqual(migrated.steps, ['1→2','2→3']);
assert.equal(source.schemaVersion, 1);
assert.throws(() => migrator.assertSupported(4), /newer|update/i);
```

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/runtime/runtime-fingerprint-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
```
Expected: missing module/export failure.

- [ ] **Step 3: Implement minimal constants and migrator**

```js
const VDOS_PACKAGE_VERSION = 1;
const VDOS_SCHEMA_VERSION = 1;
const VDOS_RUNTIME_FINGERPRINT = Object.freeze({
  appVersion:'m5', visualIRVersion:1, promptCompilerVersion:1,
  evaluationEngineVersion:1, comparisonEngineVersion:1, memoryPolicyVersion:1
});
```

Migrator deep-clones input, rejects `version > currentVersion`, no-ops current v1, runs exactly one registered transform per integer step, and records `['1→2', ...]`.

- [ ] **Step 4: Verify GREEN**

Run Step 2 commands; both must pass.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/runtime-fingerprint* visual-direction-os/runtime/schema-migrations*
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
- Produces: `stableJsonBytes(value)`, `sha256Hex(bytes)`, `encodeVdos({files,manifestBase})`, `decodeVdos(bytes,options)`, `verifyManifestFiles(decoded)`, `normalizeArchivePath(path)`.
- `decodeVdos` returns `{manifest, entries:Map<string,Uint8Array>, warnings:[]}` and never interprets project semantics.

- [ ] **Step 1: Vendor exact upstream fflate 0.8.2 browser build and MIT license**

Do not locally rewrite/minify the vendored source. Preserve upstream license text and make the pinned version discoverable in the vendor/license record.

- [ ] **Step 2: Write failing codec tests**

```js
const assert = require('node:assert/strict');
const { stableJsonBytes, sha256Hex, encodeVdos, decodeVdos, normalizeArchivePath } = require('./vdos-codec.js');

(async () => {
  assert.deepEqual(
    [...stableJsonBytes({z:1,a:{y:2,x:3},list:[{b:2,a:1}]})],
    [...stableJsonBytes({list:[{a:1,b:2}],a:{x:3,y:2},z:1})]
  );
  assert.equal((await sha256Hex(new TextEncoder().encode('abc'))).length, 64);
  const png = Uint8Array.from([137,80,78,71,1,2,3]);
  const archive = await encodeVdos({
    manifestBase:{format:'vdos-project',packageVersion:1,schemaVersion:1,packageId:'pkg-1',exportedAt:'2026-08-26T00:00:00Z',createdWith:{},project:{id:'p1',title:'P'},packageCompleteness:'complete',missingAssets:[]},
    files:[
      {path:'project.json',role:'core',bytes:stableJsonBytes({schemaVersion:1,id:'p1'})},
      {path:'images/gen-1.png',role:'asset',bytes:png}
    ]
  });
  const decoded = await decodeVdos(archive);
  assert.deepEqual([...decoded.entries.get('images/gen-1.png')], [...png]);
  assert.throws(() => normalizeArchivePath('../evil.json'), /unsafe/i);
  assert.throws(() => normalizeArchivePath('artifacts\\..\\evil.json'), /unsafe/i);
})();
```

Also test malformed ZIP, duplicate normalized names, absolute/drive paths, control/NUL names, unknown root entries, entry-count limit, and inflated-byte limit.

- [ ] **Step 3: Verify RED**

```bash
node visual-direction-os/runtime/vdos-codec-tests.js
```
Expected: codec missing.

- [ ] **Step 4: Implement codec guardrails and hashing**

```js
const ALLOWED_ROOT = new Set(['manifest.json','project.json','lineage.json','comparisons.json','memory.json']);
const ALLOWED_PREFIXES = ['artifacts/','images/','references/'];
const DEFAULT_LIMITS = Object.freeze({ maxEntries:4096, maxInflatedBytes:512 * 1024 * 1024 });
```

Reject absolute paths, drive paths, backslashes, `.`/`..`, NUL/control chars, empty normalized names, duplicate normalized names, and unknown roots/prefixes. `encodeVdos` hashes exact payload bytes and indexes every payload except `manifest.json`. `decodeVdos` enforces entry and inflated-byte limits before JSON parsing.

- [ ] **Step 5: Verify GREEN**

Run Step 3; must pass.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/vendor visual-direction-os/runtime/vdos-codec*
git commit -m "feat(m5): add safe vdos archive codec"
```

---

### Task 3: Expand Director Memory for Multi-Project and Atomic Bundles

**Files:**
- Modify: `visual-direction-os/runtime/director-memory.js`
- Modify: `visual-direction-os/runtime/director-memory-tests.js`

**Interfaces:**
- Adds memory methods: `listProjects()`, `getProject(id)`, `loadProjectBundle(projectId)`, `commitProjectBundle({mode,project,artifacts,comparisons,replaceProjectId})`.
- `commitProjectBundle` performs one IndexedDB readwrite transaction across `projects`, `artifacts`, `comparisons`.

- [ ] **Step 1: Add failing tests**

```js
await memory.commitProjectBundle({
  mode:'copy',
  project:{id:'project-import',title:'Imported',createdAt:'2026-08-26T00:00:00Z',updatedAt:'2026-08-26T00:00:00Z'},
  artifacts:[{id:'g1',projectId:'project-import',rootArtifactId:'g1',parentArtifactId:null,generationIndex:1}],
  comparisons:[]
});
assert.equal((await memory.getProject('project-import')).title, 'Imported');
assert.equal((await memory.loadProjectBundle('project-import')).artifacts.length, 1);
assert.ok((await memory.listProjects()).some((p)=>p.id === 'project-import'));
```

Fake-store transaction failure must prove forced Replace leaves the old project/artifacts unchanged.

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/runtime/director-memory-tests.js
```
Expected: missing methods.

- [ ] **Step 3: Implement IndexedDB primitives**

```js
const tx = db.transaction(['projects','artifacts','comparisons'], 'readwrite');
// delete target project rows inside tx for replace mode
// put staged project/artifacts/comparisons inside the same tx
await transactionToPromise(tx);
```

Do not store `activeProjectId` here.

- [ ] **Step 4: Verify GREEN including old M4 degradation tests**

Run Step 2; must pass.

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
- Produces `createProjectLibrary({memory,preferences,now,makeId})` with `boot()`, `list()`, `newProject(title)`, `open(projectId)`, `rename(projectId,title)`, `delete(projectId)`, `getActiveProjectId()`.
- Preference key: `vdos-active-project-id`.

- [ ] **Step 1: Write failing tests**

```js
const library = createProjectLibrary({memory,preferences,now:()=> '2026-08-26T00:00:00Z',makeId:()=> 'project-new'});
assert.equal((await library.boot()).activeProject.id, 'project-old');
await library.open('project-b');
assert.equal(preferences.getItem('vdos-active-project-id'), 'project-b');
await memory.putProject({id:'project-c',title:'Touched',createdAt:'2026-08-25',updatedAt:'2099-01-01'});
assert.equal((await library.boot()).activeProject.id, 'project-b');
await library.delete('project-b');
assert.notEqual(library.getActiveProjectId(), 'project-b');
```

Also test empty DB creates `Untitled Director Project`, rename trims safely, and deleting active persists fallback ID.

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/runtime/project-library-tests.js
```

- [ ] **Step 3: Implement explicit active resolution**

Resolution order: stored active if it exists → latest existing project → create Untitled. Only `open`, successful import, New Project, or active deletion changes active identity; updating timestamps never does.

- [ ] **Step 4: Verify GREEN**

Run Step 2; must pass.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/project-library*
git commit -m "feat(m5): add local project library"
```

---

### Task 5: Capture Rich Reference Evidence on Generation Artifacts

**Files:**
- Modify: `visual-direction-os/runtime/generation-client.js`
- Modify: `visual-direction-os/runtime/generation-client-tests.js`
- Modify: `visual-direction-os/runtime/generation-ui-m3.js`

**Interfaces:**
- `createGenerationArtifact({...,references=[]})` deep-clones `artifact.references`.
- UI passes existing rich `{id,name,source,role,preserve}` reference records; Agnes request execution is unchanged.

- [ ] **Step 1: Add failing test**

```js
const refs = [{id:'r1',name:'hero.png',source:'data:image/png;base64,AA==',role:'character',preserve:['identity']}];
const artifact = createGenerationArtifact({request:{model:'agnes-image-2.1-flash',prompt:'P'},result:{kind:'base64',src:'data:image/png;base64,AA=='},references:refs});
assert.deepEqual(artifact.references, refs);
assert.notEqual(artifact.references, refs);
refs[0].role = 'world';
assert.equal(artifact.references[0].role, 'character');
```

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/runtime/generation-client-tests.js
```

- [ ] **Step 3: Implement snapshot handoff**

```js
references: clone(Array.isArray(references) ? references : [])
```

Pass `references:state.references` in `generation-ui-m3.js` when creating the artifact.

- [ ] **Step 4: Verify M3 regressions**

```bash
node visual-direction-os/runtime/generation-client-tests.js
node visual-direction-os/runtime/iteration-tests.js
node visual-direction-os/runtime/iteration-controller-tests.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/generation-client.js visual-direction-os/runtime/generation-client-tests.js visual-direction-os/runtime/generation-ui-m3.js
git commit -m "feat(m5): capture generation reference evidence"
```

---

### Task 6: Portable Export Model, Preflight, and Reference Deduplication

**Files:**
- Create: `visual-direction-os/runtime/project-package.js`
- Create: `visual-direction-os/runtime/project-package-tests.js`

**Interfaces:**
- Produces: `portableRequestV1(request)`, `validateLineage({project,artifacts,lineage})`, `mergeRuntimeAndPersistedArtifacts(runtimeArtifacts,persistedArtifacts)`, `buildExportStage({project,runtimeArtifacts,persistedArtifacts,comparisons,memorySnapshot,fetchImpl})`, `buildExportReport(stage)`, `buildArchiveFiles(stage)`.

- [ ] **Step 1: Write failing allowlist/preflight/reference tests**

```js
const safe = portableRequestV1({
  model:'agnes-image-2.1-flash',prompt:'P',size:'2K',ratio:'16:9',return_base64:true,
  Authorization:'secret',headers:{Cookie:'x'},unknown:'drop-me',
  extra_body:{response_format:'b64_json',image:['data:image/png;base64,AA=='],token:'drop'}
});
assert.deepEqual(safe,{model:'agnes-image-2.1-flash',prompt:'P',size:'2K',ratio:'16:9',return_base64:true,extra_body:{response_format:'b64_json'}});
assert.doesNotMatch(JSON.stringify(safe), /secret|drop-me|Cookie/);

const merged = mergeRuntimeAndPersistedArtifacts(
  [{id:'g2',projectId:'p1',persistenceStatus:'not_persisted',parentArtifactId:'g1',rootArtifactId:'g1',generationIndex:2}],
  [{id:'g1',projectId:'p1',persistenceStatus:'persisted',imageBlob:new Blob([Uint8Array.of(1,2,3)],{type:'image/png'}),parentArtifactId:null,rootArtifactId:'g1',generationIndex:1}]
);
assert.deepEqual(merged.map((x)=>x.id), ['g1','g2']);
```

Two artifacts with identical reference bytes but different roles must yield one binary reference asset and two usage records. Add cycle/broken-parent/root mismatch tests. Remote reference fetch failure must mark `remote_unavailable` and retain at most `scheme://host`, never query/path secrets.

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/runtime/project-package-tests.js
```

- [ ] **Step 3: Implement portable export model**

`portableRequestV1` constructs a new object field-by-field. Runtime metadata takes precedence over persisted metadata for the same artifact ID; persisted Blob is reused when runtime row lacks it. Reference assets are content-addressed `references/<sha256>.<ext>`. Generated images are `images/<artifact-id>.<ext>`. `not_persisted` metadata is included and forces partial completeness.

- [ ] **Step 4: Add archive-byte secret regression**

Build archive JSON files with secret-shaped unknown runtime fields and assert `Bearer`, `VDOS_PROXY_TOKEN`, `session-secret`, and the injected secret never occur in any JSON payload bytes.

- [ ] **Step 5: Verify GREEN**

Run Step 2; must pass.

- [ ] **Step 6: Commit**

```bash
git add visual-direction-os/runtime/project-package*
git commit -m "feat(m5): build portable project export model"
```

---

### Task 7: Import Staging, Graded Recovery, Derived Reconciliation, ID Remap, and Reference Rehydration

**Files:**
- Modify: `visual-direction-os/runtime/project-package.js`
- Modify: `visual-direction-os/runtime/project-package-tests.js`

**Interfaces:**
- Adds `stageImport({decoded,migrator,existingProjectIds,mode,makeProjectId,makeArtifactId,recomputeDerived})`.
- Adds `remapImportedProject(stage,{projectId,artifactIdMap})`, `rehydrateRuntimeArtifact(portableArtifact,assetLookup)`, `buildImportReport(stage)`.
- `recomputeDerived({artifacts,comparisons,lineage,memorySnapshot})` is injected from current comparison/memory policy and runs before commit; staging never calls Director Memory.
- Returns `{project,artifacts,comparisons,lineage,importAudit,recoveryStatus,idMap,derived}` ready for atomic commit.

- [ ] **Step 1: Add failing copy/partial/reconciliation tests**

```js
const staged = await stageImport({
  decoded,migrator,existingProjectIds:new Set(['project-source']),mode:'copy',
  makeProjectId:()=> 'project-copy',makeArtifactId:(old)=> `copy-${old}`,
  recomputeDerived:({memorySnapshot})=>({memory:{locked:[],active:[],watch:[]},memoryReconciliation:memorySnapshot ? 'MEMORY MIGRATED' : 'MEMORY VERIFIED'})
});
assert.equal(staged.project.id, 'project-copy');
assert.equal(staged.project.provenance.sourceProjectId, 'project-source');
assert.equal(staged.artifacts.find((a)=>a.sourceIdentity.sourceArtifactId === 'g2').parentArtifactId, 'copy-g1');
assert.equal(staged.lineage.nodes.find((n)=>n.artifactId === 'copy-g2').parentArtifactId, 'copy-g1');
assert.ok(['MEMORY VERIFIED','MEMORY MIGRATED'].includes(staged.derived.memoryReconciliation));
```

Also test comparison A/B + comparison ID remap, memory head remap, copy-of-copy earliest provenance, one corrupt image → partial metadata-only, core checksum failure → throw, schema 2/current 1 → throw, and reference bytes rehydrate to ordered `request.extra_body.image` data URIs.

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/runtime/project-package-tests.js
```

- [ ] **Step 3: Implement staging in spec order**

Order is fixed: codec safety already passed → manifest/version → checksum classification → parse core → migrate → structural/reference validation → asset recovery → runtime reference rehydration → **current-policy comparison/memory recomputation and snapshot reconciliation** → conflict mode → Copy remap if selected → final structural validation → Import Report. Store historical snapshots and reconciliation summary under `project.importAudit`; do not persist precomputed current M4 UI selection state.

Unavailable references set `artifact.reproducibility = {status:'partial',missingReferences:[...]}` so historical redirect can warn.

- [ ] **Step 4: Verify GREEN**

```bash
node visual-direction-os/runtime/project-package-tests.js
node visual-direction-os/runtime/schema-migrations-tests.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/project-package.js visual-direction-os/runtime/project-package-tests.js
git commit -m "feat(m5): stage safe vdos imports"
```

---

### Task 8: M4 Active-Project Boot, Switching, and Export Snapshot

**Files:**
- Modify: `visual-direction-os/runtime/m4-controller.js`
- Modify: `visual-direction-os/runtime/m4-controller-tests.js`

**Interfaces:**
- Changes `boot()` to `boot({projectId=null}={})`; requested existing project wins, missing requested ID falls back to latest, then creates Untitled only if none exist.
- Adds `openProject(projectId)` and `getExportSnapshot()`.
- `openProject` revokes prior object URLs, loads the chosen project only, restores default A/B, and recomputes path memory.

- [ ] **Step 1: Add failing boot/switch/snapshot tests**

```js
await controller.boot({projectId:'project-b'});
assert.equal(controller.getState().project.id, 'project-b');
await controller.openProject('project-a');
assert.equal(controller.getState().project.id, 'project-a');
assert.equal(revokedUrls.includes(oldUrl), true);
const snapshot = controller.getExportSnapshot();
snapshot.artifacts[0].id = 'mutated';
assert.notEqual(controller.getState().artifacts[0].id, 'mutated');
```

Opening a missing project must throw without clearing the currently working state. Booting with stale active ID must fall back safely.

- [ ] **Step 2: Verify RED**

```bash
node visual-direction-os/runtime/m4-controller-tests.js
```

- [ ] **Step 3: Refactor project loading**

Create internal `loadProject(project)` shared by boot/open. Boot must resolve requested `projectId` via `memory.getProject` before `getLatestProject`. Preserve comparison judgments/semantic locks only from selected project's persisted comparisons. Keep the restore promise non-blocking to M3 readiness.

- [ ] **Step 4: Verify regressions**

```bash
node visual-direction-os/runtime/m4-controller-tests.js
node visual-direction-os/runtime/app-boot-tests.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/m4-controller.js visual-direction-os/runtime/m4-controller-tests.js
git commit -m "feat(m5): boot and switch explicit director projects"
```

---

### Task 9: Browser Orchestrator and Lightweight Project Package UI

**Files:**
- Create: `visual-direction-os/runtime/project-package-ui.js`
- Create: `visual-direction-os/runtime/project-package.css`
- Modify: `visual-direction-os/app.js`
- Modify: `visual-direction-os/runtime/project-library.js`
- Modify: `visual-direction-os/runtime/project-library-tests.js`

**Interfaces:**
- Browser mount creates its own Director Memory adapter over the same IndexedDB and exposes `VisualDirectionOS.projects` with `list/open/new/rename/delete/export/import`.
- Export: `m4.getExportSnapshot()` + `memory.loadProjectBundle()` → export stage → preflight → archive files → `encodeVdos` → download.
- Import: File bytes → `decodeVdos` → `stageImport` with current `compareArtifacts/deriveMemoryForPath` injected through `recomputeDerived` → conflict choice → `memory.commitProjectBundle` → set active ID → `m4.openProject`.

- [ ] **Step 1: Add active-after-commit regression**

Inject a failing commit into the orchestration helper; assert `vdos-active-project-id` remains old. Resolve commit; assert active changes only after success.

- [ ] **Step 2: Implement compact UI**

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

Partial export defaults to Cancel and requires explicit `Export Incomplete Package`. Conflict defaults selected mode to `Import as Copy`; Replace is secondary/destructive. Reports show package/schema fingerprint, completeness/recovery, checksum/migration/reconciliation, and never stripped secret values.

- [ ] **Step 3: Wire `app.js` load and boot order**

Runtime asset order must include:

```js
'vendor/fflate.min.js',
'runtime/runtime-fingerprint.js',
'runtime/schema-migrations.js',
'runtime/vdos-codec.js',
'runtime/project-package.js',
'runtime/project-library.js',
// existing generation/evaluation/M4 modules in dependency-safe order
'runtime/project-package-ui.js'
```

Load `runtime/project-package.css`.

Before calling M4 boot, read active preference and pass it directly:

```js
let preferredProjectId = null;
try { preferredProjectId = localStorage.getItem('vdos-active-project-id'); } catch (_) {}
const m4Boot = globalThis.VisualDirectionOS?.m4?.boot?.({ projectId:preferredProjectId });
```

This prevents a hard refresh from first restoring the wrong “latest” project. Package/library UI may finish booting later; failure there must not set the global M3 runtime unavailable.

- [ ] **Step 4: Verify project-library + boot regression**

```bash
node visual-direction-os/runtime/project-library-tests.js
node visual-direction-os/runtime/app-boot-tests.js
```

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/runtime/project-package-ui.js visual-direction-os/runtime/project-package.css visual-direction-os/runtime/project-library* visual-direction-os/app.js
git commit -m "feat(m5): add project package workspace"
```

---

### Task 10: Real Browser `.vdos` Acceptance

**Files:**
- Create: `visual-direction-os/runtime/project-package-browser-acceptance-tests.js`

**Interfaces:**
- Reuse the existing CDP/static-server approach from `browser-acceptance-tests-v2.js`.
- Exercise real IndexedDB, Blob, File, Web Crypto, vendored fflate, hard reload, and runtime UI. Live Agnes is not required.

- [ ] **Step 1: Write acceptance harness**

One isolated Chrome profile must prove:

```text
1. Create/open Project A.
2. Ingest g1 → g2 → g3 and sibling g2b; one artifact uses a local PNG reference.
3. Persist generated PNG/WebP fixtures and semantic judgments.
4. Export complete `.vdos`; inspect archive bytes and prove secret sentinels absent.
5. Clear/switch local state, import, and restore image bytes/MIME, lineage, judgments, comparisons, and current recomputed memory.
6. Import same archive with original ID present; default Copy; IDs differ while topology/source identity match.
7. Hard reload restores explicit active imported project.
8. Corrupt one image; import is partial/recoverable and affected artifact is metadata-only.
9. Corrupt `project.json` checksum; import blocks and IndexedDB project count is unchanged.
10. Force Replace transaction abort; original project/artifacts and active ID remain intact.
11. Duplicate reference bytes create one `references/<sha>` archive entry while per-use role/preserve survive.
12. Available imported references rehydrate request/baseRequest `extra_body.image` in original order.
13. Import Report contains memory reconciliation computed before commit.
```

- [ ] **Step 2: Run and confirm RED on any remaining integration gaps**

```bash
node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
```

Fix product code; do not weaken assertions.

- [ ] **Step 3: Add focused regression for each browser-only defect before minimal fix**

Do not solve readiness races with arbitrary sleeps. Wait on explicit controller state or IndexedDB record counts because persistence restore is intentionally non-blocking.

- [ ] **Step 4: Run both browser acceptances**

```bash
node visual-direction-os/runtime/browser-acceptance-tests-v2.js
node visual-direction-os/runtime/project-package-browser-acceptance-tests.js
```

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
- Workflow runs on `master`, `m5-project-package-reproducibility`, and PRs targeting `master`.

- [ ] **Step 1: Add triggers**

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

Keep existing path filters.

- [ ] **Step 2: Add M5 steps**

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

Add `node --check` for every new non-vendored runtime JS file.

- [ ] **Step 3: Run full CI-equivalent suite**

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

Every command must exit 0.

- [ ] **Step 4: Commit CI**

```bash
git add .github/workflows/m3-runtime-tests.yml
git commit -m "ci(m5): verify project package runtime"
```

- [ ] **Step 5: Verify Actions on exact branch HEAD**

Require complete success. If browser acceptance appears flaky, rerun the same HEAD once and require a second success before declaring M5 complete.

---

### Task 12: Final Protocol Audit and Acceptance Evidence

**Files:**
- Modify only if audit identifies a concrete product defect.

**Interfaces:**
- No new runtime API; produces final acceptance evidence.

- [ ] **Step 1: Map all 21 spec acceptance criteria to passing tests/assertions**

Any uncovered criterion receives a focused test before completion.

- [ ] **Step 2: Inspect an actual exported `.vdos` as ZIP-compatible archive**

Verify allowed entry structure, manifest indexing, and absence of Authorization/proxy/session/blob/data-result secret material in JSON payloads.

- [ ] **Step 3: Compare branch to `master` for scope**

Only M5 spec/plan, M5 runtime/vendor/tests, focused M4 integration, and CI changes are allowed; no unrelated redesign/refactor.

- [ ] **Step 4: Run final Actions on exact HEAD and record SHA + run ID**

Do not claim completion while queued/in-progress.

- [ ] **Step 5: Stop before merge**

Keep `m5-project-package-reproducibility` intact and request explicit merge authorization before touching `master`.
