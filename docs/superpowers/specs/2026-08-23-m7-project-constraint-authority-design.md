# M7 Project Constraint Authority Design

**Status:** Awaiting written-spec review before implementation planning  
**Branch:** `phase2/director-intelligence-m0`  
**Baseline before M7 design:** `bbddba415eb64753f759afe0d4c7556e9d1f0af5`  
**Depends on:** M5 Compiler-first Sequence Synthesis and M6 Project Intelligence · Shadow  
**Primary objective:** Introduce the first Project-level authority layer without creating a new Scene State writer. M7 derives high-evidence Project Constraint Candidates, requires explicit Director confirmation, persists only Director decisions, invalidates stale evidence, and guards M5 Sequence synthesis before AI completion.

---

## 1. Problem

M6 can explain cross-Scene relationships as:

```text
CAUSE
→ VISUAL RESPONSE
→ OWNERSHIP CONSEQUENCE
→ EVIDENCE / PROVENANCE
```

but M6 is intentionally read-only. It can prove that an upstream Scene established a compiler-backed ownership state and that the next Scene begins from a compatible narrative agency, but it cannot protect that relationship when the next Scene is directed.

The next layer must preserve Director-approved cross-Scene commitments without collapsing Scene autonomy or creating a Project-level override that can silently defeat current Scene narrative truth.

The unsafe approaches are:

- converting every M6 `PASS` into a rule;
- letting Project consistency override a supported Scene Compiler result;
- asking AI to resolve Project/Scene authority conflicts;
- inferring exact constraints for unsupported families;
- storing runtime statuses such as `ACTIVE` or `STALE` as durable truth;
- retroactively claiming a constraint governed a Scene after that Scene was already directed;
- continuing to enforce a previously confirmed constraint after its source evidence changes.

M7 therefore introduces **Guarded Project Constraint Authority**. Its authority is primarily a workflow guard, not a new Scene State write channel.

---

## 2. Core authority pipeline

```text
M6 PROJECT INTELLIGENCE · SHADOW
            ↓
eligible deterministic evidence only
            ↓
PROJECT CONSTRAINT CANDIDATE
            ↓
DIRECTOR REVIEW
      ┌─────┴─────┐
   REJECT       CONFIRM
                  ↓
        PROJECT CONSTRAINT REGISTRY
                  ↓
      current evidence revalidation
                  ↓
 ACTIVE / SATISFIED / CONFLICT / STALE / INAPPLICABLE
                  ↓
M5 BASE SEQUENCE SKELETON
                  ↓
GUARDED PROJECT CONSTRAINT CHECK
                  ↓
       SAFE TO COMPLETE?
          YES / NO
                  ↓
          AI COMPLETION
                  ↓
        M5 ASSEMBLER
                  ↓
         M3 → M4 → APPLY
```

A Director-confirmed Project constraint may block an unsafe Sequence request. M7 v1 does **not** obtain independent exact Scene State write authority.

A Project constraint may protect a supported relationship; it may not fabricate Scene truth.

---

## 3. Non-negotiable principles

1. **Director confirmation is mandatory.** A Candidate has zero authority until explicitly confirmed.
2. **M6 remains read-only.** Candidate/constraint controls live in a separate Project Constraints UI.
3. **No automatic Project override.** Project constraints never silently defeat a supported Scene Compiler expectation.
4. **No new Scene State writer.** M7 does not introduce `owner: project` for exact values.
5. **Scene narrative truth remains primary.** A supported current Scene result that conflicts with a Project commitment produces `CONFLICT`, not overwrite.
6. **AI never arbitrates authority conflicts.** Conflict/stale/unsupported cases block before the AI request.
7. **Candidate eligibility is stricter than M6 PASS.** “No problem detected” is not enough evidence to create authority.
8. **Only deterministic supported families are authority-eligible in v1.**
9. **Scope is explicit and narrow.** No implicit propagation to all downstream Scenes.
10. **Evidence can expire.** A confirmed constraint loses authority when the evidence under which it was confirmed changes.
11. **Persist decisions; derive runtime truth.** Store Director intent, recompute runtime status.
12. **Legacy Projects remain valid.** Missing M7 registry means empty registry.
13. **Grammar autonomy is preserved.** M7 never selects or rewrites a Scene Grammar.
14. **Mechanism-based and IP-neutral.** Constraints refer only to supported mechanisms, paths, agency, provenance, scope, and Director decisions.
15. **No merge as part of M7.** The Phase II PR remains Draft until explicit product approval.

---

## 4. Architecture choice

### 4.1 Selected — Independent Registry + Guarded Sequence Check

M6 supplies evidence. A Candidate module derives eligible proposals. Director decisions persist in a Project Constraint Registry. A pure authority resolver revalidates evidence and compares confirmed commitments with the current target Scene/base M5 Skeleton before AI completion.

Advantages:

- clear ownership/lifecycle;
- precise scope;
- durable Director decisions without cached runtime truth;
- safe staleness handling;
- M6 stays diagnostic;
- M5 stays Scene-oriented;
- M4 keeps its existing Apply-time Scene authority semantics;
- future Prompt Compiler/Generation/QA receive explicit Project provenance.

