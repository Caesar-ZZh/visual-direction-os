# M5 Compiler-First Sequence Synthesis — Design

## Goal

Move Sequence generation from AI-first proposal generation to compiler-first constrained synthesis without inventing unsupported visual behavior, erasing raw provenance, or removing human Director control.

M5 introduces a deterministic Sequence Skeleton produced before the AI completion step. The skeleton owns only structure and constraints that are already justified by the confirmed Narrative Reading, selected Strategy, Visual IR, Grammar Registry, and current Scene State contract. AI becomes a constrained completion layer that may fill explicitly open slots but may not rewrite compiler-owned structure or authoritative values.

## Context

M0 introduced a read-only Visual IR bridge from confirmed Narrative Reading plus selected Strategy.

M2 introduced explicit evidence-aware grammar identity and contract-aware Visual IR bindings.

M3 introduced a deterministic Visual Compiler that can emit supported, partial, and blocked expectations and compare them against the raw AI Sequence proposal.

M4 introduced guarded Apply-time authority. Raw AI `sequenceProposal` remains immutable; an `AuthorityPlan` derives a transient `resolvedProposal`; only compiler assertions with `status === supported` may confirm, override, or inject values when the user explicitly clicks **Apply to Director**.

The remaining AI-first dependency is the Sequence request itself. The current `sequence` prompt asks the model to produce exactly five complete beats including agency, variable hierarchy, visual events, rationale, and a complete Scene State patch for every canonical variable family. Compiler authority arrives only after that full AI proposal exists.

M5 moves the compiler in front of the AI completion call.

## Chosen approach

### Compiler Skeleton + Constrained AI Completion

The M5 pipeline is:

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
M3 raw audit
+
M4 guarded authority at Apply
        ↓
