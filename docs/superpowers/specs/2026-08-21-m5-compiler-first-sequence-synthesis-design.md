# M5 Compiler-First Sequence Synthesis — Design

## Goal

Move Sequence generation from AI-first proposal generation to compiler-first constrained synthesis without inventing unsupported visual behavior, erasing raw provenance, or removing human Director control.

M5 introduces a deterministic Sequence Skeleton before AI completion. The skeleton owns only structure and constraints justified by the confirmed Narrative Reading, selected Strategy, Visual IR, Grammar Registry, and current Scene State contract. AI becomes a constrained completion layer that may fill explicitly open slots but may not rewrite compiler-owned structure or authoritative values.

## Context

M0 introduced Visual IR from confirmed Narrative Reading plus selected Strategy.

M2 introduced explicit evidence-aware grammar identity and contract-aware Visual IR bindings.

M3 introduced a deterministic Visual Compiler that emits supported, partial, and blocked expectations and compares them against AI-authored Sequence behavior.

M4 introduced guarded Apply-time authority. Raw AI `sequenceProposal` remains immutable; an `AuthorityPlan` derives a transient `resolvedProposal`; only compiler assertions with `status === supported` may confirm, override, or inject values when the user explicitly clicks **Apply to Director**.

The remaining AI-first dependency is the Sequence request itself. The current `sequence` prompt asks the model to generate five complete beats including agency, variable hierarchy, visual events, rationale, and full Scene State patches. M5 moves the compiler in front of that request.

## Chosen approach

### Compiler Skeleton + Constrained AI Completion

```text
Confirmed Narrative Reading
+
Selected Strategy
+
Visual IR
        ↓
SEQUENCE SKELETON COMPILER
        ↓
Compiler-owned structure + constraints + open slots
        ↓
AI COMPLETION
        ↓
COMPLETION VALIDATOR
        ↓
SEQUENCE ASSEMBLER
        ↓
Final sequenceProposal
        ↓
M3 integrity / raw-completion audit
+
M4 guarded authority at Apply
        ↓
Director
```

The compiler does not generate an entire visual Sequence. It generates only the subset it can justify and marks all other fields as open, constrained, or blocked.

## Why this approach

### Rejected: stronger instructions on the existing full AI Sequence response

This remains AI-first. A prompt can request compliance but does not structurally prevent the model from selecting or rewriting compiler-owned values.

### Rejected: compiler-only full Sequence generation

The current Grammar Registry and Scene State contract do not justify exact values for every Space, Camera, Color, Line, Texture, Rhythm, ownership, or timing field. A compiler-only full proposal would remove useful creative freedom or fabricate unsupported values.

### Selected: deterministic skeleton plus constrained completion

This preserves generative flexibility only where evidence or contract authority is incomplete and makes provenance machine-readable.

## Core design principles

### 1. Compiler ownership is explicit

Every compiler-owned value or structural constraint carries provenance and support status. Ownership is never inferred merely because a field appears in the skeleton.

### 2. AI writes only declared open slots

The completion request is not a free-form replacement Sequence. The model receives the skeleton and may return content only for fields whose slot status is `open`.

### 3. Blocked is not open

A contract or evidence gap is not permission for AI to invent a value that the product would then present as validated. Blocked values never enter the assembled authoritative proposal in M5.

### 4. Supported compiler claims are authoritative

Paths already classified as `supported` by the deterministic compiler become compiler-owned. AI completion cannot overwrite them.

### 5. Partial claims constrain without pretending to know an exact value

A `partial` claim may become a deterministic validator rule or finite allowed set. If no deterministic constraint can be expressed, it remains blocked rather than silently becoming AI-open.

### 6. Raw AI completion remains inspectable

The exact provider response is retained separately from the assembled proposal. Forbidden writes and invalid choices remain visible for audit.

### 7. Apply remains explicit

M5 changes proposal construction, not the mutation boundary. Sequence Director and canonical Scene State still change only after **Apply to Director**.

