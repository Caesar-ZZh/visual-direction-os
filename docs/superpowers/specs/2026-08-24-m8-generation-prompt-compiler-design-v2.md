# M8 Generation Prompt Compiler Design — Normative v2

**Status:** Awaiting written-spec review before implementation planning  
**Normative:** Yes. This document supersedes `2026-08-24-m8-generation-prompt-compiler-design.md` in full.  
**Branch:** `phase2/m8-generation-prompt-compiler`  
**Baseline:** `8551f0262d6a0ee7078f78e5f9957acb3afbbd0a` on `integration/director-workspace-v2-1`  
**Depends on:** Visual IR v0.3.0, M5 Compiler-first Sequence Synthesis, M6 Project Intelligence · Shadow, M7 Guarded Project Constraint Authority  
**Objective:** Translate already-established directing truth into auditable, provider-neutral Generation Prompt IR and deterministic Prompt Packages without creating new visual truth, escalating authority, filling UNKNOWN fields, or bypassing the explicit Apply boundary.

---

## 1. Why M8 exists

Visual Direction OS already separates narrative interpretation, Director confirmation, evidence-aware Grammar, deterministic compiler expectations, AI-open Sequence completion, guarded Project constraints, and explicit Apply. Generation must not collapse those distinctions back into one opaque natural-language prompt.

M8 therefore introduces:

```text
Structured Generation Prompt IR
+
Deterministic Renderer
```

The Prompt Compiler is a **translation authority**, not a directing authority.

```text
PROMPT COMPILER
=
TRANSLATION AUTHORITY

≠
DIRECTING AUTHORITY
```

M8 may express existing truth. It may not invent a lens, angle, palette, hue, lighting concept, texture, medium, composition, visual style, or ownership state that upstream authority did not establish.

Core invariant:

```text
authority(output) MUST NOT exceed authority(input)
```

---

## 2. Selected architecture

```text
Confirmed Reading
+
Selected Strategy
+
Visual IR
+
M5 Sequence Proposal
+
M5 Sequence Provenance
+
Current M7 Constraint Resolution
+
Current Sequence Apply Evidence
        ↓
SOURCE / FRESHNESS VALIDATION
        ↓
GENERATION PROMPT IR
        ↓
AUTHORITY VALIDATION
        ↓
DETERMINISTIC RENDERER
        ↓
DRAFT / READY / BLOCKED PROMPT PACKAGE
        ↓
M9 PROVIDER ADAPTER
        ↓
Image / Video Generation Runtime
```

Rejected alternatives:

1. **Direct M5 → prompt string.** Rejected because provenance and authority disappear into prose.
2. **Provider-specific Prompt Compiler.** Rejected because model syntax and generation parameters belong to M9.

M8 does not call an LLM and does not perform provider-specific prompt optimization.

---

## 3. Runtime position

M8 is downstream of completed M5 Sequence assembly and M7 authority, but upstream of M9 Generation.

```text
Narrative Reading
↓
Selected Strategy
↓
Visual IR
↓
M5 Sequence Skeleton
↓
M7 Guard
↓
AI Completion
↓
M5 Assembler
↓
Sequence Proposal + Provenance
↓
M8 Prompt Compiler Preview
↓
DRAFT Beat Prompt Packages
↓
Director chooses Apply all / Apply selected
↓
Sequence Director receives only selected Beats
↓
M8 records explicit per-Beat Apply evidence
↓
M8 recompiles affected Beats
↓
READY / BLOCKED per Beat
↓
M9 Generation
```

M8 does **not** participate in the M5 Sequence AI request. The existing M7 guard remains before `beginRequest('sequence')`.

---

## 4. Existing Apply semantics are partial and Beat-scoped

Current product behavior is authoritative for M8 design:

- Apply supports **Apply all** and **Apply selected**.
- Only selected proposal Beats are written into Sequence Director.
- Unselected Beats remain unchanged.
- After Sequence Director update, canonical Scene State is updated only for the Beat at the current playhead.

Therefore M8 must not treat “Apply happened” as proof that all five Beats are generation-authorized.

Formal rule:

```text
Generation readiness is PER BEAT.
```

Examples:

```text
Apply all
→ all five Beat packages may become READY if their own validation passes.
```

```text
Apply selected: RUPTURE + RELEASE
→ RUPTURE / RELEASE may become READY.
→ SETUP / PRESSURE / NEW OWNERSHIP remain DRAFT.
```

A Scene Prompt Set may contain mixed Beat states. M8 v1 does not introduce a fourth Beat package state such as PARTIAL; the set UI may summarize counts while each Beat remains DRAFT / READY / BLOCKED.