### 4.2 Rejected — Put Project logic directly in `visual-sequence-skeleton.js`

This would mix Scene Grammar semantics with Project commitments and make provenance harder to reason about.

### 4.3 Deferred — Project Policy Graph

A general graph for long-range rules, dependencies, propagation, and exceptions is premature. M7 v1 uses immediate, scoped constraints only.

---

## 5. Module boundaries

```text
project-constraint-candidates.js
project-constraint-registry.js
project-constraint-authority.js
visual-sequence-project-constraints.js
```

### 5.1 `project-constraint-candidates.js`

Pure derivation.

Inputs:

- Project State;
- current M6 Project Intelligence result;
- target Scene narrative structure;
- dismissal ledger.

Outputs:

- eligible Candidates;
- deterministic ineligibility reasons where useful.

No mutation.

### 5.2 `project-constraint-registry.js`

Owns persisted Director-decision contracts and pure transforms:

- confirm Candidate;
- reject/dismiss Candidate fingerprint;
- revoke constraint;
- add scoped release exception;
- confirm a new revision after stale evidence review;
- validate/normalize registry.

This module does not decide whether a constraint is currently active.

### 5.3 `project-constraint-authority.js`

Pure runtime resolver.

Inputs:

- current Project State;
- current M6 evidence;
- registry;
- target Scene;
- target Visual IR / Grammar support;
- base M5 Skeleton.

Outputs:

- current revision validity;
- `ACTIVE / SATISFIED / CONFLICT / STALE / INAPPLICABLE`;
- workflow gating;
- conflict detail;
- read-only Project Constraint Context for Sequence completion.

No mutation.

### 5.4 `visual-sequence-project-constraints.js`

Thin bridge between M7 and M5.

It:

- receives an already-compiled base M5 Skeleton;
- invokes M7 resolution;
- returns allow/block result plus provenance annotations;
- never reimplements the Visual Compiler;
- never invents a Project-owned exact Scene State value.

---

## 6. Correct causal direction

M7 must be prospective.

The correct direction is:

```text
Scene A → Scene B
already directed and M6-supported
        ↓
Scene B has a current compiler-backed ownership state
        ↓
Scene C already exists as the immediate next Scene
and has narrative structure
        ↓
B ending agency ↔ C starting agency is compatible
        ↓
Candidate proposes carrying B ownership into C / SETUP
        ↓
Director may confirm before C Sequence synthesis
```

Example:

```text
SCENE 01
WORLD

↓

SCENE 02
WORLD → CONTESTED
CAMERA = MIXED
COMPILER-BACKED

M6: SCENE 01 → SCENE 02 = PASS

↓

SCENE 03 narrative structure
CONTESTED → CHARACTER
```

M7 may derive:

```text
OWNERSHIP CARRY
CAMERA · MIXED
SOURCE · SCENE 02
TARGET · SCENE 03 / SETUP
```

### 6.1 Immediate-next-Scene rule

M7 v1 only creates authority-bearing carry Candidates from a source Scene to its **immediate next Scene in `sceneOrder`**. It does not jump over intervening Scenes.

### 6.2 Prospective target rule

A target remains prospective if:

- it exists in Project State;
- it has narrative structure from Project breakdown/current edits;
- its visual status is not `directed`.

A target may be `undirected` or `in-progress` provided it has not already established a final directed Scene history. Current evidence will be revalidated again at Sequence time.

Retroactive M6 analysis may explain directed Scenes, but M7 v1 must not create a new constraint that claims to have governed a past directed target.

---

## 7. Candidate eligibility

A Candidate is runtime data with zero authority.

An ownership Candidate is eligible only if all required gates pass.

### 7.1 Required gates

1. **A material supported upstream relationship exists.** The source state is not eligible merely because an upstream boundary had no warnings.
2. **Relevant source is `compiler-backed`.**
3. **Final source value still matches provenance.**
4. **Target is the immediate next Scene.**
5. **Source ending agency and target starting agency are both known and compatible.**
6. **Target is prospective, not already directed.**
7. **Scope can be expressed exactly: target Scene, Beat, family, path.**
8. **Path is authority-eligible.**
9. **No unsupported semantic inference is required.**
10. **The exact Candidate fingerprint has not been rejected.**

### 7.2 M6 PASS is necessary only where the source relationship requires it, never sufficient

Forbidden logic:

```js
if (boundary.status === 'PASS') return candidate;
```

Candidate derivation additionally needs a material compiler-backed ownership response and compatible future handoff.

### 7.3 Hard ineligibility

No authority Candidate is produced when relevant evidence is:

- `UNRESOLVED`;
- provenance/final-state divergent;
- legacy;
- missing;
- blocked;
- partial/unsupported;
- AI-completed-only;
- unknown;
- handoff mismatched;
- target already directed;
- non-adjacent;
- outside an authority-eligible exact path.

### 7.4 WARN is not auto-repair input

