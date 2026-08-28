# M8 Generation Prompt Compiler — Normative v2 Amendments and M1 Convergence

**Status:** Normative companion to `2026-08-24-m8-generation-prompt-compiler-design-v2.md`  
**Purpose:** Consolidate the required self-review corrections and define the relationship between the earlier M1 runtime prompt compiler and M8. Where this amendment corrects or narrows wording in v2, this amendment wins. No M9 generation behavior is introduced here.

---

## 1. Section 5.3 cross-reference correction

The unresolved-compiler sentence in v2 Section 5.3 must refer to **Section 23 — Readiness state machine**, not Section 21.

Normative wording:

> For unresolved compiler flows, M8 may still preview DRAFT packages. A Beat may become READY only if it satisfies the applicable source, provenance, Apply Evidence, M7, renderer, and authority guarantees in Section 23. An unresolved Grammar is not permission for M8 to invent Exact REQUIRED values.

---

## 2. Fingerprint algorithm is locked for M8 v1

M8 v1 reuses the deterministic identity convention already established by M7. Implementation planning must not choose a different algorithm.

Canonicalization:

- recursively sort object keys lexicographically;
- preserve array order;
- preserve normalized primitives and `null`;
- omit `undefined` object properties;
- serialize as compact JSON;
- do not include timestamps, DOM state, or incidental insertion order.

Digest:

```text
FNV-1a 64-bit
UTF-8 canonical JSON bytes
JavaScript BigInt arithmetic modulo 2^64
lowercase 16-hex digest
```

M8 prefixes are fixed as:

```text
pir-<16 hex>     Prompt IR semantic identity
pbeat-<16 hex>   guarded proposal Beat identity
pprv-<16 hex>    relevant Beat provenance identity
sbeat-<16 hex>   applied Sequence Director Beat identity
```

These fingerprints are deterministic audit/content identities, not cryptographic signatures.

---

## 3. Apply Evidence write ordering

Apply Evidence may be recorded only after the selected guarded proposal Beats have successfully entered Sequence Director and the existing current-playhead Apply operation has completed without throwing.

Normative order:

```text
resolve exact proposal used for Apply
↓
build selected next Sequence
↓
set Sequence Director sequence successfully
↓
apply current playhead Scene successfully
↓
record receipts only for selected Beat IDs
↓
recompile affected Prompt Packages
```

If the Apply path throws before receipt recording, M8 must not fabricate or preserve a new receipt for that attempted Apply. A Beat without current matching receipt cannot become READY.

This rule does not require M8 to redesign the existing Apply transaction/rollback semantics; it only prevents Prompt readiness from claiming an Apply that did not complete through the existing explicit Apply path.

---

## 4. Per-Beat scope remains authoritative

```text
Apply all      → all selected valid Beats may become READY.
Apply selected → only explicitly selected valid Beats may become READY.
Unselected     → remain DRAFT unless they already possess still-current Apply Evidence for the same current proposal/provenance.
```

Current Scene State reconciliation applies only to the current playhead Beat. Non-current Beat packages must not be compared against another Beat's current Scene State.

---

# M1 → M8 convergence

## 5. Repository reality: there is already an earlier prompt compiler

The branch `phase2-m1-visual-ir-runtime` contains:

```text
visual-direction-os/runtime/prompt-compiler.js
```

with public API:

```js
compileVisualIR(ir)
```

That M1 compiler consumes **VisualIR v0.1.0** and deterministically projects it into a flat model-neutral text contract:

```text
MUST
SHOULD
OPTIONAL
ANTI-RULES
```

It is directly called by the M1 runtime `director-ui.js` after `directBrief()`.

This earlier compiler is a valid prototype/compatibility projection. It is not the same architectural layer as M8.

M8 baseline uses the later Director Intelligence architecture:

```text
Visual IR v0.3.0
+
M5 Sequence Proposal / Provenance
+
M7 Project Constraint Authority
+
Explicit Beat Apply Evidence
↓
Generation Prompt IR
↓
Deterministic Renderer
```