---

## 5. Sequence Apply Evidence

### 5.1 Why explicit Apply evidence is required

Existing Narrative State stores proposal artifacts and Apply-selection UI state, but it does not persist an auditable receipt proving which proposal revision / provenance entered Sequence Director.

M8 may not infer this from button text or assume that a matching value means an explicit Apply occurred.

M8 therefore adds a lightweight **Sequence Apply Evidence** record.

This record is action provenance only. It is not Scene visual truth and never becomes a visual owner.

### 5.2 State shape

Recommended Narrative State extension:

```js
sequenceApplyState: {
  schemaVersion: '0.1.0',
  revision: 3,
  beats: {
    rupture: {
      beatId: 'rupture',
      applyRevision: 2,
      source: {
        readingId: 'reading-02',
        strategyId: 'strategy-01',
        grammarId: 'camera-authority-transfer',
        sequenceOrigin: 'compiler-first',
        skeletonVersion: '0.1.0'
      },
      proposalBeatFingerprint: 'pbeat-...',
      provenanceFingerprint: 'pprv-...',
      sequenceDirectorBeatFingerprint: 'sbeat-...'
    }
  }
}
```

Rules:

1. `revision` increments once per explicit Apply action.
2. A receipt is written only for Beat IDs selected by that explicit Apply.
3. Applying another subset from the same current proposal preserves valid receipts for unselected Beats and replaces receipts for newly applied Beats.
4. Any upstream change that invalidates/clears the current Sequence Proposal also clears current `sequenceApplyState`.
5. No timestamp participates in semantic identity.
6. Receipt fingerprints use deterministic canonical content identity, not DOM state.
7. Receipt creation never writes a new Scene visual value.
8. Receipt state is persisted with the Narrative runtime snapshot so Scene switching/restoration does not silently lose Apply authority.

### 5.3 Receipt source

Receipt creation must use the exact guarded proposal actually passed into `buildSequenceFromProposal`, not an earlier raw AI proposal.

For compiler-resolved flows:

```text
M4 guarded resolvedProposal
→ Apply-selected Beat
→ Sequence Director Beat
→ Apply Evidence
```

For unresolved compiler flows, M8 may still preview DRAFT packages, but a Beat cannot become READY if the resulting generation contract lacks the required source/provenance guarantees defined in Section 21.

### 5.4 No new owner

Sequence Apply Evidence may appear in Prompt provenance as:

```js
applyEvidence: {
  applyRevision: 2,
  beatId: 'rupture'
}
```

It must never become:

```js
owner: 'apply'
owner: 'project'
```

---

## 6. Prompt IR unit and Scene Prompt Set

M8 v1 compiles one Prompt IR per:

```text
Scene × Beat
```

Canonical Beats remain:

```text
SETUP
PRESSURE
RUPTURE
RELEASE
NEW OWNERSHIP
```

Recommended public functions:

```js
compileBeatPrompt(...)
compileSequencePrompts(...)
```

`compileSequencePrompts` returns an ordered five-Beat Scene Prompt Set. It does not choose image count, shot count, keyframe count, or video duration.

---

## 7. Prompt IR schema

```js
{
  schemaVersion: '0.1.0',
  mode: 'generation-translation',

  sceneId: 'scene-03',
  beatId: 'setup',

  compileState: {
    phase: 'proposal' | 'applied',
    applyRevision: null | 2
  },

  source: {
    readingId: 'reading-02',
    strategyId: 'strategy-01',
    grammarId: 'camera-authority-transfer',
    sequenceOrigin: 'compiler-first',
    skeletonVersion: '0.1.0',
    projectConstraints: [
      {
        constraintId: 'constraint-camera-001',
        revision: 1,
        result: 'satisfied'
      }
    ]
  },

  content: {
    sceneDescription: { ... },
    beatRealization: { ... },
    visualEvents: [ ... ]
  },

  intent: { ... },

  required: [],
  guided: [],
  open: [],
  blocked: [],
  antiRules: [],

  provenance: {
    applyEvidence: null | { ... }
  },

  readiness: {
    status: 'DRAFT' | 'READY' | 'BLOCKED',
    reasons: []
  },

  fingerprint: 'pir-...'
}
```

Prompt IR is a structured snapshot of generation-facing directing truth, not merely an AST for prose.

---

## 8. Content authority remains separate from visual authority

Generation needs both:

```text
WHAT EXISTS / HAPPENS
and
HOW IT IS VISUALLY DIRECTED
```

M8 preserves them separately.

