# M6 Design — Sequence Director & Multi-Shot Continuity

Date: 2026-08-28
Branch: `m6-sequence-director`
Status: Draft for final review before implementation planning

## 1. Purpose

M3 established generation, M4 established persistent single-shot iteration/branch memory, and M5 established project persistence plus reproducible `.vdos` packaging. M6 adds the first true multi-shot directing layer.

Target hierarchy:

`PROJECT → SEQUENCE → SHOT → M4 GENERATION LINEAGE`

Target workflow:

`CREATE SEQUENCE → DEFINE SEQUENCE INTENT → CREATE SHOTS → DEFINE SHOT INTENT → GENERATE / ITERATE → APPROVE FRAME → NEXT SHOT RECEIVES CONTINUITY → REVIEW DOWNSTREAM IMPACT WHEN APPROVED SOURCES CHANGE`

M6 is not merely a storyboard list. It makes shot-to-shot continuity executable, reviewable, provenance-safe, and portable through the M5 package protocol.

## 2. Scope

M6 v1 adds:

1. **Sequence / Shot hierarchy** — multiple Sequences per Project, multiple Shots per Sequence.
2. **Active Shot scoping** — M4 becomes the lineage engine for the current Active Shot only.
3. **Approved Frame** — each Shot has zero or one director-approved artifact.
4. **Continuity Engine** — Auto / Manual shot-to-shot continuity within the same Sequence.
5. **Generation integration** — the source Shot's current Approved Frame is injected into Agnes as a dedicated continuity reference.
6. **Immutable continuity provenance** — each generated artifact freezes the source Shot and source Artifact actually used at generation time.
7. **Dependency invalidation** — upstream Approved changes propagate non-destructive Review Required state downstream.
8. **Sequence Board / Active Shot UX** — whole-sequence health view plus focused M4 workspace.
9. **M5 schema v2 integration** — Sequence / Shot structure, continuity facts, migration, Copy / Replace remap, atomic import/export.
10. **Legacy migration** — existing M3/M4/M5 projects migrate into deterministic `Sequence 01 / Shot 01` without changing historical lineage.

Non-goals for M6 v1: cross-Sequence continuity, Project Bible / Visual DNA, multiple Approved Frames per Shot, automated continuity scoring, screenplay import, duration/FPS/audio/video timeline, automatic camera planning, AI-selected Approved Frames, bulk Shot editing, cloud collaboration, or event-log history.

## 3. Approved Product Decisions

- Core hierarchy is **Project → Sequence → Shot → existing M4 lineage**.
- Each Shot has **at most one Approved Frame** via `approvedArtifactId`.
- Approved Frame must belong to that Shot, may be changed, may be cleared, and is never auto-selected from latest generation.
- Sequence and Shot each have one free-text `intent` field in M6 v1.
- Shot continuity defaults to the previous Shot in the same Sequence, but may be manually overridden to another earlier Shot in the same Sequence.
- Continuity cannot cross Sequence boundaries in M6.
- Continuity source is dynamic at Shot level; each generated Artifact freezes the source Artifact actually used.
- M4 generation lineage and M6 continuity are different graph edge types and must never be conflated.
- `parentArtifactId` and `rootArtifactId` must never cross Shot boundaries.
- Deleting a Shot does not delete dependent later Shots.
- Reorder semantics use `continuityMode = auto | manual`.
- Auto continuity follows the current previous Shot after reorder.
- Manual continuity preserves the explicit source after reorder and may become `source_out_of_order`.
- Missing continuity warns but does not block generation; user may Generate Anyway.
- Approved Frame is injected as a dedicated locked `continuity` reference, separate from ordinary references.
- Upstream Approved changes recursively mark dependent Shots for review but never delete, regenerate, re-approve, or rewrite content automatically.
- Review Required may be cleared either by generating/approving a new version or by explicit `Accept Current Continuity`.
- An Approved decision survives image-asset loss; asset availability and Approved identity are separate facts.
- M4 always manages the Active Shot only; Sequence/Shot switching belongs to M6.
- Existing projects migrate into a deterministic default Sequence and Shot with no automatically chosen Approved Frame.
- IndexedDB is upgraded in place; M6 does not create a separate database.
- `.vdos` package version remains 1; schema version becomes 2.
- Portable facts are persisted; current approval/continuity status is recomputed by the current runtime.

