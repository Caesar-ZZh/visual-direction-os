# M8 Generation Prompt Compiler Design

**Status:** Awaiting written-spec review before implementation planning  
**Branch:** `phase2/m8-generation-prompt-compiler`  
**Baseline before M8 design:** `8551f0262d6a0ee7078f78e5f9957acb3afbbd0a` on `integration/director-workspace-v2-1`  
**Depends on:** Visual IR v0.3.0, M5 Compiler-first Sequence Synthesis, M6 Project Intelligence · Shadow, and M7 Guarded Project Constraint Authority  
**Primary objective:** Introduce a provider-neutral, deterministic translation layer that converts already-confirmed directing truth into auditable Generation Prompt IR and rendered Prompt Packages without creating new visual truth, escalating authority, filling UNKNOWN fields, or coupling Visual Direction OS to a particular image/video model.

---

## 1. Problem

Visual Direction OS can now move from narrative interpretation through Director-confirmed Strategy, Visual IR, evidence-aware Grammar, deterministic compiler expectations, compiler-first Sequence synthesis, and guarded Project constraints. The next missing layer is not another directing system; it is a safe translation boundary between directing truth and downstream generation systems.

The unsafe version of a Prompt Compiler would collapse everything into a natural-language prompt such as:

```text
cinematic character in an office, cool colors, mixed camera,
dramatic composition, beautiful lighting, highly detailed...
```

That destroys the distinctions the previous milestones deliberately established:

- Director-provided scene content versus AI beat realization;
- Director-confirmed structural intent versus compiler-produced exact values;
- compiler-backed values versus AI-completed guidance;
- Project constraint support versus ownership;
- UNKNOWN freedom versus blocked exact authority;
- mechanism-based anti-rules versus generic negative prompting;
- Scene/Beat provenance versus model-facing prose.

Once those distinctions are flattened into prose, downstream Generation and Visual QA cannot reliably answer why a phrase exists, whether a value is mandatory, whether a Project constraint supports it, whether it was only AI guidance, or whether the system invented an unsupported detail.

M8 therefore introduces **Structured Generation Prompt IR + Deterministic Renderer**.

The Prompt Compiler is a translation authority only. It may express existing directing truth in generation language. It may not create new directing truth.

---

## 2. Selected architecture

### 2.1 Selected — Structured Prompt IR + Deterministic Renderer

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
        ↓
SOURCE / FRESHNESS VALIDATION
        ↓
GENERATION PROMPT IR
        ↓
AUTHORITY VALIDATION
        ↓
DETERMINISTIC RENDERER
        ↓
PROMPT PACKAGE
        ↓
M9 PROVIDER ADAPTER
        ↓
Image / Video Generation Runtime
```

Advantages:

- authority and provenance survive translation;
- exact compiler truth stays distinguishable from AI guidance;
- UNKNOWN stays intentional generation freedom;
- Project constraints remain support evidence rather than new owners;
- rendered text is deterministic and inspectable;
- provider syntax remains outside M8;
- future Visual QA can compare outputs against a structured contract instead of reverse-parsing prompt prose.

### 2.2 Rejected — Direct prompt-string composition from M5 Sequence

This is faster to implement but loses authority, ownership, provenance, and blocked/open semantics inside natural language. It also makes deterministic testing and Visual QA materially weaker.

### 2.3 Rejected — Provider-specific Prompt Compiler

M8 must not emit Midjourney-, Flux-, OpenAI-, Stable Diffusion-, or video-model-specific prompt syntax. Provider-specific formatting, negative-prompt channels, sampling parameters, resolution, seed, aspect ratio, and request structure belong to M9.

---

## 3. Core authority principle

```text
PROMPT COMPILER
=
TRANSLATION AUTHORITY

≠
DIRECTING AUTHORITY
```

M8 may:

- preserve Director-provided scene content;
- preserve Director-confirmed Reading/Strategy structure;
- express compiler-supported exact values;
- express AI-completed values as weaker guidance;
- expose Project constraint support metadata;
- preserve UNKNOWN as OPEN;
- preserve blocked exact authority as BLOCKED;
- render explicit Grammar anti-rules;
- produce deterministic provider-neutral text.

M8 may not:

- infer a lens, angle, palette, hue, saturation, lighting concept, texture, medium, or composition that upstream systems did not establish;
- turn an AI-completed field into a required directive;
- turn UNKNOWN into a concrete value;
- turn BLOCKED into positive or negative visual instruction;
- create `owner: project`;
- auto-select or rewrite a Grammar;
- repair stale Project constraints;
- silently reinterpret manual DIRECT edits as Director-owned provenance;
- add generic quality/style words as if they were directing truth.

The central invariant is:

```text
authority(output) MUST NOT exceed authority(input)
```

M8 may reduce expression strength where necessary; it may never increase authority.

---

## 4. Position in the runtime pipeline

M8 is downstream of M5 Sequence assembly and M7 guarded authority, but upstream of M9 Generation.

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
M8 Prompt Compiler · PREVIEW
        ↓
DRAFT Prompt Package
        ↓
Director reviews Sequence
        ↓
EXPLICIT APPLY
        ↓
Canonical Scene State
        ↓
M8 source/provenance/freshness reconciliation
        ↓
READY Prompt Package
        ↓
M9 Generation Runtime
```