```js
content: {
  sceneDescription: {
    value: '...',
    owner: 'director',
    source: 'narrative-input'
  },
  beatRealization: {
    value: '...',
    owner: 'ai',
    source: 'sequence-completion'
  },
  visualEvents: [ ... ]
}
```

Rules:

1. Director-provided Scene description remains the highest content source.
2. AI `narrativeBeat` / `visualEvents` are realization guidance and do not overwrite Director-provided facts.
3. Sequence AI prose never becomes newly confirmed story truth merely because M8 renders it.
4. Strong content authority never implies unsupported exact visual authority.

---

## 9. Prompt authority classes

M8 v1 defines exactly five semantic classes:

```text
REQUIRED
GUIDED
OPEN
BLOCKED
ANTI-RULE
```

These are not model weights.

### 9.1 REQUIRED / structural

Sources:

- Director-confirmed Reading;
- Director-selected Strategy;
- canonical Beat structural identity.

Example:

```js
{
  kind: 'structural',
  key: 'primaryVariable',
  value: 'camera',
  owner: 'director-confirmed',
  authorityClass: 'required'
}
```

Structural REQUIRED may define priority, mechanism, support, and restraint. It may not derive unsupported exact values.

```text
PRIMARY VARIABLE = CAMERA
```

does not authorize:

```text
low angle
35mm lens
handheld
```

### 9.2 REQUIRED / exact

Source:

- M5 Sequence provenance says `owner: compiler`, `support: supported`;
- matching exact value exists in that Beat's guarded Sequence Proposal patch.

Example:

```js
{
  kind: 'exact',
  path: 'camera.perspective',
  value: 'mixed',
  owner: 'compiler',
  support: 'supported',
  authorityClass: 'required',
  projectSupport: [ ... ]
}
```

Only supported compiler evidence can create Exact REQUIRED values in M8 v1.

### 9.3 GUIDED

Sources include:

- M5 open fields with `owner: ai`;
- AI `narrativeBeat`;
- AI `visualEvents`;
- other validated AI-open Beat realization details.

Example:

```js
{
  path: 'color.temperature',
  value: 'cool',
  owner: 'ai',
  authorityClass: 'guided'
}
```

GUIDED can influence generation but cannot be phrased or validated as compiler-required truth.

### 9.4 OPEN

OPEN represents intentional generation freedom.

Typical source:

```js
{
  value: 'UNKNOWN',
  status: 'unknown',
  evidenceStatus: 'unresolved'
}
```

Default renderer behavior:

```text
OPEN → omit from generation text
```

OPEN does not block READY.

### 9.5 BLOCKED

BLOCKED means current authority does not permit exact assertion on the path.

Default renderer behavior:

```text
BLOCKED
→ inspector / validator metadata only
→ no positive instruction
→ no invented negative instruction
```

### 9.6 ANTI-RULE

Only explicit evidence-aware Grammar anti-rules become canonical negative guidance in M8 v1.

M8 does not invent generic negative prompts.

---

## 10. Owner and authority class are independent

Example:

```js
{
  path: 'camera.perspective',
  value: 'mixed',
  owner: 'compiler',
  authorityClass: 'required'
}
```

A SATISFIED M7 Project constraint may support that existing compiler field:

```js
projectSupport: [
  {
    constraintId: 'constraint-camera-001',
    revision: 1,
    result: 'satisfied'
  }
]
```

but must never create:

```js
owner: 'project'
```

Project constraint authority remains a guard/consistency authority, not a new exact-value owner.

---

## 11. Formal source mapping

| Source | Prompt class | Owner | Behavior |
| --- | --- | --- | --- |
| Director narrative input | Content | director | Preserve Scene content |
| Confirmed Reading | REQUIRED structural | director-confirmed | Preserve meaning |
| Selected Strategy | REQUIRED structural | director-confirmed | Preserve mechanism/priority/support/restraint |
| M5 compiler field | REQUIRED exact | compiler | Preserve exact value |
| M5 AI field | GUIDED | ai | Render weak guidance |
| AI narrativeBeat / visualEvents | GUIDED content realization | ai | Preserve as Beat guidance |
| SATISFIED M7 constraint | support annotation | no new owner | Support matching compiler field only |
| Visual IR UNKNOWN | OPEN | none | Preserve freedom; omit from text |
| M5 blocked slot | BLOCKED | none | Prohibit exact assertion; omit from text |
| Grammar antiRules | ANTI-RULE | grammar/evidence | Canonical negative guidance |
| Apply Evidence | action provenance | none | Proves Beat crossed explicit Apply only |

---

## 12. Authority escalation failures

The following are invalid:

```text
AI → REQUIRED
UNKNOWN → concrete directive
BLOCKED → positive directive
BLOCKED → invented negative directive
Project support → owner: project
Apply evidence → visual owner
Structural REQUIRED → unsupported Exact REQUIRED
```

The validator fails closed with:

```text
AUTHORITY_ESCALATION
```

where the violation is an authority promotion.

---

## 13. Deterministic renderer contract

The canonical renderer is pure.

```text
same validated Prompt IR
→ byte-identical canonical output
```

It does not:

- call an LLM;
- use randomness;
- choose synonyms;
- infer missing values;
- add provider syntax;
- add aesthetic/quality adjectives;
- optimize prompt wording by model.

Canonical section order:

```text
01 SCENE CONTENT
02 NARRATIVE BEAT
03 DIRECTING PRIORITY
04 REQUIRED VISUAL BEHAVIOR
05 VISUAL GUIDANCE
06 AVOID
```

The renderer returns:

```js
rendered: {
  rendererVersion: '0.1.0',
  neutralText: '...',
  negativeText: '...',
  sections: {
    content: '...',
    narrativeBeat: '...',
    directingPriority: '...',
    required: '...',
    guided: '...',
    avoid: '...'
  }
}
```

`negativeText` contains only explicit ANTI-RULE guidance.

---

## 14. Controlled Prompt Language Registry

M8 introduces:

```text
prompt-language-registry.js
```

It maps canonical exact supported path/value pairs to canonical mechanism language.

Example:

```js
{
  'camera.perspective': {
    world: 'Keep camera authority primarily with the environment.',
    mixed: 'Maintain mixed camera authority between world and character.',
    character: 'Keep camera authority primarily with the character.'
  },
  'color.territory': {
    world: 'Let the world hold the active color territory.',
    mixed: 'Maintain contested color territory between world and character.',
    character: 'Let the character hold the active color territory.'
  }
}
```

Rules:

1. Exact REQUIRED values require explicit canonical mappings.
2. Registry phrases describe mechanisms, not provider prompt tricks.
3. Color ownership never infers hue/saturation.
4. Camera authority never infers angle/lens/movement unless a future upstream contract supplies those exact paths.
5. Phrase changes that affect canonical output require a renderer/language contract version change.

Missing Exact REQUIRED mapping:

```text
UNRENDERABLE_REQUIRED_VALUE
→ BLOCKED
```

GUIDED fields may use a deterministic weak wrapper preserving their validated value verbatim.

---

## 15. OPEN, BLOCKED, and anti-rules

OPEN and BLOCKED remain visible in STRUCTURE UI but are omitted from canonical generation text.

M8 must not render:

```text
Medium: unspecified
Choose an appropriate texture
Do not use camera perspective
```

unless such wording is explicitly supported by another upstream source.

ANTI-RULE is the only canonical v1 negative-guidance source.

---

## 16. Directing hierarchy and restrained variables

Strategy structure must survive rendering.

Example:

```text
PRIMARY
Camera

SUPPORT
Space

RESTRAIN
Texture / FX
```

may deterministically render as:

```text
Camera carries the primary visual change.
Space may support that change.
Keep Texture and FX subordinate.
```

“Restrain Texture” does not mean “smooth,” “low,” or “none.”

---

## 17. Forbidden automatic prompt vocabulary

The renderer must not inject generic prompt-quality/style terms such as:

```text
masterpiece
best quality
cinematic
epic
dramatic
beautiful
ultra detailed
8K
photorealistic
professional lighting
award-winning
```

If a Director literally wrote such text in Scene content, content preservation may retain it. The renderer itself must never introduce it.

---

## 18. Beat differentiation

Five Beat packages differ only because upstream data differs.

Legal Beat-difference sources:

1. M5 `narrativeBeat`;
2. M5 `visualEvents`;
3. Beat Scene patch;
4. Beat compiler expectations/provenance;
5. Beat-scoped Project support;
6. Beat Apply evidence/readiness.

Illegal difference source:

```text
renderer decides later Beats should sound more intense / dramatic / cinematic
```

Invariant:

```text
Beat differentiation comes from data, not prose escalation.
```

---

## 19. Fingerprints

M8 uses deterministic content fingerprints for audit and freshness.

Required identities include:

```text
pir-...     Prompt IR semantic identity
pbeat-...   proposal Beat identity
pprv-...    relevant Beat provenance identity
sbeat-...   applied Sequence Director Beat identity
```

Canonicalization requirements:

- recursively sort object keys;
- preserve array order;
- preserve normalized primitives/null;
- omit undefined object properties;
- no timestamps;
- no insertion-order dependence.