Therefore the two compilers must not survive as independent sources of generation truth.

---

## 6. Formal relationship

The relationship is now fixed as:

```text
M1 runtime/prompt-compiler.js
=
early VisualIR → flat text projection
=
legacy / compatibility surface

M8 Generation Prompt Compiler
=
formal successor + superset
=
canonical generation-translation authority
```

M8 is **not** a second parallel compiler.

M8 must not consume the M1 compiler's rendered string as authoritative source data.

Forbidden architecture:

```text
Visual IR
├── M1 compiler → prompt A
└── M8 compiler → prompt B

both treated as canonical
```

Required convergence:

```text
upstream directing truth
↓
M8 Prompt IR
↓
M8 deterministic renderer
↓
canonical Prompt Package

optional compatibility projection
↓
legacy compileVisualIR-shaped output
```

If the M1 branch is later merged into the M8 lineage, `compileVisualIR` may remain temporarily for compatibility, but it must become one of:

1. a compatibility adapter backed by the canonical M8 translation path where schema conversion is valid; or
2. an isolated M1-only UI compatibility surface that is explicitly excluded from M9 generation authority until migrated.

It must never remain a second independent downstream prompt authority.

---

## 7. Schema-version boundary is explicit

M1 and M8 currently do not share the same Visual IR schema.

```text
M1 runtime VisualIR = 0.1.0
M8 Director Intelligence Visual IR = 0.3.0
```

M8 implementation must not silently pass a v0.1.0 IR into v0.3.0 code or vice versa.

Any future compatibility bridge must:

1. validate the source schema/version first;
2. perform an explicit versioned conversion;
3. preserve UNKNOWN/evidence status;
4. preserve provenance that actually exists;
5. never fabricate M5/M7/Apply provenance for old M1 data;
6. downgrade readiness when required modern provenance is absent.

No implicit duck-typed schema migration is allowed.

---

# Provenance / UNKNOWN strengthening inherited from the M1 review

## 8. Input validation is a compiler contract, not a convenience

The reviewed M1 compiler now validates VisualIR before dereferencing nested fields. M8 inherits the same rule at its own schema boundary.

Every public M8 compile entrypoint must validate its source objects before semantic compilation.

Malformed input must produce a controlled domain error such as:

```text
VISUAL_IR_INVALID
PROMPT_SOURCE_INVALID
PROMPT_IR_INVALID
```

It must not leak incidental JavaScript errors such as:

```text
Cannot read properties of undefined
```

This applies to:

- Visual IR;
- Sequence Proposal;
- Sequence Provenance;
- Project Constraint context;
- Apply Evidence;
- Prompt IR before rendering.

---

## 9. Degenerate UNKNOWN output is prohibited

The M1 review exposed a failure mode where a structurally valid but unresolved default IR could produce strings such as:

```text
Narrative verb: unknown
Hierarchy: .
```

M8 must not reproduce the same failure at a more complex layer.

Formal rule:

```text
required compile backbone unresolved
→ no READY rendered package
```

For M8, the required backbone is **not** the literal M1 trio `narrative.verb / character.primaryVariable / composition.shotSize` because the schemas and pipeline differ.

M8 v1 required structural backbone is:

- valid Scene ID;
- valid Beat ID;
- current confirmed Reading identity;
- current selected Strategy identity;
- explicit Grammar identity where the selected Strategy requires one;
- valid current Sequence Proposal Beat;
- valid applicable Sequence Provenance;
- for READY only, current matching Apply Evidence;
- for Exact REQUIRED values, supported exact compiler provenance.

If a required backbone element is unresolved or missing:

```text
before Apply / proposal incomplete
→ DRAFT with explicit reason
```

or, when a contradiction/stale authoritative source exists:

```text
→ BLOCKED with explicit reason
```

M8 must never fill the missing backbone with prose containing `unknown` merely to produce text.

This does **not** change v2 Section 24:

```text
non-backbone unresolved visual dimensions may remain OPEN
OPEN does not block READY by itself
```

So the final distinction is:

```text
missing required structure/provenance ≠ valid OPEN freedom
```

---

## 10. Evidence gaps are data-driven

The M1 review also exposed a hard-coded temporal-evidence special case while `ir.evidence.gaps` already carried structured evidence gaps.

M8 adopts the general rule:

```text
Evidence gaps come from structured upstream evidence data,
not renderer-specific hard-coded field checks.
```

Prompt IR gains an explicit collection:

```js
evidenceGaps: [
  {
    field: '...',
    status: 'evidence_incomplete',
    confidence: 0.42,
    source: 'visual-ir' | 'sequence-provenance' | 'project-constraint'
  }
]
```

Rules:

1. Preserve upstream field/status/confidence when available.
2. Do not manufacture confidence values.
3. Do not convert an evidence gap into a concrete visual directive.
4. A gap may explain OPEN/BLOCKED/readiness state but does not become a new owner.
5. Field-specific prose may exist only as deterministic presentation of a structured gap; the structured gap remains canonical.

---

## 11. Evidence gaps are visible without becoming generation instructions

M1's flat output can append an `EVIDENCE GAPS:` section because that text is also its audit surface.

M8 separates **generation-facing text** from **audit-facing text** more strictly.

The canonical Prompt Package is amended to include:

```js
rendered: {
  rendererVersion: '0.1.0',
  neutralText: '...',      // generation-facing
  negativeText: '...',     // generation-facing anti-rules only
  auditText: '...',        // provenance + evidence inspection
  sections: { ... }
}
```

`auditText` may include:

```text
VISUAL DIRECTION / MODEL-NEUTRAL — IR <version> / <engine> / grammar <grammarId>

EVIDENCE GAPS:
- <field>: <status> (conf <confidence>)
```

`neutralText` must not tell the generation model to fill or solve an evidence gap.

Example forbidden generation instruction:

```text
Choose an appropriate medium because evidence is incomplete.
```

Evidence gap visibility is therefore preserved without turning uncertainty into directing authority.

---

## 12. Provenance stamp is mandatory in Prompt Package metadata

M8 Prompt Packages must carry explicit provenance metadata sufficient to identify the input contract that produced them.

Minimum metadata:

```js
meta: {
  schema: 'GenerationPromptIR',
  version: '0.1.0',
  sourceVisualIRVersion: '0.3.0',
  engine: 'deterministic',
  grammarId: 'camera-authority-transfer',
  readingId: '...',
  strategyId: '...',
  sceneId: '...',
  beatId: '...'
}
```

If an upstream `generatedAt` exists it may be surfaced in audit metadata, but timestamps remain excluded from semantic fingerprints.

The renderer must have enough metadata to produce a deterministic audit header.

The header is audit provenance, not visual content.

---

## 13. Provenance is returned structurally, not only embedded in text

A provenance header alone is insufficient.

M8 must return structured fields as well as audit text.

At minimum a Prompt Package exposes:

```js
{
  meta: { ... },
  evidenceGaps: [ ... ],
  provenance: {
    requiredFields: [ ... ],
    guidedFields: [ ... ],
    projectConstraintRefs: [ ... ],
    applyEvidence: null | { ... }
  },
  rendered: {
    neutralText: '...',
    negativeText: '...',
    auditText: '...'
  }
}
```

Downstream M9 and M10 must read structured provenance instead of reverse-parsing the audit header.

---

## 14. M1 mandatory hardening is a compatibility baseline

The reviewed M1 `compileVisualIR` contract now establishes the minimum behavior expected from any legacy compatibility surface:

1. validate VisualIR before nested access;
2. reject unresolved mandatory backbone instead of emitting degraded UNKNOWN prompt text;
3. expose `ir.evidence.gaps` data-driven rather than relying only on a hard-coded temporal case;
4. return provenance metadata including schema/version/engine/generatedAt/grammarId;
5. include version/engine/grammar in the flat audit header;
6. retain deterministic, model-neutral output;
7. preserve anti-rules;
8. keep the public `compileVisualIR` export stable while compatibility is required.

