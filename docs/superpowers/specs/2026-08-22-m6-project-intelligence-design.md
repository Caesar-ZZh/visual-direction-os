# M6 Project Intelligence Design

**Status:** Approved design for implementation planning  
**Branch:** `phase2/director-intelligence-m0`  
**Baseline:** Director V2.1 integration lineage, continuing from M5 compiler-first Sequence synthesis  
**Primary objective:** Add a read-only Project Intelligence layer that explains cross-Scene narrative cause, visual response, ownership consequence, and provenance without changing canonical Scene State or existing Continuity behavior.

## 1. Problem

Project Arc and Project Continuity already summarize directed Scenes and identify some cross-Scene mismatches. Today, however, those systems only see Narrative Role and final Scene State. They do not know whether a visual state was produced by the deterministic Compiler, completed by AI within an allowed field, changed later in DIRECT, inherited from legacy data, or left unresolved.

After M5, that distinction matters. The system must not treat a compiler-backed Camera transfer, an AI-completed Texture change, and an old Scene with no provenance as equivalent evidence.

M6 therefore adds a separate Project Intelligence layer rather than expanding `project-continuity.js` into provenance-aware reasoning. This preserves the meaning and stability of existing Project Arc / Continuity while introducing a new, explicitly evidence-aware cross-Scene diagnostic model.

## 2. Design principles

1. **Read-only first.** M6 cannot mutate Project State, Scene State, Narrative State, Sequence State, Visual IR, or any M5 provenance object.
2. **Do not replace Continuity v1.** Existing `project-continuity.js` keeps its current rules and status semantics.
3. **Cause before judgment.** A Scene boundary is evaluated as `cause → visual response → ownership consequence`, not as a raw numeric jump.
4. **Provenance is part of evidence.** A final state is not sufficient evidence to claim that a visual response was compiler-backed.
5. **UNKNOWN stays UNKNOWN.** Missing M5 provenance, unsupported grammar mappings, blocked fields, post-Apply divergence, or insufficient Scene data yield `UNRESOLVED`; the system must not infer missing authority.
6. **No global score.** Project Intelligence uses categorical findings only: `PASS`, `WARN`, `FAIL`, `UNRESOLVED`.
7. **Scene autonomy is preserved.** Different Scenes may use different Grammars. Grammar changes are not errors by themselves.
8. **No continuity-by-smoothness.** Abrupt changes can be correct when they have a narrative cause and explainable ownership consequence.
9. **No global stylistic homogenization.** M6 must never recommend flattening all Scenes to one visual system merely to make the Project look consistent.
10. **Mechanism-based, IP-neutral reasoning.** M6 reasons about ownership, agency, grammar, provenance, and visual variables only.

## 3. Scope

### 3.1 In scope

- Derive a provenance-aware intelligence record for every Scene in Project order.
- Evaluate adjacent Scene boundaries.
- Explain narrative cause, visual response, ownership consequence, and evidence origin.
- Distinguish compiler-backed, AI-completed, blocked, legacy, and missing/unknown provenance conditions.
- Add a Project Workspace inspector labeled `PROJECT INTELLIGENCE · SHADOW`.
- Add unit, integration, and browser acceptance coverage.
- Preserve all existing Project Arc, Continuity, Scene switching, Sequence Director, M3, M4, and M5 behavior.

### 3.2 Explicitly out of scope

- No Project-level Compiler that overwrites Scene decisions.
- No automatic Scene repair.
- No Project-wide prompt generation.
- No global Grammar selection.
- No forced same-Grammar continuity.
- No new score or weighted coherence metric.
- No inference of exact Space, Texture, Medium, or other currently blocked semantics beyond existing deterministic support.
- No schema migration that breaks legacy Projects.
- No merge to integration or `master` as part of M6 implementation.

## 4. Existing architecture to preserve

Current Project storage already keeps three per-Scene workspace snapshots:

```text
workspace
├── narrativeState
├── sceneState
└── sequenceState
```

The Project Runtime captures and restores those snapshots during Scene switching. M6 will read these existing snapshots; it will not add a fifth Project mode and will not replace Scene as the fundamental unit.

Existing Project Arc continues to derive these seven rows:

```text
Narrative Role
Agency
Camera Authority
Color Territory
Spatial Pressure
Graphic Density
Rhythmic Energy
```

Existing Project Continuity continues to evaluate its current rules independently.

## 5. New architecture