### 8. Manual Director edits remain possible after Apply

Compiler-first synthesis governs machine generation, not permanent ownership of DIRECT controls.

## Sequence Skeleton model

Create a pure runtime module:

`visual-direction-os/visual-sequence-skeleton.js`

Primary interface:

```js
compileSequenceSkeleton({
  confirmedReading,
  selectedStrategy,
  visualIR
})
```

Result shape:

```js
{
  version: '0.1.0',
  revision,
  mode: 'compiler-first',
  grammarId,
  readingId,
  strategyId,
  agencyConstraint,
  claimedPaths,
  beats: [
    {
      id,
      label,
      structure: {
        primaryVariable,
        supportingVariables,
        restrainedVariables
      },
      agencySlot,
      patchSlots,
      completionSlots,
      provenance
    }
  ]
}
```

`revision` is a deterministic fingerprint of the upstream inputs used to build the skeleton. A completion produced for one revision cannot be assembled against another.

The skeleton always contains exactly the canonical beat order:

1. `setup` / `SETUP`
2. `pressure` / `PRESSURE`
3. `rupture` / `RUPTURE`
4. `release` / `RELEASE`
5. `new-ownership` / `NEW OWNERSHIP`

AI cannot rename, insert, delete, or reorder beats.

## Variable hierarchy ownership

The selected Strategy already defines:

- `primaryVariable`
- `supportingVariables`
- `restrainedVariables`

M5 treats this hierarchy as compiler-owned Sequence structure. Every beat inherits it in M5; there are no beat-level hierarchy exceptions in this milestone.

AI completion therefore cannot change the Primary variable, promote a restrained variable, or add undeclared supporting variables.

## Agency Constraint model

### Source

The Agency Constraint is compiled from the confirmed Narrative Reading's `agencyTransition.value`.

Example:

```js
['world', 'contested', 'character']
```

Adjacent duplicate states are normalized before constraint construction.

```text
WORLD → WORLD → CONTESTED → CHARACTER
```

becomes:

```text
WORLD → CONTESTED → CHARACTER
```

The compiler never invents a missing intermediate state.

### Constraint semantics

The compiler does not assign every transition to a predetermined beat. Instead it defines an ordered state path and validates monotonic progression through it.

For:

```text
WORLD → CONTESTED → CHARACTER
```

M5 guarantees:

- `SETUP` equals `WORLD`;
- `NEW OWNERSHIP` equals `CHARACTER`;
- intermediate beats may remain in the current state or advance to a later state;
- after advancing, a later beat may not return to an earlier path index;
- every emitted agency value must exist in the confirmed path;
- the final confirmed state must be reached by `NEW OWNERSHIP`.

Legal:

```text
WORLD
WORLD
CONTESTED
CHARACTER
CHARACTER
```

Also legal:

```text
WORLD
CONTESTED
CONTESTED
CONTESTED
CHARACTER
```

Rejected:

```text
WORLD
CONTESTED
WORLD
CHARACTER
CHARACTER
```

The validator reports the first backward transition as `AGENCY_REGRESSION`.

`shared` remains a distinct canonical state only when it appears in the confirmed path; it is not automatically equivalent to `contested`.

If fewer than two valid canonical states remain after normalization, skeleton compilation fails.

## Grammar-owned patch slots

M5 must not call `compileBeatExpectations()` with an intermediate beat Agency value that does not exist yet.

Instead, the skeleton compiles a **grammar ownership template** before AI completion. That template declares:

- paths the grammar claims;
- whether each path is `supported`, `partial`, or `blocked`;
- whether the value is static or derived;
- the derivation key or validator rule;
- evidence source and explanation.

Example for Camera Authority:

```js
{
  path: 'camera.perspective',
  status: 'compiler-owned',
  support: 'supported',
  mode: 'derived',
  derivesFrom: 'agency',
  source: 'camera-authority-transfer'
}
```

