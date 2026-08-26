# M5 Design — Project Package & Reproducible Direction

Date: 2026-08-25
Branch: `m5-project-package-reproducibility`
Status: Draft for final review before implementation planning

## 1. Purpose

M4 established persistent local lineage, A/B comparison, delta effectiveness, branching, and Director Memory. M5 makes that project state portable and reproducible across browser instances without introducing accounts or cloud synchronization.

Target flow:

`LOCAL PROJECT → EXPORT .vdos → MOVE / ARCHIVE → IMPORT → VALIDATE → MIGRATE → RESTORE → CONTINUE DIRECTING`

M5 defines the first stable portable project protocol for Visual Direction OS. The same portable/domain model is intended to become the data contract for a future M6 cloud workspace.

## 2. Scope

M5 v1 adds:

1. **Project Package Protocol** — ZIP-compatible `.vdos`, explicit schema, checksums, runtime fingerprint.
2. **Whole-Project Export / Import** — one file represents one complete director project.
3. **Project Library** — New / Open / Rename / Export / Import / Delete.
4. **Integrity / Migration Pipeline** — SHA-256 validation, staged import, schema migration infrastructure, partial-asset recovery.
5. **Reproducibility Provenance** — preserve generated images, reference assets, prompts, Visual IR, measurements, judgments, deltas, lineage, and historical derived snapshots without restoring credentials.

Non-goals for v1: branch/subtree-only export, project merge, cloud sync, accounts, collaboration, archive editing, password encryption, executable historical runtimes.

## 3. Approved Product Decisions

- Existing `projectId` conflict → offer **Import as Copy** / **Replace Existing**; default Copy.
- Copy → new runtime project/artifact IDs; rewrite all internal references; preserve source identity.
- Export incomplete project → show Export Preflight; default cancel; explicit `Export Incomplete Package` is allowed.
- `.vdos` is a standard ZIP-compatible archive.
- Integrity is graded: core failure blocks import; individual non-structural asset failure becomes partial/recoverable.
- Explicit `packageVersion` + `schemaVersion`; forward schemas are rejected.
- `memory.json` is an audit snapshot; current evidence is authoritative and memory is recomputed after import.
- Import uses staging then commit; Replace never deletes old project before a fully validated replacement is ready.
- v1 exports whole current project only.
- Vendor a fixed `fflate` browser build in-repo; no CDN and no frontend npm build requirement.
- Generated image bytes/MIME are preserved exactly; no re-encoding.
- Export is allowlist-based; secrets, headers, session state, object URLs, signed/transient URLs, and unknown request fields are not portable.
- Runtime fingerprint is stored; executable historical code is not.
- Project Library is a lightweight switcher, not a new workspace homepage.
- Explicit `activeProjectId` controls reload behavior; `updatedAt` does not implicitly switch projects.

## 4. Architecture

```text
Project Package UI
  ├─ Project Library / Switcher
  ├─ Export Preflight
  ├─ Import Conflict Choice
  └─ Import / Export Report
          │
          ▼
project-library.js
  ├─ list/open/new/rename/delete
  └─ activeProjectId
          │
          ▼
project-package.js
  ├─ Portable Project Model
  ├─ allowlist sanitizer
  ├─ export preflight
  ├─ import staging
  ├─ ID remap
  ├─ reference asset handling
  └─ derived-state reconciliation
      │                  │
      ▼                  ▼
vdos-codec.js        schema-migrations.js
  ├─ fflate              └─ registered vN → vN+1 migrations
  ├─ ZIP / UNZIP
  ├─ SHA-256
  ├─ stable JSON
  └─ binary assets
          │
          ▼
director-memory.js
  ├─ IndexedDB projects
  ├─ artifacts
  ├─ comparisons
  ├─ list/get project support
  └─ atomic bundle commit
```

### 4.1 Boundary rule

`.vdos` Portable Project Model is **not** the IndexedDB record format. UI does not parse ZIPs; M4 does not understand ZIPs; codec does not decide memory/comparison policy.

## 5. `.vdos v1` Structure

```text
My-Project.vdos
├── manifest.json
├── project.json
├── lineage.json
├── comparisons.json
├── memory.json
├── artifacts/
│   ├── gen-001.json
│   └── ...
├── images/
│   ├── gen-001.png
│   └── ...
└── references/
    ├── <sha256>.png
    └── ...
```

Generated images are artifact-addressed. Reference assets are content-addressed by SHA-256 so repeated use of identical reference bytes is stored once.