```text
Project State
   │
   ├── Scene 01 workspace
   │      ├ Narrative State
   │      ├ M5 Sequence State / provenance
   │      └ Final Scene State
   │
   ├── Scene 02 workspace
   │      ├ Narrative State
   │      ├ M5 Sequence State / provenance
   │      └ Final Scene State
   │
   └── ...
          ↓
Project Intelligence Normalizer
          ↓
Scene Intelligence Records
          ↓
Adjacent Boundary Analysis
          ↓
CAUSE
→ VISUAL RESPONSE
→ OWNERSHIP CONSEQUENCE
→ EVIDENCE / PROVENANCE
          ↓
PASS / WARN / FAIL / UNRESOLVED
          ↓
Project Intelligence Inspector
```

M6 is a new sibling to Project Arc and Project Continuity, not a replacement for either.

## 6. Scene Intelligence record

A normalized Scene record must be machine-readable and deterministic.

```js
{
  sceneId,
  title,
  order,
  narrativeRole,
  grammarId,

  provenanceStatus:
    'compiler-first' |
    'legacy' |
    'missing',

  narrativeAgency: {
    start,
    end
  },

  compilerOwnedFamilies: [],
  aiCompletedFamilies: [],
  blockedFamilies: [],

  visualAgency,
  cameraAuthority,
  colorTerritory,

  evidence: {
    hasNarrativeState,
    hasSceneState,
    hasSequenceState,
    hasCompilerFirstProvenance
  }
}
```

### 6.1 Normalization rules

- Agency normalization follows existing Project Arc conventions:
  - `world` → `WORLD`
  - `character` → `CHARACTER`
  - `contested`, `shared`, or `mixed` → `CONTESTED`
- `grammarId` comes only from explicit stored M5 / Visual IR / Strategy provenance. It must never be inferred from final Camera or Color state.
- `compilerOwnedFamilies`, `aiCompletedFamilies`, and `blockedFamilies` come only from M5 provenance or authority decisions.
- A directed Scene with a valid final Scene State and no compiler-first markers is treated as `legacy` for backward compatibility.
- A Scene is `missing` when compiler-first markers exist but required provenance is absent/incomplete, or when visual data is too incomplete to classify safely.
- If a final Scene State value differs from the compiler/AI value recorded by M5 provenance, that final value must not be labeled `compiler-backed` or `ai-completed`. The origin becomes `unknown` for M6 and the mismatch may surface as an integrity `UNRESOLVED` finding.

## 7. Boundary Intelligence record

For every adjacent Scene pair `A → B`, derive a record:

```js
{
  id,
  fromSceneId,
  toSceneId,
  status,
  rule,

  cause: {
    narrativeRole,
    agencyFrom,
    agencyTo,
    relationToPrevious
  },

  handoff: {
    previousEndingAgency,
    currentStartingAgency,
    status
  },

  visualResponse: [
    {
      family,
      from,
      to,
      changed,
      source:
        'compiler-backed' |
        'ai-completed' |
        'legacy' |
        'blocked' |
        'unknown'
    }
  ],

  ownershipConsequence: {
    summary,
    from,
    to
  },

  why,
  evidenceStatus
}
```

The boundary record is explanatory. It is not a Scene patch and contains no mutation instructions.

### 7.1 Narrative cause and handoff semantics

Two different narrative comparisons exist and must never be conflated.

**Handoff continuity** compares:

```text
previous Scene ending agency
↔
current Scene starting agency
```

This asks whether adjacent Scenes connect narratively.

**Boundary cause** comes from the **current Scene**:

```text
current Scene agencyTransition: start → end
+
current Scene narrativeRole
+
current Scene turningPoint / relationToPrevious when available
```

This asks whether the current Scene provides a narrative cause for the visual change observed between the previous Scene final state and current Scene final state.

Therefore:

```text
Narrative cause: current Scene start → current Scene end
Visual response: previous final Scene State → current final Scene State
Handoff check: previous Scene end ↔ current Scene start
```

Rule 1 and Rule 2 use **current Scene cause**. Rule 3 uses **handoff continuity**.

## 8. Evidence source semantics

### `compiler-backed`
Use only when the relevant final field is supported by M5 provenance as Compiler-owned or deterministically assembled from a supported Compiler assertion **and the current final Scene State still matches that recorded value**.

### `ai-completed`
Use only when M5 provenance explicitly records the family/path as AI-completable, the final value originated through that completion path, **and the current final Scene State still matches that recorded value**.

### `blocked`
Use when the Grammar / Compiler contract explicitly says the family or path cannot be determined safely.