## 4. Architecture

```text
Sequence Director UI
  ├─ Sequence Board
  ├─ Sequence Navigator
  ├─ Active Shot Header / Intent
  ├─ Approved Frame controls
  ├─ Continuity controls / review
  └─ Active Shot Workspace
          │
          ▼
m6-controller.js
  ├─ Sequence CRUD / reorder
  ├─ Shot CRUD / reorder
  ├─ activeSequenceId / activeShotId
  ├─ Approved Frame
  ├─ continuity source resolution
  ├─ dependency invalidation
  ├─ continuity review
  └─ generation context
      │                  │
      ▼                  ▼
m4-controller.js      director-memory.js
  └─ Active Shot       ├─ projects
     lineage only      ├─ sequences
                       ├─ shots
                       ├─ artifacts
                       └─ comparisons
                              │
                              ▼
                       project-package.js
                       schema-migrations.js
                       vdos-codec.js
                              │
                              ▼
                        `.vdos` schema v2
```

Boundary rule:

- **M6 manages relationships between Shots.**
- **M4 manages generation lineage inside one Shot.**
- **M5 manages whole-project persistence / portability.**
- Agnes does not decide continuity policy; it consumes an already resolved generation context.

## 5. Domain Model

### 5.1 Project

Existing Project is extended with navigation state:

```js
Project {
  id,
  name,
  activeSequenceId,
  activeShotId,
  createdAt,
  updatedAt
}
```

`activeSequenceId / activeShotId` are recoverable UI-navigation state, not creative ground truth.

### 5.2 Sequence

```js
Sequence {
  id,
  projectId,
  order,
  title,
  intent,
  createdAt,
  updatedAt
}
```

`Sequence.intent` describes what the complete dramatic passage should accomplish. M6 v1 does not split it into camera, palette, mood, character, or timing fields.

### 5.3 Shot

```js
Shot {
  id,
  projectId,
  sequenceId,
  order,
  title,
  intent,
  approvedArtifactId,
  continuityMode,
  continuitySourceShotId,
  continuityReview,
  continuityInvalidation,
  createdAt,
  updatedAt
}
```

For `continuityMode = auto`, the previous Shot is derived from current order. `continuitySourceShotId` is primarily meaningful for manual mode; auto mode should not persist a stale previous-shot decision.

### 5.4 Artifact additions

Existing M4 Artifact is extended, not replaced:

```js
Artifact {
  id,
  projectId,
  sequenceId,
  shotId,
  rootArtifactId,
  parentArtifactId,
  continuityProvenance,
  ...existingM4Fields
}
```

```js
continuityProvenance = {
  sourceShotId,
  sourceArtifactId,
  status
}
```

Example resolved provenance:

```js
{
  sourceShotId: "shot-01",
  sourceArtifactId: "g5",
  status: "resolved"
}
```

Possible generation-time provenance statuses include `resolved`, `missing_at_generation`, `unavailable_at_generation`, and `not_applicable`.

## 6. Two Independent Graphs

### 6.1 M4 generation lineage

Solid edge:

`h1 → h2 → h3`

Represented by `parentArtifactId / rootArtifactId`. Every parent/root relationship must stay within the same Project, Sequence, and Shot.

### 6.2 M6 continuity dependency

Dashed conceptual edge:

`Shot 01 / g5 ─ ─ ─▶ Shot 02 / h1`

Represented by Shot-level continuity source plus Artifact-level frozen provenance.

The first Artifact of Shot 02 may reference Shot 01 Approved Frame, but must still have:

```js
h1.parentArtifactId = null;
h1.rootArtifactId = h1.id;
```

It must never use the continuity source artifact as an M4 parent.

## 7. Approved Frame

Each Shot has zero or one `approvedArtifactId`.

Rules:

- candidate artifact must belong to the same Shot;
- no automatic latest-generation fallback;
- user may change Approved Frame;
- user may clear Approved Frame;
- direct deletion of the current Approved Artifact is blocked until approval is cleared or reassigned;
- an Approved ID remains meaningful even when its image asset is missing;
- Approved identity and asset availability are separate concerns.

