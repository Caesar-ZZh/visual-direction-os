# M8 Generation Prompt Compiler Implementation Plan — Self-Review Corrections

**Status:** Normative companion to `2026-08-24-m8-generation-prompt-compiler.md`. Where this note corrects an implementation detail in the plan, this note wins.

## 1. Browser loading: Narrative State must not capture Apply Evidence too early

The base plan's Task 2 wording about wiring `generation-prompt-apply-evidence.js` directly into the Narrative State factory is too eager for the current browser lifecycle.

Current Project Bootstrap dynamically loads `project-constraint-registry.js`; M8 Apply Evidence reuses that registry's canonical identity helpers. Therefore `narrative-state.js` must not require the browser global to exist at script evaluation time.

Use a lazy browser dependency:

```js
((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./narrative-contracts.js')
    : root?.VDOSNarrativeContracts;
  const nodeApplyEvidence = typeof module === 'object' && module.exports
    ? require('./generation-prompt-apply-evidence.js')
    : null;
  const api = factory(root, contracts, nodeApplyEvidence);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeState = api;
})(typeof window !== 'undefined' ? window : globalThis, (root, contracts, nodeApplyEvidence) => {
  function getApplyEvidence() {
    return nodeApplyEvidence || root?.VDOSGenerationPromptApplyEvidence || null;
  }

  function emptyApplyState() {
    const helper = getApplyEvidence();
    return helper?.createEmptySequenceApplyState?.() || {
      schemaVersion:'0.1.0',
      revision:0,
      beats:{}
    };
  }
```

Rules:

- Initial Narrative UI may exist before M8 helper load; the empty shape remains safe.
- `recordSequenceApplyEvidence()` must require the real helper at call time and throw a controlled error if unavailable.
- Restored non-empty `sequenceApplyState` must be validated once the real helper is available before it can authorize READY.
- Do not duplicate canonicalization/FNV implementation in Narrative State.

## 2. Task 8 file scope is now exact

Create:

```text
visual-direction-os/generation-prompt-bootstrap.test.js
```

Modify:

```text
visual-direction-os/project-bootstrap.js
visual-direction-os/build-pages-site.test.js
```

Do **not** modify `director-v2.html` for M8 dependency ordering unless implementation proves a separate existing browser defect. The intended M8 path is dynamic Project Bootstrap loading.

`project-bootstrap.js` must load in this order before `createNarrativeRuntime(...).restore(...)`:

```text
project-constraint-registry.js
↓
generation-prompt-apply-evidence.js
↓
existing Project / M7 dependencies
↓
generation-prompt-ir.js
prompt-language-registry.js
generation-prompt-renderer.js
generation-prompt-compiler.js
generation-prompt-inspector.js
generation-prompt.css
↓
create/restore Narrative Runtime
```

This preserves one fingerprint implementation while avoiding a static-script-order rewrite.

## 3. Pages test is unconditional

`build-pages-site.js` copies the workspace source tree; M8 must extend `build-pages-site.test.js` with explicit assertions that the built output contains:

```js
for (const asset of [
  'generation-prompt-apply-evidence.js',
  'generation-prompt-ir.js',
  'prompt-language-registry.js',
  'generation-prompt-renderer.js',
  'generation-prompt-compiler.js',
  'generation-prompt-inspector.js',
  'generation-prompt.css'
]) {
  assert.ok(fs.existsSync(path.join(output, asset)), `Pages build must publish ${asset}`);
}
```

No conditional wording remains around Pages asset coverage.

## 4. Prompt IR `meta` shape is fixed

Task 3 must produce this minimum metadata on every Prompt IR / Prompt Package:

```js
meta: {
  schema:'GenerationPromptIR',
  version:'0.1.0',
  sourceVisualIRVersion:'0.3.0',
  engine:'deterministic',
  grammarId: visualIR.grammar?.id || visualIR.source?.grammarId || 'unresolved',
  readingId: confirmedReading.id,
  strategyId: selectedStrategy.id,
  sceneId,
  beatId: proposalBeat.id
}
```

If upstream `generatedAt` exists it may be copied into audit metadata, but it is excluded from `pir-*` semantic identity.

## 5. Project support must be an intersection, never a new assertion

Task 3 may attach `projectSupport` to an Exact REQUIRED field only when all of the following are true:

```text
Sequence provenance field owner == compiler
AND support == supported
AND provenance field projectConstraintIds includes constraint ID
AND current M7 resolution constraintId matches
AND current M7 resolution beatId matches current Beat
AND current M7 resolution path matches exact field path
AND current M7 resolution status == SATISFIED
```