The implementation plan may reuse the existing deterministic canonicalization/FNV-1a 64-bit convention established by M7 unless a stronger repo-local reason is found during implementation planning. Whatever algorithm is selected becomes explicit test-covered contract behavior before production code is written.

`pir-*` must include generation-relevant source identity:

- Scene ID;
- Beat ID;
- Reading ID;
- Strategy ID;
- Grammar ID;
- relevant Visual IR signals;
- proposal Beat;
- Beat provenance;
- applicable Project constraint IDs/revisions/results;
- explicit anti-rules;
- Prompt IR/language/renderer contract versions.

Fingerprint is an audit/content identity, not a security signature.

---

## 20. Per-Beat Apply reconciliation

A Beat may become READY only when its current Apply Evidence still matches current authoritative runtime sources.

For Beat `B`, M8 checks:

```text
Apply Evidence exists for B
AND
receipt proposalBeatFingerprint == current guarded proposal Beat fingerprint
AND
receipt provenanceFingerprint == current relevant provenance fingerprint
AND
receipt sequenceDirectorBeatFingerprint == current Sequence Director Beat fingerprint
```

If any identity differs without a newer explicit Apply:

```text
BEAT_APPLY_EVIDENCE_STALE
→ BLOCKED
```

The user must explicitly Apply the current Beat again. M8 does not auto-reapply.

Unapplied Beat:

```text
no current receipt
→ DRAFT
```

This is not an error.

---

## 21. Current Scene State reconciliation

Canonical Scene State represents the current playhead Beat, not all five Beats simultaneously.

Therefore Scene State reconciliation is scoped:

### 21.1 Current playhead Beat

If the package Beat is the current applied `sceneState.narrativeState` / current Sequence Beat, M8 additionally checks generation-relevant Scene State values against the applied Sequence/Beat provenance.

Unexpected divergence:

```text
SCENE_PROVENANCE_DIVERGENCE
→ BLOCKED for that Beat
```

M8 must not silently relabel the new value as `owner: director`.

### 21.2 Non-current applied Beat

For a non-current Beat, current Scene State is not evidence about that Beat. Readiness instead relies on:

- current Apply Evidence;
- current Sequence Director Beat identity;
- current M5 source/provenance identity;
- current M7 scope where applicable.

M8 must not compare a non-current Beat package against the Scene State of another active Beat.

### 21.3 Explicit Director Override Provenance

A future explicit Director Override Provenance system may authorize post-Apply manual DIRECT changes. It is outside M8 v1.

Until such a contract exists, unexplained current-Beat divergence blocks that Beat.

---

## 22. M7 freshness reconciliation

M7 support is re-resolved at Prompt compile time.

For each Beat-scoped referenced Project constraint:

```text
current SATISFIED
→ keep support annotation
```

```text
current STALE
→ PROJECT_CONSTRAINT_STALE
→ BLOCKED for affected Beat
```

```text
current CONFLICT
→ PROJECT_CONSTRAINT_CONFLICT
→ BLOCKED for affected Beat
```

M8 does not revoke, release, reconfirm, switch Grammar, downgrade REQUIRED, or ask AI to arbitrate.

A Project failure only blocks the scope it actually governs unless the same evidence change independently invalidates whole-Scene source identity.

---

## 23. Readiness state machine

Every Beat package exposes exactly:

```text
DRAFT
READY
BLOCKED
```

### DRAFT

Typical reasons:

- valid proposal exists but Beat has never been explicitly applied;
- current proposal Beat is newer than any prior receipt and awaits Apply.

DRAFT is inspectable but not generation-authorized.

### READY

For Beat `B`, all relevant conditions must hold:

1. Visual IR validates.
2. Reading/Strategy/Grammar source identities match current proposal/provenance.
3. current Sequence Proposal validates.
4. compiler-first Sequence provenance exists where required by v1 authority mapping.
5. B has current matching Apply Evidence.
6. current Sequence Director Beat for B still matches receipt.
7. if B is the current Scene Beat, current Scene State matches applied generation-relevant provenance.
8. all referenced M7 constraints scoped to B are currently SATISFIED.
9. no relevant M7 STALE/CONFLICT exists for B.
10. every Exact REQUIRED value has a canonical language mapping.
11. Prompt IR validates without authority escalation.
12. deterministic renderer succeeds.

### BLOCKED

Authority contradiction, stale Apply evidence, stale/conflicting Project support, source/provenance invalidity, current-Beat Scene divergence, or unrenderable Exact REQUIRED makes that Beat BLOCKED.

M8 v1 does not use `READY_WITH_WARNINGS`.