M6 `WARN` does not become an automatic constraint. M7 protects relationships already proven to exist; it does not use Project authority to manufacture the relationship that M6 says is missing.

---

## 8. Authority-eligible paths and types

### 8.1 Exact paths in v1

```text
agency
camera.perspective
color.territory
```

Cross-Scene Candidate generation should primarily use:

```text
camera.perspective
color.territory
```

### 8.2 Unsupported exact Project authority in v1

```text
space.*
texture.*
line.*
medium
exact rhythm values
emotion → hue
Texture → Medium
Line → Boundary
Intensity → exact Space state
```

### 8.3 Constraint types

**`ownership-carry`** — primary v1 type. Carries a current compiler-backed Camera/Color ownership state into the immediate next Scene `SETUP` when narrative handoff is compatible.

**`handoff-guard`** — protects a confirmed endpoint commitment against an unexplained reset. It remains a guard, not a value invention mechanism.

**`transfer-completion`** — reserved schema enum only. Candidate generation must not emit it until a deterministic v1 case is explicitly implemented/tested. Reserving the enum does not grant authority.

---

## 9. Scope rules

Every confirmed constraint has explicit finite scope.

```js
{
  sourceSceneId: 'scene-02',
  targetSceneId: 'scene-03',
  beatIds: ['setup'],
  family: 'camera',
  path: 'camera.perspective'
}
```

### 9.1 Endpoint restriction

M7 v1 authority-bearing Candidate generation is limited to deterministic endpoints, primarily:

```text
SETUP
```

`NEW OWNERSHIP` may only be used if a future implementation proves an exact prospective Project relation without relying on an AI-selected intermediate Agency. It is not required for the initial implementation.

Intermediate Beats (`PRESSURE`, `RUPTURE`, `RELEASE`) remain out of authority-bearing Candidate generation in v1 because their Agency may be constrained-open under M5.

### 9.2 Forbidden default scopes

- whole Project;
- all downstream Scenes;
- all Beats;
- all Grammars;
- “maintain consistency” without exact path/scope.

---

## 10. Candidate record and fingerprint

Illustrative shape:

```js
{
  candidateId: 'candidate-scene02-scene03-camera-carry',
  candidateFingerprint: 'pcand-0123456789abcdef',
  eligibility: 'eligible',
  type: 'ownership-carry',

  sourceBoundaryId: 'scene-01->scene-02',
  sourceSceneId: 'scene-02',
  targetSceneId: 'scene-03',

  family: 'camera',
  path: 'camera.perspective',
  expected: 'mixed',

  scope: {
    sourceSceneId: 'scene-02',
    targetSceneId: 'scene-03',
    beatIds: ['setup']
  },

  evidence: {
    source: 'compiler-backed',
    sourceAppliedBeatId: 'new-ownership',
    handoff: 'pass',
    previousEndingAgency: 'contested',
    targetStartingAgency: 'contested'
  }
}
```

Candidate objects are never persisted as canonical Project decisions.

---

## 11. Project Constraint Registry

Project State gains one optional backward-compatible field:

```js
projectConstraints: {
  schemaVersion: '0.1.0',
  constraints: {},
  dismissals: {}
}
```

A Project with no field remains valid and normalizes to an empty registry.

### 11.1 Constraint record is explicitly revisioned

M7 must not use an ambiguous “current value + history array” model. A constraint is a durable identity with explicit immutable revisions.

```js
{
  constraintId: 'constraint-camera-carry-001',
  type: 'ownership-carry',
  decision: 'confirmed',
  currentRevision: 2,

  revisions: {
    '1': {
      revision: 1,
      state: 'superseded',
      family: 'camera',
      path: 'camera.perspective',
      expected: 'mixed',
      scope: {
        sourceSceneId: 'scene-02',
        targetSceneId: 'scene-03',
        beatIds: ['setup']
      },
      evidence: {
        contractVersion: '0.1.0',
        fingerprint: 'pcf-...',
        canonicalSnapshot: { /* exact evidence snapshot */ }
      },
      exceptions: []
    },

    '2': {
      revision: 2,
      state: 'current',
      family: 'camera',
      path: 'camera.perspective',
      expected: 'character',
      scope: {
        sourceSceneId: 'scene-02',
        targetSceneId: 'scene-03',
        beatIds: ['setup']
      },
      evidence: {
        contractVersion: '0.1.0',
        fingerprint: 'pcf-...',
        canonicalSnapshot: { /* new exact evidence snapshot */ }
      },
      exceptions: []
    }
  }
}
```

Rules:

- `currentRevision` points to exactly one revision while `decision === 'confirmed'`;
- a new revision marks the previous current revision `superseded`;
- old revision data is retained unchanged;
- `decision === 'revoked'` removes all runtime authority but preserves `currentRevision` and revision history for audit;
- runtime authority always reads only the current revision of a confirmed constraint.

### 11.2 Persisted vs derived state

Persisted:

```text
CONFIRMED
REVOKED
REJECTED (dismissal ledger)
```

Derived:

```text
ACTIVE
SATISFIED
CONFLICT
STALE
INAPPLICABLE
```

Derived states are never persisted as authoritative truth.

---

## 12. Dismissal ledger

Director rejection is stored against the exact Candidate fingerprint:

```js
dismissals: {
  'pcand-0123456789abcdef': {
    decision: 'rejected'
  }
}
```

Semantics:

```text
same evidence + same scope
→ same Candidate fingerprint
→ remains dismissed

material evidence/scope changes
→ new fingerprint
→ new Candidate may appear
```

The Director rejects a proposal under one evidence state, not the underlying mechanism forever.

---

## 13. Canonical evidence snapshot and fingerprint algorithm

M5 does not currently provide a dedicated Skeleton revision fingerprint. M7 must not pretend one exists.

M7 owns an **evidence content identity**.

### 13.1 Canonical snapshot fields

Source evidence includes only facts capable of invalidating the decision:

- source Scene ID;
- source narrative role;
- source agency transition;
- source applied Beat ID;
- source Reading ID;
- source Strategy ID;
- source Grammar ID;
- source family/path;
- source compiler-produced value;
- current final source Scene value;
- relevant provenance source/status;
- relevant M6 integrity state.

Target context includes:

- target Scene ID;
- target narrative role;
- target agency transition;
- source/target immediate adjacency and order;
- constraint type;
- target Beat scope;
- family/path;
- M7 authority contract version.

### 13.2 Canonical serialization

`canonicalize(value)` must:

- recursively sort object keys lexicographically;
- preserve array order;
- preserve strings, booleans, numbers, and null exactly after existing domain normalization;
- omit object properties whose value is `undefined`;
- never include wall-clock timestamps or object insertion order.

The result is serialized as compact JSON.

### 13.3 Fingerprint digest

For synchronous deterministic browser/Node parity, v1 uses **64-bit FNV-1a** over the UTF-8 bytes of the canonical JSON string, implemented with JavaScript `BigInt` and modulo `2^64`.

Output:

```text
pcf-<16 lowercase hex chars>     // confirmed evidence
pcand-<16 lowercase hex chars>   // Candidate identity
```

This digest is **not a security signature** and must not be treated as cryptographic proof.

### 13.4 Collision-safe authority comparison

Runtime staleness must not rely on the digest alone.

The registry stores the canonical evidence snapshot. Current authority revalidation compares canonical serialized snapshot content directly. The digest is a compact identity/display/dismissal key; exact canonical snapshot equality is the authority check.

---

## 14. Staleness

A confirmed current revision becomes `STALE` whenever the current canonical evidence snapshot differs from the snapshot stored in that revision.

Material triggers include:

- source Reading changes;
- source Strategy changes;
- source Grammar changes;
- source applied Beat changes;
- source compiler-backed value changes;
- final source Scene State diverges;
- source/target adjacency changes;
- target Scene identity changes;
- target narrative role/agency transition changes in a material way;
- incompatible M7 contract version change.

### 14.1 STALE semantics

```text
STALE
→ exact authority = NONE
→ workflow = blocked-review-required
```

A stale constraint never continues to enforce its old value.

It is also not silently ignored when it targets the current Sequence request. Because the Director previously made an explicit commitment, the Director must:

- revoke it; or
- review the new evidence and confirm a new revision.

---

## 15. Revision and release semantics

### 15.1 Reconfirm stale evidence

Reconfirmation creates revision N+1 under the same `constraintId`.

```text
REV 01 · SUPERSEDED
REV 02 · CURRENT
```

The previous revision remains auditable.

### 15.2 Release exception

A release is an explicit Director decision stored inside one revision:

```js
exceptions: [
  {
    sceneId: 'scene-03',
    beatId: 'setup',
    action: 'release',
    revision: 2
  }
]
```

Rules:

- exception revision must equal the containing revision;
- exceptions do not automatically transfer to a new revision;
- a matching release makes the constraint `INAPPLICABLE` for that scope;
- release does not mutate Narrative, Strategy, Grammar, or Scene State.

---

## 16. Runtime authority states

A confirmed constraint may derive:

### `ACTIVE`

Current revision evidence is valid and the target remains relevant, but no base Skeleton/Scene expectation has yet been evaluated for the Sequence request.

### `SATISFIED`

Current evidence is valid and the supported Scene Compiler expectation for the scoped path equals the Project expected value.

### `CONFLICT`

Current evidence is valid but either:

- supported Scene Compiler expectation differs; or
- target Grammar does not provide exact deterministic support needed to satisfy the confirmed constraint.

### `STALE`

Current canonical evidence differs from the confirmed revision snapshot.

### `INAPPLICABLE`

The constraint is not relevant to the current target/scope, is covered by a matching release exception, or is revoked.

---

## 17. Conflict resolution

### 17.1 Equal Project and Scene values

```text
PROJECT
camera.perspective = MIXED

SCENE COMPILER
camera.perspective = MIXED

→ SATISFIED
→ workflow allow
```

The Scene Compiler remains the exact value owner.

### 17.2 Supported values disagree