After AI completion passes Agency validation, the assembler materializes exact supported values by calling the existing deterministic compiler with the now-valid beat Agency.

### Static compiler-owned fields

A supported value that does not depend on an open slot may be stored directly:

```js
{
  status: 'compiler-owned',
  support: 'supported',
  mode: 'static',
  value,
  source,
  why
}
```

### Derived compiler-owned fields

A path is derived when the compiler owns the path but its exact value depends on a validated open decision.

For `camera-authority-transfer`:

```text
agency = world      → camera.perspective = world
agency = contested  → camera.perspective = mixed
agency = shared     → camera.perspective = mixed
agency = character  → camera.perspective = character
```

AI owns legal transition timing, not `camera.perspective`.

The same pattern applies to:

- `color-ownership-transfer` → `color.territory`;
- `agency-ownership-transfer` → top-level `agency`.

### Partial fields

A partial field is represented only when a deterministic constraint can be stated:

```js
{
  status: 'constrained',
  support: 'partial',
  allowedValues,
  rule,
  source,
  why
}
```

If the current compiler cannot produce a finite allowed set or deterministic rule, the field remains blocked.

### Blocked fields

```js
{
  status: 'blocked',
  support: 'blocked',
  source,
  why
}
```

Blocked paths are not AI-open.

M5 preserves existing anti-coercion rules:

- Line is not silently reinterpreted as Boundary or Edge;
- Texture is not silently reinterpreted as Medium;
- no numerical temporal cadence is inferred from incomplete temporal evidence.

## AI Completion contract

M5 replaces direct AI generation of a final `sequenceProposal` with `sequenceCompletion`.

The API stage remains named `sequence`, but the response contract changes.

The model receives:

- confirmed Narrative Reading;
- selected Strategy;
- serialized Sequence Skeleton;
- explicit writable open paths;
- compiler-owned, constrained, and blocked paths that must not be returned.

The model returns:

```js
{
  sequenceCompletion: {
    skeletonRevision,
    beats: [
      {
        id,
        narrativeBeat,
        agency,
        visualEvents,
        rationale,
        openPatch
      }
    ]
  }
}
```

The five beat IDs must match the skeleton exactly and remain in canonical order. `skeletonRevision` must match the current skeleton revision.

### AI-owned fields in M5

AI may complete:

- `narrativeBeat`;
- legal `agency` values subject to the Agency Constraint;
- up to three `visualEvents`;
- concise `rationale`;
- only Scene State paths declared `open` in `patchSlots`.

### AI may not return or modify

- beat `label`;
- `primaryVariable`;
- `supportingVariables`;
- `restrainedVariables`;
- compiler-owned patch paths;
- constrained paths unless the constraint explicitly declares them writable;
- blocked patch paths;
- unknown Scene State keys;
- reordered, missing, or additional beats.

Returning a compiler-owned or blocked path is a validation error, not an override request.

## Completion Validator

Create:

`visual-direction-os/visual-sequence-completion.js`

Primary interfaces:

```js
validateSequenceCompletion({ skeleton, completion })
assembleSequenceProposal({ skeleton, completion })
```

The validator returns structured errors, never a synthetic score.

Required error types:

- `SKELETON_REVISION_MISMATCH`
- `BEAT_COUNT_MISMATCH`
- `BEAT_ID_MISMATCH`
- `AGENCY_OUTSIDE_CONFIRMED_PATH`
- `AGENCY_REGRESSION`
- `FINAL_AGENCY_NOT_REACHED`
- `COMPILER_OWNED_FIELD_WRITE`
- `CONSTRAINED_FIELD_VIOLATION`
- `BLOCKED_FIELD_WRITE`
- `UNDECLARED_OPEN_FIELD_WRITE`
- `INVALID_VISUAL_EVENT`
- `INVALID_SCENE_STATE_VALUE`

The validator never silently drops forbidden writes. The raw completion remains visible and validation fails.

## Assembly rules