---

## 24. Incomplete direction does not block READY

The following are valid by themselves:

- Visual IR UNKNOWN;
- Prompt IR OPEN fields;
- missing exact values in unowned dimensions;
- no GUIDED values;
- empty supporting variables;
- unknown/unavailable anti-rules;
- intentionally unowned visual dimensions.

Formal rule:

```text
Incomplete direction is valid.
Contradictory authority is not.
```

---

## 25. Failure taxonomy

### Source / Apply

```text
PROMPT_SOURCE_INVALID
VISUAL_IR_INVALID
SEQUENCE_PROVENANCE_MISSING
BEAT_APPLY_EVIDENCE_STALE
SCENE_PROVENANCE_DIVERGENCE
```

### Project authority

```text
PROJECT_CONSTRAINT_STALE
PROJECT_CONSTRAINT_CONFLICT
```

### Compilation

```text
PROMPT_IR_INVALID
AUTHORITY_ESCALATION
UNRENDERABLE_REQUIRED_VALUE
```

### Render

```text
PROMPT_RENDER_FAILED
PROMPT_LANGUAGE_MAPPING_MISSING
```

Missing specialized GUIDED wording does not block because deterministic verbatim fallback is permitted. Missing Exact REQUIRED wording does block.

---

## 26. No automatic repair

When a Beat is BLOCKED, M8 must not automatically:

- Apply or reapply the Beat;
- change Grammar;
- revoke/release/reconfirm a Project constraint;
- downgrade REQUIRED;
- change BLOCKED to OPEN;
- infer a missing exact value;
- call an LLM rewrite;
- rollback a Director edit;
- overwrite Scene State;
- fabricate provenance.

The UI only explains the owning issue and directs the user to the correct upstream decision surface.

---

## 27. Prompt Package

```js
{
  schemaVersion: '0.1.0',
  promptIR: { ... },
  rendered: {
    rendererVersion: '0.1.0',
    neutralText: '...',
    negativeText: '...',
    sections: {
      content: '...',
      narrativeBeat: '...',
      directingPriority: '...',
      required: '...',
      guided: '...',
      avoid: '...'
    }
  },
  provenance: {
    requiredFields: [ ... ],
    guidedFields: [ ... ],
    projectConstraintRefs: [ ... ],
    applyEvidence: null | { ... }
  },
  readiness: {
    status: 'DRAFT' | 'READY' | 'BLOCKED',
    reasons: [ ... ]
  },
  fingerprint: 'pir-...'
}
```

Prompt Packages are derived artifacts. Rendered prompt text is not persisted as canonical Scene truth.

---

## 28. Module boundaries

### `generation-prompt-ir.js`

Pure:

- normalize source inputs;
- map REQUIRED/GUIDED/OPEN/BLOCKED/ANTI-RULE;
- separate content authority;
- validate authority;
- canonicalize/fingerprint Prompt IR.

### `prompt-language-registry.js`

Pure, versioned semantic language contract:

- exact supported path/value phrases;
- structural hierarchy/restraint phrases;
- no provider syntax;
- no generic prompt hacks.

### `generation-prompt-renderer.js`

Pure:

- fixed section order;
- Exact REQUIRED registry rendering;
- GUIDED safe fallback;
- OPEN/BLOCKED omission;
- anti-rule negative guidance;
- deterministic neutralText/negativeText/sections.

### `generation-prompt-apply-evidence.js`

Pure helper:

- create/update per-Beat Apply Evidence from the exact guarded proposal and resulting Sequence Director Beat;
- validate receipt state;
- calculate deterministic proposal/provenance/Sequence Beat fingerprints;
- never mutate Scene visual values.

### `generation-prompt-compiler.js`

Pure orchestration boundary:

- source identity validation;
- Apply Evidence reconciliation;
- current Beat Scene reconciliation;
- current M7 reconciliation;
- Prompt IR compilation;
- rendering;
- DRAFT / READY / BLOCKED derivation.

### `generation-prompt-inspector.js`

Render-only UI:

- Beat tabs;
- package state;
- STRUCTURE / RENDERED;
- Content / Required / Guided / Open / Blocked / Project support / Apply evidence;
- failure explanation;
- no directing mutation.

### `generation-prompt.css`

Existing Director/Narrative visual language only.

### Existing-file integration

Implementation will minimally extend:

- `narrative-state.js` with `sequenceApplyState` and explicit receipt update/clear APIs;
- `narrative-workspace.js` to expose the receipt action needed by Apply UI and to render Prompt Preview;
- `narrative-apply-ui.js` so explicit Apply records only the selected Beats after successful Sequence Director update;
- bootstrap/dependency loading and CI/browser suites.

