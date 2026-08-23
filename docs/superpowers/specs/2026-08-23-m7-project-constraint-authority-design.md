# M7 Project Constraint Authority Design

**Status:** Awaiting written-spec review before implementation planning  
**Branch:** `phase2/director-intelligence-m0`  
**Baseline before this spec:** `bbddba415eb64753f759afe0d4c7556e9d1f0af5`  
**Depends on:** M5 Compiler-first Sequence Synthesis and M6 Project Intelligence · Shadow  
**Primary objective:** Introduce the first Project-level authority layer without creating a new Scene State writer: M7 derives high-evidence Project Constraint Candidates, requires explicit Director confirmation, persists only Director decisions, detects stale/conflicting evidence, and guards M5 Sequence synthesis before AI completion.

---

## 1. Problem

M6 can explain cross-Scene relationships as:

```text
CAUSE
→ VISUAL RESPONSE
→ OWNERSHIP CONSEQUENCE
→ EVIDENCE / PROVENANCE
```

but M6 is intentionally read-only. It can say that Scene 02 establishes a compiler-backed contested Camera authority state and that the narrative handoff into Scene 03 is compatible, but it cannot protect that relationship when Scene 03 is directed.

The next system needs to preserve a Director-approved cross-Scene commitment without collapsing Scene autonomy or creating a Project-level override that can silently defeat the current Scene narrative truth.

The unsafe approaches are:

- automatically turning every M6 `PASS` into a Project rule;
- letting Project consistency override a supported Scene Compiler result;
- using AI to resolve conflicts between Project and Scene authority;
- inferring exact Project constraints for unsupported families;
- storing runtime statuses such as `ACTIVE` or `STALE` as if they were durable truth;
- retroactively constraining a Scene after it has already been directed;
- treating a previously confirmed constraint as valid after its source evidence changes.

M7 therefore introduces a **Guarded Project Constraint Authority** layer whose authority is primarily a workflow guard, not a new Scene State writer.

---

## 2. Core authority principle

M7 must follow this sequence:

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
       evidence + scope revalidation
                  ↓
  ACTIVE / SATISFIED / CONFLICT / STALE
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

The Director-confirmed Project constraint may **block an unsafe Sequence request**, but M7 v1 does not obtain an independent exact Scene State write channel.

A Project constraint may protect a supported cross-Scene relationship; it may not fabricate Scene truth.

---

## 3. Non-negotiable design principles

1. **Director confirmation is mandatory.** A Candidate has zero authority until explicitly confirmed.
2. **M6 remains read-only.** Candidate controls do not live inside `PROJECT INTELLIGENCE · SHADOW`.
3. **No automatic Project override.** Project constraints never silently defeat a supported current Scene Compiler expectation.
4. **No new Scene State writer.** M7 v1 guards supported Scene Compiler values; it does not introduce `owner: project` as a new value-writing authority.
5. **Scene narrative truth remains primary.** If a current Scene has a deterministic supported ownership result that conflicts with a Project commitment, the result is `CONFLICT`, not Project overwrite.
6. **AI never arbitrates authority conflicts.** A Project/Scene conflict blocks Sequence completion before the AI request.
7. **Candidate eligibility is stricter than M6 PASS.** “No problem detected” is not enough evidence to create authority.
8. **Only deterministic supported families are authority-eligible in v1.** Exact Project constraints are limited to currently supported ownership paths.
9. **Scope is explicit and narrow.** No Project-wide style homogenization or implicit downstream propagation.
10. **Evidence can expire.** A confirmed constraint loses authority when the evidence on which it was confirmed changes.
11. **Persist decisions, derive runtime truth.** Store Director intent; recompute `ACTIVE`, `SATISFIED`, `CONFLICT`, `STALE`, and `INAPPLICABLE` from current evidence.
12. **Legacy Projects remain valid.** Missing M7 registry data is interpreted as an empty registry.
13. **Grammar autonomy is preserved.** M7 never selects or rewrites a Scene Grammar.
14. **Mechanism-based and IP-neutral.** Constraints refer to agency, ownership, supported paths, scope, provenance, and Director decisions, not copyrighted style imitation.
15. **No merge as part of M7.** The existing Phase II PR remains Draft until explicit product approval.

---

## 4. Architectural alternatives considered

### 4.1 Selected — Independent Project Constraint Registry + Guarded Injection

M6 derives Candidates. Director decisions are persisted in a Project Constraint Registry. Before AI completion, a Project Constraint Authority resolver compares current Project evidence, target Scene truth, and the base M5 Skeleton.

Advantages:

- clear ownership and lifecycle;
- precise scope;
- durable Director decisions without storing derived runtime status;
- safe staleness handling;
- does not overload M6, M5 Skeleton compiler, or M4;
- provides an explicit provenance boundary for future Prompt Compiler / Generation / QA work.

### 4.2 Rejected — Write Project constraints directly into the M5 Skeleton compiler

