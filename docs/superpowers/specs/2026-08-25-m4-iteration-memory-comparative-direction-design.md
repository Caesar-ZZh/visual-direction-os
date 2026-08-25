# M4 Design — Iteration Memory & Comparative Direction

Date: 2026-08-25
Branch: `phase2-m3-generation-evaluation-loop`
Status: Approved design pending implementation plan

## 1. Purpose

M3 established a working loop:

`DIRECT → GENERATE → MEASURE → JUDGE → DEVIATION LEDGER → RE-DIRECT → GENERATE`

M4 extends that loop with persistent lineage, comparative evaluation, and director memory so the system can answer three questions across generations:

1. What changed between generations?
2. Did the correction actually improve the intended rule?
3. Which successful behaviors must now be protected from regression?

The target M4 loop is:

`DIRECT → GENERATE → EVALUATE → RE-DIRECT → GENERATE → COMPARE → LEARN / LOCK → RE-DIRECT`

M4 must preserve the M3 principle:

- measurable evidence may be evaluated automatically;
- semantic evidence must remain director-controlled;
- the system must not infer narrative or stylistic certainty from pixel statistics alone.

## 2. Scope

M4 will add four capabilities:

1. **Generation Lineage** — persist every generation and its parent/branch relationship.
2. **A/B Comparative QA** — compare any two generations, especially parent and child.
3. **Delta Effectiveness** — determine whether a correction resolved, regressed, remained stable, or stayed unresolved.
4. **Director Memory** — preserve validated successes and feed them into future iteration deltas.

The first M4 release is local-first and single-browser. It does not add user accounts, cloud sync, team collaboration, or remote project storage.

## 3. Persistence Decision

The approved persistence model is **B1: full persistence of every generation**.

Every generation stores:

- generated image;
- generation request and compiled prompt;
- Visual IR snapshot;
- measurements;
- evaluation checks and summary;
- director judgments;
- deviation delta;
- lineage metadata;
- comparison outcomes when available.

### 3.1 Storage technology

Use **IndexedDB**, not `localStorage`, for M4 project memory.

Rationale:

- Base64 images are too large for reliable `localStorage` use;
- IndexedDB can store `Blob` objects directly;
- structured records can be indexed by project, parent, root, and generation index;
- M4 must survive page refreshes without silently deleting history.

### 3.2 Image representation

At persistence time:

- Base64/data URL generation results are converted into image `Blob`s;
- URL results may be fetched into a Blob only when browser CORS allows it;
- M4 production flow should continue preferring Base64 generation because it guarantees local pixel access and persistence.

At render time:

- persisted Blobs are exposed through temporary object URLs;
- object URLs are revoked when no longer needed;
- raw Base64 strings are not duplicated into the persistent record once the image Blob has been stored.

## 4. Artifact Lineage Model

M3 generation artifacts remain the canonical generation snapshots. M4 adds lineage metadata without changing the responsibilities of Agnes generation or the M3 evaluation engine.

Each persisted artifact record gains:

```js
{
  id,
  projectId,
  rootArtifactId,
  parentArtifactId,
  generationIndex,
  createdAt,
  provider,
  request,
  visualIR,
  measurements,
  evaluation,
  iterationDelta,
  imageBlob,
  imageMimeType,
  persistenceStatus
}
```

### 4.1 Field semantics

- `projectId`: stable identifier for the current director project.
- `rootArtifactId`: first generation in the lineage tree.
- `parentArtifactId`: artifact directly used as the source of the iteration; `null` for root generations.
- `generationIndex`: display order within the lineage; not used as the unique identity.
- `iterationDelta`: exact correction payload that produced this child.
- `persistenceStatus`: records whether the artifact is fully saved or only available in memory due to storage failure.

### 4.2 Branching

Lineage must support branches from the start.

Example:

```text
Gen 01
├── Gen 02A
│   └── Gen 03A
└── Gen 02B
```

The data model must therefore never assume one child per artifact or a single linear head.

## 5. Director Memory Storage Layer

Create `runtime/director-memory.js` as the IndexedDB boundary.

It owns persistence only. It must not decide whether a rule improved or what to put in the next prompt.

### 5.1 Required responsibilities

- open and migrate the M4 database;
- create/read/update project records;
- save artifact metadata and image Blob atomically where practical;
- load one artifact by ID;
- load all artifacts for a project;
- query children of an artifact;
- restore the most recent project on reload;
- report storage usage and quota when the browser exposes it;
- delete a selected artifact subtree only after relationship checks;
- clear a project only after explicit UI confirmation.

### 5.2 Failure behavior

M4 must never silently delete existing generations.

If IndexedDB write or storage quota fails:

- generation remains usable in the current in-memory session;
- the artifact is marked `not_persisted`;
- the UI shows an explicit persistence warning;
- existing stored lineage remains unchanged.

## 6. Comparison Engine

Create `runtime/comparison-engine.js` as a pure deterministic module.

Inputs:

- Artifact A and its evaluation;
- Artifact B and its evaluation;
- optional director comparison judgments.