```text
PROJECT
camera.perspective = MIXED

SCENE COMPILER
camera.perspective = CHARACTER

→ CONFLICT
→ workflow blocked-review-required
→ AI request count = 0
```

Illustrative conflict:

```js
{
  status: 'conflict',
  constraintId: 'constraint-camera-carry-001',
  revision: 1,
  path: 'camera.perspective',
  projectExpected: 'mixed',
  sceneExpected: 'character',
  action: 'review-required',
  writeAuthority: 'blocked'
}
```

The system must not:

- let Project overwrite Scene Compiler;
- silently ignore the confirmed Project commitment;
- ask AI to choose;
- auto-edit Reading/Strategy.

### 17.3 Target Grammar unsupported

Grammar diversity remains allowed. However, if a confirmed Camera constraint targets a Scene whose selected Grammar has no exact deterministic Camera mapping, M7 cannot prove the commitment is satisfied.

Result:

```text
CONFLICT
reason = TARGET-GRAMMAR-UNSUPPORTED
AI request = NOT STARTED
```

UI must distinguish:

```text
GRAMMAR CHANGE IS ALLOWED
```

from:

```text
THIS CONFIRMED CONSTRAINT CANNOT BE SAFELY SATISFIED UNDER THE CURRENT GRAMMAR
```

M7 never changes Grammar automatically.

### 17.4 Director actions

**KEEP** — leaves constraint confirmed and conflict unresolved; Sequence remains blocked.

**RELEASE FOR THIS SCOPE** — stores a revision-bound exception; matching scope becomes inapplicable.

**REVOKE** — constraint decision becomes revoked; no future authority.

M7 v1 has no `Override Scene Compiler` action.

---

## 18. Guarded integration with M5

M7 runs after base Skeleton compilation and before AI completion.

```text
Confirmed Reading
+
Selected Strategy
+
Visual IR
        ↓
M5 compileSequenceSkeleton()
        ↓
BASE SKELETON
        ↓
M7 authority resolver
        ↓
SATISFIED / ACTIVE / INAPPLICABLE
        ↓
AI COMPLETION
```

or:

```text
BASE SKELETON
        ↓
M7 authority resolver
        ↓
CONFLICT / STALE
        ↓
SEQUENCE BLOCKED FOR REVIEW
AI REQUEST COUNT = 0
```

M7 must not duplicate `compileBeatExpectations()` or implement an alternative Visual Compiler.

---

## 19. Deterministic endpoint restriction

M5 fixes endpoint Agency for `SETUP` and `NEW OWNERSHIP`, while intermediate Beat Agency may remain constrained-open.

M7 v1 therefore focuses on Project constraints whose relevant Scene Compiler expectation is knowable before AI completion.

Primary implementation target:

```text
ownership-carry → SETUP
```

M7 must not become a post-AI correction layer for `PRESSURE`, `RUPTURE`, or `RELEASE`.

---

## 20. Effect on AI Sequence Completion

M7 gives AI no additional write authority.

Existing M5 ownership rules remain:

```text
compiler-owned / compiler-derived
→ AI may not write

blocked
→ AI may not write

open
→ AI may complete within contract
```

### 20.1 Read-only Project Constraint Context

When all relevant constraints allow synthesis, Sequence API may receive:

```js
projectConstraintContext: {
  targetSceneId: 'scene-03',
  constraints: [
    {
      constraintId: 'constraint-camera-carry-001',
      revision: 1,
      type: 'ownership-carry',
      beatId: 'setup',
      path: 'camera.perspective',
      expected: 'mixed',
      resolution: 'satisfied'
    }
  ]
}
```

This is explanatory context for narrativeBeat/visualEvents/rationale. Prompt contract explicitly forbids the model from writing/overriding constrained paths.

Safety remains contract/validator/compiler based rather than prompt-obedience based.

---

## 21. M5 assembler and provenance

M7 never writes the supported exact value into the final Scene State patch.

When a constraint is satisfied, the existing Scene Compiler produces the value and M7 adds provenance annotation.

```js
sequenceProvenance.fields['setup.camera.perspective'] = {
  owner: 'compiler',
  support: 'supported',
  source: 'camera-authority-transfer',
  projectConstraintIds: ['constraint-camera-carry-001']
}
```

Top-level:

```js
sequenceProvenance.projectConstraints = {
  registryVersion: '0.1.0',
  resolutions: [
    {
      constraintId: 'constraint-camera-carry-001',
      revision: 1,
      result: 'satisfied',
      beatId: 'setup',
      path: 'camera.perspective'
    }
  ]
}
```

Correct interpretation:

```text
Scene Compiler owns exact value
Project Constraint proves that value also satisfies a Director-confirmed Project commitment
```

---

## 22. Relationship to M3 and M4

Final pipeline:

```text
M6 evidence
↓
M7 Director-confirmed guard
↓
M5 Skeleton / Completion / Assembler
↓
M3 Compare
↓
M4 Guarded Scene Authority
↓
Explicit Apply
```

M7 adds no `PROJECT OVERRIDE` action to M4.

