# M4 Compiler Authority Handoff — Design

## Goal

Move Director Intelligence from read-only comparison into guarded execution authority at the existing explicit Apply boundary, without replacing the Director Workspace, mutating preview state, or granting authority to unsupported grammar claims.

## Context

M3 introduced a deterministic Visual Compiler and Shadow Compare. AI Sequence proposals currently carry `sceneStatePatch` values; the compiler independently emits evidence-aware expectations and labels them `supported`, `partial`, or blocked. Apply currently writes the AI proposal patch into Sequence Director and then updates canonical Scene State only after the user clicks **Apply to Director**.

M4 preserves that Apply boundary but changes which values are authoritative inside it.

## Chosen approach: Apply-time Guarded Authority Resolver

Keep the raw AI proposal immutable for audit. Derive a separate authority-resolved proposal immediately before Apply. The resolver overlays only compiler assertions whose support status is exactly `supported`.

This gives three distinct artifacts:

1. **AI Raw Proposal** — unchanged model output.
2. **Authority Plan** — deterministic audit of what the compiler confirms, overrides, injects, blocks, or leaves to AI.
3. **Resolved Proposal** — transient proposal used by Apply. It is not written back into Narrative Draft state.

## Why this approach

### Rejected: rewrite the AI proposal after Sequence generation

This would erase provenance and make it difficult to distinguish model output from deterministic compiler corrections.

### Rejected: compiler-first replacement of the entire Sequence patch

The current grammar registry does not yet justify values for every Scene State dimension. A full replacement would either delete useful AI detail or invent unsupported values.

### Selected: guarded overlay at Apply

This is the smallest real authority transfer. It makes compiler-backed fields authoritative while preserving AI as a non-authoritative source for unclaimed dimensions.

## Authority rules

### Rule 1 — Only `supported` assertions may write

An assertion emitted by `compileBeatExpectations()` can alter the resolved patch only when `assertion.status === 'supported'`.

`partial` assertions remain observation-only. They may appear in Shadow Compare, but they cannot override or inject a value during Apply.

### Rule 2 — Blocked gaps never write

Compiler gaps remain `BLOCKED`. The resolver must not synthesize a replacement value for them.

If the AI proposal already contains values inside a blocked or unclaimed dimension, those values remain in the resolved patch as AI-retained values. They are explicitly not compiler-endorsed.

### Rule 3 — Supported claims have three actions

For each supported compiler claim:

- `CONFIRM` — AI already supplied the expected value.
- `OVERRIDE` — AI supplied a different value; compiler value wins in the resolved patch.
- `INJECT` — AI omitted the claimed field; compiler inserts it.

### Rule 4 — Unclaimed AI fields remain untouched

The resolver does not strip AI-authored values merely because the compiler has no opinion about them. M4 is a gradual handoff, not a compiler-only renderer.

### Rule 5 — Raw proposal remains immutable

Authority resolution must deep-clone inputs. The Narrative Draft's `sequenceProposal` must remain byte-for-byte equivalent before and after preview and Apply preparation.

### Rule 6 — Apply remains explicit

No Scene State or Sequence Director mutation occurs while viewing the Authority Plan. Mutation still happens only when the user presses **Apply to Director**.

### Rule 7 — Manual DIRECT edits remain possible after Apply

Compiler authority governs the proposal-to-Apply boundary, not permanent ownership of the DIRECT controls. After Apply, existing manual controls remain editable.

## M4 authoritative mappings

Based on the M3 compiler:

- `camera-authority-transfer` → `camera.perspective` is authoritative because the assertion is `supported`.
- `color-ownership-transfer` → `color.territory` is authoritative because the assertion is `supported`.
- `agency-ownership-transfer` → `agency` is authoritative because the assertion is `supported`.
- `spatial-authorship` → `camera.perspective` remains non-authoritative in M4 because its assertion is currently `partial`; exact `space` values remain blocked.
- `surface-assignment` remains blocked because current Scene State cannot express per-surface ownership.
- unresolved or latent grammars have no write authority.

## Resolver interface