Output:

```js
{
  artifactAId,
  artifactBId,
  measuredComparisons: [],
  semanticComparisons: [],
  summary: {
    resolved,
    regressed,
    stable,
    unresolved
  }
}
```

### 6.1 Measured comparison states

For checks that were measured in both generations:

- `resolved`: A was warn and B is pass;
- `regressed`: A was pass and B is warn;
- `stable_pass`: A pass → B pass;
- `stable_warn`: A warn → B warn;
- `unresolved`: one side lacks comparable measured evidence.

The engine should also expose actual numeric deltas where measurements are meaningful, for example:

```text
Saturation
Gen 01  0.61
Gen 02  0.37
Target  LOW
Result  RESOLVED
```

No global composite score is required for M4. A single score would conceal trade-offs and encourage false certainty.

### 6.2 Semantic comparison states

Narrative Verb, Primary Variable, Identity Anchors, World / Ownership, Composition Hierarchy, Camera Allegiance, Color Ownership, Medium Ownership, FX Ownership, and Anti-rules remain director judgments.

For A/B comparison the director may mark:

- `improved`;
- `unchanged`;
- `regressed`;
- `not_sure`.

The engine must not auto-convert image measurements into these semantic states.

## 7. Delta Effectiveness

M4 compares a child artifact against its parent and links the result back to the parent delta.

For each correction generated by the parent evaluation:

- if the corresponding measured check changes `warn → pass`, mark the correction `resolved`;
- if `warn → warn`, mark it `unresolved`;
- if a previously passing protected behavior changes `pass → warn`, mark it `regressed`;
- semantic corrections remain unresolved until director A/B judgment is supplied.

This creates an auditable link:

`Correction instruction → child result → evidence → effectiveness state`

## 8. Memory Engine

Create `runtime/memory-engine.js` as a pure policy layer above comparison results.

It maintains three memory classes:

### 8.1 LOCKED

Validated behaviors future generations should preserve.

Measured rule enters LOCKED when either:

1. it is `warn → pass` and remains pass in the next comparable generation; or
2. it is pass across two consecutive comparable generations.

Semantic rules **never auto-lock**. A semantic rule can enter LOCKED only after explicit director confirmation.

### 8.2 ACTIVE CORRECTION

Rules that remain wrong or have not yet demonstrated stable resolution.

Examples:

- saturation remains above the low target;
- density correction did not resolve;
- director marks composition hierarchy as regressed.

### 8.3 UNRESOLVED / WATCH

Rules where evidence is incomplete or the director selected `not_sure`.

These rules are retained in memory but are not compiled as deterministic correction instructions.

### 8.4 Regression behavior

If a LOCKED measured behavior later changes from pass to warn:

- remove it from LOCKED;
- mark it `regressed`;
- move it into ACTIVE CORRECTION;
- include it in the next iteration delta.

This prevents the system from treating successful earlier behavior as permanently safe.

## 9. Next-Iteration Compilation

M4 extends, rather than replaces, M3 `compileReDirectionDelta()`.

The future iteration prompt is composed from:

1. current evaluation delta;
2. relevant LOCKED memory rules as preserve instructions;
3. ACTIVE CORRECTION rules;
4. unresolved rules only as provenance/UI information, never forced generation instructions.

Conceptually:

```text
ITERATION / DIRECTOR MEMORY

PRESERVE LOCKED:
- Preserve 16:9 canvas behavior.
- Preserve low global saturation.

CORRECT ACTIVE:
- Reduce background information density.
- Restore character/world boundary separation.
```

M4 must avoid repeatedly appending historical prompt text to already-iterated prompts. Memory compilation should derive a fresh bounded appendix from structured state, not recursively concatenate every previous delta forever.

## 10. UI Design

M4 adds an `ITERATION MEMORY` workspace below the existing Generation / Evaluation area. It should visually extend the current editorial runtime rather than redesign the site.

### 10.1 Lineage strip

Show the current project lineage as selectable generation nodes.

Example:

```text
GEN 01 ───── GEN 02 ───── GEN 03
  ●             ●             ●
BASE          3 fixed        1 fixed
```

Branching artifacts appear as branches rather than being flattened into one timeline.

Each node exposes:

- generation label/index;
- creation time;
- parent relationship;
- summary of resolved/regressed items;
- persistence state.

### 10.2 A/B Viewer

Two selected artifacts can be compared side by side.

M4 first release includes:

- side-by-side view;
- A/B selector;
- optional simple image reveal/slider when both images are available;
- no full image editor or annotation canvas.

### 10.3 Comparative QA

Display measured comparison rows with:

- target;
- A observation/status;
- B observation/status;
- comparison result.

Display semantic comparison rows with director controls:

- IMPROVED;
- UNCHANGED;
- REGRESSED;
- NOT SURE.

### 10.4 Director Memory panel

Display:

```text
LOCKED
ACTIVE CORRECTION
WATCH / UNRESOLVED
```

Every entry must show its evidence source:

- measured;
- director-confirmed;
- unresolved.

### 10.5 Branch action