Board thumbnail fallback is independent from continuity: if there is no Approved Frame, the UI may show latest available generation as a thumbnail, but continuity must never use latest generation as a fallback.

## 8. Continuity Source Resolution

Central operation:

```js
resolveContinuitySource(shotId)
```

Returns a standard result:

```js
{
  status,
  sourceShotId,
  sourceArtifactId,
  sourceArtifact,
  reason
}
```

Resolution order:

1. identify current Shot and Sequence;
2. resolve Auto previous Shot or Manual explicit Shot;
3. reject cross-Sequence live source;
4. resolve source Shot's current `approvedArtifactId`;
5. verify approved Artifact identity;
6. verify usable image asset;
7. return resolved / missing / unavailable / out-of-order state.

### 8.1 Auto

`continuityMode = auto` means the current previous Shot by Sequence order. Reorder may therefore change the resolved source.

### 8.2 Manual

`continuityMode = manual` preserves the explicitly selected Shot. Reorder does not mutate it. If the source now appears after the current Shot, status becomes `source_out_of_order`; the user may keep it or `Reset to Previous Shot`, which returns to auto mode.

### 8.3 First Shot

The first Shot in a Sequence has continuity `not_applicable`, not a warning.

### 8.4 Missing vs unavailable

- `source_missing` = no valid source Shot / no Approved Frame / deleted live source.
- `source_unavailable` = Approved identity exists but required image bytes are not usable.

No silent fallback to latest or another Shot is allowed.

## 9. Derived Status Model

M6 separates completion from continuity health.

Runtime-derived approval status:

- `draft`
- `approved`

Runtime-derived continuity status:

- `current`
- `review_required`
- `source_missing`
- `source_unavailable`
- `source_out_of_order`
- `not_applicable`

These statuses are not portable source-of-truth fields. Portable facts are `approvedArtifactId`, `continuityMode`, `continuitySourceShotId`, `continuityReview`, and `continuityInvalidation`; current status is recomputed after boot/import.

## 10. Generation-Time Continuity Freeze

Continuity is resolved when the user actually triggers a generation, not when the Shot was merely opened.

Flow:

`Generate → resolveContinuitySource() → inject continuity reference → send Agnes request → create Artifact → atomically persist M4 lineage + M6 provenance`

Example:

- Shot 01 Approved = g3
- Shot 02 h1 generated from g3
- later Shot 01 Approved changes to g5

Then h1 permanently retains:

```js
{
  sourceShotId: "shot-01",
  sourceArtifactId: "g3"
}
```

The current Shot 02 continuity target may now resolve to g5. Historical Artifacts are never rewritten.

Every generation, including redirect/iteration inside the same Shot, resolves continuity again at click time. Therefore a Shot branch may legitimately contain h1 generated from g3 and h2 generated later from g5 while `h2.parentArtifactId = h1`.

## 11. Missing Continuity and Generate Anyway

Missing or unavailable continuity does not hard-block generation.

UI warns explicitly and offers `Generate Anyway`.

If generated without a usable source:

```js
continuityProvenance = {
  sourceShotId: "shot-01",
  sourceArtifactId: null,
  status: "missing_at_generation"
}
```

Asset-loss cases may use `unavailable_at_generation`.

The first Shot uses `not_applicable` without warning.

## 12. Approved-Change Invalidation

Changing an Approved Frame produces an ApprovedFrameChanged event-like operation containing old and new Artifact IDs.

Continuity risk is propagated through the current Shot dependency graph, not guessed solely from numeric order.

Example:

`A → B → D` and `A → C`

If A Approved changes:

- B → `review_required`
- C → `review_required`
- D → `review_required`

Invalidation only changes review state. It never deletes, regenerates, clears approval, changes prompts, changes sources, or rewrites Artifacts.

Current pending invalidation may be stored on the Shot; M6 v1 does not maintain an unbounded event log.

## 13. Continuity Review

Review Required can be resolved two ways:

1. generate/approve a new Artifact using the current source;
2. explicitly `Accept Current Continuity` for the existing Approved Frame.

Accepted review record:

```js
continuityReview = {
  status: "accepted",
  reviewedArtifactId,
  sourceArtifactId,
  reviewedAt,
  note
}
```

A review is valid only while `review.sourceArtifactId === resolveContinuitySource().sourceArtifactId`. If the source changes again, the previous review becomes stale and Review Required returns.

## 14. Deletion and Reorder Semantics

### 14.1 Delete Shot

Deleting Shot A removes A, A's own M4 Artifacts, and A's Comparisons. It does not delete downstream Shots.

- direct live dependents of A become `source_missing`;
- their descendants become `review_required` where appropriate;
- frozen historical provenance strings remain historical facts and are not silently redirected.

### 14.2 Clear Approval

Clearing a Shot's Approved Frame sets `approvedArtifactId = null`. Direct dependents become source-missing; downstream risk propagates non-destructively.

### 14.3 Reorder

Manual source relationships are preserved. Auto relationships are re-resolved against the new previous Shot. If an Auto source changes, the affected Shot becomes Review Required and invalidation may propagate.

Manual sources that move after the current Shot become `source_out_of_order` and are never auto-corrected.

## 15. Active Shot Boundary and M4 Changes

M4 becomes an Active Shot lineage controller.

When Shot 01 is active, M4 artifact list, A/B comparison, branch memory, redirect, delete-subtree, and Approved candidates only see Shot 01 Artifacts. Switching Shot loads only that Shot's lineage.

Director Memory query surface evolves from project-only artifact listing toward Shot-scoped access, e.g. `listArtifactsForShot(projectId, sequenceId, shotId)`.

M6 owns Sequence/Shot switching. M4 must not infer or mutate Sequence structure.

## 16. IndexedDB Upgrade

The current database is upgraded in place to contain:

```text
projects
sequences
shots
artifacts
comparisons
```

Required indexes include project/sequence/shot ownership and ordering, plus Shot-scoped Artifact access.

Whole-project bundle APIs should return:

```js
{
  project,
  sequences,
  shots,
  artifacts,
  comparisons
}
```

Project export must use the complete Director Memory Project Bundle. It must not use the Active Shot M4 state as the source of a `.vdos` export.

## 17. Sequence Board and Active Shot UX

M6 exposes two views over the same data:

- **Board View** — whole Sequence status / storyboard overview.
- **Director View** — Active Shot context plus existing M4 generation workspace.

Shot cards show at least Shot number/title, Approved thumbnail when available, approval status, continuity health, source summary, and short intent.

Primary user concepts remain deliberately small:

- **Shot Intent** — what this shot must accomplish.
- **Approved Frame** — which generated frame is accepted for this Shot.
- **Continuity Source** — which earlier Shot provides local visual continuity.

Sequence Intent remains visible as higher-level direction but should not overpower Shot Intent.

## 18. Approved / Continuity UX

Artifact action: `Set as Approved Frame`; approved artifact displays `★ Approved Frame`.

Changing Approved may preview affected downstream Shots but is not treated as destructive deletion.

Review Required view shows previous source, current source, current Approved Frame, and two primary actions:

- `Accept Current Continuity`
- `Generate New Version`

Continuity control shows Auto/Manual mode and source. Continuity reference is displayed separately from ordinary references and cannot be deleted through ordinary reference CRUD.

## 19. Agnes Generation Integration

M6 builds a generation context:

```js
{
  projectId,
  sequenceId,
  shotId,
  sequenceIntent,
  shotIntent,
  continuity: {
    status,
    sourceShotId,
    sourceArtifactId,
    reference
  }
}
```

The Agnes adapter gains a dedicated `continuity` reference role.

Semantic intent of the role: preserve stable shot-to-shot visual facts such as character identity, wardrobe, important props, environment state, palette ownership, and lighting continuity while allowing the current Shot Intent to intentionally change framing, camera, action, pose, and composition.

Prompt precedence:

1. current Shot Intent;
2. current Visual IR MUST constraints;
3. continuity stable facts;
4. supporting visual rules;
5. optional styling.