M8 does **not** participate in M5 Sequence completion. The Sequence AI request continues to receive the guarded M7 `projectConstraintContext` before completion. M8 consumes the completed and validated Sequence result.

---

## 5. Apply boundary and generation authority

A Sequence Proposal may be translated before Apply, but that translation is not generation-authorized.

```text
Sequence Proposal exists
≠
Generation authorized
```

Before Apply:

```text
Prompt Package readiness = DRAFT
```

The Director may inspect:

- Prompt IR structure;
- per-Beat content;
- REQUIRED directives;
- GUIDED directives;
- OPEN fields;
- BLOCKED fields;
- anti-rules;
- provenance;
- deterministic rendered text.

But downstream Generation remains locked.

After explicit Apply, M8 must re-read current canonical Scene State, revalidate source identities and provenance, re-resolve relevant M7 authority, and recompile. A DRAFT package must never be converted to READY by mutating only its label.

The READY package is a newly derived artifact from applied truth.

---

## 6. No new product mode

M8 does not add a new top-level mode.

Existing modes remain:

```text
LEARN
NARRATIVE
DIRECT
DIAGNOSE
```

M8 appears as a generation-translation inspector associated with the current NARRATIVE Sequence/Apply workflow. Prompt compilation is not a fifth directing stage and does not change Project/Scene mode semantics.

---

## 7. Generation Prompt IR

### 7.1 Top-level shape

M8 v1 uses one Prompt IR per `Scene × Beat`.

```js
{
  schemaVersion: '0.1.0',
  mode: 'generation-translation',

  sceneId: 'scene-03',
  beatId: 'setup',

  compileState: {
    phase: 'draft' | 'applied',
    sourceRevision: '...'
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

  content: { ... },
  intent: { ... },

  required: [],
  guided: [],
  open: [],
  blocked: [],
  antiRules: [],

  provenance: { ... },

  readiness: {
    status: 'DRAFT' | 'READY' | 'BLOCKED',
    reasons: []
  },

  fingerprint: 'pir-...'
}
```

The Prompt IR is a structured snapshot of generation-facing directing truth. It is not merely an AST for a prose prompt.

### 7.2 Scene Prompt Set

A compiled Scene returns a deterministic five-Beat set aligned to M5:

```text
Scene Prompt Set
├── SETUP
├── PRESSURE
├── RUPTURE
├── RELEASE
└── NEW OWNERSHIP
```

Recommended public interfaces:

```js
compileBeatPrompt(...)
compileSequencePrompts(...)
```

M8 v1 does not choose how many images, keyframes, shots, or video clips a Beat should generate. That belongs to M9.

---

## 8. Content authority is separate from visual authority

Generation needs both:

```text
WHAT EXISTS / HAPPENS IN THE SCENE
and
HOW THE SCENE IS VISUALLY DIRECTED
```

M8 therefore adds an explicit `content` layer.

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
2. AI `narrativeBeat` and `visualEvents` are beat realization guidance; they do not overwrite Director-provided content facts.
3. M8 must not silently treat Sequence AI prose as newly confirmed story truth.
4. Content authority and visual authority remain parallel; a strong content fact does not create exact visual authority.

---

## 9. Prompt authority classes

M8 v1 defines five semantic classes:

```text
REQUIRED
GUIDED
OPEN
BLOCKED
ANTI-RULE
```

These are semantic authority classes, not model weight values.

### 9.1 REQUIRED

REQUIRED contains two subtypes.

#### Structural REQUIRED

Sources:

- Director-confirmed Reading;
- Director-confirmed Strategy;
- Beat structural identity.

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

Structural REQUIRED defines organization, mechanism, priority, support, and restraint. It does **not** authorize unsupported exact values.

For example:

```text
PRIMARY VARIABLE = CAMERA
```

must not imply:

