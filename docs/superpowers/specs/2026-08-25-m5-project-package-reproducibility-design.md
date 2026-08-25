# M5 Design — Project Package & Reproducible Direction

Date: 2026-08-25
Branch: `m5-project-package-reproducibility`
Status: Draft for final review before implementation planning

## 1. Purpose

M4 established persistent local lineage, A/B comparison, delta effectiveness, branching, and Director Memory. M5 makes that project state portable and reproducible across browser instances without introducing accounts or cloud synchronization.

The M5 target is:

`LOCAL DIRECTOR PROJECT → EXPORT .vdos → MOVE / ARCHIVE → IMPORT → VALIDATE → MIGRATE → RESTORE → CONTINUE DIRECTING`

M5 is not just a ZIP download feature. It defines the first stable portable project protocol for Visual Direction OS. The same portable model is intended to become the data contract that a future M6 cloud workspace can synchronize.

## 2. Scope

M5 first release adds five capabilities:

1. **Project Package Protocol** — a ZIP-compatible `.vdos` file format with explicit schema and runtime fingerprint.
2. **Whole-Project Export / Import** — export one complete project and restore it in another browser.
3. **Project Library** — list, open, create, rename, export, import, and delete local projects.
4. **Integrity / Migration Pipeline** — SHA-256 validation, staged import, schema migration, and recoverable partial assets.
5. **Reproducibility Provenance** — preserve source evidence, generation parameters, reference assets, historical comparison/memory snapshots, and source identity without restoring runtime credentials.

M5 first release does **not** support branch-only export, subtree export, project merge, cloud sync, accounts, collaboration, or arbitrary package editing.

## 3. Approved Product Decisions

The following decisions are authoritative for M5 v1:

- Import conflict handling: detect existing `projectId`; offer **Import as Copy** or **Replace Existing**; default to Import as Copy.
- Import as Copy: generate new runtime project/artifact IDs and rewrite every internal reference; preserve source identity for provenance.
- Incomplete projects: run Export Preflight; default to cancel when required assets are missing, but allow explicit `Export Incomplete Package`.
- Container: `.vdos` is a standard ZIP-compatible archive.
- Integrity: graded validation. Core structure failure blocks import; individual non-structural asset failure degrades to partial/recoverable import.
- Versioning: explicit `packageVersion` and `schemaVersion` with stepwise migration pipeline. Forward schemas newer than the current runtime are rejected.
- Memory: source evidence is authoritative. `memory.json` is an audit snapshot and is recomputed by the current Memory Engine after import.
- Import transaction: staging first, then commit. Replace Existing must not delete the old project until the replacement is fully validated and ready for one atomic commit boundary.
- Export scope: whole current project only.
- ZIP implementation: vendor a fixed browser build of `fflate` in the repository; no CDN dependency and no new frontend build pipeline.
- Generated images: preserve original Blob bytes and MIME type; never re-encode during export/import.
- Security: export uses an explicit allowlist. Credentials, session values, headers, temporary URLs, and unknown request fields are not portable.
- Reproducibility: record runtime fingerprint/version metadata, but do not bundle executable historical runtime code.
- Project Library: lightweight switcher with project management actions, not a separate full workspace homepage.
- Startup project: persist explicit `activeProjectId`; project `updatedAt` does not decide which project is active.

## 4. Architecture

M5 uses a layered package architecture and preserves the existing M4 responsibility boundaries.

```text
Project UI
  ├─ Project Library / Switcher
  ├─ Export Preflight
  ├─ Import Conflict Choice
  └─ Import / Export Report
          │
          ▼
project-library.js
  ├─ list / open / new / rename / delete
  └─ activeProjectId
          │
          ▼
project-package.js
  ├─ Portable Project Model
  ├─ export allowlist sanitizer
  ├─ export preflight
  ├─ import staging
  ├─ ID remap
  ├─ reference validation
  └─ memory/comparison reconciliation
      │                 │
      ▼                 ▼
vdos-codec.js       schema-migrations.js
  ├─ fflate             └─ vN → vN+1
  ├─ ZIP / UNZIP
  ├─ SHA-256
  ├─ canonical JSON
  └─ binary assets
          │
          ▼
director-memory.js
  ├─ IndexedDB projects
  ├─ artifacts
  ├─ comparisons
  ├─ list/get project support
  └─ atomic project bundle commit
```