Create `visual-compiler-authority.js` with pure functions:

```js
resolveBeatAuthority({ visualIR, beat })
resolveSequenceAuthority({ visualIR, proposal })
```

A beat result has this shape:

```js
{
  id,
  label,
  grammarId,
  originalPatch,
  resolvedPatch,
  decisions: [
    {
      path,
      action: 'CONFIRM' | 'OVERRIDE' | 'INJECT' | 'PARTIAL' | 'BLOCKED',
      from,
      to,
      authority: 'compiler' | 'ai',
      support,
      source,
      why
    }
  ]
}
```

A sequence result contains:

```js
{
  version: '0.1.0',
  mode: 'guarded',
  grammarId,
  beats,
  resolvedProposal,
  totals: {
    CONFIRM: 0,
    OVERRIDE: 0,
    INJECT: 0,
    PARTIAL: 0,
    BLOCKED: 0
  }
}
```

`resolvedProposal` preserves all proposal metadata and only replaces each beat's `sceneStatePatch` with its resolved clone.

## Apply integration

`visual-ir-shadow.js` remains the Director Intelligence integration controller. Once a confirmed Reading, selected Strategy, and Sequence proposal exist, it builds and exposes the Authority Plan through:

```js
getAuthorityPlan()
```

`narrative-apply-ui.js` reads that plan at click time. If a valid plan exists for the latest proposal, it passes `authorityPlan.resolvedProposal` to `VDOSNarrativeApply.buildSequenceFromProposal()`.

If the Authority Plan is unavailable or unresolved, Apply falls back to the existing raw proposal without inventing authority. The UI must say that the AI proposal is being retained because compiler authority is unresolved.

The existing selected-beat behavior remains unchanged: only selected beat IDs are applied.

Because `buildSequenceFromProposal()` builds Sequence events from the proposal beat, event `targetPatch` automatically reflects the resolved patch when the resolved proposal is supplied.

## UI

Add a read-only **Compiler Authority / GUARDED** panel in Sequence Preview, after the M3 Shadow Compare and before the Apply controls.

The panel must show:

- active grammar;
- `CONFIRM / OVERRIDE / INJECT / PARTIAL / BLOCKED` totals;
- per-beat compiler decisions;
- explicit copy that no mutation has happened yet;
- a visible distinction between compiler-authoritative values and AI-retained / non-endorsed values.

Copy must avoid implying that blocked or partial fields are validated.

## Failure behavior

- Invalid resolved patches fail before mutation.
- Resolver errors do not silently mutate Scene State.
- If authority resolution cannot be produced, Apply uses the existing AI proposal and reports `COMPILER UNRESOLVED / AI RETAINED`.
- No new network dependency is introduced.

## Testing

### Unit

Verify:

1. supported matching assertion → `CONFIRM`, no patch change;
2. supported conflict → `OVERRIDE`, compiler value wins;
3. supported missing field → `INJECT`;
4. partial assertion → no write;
5. blocked gap → no write;
6. raw proposal remains immutable;
7. resolved proposal remains a valid Narrative Scene State patch;
8. selected Apply uses resolved patches and resolved event targets.

### Browser

Add an M4 browser fixture that deliberately introduces one AI/compiler camera conflict after Sequence Preview, without changing canonical Scene State. Verify:

1. Authority panel reports `OVERRIDE` before Apply;
2. Scene State remains unchanged before Apply;
3. clicking Apply writes the compiler value, not the conflicting AI value;
4. the raw Narrative proposal still contains the original AI value;
5. DIRECT remains manually editable afterward;
6. M3 Shadow Compare still reports the raw AI-vs-compiler conflict rather than being rewritten to a fake match.

## Non-goals

- No compiler-first generation of complete Sequence proposals.
- No automatic Apply.
- No authority for `partial`, `blocked`, latent, or unresolved grammar claims.
- No new Scene State dimensions in M4.
- No removal of AI-authored unclaimed fields.
- No removal of manual DIRECT controls.
- No merge into `integration/director-workspace-v2-1` or `master` without product review.