```text
low angle
35mm lens
handheld
cinematic perspective
```

#### Exact REQUIRED

Sources:

- M5 field provenance `owner: compiler` with supported exact value;
- the corresponding exact value in the Sequence Proposal Beat patch.

Example:

```js
{
  kind: 'exact',
  path: 'camera.perspective',
  value: 'mixed',
  owner: 'compiler',
  support: 'supported',
  authorityClass: 'required',
  source: {
    grammarId: 'camera-authority-transfer'
  },
  projectSupport: [ ... ]
}
```

Only upstream exact compiler evidence creates Exact REQUIRED values.

### 9.2 GUIDED

GUIDED contains non-deterministic but valid generation guidance, including:

- M5 open fields with field provenance `owner: ai`;
- AI `narrativeBeat`;
- AI `visualEvents`;
- other explicitly valid AI-completed realization details.

Example:

```js
{
  path: 'color.temperature',
  value: 'cool',
  owner: 'ai',
  support: 'open',
  authorityClass: 'guided'
}
```

GUIDED values may appear in the prompt but must never be rendered as mandatory compiler truth.

### 9.3 OPEN

OPEN represents intentional generation freedom.

Typical source:

```js
{
  value: 'UNKNOWN',
  status: 'unknown',
  evidenceStatus: 'unresolved'
}
```

from Visual IR.

Example:

```js
open: [
  { field: 'medium', reason: 'unresolved-evidence' },
  { field: 'texture', reason: 'unresolved-evidence' }
]
```

OPEN is not an error and does not block READY.

Default renderer behavior:

```text
OPEN → omitted from rendered generation text
```

M8 must not ask a model to “choose an appropriate” value. That would turn intentional freedom into a new meta-instruction.

### 9.4 BLOCKED

BLOCKED means the current authority contract explicitly does not permit M8 to assert an exact value on that path.

Example:

```js
{
  path: 'camera.perspective',
  authorityClass: 'blocked',
  source: 'spatial-authorship',
  reason: '...'
}
```

Default renderer behavior:

```text
BLOCKED → metadata/validator only
          no positive instruction
          no negative instruction
```

“Do not use camera perspective” is not equivalent to “the system lacks authority to prescribe an exact camera perspective.” M8 must preserve the latter meaning.

### 9.5 ANTI-RULE

ANTI-RULE is the only canonical negative-guidance source in M8 v1.

Sources:

- explicit evidence-aware Grammar anti-rules.

M8 must not synthesize generic negative prompts or add common image-generation warnings on its own.

---

## 10. Owner and authority class are separate

Every directive that represents a concrete source must preserve both semantic authority class and source ownership.

Example:

```js
{
  path: 'camera.perspective',
  value: 'mixed',
  authorityClass: 'required',
  owner: 'compiler',
  support: 'supported'
}
```

M7 Project constraints do not become owners.

A SATISFIED M7 constraint may annotate an existing compiler field:

```js
{
  path: 'camera.perspective',
  value: 'mixed',
  authorityClass: 'required',
  owner: 'compiler',
  projectSupport: [
    {
      constraintId: 'constraint-camera-001',
      revision: 1,
      result: 'satisfied'
    }
  ]
}
```

This must never become:

```js
{
  owner: 'project',
  path: 'camera.perspective',
  value: 'mixed'
}
```

The project may support a Scene Compiler result; it does not acquire independent exact-value ownership.

---

## 11. Formal upstream-to-Prompt mapping

| Upstream source | Prompt class | Owner | M8 behavior |
| --- | --- | --- | --- |
| Director narrative input | Content | director | Preserve as Scene content |
| Confirmed Reading | REQUIRED / structural | director-confirmed | Express without changing meaning |
| Selected Strategy | REQUIRED / structural | director-confirmed | Express mechanism / primary / support / restrain |
| M5 `owner: compiler` field | REQUIRED / exact | compiler | Preserve exact value |
| M5 `owner: ai` field | GUIDED | ai | Express as weaker guidance |
| AI narrativeBeat / visualEvents | GUIDED content realization | ai | Preserve as Beat guidance |
| SATISFIED M7 constraint | support annotation | none/new owner prohibited | Support matching compiler field only |
| Visual IR UNKNOWN | OPEN | none | Preserve freedom; omit from text |
| M5 blocked path | BLOCKED | none | Prohibit exact assertion; omit from text |
| Visual IR antiRules | ANTI-RULE | grammar/evidence | Render as negative guidance |

M8 must fail if implementation attempts to map a weaker class into a stronger one.

---