This would make `visual-sequence-skeleton.js` responsible for both Scene-level Grammar semantics and Project-level continuity commitments. It would make provenance harder to explain and would encourage hidden coupling between Scene and Project authority.

### 4.3 Deferred — Project Policy Graph

A Project-wide policy graph could later model dependencies, propagation, exceptions, and long-range constraint networks. It is premature while deterministic evidence is limited to a small ownership subset. M7 v1 deliberately uses a scoped registry instead.

---

## 5. System boundaries

M7 is composed of four focused runtime modules plus UI integration.

```text
project-constraint-candidates.js
project-constraint-registry.js
project-constraint-authority.js
visual-sequence-project-constraints.js
```

### 5.1 `project-constraint-candidates.js`

Pure derivation only.

Inputs:

- current M6 Project Intelligence result;
- current Project State;
- target Scene narrative structure;
- current dismissal ledger.

Outputs:

- authority-eligible Candidates;
- explicit ineligibility reasons when useful for diagnostics.

It must not mutate Project State, M6 output, Scene State, Narrative State, Sequence State, or registry data.

### 5.2 `project-constraint-registry.js`

Owns the contract and deterministic transforms for persisted Director decisions:

- confirm Candidate;
- reject/dismiss Candidate fingerprint;
- revoke constraint;
- add scoped release exception;
- create a new revision after stale evidence is reviewed;
- validate registry structure;
- preserve history.

This module does not determine whether a constraint is currently active. It persists decisions only.

### 5.3 `project-constraint-authority.js`

Pure runtime authority resolver.

Inputs:

- Project State;
- current M6 evidence;
- confirmed registry;
- target Scene;
- target Visual IR / Grammar support;
- base M5 Sequence Skeleton.

Outputs:

- per-constraint runtime resolution;
- aggregate gating result;
- conflict objects;
- stale/inapplicable explanations;
- read-only Project Constraint Context for the Sequence API.

It must never mutate registry, Project State, Skeleton, or Scene State.

### 5.4 `visual-sequence-project-constraints.js`

Thin bridge between M7 and M5.

Responsibilities:

- receive a base M5 Skeleton;
- ask M7 authority resolver whether Sequence synthesis is safe;
- expose satisfied constraint annotations for downstream provenance;
- block the Sequence request when required.

It must not duplicate Visual Compiler logic or independently derive Scene State values.

---

## 6. Correct causal direction for Candidate generation

M7 must never generate a Project constraint from a relationship that only becomes known after the target Scene has already been directed.

The correct temporal direction is:

```text
Scene A → Scene B
already directed and M6-supported
        ↓
Scene B has a current compiler-backed ownership state
        ↓
Scene C narrative structure already exists
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

M7 may now derive:

```text
OWNERSHIP CARRY
CAMERA · MIXED
SOURCE · SCENE 02
TARGET · SCENE 03 / SETUP
```

Scene 03 must not already be fully directed for this Candidate to have prospective authority in v1.

Retroactive Project analysis may still explain an already directed Scene, but it must not silently create a new constraint that claims to have governed that past direction.

---

## 7. Candidate eligibility

A Candidate is not a Constraint. It is a runtime proposal with zero authority.

An ownership Candidate is eligible only if all required conditions are satisfied.

### 7.1 Required evidence gates

1. **Material supported relationship exists upstream.** The source ownership state was established through a meaningful compiler-backed relationship, not merely because an upstream M6 boundary had no warning.
2. **Relevant value source is `compiler-backed`.** `ai-completed`, `legacy`, `unknown`, and `blocked` are not authority sources in v1.
3. **Final source value still matches provenance.** M6 provenance/final-state divergence makes the source ineligible.
4. **Narrative handoff into the target is known and compatible.** Previous Scene ending agency must equal target Scene starting agency after normalization.
5. **Target scope can be stated exactly.** The Candidate names target Scene, Beat, family, and path.
6. **The path is authority-eligible.** No unsupported semantic coercion is needed.
7. **Target is prospective.** M7 v1 does not create authority Candidates for a target Scene that has already been fully directed under another decision history.
8. **Candidate has not been dismissed for the same evidence fingerprint.** A previously rejected identical proposal stays hidden until relevant evidence changes.

### 7.2 M6 status is not sufficient by itself

This is forbidden:

```js
if (boundary.status === 'PASS') {
  return makeConstraintCandidate(boundary);
}
```

A `PASS` can mean only that no evaluated problem was found. Candidate generation additionally requires a material compiler-backed ownership relation that can be meaningfully carried into a future Scene.

### 7.3 Hard ineligibility conditions

The following conditions never produce an authority Candidate in M7 v1:

- `UNRESOLVED` evidence;
- `provenance-final-state-divergence`;
- `legacy-provenance`;
- `missing-provenance`;
- blocked/partial/unsupported mapping;
- narrative handoff mismatch;
- AI-completed-only source;
- unknown source;
- a target Scene already fully directed under another history;
- an exact path that the current deterministic compiler contract does not support as an authority-bearing family.

### 7.4 WARN is not auto-repair input

M6 `WARN` findings do not automatically become constraints.

For example:

```text
Narrative transfer exists
but supported Camera response is absent
WARN
```

M7 must not convert that into “force Camera to change.” That would turn Project Intelligence into an implicit auto-fix system.

M7 v1 protects relationships already proven to exist; it does not manufacture the missing relationship that caused a warning.

---

## 8. Authority-eligible paths in v1

Initial exact Project constraints are limited to paths with deterministic ownership semantics already supported by the Scene Compiler:

```text
agency
camera.perspective
color.territory
```

Candidate generation should primarily use:

```text
camera.perspective
color.territory
```

for cross-Scene ownership carry.

The following do not receive exact Project constraint authority in v1:

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

Unsupported families remain evidence or diagnostics only.

---

## 9. Initial M7 constraint types

M7 v1 keeps the authority vocabulary intentionally small.

### 9.1 `ownership-carry`

Carries a currently compiler-backed ownership state from a directed source Scene into the deterministic `SETUP` endpoint of the next target Scene when the narrative handoff is compatible.

Example:

```text
Scene 02 final Camera authority = MIXED
Scene 02 ending agency = CONTESTED
Scene 03 starting agency = CONTESTED