Continuity means “same world / stable facts,” not “copy the previous composition.”

## 20. Agnes Reference Ordering

The current Agnes request maps ordered reference inputs to ordered `extra_body.image[]` entries and corresponding prompt instructions. M6 therefore fixes the resolved continuity image as **Reference image 1**.

Runtime merge:

```js
references = [
  continuityReference,
  ...ordinaryReferences
]
```

Ordinary reference reorder/delete operations cannot move or remove continuity. Changing continuity must happen through M6 continuity controls.

The Approved Artifact image Blob is converted to a request-safe representation such as a data URI at request time. Browser `blob:` URLs are not sent as remote Agnes inputs.

Continuity identity remains `sourceShotId / sourceArtifactId`; request-time data URI is not the portable identity.

## 21. Reference Asset Storage Rule

An Approved continuity Artifact is already stored as a generated Artifact image. M6 should not duplicate the same image into `references/<hash>` for every downstream Shot merely because it was used for continuity.

Portable continuity is restored through:

`sourceArtifactId → artifact metadata → generated image asset`

Ordinary character/world/style/etc. references continue to use M5's content-addressed reference asset system.

## 22. `.vdos` Schema v2

Package container semantics stay compatible with M5:

- `VDOS_PACKAGE_VERSION = 1`
- `VDOS_SCHEMA_VERSION = 2`

Core structure:

```text
manifest.json
project.json
sequences.json
shots.json
lineage.json
comparisons.json
memory.json
artifacts/*.json
images/*
references/*
```

`sequences.json` and `shots.json` are `core` files. M6 v1 uses one core file per collection rather than one file per Sequence/Shot.

No separate `continuity-graph.json` is added because live continuity is reconstructible from Shots and historical provenance is reconstructible from Artifacts.

## 23. Schema v1 → v2 Migration

Legacy projects/packages are migrated to:

```text
Project
└─ Sequence 01
   └─ Shot 01
      └─ all existing M4 Artifacts / Comparisons
```

Migration rules:

- create deterministic default Sequence ID;
- create deterministic default Shot ID;
- attach every legacy Artifact to that Sequence/Shot;
- preserve Artifact IDs, parent/root relationships, image bytes, Project ID, and Comparison meaning;
- `approvedArtifactId = null`;
- set active Sequence/Shot to the generated defaults;
- never repeat migration on schema v2.

Migration-generated IDs must be deterministic from stable project identity plus a migration namespace, not random UUIDs. Copy import performs later destination-ID remapping.

## 24. Portable Validation

M6 core validation requires:

- every Sequence belongs to the current Project;
- every Shot belongs to a valid Sequence in the current Project;
- Approved Artifact, when present, belongs to the same Shot;
- every Artifact has consistent project/sequence/shot ownership;
- lineage parent/root exists and belongs to the same Shot;
- Comparisons remain Shot-local;
- live Manual continuity source, when present, belongs to the same Sequence;
- live continuity source Artifact relationships are internally consistent where the referenced entity exists.

Important distinction:

- dangling M4 parent/root = core corruption → block import;
- dangling historical continuity provenance after source deletion = valid historical provenance → do not block import.

## 25. Copy / Replace Import

### 25.1 Copy

Copy remap expands to the entire project graph:

- Project ID
- Sequence IDs
- Shot IDs
- Artifact IDs
- Comparison refs
- lineage refs
- Approved refs
- Manual continuity refs
- continuity provenance refs
- active Sequence/Shot refs

The remapper must account for dangling historical continuity IDs that are still referenced but no longer have live entities. Those identities should be consistently remapped without creating fake Shot/Artifact entities.

### 25.2 Replace

Replace remains whole-project atomic replacement. The transaction covers Projects, Sequences, Shots, Artifacts, and Comparisons. The old project must not be deleted before a fully validated replacement bundle is ready.

## 26. Integrity and Failure Handling

M5 integrity semantics continue:

- core integrity failure → block import;
- individual generated/reference asset failure → degraded/recoverable import.

Examples:

- corrupted `shots.json` → block import;
- missing Approved image bytes → preserve Approved ID/metadata, mark source unavailable for new continuity generation;
- do not auto-replace with latest generation;
- historical provenance remains inspectable.