## 6. Manifest and Integrity

Required manifest shape:

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
  "project": { "id": "project-...", "title": "..." },
  "packageCompleteness": "complete",
  "missingAssets": [],
  "files": []
}
```

Every payload file except `manifest.json` is indexed with `path`, `role` (`core` or `asset`), byte `size`, and `sha256`.

Integrity rules:

- malformed/missing required core JSON, required artifact metadata, core checksum mismatch, invalid lineage graph, or broken core relationship → block import;
- individual generated image or reference asset failure → retain structurally valid metadata, mark affected item partial, continue recoverably;
- no silent repair.

`packageCompleteness` is the **export-time declaration** (`complete` or `partial`). Import may additionally produce `importRecoveryStatus` based on corruption discovered during validation; import-time corruption does not retroactively change what the exporting runtime declared.

## 7. Portable Project Identity

`project.json`:

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

- `packageId` = one export event;
- `projectId` = project identity at export;
- `sourceProjectId` = earliest known source identity for a copied project;
- `importedFromPackageId` = most recent package import provenance.

For copy-of-copy, preserve earliest known source identity rather than replacing it with intermediate runtime IDs.

## 8. Portable Artifact

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
  "sourceIdentity": { "sourceArtifactId": null },
  "generation": {
    "provider": "agnes-image-2.1-flash",
    "request": {},
    "baseRequest": {},
    "resultMetadata": { "kind": "base64", "revisedPrompt": null },
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

Portable artifact never directly contains runtime Blob objects, data/result object URLs, temporary remote result URLs, persistence errors, or UI selection state.

## 9. Portable Request Allowlist

Agnes v1 allowed request fields:

- `model`
- `prompt`
- `size`
- `ratio`
- `return_base64`
- `extra_body.response_format`

`extra_body.image` is deliberately removed from portable request JSON and represented by explicit reference assets/usages.

Unknown request fields are excluded until a future schema explicitly adds them.

Never portable: authorization/proxy tokens, cookies, HTTP headers, Worker secrets, local/session storage, object URLs, temporary signed URLs, stack traces.

Import never restores credentials. Continued generation uses the destination browser's own current proxy/session configuration.

## 10. Reference Asset Provenance

Reference images are source evidence.

### 10.1 Capture at generation time

Current Generation UI keeps rich reference records (`id`, `name`, `source`, `role`, `preserve`) before `buildAgnesRequest()` reduces them to `extra_body.image`. M5 must attach a cloned reference-usage snapshot to the generated Artifact before `vdos:generation-complete`.

This is evidence capture, not a change to Agnes generation behavior.

### 10.2 Package form

Artifact reference usage:

```json
{
  "assetId": "sha256:<digest>",
  "path": "references/<digest>.png",
  "name": "character.png",
  "mimeType": "image/png",
  "role": "character",
  "preserve": ["identity", "silhouette"],
  "status": "available"
}
```

Identical bytes are deduplicated by SHA-256; role/preserve remain per usage.

### 10.3 Legacy M4 artifacts

If an older artifact has only `request.extra_body.image`:

- extract bytes when possible;
- never invent missing role/preserve metadata;
- keep compiled prompt as historical evidence;
- report `legacy_reference_metadata_incomplete`;
- if bytes cannot be captured, export may continue only as explicit partial package.

### 10.4 Remote references

If HTTP(S): attempt CORS fetch. If successful, package bytes normally. If unavailable, mark `remote_unavailable`, package partial, and do **not** retain query/fragment/path tokens. At most retain a non-secret origin hint (`scheme://host`) for provenance.

### 10.5 Runtime rehydration after import

Portable request stays free of `extra_body.image`. During import, available packaged reference assets are converted to runtime-safe data URIs and rehydrated into the imported Artifact's runtime `request` / `baseRequest.extra_body.image` in the original usage order. Rich `artifact.references` metadata is also restored.

If any required reference asset is unavailable, the runtime Artifact remains viewable/auditable but historical re-direction must show a reproducibility warning and must not silently claim the original reference context is complete.

## 11. Lineage

`lineage.json` explicitly stores roots/nodes. Artifact parent/root IDs duplicate topology intentionally for integrity checking.

Importer verifies:

- one lineage node per artifact;
- parents resolve inside project;
- no cycles;
- roots equal null-parent artifacts;
- artifact parent/root metadata agrees with topology.

Mismatch is a core failure.

## 12. Comparisons and Memory