## 12. Authority escalation invariants

The following are contract violations:

```text
AI-completed → REQUIRED
UNKNOWN → concrete directive
BLOCKED → concrete positive directive
BLOCKED → invented negative directive
Project support → owner: project
Structural requirement → unsupported exact requirement
```

The Prompt IR validator must surface an explicit failure, recommended code:

```text
AUTHORITY_ESCALATION
```

M8 must fail closed rather than silently normalize an authority violation.

---

## 13. Deterministic renderer

### 13.1 Purity

The canonical renderer is a pure deterministic function.

```text
same validated Prompt IR
        ↓
byte-identical canonical rendered output
```

It does not:

- call an LLM;
- use randomness;
- choose synonyms;
- optimize wording by provider;
- add aesthetic adjectives;
- add quality tokens;
- infer missing values.

### 13.2 Canonical output section order

The neutral canonical rendered form uses this order:

```text
01 SCENE CONTENT
02 NARRATIVE BEAT
03 DIRECTING PRIORITY
04 REQUIRED VISUAL BEHAVIOR
05 VISUAL GUIDANCE
06 AVOID
```

Semantic sequence:

```text
What exists
↓
What is happening now
↓
What organizes the image
↓
What must hold
↓
What may guide
↓
What must not be inferred
```

### 13.3 Prompt Package channels

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

`neutralText` includes Scene content, Beat realization, directing priority, required behavior, and visual guidance.

`negativeText` contains only canonical ANTI-RULE guidance.

The separated sections remain available so UI and M9 do not need to parse prose back into structure.

---

## 14. Controlled Prompt Language Registry

M8 v1 introduces a versioned semantic phrase registry, recommended module:

```text
prompt-language-registry.js
```

Its purpose is to map canonical supported fields and values to canonical mechanism-preserving language.

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

1. Exact REQUIRED values must use explicit registered mappings.
2. The registry is mechanism language, not a model prompt-hack dictionary.
3. It must not contain generic cinematic adjectives or provider syntax.
4. It must not infer hue from color ownership.
5. It must not infer lens/angle/movement from camera authority unless an upstream supported contract explicitly supplies those exact fields.
6. Phrase changes are contract/version changes because they alter canonical output.

---

## 15. Required versus Guided rendering behavior

### 15.1 Unrenderable REQUIRED exact value

If Prompt IR contains an Exact REQUIRED value with no canonical mapping:

```text
UNRENDERABLE_REQUIRED_VALUE
```

and the package becomes BLOCKED.

The renderer may not guess how to express an unknown required value.

### 15.2 GUIDED fallback

For valid GUIDED values without a specialized phrase mapping, M8 may use a weak deterministic wrapper that preserves the value verbatim.

Example:

```text
Guidance for color.temperature:
localized coolness near the window.
```

It may not embellish, strengthen, or reinterpret the value.

### 15.3 OPEN and BLOCKED

OPEN and BLOCKED appear in structured inspector metadata but are omitted from canonical generation text unless an explicit upstream anti-rule independently produces negative guidance.

---

## 16. Directing priority and restraint

Selected Strategy structure is generation-relevant and must survive rendering.

Example:

```text
PRIMARY
Camera

SUPPORT
Space

RESTRAIN
Texture / FX
```

Canonical expression may be:

```text
Camera carries the primary visual change.
Space may support that change.
Keep Texture and FX subordinate.
```

Restrained variables are not exact low-value assignments. “Restrain Texture” must not become “smooth texture,” “low texture,” or “no texture” unless upstream exact evidence says so.

The purpose is to preserve hierarchy and prevent every dimension from peaking simultaneously.

---

## 17. No automatic quality/style vocabulary

M8 v1 must not automatically inject terms such as:

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

These terms are not canonical directing truth merely because they are common in prompt engineering.

If the Director literally includes one of these words as Scene content, the source content may preserve it. The renderer itself must not introduce it.

Provider-specific technical quality configuration belongs to M9.

---

## 18. Beat differentiation

Five Beat Prompt Packages must differ because upstream Beat data differs, not because the renderer escalates prose.

Legal sources of Beat difference:

1. M5 `narrativeBeat`;
2. M5 `visualEvents`;
3. Beat-specific Scene State patch;
4. Beat-specific compiler expectations/provenance;
5. Beat-specific applicable Project support.

Illegal source of Beat difference:

```text
renderer decides later Beats should sound more intense / cinematic / dramatic
```

Formal invariant:

```text
Beat differentiation comes from data, not prose escalation.
```

---

## 19. Prompt IR fingerprint and source identity