M4 guarded authority semantics remain unchanged.

---

## 29. UI location

M8 appears below Sequence Preview in NARRATIVE, not in Project Workspace and not as a new top-level mode.

```text
SEQUENCE

SETUP
PRESSURE
RUPTURE
RELEASE
NEW OWNERSHIP

↓

GENERATION PROMPT · PREVIEW
```

Default UI emphasizes structured explanation rather than a black-box prompt textbox.

```text
GENERATION PROMPT · DRAFT / READY / BLOCKED

[ SETUP ] [ PRESSURE ] [ RUPTURE ] [ RELEASE ] [ NEW OWNERSHIP ]

CONTENT
REQUIRED
GUIDED
OPEN
BLOCKED
PROJECT SUPPORT
APPLY EVIDENCE
```

Secondary view:

```text
STRUCTURE | RENDERED
```

OPEN/BLOCKED are visible in STRUCTURE even though omitted from canonical generation text.

M8 v1 contains no Generate button. M9 may add a generation action only for READY Beat packages.

---

## 30. UI readiness after partial Apply

Example:

```text
SETUP         DRAFT
PRESSURE      DRAFT
RUPTURE       READY
RELEASE       READY
NEW OWNERSHIP DRAFT
```

If the Director later changes the proposal/source, affected stale receipts no longer authorize generation.

If current RUPTURE Scene State is manually changed away from applied provenance:

```text
RUPTURE → BLOCKED · SCENE_PROVENANCE_DIVERGENCE
```

Non-current RELEASE is not compared against RUPTURE's current Scene State.

---

## 31. M9 provider boundary

M9 may transform a READY Prompt Package into provider request syntax.

Allowed examples:

- request shape;
- native negative-prompt field;
- seed;
- aspect ratio;
- resolution;
- steps;
- CFG/equivalent technical parameter;
- model ID;
- image/video transport syntax.

M9 may not:

- add style;
- invent camera/lens/angle;
- invent palette/hue/saturation;
- invent texture/medium/lighting;
- change ownership/agency;
- promote GUIDED;
- fill OPEN as if it were M8 truth;
- create Project ownership.

```text
Provider Adapter
=
transport / syntax authority

≠
visual direction authority
```

---

## 32. Mechanism/IP-neutral constraints

M8 inherits prior project rules. It must not:

- request copyrighted creator/IP style imitation;
- use trademarked character identity as a substitute for mechanism;
- add global watercolor/graffiti/collage/halftone shortcuts;
- infer emotion→fixed hue;
- infer Texture→Medium;
- infer Line→Boundary;
- infer Intensity→exact Space;
- infer a universal comic outline;
- homogenize host-world and character-local medium without supported authority.

Canonical language describes mechanism, ownership, territory, hierarchy, restraint, surface assignment, agency, and supported exact state.

---

## 33. TDD acceptance gates

### Gate 1 — Prompt IR mapping

RED→GREEN tests prove:

```text
Director Scene content remains separate from AI Beat realization
compiler field → REQUIRED / owner compiler
AI field → GUIDED / owner ai
UNKNOWN → OPEN
blocked slot → BLOCKED
M7 SATISFIED → support annotation only
Apply Evidence → action provenance only
```

Also prove no `owner: project` or `owner: apply` is produced.

### Gate 2 — Authority escalation

Reject:

```text
AI → REQUIRED
UNKNOWN → concrete REQUIRED
BLOCKED → positive directive
BLOCKED → invented negative directive
Project support → project-owned exact value
Apply receipt → exact visual owner
Structural REQUIRED → unsupported Exact REQUIRED
```

### Gate 3 — Apply Evidence

Tests prove:

1. Apply all writes current receipts for all five Beats.
2. Apply selected writes receipts only for selected Beats.
3. Progressive selected Apply preserves still-current receipts for previously applied Beats.
4. upstream Sequence invalidation clears receipts.
5. receipt identity uses the exact guarded proposal used by Apply.
6. changed Sequence Director Beat without explicit reapply makes receipt stale.
7. receipt survives Narrative runtime snapshot/restore.

### Gate 4 — Renderer

Tests prove:

- same IR → byte-identical output;
- fixed section order;
- OPEN omitted;
- BLOCKED omitted;
- antiRules → negativeText;
- unrenderable Exact REQUIRED → fail closed;
- GUIDED unmapped value → deterministic verbatim fallback;
- renderer injects none of the forbidden generic quality/style terms unless literal Director content contains them.

### Gate 5 — Five-Beat compilation and partial Apply readiness