`comparisons.json` preserves:

- artifact A/B references;
- Director judgments as source evidence;
- comparison output as historical derived snapshot.

`memory.json` preserves:

- policy version;
- computed time;
- path head;
- LOCKED / ACTIVE / WATCH snapshot.

After import:

`Artifacts + Evaluation + Director Judgments + Comparisons + Lineage → current Comparison/Memory policy`

Results:

- snapshot matches → `MEMORY VERIFIED`;
- differs due to current policy/migration → `MEMORY MIGRATED`.

Current recomputed state drives runtime. Imported historical snapshot and reconciliation summary are retained in project `importAudit` metadata for provenance and later re-export audit.

## 13. Source-of-Truth Hierarchy

1. **Source Evidence** — generated/reference images, Visual IR, portable generation request, measurements, human judgments, deltas.
2. **Structure** — project identity, lineage, artifact relationships.
3. **Derived Snapshots** — comparison and memory snapshots.
4. **Runtime State** — object URLs, current UI selection, transient errors, tokens, session configuration.

Levels 1–2 are portable truth; Level 3 is audit/recomputable; Level 4 never enters `.vdos`.

## 14. Export Completeness / Preflight

Export-time states: `complete` / `partial`.

Partial reasons include:

- generated image `meta_only`;
- generated artifact `not_persisted` in current session;
- unavailable reference asset;
- legacy reference semantic metadata incomplete.

Export Preflight lists degraded items and defaults to cancel; explicit `Export Incomplete Package` is required to proceed.

### 14.1 Active in-memory artifact merge

Whole-project export is for the **current project**, so exporter must not rely only on IndexedDB rows. It receives the current M4 controller snapshot and merges it with persistent rows:

- in-memory artifact metadata takes precedence for the same ID;
- persisted Blob is used when present;
- `not_persisted` artifacts that exist only in current M4 state are included as metadata and make the package partial;
- exporter never mutates M4 state.

This preserves M4's explicit degradation semantics instead of silently omitting failed writes.

## 15. Codec / ZIP Safety

Vendor fixed `fflate` build and upstream license notice in the repository. No CDN and no new frontend build pipeline.

Use Web Crypto SHA-256. Stable JSON serializer recursively sorts object keys while preserving array order; checksums are over exact archived UTF-8/binary bytes.

Codec must treat local `.vdos` as untrusted input:

- reject absolute paths, `..` traversal, backslash traversal aliases, NUL/control-name abuse, and duplicate normalized entry names;
- accept only known root files and allowed `artifacts/`, `images/`, `references/` prefixes;
- inspect archive entry metadata before decompression when supported by the codec;
- enforce code-defined/tested entry-count and inflated-size safety guardrails to mitigate ZIP bombs;
- when browser storage estimate is known, block final commit if staged data is clearly larger than available quota;
- resource guardrails are runtime safety policy, not `.vdos` schema semantics.

Compression/decompression failures are package errors, not persistence errors.

## 16. Schema Migration

`schema-migrations.js` owns a registry of explicit `vN → vN+1` transforms.

Production v1 is the **first portable schema**, so there is no real older production `.vdos` schema to accept in M5 v1. Requirements now are:

- current v1 → validated no-op;
- forward schema (`>1`) → reject with update-required message;
- migration engine/registry is implemented from day one and unit-tested with synthetic fixtures/registries so future v1→v2 can be added without changing importer architecture;
- when future production migrations exist, run them stepwise in staging and record steps in Import Report;
- never mutate original archive bytes.

`packageVersion` describes container conventions; `schemaVersion` describes portable data shape.

## 17. Import as Copy

When conflict exists, Copy is default.

Process:

1. new project ID;
2. new runtime ID for every artifact;
3. full old→new map;
4. rewrite project/root/parent IDs, lineage roots/nodes, comparison A/B IDs + comparison IDs, memory head references, and all artifact relationships;
5. project `sourceProjectId = existing sourceProjectId || imported projectId`;
6. artifact `sourceArtifactId = existing sourceArtifactId || imported artifactId`;
7. project `importedFromPackageId = manifest.packageId`;
8. validate remapped graph again before commit.

Branch topology and evidence must remain equivalent after remap.

## 18. Replace Existing / Atomic Commit

Required flow:

`Decode → Checksum → Parse → Validate → Migrate → Reference Validate → Recompute → Stage Complete Replacement → Atomic Commit`