Canonical Scene State still mutates only through explicit Apply.

Manual DIRECT remains editable afterward; if it changes source evidence used by a confirmed downstream constraint, subsequent M7 revalidation can mark that constraint stale.

---

## 23. Project State and persistence

`project-contracts.js` must accept/validate an optional `projectConstraints` registry.

`project-state.js` should expose focused explicit Director-decision methods rather than arbitrary registry object edits.

Expected Project Store actions:

- confirm Candidate;
- reject Candidate fingerprint;
- revoke constraint;
- release scope;
- confirm new revision.

`project-persistence.js` continues to persist validated Project State. No independent secondary storage is introduced.

Runtime statuses are not persisted as truth.

Project constraints live at Project level, not inside per-Scene workspace snapshots.

---

## 24. UI architecture

Project Workspace order:

```text
PROJECT ARC
↓
CROSS-SCENE CONTINUITY
↓
PROJECT INTELLIGENCE · SHADOW
↓
PROJECT CONSTRAINTS · DIRECTOR CONTROL
```

### 24.1 Candidate

```text
CANDIDATE
OWNERSHIP CARRY · CAMERA

SOURCE
SCENE 02 · MIXED · COMPILER-BACKED

TARGET
SCENE 03 · SETUP

SCOPE
camera.perspective

[ REJECT ]              [ CONFIRM ]
```

No authority before Confirm.

### 24.2 Confirmed active

```text
CONFIRMED · ACTIVE
CAMERA · MIXED
SCENE 02 → SCENE 03 / SETUP
REV 01 · EVIDENCE CURRENT

[ REVOKE ]
```

### 24.3 Conflict

```text
CONFIRMED · CONFLICT

PROJECT
MIXED

SCENE COMPILER
CHARACTER

WRITE AUTHORITY
BLOCKED

[ KEEP ]
[ RELEASE FOR THIS SCOPE ]
[ REVOKE ]
```

KEEP does not unblock generation.

### 24.4 Stale

```text
STALE · AUTHORITY REMOVED

CONFIRMED
MIXED

CURRENT ELIGIBLE EVIDENCE
CHARACTER

[ REVOKE ]
[ REVIEW NEW REVISION ]
```

### 24.5 UI prohibitions

- no auto-confirm;
- no auto-fix;
- no hidden mutation from expand/collapse;
- no Override Scene Compiler button;
- no forced Grammar unification;
- no Project-wide coherence score;
- no simple traffic light that hides conflict/stale reasoning.

---

## 25. Layer separation

```text
M6 INTELLIGENCE
what the system currently knows
        ↓
M7 CANDIDATES
what may deserve authority
        ↓
DIRECTOR DECISION REGISTRY
what the Director actually approved
        ↓
M7 RUNTIME RESOLUTION
whether that approval is still valid now
```

Future systems must be able to distinguish:

- current Narrative truth;
- current Scene Compiler truth;
- confirmed Project commitment;
- Director release exception;
- stale/superseded historical decision.

---

## 26. Error and blocking semantics

Suggested Sequence-stage codes:

```text
PROJECT_CONSTRAINT_CONFLICT
PROJECT_CONSTRAINT_STALE
PROJECT_CONSTRAINT_TARGET_UNSUPPORTED
```

Structured detail:

```js
{
  code,
  constraintId,
  revision,
  targetSceneId,
  beatId,
  path,
  projectExpected,
  sceneExpected,
  reason
}
```

When M7 blocks Sequence:

- confirmed Reading/Strategy remain preserved;
- no AI Sequence request is sent;
- no Scene State mutation occurs;
- after Director resolution, retry recomputes current evidence/base Skeleton before any AI request.

---

## 27. Determinism and immutability

Equal inputs must return deep-equal Candidate/authority results.

Pure derivation must not mutate:

- Project State;
- M6 Project Intelligence;
- registry;
- base Skeleton;
- Visual IR;
- Narrative State;
- Scene State.

Only explicit Director actions may commit a returned registry mutation through Project Store.

---

## 28. Public API targets

Exact names may be refined in implementation planning, but target surfaces are:

### Candidate

```js
deriveConstraintCandidates({
  projectState,
  projectIntelligence,
  targetSceneId,
  registry
})
```

### Registry

```js
createEmptyConstraintRegistry()
normalizeConstraintRegistry(registry)
validateConstraintRegistry(registry)
confirmConstraintCandidate(registry, candidate)
rejectConstraintCandidate(registry, candidate)
revokeConstraint(registry, constraintId)
releaseConstraintScope(registry, constraintId, exception)
confirmConstraintRevision(registry, constraintId, candidate)
```

### Evidence / authority

```js
buildConstraintEvidenceSnapshot(...)
canonicalizeConstraintEvidence(snapshot)
fingerprintCanonicalEvidence(canonicalJson, prefix)
resolveConstraintRuntime(...)
resolveProjectConstraintsForSequence(...)
```

### M5 bridge

```js
prepareProjectConstrainedSequence({
  baseSkeleton,
  projectResolution
})
```

