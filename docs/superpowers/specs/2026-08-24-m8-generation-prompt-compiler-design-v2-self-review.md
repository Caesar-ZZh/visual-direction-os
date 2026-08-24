# M8 Generation Prompt Compiler — Normative v2 Self-Review Corrections

**Status:** Normative companion to `2026-08-24-m8-generation-prompt-compiler-design-v2.md`  
**Purpose:** Record the final ambiguity/consistency fixes found during the required spec self-review. Where this note corrects wording in v2, this note wins. No production behavior is implemented by this document.

## 1. Section 5.3 cross-reference correction

The sentence about unresolved compiler flows must refer to the Beat READY/source guarantees in **Section 23 — Readiness state machine**, not Section 21.

Normative wording:

> For unresolved compiler flows, M8 may still preview DRAFT packages. A Beat may become READY only if it satisfies the applicable source, provenance, Apply Evidence, M7, renderer, and authority guarantees in Section 23. An unresolved Grammar is not itself permission for M8 to invent Exact REQUIRED values.

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

## 4. Per-Beat scope remains authoritative

The self-review confirms the following v2 rule is intentional and final:

```text
Apply all      → all selected valid Beats may become READY.
Apply selected → only explicitly selected valid Beats may become READY.
Unselected     → remain DRAFT unless they already possess still-current Apply Evidence for the same current proposal/provenance.
```

Current Scene State reconciliation applies only to the current playhead Beat. Non-current Beat packages must not be compared against another Beat's current Scene State.

## 5. Scope check

The v2 spec remains one implementation milestone. The new Apply Evidence helper is necessary supporting provenance for M8 readiness, not a separate directing subsystem:

- it records explicit Apply action identity;
- it creates no visual values;
- it creates no new owner;
- it does not change M4 authority;
- it does not add generation runtime/provider behavior;
- it is cleared with invalidated Sequence artifacts.

No M9 Generation or M10 Visual QA work is pulled into M8.