Pseudocode:

```js
const ids = new Set(fieldMeta.projectConstraintIds || []);
const projectSupport = projectResolutions
  .filter(item =>
    item?.status === 'SATISFIED'
    && item?.beatId === proposalBeat.id
    && item?.path === path
    && ids.has(item.constraintId)
  )
  .map(item => ({
    constraintId:item.constraintId,
    revision:item.revision,
    result:'satisfied'
  }));
```

A current SATISFIED Project constraint that is absent from the field's M5 provenance must not create a new Exact REQUIRED directive in M8.

## 6. Renderer validates Prompt IR before rendering

Task 4 dependency list must include `generation-prompt-ir.js`.

At the start of `renderPromptIR(promptIR)`:

```js
const checked = promptIRContract.validatePromptIR(promptIR);
if (!checked.valid) {
  const error = new Error(`Invalid Generation Prompt IR: ${checked.errors.join('; ')}`);
  error.code = 'PROMPT_IR_INVALID';
  throw error;
}
```

If `validatePromptIR` uses a throwing API for authority escalation, preserve its domain code rather than converting it into a generic JavaScript error.

## 7. `validatePromptIR` return contract is fixed

To remove ambiguity between Task 3 and Task 4, use:

```js
validatePromptIR(value)
→ { valid:true, errors:[], value:clone(value) }
→ { valid:false, errors:[{code,path,message}, ...], value:null }
```

`buildGenerationPromptIR(...)` performs validation and throws a domain error when invalid.

Authority promotion is represented by an error item:

```js
{
  code:'AUTHORITY_ESCALATION',
  path:'required[3]',
  message:'AI-owned field cannot become REQUIRED.'
}
```

The builder/renderer may convert that validation result into `error.code = 'AUTHORITY_ESCALATION'` when that is the first/owning failure.

Update Task 3 tests accordingly; do not test `assert.throws(() => validatePromptIR(...))` directly.

## 8. Exact READY orchestration order

For each Beat in Task 5, derive in this order:

```text
validate Scene/Reading/Strategy/VisualIR/Skeleton/Proposal/Provenance
↓
resolve current M7 authority once for the target Scene
↓
build Prompt IR using only current SATISFIED support intersections
↓
render deterministic Prompt Package
↓
reconcile Beat Apply Evidence
↓
if current Scene Beat, reconcile Scene State subset
↓
combine Beat-scoped M7 + Apply + Scene reasons
↓
DRAFT / READY / BLOCKED
```

Readiness precedence is fixed:

```text
any contradiction/stale/invalid authoritative state → BLOCKED
else no current Apply receipt → DRAFT
else → READY
```

Thus a Beat with both `NOT_APPLIED` and an M7 `CONFLICT` is `BLOCKED`, not DRAFT.

## 9. Prompt Package structure is fixed

Task 5 returns per Beat:

```js
{
  schemaVersion:'0.1.0',
  meta: promptIR.meta,
  promptIR,
  rendered:{
    rendererVersion:'0.1.0',
    neutralText:'...',
    negativeText:'...',
    auditText:'...',
    sections:{...}
  },
  evidenceGaps: promptIR.evidenceGaps,
  provenance:{
    requiredFields:[...],
    guidedFields:[...],
    projectConstraintRefs:[...],
    applyEvidence:null | {...}
  },
  readiness:{
    status:'DRAFT' | 'READY' | 'BLOCKED',
    reasons:[...]
  },
  fingerprint:promptIR.fingerprint
}
```

M9 must be able to consume structured fields without reverse-parsing `auditText`.

## 10. File map correction

The implementation plan's test file map additionally includes:

```text
visual-direction-os/generation-prompt-bootstrap.test.js
```

The final Task 8 commit command is:

```bash
git add \
  visual-direction-os/project-bootstrap.js \
  visual-direction-os/build-pages-site.test.js \
  visual-direction-os/generation-prompt-bootstrap.test.js
git commit -m "feat: load prompt compiler runtime"
```

Do not add `director-v2.html` unless it actually changed for an independently verified reason.

## 11. Self-review result

- Spec coverage: all v2 + M1-convergence amendment requirements map to Tasks 1–10.
- Placeholder scan: no `TBD`, `TODO`, `FIXME`, or unspecified implementation placeholder is permitted.
- Type consistency: Apply Evidence, Prompt IR validation, Prompt Package shape, M7 support intersection, and runtime loading order are now fixed above.
- Scope remains one milestone: no M9 provider behavior and no M10 QA.