Candidate:
Scene 03 / SETUP / camera.perspective = MIXED
```

### 9.2 `handoff-guard`

Protects an already confirmed ownership handoff against an unexplained reset in a target deterministic endpoint. It is a guard, not a value invention mechanism.

If the current Scene Compiler cannot support the relevant path, the result is conflict/review, not Project write-through.

### 9.3 `transfer-completion`

Reserved for cases where a Director-confirmed cross-Scene ownership transfer has a deterministic endpoint in a future Scene and the current narrative explicitly continues that ownership transition.

M7 v1 implementation may defer emitting this type until its exact deterministic cases are proven by tests. The schema may reserve the enum, but unsupported instances must not be fabricated.

---

## 10. Scope rules

Every confirmed constraint must have explicit finite scope.

Minimum scope shape:

```js
{
  sourceSceneId: 'scene-02',
  targetSceneId: 'scene-03',
  beatIds: ['setup'],
  family: 'camera',
  path: 'camera.perspective'
}
```

M7 v1 authority-bearing Candidate generation is limited to deterministic endpoint scope, primarily:

```text
SETUP
```

and only where formally justified:

```text
NEW OWNERSHIP
```

Intermediate Beats such as `PRESSURE`, `RUPTURE`, and `RELEASE` normally have constrained-open agency under M5, so M7 v1 must not pretend their exact ownership value is known before AI completion.

The schema may support an exception identified by explicit Beat ID, but v1 Candidate generation must not create speculative middle-Beat exact constraints.

Forbidden default scopes:

- entire Project;
- all downstream Scenes;
- all Beats in a Scene;
- all Grammars;
- “maintain visual consistency” without an exact path and boundary.

---

## 11. Candidate record

A derived Candidate should be deterministic and machine-readable.

Illustrative shape:

```js
{
  candidateId: 'candidate-scene02-scene03-camera-carry',
  candidateFingerprint: 'pcand-...',
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

Candidates are derived runtime values and are not persisted as canonical Project decisions.

---

## 12. Project Constraint Registry

M7 persists only Director decisions, not runtime Candidate or authority status.

Project State gains an optional backward-compatible field:

```js
projectConstraints: {
  schemaVersion: '0.1.0',
  constraints: {},
  dismissals: {}
}
```

### 12.1 Backward compatibility

An older Project with no `projectConstraints` field remains valid.

Runtime interpretation:

```text
projectConstraints missing
→ empty registry
```

The registry is initialized only when the Director first confirms/rejects/revokes a Project constraint decision or when a newly created Project explicitly includes an empty registry.

No destructive migration is required.

### 12.2 Persisted constraint shape

Illustrative v1 shape:

```js
{
  constraintId: 'constraint-camera-carry-001',
  revision: 1,
  decision: 'confirmed',
  type: 'ownership-carry',

  family: 'camera',
  path: 'camera.perspective',
  expected: 'mixed',

  scope: {
    sourceSceneId: 'scene-02',
    targetSceneId: 'scene-03',
    beatIds: ['setup']
  },

  evidence: {
    fingerprint: 'pcf-...',
    contractVersion: '0.1.0',
    sourceBoundaryId: 'scene-01->scene-02',
    source: 'compiler-backed',
    snapshot: { /* minimal canonical evidence */ }
  },

  exceptions: [],
  history: []
}
```

### 12.3 Persisted vs derived state

Persisted Director decisions:

```text
CONFIRMED
REVOKED
REJECTED (dismissal ledger)
```

Derived runtime states:

```text
ACTIVE
SATISFIED
CONFLICT
STALE
INAPPLICABLE
```

Runtime states must never be trusted merely because they were previously rendered.

---

## 13. Candidate rejection / dismissal ledger

Director rejection must be remembered for the exact evidence version of the Candidate.

Example:

```js
dismissals: {
  'pcand-fingerprint-X': {
    decision: 'rejected'
  }
}
```

Semantics:

```text
same Candidate evidence
→ stays dismissed

evidence changes
→ new fingerprint
→ new Candidate may appear
```

The Director rejects a proposal under a specific evidence state, not the underlying mechanism forever.

---

## 14. Evidence fingerprint and staleness

M5 currently records Skeleton version, Reading ID, Strategy ID, Grammar ID, and provenance, but it does not provide a dedicated Skeleton revision fingerprint. M7 must not pretend that such a revision mechanism already exists.

M7 therefore owns a deterministic **evidence content fingerprint**.

This fingerprint is not a cryptographic trust signature. It is a stable identity for the facts under which the Director confirmed the constraint.

### 14.1 Minimal canonical evidence snapshot

The fingerprint input should contain only facts that can invalidate the authority decision.

Source evidence:

- source Scene ID;
- source Scene narrative role;
- source Scene agency transition;
- source applied Beat ID;
- source Reading ID;
- source Strategy ID;
- source Grammar ID;
- source path;
- source compiler-produced value;
- current final Scene value;
- provenance source/status;
- source M6 integrity state relevant to this path.

Target context:

- target Scene ID;
- target narrative role;
- target agency transition;
- source → target adjacency/order relation;
- constraint type;
- target Beat scope;
- family/path;
- Project Constraint authority contract version.

### 14.2 Canonicalization

Fingerprint creation must use deterministic canonical serialization with stable key ordering and normalized values. Two deep-equal evidence snapshots must generate the same fingerprint.

No wall-clock timestamp may participate in equality.

### 14.3 STALE triggers

A confirmed constraint becomes `STALE` if a material evidence component changes, including:

- source Reading changes;
- source Strategy changes;
- source Grammar changes;
- source applied Beat changes;
- compiler-backed source value changes;
- final source Scene State diverges from recorded provenance;
- target narrative role/agency transition changes in a way that affects handoff/scope;
- source/target adjacency changes;
- target Scene identity changes;
- authority contract version changes incompatibly.

### 14.4 STALE semantics

```text
STALE
→ exact authority = NONE
→ workflow = REVIEW REQUIRED
```

A stale constraint never continues to enforce its old value.

It is also not silently ignored when it targets the current Sequence request. Because the Director previously made an explicit commitment, the workflow must require resolution:

- revoke the old constraint; or
- review current evidence and confirm a new revision.

---

## 15. Constraint revision history

Reconfirmation after changed evidence creates a new revision.

Example:

```text
constraint-camera-carry-001

REV 01
expected = MIXED
state = SUPERSEDED

REV 02
expected = CHARACTER
state = CONFIRMED
```

The old decision history remains auditable.

A new revision must not silently inherit scope exceptions from the previous revision unless the Director explicitly reconfirms them.

This enables later systems to record exactly which Project Constraint revision governed a generation or QA decision.

---

## 16. Release exceptions

A Director may release a confirmed constraint for an explicit allowed scope.

Persisted example:

```js
exceptions: [
  {
    sceneId: 'scene-03',
    beatId: 'setup',
    action: 'release',
    revision: 1
  }
]
```

Rules:

- exception must match constraint revision;
- stale/superseded revision exceptions do not automatically carry forward;
- an exception removes that constraint from authority resolution for the matching scope;
- it does not mutate Narrative, Strategy, Grammar, or Scene State;
- it does not mean the underlying Project commitment was globally revoked.

M7 v1 Candidate generation remains endpoint-focused, so exception UI should not imply speculative middle-Beat constraints that the system does not generate.

---

## 17. Runtime authority resolution

For each confirmed constraint relevant to the target Scene, derive one runtime result.

Suggested shape:

```js
{
  constraintId,
  revision,
  targetSceneId,
  beatId,
  path,
  expected,

  status:
    'ACTIVE' |
    'SATISFIED' |
    'CONFLICT' |
    'STALE' |
    'INAPPLICABLE',

  sceneExpectation: null,
  authority: 'guard',
  writeAuthority: 'none',
  workflow: 'allow' | 'blocked-review-required',
  reason,
  conflict: null
}
```

`writeAuthority` remains `none` for M7 itself. Exact values continue to come from the Scene Compiler when supported.

---

## 18. Conflict resolution rules

### 18.1 SATISFIED — Project and Scene agree

Example:

```text
PROJECT CONSTRAINT
camera.perspective = MIXED

SCENE COMPILER
camera.perspective = MIXED
```

Result:

```text
SATISFIED
workflow = allow
```

The Scene Compiler remains the exact value owner.

### 18.2 CONFLICT — exact supported values disagree

Example:

```text
PROJECT CONSTRAINT
camera.perspective = MIXED

CURRENT SCENE COMPILER
camera.perspective = CHARACTER
```

Result:

```text
CONFLICT
workflow = blocked-review-required
AI request = NOT STARTED
```

The system must not:

- allow Project to overwrite Scene Compiler;
- silently ignore Project commitment;
- delegate to AI;
- auto-edit Narrative/Strategy.

Illustrative conflict object:

```js
{
  status: 'conflict',
  constraintId: 'constraint-camera-001',
  path: 'camera.perspective',
  projectExpected: 'mixed',
  sceneExpected: 'character',
  action: 'review-required',
  writeAuthority: 'blocked'
}
```

### 18.3 CONFLICT — target Grammar lacks exact support

A Grammar change is not an error by itself.

However, if a confirmed Camera constraint targets Scene 03 and Scene 03 currently selects a Grammar that has no exact supported Camera mapping, M7 cannot safely enforce that commitment.

Result:

```text
CONFLICT
reason = TARGET-GRAMMAR-UNSUPPORTED
AI request = NOT STARTED
```

The UI should explicitly distinguish:

```text
GRAMMAR CHANGE IS ALLOWED
```

from:

```text
THIS CONFIRMED CONSTRAINT CANNOT BE SAFELY SATISFIED UNDER THE CURRENT GRAMMAR
```

M7 does not switch the Grammar automatically.

### 18.4 KEEP / RELEASE / REVOKE

On conflict the Director may choose:

**KEEP**
- constraint remains confirmed;
- conflict remains unresolved;
- Sequence remains blocked.

**RELEASE FOR THIS SCOPE**
- persist a matching release exception;
- resolver ignores this constraint only for that scope;
- other scope remains intact.

**REVOKE**
- persisted constraint decision becomes revoked;
- it contributes no future authority.

M7 v1 does not offer “Override Scene Compiler.”

If the Director wants the Project commitment to become current Scene truth, the correct future flow is to reauthor the Scene Narrative/Strategy and compile again.

---

## 19. Guarded integration with M5

M7 sits after the base M5 Skeleton is compiled and before the Sequence AI request.

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

M7 must not duplicate `compileBeatExpectations()` or implement its own alternative Visual Compiler.

---

## 20. Deterministic endpoint restriction

M5 already fixes endpoint Agency for:

```text
SETUP
NEW OWNERSHIP
```

while intermediate Beat Agency remains constrained-open.

M7 v1 authority-bearing constraints should therefore resolve only where the relevant Scene Compiler expectation is knowable before AI completion.

Primary supported use:

```text
ownership-carry → SETUP
```

`NEW OWNERSHIP` may be allowed only when the exact prospective Project relationship is explicitly supported and does not require guessing an intermediate AI-selected Agency.

M7 must not become a post-AI correction layer for `PRESSURE`, `RUPTURE`, or `RELEASE` in v1.

---

## 21. Effect on AI Sequence Completion

M7 does not give AI more write authority.

Existing M5 rules remain:

```text
compiler-owned / compiler-derived
→ AI may not write

blocked
→ AI may not write

open
→ AI may complete within contract
```

### 21.1 Read-only Project Constraint Context

When all relevant constraints allow Sequence synthesis, the Sequence API may receive a read-only context:

```js
projectConstraintContext: {
  targetSceneId: 'scene-03',
  constraints: [
    {
      constraintId: 'constraint-camera-001',
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

This context helps AI write narrativeBeat, visualEvents, and rationale consistently.

It is explanatory, not authoritative. The prompt must explicitly state that the model must not write or override constrained paths.

Safety still comes from contracts, Skeleton, validator, and assembler rather than model obedience.

---

## 22. M5 assembler and provenance integration

M7 does not write the exact supported value into the final Scene State patch.

When a constraint is satisfied, the existing Scene Compiler writes the exact value and M7 adds provenance annotation.

Illustrative field provenance:

```js
sequenceProvenance.fields['setup.camera.perspective'] = {
  owner: 'compiler',
  support: 'supported',
  source: 'camera-authority-transfer',
  projectConstraintIds: ['constraint-camera-001']
}
```

Top-level Project constraint provenance:

```js
sequenceProvenance.projectConstraints = {
  registryVersion: '0.1.0',
  resolutions: [
    {
      constraintId: 'constraint-camera-001',
      revision: 1,
      result: 'satisfied',
      beatId: 'setup',
      path: 'camera.perspective'
    }
  ]
}
```

This preserves the correct distinction:

```text
Scene Compiler owns exact value
Project Constraint proves the value also satisfies a Director-confirmed Project commitment
```

---

## 23. Relationship to M3 and M4

M7 does not replace M3 or M4.

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

A normal M7-satisfied Scene should still produce ordinary supported Scene Compiler assertions. M4 should therefore continue to see the expected Scene-level result, typically `CONFIRM` where no raw conflict remains.

No `PROJECT OVERRIDE` action is added to M4.

Canonical Scene State still mutates only through the existing explicit Apply boundary.

---

## 24. Project State and persistence changes

`project-contracts.js` must accept an optional `projectConstraints` object without breaking old Projects.

`project-state.js` should expose focused registry mutation methods rather than encouraging arbitrary callers to edit the registry object directly.

Expected mutation categories:

- confirm Candidate;
- reject Candidate fingerprint;
- revoke constraint;
- release scope;
- confirm new revision.

`project-persistence.js` continues to persist validated Project State. No independent secondary storage system is introduced.

The registry must never contain cached runtime `ACTIVE/SATISFIED/CONFLICT/STALE` fields as durable truth.

---

## 25. UI architecture

Project Workspace order becomes:

```text
PROJECT ARC
↓
CROSS-SCENE CONTINUITY
↓
PROJECT INTELLIGENCE · SHADOW
↓
PROJECT CONSTRAINTS · DIRECTOR CONTROL
```

M6 remains purely read-only.

### 25.1 Candidate card

```text
PROJECT CONSTRAINTS · DIRECTOR CONTROL

CANDIDATE
────────────────────────
OWNERSHIP CARRY
CAMERA

SOURCE
SCENE 02 · MIXED
COMPILER-BACKED

TARGET
SCENE 03 · SETUP

SCOPE
camera.perspective

WHY
A verified ownership state can be carried through the compatible narrative handoff.

[ REJECT ]              [ CONFIRM ]
```

Before Confirm, no Sequence authority changes.

### 25.2 Confirmed active card

```text
CONFIRMED · ACTIVE

CAMERA AUTHORITY
MIXED

SCENE 02
→
SCENE 03 / SETUP

REV 01
EVIDENCE CURRENT

[ REVOKE ]
```

### 25.3 Conflict card

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

### 25.4 Stale card

```text
STALE · AUTHORITY REMOVED

SOURCE EVIDENCE CHANGED

CONFIRMED
MIXED

CURRENT ELIGIBLE EVIDENCE
CHARACTER

[ REVOKE ]
[ REVIEW NEW REVISION ]
```

### 25.5 UI prohibitions

- no auto-confirm;
- no auto-fix;
- no hidden Project mutation from expanding details;
- no `Override Scene Compiler` button;
- no “unify all Grammars” recommendation;
- no Project-wide score;
- no styling that hides `STALE`, `CONFLICT`, or `UNRESOLVED` states behind a simple green/red signal.

---

## 26. Candidate / Registry / Runtime separation

The four layers must remain conceptually distinct:

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

This separation is essential for later Prompt Compiler, Generation, and QA systems.

They must be able to distinguish:

- current Narrative truth;
- current Scene Compiler truth;
- current Director-confirmed Project constraint;
- Director exception;
- stale historical Project decision.

---

## 27. Error and blocking semantics

M7 workflow blocking must be explicit and recoverable.

Suggested Sequence-stage error codes:

```text
PROJECT_CONSTRAINT_CONFLICT
PROJECT_CONSTRAINT_STALE
PROJECT_CONSTRAINT_TARGET_UNSUPPORTED
```

Errors should include structured resolution detail:

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

The Narrative Workspace must preserve confirmed Reading and Strategy when a Project constraint blocks Sequence synthesis.

Retrying Sequence after the Director resolves the constraint should recompile/revalidate current M7 authority before any AI request.

---

## 28. Determinism and immutability requirements

All derivation functions must be deterministic.

For equal inputs:

```text
deriveConstraintCandidates(input)
resolveProjectConstraintAuthority(input)
```

must return deep-equal results.

The following inputs must remain byte-for-byte/deep-equal after pure derivation:

- Project State;
- M6 Project Intelligence;
- registry;
- base Skeleton;
- Visual IR;
- Narrative State;
- Scene State.

Only explicit Director actions may mutate persisted Project registry state.

---

## 29. Initial public API targets

Exact names may be refined in the implementation plan, but the design target is:

### Candidate module

```js
deriveConstraintCandidates({ projectState, projectIntelligence, targetSceneId, registry })
```

### Registry module

```js
createEmptyConstraintRegistry()
validateConstraintRegistry(registry)
confirmConstraintCandidate(registry, candidate)
rejectConstraintCandidate(registry, candidate)
revokeConstraint(registry, constraintId)
releaseConstraintScope(registry, constraintId, exception)
confirmConstraintRevision(registry, constraintId, candidate)
```

### Authority module

```js
buildConstraintEvidenceSnapshot(...)
fingerprintConstraintEvidence(snapshot)
resolveConstraintRuntime(...)
resolveProjectConstraintsForSequence(...)
```

### M5 bridge

```js
prepareProjectConstrainedSequence({ baseSkeleton, projectResolution })
```

The bridge must return the original/base Skeleton semantics plus constraint annotations/gating; it must not create a parallel Project-owned Scene State compiler.

---

## 30. TDD acceptance — Candidate derivation

Required cases:

1. `A→B PASS` contains a material compiler-backed Camera ownership transfer; B ends `CONTESTED`; C begins `CONTESTED`; C is prospective → Camera `ownership-carry` Candidate for C / SETUP.
2. Same shape with Color ownership → Color Candidate.
3. Source is `ai-completed` only → no authority Candidate.
4. Source is `legacy` → no Candidate.
5. Source is `unknown` → no Candidate.
6. Source is `blocked` → no Candidate.
7. Source has provenance/final-state divergence → no Candidate.
8. B ending agency and C starting agency mismatch → no Candidate.
9. Upstream boundary is PASS but contains no material ownership relation → no Candidate.
10. Target Scene already fully directed → no prospective authority Candidate.
11. Candidate rejected with unchanged fingerprint → candidate suppressed.
12. Relevant evidence changes → fingerprint changes and a new Candidate may appear.
13. Input immutability.
14. Deterministic repeated output.

---

## 31. TDD acceptance — Registry

Required cases:

1. Missing registry normalizes to empty backward-compatible state.
2. Confirm creates revision 1 and persists Candidate evidence fingerprint.
3. Reject records Candidate fingerprint without creating a constraint.
4. Revoke preserves history and removes runtime authority.
5. Release exception is scope-specific and revision-bound.
6. Reconfirm stale evidence creates revision 2; revision 1 remains historical/superseded.
7. Revision 2 does not automatically inherit revision 1 exceptions.
8. Invalid paths/types/scopes fail contract validation.
9. Registry transformations are deterministic.
10. Input registry is not mutated by pure transform functions unless the Project Store explicitly commits the returned registry.

---

## 32. TDD acceptance — Staleness

Required cases:

1. Equal canonical evidence → fingerprint stable.
2. Object key order changes only → fingerprint unchanged.
3. Source Reading ID changes → STALE.
4. Source Strategy ID changes → STALE.
5. Source Grammar changes → STALE.
6. Source applied Beat changes → STALE.
7. Source compiler-backed value changes → STALE.
8. Final source Scene State diverges → STALE.
9. Source/target adjacency changes → STALE.
10. Target agency transition materially changes → STALE.
11. STALE returns `authority: none`.
12. STALE target blocks Sequence for Director review.
13. Old expected value is never injected or preserved as active authority.

---

## 33. TDD acceptance — Authority resolution

Required cases:

1. Confirmed Camera constraint + current evidence valid + Scene Compiler expectation equals Project expected → `SATISFIED`.
2. Confirmed Color constraint + equal expectation → `SATISFIED`.
3. Project expected differs from supported Scene Compiler expectation → `CONFLICT`.
4. Conflict returns workflow blocked before AI.
5. Target Grammar has no exact supported path → `CONFLICT / TARGET-GRAMMAR-UNSUPPORTED`.
6. Grammar change alone produces no generic error.
7. Released matching scope → constraint is `INAPPLICABLE` for that scope and does not gate Sequence.
8. Revoked constraint → contributes no authority.
9. Stale constraint → no exact authority and review-required block.
10. No relevant constraints → normal M5 flow unchanged.
11. Resolver does not mutate base Skeleton or registry.
12. Resolver repeat is deterministic.

---

## 34. TDD acceptance — M5 / API / Assembler integration

Required cases:

1. Base M5 Skeleton is compiled before Project authority resolution.
2. M7 does not change M5 canonical Beat IDs or labels.
3. SATISFIED Project constraint permits AI Sequence request.
4. CONFLICT prevents AI Sequence request entirely.
5. STALE prevents AI Sequence request until reviewed.
6. Target unsupported constraint prevents AI request.
7. Sequence API receives only read-only satisfied Project constraint context.
8. AI completion still cannot write compiler-derived constrained paths.
9. Assembler exact value still comes from Scene Compiler.
10. Field provenance keeps `owner: compiler` and adds Project constraint IDs.
11. Top-level Sequence provenance records constraint ID/revision/result.
12. No Scene State mutation occurs before Apply.
13. M4 continues to operate with its existing Scene-level authority semantics.

---

## 35. Browser acceptance

### 35.1 Positive end-to-end flow

Browser acceptance must prove a real Project chain:

```text
DIRECT SCENE 01
↓
DIRECT SCENE 02
↓
M6 verifies 01→02
↓
M7 proposes ownership carry into SCENE 03
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
SCENE 03 SETUP respects Scene Compiler value and confirmed Project constraint
↓
Sequence provenance records constraint REV 01
```

### 35.2 Conflict flow

With the same confirmed Project constraint:

```text
change target Scene Reading / Strategy
↓
Scene Compiler expectation disagrees
↓
M7 = CONFLICT
↓
AI request count = 0
↓
Scene State unchanged
↓
Director sees KEEP / RELEASE / REVOKE
```

### 35.3 Stale flow

```text
modify source Scene evidence
↓
fingerprint changes
↓
constraint = STALE
↓
old expected value has zero authority
↓
Sequence blocked for review
```

### 35.4 Rejection flow

```text
Candidate appears
↓
Director REJECT
↓
rerender with identical evidence
↓
Candidate remains dismissed
↓
material source evidence changes
↓
new Candidate may appear with a new fingerprint
```

### 35.5 Regression coverage

Fresh browser acceptance must continue to cover:

- Director rail interaction;
- Narrative workspace;
- Visual IR Shadow;
- M3 Compare;
- M4 Guarded Authority;
- M5 compiler-first Sequence positive/negative flows;
- Project Workspace Scene switching;
- Project Arc;
- Continuity;
- M6 Project Intelligence positive/legacy/divergence cases.

---

## 36. CI requirements

M7 joins the existing Director Intelligence CI categories:

- Node/contracts tests;
- changed runtime syntax;
- Pages assembly/assets;
- browser acceptance.

A completion claim is invalid until a fresh exact-HEAD run reports success for every required job.

The final verification must also confirm:

- PR remains Draft;
- PR remains open and unmerged;
- base remains `integration/director-workspace-v2-1`;
- branch remains strictly ahead of the approved baseline with no unintended behind commits;
- merge base remains the approved Director V2.1 baseline unless the user explicitly changes strategy.

---

## 37. Compatibility constraints

M7 must preserve:

- old Projects with no M7 registry;
- M6 read-only semantics;
- existing Project Arc and Continuity behavior;
- M5 compiler-first generation contracts;
- M4 Apply-time Scene authority;
- manual DIRECT editability after Apply;
- explicit Director selection for Reading and Strategy;
- existing Scene as the fundamental operational unit;
- no fifth Project mode.

M7 must not require changing old Project Scene workspace shape:

```text
workspace
├── narrativeState
├── sceneState
└── sequenceState
```

Project Constraints belong at Project level, not inside each Scene workspace snapshot.

---

## 38. Explicitly out of scope

M7 does not implement:

- Prompt Compiler;
- image/video generation;
- Project-wide generation planning;
- Visual QA feedback loop;
- automatic Scene repair;
- global style consistency score;
- whole-Project Grammar selection;
- automatic Grammar replacement;
- Project-over-Scene exact value override;
- AI arbitration of authority conflicts;
- speculative exact middle-Beat constraints;
- exact unsupported Space/Texture/Medium/Line constraints;
- direct mutation of canonical Scene State by Project Constraints;
- merge to integration/master.

These may be considered only after M7 demonstrates safe, auditable Project constraint authority.

---

## 39. Success criteria

M7 is complete only when all of the following are true:

1. M6 remains independently read-only.
2. Project Constraint Candidates are derived prospectively from eligible upstream compiler-backed evidence plus compatible future Scene narrative handoff.
3. Candidate generation does not equate every M6 `PASS` with authority eligibility.
4. AI-completed, legacy, unknown, blocked, divergent, or mismatched evidence cannot create authority Candidates.
5. Director Confirm is required before Project constraint authority exists.
6. Director Reject is remembered for the exact Candidate evidence fingerprint.
7. Confirmed decisions persist in an optional backward-compatible Project registry.
8. Runtime `ACTIVE/SATISFIED/CONFLICT/STALE/INAPPLICABLE` states are derived, not persisted as truth.
9. Evidence fingerprinting detects material source/target changes without relying on a nonexistent M5 Skeleton revision fingerprint.
10. STALE constraints lose exact authority and require Director review before target Sequence generation.
11. Constraint revisions remain auditable and old exceptions do not silently transfer to new revisions.
12. v1 authority-bearing scope is narrow and deterministic, primarily target `SETUP`.
13. SATISFIED constraints do not create a new Scene State owner; Scene Compiler remains exact value owner.
14. Project/Scene value conflicts block Sequence before AI completion.
15. Unsupported target Grammar conflicts block Sequence without auto-changing Grammar.
16. AI never arbitrates Project/Scene authority conflicts.
17. Sequence AI still writes only M5-open slots.
18. M5 assembler annotates Project constraint provenance without changing exact value ownership.
19. M3/M4 retain their existing meanings.
20. Canonical Scene State still mutates only after explicit Apply.
21. Project Constraints UI is separate from M6 Shadow inspector and exposes explicit Director control.
22. Legacy Projects continue to load without destructive migration.
23. Unit, integration, browser, syntax, and Pages tests pass on fresh exact HEAD.
24. Existing M0–M6 browser regressions remain green.
25. PR remains Draft and unmerged pending explicit product review.

---

## 40. Deferred after M7

After M7 proves that Director-confirmed Project commitments can safely guard Scene synthesis, the next architectural layer can consume the now-explicit distinction among:

```text
Narrative truth
Scene Compiler truth
confirmed Project constraint
Director exception
stale historical decision
```

That makes the following future work substantially safer:

- Prompt Compiler;
- Project-aware prompt compilation;
- generation planning;
- generation provenance;
- cross-Scene Visual QA;
- regeneration decisions;
- long-range Project policy modeling.

M7 deliberately stops before those systems.