M8 implementation may exceed this contract, but must not regress below it when interacting with M1 compatibility code.

---

## 15. M8 module-boundary amendment

v2 Section 28 remains valid, with one additional migration boundary:

### `generation-prompt-compat.js` — only if M1 convergence is needed in the implementation branch

Responsibilities:

- identify supported legacy VisualIR schema explicitly;
- reject unsupported schema/version;
- adapt canonical M8 output into a legacy `compileVisualIR`-shaped projection only where source semantics are representable;
- never invent missing M5/M7/Apply provenance;
- never treat the legacy flat prompt as canonical source truth.

YAGNI rule:

> Do not create this module merely because M1 exists on another branch. Add it only when branch convergence or a live caller requires compatibility during M8 implementation.

---

## 16. TDD gates added to v2 Section 33

M8 implementation planning must add the following RED→GREEN cases.

### Gate A — controlled invalid-input failures

```text
malformed Visual IR
→ controlled VISUAL_IR_INVALID / PROMPT_SOURCE_INVALID
→ never incidental TypeError
```

Repeat for malformed Sequence/Provenance/Apply Evidence inputs.

### Gate B — unresolved required backbone

```text
required structural/provenance backbone missing
→ no READY prompt
→ no REQUIRED line containing synthetic "unknown"
```

Non-backbone UNKNOWN remains OPEN and may coexist with READY.

### Gate C — structured evidence gaps

Tests prove:

- upstream evidence gaps are preserved in `promptIR.evidenceGaps` / package `evidenceGaps`;
- field/status/confidence survive when provided;
- renderer audit output contains `EVIDENCE GAPS:` when gaps exist;
- generation-facing `neutralText` does not instruct the model to resolve the gap;
- no hard-coded temporal-only path is required for gap visibility.

### Gate D — provenance metadata and audit header

Tests prove:

- package returns explicit source Visual IR version and grammar ID;
- package contains reading/strategy/scene/Beat identities;
- audit header contains IR version/engine/grammar;
- the same semantic input produces byte-identical audit header/body;
- timestamps do not change semantic fingerprint.

### Gate E — M1 compatibility, only if convergence is implemented

If `compileVisualIR` or the M1 runtime is merged into the M8 implementation branch, tests must prove:

- public `compileVisualIR` remains callable for supported legacy input;
- malformed/default unresolved legacy IR fails closed;
- evidence gaps/provenance remain visible;
- legacy output is a compatibility projection, not an alternate M9 authority path.

---

## 17. Optional M1 polish remains outside the mandatory M8 correction

The source review listed optional M1 refinements such as:

- moving `value.contrastBudget` into MUST;
- moving `shape.behavior` into SHOULD;
- commenting Set-based deduplication;
- rewriting FX wording.

These remain optional and are not imported into M8 merely by this amendment. They require separate product/wording approval because they affect prompt content rather than provenance/authority safety.

---

## 18. Scope check

This amendment does not pull M9 or M10 into M8.

It adds no:

- model/provider API;
- image/video generation;
- provider-specific negative prompt syntax;
- automatic repair;
- Visual QA scoring;
- new visual owner;
- new exact Grammar family.

The new requirements are all translation-boundary safety:

```text
validate source
preserve provenance
preserve evidence gaps
reject degenerate required UNKNOWN
keep non-required UNKNOWN OPEN
converge legacy compiler authority
```

---

## 19. Final compiler relationship

```text
M1
VisualIR v0.1.0
↓
legacy compileVisualIR
↓
flat deterministic audit/prompt projection

        migration boundary
────────────────────────────────

M8
Visual IR v0.3.0
+
M5 Sequence Provenance
+
M7 Project Constraints
+
Beat Apply Evidence
↓
Generation Prompt IR
↓
Deterministic Renderer
↓
canonical Prompt Package
↓
M9
```

Final authority rule:

```text
There may be multiple compatibility renderings.
There must be only one canonical generation-translation authority.

For M8+, that authority is the structured M8 Prompt IR pipeline.
```