Tests prove:

```text
before Apply:
all five → DRAFT
```

```text
Apply selected RUPTURE + RELEASE:
RUPTURE / RELEASE → READY if valid
others → DRAFT
```

```text
Apply all:
all five → READY if individually valid
```

Beat differences must trace to upstream Beat data/state, not renderer prose escalation.

### Gate 6 — Freshness / blocking

Tests prove:

```text
M7 STALE scoped to Beat → affected Beat BLOCKED
M7 CONFLICT scoped to Beat → affected Beat BLOCKED
stale Apply Evidence → affected Beat BLOCKED
current Beat Scene/provenance divergence → current Beat BLOCKED
non-current Beat is not compared to another Beat's Scene State
UNKNOWN / OPEN → can remain READY
```

DRAFT cannot become READY by status mutation; a current matching Apply receipt and full recompile are required.

### Gate 7 — Browser acceptance

Positive browser chain:

```text
Open Project Scene
↓
NARRATIVE
↓
choose Reading
↓
choose Strategy
↓
Sequence completes
↓
Prompt Preview appears: five DRAFT Beats
↓
switch Beat tabs / STRUCTURE / RENDERED
↓
Apply selected Beats
↓
only selected Beat packages recompile READY
↓
Apply remaining Beats / Apply all
↓
all valid Beat packages READY
```

Negative chains:

```text
current-Beat manual Scene divergence
→ that Beat BLOCKED
```

```text
M7 stale/conflict
→ scoped Beat BLOCKED
```

No generation-ready control is exposed for DRAFT/BLOCKED.

### Gate 8 — M0–M7 regression and exact-HEAD verification

Before completion claim:

- all existing M0–M7 Node tests pass;
- runtime syntax passes;
- Pages asset assembly passes;
- Project persistence remains valid;
- Scene switching/Narrative restore remain valid;
- M6 remains read-only;
- M7 remains guarded and gains no Prompt ownership;
- M4 Apply semantics still support all/selected and remain explicit;
- browser smoke/regression passes;
- exact implementation HEAD has fresh CI success;
- compare against M8 baseline shows no unrelated history divergence;
- no merge occurs without explicit product approval.

---

## 34. Out of scope

M8 v1 does not implement:

- image/video generation;
- provider/model selection;
- provider API adapters;
- seeds/aspect ratio/resolution/steps/CFG UI;
- provider prompt optimization;
- Prompt A/B testing;
- LLM prompt rewriting;
- Project-wide generation planning;
- automatic repair/regeneration;
- Visual QA scoring/comparison;
- explicit Director Override Provenance for post-Apply manual DIRECT edits;
- new exact Grammar families;
- global style presets;
- copyrighted-style imitation mechanisms.

---

## 35. Success criteria

For every Beat Prompt Package, a reviewer can answer:

1. What Scene/Beat is this for?
2. What content came directly from the Director?
3. What Beat realization came from AI?
4. What structural direction is REQUIRED?
5. What exact values are compiler REQUIRED?
6. What is only GUIDED?
7. What remains OPEN?
8. What is BLOCKED from exact assertion?
9. Which negatives come from explicit anti-rules?
10. Which compiler fields have M7 Project support?
11. Was this exact Beat explicitly applied?
12. Does the Apply receipt still match current Sequence Director state?
13. If this is the current Scene Beat, does current Scene State still match provenance?
14. Why is this Beat DRAFT, READY, or BLOCKED?
15. Can the rendered output be reproduced byte-for-byte from the same IR?
16. Can M9 transport it without acquiring directing authority?

Product success condition:

> A generation model receives a precise, auditable translation of already-established directing truth, while unapplied, unresolved, unsupported, or stale visual degrees of freedom never become silently invented generation authority.

---

## 36. Final M8 authority model

```text
STORY
↓
Narrative Interpretation
↓
Director-confirmed Reading
↓
Director-selected Strategy
↓
Visual IR
↓
Evidence-aware Grammar
↓
Visual Compiler
↓
Compiler-first Sequence
↓
Guarded Project Constraint Authority
↓
Explicit Beat Apply Evidence
↓
──────────────────────────────────
M8 GENERATION PROMPT IR
↓
Deterministic Renderer
↓
DRAFT / READY / BLOCKED Beat Prompt Package
──────────────────────────────────
↓
M9 Provider Adapter + Generation Runtime
↓
Generated Image / Video
↓
M10 Visual QA
```

Defining rules:

```text
Do not guess.
Do not embellish into new visual meaning.
Do not describe weak authority as strong authority.
Do not treat an unapplied Beat as generation-authorized.
```