Provide `RE-DIRECT FROM THIS GENERATION` on any persisted artifact.

This action uses that artifact as the parent and creates a new branch child instead of forcing iteration only from the current latest artifact.

## 11. Reload / Restore Behavior

On app boot:

1. M3 runtime loads normally;
2. M4 opens IndexedDB;
3. the most recent project is restored;
4. lineage metadata is rendered;
5. artifact images are loaded lazily from Blob storage;
6. the latest artifact may become the default B selection, with its parent as A when available.

Failure to restore M4 memory must not prevent M3 DIRECT / GENERATE / EVALUATE from working.

M4 therefore degrades independently.

## 12. Storage Management

Because B1 requires full history, M4 does not impose an automatic generation cap.

The UI should show approximate usage when available, for example:

`12 generations · 86 MB`

When storage is near or at quota:

- show a warning;
- do not auto-delete history;
- allow explicit artifact/subtree deletion;
- allow explicit `Clear project memory` with confirmation.

Project ZIP export and cloud synchronization are explicitly deferred beyond the first M4 implementation.

## 13. Runtime Boundaries

Planned new runtime modules:

```text
runtime/director-memory.js
runtime/comparison-engine.js
runtime/memory-engine.js
runtime/lineage-ui.js
```

Planned test modules:

```text
runtime/director-memory-tests.js
runtime/comparison-engine-tests.js
runtime/memory-engine-tests.js
```

Expected focused modifications:

```text
runtime/generation-ui-m3.js
runtime/evaluation-ui.js
runtime/iteration-controller.js
app.js
.github/workflows/m3-runtime-tests.yml
```

The Cloudflare Agnes Worker remains outside M4 unless implementation reveals a concrete server-side requirement. M4 is intentionally local-first.

## 14. Event/Data Flow

### Root generation

```text
DIRECT
→ Generation request
→ Agnes
→ Generation Artifact
→ Base64 image
→ M3 Evaluation
→ M4 persist artifact + Blob
→ lineage node created
```

### Iterated generation

```text
Parent Artifact
→ M3 delta + M4 memory context
→ iteration controller
→ Agnes
→ Child Artifact(parentArtifactId)
→ M3 Evaluation
→ M4 persist
→ compare Parent vs Child
→ update Memory Engine
→ render lineage + Comparative QA
```

### Branch generation

```text
Selected historical Artifact
→ compile fresh iteration context from that Artifact
→ generate Child with selected artifact as parent
→ append new branch
```

## 15. Testing Strategy

Implementation must use regression-first/TDD for pure modules and persistence adapters where practical.

### 15.1 Director memory tests

Verify:

- save/load round trip;
- Blob persistence;
- project artifact listing;
- parent/child query;
- reload restoration;
- write failure does not delete existing records;
- branch relationships remain intact.

IndexedDB browser-specific integration should be isolated behind an adapter so core record-shaping logic can be tested in Node with a fake store where needed.

### 15.2 Comparison engine tests

Verify all transitions:

- warn → pass = resolved;
- pass → warn = regressed;
- pass → pass = stable pass;
- warn → warn = stable warn/unresolved correction;
- missing/non-comparable evidence = unresolved;
- semantic comparison requires explicit director input.

### 15.3 Memory engine tests

Verify:

- two consecutive measured passes lock a rule;
- warn → pass alone does not prematurely lock unless the next comparable generation remains pass;
- semantic rule cannot auto-lock;
- director-confirmed semantic rule can lock;
- locked rule regression removes the lock and creates active correction;
- unresolved items never become generation corrections automatically.

### 15.4 Integration regression

Existing M3 suites must remain green:

- Visual IR;
- Agnes adapter;
- generation client;
- image measurements;
- evaluation engine;
- iteration controller;
- Cloudflare proxy.

M4 CI adds comparison, memory, persistence-model, and syntax checks.

## 16. Acceptance Criteria

M4 is considered functionally complete when all of the following are demonstrated:

1. Generate at least three images in one lineage.
2. Refresh the browser and restore all three images and their full M3 metadata.
3. Display parent/child lineage correctly.
4. Select two artifacts and show A/B images.
5. Automatically classify measured check transitions without semantic overreach.
6. Accept director A/B judgments for semantic checks.
7. Link child outcomes back to the parent correction delta.
8. Build LOCKED / ACTIVE CORRECTION / WATCH memory state.
9. Carry LOCKED preserve rules into a subsequent re-direction.
10. Detect regression of a previously locked measured rule and reactivate correction.
11. Re-direct from an older generation and create a branch instead of overwriting lineage.
12. Survive persistence/quota failure without breaking the existing M3 generation loop or deleting prior history.

## 17. Explicit Non-Goals for M4 First Release

- account authentication;
- cloud database;
- cross-device synchronization;
- team collaboration;
- cloud image/object storage;
- automatic semantic image understanding presented as fact;
- one-number quality score;
- full visual annotation/editor tooling;
- ZIP project export;
- automatic deletion or retention limits.

These can be considered after the local persistent comparative loop is stable.