`assembleSequenceProposal()` runs only on a valid completion.

For each beat it creates the existing downstream shape:

```js
{
  id,
  label,
  narrativeBeat,
  agency,
  primaryVariable,
  supportingVariables,
  restrainedVariables,
  visualEvents,
  sceneStatePatch,
  rationale
}
```

The final patch is assembled in this order:

1. start from validated AI-open patch values;
2. apply static compiler-owned values;
3. materialize derived compiler-owned values using the validated beat Agency and the existing deterministic Visual Compiler;
4. set top-level `agency` from the validated beat Agency;
5. validate through existing `validateSceneStatePatch()`.

AI cannot win a merge conflict against a compiler-owned path because such a write cannot pass completion validation.

## Provenance model

The runtime keeps four distinct artifacts:

1. **Sequence Skeleton** — deterministic pre-AI structure and constraints.
2. **Raw Sequence Completion** — exact model response before semantic validation.
3. **Assembled Sequence Proposal** — valid downstream proposal built from skeleton plus completion.
4. **Sequence Provenance** — companion metadata describing field ownership.

Provenance remains outside canonical `sceneStatePatch`:

```js
{
  origin: 'compiler-first',
  skeletonVersion,
  skeletonRevision,
  grammarId,
  fields: {
    '<beatId>.<path>': {
      owner: 'compiler' | 'ai',
      support: 'supported' | 'open',
      source
    }
  }
}
```

## Interaction with M3

M3 keeps two compatibility roles instead of pretending a compiler-first proposal is an AI-first proposal.

### Legacy AI-first origin

Existing M3 behavior remains unchanged:

> **AI Proposal vs Director Compiler**

It compares raw AI proposal patches against compiler expectations.

### Compiler-first origin

The raw `sequenceCompletion` usually does not contain compiler-owned paths by design, so a normal completion cannot produce meaningful `MATCH / CONFLICT` values for those paths.

For compiler-first origin:

- raw-model violations are exposed by the Completion Validator / provenance inspector;
- attempted writes to compiler-owned paths remain visible as validation errors;
- the existing comparison engine may run against the assembled proposal only as an **assembly integrity check**, not as an AI audit;
- UI copy must not label that integrity check as `AI Proposal vs Director Compiler`.

Therefore M5 does not erase raw audit. It separates **raw completion contract audit** from **assembled compiler integrity** instead of generating fake perfect matches.

## Interaction with M4

M4 remains an independent Apply-time safety boundary.

Normal M5 output should already contain supported compiler values, so M4 is expected to produce mostly `CONFIRM` decisions.

M4 still protects:

- legacy AI-first saved proposals;
- malformed or externally supplied proposals;
- future runtime drift;
- older browser sessions;
- new supported compiler claims introduced after a proposal was generated.

M5 does not remove `AuthorityPlan` or Apply-time validation.

## Narrative state changes

Narrative Draft state adds non-canonical generation artifacts:

```js
sequenceSkeleton
sequenceCompletion
sequenceProposal
sequenceProvenance
```

`sequenceProposal` remains the downstream compatibility artifact.

Invalidation rules:

- changing confirmed Reading invalidates skeleton, completion, proposal, provenance;
- changing selected Strategy invalidates all four;
- rebuilding Visual IR because grammar identity changed invalidates all four;
- retrying AI completion may reuse the same skeleton only when its revision is unchanged;
- no stale completion may be assembled against a newer skeleton revision.

## API changes

### Request

The `sequence` request adds:

```js
sequenceSkeleton
```

The server treats the skeleton as authoritative structured context supplied by the application, not as narrative text to reinterpret.

### Prompt

The sequence prompt changes from full proposal generation to constrained completion:

- return one completion entry for each supplied skeleton beat;
- preserve beat IDs and order;
- select only legal Agency states under the supplied Agency Constraint;
- write only paths declared open;
- do not return compiler-owned, constrained-nonwritable, or blocked paths;
- do not reinterpret Strategy hierarchy;
- provide narrative purpose, visual events, rationale, and open patch detail only.