### 4.1 Boundary rule

`.vdos` Portable Project Model is **not** the IndexedDB record format.

- IndexedDB may change without forcing `.vdos` schema changes.
- `.vdos` schema may evolve through migrations without mirroring the persistence layout.
- UI never reads or writes ZIP payloads directly.
- M4 comparison/memory policy remains independent from codec and archive handling.

## 5. `.vdos v1` Archive Structure

```text
My-Project.vdos
├── manifest.json
├── project.json
├── lineage.json
├── comparisons.json
├── memory.json
├── artifacts/
│   ├── gen-001.json
│   ├── gen-002.json
│   └── ...
├── images/
│   ├── gen-001.png
│   ├── gen-002.webp
│   └── ...
└── references/
    ├── <sha256>.png
    ├── <sha256>.webp
    └── ...
```

Generated image paths are artifact-oriented. Reference assets are content-addressed by SHA-256 so repeated use of the same reference image across generations is stored once.

## 6. `manifest.json`

`manifest.json` is the package entry point and integrity index. It does not contain business state that should be independently edited.

Required v1 fields:

```json
{
  "format": "vdos-project",
  "packageVersion": 1,
  "schemaVersion": 1,
  "packageId": "pkg-...",
  "exportedAt": "...",
  "createdWith": {
    "appVersion": "...",
    "visualIRVersion": 1,
    "promptCompilerVersion": 1,
    "evaluationEngineVersion": 1,
    "comparisonEngineVersion": 1,
    "memoryPolicyVersion": 1
  },
  "project": {
    "id": "project-...",
    "title": "..."
  },
  "packageCompleteness": "complete",
  "missingAssets": [],
  "files": []
}
```

### 6.1 Runtime fingerprint

`createdWith` records the package-producing runtime versions. It exists to explain historical behavior and migration differences. It is not executable and does not cause the current app to run historical code.

### 6.2 File index

Every archived payload file except `manifest.json` is indexed with:

- `path`
- `role`: `core` or `asset`
- byte `size`
- `sha256`

`manifest.json` is not hashed by itself, avoiding recursive manifest hashing.

### 6.3 Graded integrity

- Core failure: malformed/missing project, lineage, required artifact metadata, or core checksum mismatch → block import.
- Asset failure: individual generated image or reference asset missing/checksum mismatch → mark affected artifact/reference incomplete and allow recoverable import.
- Every degraded condition is reported; no silent recovery.

## 7. `project.json`

Portable project identity:

```json
{
  "schemaVersion": 1,
  "id": "project-...",
  "title": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "exportedAt": "...",
  "provenance": {
    "sourceProjectId": null,
    "importedFromPackageId": null
  },
  "stats": {
    "artifactCount": 0,
    "comparisonCount": 0,
    "rootCount": 0
  }
}
```

Identity meanings:

- `packageId`: one archive export event.
- `projectId`: project identity at export time.
- `sourceProjectId`: origin identity when this project was previously imported as a copy.

For repeated copies, preserve the earliest known source identity rather than replacing it with every intermediate runtime ID. `importedFromPackageId` records the most recent package provenance.

## 8. Portable Artifact Schema

M5 never dumps the IndexedDB artifact row directly.

Each `artifacts/<id>.json` contains:

```json
{
  "schemaVersion": 1,
  "id": "gen-...",
  "projectId": "project-...",
  "rootArtifactId": "gen-...",
  "parentArtifactId": null,
  "generationIndex": 1,
  "createdAt": "...",
  "sourceIdentity": {
    "sourceArtifactId": null
  },
  "generation": {
    "provider": "agnes-image-2.1-flash",
    "request": {},
    "baseRequest": {},
    "resultMetadata": {
      "kind": "base64",
      "revisedPrompt": null
    },
    "references": []
  },
  "visualIR": {},
  "measurements": {},
  "evaluation": {},
  "humanJudgments": {},
  "iterationDelta": {},
  "evaluationDelta": {},
  "image": {
    "path": "images/gen-....webp",
    "mimeType": "image/webp",
    "sha256": "...",
    "status": "available"
  }
}
```

The package does not contain runtime `Blob` objects, object URLs, raw result data URLs, remote temporary result URLs, persistence errors, or transient UI selection state.

## 9. Portable Request Allowlist

M5 uses fail-closed request serialization.

Allowed Agnes v1 request fields:

- `model`
- `prompt`
- `size`
- `ratio`
- `return_base64`
- `extra_body.response_format`

`extra_body.image` is not exported inside the request object. Reference inputs are represented through the explicit reference-asset model below.

Unknown request fields are excluded until a future schema version explicitly adds them.

Never portable:

- `Authorization`
- proxy/session tokens
- cookies
- HTTP headers
- worker secrets
- local/session storage state
- blob/object URLs
- temporary signed generation result URLs
- internal stack traces

Import never restores credentials. Continued generation uses the destination browser's own current proxy/session configuration.

## 10. Reference Asset Provenance

Reference images used to produce a generation are source evidence and therefore part of reproducibility.

### 10.1 New artifact metadata

New M5-era generation artifacts must capture reference usage explicitly at generation time:

```json
{
  "id": "ref-use-...",
  "name": "character.png",
  "role": "character",
  "preserve": ["identity", "silhouette"],
  "source": "<runtime source>"
}
```

This is in addition to the compiled prompt and executed request. It prevents role/preserve metadata from being lost after `buildAgnesRequest()` reduces references to `extra_body.image` source values.

### 10.2 Package representation

Each artifact stores reference usage metadata, not binary bytes inline:

```json
{
  "assetId": "sha256:<digest>",
  "path": "references/<digest>.png",
  "name": "character.png",
  "mimeType": "image/png",
  "role": "character",
  "preserve": ["identity"],
  "status": "available"
}
```

Identical reference bytes are deduplicated by SHA-256.

### 10.3 Existing M4 artifacts

Older artifacts may contain only `request.extra_body.image` and no role/preserve metadata.

Exporter behavior:

- extract/fix reference bytes when possible;
- do not invent role/preserve metadata;
- mark missing semantic reference metadata in Export Report;
- preserve the already-compiled prompt as historical evidence;
- if reference bytes cannot be captured, mark package partial rather than blocking export after explicit user confirmation.

### 10.4 Remote references

If a reference source is HTTP(S):

- attempt to fetch and store the bytes when browser CORS permits;
- if successful, package it like any other reference asset;
- if unavailable, mark it `remote_unavailable` and package partial;
- do not preserve query strings/fragments from unavailable remote URLs because they may contain temporary or signed credentials;
- an optional non-secret URL hint may retain origin/path only.

Current UI-uploaded references are data URIs and should normally be fully recoverable.

## 11. `lineage.json`

`lineage.json` is the explicit project topology:

```json
{
  "schemaVersion": 1,
  "roots": ["gen-001"],
  "nodes": [
    { "artifactId": "gen-001", "parentArtifactId": null },
    { "artifactId": "gen-002", "parentArtifactId": "gen-001" }
  ]
}
```

Artifact records also retain parent/root IDs. This duplication is intentional and acts as an integrity cross-check.

Import must verify:

- every lineage node resolves to exactly one artifact;
- parent IDs resolve within the same project;
- no cycles exist;
- roots match null-parent artifacts;
- artifact parent/root metadata agrees with lineage topology.

A structural mismatch is a core validation failure and blocks import.

## 12. `comparisons.json`

Comparisons are stored centrally:

```json
{
  "schemaVersion": 1,
  "comparisons": [
    {
      "id": "gen-a::gen-b",
      "artifactAId": "gen-a",
      "artifactBId": "gen-b",
      "directorJudgments": {},
      "comparisonSnapshot": {},
      "updatedAt": "..."
    }
  ]
}
```

Authority rules:

- Director judgments are source evidence and must be preserved.
- Comparison output is a historical derived snapshot and may be recomputed by the current engine.
- Every comparison reference must resolve to artifacts in the imported project.

## 13. `memory.json`

Memory is stored as an audit snapshot:

```json
{
  "schemaVersion": 1,
  "policyVersion": 1,
  "computedAt": "...",
  "pathHeadId": "gen-...",
  "snapshot": {
    "locked": [],
    "active": [],
    "watch": []
  }
}
```

Import always recomputes memory from current source evidence:

`Artifacts + Evaluation + Director Judgments + Comparisons + Lineage → Current Memory Engine`

Then compare current memory with the exported snapshot:

- identical → `MEMORY VERIFIED`
- different because of migration/policy evolution → `MEMORY MIGRATED`

Runtime uses the recomputed state. The historical snapshot and reconciliation status remain available as import provenance/audit data.

## 14. Source-of-Truth Hierarchy

M5 formalizes four layers:

1. **Source Evidence** — images, reference assets, Visual IR, portable generation request, measurements, human judgments, evaluation/iteration deltas.
2. **Structure** — project identity, lineage, artifact relationships.
3. **Derived Snapshots** — comparison snapshot and memory snapshot.
4. **Runtime State** — object URLs, current UI selection, transient errors, tokens, browser session configuration.

Rules:

- Levels 1 and 2 are long-lived portable truth.
- Level 3 is retained for audit but can be recomputed.
- Level 4 never enters `.vdos`.

## 15. Package Completeness

Supported package states in v1:

- `complete`
- `partial`

Partial reasons include at minimum:

- generated image `meta_only`
- generated image `not_persisted`
- generated asset checksum mismatch after import
- unavailable reference asset
- legacy reference metadata incomplete

`missingAssets` records artifact/reference identity, asset type, and reason.

Export Preflight behavior:

- complete → normal export;
- partial → show explicit missing/degraded list and default to cancel;
- user may explicitly choose `Export Incomplete Package`.

No incomplete condition is silently hidden.

## 16. ZIP / Codec Strategy

M5 vendors a fixed version of `fflate` inside the repository.

Requirements:

- no CDN fetch;
- no new frontend build pipeline;
- browser load order is explicit in `app.js`;
- Node tests can load the same codec or test an injected codec adapter;
- compression/decompression errors surface as package errors, not persistence errors.

### 16.1 SHA-256

Use Web Crypto `crypto.subtle.digest('SHA-256', ...)` in browser and equivalent Web Crypto in Node tests.

Checksums are calculated over the exact UTF-8/binary bytes placed in the archive.

### 16.2 JSON serialization

Use deterministic package serialization for project/core JSON. Implement a stable object-key serializer so the same logical model has stable file bytes independent of incidental runtime object insertion order. Arrays preserve semantic order.

The complete ZIP byte stream does not need to be globally deterministic because package ID/export time and ZIP metadata may vary; individual payload checksums remain deterministic for their serialized content.

## 17. Schema Migration

`schema-migrations.js` owns explicit stepwise migration.

Rules:

- v1 is the first portable schema.
- Future migration is strictly `vN → vN+1`.
- A package older than current schema is validated for its source schema, migrated stepwise in staging, then validated against current schema.
- A package newer than the current runtime is rejected before commit with a clear update-required message.
- Migration never mutates the original file bytes.
- Migration actions are recorded in Import Report.

`packageVersion` describes archive/container conventions. `schemaVersion` describes portable data shape.

## 18. Import as Copy

If the imported `projectId` already exists, default action is Import as Copy.

Copy process:

1. generate new `projectId`;
2. generate a new runtime ID for every artifact;
3. build a complete old→new ID map;
4. rewrite `projectId`, `rootArtifactId`, `parentArtifactId`, lineage nodes/roots, comparison A/B IDs, comparison IDs, memory head references, and any other artifact relationships;
5. preserve provenance:
   - project `sourceProjectId = existing sourceProjectId || imported project id`;
   - artifact `sourceArtifactId = existing sourceArtifactId || imported artifact id`;
   - project `importedFromPackageId = manifest.packageId`;
6. validate the remapped graph again before commit.

Sibling branches and comparison relationships must remain structurally identical after remap.

## 19. Replace Existing

Replace Existing is destructive only at the final commit boundary.

Required flow:

`Decode → Validate → Checksum → Migrate → Reference Validate → Recompute → Stage Complete Replacement → Atomic Commit`

The old project must remain unchanged until the replacement is fully staged.

Director Memory persistence gains an atomic bundle commit primitive using one IndexedDB readwrite transaction across project, artifacts, and comparisons. Replace mode deletes old rows and writes the full replacement inside that same transaction.

If the transaction aborts, IndexedDB rollback semantics preserve the previous project.

The Project Library changes `activeProjectId` only after successful commit.

## 20. Project Library

M5 adds a lightweight project switcher integrated into the existing Director runtime.

Actions:

- New Project
- Open
- Rename
- Export `.vdos`
- Import `.vdos`
- Delete with confirmation

It is not a separate workspace homepage in v1.

### 20.1 Persistence extensions

`director-memory.js` adds:

- `listProjects()`
- `getProject(id)`
- project update/rename through `putProject()`
- atomic project bundle import/replace primitive

Existing `clearProject(projectId)` remains usable for explicit deletion.

### 20.2 `activeProjectId`

`activeProjectId` is a small browser preference and is not portable project truth.

Store it separately from project records (local runtime preference is acceptable).

Boot order:

1. read `activeProjectId`;
2. if that project exists, restore it;
3. if missing/deleted, fall back to most recently updated project;
4. if no project exists, create Untitled Project;
5. write the resolved active ID.

Opening/importing a project explicitly changes `activeProjectId`. Merely updating another project's metadata does not.

## 21. M4 Controller Integration

M4 remains the active generation/evaluation/comparison/memory orchestrator.

M5 must not make M4 understand ZIP files.

Project switch behavior:

- Project Library selects a project ID.
- M4 controller receives an explicit project-open/restore action.
- Existing object URLs are revoked.
- artifacts/comparisons for the selected project are loaded.
- default A/B selection is recalculated using the same M4 rule.
- memory is recomputed for the selected path.

Persistent-memory restore remains non-blocking to M3 DIRECT/GENERATE/EVALUATE readiness.

## 22. Generation Reference Capture

Current generation UI maintains rich in-memory reference records with `id`, `name`, `source`, `role`, and `preserve`, while the Agnes request only retains source strings in `extra_body.image`.

M5 must attach a sanitized snapshot of those rich reference records to each newly created generation artifact before `vdos:generation-complete` is dispatched.

This change is evidence preservation, not a generation behavior change.

Historical branch iterations inherit the references required by their selected artifact/base request when reproducible assets are available. If historical reference assets are missing, re-direction must show an explicit reproducibility warning instead of silently pretending the reference context is complete.

## 23. Export Flow

Whole-project export:

1. resolve current project;
2. load all project artifacts and comparisons;
3. derive current memory snapshot;
4. sanitize all portable structures through allowlists;
5. resolve generated image assets;
6. extract/deduplicate reference assets;
7. build lineage and validate references;
8. calculate package completeness;
9. present Export Preflight;
10. if approved, serialize canonical JSON;
11. calculate SHA-256 and construct manifest;
12. ZIP with vendored fflate;
13. trigger local download as `<safe-project-title>.vdos`.

Export never mutates the project.

## 24. Import Flow

Import pipeline:

1. accept `.vdos` file;
2. unpack into staging memory;
3. parse/validate manifest header;
4. reject unsupported forward package/schema version;
5. validate indexed file presence and SHA-256;
6. parse current/source schema core files;
7. run schema migrations if required;
8. validate lineage/comparison/reference integrity;
9. classify asset failures as recoverable or blocking;
10. recompute comparison/memory derived state with current engine;
11. generate Import Report;
12. detect project ID conflict;
13. default to Import as Copy or allow Replace Existing;
14. perform ID remap if copying;
15. validate final staged model again;
16. atomic commit to IndexedDB;
17. set `activeProjectId` after commit;
18. open imported project in M4.

No persistent data changes occur before step 16.

## 25. Import / Export Reports

Reports are first-class user feedback, not console-only diagnostics.

Export Report includes:

- artifact count
- generated image count
- reference asset count
- package completeness
- missing/degraded assets
- legacy reference metadata gaps
- approximate output size when known

Import Report includes:

- detected package/schema/runtime fingerprint
- checksum results
- migrations applied
- incomplete assets
- lineage/reference validation result
- memory reconciliation (`verified` or `migrated`)
- ID remap summary for Import as Copy
- final project identity

Reports must not display secrets removed by the sanitizer.

## 26. Failure / Degradation Rules

M5 failure handling follows M4's no-silent-data-loss principle.

- ZIP decode failure → no commit.
- malformed manifest/core JSON → no commit.
- core checksum mismatch → no commit.
- forward schema → no commit.
- lineage cycle/broken core reference → no commit.
- generated image/reference asset checksum mismatch → partial staged artifact; continue only when structural metadata remains valid.
- insufficient IndexedDB quota / transaction failure → no imported project committed; existing project untouched.
- Project Library failure must not disable M3 generation/evaluation for the already-open in-memory project.
- Export failure never mutates source data.

## 27. Storage / Size Behavior

M5 v1 does not impose an arbitrary project generation cap.

Before import commit, when `navigator.storage.estimate()` is available:

- compare package/staged asset size against available quota;
- warn when capacity appears insufficient;
- do not claim capacity guarantees because browser quota may change during commit.

No automatic history deletion is introduced.

## 28. Planned Runtime Modules

New modules:

```text
visual-direction-os/runtime/vdos-codec.js
visual-direction-os/runtime/project-package.js
visual-direction-os/runtime/schema-migrations.js
visual-direction-os/runtime/project-library.js
visual-direction-os/runtime/project-package-ui.js
visual-direction-os/runtime/project-package.css
visual-direction-os/vendor/fflate.min.js
```

Expected focused modifications:

```text
visual-direction-os/runtime/director-memory.js
visual-direction-os/runtime/m4-controller.js
visual-direction-os/runtime/generation-ui-m3.js
visual-direction-os/app.js
.github/workflows/m3-runtime-tests.yml
```

New tests should remain focused modules rather than expanding existing files unnecessarily.

## 29. Test Strategy

Implementation uses TDD/regression-first development.

### 29.1 Codec tests

Verify:

- ZIP encode/decode round trip;
- binary Blob bytes preserved;
- MIME/path mapping;
- deterministic JSON serialization;
- SHA-256 success/failure;
- malformed ZIP rejection;
- core vs asset integrity classification.

### 29.2 Package model tests

Verify:

- runtime artifact → portable artifact allowlist;
- credentials/headers/session values never appear in serialized output;
- unknown request fields are stripped;
- lineage construction and validation;
- reference extraction/deduplication;
- partial package preflight;
- old M4 reference fallback without invented role/preserve values;
- memory/comparison snapshot authority rules.

### 29.3 Migration tests

Verify:

- v1 current schema no-op;
- synthetic older fixture migrates stepwise when future migration fixtures exist;
- forward schema rejected;
- migration report records applied steps;
- original package bytes/model are not mutated.

### 29.4 Project Library tests

Verify:

- list/open/new/rename/delete;
- explicit active project restored after reload;
- deleted active project falls back correctly;
- project timestamps do not implicitly change active project.