Active Sequence/Shot is recoverable navigation state. If an imported active ID no longer exists, runtime may select the first valid Sequence/Shot and record an import repair note rather than failing the project.

## 27. Import Pipeline

M6 import order:

`Decode ZIP → verify manifest/SHA → package version check → schema migration → parse Project/Sequences/Shots → validate ownership/Approved/lineage/comparisons/continuity → recover assets → recompute current derived status → resolve Copy/Replace → full graph ID remap → validate again → atomic commit → restore/repair active context → import report`

Validation must run again after remap.

## 28. Runtime Fingerprint

Recommended M6 fingerprint:

```js
VDOS_PACKAGE_VERSION = 1;
VDOS_SCHEMA_VERSION = 2;

VDOS_RUNTIME_FINGERPRINT = {
  appVersion: "2.1-m6",
  visualIRVersion: "0.1.0",
  promptCompilerVersion: 1,
  evaluationEngineVersion: 1,
  comparisonEngineVersion: 1,
  memoryPolicyVersion: 1,
  sequenceDirectorVersion: 1,
  continuityEngineVersion: 1
};
```

Package version does not need to change because the ZIP protocol/archive semantics remain compatible; the portable data schema changes.

## 29. Acceptance Criteria

### Structure

- Project can contain multiple Sequences.
- Sequence can contain multiple Shots.
- Shot reorder persists correctly.
- Active Sequence/Shot survives reload.

### M4 isolation

- M4 only exposes Artifacts for the Active Shot.
- parent/root cannot cross Shot boundaries.
- Comparisons cannot cross Shot boundaries.

### Approved Frame

- each Shot has zero or one Approved Frame;
- only own-Shot Artifact can be approved;
- approval can be changed or cleared;
- latest Artifact is never silently auto-approved.

### Auto / Manual continuity

- new non-first Shot defaults to Auto previous-Shot continuity;
- Auto follows reorder;
- Manual preserves explicit source;
- Manual source moved after current Shot becomes out-of-order;
- Reset to Previous returns to Auto;
- cross-Sequence source is rejected.

### Generation

- resolved continuity is injected into Agnes;
- continuity is Reference #1;
- current Shot Intent enters generation context/request;
- Sequence Intent enters generation context/request;
- ordinary references keep existing behavior;
- missing/unavailable source permits explicit Generate Anyway.

### Provenance

- every generation freezes sourceShotId/sourceArtifactId/status;
- Approved changes never rewrite existing Artifact provenance;
- later generation resolves the then-current source;
- M4 parent and M6 continuity remain independent.

### Invalidation / review

- Approved change marks direct dependents Review Required;
- risk propagates recursively;
- Accept Current Continuity can resolve review;
- a later source change invalidates an earlier accepted review;
- deleting source Shot does not delete downstream Shots.

### Failure recovery

- missing Approved image preserves Approved identity;
- new continuity becomes source unavailable;
- no latest-generation fallback;
- metadata/provenance remains inspectable.

### `.vdos`

- schema v2 export/import round-trips complete M6 state;
- schema v1 migrates into deterministic Sequence 01/Shot 01;
- historical lineage remains unchanged;
- Copy fully remaps M6 relationships;
- Replace remains atomic;
- asset corruption degrades recoverably;
- Sequence/Shot core corruption blocks import.

### Browser end-to-end

Required real-browser acceptance scenario:

`Create Project → Create Sequence → create Shot01 → generate g1 → approve g1 → create Shot02 → verify g1 continuity reference → generate h1 → verify frozen provenance → change Shot01 Approved to g2 → verify Shot02 Review Required → Accept Current Continuity → export .vdos → remove local project → import .vdos → verify complete Sequence/Shot/Approved/continuity/provenance restoration`

## 30. Implementation Principle

M6 is complete only when continuity is both **visible in the directing workflow** and **actually used by the generation request**.

The central architectural principle is:

> **M6 manages between-Shot continuity; M4 manages within-Shot lineage; M5 preserves the whole project. Dynamic continuity expresses the current directing target, while immutable Artifact provenance records what was actually used.**