### Static response schema

The server JSON Schema validates the static `sequenceCompletion` shape:

- `skeletonRevision` exists;
- exactly five completion beats exist;
- each beat contains only allowed completion keys;
- `openPatch` uses canonical Scene State structure and value types;
- visual-event cardinality and basic field types are valid.

A static JSON Schema does not attempt to encode dynamic per-skeleton open-path ownership.

### Dynamic semantic validation

After provider output passes static schema validation, the server runs the same skeleton-sensitive completion semantics used by the browser:

```js
validateSequenceCompletion({ skeleton, completion })
```

It rejects:

- compiler-owned writes;
- blocked writes;
- undeclared open writes;
- Agency regressions;
- stale skeleton revisions;
- other skeleton-dependent errors.

The browser repeats the same semantic validation before assembly as defense in depth. The browser remains the deterministic final assembler so demo mode and live API mode use the same synthesis logic.

## UI

M5 adds no new major workspace.

Sequence Preview gains a restrained origin line:

> **SEQUENCE ORIGIN · COMPILER-FIRST**

An expandable provenance view may show per beat:

- `COMPILER OWNED`
- `AI COMPLETED`
- `CONSTRAINED`
- `BLOCKED`

Default view remains compact.

For compiler-first origin, M3 copy is conditional:

- legacy origin: `AI Proposal vs Director Compiler`;
- compiler-first origin: `Assembled Sequence Integrity` plus a separate raw completion audit state.

M4 remains after this intelligence area and before Apply.

## Failure behavior

### Invalid AI completion

If completion validation fails:

- do not assemble `sequenceProposal`;
- do not make Apply ready;
- preserve raw completion for inspection;
- show structured validation errors;
- allow retrying completion without rebuilding the skeleton when upstream inputs are unchanged.

### Skeleton cannot be compiled

If confirmed Reading or selected Strategy is missing, no Sequence request is allowed.

If Visual IR grammar is unresolved, the skeleton may still preserve canonical five-beat structure and Strategy hierarchy, but no grammar-specific patch path becomes compiler-owned. UI shows `GRAMMAR UNRESOLVED`.

### Compiler contract gap

A blocked grammar dimension remains blocked and never becomes AI-open automatically.

## Testing

### Skeleton unit tests

Verify:

1. exactly five canonical beats in order;
2. Strategy hierarchy is compiler-owned;
3. Agency path starts and ends on confirmed states;
4. adjacent duplicate Agency states normalize deterministically;
5. intermediate Agency timing remains open;
6. supported claimed paths are marked compiler-owned without requiring unresolved beat Agency;
7. derived compiler-owned paths identify `agency` as dependency where appropriate;
8. partial mappings are constrained only when a deterministic rule exists;
9. blocked mappings never become AI-open;
10. unresolved grammar creates no fake grammar-owned values.

### Completion validator tests

Verify:

1. matching skeleton revision passes;
2. stale skeleton revision fails;
3. legal monotonic Agency path passes;
4. Agency regression fails;
5. outside-path Agency fails;
6. missing final Agency fails;
7. compiler-owned field write fails;
8. constrained-field violation fails;
9. blocked field write fails;
10. undeclared open field write fails;
11. reordered beats fail;
12. extra or missing beats fail;
13. invalid open Scene State values fail.

### Assembly tests

Verify:

1. AI-open fields survive into assembled proposal;
2. Strategy hierarchy comes from skeleton, not AI;
3. compiler-owned Camera derives from validated Agency;
4. compiler-owned Color derives from validated Agency;
5. raw completion remains immutable;
6. assembled patch passes existing Narrative contract validation;
7. provenance distinguishes compiler and AI fields.

### API tests

Verify:

1. prompt describes completion rather than full proposal generation;
2. static schema validates completion shape but does not pretend to know dynamic ownership;
3. server semantic validation rejects compiler-owned and blocked writes using the supplied skeleton;
4. stale skeleton revision is rejected;
5. API response is `sequenceCompletion`;
6. demo fixture and live API use the same browser-side assembler contract.

### Browser acceptance

Use Camera Authority as the primary path.

Verify:

1. Sequence stage reports `SEQUENCE ORIGIN · COMPILER-FIRST`;
2. raw completion chooses legal Agency timing;
3. `camera.perspective` is absent from raw AI `openPatch`;
4. assembler deterministically derives camera perspective from Agency;
5. final Sequence Preview contains the compiler-derived value;
6. compiler-first integrity view does not claim the AI authored that value;
7. M4 reports compiler-supported values as `CONFIRM` under normal synthesis;
8. Apply still requires explicit click;
9. Scene State is unchanged before Apply;
10. Apply writes assembled proposal;
11. manual DIRECT edits remain possible afterward.

Add a negative browser fixture where AI completion attempts to write `camera.perspective`. Validation must block assembly, preserve the raw attempted write for inspection, and keep Apply unavailable.

## Compatibility

### Legacy saved proposals

Existing projects containing only `sequenceProposal` continue through the M3/M4 compatibility path as `origin: legacy-ai-first`. They are not retroactively rewritten into skeleton/completion artifacts.

### Existing downstream runtime

The canonical downstream `sequenceProposal` shape remains unchanged, so `narrative-apply.js`, Sequence Director, Project runtime, and Scene State do not need a schema migration merely to consume M5 output.

### Demo mode

`narrativeDemo=1` provides a deterministic `sequenceCompletion` fixture compatible with the compiled skeleton, not a preassembled final proposal. Demo and live API use the same browser validator and assembler.

## Expected implementation surface

New runtime modules:

- `visual-direction-os/visual-sequence-skeleton.js`
- `visual-direction-os/visual-sequence-completion.js`

Likely existing runtime changes:

- `visual-direction-os/narrative-state.js`
- `visual-direction-os/narrative-workspace.js` only for new request/assembly transaction; no UI redesign
- `visual-direction-os/narrative-api-client.js`
- `visual-direction-os/narrative-demo-fixtures.js`
- `visual-direction-os/visual-ir-shadow.js` for origin/provenance inspection
- `visual-direction-os/director-v2.html` for runtime load order
- `visual-direction-os/visual-ir-inspector.css` for compact provenance presentation

API changes:

- `api/narrative/_contracts.js`
- `api/narrative/_prompts.js`
- server semantic validation wiring
- related tests

CI additions:

- skeleton contract tests;
- completion validation and assembly tests;
- API completion contract tests;
- compiler-first browser acceptance.

## Non-goals

M5 does not:

- grant authority to unsupported or blocked dimensions;
- invent exact Space intensity from Spatial Authorship;
- reinterpret Texture as Medium or Line as Boundary/Edge;
- infer numerical animation cadence;
- remove legacy M3 raw AI audit;
- remove M4 Apply-time authority safety;
- auto-Apply to Director;
- lock manual DIRECT controls after Apply;
- change Project into a new workspace;
- add image generation or rendering;
- migrate framework;
- merge into `integration/director-workspace-v2-1` or `master` without product review.

## Success criteria

M5 is complete when:

1. deterministic Sequence structure exists before AI completion;
2. valid AI completion is structurally unable to own compiler-claimed paths;
3. Agency transition timing remains a constrained narrative choice rather than a hard-coded beat map;
4. dynamic ownership is validated semantically against the same skeleton on server and browser;
5. browser assembles the existing downstream `sequenceProposal` from skeleton plus valid completion;
6. raw completion provenance remains inspectable and is not mislabeled as compiler output;
7. M3 legacy audit and M4 Apply-time safety remain intact;
8. legacy AI-first proposals still load;
9. no canonical Scene State mutation occurs before explicit Apply;
10. Director can manually edit applied state afterward.