Director
```

The compiler does not generate an entire visual Sequence. It generates the subset it can justify and explicitly marks all other fields as open or blocked.

## Why this approach

### Rejected: stronger prompt instructions on the existing full AI Sequence response

This would remain AI-first. A prompt can request compliance but does not structurally prevent the model from selecting or rewriting compiler-owned values.

### Rejected: compiler-only full Sequence generation

The current Grammar Registry and Scene State contract do not justify exact values for every field in Space, Camera, Color, Line, Texture, Rhythm, ownership, and timing. A compiler-only full proposal would either remove useful creative freedom or fabricate unsupported values.

### Selected: deterministic skeleton plus constrained completion

This preserves generative flexibility only where evidence or contract authority is incomplete. It also makes provenance machine-readable: every final field can be classified as compiler-owned, AI-completed, blocked, or director-overridden later.

## Core design principles

### 1. Compiler ownership must be explicit

Every compiler-owned value or structural constraint must carry provenance and support status. Compiler ownership is never inferred from mere presence in the skeleton.

### 2. AI may write only declared open slots

The completion request is not a free-form replacement Sequence. The model receives the skeleton and returns completion content only for fields whose slot status is `open`.

### 3. Blocked is not open

A contract or evidence gap is not permission for AI to invent a value that the product would then present as validated. Blocked fields may remain represented in a raw AI detail object only if needed for later experimentation, but they do not enter the assembled authoritative proposal in M5.

### 4. Supported compiler claims remain authoritative

Fields already classified as `supported` by the deterministic compiler become compiler-owned in the skeleton. AI completion cannot overwrite them.

### 5. Partial claims constrain without writing

A `partial` claim may create a validator rule or allowed set but does not become a fixed compiler value unless the rule can be represented deterministically.

### 6. Raw AI completion remains inspectable

The raw AI completion payload is preserved separately from the assembled proposal. M3 continues to audit raw model behavior rather than a sanitized fake match.

### 7. Apply remains explicit

M5 changes proposal construction, not the mutation boundary. Sequence Director and canonical Scene State still change only after **Apply to Director**.

### 8. Manual Director edits remain possible after Apply

Compiler-first generation governs machine synthesis. It does not create permanent locks on DIRECT controls.

## Sequence Skeleton model

Create a new pure runtime module:

`visual-sequence-skeleton.js`

Primary interface:

```js
compileSequenceSkeleton({
  confirmedReading,
  selectedStrategy,
  visualIR
})
```

The result shape is:

```js
{
  version: '0.1.0',
  mode: 'compiler-first',
  grammarId,
  readingId,
  strategyId,
  agencyConstraint,
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

The skeleton always contains exactly the canonical beat order:

1. `setup` / `SETUP`
2. `pressure` / `PRESSURE`
3. `rupture` / `RUPTURE`
4. `release` / `RELEASE`
5. `new-ownership` / `NEW OWNERSHIP`

The skeleton owns beat identity and order. AI cannot rename, insert, delete, or reorder beats in M5.

## Variable hierarchy ownership

The selected Strategy already defines:

- `primaryVariable`
- `supportingVariables`
- `restrainedVariables`

M5 treats this hierarchy as compiler-owned Sequence structure.

Every beat inherits the selected Strategy hierarchy unless a later evidence-aware compiler module explicitly defines a beat-level exception. M5 does not introduce such exceptions.

Therefore AI completion cannot change the Primary variable, move a restrained variable into Primary, or add a new supporting variable that was not declared by the selected Strategy.

This keeps the Strategy as the causal visual contract and prevents Sequence generation from silently reinterpreting it.

## Agency Constraint model

### Source

The Agency Constraint is compiled from the confirmed Narrative Reading's `agencyTransition.value`.

Example:

```js
['world', 'contested', 'character']
```

### Constraint semantics

The compiler does not assign every transition to one predetermined beat.

Instead it converts the confirmed transition into an ordered state path. Each beat receives an allowed agency set constrained by monotonic progression through that path.

For a path:

```text
WORLD → CONTESTED → CHARACTER
```

M5 guarantees:

- `SETUP` equals the first confirmed state: `WORLD`.
- `NEW OWNERSHIP` equals the final confirmed state: `CHARACTER`.
- intermediate beats may remain in the current state or advance to a later state;
- intermediate beats may not return to an earlier state after advancing;
- every emitted agency value must exist in the confirmed transition path;
- the final state must be reached by `NEW OWNERSHIP`.

Legal example:

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

The validator reports the first backward transition as an `AGENCY_REGRESSION` error.

### Repeated states in confirmed input

If the confirmed Reading contains repeated adjacent states, the skeleton normalizes adjacent duplicates before constructing progression constraints.

Example:

```text
WORLD → WORLD → CONTESTED → CHARACTER
```

becomes:

```text
WORLD → CONTESTED → CHARACTER
```

The compiler does not invent missing intermediate agency states.

### `shared`

`shared` remains a valid canonical agency state. It is treated as a distinct state only when it appears in the confirmed transition path. It is not automatically equated with `contested`.

## Grammar-owned patch slots

For each beat, the skeleton calls the existing deterministic Visual Compiler using the beat's eventual agency value.

Because agency for intermediate beats is not fixed until AI completion, M5 distinguishes two kinds of compiler ownership.

### Static compiler-owned fields

A field is static when its supported value does not depend on an open beat decision.

If such a field is available, the skeleton can store it directly as:

```js
{
  status: 'compiler-owned',
  support: 'supported',
  value,
  source,
  why
}
```

### Derived compiler-owned fields

A field is derived when the path is compiler-owned but its exact value depends on a validated AI completion decision such as beat agency.

Example for `camera-authority-transfer`:

```text
agency = world      → camera.perspective = world
agency = contested  → camera.perspective = mixed
agency = shared     → camera.perspective = mixed
agency = character  → camera.perspective = character
```

The AI owns the legal agency transition timing, but it does not own `camera.perspective`. Once the validator accepts the beat agency, the assembler derives the authoritative camera value deterministically.

The same rule applies to:

- `color-ownership-transfer` → `color.territory`
- `agency-ownership-transfer` → top-level `agency`

### Partial fields

Partial compiler expectations are represented as:

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

A partial field is never presented as a compiler-owned exact value.

If the existing compiler cannot produce a finite allowed set or deterministic validator rule, the field remains blocked rather than open.

### Blocked fields

Blocked fields are represented as:

```js
{
  status: 'blocked',
  support: 'blocked',
  source,
  why
}
```

They do not appear in the final assembled patch unless a later product phase explicitly changes the evidence or Scene State contract.

M5 preserves existing rules:

- `Line` is not silently reinterpreted as Boundary or Edge.
- `Texture` is not silently reinterpreted as Medium.
- no numerical temporal cadence is inferred from incomplete temporal evidence.

## AI Completion contract

M5 introduces a separate completion payload instead of asking AI for a final `sequenceProposal` directly.

The API stage remains internally named `sequence`, but its response contract changes to `sequenceCompletion`.

The model receives:

- confirmed Narrative Reading;
- selected Strategy;
- serialized Sequence Skeleton;
- explicit list of writable open slots;
- explicit list of compiler-owned or blocked paths that must not be returned.

The model returns:

```js
{
  sequenceCompletion: {
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

The five beat IDs must match the skeleton exactly and remain in canonical order.

### AI-owned fields in M5

AI may complete:

- `narrativeBeat`;
- legal `agency` values subject to the Agency Constraint;
- up to three `visualEvents`;
- concise `rationale`;
- only Scene State fields declared as `open` in `patchSlots`.

### AI may not return

AI completion must not return or modify:

- beat `label`;
- `primaryVariable`;
- `supportingVariables`;
- `restrainedVariables`;
- compiler-owned patch paths;
- blocked patch paths;
- unknown extra Scene State keys;
- reordered or additional beats.

Returning compiler-owned or blocked paths is a validation error, not an override request.

## Completion Validator

Create:

`visual-sequence-completion.js`

Primary interfaces:

```js
validateSequenceCompletion({ skeleton, completion })
assembleSequenceProposal({ skeleton, completion })
```

### Validation classes

The validator returns structured errors rather than a synthetic score.

Required error types include:

- `BEAT_COUNT_MISMATCH`
- `BEAT_ID_MISMATCH`
- `AGENCY_OUTSIDE_CONFIRMED_PATH`
- `AGENCY_REGRESSION`
- `FINAL_AGENCY_NOT_REACHED`
- `COMPILER_OWNED_FIELD_WRITE`
- `BLOCKED_FIELD_WRITE`
- `UNDECLARED_OPEN_FIELD_WRITE`
- `INVALID_VISUAL_EVENT`
- `INVALID_SCENE_STATE_VALUE`

The validator must not silently drop forbidden writes and then present the result as valid. A forbidden write remains visible in the raw completion and causes validation failure.

## Assembly rules

`assembleSequenceProposal()` only runs on a valid completion.

For each beat it constructs the existing Narrative `sequenceProposal` shape expected by current downstream systems:

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

The final `sceneStatePatch` is assembled in this order:

1. start from declared AI-open patch values;
2. apply compiler-owned static values;
3. derive compiler-owned values that depend on the validated beat agency;
4. set top-level agency from the validated beat agency;
5. validate the resulting patch through the existing `validateSceneStatePatch()` contract.

AI cannot win a merge conflict against a compiler-owned path because such writes never pass completion validation.

## Provenance model

The runtime keeps three distinct artifacts:

1. **Sequence Skeleton** — deterministic compiler output before AI completion.
2. **Raw Sequence Completion** — exact model response before validation and assembly.
3. **Assembled Sequence Proposal** — valid downstream proposal produced from skeleton plus completion.

The assembled proposal receives companion provenance metadata outside the canonical beat patch shape:

```js
{
  origin: 'compiler-first',
  skeletonVersion,
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

This metadata is inspectable but must not be inserted into `sceneStatePatch`, because the canonical Scene State contract does not accept arbitrary provenance keys.

## Interaction with M3

M3 changes meaning slightly but remains useful.

It must compare the **raw AI completion intent** against deterministic compiler ownership where those values are semantically comparable. It must not compare the assembled compiler-first proposal to itself and report artificial perfect matches.

If the AI attempts to write a compiler-owned path, M3 or the completion inspector should expose that attempted conflict even though validation prevents assembly.

The raw completion remains the audit source.

## Interaction with M4

M4 remains as a safety boundary rather than becoming redundant.

The M5 assembled proposal should already contain compiler-owned supported values. Therefore normal M5 output is expected to produce mostly `CONFIRM` decisions in M4.

M4 still protects:

- legacy AI-first saved proposals;
- malformed or externally supplied proposals;
- future runtime drift;
- browser sessions where an older proposal is loaded;
- any supported compiler claim added after a proposal was generated.

M5 does not remove `AuthorityPlan` or Apply-time validation.

## Narrative state changes

The Narrative Draft state adds non-canonical generation artifacts:

```js
sequenceSkeleton
sequenceCompletion
sequenceProposal
sequenceProvenance
```

`sequenceProposal` remains the downstream compatibility artifact.

Upstream invalidation rules extend as follows:

- changing confirmed Reading invalidates skeleton, completion, proposal, provenance;
- changing selected Strategy invalidates skeleton, completion, proposal, provenance;
- rebuilding Visual IR because grammar identity changed invalidates skeleton, completion, proposal, provenance;
- requesting a new AI completion replaces completion, proposal, provenance but may reuse the same deterministic skeleton when its inputs are unchanged.

No stale completion may be assembled against a newer skeleton revision.

## API changes

### Request

The `sequence` API request adds:

```js
sequenceSkeleton
```

The server must treat this skeleton as authoritative structured context supplied by the application, not as text to be reinterpreted.

### Prompt

The sequence prompt changes from:

> Return a complete Scene State patch for every beat.

To a constrained completion instruction:

- return exactly one completion entry for each supplied skeleton beat;
- preserve beat IDs and order;
- select only legal agency states under the supplied Agency Constraint;
- write only paths declared open;
- do not repeat compiler-owned or blocked paths;
- do not reinterpret Strategy hierarchy;
- provide narrative purpose, visual events, rationale, and open patch detail only.

### Server response schema

The server response schema validates `sequenceCompletion`, not final `sequenceProposal`.

The browser performs the deterministic final assembly so the same compiler and validation logic is used in demo mode and API mode.

## UI

M5 does not add a new major workspace.

The existing Sequence Preview gains a restrained origin line:

> **SEQUENCE ORIGIN · COMPILER-FIRST**

The Sequence Intelligence area may expose an expandable per-beat provenance view showing:

- `COMPILER OWNED`
- `AI COMPLETED`
- `CONSTRAINED`
- `BLOCKED`

The default collapsed view remains compact. The existing M3 Compare, M4 Authority, and Apply controls remain in their current order.

For a valid compiler-first proposal, M4 may visually indicate that supported fields were already compiler-owned at synthesis time and were confirmed again at Apply.

## Failure behavior

### Invalid AI completion

If completion validation fails:

- do not assemble `sequenceProposal`;
- do not show Apply controls as ready;
- preserve the raw completion for inspection;
- show structured validation errors;
- allow retrying only the completion request without rebuilding the skeleton when upstream inputs have not changed.

### Skeleton cannot be compiled

If confirmed Reading or selected Strategy is missing, no Sequence request is allowed.

If Visual IR grammar remains unresolved, a skeleton may still preserve the canonical five-beat structure and Strategy hierarchy, but no grammar-specific patch path becomes compiler-owned. The UI must clearly show `GRAMMAR UNRESOLVED`.

### Agency transition is invalid

If confirmed `agencyTransition` contains fewer than two valid canonical states after adjacent duplicate normalization, skeleton compilation fails and Sequence generation does not proceed.

### Compiler contract gap

A blocked grammar dimension remains blocked and does not become an AI-open field automatically.

## Testing

### Skeleton unit tests

Verify:

1. skeleton always emits the five canonical beats in order;
2. Strategy hierarchy is copied as compiler-owned structure;
3. Agency path starts and ends on confirmed states;
4. adjacent duplicate agency states normalize deterministically;
5. intermediate agency state timing remains open;
6. compiler-supported patch paths are marked compiler-owned;
7. partial mappings are constrained but not fixed;
8. blocked mappings are not converted into AI-open slots;
9. unresolved grammar creates no fake grammar-owned patch values.

### Completion validator tests

Verify:

1. legal monotonic agency path passes;
2. agency regression fails;
3. outside-path agency fails;
4. missing final agency fails;
5. compiler-owned field write fails;
6. blocked field write fails;
7. undeclared open field write fails;
8. reordered beats fail;
9. extra or missing beats fail;
10. invalid open Scene State values fail.

### Assembly tests

Verify:

1. AI-open fields survive into the assembled proposal;
2. Strategy hierarchy comes from skeleton, not AI;
3. compiler-owned Camera value derives from validated agency;
4. compiler-owned Color value derives from validated agency;
5. raw completion remains immutable;
6. resulting `sceneStatePatch` passes existing Narrative contract validation;
7. provenance correctly distinguishes compiler and AI fields.

### API tests

Verify:

1. sequence prompt describes completion rather than full proposal generation;
2. server schema rejects compiler-owned patch keys when they are not listed as open;
3. API response is `sequenceCompletion`;
4. demo fixture and live API use the same browser-side assembler contract.

### Browser acceptance

Use Camera Authority as the primary acceptance path.

Verify:

1. Sequence stage reports `SEQUENCE ORIGIN · COMPILER-FIRST`;
2. raw completion chooses a legal agency timing;
3. `camera.perspective` is absent from the raw AI open patch;
4. assembler deterministically derives camera perspective from agency;
5. final Sequence Preview contains the compiler-derived value;
6. M4 reports compiler-supported values as `CONFIRM` under normal compiler-first synthesis;
7. Apply still requires an explicit click;
8. Scene State remains unchanged before Apply;
9. Apply writes the assembled proposal;
10. manual DIRECT edits remain possible afterward.

Add a negative browser fixture where AI completion attempts to write `camera.perspective`. Verify validation blocks proposal assembly and Apply does not become ready.

## Compatibility

### Legacy saved proposals

Existing projects containing only `sequenceProposal` continue to load through the M3/M4 compatibility path. They are treated as `origin: legacy-ai-first` and are not retroactively rewritten into M5 skeleton/completion artifacts.

### Existing Director V2 runtime

The canonical downstream `sequenceProposal` shape remains unchanged, so `narrative-apply.js`, Sequence Director, Project runtime, and Scene State do not require a schema migration merely to consume M5 output.

### Demo mode

`narrativeDemo=1` must provide a deterministic completion fixture compatible with the compiled skeleton rather than a preassembled final proposal. The same browser assembler must build the proposal in both demo and live API modes.

## Files expected to change

New runtime modules:

- `visual-direction-os/visual-sequence-skeleton.js`
- `visual-direction-os/visual-sequence-completion.js`

Likely existing runtime changes:

- `visual-direction-os/narrative-state.js`
- `visual-direction-os/narrative-workspace.js` only where necessary to orchestrate the new request/assembly transaction; no UI redesign
- `visual-direction-os/narrative-api-client.js`
- `visual-direction-os/narrative-demo-fixtures.js`
- `visual-direction-os/visual-ir-shadow.js` for provenance/origin inspection only
- `visual-direction-os/director-v2.html` for new runtime load order
- `visual-direction-os/visual-ir-inspector.css` for compact provenance presentation

API changes:

- `api/narrative/_contracts.js`
- `api/narrative/_prompts.js`
- related tests

CI additions:

- skeleton contract tests
- completion validation/assembly tests
- API completion contract tests
- compiler-first browser acceptance

## Non-goals

M5 does not:

- grant compiler authority to unsupported or blocked dimensions;
- invent exact Space intensity from Spatial Authorship;
- reinterpret Texture as Medium or Line as Boundary/Edge;
- infer numerical animation cadence;
- remove M3 raw-model audit;
- remove M4 Apply-time authority safety;
- auto-Apply to Director;
- lock manual DIRECT controls after Apply;
- change the Project model into a new workspace;
- add generation or image rendering;
- migrate the app to another framework;
- merge into `integration/director-workspace-v2-1` or `master` without product review.

## Success criteria

M5 is complete when:

1. the deterministic compiler produces the Sequence structure before the AI completion request;
2. the AI response is structurally incapable of owning compiler-claimed paths in a valid completion;
3. agency transition timing remains a constrained narrative choice rather than a hard-coded beat mapping;
4. the browser assembles a standard downstream `sequenceProposal` from skeleton plus valid completion;
5. M3 preserves raw AI provenance and M4 remains an independent Apply-time safety layer;
6. legacy AI-first proposals still load;
7. browser acceptance proves no canonical Scene State mutation happens before explicit Apply;
8. the Director can still manually edit applied state afterward.