`director-memory.js` gains an atomic bundle primitive using one IndexedDB readwrite transaction across `projects`, `artifacts`, and `comparisons`.

Replace mode deletes old project rows and writes replacement rows inside the same transaction. Transaction abort must preserve the old project by IndexedDB rollback semantics.

`activeProjectId` changes only after commit success.

## 19. Project Library

Lightweight existing-runtime switcher with:

- New Project
- Open
- Rename
- Export `.vdos`
- Import `.vdos`
- Delete with confirmation

`director-memory.js` adds `listProjects()`, `getProject(id)`, project update via `putProject()`, and atomic bundle commit. `clearProject()` remains explicit deletion.

### 19.1 activeProjectId

`activeProjectId` is runtime preference, not portable truth, and may live in local browser preference storage.

Boot:

1. read active ID;
2. restore it if it exists;
3. otherwise latest updated project;
4. if no project, create Untitled Project;
5. persist resolved active ID.

Opening/importing explicitly changes active ID. Updating another project's timestamp does not.

Deleting active project falls back using the same rule; if none remain, create Untitled Project.

## 20. M4 Integration

M4 remains generation/evaluation/comparison/memory orchestrator and never parses `.vdos`.

Opening a project:

- revoke prior object URLs;
- load selected project's artifacts/comparisons;
- restore default A/B selection using existing M4 rule;
- recompute path-specific memory;
- emit normal M4 state.

Persistent restore remains non-blocking to M3 DIRECT / GENERATE / EVALUATE readiness.

## 21. Export Flow

1. resolve current project;
2. merge current M4 in-memory snapshot with persistent records;
3. derive current comparison/memory snapshot;
4. sanitize portable structures through allowlists;
5. resolve generated image assets;
6. extract/deduplicate reference assets;
7. build/validate lineage and relationships;
8. compute export completeness;
9. show Export Preflight;
10. on approval, serialize stable JSON;
11. calculate SHA-256 and build manifest;
12. ZIP with vendored fflate;
13. download `<safe-project-title>.vdos`.

Export never mutates project state.

## 22. Import Flow

1. accept `.vdos`;
2. inspect/decode into staging;
3. validate safe paths/entry guardrails;
4. parse manifest header;
5. reject unsupported package/schema version;
6. validate file index + SHA-256;
7. parse source/current schema core files;
8. run registered migrations if required;
9. validate lineage/comparison/reference integrity;
10. classify asset failures as blocking or recoverable;
11. rehydrate available reference assets for runtime request/baseRequest;
12. recompute derived comparison/memory state;
13. generate Import Report;
14. detect project conflict;
15. default Copy or allow Replace;
16. remap IDs if Copy;
17. validate final staged model again;
18. atomic IndexedDB commit;
19. set active ID only after commit;
20. open project in M4.

No persistent data changes occur before step 18.

## 23. Reports

Export Report: artifact/image/reference counts, package completeness, missing/degraded assets, legacy reference metadata gaps, approximate output size when available.

Import Report: package/schema/runtime fingerprint, checksum results, migrations, safety/recovery warnings, lineage/reference validation, memory reconciliation, copy ID-remap summary, final project identity.

Reports never display stripped secrets.

## 24. Failure Rules

- ZIP decode / unsafe path / bomb guardrail / malformed manifest → no commit.
- missing/malformed core JSON or core checksum mismatch → no commit.
- forward schema → no commit.
- lineage cycle/broken core relationship → no commit.
- individual generated/reference asset failure → recoverable partial staging when metadata remains structurally valid.
- missing imported generated image → runtime artifact persists as metadata-only.
- missing reference asset → historical result remains auditable; exact re-direction warns and cannot claim full reproducibility.
- IndexedDB quota/transaction failure → no import commit; existing data unchanged.
- Export failure never mutates source project.
- Project Library/package failure must not disable M3 execution for an already-open in-memory project.

## 25. Runtime Fingerprint

Add an explicit runtime fingerprint source (`runtime-fingerprint.js` or equivalent single authoritative module) containing app/package-relevant engine version constants. Package exporter reads this source rather than inferring versions from UI labels.

At minimum: app, Visual IR, prompt compiler, evaluation engine, comparison engine, memory policy.

## 26. Planned Modules

New:

```text
visual-direction-os/runtime/runtime-fingerprint.js
visual-direction-os/runtime/vdos-codec.js
visual-direction-os/runtime/project-package.js
visual-direction-os/runtime/schema-migrations.js
visual-direction-os/runtime/project-library.js
visual-direction-os/runtime/project-package-ui.js
visual-direction-os/runtime/project-package.css
visual-direction-os/vendor/fflate.min.js
visual-direction-os/vendor/FFLATE-LICENSE.txt
```