The bridge may annotate/gate the base Skeleton context but must not create a parallel Project-owned Scene State compiler.

---

## 29. TDD acceptance — Candidate derivation

Required cases:

1. `A→B PASS` with material compiler-backed Camera transfer; B ends `CONTESTED`; immediate C begins `CONTESTED`; C prospective → Camera `ownership-carry` Candidate for C / SETUP.
2. Equivalent Color case → Color Candidate.
3. Upstream PASS with no material compiler-backed ownership response → no Candidate.
4. AI-completed-only source → no Candidate.
5. Legacy source → no Candidate.
6. Unknown source → no Candidate.
7. Blocked/unsupported source → no Candidate.
8. Provenance/final-state divergence → no Candidate.
9. B end vs C start mismatch → no Candidate.
10. Non-adjacent target → no Candidate.
11. Target already directed → no prospective authority Candidate.
12. Rejected identical Candidate fingerprint → suppressed.
13. Material evidence changes → new fingerprint and Candidate may reappear.
14. Deterministic repeat.
15. Input immutability.

---

## 30. TDD acceptance — Registry and revisions

1. Missing registry normalizes to empty valid registry.
2. Confirm creates a constraint with `currentRevision = 1` and `revisions['1'].state = 'current'`.
3. Reject records Candidate fingerprint without creating a constraint.
4. Revoke preserves revisions but removes runtime authority.
5. Release exception is scope-specific and revision-bound.
6. Reconfirm stale evidence creates revision 2 and marks revision 1 superseded.
7. Revision 2 does not inherit revision 1 exceptions automatically.
8. Only one revision may have `state = 'current'` for a confirmed constraint.
9. Invalid path/type/scope/revision structure fails validation.
10. Pure transforms do not mutate input registry.

---

## 31. TDD acceptance — Fingerprint and staleness

1. Equal normalized snapshots → same canonical JSON and digest.
2. Object key insertion order differences → same canonical JSON/digest.
3. Array order is preserved and materially different order changes identity.
4. FNV-1a output is exact 16-character lowercase hex with expected prefix.
5. Runtime staleness compares canonical snapshot content, not digest alone.
6. Source Reading change → STALE.
7. Source Strategy change → STALE.
8. Source Grammar change → STALE.
9. Source applied Beat change → STALE.
10. Source compiler-backed value change → STALE.
11. Final source Scene divergence → STALE.
12. Adjacency change → STALE.
13. Target agency transition material change → STALE.
14. STALE returns no exact authority and blocks target Sequence for review.
15. Old expected value is never injected after staleness.

---

## 32. TDD acceptance — Authority resolution

1. Confirmed Camera constraint + current evidence valid + Scene Compiler equals Project value → `SATISFIED`.
2. Equivalent Color case → `SATISFIED`.
3. Current evidence valid but base Skeleton not yet evaluated → `ACTIVE`.
4. Project expected differs from supported Scene Compiler expectation → `CONFLICT`.
5. Conflict gates AI request.
6. Target Grammar lacks exact supported path → `CONFLICT / TARGET-GRAMMAR-UNSUPPORTED`.
7. Grammar change alone produces no generic error.
8. Matching release exception → `INAPPLICABLE` for scope.
9. Revoked constraint → `INAPPLICABLE` / no authority.
10. Stale constraint → `STALE`, no exact authority, review-required block.
11. No relevant constraints → normal M5 flow unchanged.
12. Resolver does not mutate base Skeleton/registry.
13. Repeat is deterministic.

---

## 33. TDD acceptance — M5/API/Assembler integration

1. Base M5 Skeleton is compiled before M7 resolution.
2. M7 does not change canonical five Beat IDs/labels.
3. SATISFIED constraint permits AI Sequence request.
4. CONFLICT prevents AI request entirely.
5. STALE prevents AI request until Director review.
6. Target unsupported prevents AI request.
7. Sequence API receives only read-only allowed constraint context.
8. AI still cannot write compiler-derived constrained paths.
9. Assembler exact value still comes from Scene Compiler.
10. Field provenance retains `owner: compiler` and adds constraint IDs.
11. Top-level provenance records constraint ID/revision/result.
12. No Scene State mutation before Apply.
13. M4 keeps existing Scene-level authority semantics.

---

## 34. Browser acceptance

### 34.1 Positive chain

```text
DIRECT SCENE 01
↓
DIRECT SCENE 02
↓
M6 verifies 01→02
↓
M7 proposes carry into SCENE 03
↓
Director CONFIRM
↓
Open SCENE 03
↓
Confirm Reading
↓
Select compatible Grammar
↓
Compile base M5 Skeleton
↓
M7 = SATISFIED
↓
AI Completion
↓
Sequence Preview
↓
canonical Scene State unchanged
↓
Apply
↓
SCENE 03 SETUP respects Scene Compiler value
↓
Sequence provenance records Project constraint REV 01
```

### 34.2 Conflict chain