### 29.5 ID remap tests

Verify Import as Copy rewrites:

- project ID
- artifact IDs
- root/parent IDs
- lineage roots/nodes
- comparison A/B IDs and comparison IDs
- memory head references
- source provenance

Sibling branch topology must remain identical.

### 29.6 Atomic import tests

Verify:

- copy commit is all-or-nothing;
- replace commit is all-or-nothing;
- forced IndexedDB write failure preserves old project;
- `activeProjectId` changes only after successful commit.

### 29.7 Browser acceptance

Real headless browser acceptance must demonstrate:

1. create/generate an M4 project with at least three artifacts and a branch;
2. include at least one local reference image;
3. export a complete `.vdos`;
4. clear or switch away from project;
5. import package and restore images, lineage, A/B metadata, judgments, comparison, and recomputed memory;
6. Import as Copy while original exists and prove all IDs are distinct while topology/evidence stays equivalent;
7. hard refresh and prove the imported active project restores;
8. import a package with one deliberately corrupted asset and prove partial recoverable behavior;
9. corrupt a core file/checksum and prove import is blocked;
10. force Replace Existing commit failure and prove old project remains intact;
11. prove secret-shaped runtime values are absent from archive bytes;
12. prove reference image bytes survive export/import without re-encoding.

Existing M3/M4 browser acceptance must stay green.

## 30. CI Strategy

The runtime workflow currently protects `master`. M5 development also requires branch/PR validation before integration.

Update workflow triggers so M5 runtime tests execute on the M5 branch and/or pull requests targeting master while retaining master push verification.

New suites:

```text
vdos-codec-tests.js
project-package-tests.js
schema-migrations-tests.js
project-library-tests.js
project-package-browser-acceptance-tests.js
```

All existing M3/M4 suites remain required.

## 31. Acceptance Criteria

M5 v1 is complete only when all are demonstrated:

1. Whole current project exports as a ZIP-compatible `.vdos`.
2. Package contains manifest, project, lineage, artifacts, comparisons, memory, generated images, and available reference assets.
3. Original generated image bytes/MIME survive round trip unchanged.
4. Reference image bytes survive round trip unchanged and repeated references are deduplicated in the archive.
5. Export sanitizer excludes runtime credentials/session/headers and unknown request fields.
6. Export Preflight distinguishes complete vs partial package and requires explicit user action to export partial.
7. Core checksum failure blocks import.
8. Individual asset failure produces explicit recoverable partial import.
9. Unsupported forward schema is rejected.
10. Older supported schema migrates in staging before commit.
11. Existing project conflict defaults to Import as Copy.
12. Import as Copy remaps all runtime IDs while preserving source identity and exact lineage topology.
13. Replace Existing does not touch the old project until final atomic commit.
14. Forced replacement commit failure leaves old project intact.
15. Comparison and Memory snapshots are retained for audit but current runtime recomputes derived state.
16. Project Library can New/Open/Rename/Export/Import/Delete projects.
17. `activeProjectId` restores the explicitly opened project after hard refresh.
18. Project switching does not break M3 generation/evaluation readiness.
19. Existing M3/M4 test suites and browser acceptance remain green.
20. M5 project package browser acceptance passes in CI from repository files.

## 32. Explicit Non-Goals

- cloud database or object storage;
- accounts/authentication;
- cross-device automatic sync;
- multi-user collaboration;
- branch/subtree-only export;
- project merge/import-into-current-branch;
- arbitrary archive editor;
- encryption/password-protected `.vdos` v1;
- executable historical runtime bundled inside projects;
- automatic semantic judgments;
- automatic deletion/retention caps.

## 33. Future Compatibility

M5 establishes the reusable boundary for M6:

```text
Portable Project Model
├─ .vdos Codec / Local Archive
└─ Future Cloud Sync Transport
```

Cloud synchronization should operate on the portable/domain model and asset identities rather than scraping UI state or mirroring IndexedDB implementation details.