Focused modifications:

```text
visual-direction-os/runtime/director-memory.js
visual-direction-os/runtime/m4-controller.js
visual-direction-os/runtime/generation-ui-m3.js
visual-direction-os/app.js
.github/workflows/m3-runtime-tests.yml
```

## 27. Testing Strategy

TDD/regression-first.

### Codec

- ZIP round trip;
- generated/reference binary bytes preserved;
- stable JSON;
- checksum pass/fail;
- malformed ZIP;
- path traversal/duplicate names;
- inflated-size/entry guardrails;
- core vs asset failure classification.

### Package model

- runtime→portable allowlist;
- secret-shaped/unknown fields absent from archive bytes;
- lineage validation;
- reference extraction/dedup;
- remote unavailable degradation;
- legacy reference metadata gap without invented values;
- active in-memory `not_persisted` artifact included as partial;
- memory/comparison snapshot authority rules.

### Migration

- v1 current no-op;
- forward schema reject;
- migration registry tested with synthetic sequential fixtures without claiming a pre-v1 production format;
- migration report and immutability.

### Project Library

- list/open/new/rename/delete;
- explicit active restore;
- deleted-active fallback;
- timestamps do not switch active project.

### Copy remap

- project/artifact/root/parent IDs;
- lineage roots/nodes;
- comparison A/B + IDs;
- memory head references;
- source provenance;
- sibling topology unchanged.

### Atomic import

- copy/replace all-or-nothing;
- forced failure preserves old project;
- active ID updates only after success.

### Browser acceptance

1. create/generate at least three artifacts plus a branch;
2. use at least one local reference image;
3. export complete `.vdos`;
4. switch/clear and import;
5. restore images, lineage, judgments, A/B metadata, comparison and recomputed memory;
6. Import as Copy while original exists; prove IDs differ but topology/evidence match;
7. hard refresh; active imported project restores;
8. corrupt one asset; prove partial recoverable import;
9. corrupt core checksum; prove block;
10. force Replace commit failure; old project intact;
11. prove secret-shaped runtime values absent from archive bytes;
12. prove generated/reference bytes survive without re-encoding;
13. prove imported references rehydrate into runtime request ordering;
14. existing M3/M4 browser acceptance stays green.

## 28. CI

M5 development requires branch/PR validation in addition to master push verification. Runtime workflow should protect the M5 branch and/or PRs targeting master while retaining master verification.

New suites:

```text
vdos-codec-tests.js
project-package-tests.js
schema-migrations-tests.js
project-library-tests.js
project-package-browser-acceptance-tests.js
```

All existing M3/M4 suites remain required.

## 29. Acceptance Criteria

M5 v1 is complete only when:

1. whole current project exports to ZIP-compatible `.vdos`;
2. package includes manifest/project/lineage/artifacts/comparisons/memory/generated images/available references;
3. generated image bytes + MIME survive round trip unchanged;
4. reference bytes survive unchanged and duplicate bytes are stored once;
5. sanitizer excludes credentials/session/headers/transient URLs/unknown request fields;
6. Export Preflight distinguishes complete vs partial and partial requires explicit action;
7. core checksum/structure failure blocks import;
8. individual asset failure gives explicit recoverable partial import;
9. forward schema is rejected;
10. migration pipeline/registry exists and is tested for future stepwise migrations without inventing a pre-v1 production package;
11. existing-ID conflict defaults to Copy;
12. Copy remaps all runtime IDs and preserves origin identity/topology;
13. Replace only touches old project inside final atomic transaction;
14. forced Replace failure leaves old project intact;
15. comparison/memory snapshots remain audit data while current runtime recomputes derived state;
16. Project Library New/Open/Rename/Export/Import/Delete works;
17. active project restores after hard refresh;
18. `not_persisted` current-session artifacts are not silently omitted from export;
19. reference assets rehydrate historical runtime request context when available;
20. M3/M4 readiness, suites, and browser acceptance remain green;
21. M5 browser acceptance passes in CI.

## 30. Future Compatibility

```text
Portable Project Model
├─ .vdos Codec / Local Archive
└─ Future Cloud Sync Transport
```

Future cloud synchronization should operate on the portable/domain model and content identities, not scrape UI state or mirror IndexedDB implementation details.