### `legacy`
Use when the Scene is directed and final state exists, but compiler-first provenance is absent and no compiler-first markers indicate a broken/incomplete transaction.

### `unknown`
Use when the system lacks enough evidence to classify the origin safely, including post-Apply/manual divergence from stored provenance.

A final Scene State value alone is never sufficient to upgrade source to `compiler-backed` or `ai-completed`.

## 9. Initial rule set

M6 v1 deliberately starts with a small rule set. Every rule must be explainable and deterministic.

### Rule 1 — Narrative ownership transfer without compiler-backed visual response

**Condition:** The current Scene contains a material narrative agency transition (`start !== end`) or an explicit ownership-relevant structural role, but Camera/Color ownership does not produce a corresponding compiler-backed response where the current Scene Grammar supports one.

**Status:** `WARN`

**Why:** The current Scene reports a transfer of agency, but the deterministic visual ownership system does not visibly carry that change into the Scene's final state.

If the relevant visual family is blocked or unsupported, return `UNRESOLVED` rather than `WARN`.

### Rule 2 — Major compiler-backed visual ownership transfer without narrative cause

**Condition:** Camera or Color makes a major ownership transfer from previous final Scene State to current final Scene State with `compiler-backed` provenance, while the current Scene agency transition and structural role provide no comparable narrative cause.

**Status:** `WARN`

**Why:** The visual authority transfer is real and compiler-backed, but the current Scene narrative does not explain why it occurs.

### Rule 3 — Narrative agency handoff mismatch between adjacent Scenes

**Condition:** Previous Scene ending narrative agency and current Scene starting narrative agency are both known but incompatible.

**Status:** `WARN`

If one side is unknown, use `UNRESOLVED`.

This rule is about narrative handoff continuity, not about visual smoothness.

### Rule 4 — Directed Scene without M5 provenance

**Condition:** Scene is visually directed and has a final Scene State, but no compiler-first provenance can be found and no compiler-first marker proves an incomplete transaction.

**Status:** `UNRESOLVED`

**Why:** The Scene is usable, but Project Intelligence cannot safely attribute its visual decisions.

Legacy data is not an error.

### Rule 5 — Grammar change between Scenes

**Condition:** `grammarId` differs across adjacent Scenes.

**Status:** No finding by itself.

A Camera-led Scene may be followed by a Color-led Scene. Grammar diversity is a director choice unless another rule finds an unexplained consequence.

### Rule 6 — Blocked/unsupported families

Space, Texture, Medium, and any other field without an exact supported mapping remain `UNRESOLVED` for provenance-aware causal claims.

M6 must never coerce:

```text
Texture → Medium
Line → Boundary
Intensity → exact Space state
Emotion → hue
```

### Rule 7 — Provenance/final-state divergence

**Condition:** M5 provenance identifies an exact compiler-backed or AI-completed value for a path, but current final Scene State contains a different value.

**Status:** `UNRESOLVED` in M6 v1.

**Why:** Project Intelligence can prove that the final state no longer matches the recorded decision origin, but it cannot safely determine whether the divergence came from a later DIRECT edit, stale snapshot, corrupted persistence, or another unsupported path.

M6 must not silently keep the old provenance label after divergence.

## 10. PASS semantics

`PASS` is allowed only when a boundary has enough evidence to evaluate the relevant rule and no mismatch is found.

Example:

```text
SCENE 02 → SCENE 03

CURRENT SCENE CAUSE
Agency: WORLD → CONTESTED

VISUAL RESPONSE
Camera: WORLD → MIXED
Source: COMPILER-BACKED

OWNERSHIP CONSEQUENCE
Frame authority becomes contested

RESULT
PASS
```

`PASS` does not mean the Project is globally correct. It means the evaluated boundary relationship is explainably coherent under currently supported evidence.

## 11. WARN example

```text
SCENE 01 → SCENE 02

CURRENT SCENE CAUSE
Agency: WORLD → WORLD
Role: DEVELOPMENT

VISUAL RESPONSE
Camera: WORLD → CHARACTER
Source: COMPILER-BACKED

OWNERSHIP CONSEQUENCE
Frame authority transfers completely to CHARACTER

RESULT
WARN

WHY
A major compiler-backed ownership transfer occurs without a comparable narrative cause in the current Scene.
```

## 12. UNRESOLVED examples

### Legacy Scene

```text
SCENE 03
VISUAL STATUS: DIRECTED
M5 PROVENANCE: ABSENT
RESULT: UNRESOLVED
WHY: Final visual state exists, but decision origin cannot be attributed safely.
```