Every Prompt IR includes a deterministic semantic fingerprint:

```text
pir-<digest>
```

The fingerprint is computed from canonicalized generation-relevant source identity, including:

- Scene ID;
- Beat ID;
- Reading ID;
- Strategy ID;
- Grammar ID;
- relevant Visual IR signals;
- Sequence Proposal Beat;
- Sequence field provenance;
- applicable Project constraint IDs/revisions/results;
- explicit anti-rules;
- Prompt IR contract version;
- Prompt language registry / renderer contract version where their semantics affect canonical output.

Do not include timestamps or incidental object insertion order.

The fingerprint is a content identity/audit aid, not a cryptographic security signature.

M9 generation records may later store:

```js
{
  generationId: '...',
  promptIRFingerprint: 'pir-...',
  promptCompilerVersion: '0.1.0',
  provider: '...',
  model: '...'
}
```

This lets M10 determine which directing contract a generated artifact was intended to satisfy.

---

## 20. Source freshness and M7 reconciliation

A stored reference to a previously SATISFIED Project constraint is not sufficient for READY.

At compile/recompile time, M8 must compare stored Sequence Project provenance against current M7 authority resolution.

If a referenced constraint revision is now STALE or CONFLICT:

```text
Prompt Package = BLOCKED
```

Recommended codes:

```text
PROJECT_CONSTRAINT_STALE
PROJECT_CONSTRAINT_CONFLICT
```

M8 does not:

- delete the constraint;
- release its scope;
- switch Grammar;
- downgrade its former requirement;
- ask AI to arbitrate.

The user must return to the owning M7 decision surface.

---

## 21. Applied Scene provenance reconciliation

M8 v1 must not treat unexplained current Scene divergence as a legitimate Director override.

Example:

```text
Applied Sequence provenance:
camera.perspective = mixed
owner = compiler

Current canonical Scene State:
camera.perspective = character
```

If the system lacks explicit provenance showing a valid authoritative override, M8 returns:

```text
SCENE_PROVENANCE_DIVERGENCE
```

and blocks Generation readiness.

M8 must **not** rewrite this as:

```text
owner = director
required = character
```

Future explicit Director Override Provenance may add that capability, but it is outside M8 v1.

This follows the existing M6 principle that final-state divergence invalidates inherited compiler/AI provenance rather than allowing stale provenance to remain attached to a changed value.

---

## 22. Readiness states

M8 v1 exposes exactly three package states:

```text
DRAFT
READY
BLOCKED
```

### 22.1 DRAFT

Requirements:

- valid Sequence Proposal exists;
- source contracts are sufficient to preview Prompt IR;
- Sequence has not yet crossed explicit Apply for generation authority.

DRAFT may be inspected but not sent to M9 Generation.

### 22.2 READY

All of the following must hold:

1. Sequence is explicitly applied.
2. Visual IR validates.
3. Reading/Strategy/Grammar source identities still match.
4. Sequence Proposal validates.
5. Sequence provenance exists.
6. current Scene State matches applied provenance for generation-relevant fields.
7. referenced M7 constraints are currently SATISFIED.
8. no relevant M7 STALE or CONFLICT condition exists.
9. every Exact REQUIRED value is renderable by the canonical language registry.
10. Prompt IR validates without authority escalation.
11. deterministic renderer completes successfully.

### 22.3 BLOCKED

Any authority contradiction, source/provenance invalidity, stale Project evidence, or unrenderable REQUIRED value results in BLOCKED.

M8 v1 does not introduce `READY_WITH_WARNINGS`.

---

## 23. What does not block READY

M8 must not confuse incomplete direction with contradictory authority.

The following are valid and do not block READY by themselves:

- Visual IR contains UNKNOWN;
- Prompt IR contains OPEN fields;
- some visual dimensions have no exact value;
- GUIDED values are absent;
- supporting variables are empty;
- antiRules are UNKNOWN/unavailable;
- a field remains intentionally unowned.

Formal principle:

```text
Incomplete direction is valid.
Contradictory authority is not.
```

---

## 24. Failure taxonomy

### 24.1 Source failures

```text
PROMPT_SOURCE_INVALID
VISUAL_IR_INVALID
SEQUENCE_PROVENANCE_MISSING
SCENE_PROVENANCE_DIVERGENCE
```

### 24.2 Project authority failures

```text
PROJECT_CONSTRAINT_STALE
PROJECT_CONSTRAINT_CONFLICT
```

### 24.3 Prompt compilation failures

```text
PROMPT_IR_INVALID
AUTHORITY_ESCALATION
UNRENDERABLE_REQUIRED_VALUE
```