```text
same confirmed Project constraint
↓
change target Reading/Strategy
↓
Scene Compiler disagrees
↓
M7 = CONFLICT
↓
AI request count = 0
↓
Scene State unchanged
↓
Director sees KEEP / RELEASE / REVOKE
```

### 34.3 Stale chain

```text
modify source Scene evidence
↓
canonical snapshot changes
↓
constraint = STALE
↓
old expected value has zero authority
↓
Sequence blocked for review
```

### 34.4 Rejection chain

```text
Candidate appears
↓
REJECT
↓
identical evidence rerender
↓
Candidate remains dismissed
↓
material evidence changes
↓
new Candidate may appear
```

### 34.5 Required regression gate

Fresh browser acceptance continues to cover:

- Director rail;
- Narrative workspace;
- Visual IR Shadow;
- M3;
- M4;
- M5 positive/negative compiler-first flows;
- Project Workspace Scene switching;
- Project Arc;
- Continuity;
- M6 positive/legacy/divergence flows.

---

## 35. CI requirements

M7 joins existing Director Intelligence CI:

- contracts/Node tests;
- runtime syntax;
- Pages assembly/assets;
- browser acceptance.

No completion claim is valid until a fresh exact-HEAD run succeeds.

Final verification also confirms:

- PR is Draft;
- PR is open/unmerged;
- base remains `integration/director-workspace-v2-1`;
- branch remains strictly ahead of approved baseline with no unintended behind commits;
- merge base remains the approved Director V2.1 baseline unless explicitly changed by the Director.

---

## 36. Compatibility

M7 preserves:

- old Projects without `projectConstraints`;
- M6 read-only semantics;
- Project Arc/Continuity behavior;
- M5 compiler-first contracts;
- M4 Apply-time Scene authority;
- manual DIRECT editability after Apply;
- explicit Reading/Strategy Director choices;
- Scene as the fundamental operational unit;
- no fifth Project mode.

Per-Scene workspace shape stays:

```text
workspace
├── narrativeState
├── sceneState
└── sequenceState
```

Project constraints are Project-level decisions, not Scene workspace snapshots.

---

## 37. Explicitly out of scope

M7 does not implement:

- Prompt Compiler;
- image/video generation;
- Project-wide generation planning;
- Visual QA feedback loop;
- automatic Scene repair;
- global style/coherence score;
- whole-Project Grammar selection;
- automatic Grammar replacement;
- Project-over-Scene exact value override;
- AI arbitration of authority conflicts;
- speculative exact middle-Beat constraints;
- exact unsupported Space/Texture/Medium/Line constraints;
- direct canonical Scene State mutation by Project constraints;
- integration/master merge.

---

## 38. Success criteria

M7 is complete only when all are true:

1. M6 remains independently read-only.
2. Candidates are prospectively derived from eligible upstream compiler-backed evidence plus compatible immediate-next-Scene narrative handoff.
3. Candidate generation does not equate every M6 PASS with authority eligibility.
4. AI-completed, legacy, unknown, blocked, divergent, mismatched, non-adjacent, or retroactive evidence cannot create authority Candidates.
5. Director Confirm is required before authority exists.
6. Director Reject is remembered for the exact Candidate fingerprint.
7. Confirmed decisions persist in optional backward-compatible Project registry.
8. Constraint identity and immutable revisions are explicit via `currentRevision + revisions{}`.
9. Runtime statuses are derived, not persisted as truth.
10. Canonical evidence comparison detects material change without relying on a nonexistent M5 Skeleton revision fingerprint.
11. Fingerprint algorithm is deterministic browser/Node FNV-1a 64-bit and is not treated as cryptographic trust.
12. STALE constraints lose exact authority and block target Sequence for Director review.
13. New revisions retain old audit history and do not inherit old exceptions implicitly.
14. v1 scope is narrow/deterministic, primarily target `SETUP`.
15. SATISFIED constraints do not create a new Scene State value owner.
16. Project/Scene value conflict blocks before AI.
17. Unsupported target Grammar blocks without auto-changing Grammar.
18. AI never arbitrates authority conflicts.
19. AI still writes only M5-open slots.
20. M5 assembler adds Project provenance without changing exact value ownership.
21. M3/M4 meanings remain unchanged.
22. Canonical Scene State still mutates only after explicit Apply.
23. Project Constraints UI is separate from M6 Shadow and exposes explicit Director control.
24. Legacy Projects load without destructive migration.
25. Fresh contracts/syntax/Pages/browser CI succeeds on exact HEAD.
26. Existing M0–M6 regressions remain green.
27. PR remains Draft and unmerged pending explicit product review.

---

## 39. Deferred after M7

Once M7 proves that Director-confirmed Project commitments can safely guard Scene synthesis, future systems may consume the explicit distinction among:

```text
Narrative truth
Scene Compiler truth
confirmed Project constraint revision
Director release exception
stale/superseded historical decision
```

That enables safer work on:

- Prompt Compiler;
- Project-aware prompt compilation;
- generation planning/provenance;
- cross-Scene Visual QA;
- regeneration decisions;
- long-range Project policy modeling.

M7 deliberately stops before those systems.