### Blocked family

```text
SCENE 02 → SCENE 03
SPACE changes materially
COMPILER SUPPORT: BLOCKED / PARTIAL
RESULT: UNRESOLVED
WHY: Exact spatial authorship cannot be inferred from current grammar evidence.
```

### Provenance divergence

```text
M5 PROVENANCE
camera.perspective = MIXED
source = COMPILER

CURRENT FINAL SCENE STATE
camera.perspective = CHARACTER

RESULT
UNRESOLVED
WHY
The final value no longer matches its recorded decision origin.
```

## 13. FAIL semantics

M6 v1 should use `FAIL` sparingly. No initial rule automatically produces `FAIL` unless an invariant is structurally impossible or provenance contradicts a validated compiler-owned contract in a way that can be proven from persisted data.

Examples that may justify `FAIL` later include corrupted provenance that claims a compiler-owned path was written by AI after validator acceptance. Such conditions belong to contract-integrity validation and must be supported by deterministic proof, not heuristic disagreement.

Therefore the initial M6 rule set may produce `PASS`, `WARN`, and `UNRESOLVED` while preserving the `FAIL` enum for future hard invariant violations.

## 14. API boundary

Create a focused module:

```text
visual-direction-os/project-intelligence.js
```

Expected public surface:

```js
normalizeSceneIntelligence(scene, options?)
deriveBoundaryIntelligence(previousSceneRecord, currentSceneRecord)
deriveProjectIntelligence(projectState)
```

Expected top-level result:

```js
{
  schemaVersion: '0.1.0',
  mode: 'shadow',
  status,
  sceneOrder,
  scenes,
  boundaries,
  findings
}
```

`deriveProjectIntelligence()` must treat all input as immutable. Running it twice with the same input must return deep-equal output.

## 15. Relationship to Project Continuity

The two systems answer different questions.

### Project Continuity

```text
What changed between final directed Scene states?
Does the change appear structurally coherent?
```

### Project Intelligence

```text
Why did the change happen?
Which system owned the decision?
Was the visual response compiler-backed, AI-completed, blocked, legacy, or unknown?
Does the ownership consequence follow the current Scene narrative cause?
```

A boundary may therefore have:

```text
CONTINUITY: PASS
PROJECT INTELLIGENCE: UNRESOLVED
```

when final states look coherent but provenance is missing.

It may also have:

```text
CONTINUITY: WARN
PROJECT INTELLIGENCE: PASS
```

when an abrupt change is fully justified by a confirmed current-Scene narrative cause and compiler-backed ownership transfer. M6 must not force these systems to agree.

## 16. UI design

Project Workspace order:

```text
PROJECT ARC
↓
CONTINUITY
↓
PROJECT INTELLIGENCE · SHADOW
```

The new inspector is lower visual weight than the primary Project Arc and should be concise by default.

### 16.1 Boundary card

```text
SCENE 02 → SCENE 03                         PASS

CAUSE · CURRENT SCENE
WORLD → CONTESTED

VISUAL RESPONSE
CAMERA · WORLD → MIXED
COMPILER-BACKED

OWNERSHIP CONSEQUENCE
FRAME AUTHORITY BECOMES CONTESTED

WHY
The visual transfer follows the confirmed narrative agency change.
```

### 16.2 Expanded detail

Expandable detail may show:

- from/to Scene IDs and roles
- previous ending agency / current starting agency handoff
- current Scene agency transition
- grammar IDs
- provenance status
- compiler-owned families
- AI-completed families
- blocked families
- exact evidence source per compared visual response
- provenance/final-state divergence when present
- legacy / missing explanation

### 16.3 UI prohibitions

- No numeric coherence score.
- No red/green traffic-light simplification that hides `UNRESOLVED`.
- No `Fix automatically` button.
- No recommendation to unify Grammars solely for consistency.
- No hidden mutation from clicking a finding.

## 17. Runtime integration

Preferred integration is read-only subscription to Project Store / Project Workspace render state.

Project Intelligence recomputes when one of these changes:

- Project Scene order changes
- a Scene snapshot is captured
- a Scene becomes directed
- stored Narrative/Sequence/Scene snapshot changes

It must not trigger Scene capture itself, switch Scenes, or mark a Scene as directed.

## 18. Testing strategy

### 18.1 Unit tests — normalization

Cover:

- compiler-first Scene with Camera provenance
- AI-completed family
- blocked family
- legacy directed Scene
- incomplete/missing compiler-first data
- explicit grammar ID only; no grammar inference from final state
- provenance/final-state divergence downgrades origin to `unknown`
- input immutability
- deterministic repeatability

### 18.2 Unit tests — boundary rules

Required initial cases:

1. Current Scene `WORLD → CONTESTED` narrative transition + compiler-backed `camera WORLD → MIXED` final-state change → `PASS`.
2. Current Scene stays `WORLD → WORLD` + compiler-backed `camera WORLD → CHARACTER` final-state change → `WARN`.
3. Current Scene narrative agency changes but relevant supported visual response is absent → `WARN`.
4. Same narrative case but relevant family is blocked → `UNRESOLVED`, not `WARN`.
5. Previous ending agency and current starting agency disagree → `WARN`.
6. One handoff side missing → `UNRESOLVED`.
7. Grammar changes Camera-led → Color-led with otherwise valid boundary → no grammar-change warning.
8. Legacy directed Scene → `UNRESOLVED`, never `FAIL` merely for lacking provenance.
9. Stored compiler value differs from final Scene State → `UNRESOLVED` and source `unknown`.

### 18.3 Integration tests

- Existing `deriveProjectArc()` output remains unchanged for existing fixtures.
- Existing `deriveContinuity()` output remains unchanged for existing fixtures.
- Project Intelligence reads M5 provenance but does not alter it.
- Running intelligence does not mutate Project State.

### 18.4 Browser acceptance

Browser tests must prove:

- Project Workspace renders `PROJECT INTELLIGENCE · SHADOW` after Continuity.
- A compiler-first demo Project shows at least one provenance-aware boundary explanation.
- A legacy/missing-provenance Scene renders `UNRESOLVED` without blocking the rest of Project Workspace.
- Provenance/final-state divergence is shown as `UNRESOLVED`, never mislabeled compiler-backed.
- Switching Scenes still restores Scene/Narrative/Sequence state correctly.
- Project Intelligence interaction does not mutate canonical Scene State.
- Existing rail, Narrative, M3, M4, M5, Project Arc, Continuity, and Sequence Director acceptance remains green.

## 19. CI requirements

M6 files must join the existing Director Intelligence CI in the same categories used by prior milestones:

- contracts / Node tests
- runtime syntax
- Pages assembly
- browser acceptance

No completion claim is valid until a fresh exact-HEAD run passes all required jobs.

## 20. Compatibility and migration

No destructive migration is allowed.

- Old Projects with only final Scene State remain valid.
- Missing provenance downgrades intelligence confidence to `UNRESOLVED`; it does not invalidate the Project.
- Existing Project contracts remain accepted unless a backward-compatible optional field is explicitly required later.
- Prefer deriving M6 records at runtime instead of persisting duplicated intelligence output into Project State.

## 21. Security / integrity boundary

M6 consumes provenance as evidence but does not trust impossible combinations blindly. If stored provenance violates a validated M5 invariant, M6 should surface an integrity finding rather than silently normalize it into a valid compiler-backed state.

Initial implementation keeps this validation narrow and deterministic; heuristic or probabilistic provenance repair is out of scope.

## 22. Success criteria

M6 is complete when all of the following are true:

1. Project Intelligence exists as a separate, read-only module.
2. It derives deterministic Scene and boundary intelligence records.
3. It distinguishes compiler-backed, AI-completed, blocked, legacy, and unknown origins without guessing.
4. It evaluates cross-Scene relationships as cause → visual response → ownership consequence.
5. It keeps handoff continuity distinct from current-Scene narrative cause.
6. It does not penalize Grammar changes by themselves.
7. Unsupported families remain `UNRESOLVED`.
8. Provenance/final-state divergence is not mislabeled as compiler-backed or AI-completed.
9. Existing Project Arc and Continuity behavior is unchanged.
10. Project Workspace displays the new Shadow inspector without redesigning the existing shell.
11. No Project/Scene mutation occurs during analysis or inspection.
12. Fresh exact-HEAD CI passes contracts, syntax, Pages assembly, and browser acceptance.
13. The branch remains isolated and no merge occurs without explicit user approval.

## 23. Deferred work

The following belong after M6 proves that Project-level causal interpretation is reliable:

- Project Compiler / Project-level authority
- cross-Scene prompt compilation
- Project-wide generation planning
- automatic repair suggestions
- cross-Scene visual QA feedback loops
- project-level generation/re-generation decisions

M6 intentionally stops before those authority-bearing behaviors.