### 24.4 Render failures

```text
PROMPT_RENDER_FAILED
PROMPT_LANGUAGE_MAPPING_MISSING
```

For v1, missing specialized GUIDED wording does not cause `PROMPT_LANGUAGE_MAPPING_MISSING` because deterministic verbatim fallback is permitted. Missing required exact mapping does block.

---

## 25. No automatic repair

When BLOCKED, M8 must not automatically:

- change Grammar;
- delete/revoke/reconfirm/release a Project constraint;
- downgrade REQUIRED to GUIDED;
- convert BLOCKED to OPEN;
- infer a missing required value;
- run an LLM rewrite;
- rollback a Director edit;
- overwrite current Scene State;
- fabricate new provenance.

The UI explains why generation authority has been withheld and links the failure to the owning upstream layer.

Examples:

```text
PROJECT_CONSTRAINT_STALE
→ review Project Constraint

SCENE_PROVENANCE_DIVERGENCE
→ review current Scene / provenance

UNRENDERABLE_REQUIRED_VALUE
→ compiler / prompt language contract issue
```

---

## 26. Prompt Package

The orchestrator returns a provider-neutral derived artifact:

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
    projectConstraintRefs: [ ... ]
  },

  readiness: {
    status: 'DRAFT' | 'READY' | 'BLOCKED',
    reasons: [ ... ]
  },

  fingerprint: 'pir-...'
}
```

Prompt Packages are derived artifacts, not canonical Scene State.

M8 v1 does not persist rendered prompt text as truth. It may be deterministically regenerated from canonical sources.

---

## 27. Proposed module boundaries

### 27.1 `generation-prompt-ir.js`

Pure module.

Responsibilities:

- normalize M8 source input;
- map sources into REQUIRED / GUIDED / OPEN / BLOCKED / ANTI-RULE;
- preserve content authority separately;
- validate Prompt IR;
- detect authority escalation;
- canonicalize/fingerprint Prompt IR.

No DOM, no provider code, no mutation.

### 27.2 `prompt-language-registry.js`

Pure versioned semantic language contract.

Responsibilities:

- canonical exact-value phrases;
- structural priority/restraint phrases;
- no provider syntax;
- no model quality tricks;
- no unsupported style inference.

### 27.3 `generation-prompt-renderer.js`

Pure deterministic renderer.

Responsibilities:

- render canonical sections in fixed order;
- render exact REQUIRED via registry;
- render GUIDED via canonical phrase or safe verbatim fallback;
- omit OPEN/BLOCKED from positive/negative text;
- render only explicit anti-rules to negative guidance;
- return neutralText / negativeText / sections.

### 27.4 `generation-prompt-compiler.js`

Pure-orchestrator boundary around current runtime sources.

Responsibilities:

- validate source identity;
- reconcile applied Scene State/provenance;
- revalidate current M7 authority;
- compile Prompt IR;
- invoke deterministic renderer;
- derive DRAFT / READY / BLOCKED;
- return Prompt Package.

It does not mutate Narrative, Project, Sequence, or Scene State.

### 27.5 `generation-prompt-inspector.js`

Render-only UI module.

Responsibilities:

- show Beat tabs;
- show DRAFT / READY / BLOCKED;
- show Content / Required / Guided / Open / Blocked / Project support;
- switch between STRUCTURE and RENDERED views;
- explain failure reasons;
- never mutate directing state.

### 27.6 `generation-prompt.css`

Prompt Inspector styling aligned with the existing Director/Narrative shell.

---

## 28. UI location and hierarchy

M8 lives in the NARRATIVE Sequence/Apply workflow, not Project Workspace.

Recommended Stage 04 hierarchy:

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

The default inspector prioritizes explanation over raw prompt text.

Example:

```text
GENERATION PROMPT · DRAFT

SCENE 03
CAMERA AUTHORITY TRANSFER

[ SETUP ] [ PRESSURE ] [ RUPTURE ] [ RELEASE ] [ NEW OWNERSHIP ]

STATUS
DRAFT · APPLY REQUIRED

CONTENT
Director provided

REQUIRED
3 directives

GUIDED
2 directives

OPEN
8 fields

BLOCKED
1 field

PROJECT SUPPORT
constraint-camera-001 · rev 01
```

The full rendered text is secondary, accessed through a clear view switch such as:

```text
STRUCTURE
RENDERED
```

The product should first explain why prompt content exists, not present a black-box prompt string.

---

## 29. Beat Inspector details

A selected Beat may show:

```text
SETUP · PROMPT PACKAGE
────────────────────────

