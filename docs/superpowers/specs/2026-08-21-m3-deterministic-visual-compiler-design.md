# M3 Deterministic Visual Compiler / Shadow Compare Design

## Goal

Add a deterministic compiler layer that reads the already-confirmed Narrative Reading, selected Strategy, resolved Visual IR v0.3, and AI Sequence proposal, then produces evidence-bounded expectations and compares them against the AI `sceneStatePatch` without mutating canonical Scene State.

## Position in the product

```text
Confirmed Reading
→ Selected Strategy + grammarId
→ Evidence-aware Visual IR
→ Deterministic Visual Compiler
→ Compiler Expectations
                ↘
AI Sequence proposal → Shadow Compare
                ↓
          Director inspection
```

M3 remains Shadow Mode. `Apply`, canonical Scene State, Project state, Sequence Director, and Diagnose stay authoritative and unchanged.

## Compiler contract

The compiler does not generate a complete replacement `sceneStatePatch`. It emits only assertions that are causally justified by the resolved grammar and current canonical contract.

Each assertion contains:

- `path`: canonical patch path such as `camera.perspective` or `color.territory`;
- `expected`: exact deterministic value when evidence and contract allow one;
- `status`: `supported`, `partial`, or `blocked`;
- `source`: grammar id;
- `why`: concise causal explanation.

No assertion is emitted for an unresolved Visual IR field. Missing expressive capacity is surfaced as a contract gap rather than approximated.

## First executable mappings

### Spatial Authorship

The current contract can safely compare ownership-facing camera perspective to beat agency:

- `world` → `camera.perspective = world`
- `contested/shared` → `camera.perspective = mixed`
- `character` → `camera.perspective = character`

Space itself remains a mechanism-level assertion (`authorship-transfer`) in M3 because exact compression/openness values depend on sequence phase and are not yet sufficiently constrained by the grammar alone. M3 must not turn “Space” into a generic intensity curve.

### Camera Authority Transfer

Compare `camera.perspective` directly against beat agency using the same deterministic ownership mapping.

### Color Ownership Transfer

Compare `color.territory` against beat agency:

- `world` → `world`
- `contested/shared` → `contested`
- `character` → `character`

Do not infer temperature, saturation, or hue.

### Agency Ownership Transfer

Compare top-level `sceneStatePatch.agency` against beat `agency`. Do not infer unsupported ownership levels.

### Surface Assignment

The current Scene State texture contract cannot express per-surface ownership. M3 therefore emits a `blocked` contract gap instead of interpreting `noise`, `granularity`, or `materiality` as Medium/ownership.

### Latent grammars

Relational Boundary and Medium/Time remain blocked exactly as in M2. No `line ≈ edge` or `texture ≈ medium` coercion is permitted.

## Comparison semantics

Per assertion:

- `MATCH`: the AI patch explicitly contains the expected value;
- `CONFLICT`: the AI patch explicitly contains a different value;
- `MISSING`: the AI patch omits a compiler-supported value;
- `BLOCKED`: compiler cannot safely compare because the current contract cannot express the mechanism.

A missing path is not silently treated as a match.

Per beat, summarize counts without producing a synthetic score. Across the sequence, summarize `MATCH / CONFLICT / MISSING / BLOCKED` totals.

## UI

Add a restrained `SHADOW COMPARE` section to Sequence Preview after the five AI proposal beats and before Apply preview. It shows:

- resolved Grammar;
- compiler mode `DETERMINISTIC / READ-ONLY`;
- sequence-level counts;
- one compact row per beat with status and the most important comparison details;
- expandable JSON for auditability.

The panel must visually match the existing Director V2 / Direction Logic language and must not create a new mode or route.

## Safety / compatibility

- No Scene State mutation.
- No change to Apply semantics.
- No change to Project or Sequence state contracts.
- No hidden natural-language interpreter in the compiler.
- Legacy Strategy without `grammarId` produces unresolved/blocked comparison rather than guessed grammar.
- Unknown and evidence-incomplete dimensions remain explicit.

## Acceptance criteria

1. Deterministic compiler emits only evidence/contract-supported assertions.
2. A camera/color mismatch is reported as `CONFLICT`; omitted supported fields are `MISSING`.
3. Surface Assignment reports a contract gap instead of treating Texture as Medium.
4. Sequence Preview renders Shadow Compare after the AI proposal is available.
5. Browser acceptance proves Scene State is byte-for-byte unchanged before and after Shadow Compare.
6. Existing Narrative, Project, and Pages regressions remain green.