CONTENT
Director
...

AI BEAT REALIZATION
...

DIRECTING PRIORITY
PRIMARY / SUPPORT / RESTRAIN

REQUIRED
path / value / owner / source / Project support

GUIDED
path / value / owner

OPEN
intentionally unresolved fields

BLOCKED
paths where exact assertion is forbidden

AVOID
explicit anti-rules
```

OPEN and BLOCKED remain visible in STRUCTURE view precisely so the Director can distinguish intentional freedom from unsupported exact authority.

---

## 30. UI states

### 30.1 DRAFT

```text
GENERATION PROMPT · DRAFT

Prompt translation is available for review.
Generation remains locked until Sequence Apply.
```

No Generate control appears in M8 v1.

### 30.2 READY

```text
GENERATION PROMPT · READY

DIRECTING TRUTH
CURRENT

PROJECT CONSTRAINTS
CURRENT

PROVENANCE
VERIFIED
```

M8 v1 still does not generate. M9 may later place a generation action downstream of a READY package.

### 30.3 BLOCKED

Example:

```text
PROMPT PACKAGE · BLOCKED

Current Scene State no longer matches
its applied directing provenance.

Generation authority has been withheld.
```

The UI identifies the owning upstream issue but does not auto-repair it.

---

## 31. Provider adapter boundary for M9

M9 may translate a READY Prompt Package into provider-specific request syntax.

Allowed M9 transformations include:

- API request shape;
- native negative prompt channel;
- seed;
- aspect ratio;
- resolution;
- sampling steps;
- CFG or equivalent technical parameters;
- model identifiers;
- image/video request framing;
- provider-specific syntax required to faithfully carry M8 semantics.

M9 may not:

- add a style;
- invent a lens or camera angle;
- invent palette/hue/saturation;
- invent texture/medium/lighting concepts;
- change ownership or agency;
- rewrite Project support into Project ownership;
- promote GUIDED into REQUIRED;
- fill OPEN fields as if they were M8 truth.

Formal boundary:

```text
Provider Adapter
=
transport / syntax authority

≠
visual direction authority
```

---

## 32. Determinism and reproducibility

M8 v1 should be deterministic across:

- Prompt IR mapping;
- canonical ordering;
- canonical serialization;
- exact phrase rendering;
- GUIDED fallback wrapper;
- anti-rule ordering from source contract;
- fingerprint generation.

The implementation must not use current time, random IDs, object insertion accidents, network calls, or LLM text generation to determine canonical output.

Runtime metadata may contain an ephemeral compile revision outside the semantic fingerprint, but timestamps must not alter Prompt IR content identity.

---

## 33. Mechanism/IP-neutral constraints

M8 inherits all earlier system constraints.

It must not:

- request generation “in the style of” a copyrighted creator/IP;
- encode trademarked character identity as a substitute for visual mechanism;
- add global watercolor/graffiti/collage/halftone treatments as generic style shortcuts;
- infer emotion→fixed hue;
- infer Texture→Medium;
- infer Line→Boundary;
- infer Intensity→exact Space;
- infer a universal comic outline;
- homogenize host-world and character-local medium without supported authority.

Anti-rules and renderer language describe mechanisms, ownership, hierarchy, territory, restraint, surface assignment, agency, and supported exact states.

---

## 34. TDD acceptance gates

Implementation planning must preserve the following test gates.

### Gate 1 — Prompt IR contract and mapping

RED→GREEN tests must prove:

```text
compiler field → REQUIRED / owner compiler
AI field → GUIDED / owner ai
UNKNOWN → OPEN
blocked slot → BLOCKED
M7 SATISFIED → support annotation only
Director content remains separate from AI Beat realization
```

Also prove no `owner: project` can be produced.

### Gate 2 — Authority escalation failures

Tests must reject:

```text
AI → REQUIRED
UNKNOWN → concrete REQUIRED
BLOCKED → positive directive
BLOCKED → invented negative directive
Project support → project-owned exact value
Structural REQUIRED → unsupported exact REQUIRED
```

Expected contract failure includes `AUTHORITY_ESCALATION` where appropriate.

### Gate 3 — Deterministic renderer

Tests must prove:

- same Prompt IR returns byte-identical canonical output;
- canonical section order is stable;
- OPEN is omitted from generation text;
- BLOCKED is omitted from generation text;
- anti-rules populate negative guidance;
- missing exact REQUIRED language mapping fails closed;
- GUIDED missing specialized mapping uses deterministic verbatim fallback;
- renderer does not inject generic quality/style words.

A renderer-injection test should specifically guard terms such as:

```text
masterpiece
best quality
cinematic
epic
8K
photorealistic
```

while allowing them if they literally originate in Director-provided content.

### Gate 4 — Five-Beat compilation

Tests compile all five canonical M5 Beats and prove:

- each Beat receives its own Prompt IR/Package;
- differences are traceable to Beat source data or compiler state;
- renderer adds no independent prose escalation;
- Beat ordering is deterministic.

### Gate 5 — Readiness and freshness

Tests must prove:

```text
valid proposal, not applied → DRAFT
applied + provenance-current → READY
M7 STALE → BLOCKED
M7 CONFLICT → BLOCKED
Scene/provenance divergence → BLOCKED
UNKNOWN / OPEN → may still be READY
```

Also prove DRAFT is not upgraded to READY by mutating only a status flag; READY requires source re-read/recompile.

### Gate 6 — UI browser acceptance

Browser acceptance should cover:

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
Prompt Preview appears as DRAFT
↓
switch five Beats
↓
inspect REQUIRED / GUIDED / OPEN / BLOCKED
↓
view deterministic rendered form
↓
Apply Sequence
↓
Prompt package recompiles as READY
```

Negative browser chains:

```text
manual current Scene divergence
→ BLOCKED
```

and:

```text
M7 stale/conflict
→ BLOCKED
```

No generation-ready control should be exposed in a blocked state.

### Gate 7 — M0–M7 regression and exact-HEAD verification

Before M8 completion is claimed:

- all existing M0–M7 Node tests pass;
- runtime syntax passes;
- Pages asset assembly passes;
- Project persistence remains valid;
- Scene switching and Narrative restore remain valid;
- M6 remains read-only;
- M7 remains guarded and does not gain Prompt ownership;
- M4 Apply semantics remain unchanged;
- browser smoke/regression passes;
- the exact implementation HEAD has fresh CI success;
- comparison to `integration/director-workspace-v2-1` shows no accidental unrelated history divergence;
- no merge occurs without explicit product approval.

---

## 35. Out of scope for M8 v1

M8 v1 explicitly does not implement:

- image generation;
- video generation;
- model/provider selection;
- provider API adapters;
- seeds/aspect ratio/resolution/CFG/steps UI;
- prompt optimization by provider;
- Prompt A/B testing;
- automatic prompt rewriting by LLM;
- long-range Project generation planning;
- automatic Project repair;
- Visual QA scoring;
- visual result comparison;
- automatic regeneration decisions;
- explicit Director Override Provenance for post-Apply DIRECT edits;
- new exact Grammar families beyond currently supported compiler authority;
- global style presets;
- copyrighted-style imitation mechanisms.

These belong to later milestones or separate authority work.

---

## 36. Success criteria

M8 is successful when a reviewer can take any DRAFT/READY/BLOCKED Prompt Package and answer, without reverse-engineering prose:

1. What Scene and Beat is this for?
2. What Director-provided content is being depicted?
3. What AI Beat realization is only guidance?
4. What is structurally REQUIRED by confirmed direction?
5. What exact values are REQUIRED by the compiler?
6. Which fields are only GUIDED by AI completion?
7. Which fields remain intentionally OPEN?
8. Which paths are BLOCKED from exact assertion?
9. Which negative instructions come from explicit Grammar anti-rules?
10. Which compiler fields are additionally supported by current M7 constraints?
11. Why is the package DRAFT, READY, or BLOCKED?
12. Can the canonical rendered output be reproduced exactly from the same Prompt IR?
13. Can downstream M9 generate without acquiring any new directing authority?

The product-level success condition is:

> A generation model receives a precise, auditable translation of already-established directing truth, while every unresolved or unsupported visual degree of freedom remains visibly unresolved instead of being silently invented by the Prompt Compiler.

---

## 37. Final authority model after M8

```text
STORY
↓
Narrative Interpretation
↓
Director-confirmed Reading
↓
Director-selected Visual Strategy
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
──────────────────────────────────
M8 GENERATION PROMPT IR
↓
Deterministic Renderer
↓
DRAFT / READY / BLOCKED Prompt Package
──────────────────────────────────
↓
M9 Provider Adapter + Generation Runtime
↓
Generated Image / Video
↓
M10 Visual QA
```

M8 does not make the generation model a co-director. It places the generation model downstream of explicit directing authority.

The defining M8 rule is:

```text
Do not guess.
Do not embellish into new visual meaning.
Do not describe weak authority as strong authority.
```
