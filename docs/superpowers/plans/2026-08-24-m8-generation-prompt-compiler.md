# M8 Generation Prompt Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build M8 as the canonical, provider-neutral generation-translation layer that converts current Scene × Beat directing truth into auditable `DRAFT / READY / BLOCKED` Prompt Packages without inventing visual authority or bypassing explicit Apply.

**Architecture:** M8 consumes Visual IR v0.3.0, M5 compiler-first Sequence Proposal/Provenance, current M7 resolutions, and explicit per-Beat Apply Evidence. Pure modules build Generation Prompt IR, validate authority, render deterministic generation-facing and audit-facing text, and derive readiness. UI stays read-only. M1 `runtime/prompt-compiler.js` remains a legacy compatibility surface on its separate branch and is not imported into the M8 runtime.

**Tech Stack:** Vanilla JavaScript UMD modules, Node `node:test` / `node:assert/strict`, existing Director Workspace DOM/runtime, Playwright browser acceptance, GitHub Actions.

**Spec:**
- `docs/superpowers/specs/2026-08-24-m8-generation-prompt-compiler-design-v2.md`
- `docs/superpowers/specs/2026-08-24-m8-generation-prompt-compiler-design-v2-self-review.md` — normative amendment; where it narrows v2, it wins.

## Global Constraints

- M8 is the canonical generation-translation authority; do not create a second independent prompt authority.
- Do **not** import or call M1 `visual-direction-os/runtime/prompt-compiler.js` from M8.
- Do not create `generation-prompt-compat.js` unless a live M1 caller is merged into the M8 lineage during implementation; YAGNI otherwise.
- M8 is translation authority only, never directing authority.
- Never create `owner: project`, `owner: apply`, or any other new Scene visual owner.
- Validate public source objects before nested access; malformed input must fail with controlled M8 domain errors, never incidental `TypeError`.
- Visual IR v0.3.0 is the only accepted M8 Visual IR schema.
- Required structural/provenance backbone may not be replaced with synthetic `unknown` prose.
- Non-backbone unresolved visual dimensions remain `OPEN`; `OPEN` does not block READY by itself.
- Prompt authority classes are exactly `REQUIRED`, `GUIDED`, `OPEN`, `BLOCKED`, `ANTI-RULE`.
- `REQUIRED / structural` comes from Director-confirmed structure / compiler-owned Skeleton structure; it does not imply exact values.
- `REQUIRED / exact` comes only from M5 `owner:'compiler'`, `support:'supported'` field provenance with the matching exact guarded proposal value.
- M5 `owner:'ai'` values remain `GUIDED`; they never become REQUIRED.
- M7 `SATISFIED` constraints only annotate matching compiler fields as support; they never own the value.
- Apply Evidence proves explicit action only; it never owns a visual value.
- Apply readiness is per Beat. `Apply selected` authorizes only selected Beats; still-current receipts for previously applied Beats remain valid.
- Current Scene State reconciliation applies only to the active/current playhead Beat.
- Evidence gaps are structured data. `neutralText` must never instruct a generation model to resolve them.
- Canonical renderer is deterministic: same validated Prompt IR → byte-identical text.
- Renderer does not call an LLM, choose synonyms, infer missing values, or add provider syntax.
- Renderer never injects generic quality/style vocabulary such as `masterpiece`, `best quality`, `cinematic`, `epic`, `8K`, or `photorealistic`; literal Director content is preserved if the Director actually wrote it.
- `OPEN` and `BLOCKED` are visible in STRUCTURE UI but omitted from generation-facing text.
- Only explicit Grammar anti-rules become canonical negative guidance.
- Fingerprints use the M7 convention: canonical compact JSON + UTF-8 FNV-1a 64-bit using `BigInt`; prefixes `pir-`, `pbeat-`, `pprv-`, `sbeat-`.
- Timestamps never participate in semantic fingerprints.
- M9 provider/model request behavior is out of scope.
- M10 Visual QA is out of scope.
- M0–M7 behavior must remain intact.
- No merge into `integration/director-workspace-v2-1` without explicit product approval.

---

## File Map

### Create runtime modules

- `visual-direction-os/generation-prompt-apply-evidence.js` — deterministic per-Beat Apply receipts and receipt reconciliation.
- `visual-direction-os/generation-prompt-ir.js` — source normalization, authority mapping, evidence gaps, Prompt IR contract and `pir-*` fingerprint.
- `visual-direction-os/prompt-language-registry.js` — versioned canonical mechanism wording for exact compiler values and structural hierarchy.
- `visual-direction-os/generation-prompt-renderer.js` — deterministic `neutralText`, `negativeText`, `auditText`, and structured sections.
- `visual-direction-os/generation-prompt-compiler.js` — orchestration/readiness boundary; source validation, M7 re-resolution, Apply/Scene reconciliation, Prompt Package assembly.
- `visual-direction-os/generation-prompt-inspector.js` — read-only per-Beat STRUCTURE / RENDERED inspector.
- `visual-direction-os/generation-prompt.css` — Prompt Inspector styling in existing Director visual language.

### Create tests

- `visual-direction-os/generation-prompt-apply-evidence.test.js`
- `visual-direction-os/generation-prompt-narrative-state.test.js`
- `visual-direction-os/generation-prompt-ir.test.js`
- `visual-direction-os/generation-prompt-renderer.test.js`
- `visual-direction-os/generation-prompt-compiler.test.js`
- `visual-direction-os/generation-prompt-inspector.test.js`
- `visual-direction-os/generation-prompt-apply-integration.test.js`
- `visual-direction-os/generation-prompt-browser.spec.js`

### Modify existing runtime

- `visual-direction-os/narrative-state.js` — persist `sequenceApplyState`, record/clear APIs.
- `visual-direction-os/narrative-workspace.js` — expose receipt recording + Prompt Compiler/Inspector context.
- `visual-direction-os/narrative-apply-ui.js` — record selected Beat receipts only after successful existing Apply path.
- `visual-direction-os/project-bootstrap.js` — load M8 runtime/style dependencies and pass current Project Constraint context to the Prompt Compiler UI.
- `visual-direction-os/director-v2.html` only if the current bootstrap/static asset path requires an explicit M8 stylesheet/script tag; prefer existing bootstrap loader when possible.
- `visual-direction-os/build-pages-site.test.js` — M8 asset assembly expectation if build script enumerates runtime files.
- `.github/workflows/director-intelligence-ci.yml` — M8 Node tests, syntax, Pages, browser acceptance.

### Explicitly not modified by M8

- `visual-direction-os/runtime/prompt-compiler.js` — legacy M1 branch surface, not present in M8 baseline lineage.
- M9 provider adapters / generation calls.
- M10 QA.

---

## Task 1: Deterministic Apply Evidence primitives

**Files:**
- Create: `visual-direction-os/generation-prompt-apply-evidence.js`
- Create: `visual-direction-os/generation-prompt-apply-evidence.test.js`

**Interfaces:**

```js
APPLY_EVIDENCE_VERSION = '0.1.0'
createEmptySequenceApplyState()
proposalBeatFingerprint(beat)
provenanceFingerprint(provenance, beatId)
sequenceDirectorBeatFingerprint(sequence, beatId)
validateSequenceApplyState(state)
recordAppliedBeats(state, { source, proposal, provenance, sequence, beatIds })
reconcileBeatApplyEvidence(state, { source, proposal, provenance, sequence, beatId })
```

Use `project-constraint-registry.js` for `canonicalJSONString` / `fingerprintSnapshot`; do not duplicate a second canonicalization algorithm.

`source` shape is fixed:

```js
{
  readingId,
  strategyId,
  grammarId,
  sequenceOrigin: 'compiler-first',
  skeletonVersion
}
```

- [ ] **Step 1: Write RED fingerprint tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const evidence = require('./generation-prompt-apply-evidence.js');

const beat = {
  id:'setup', label:'SETUP', narrativeBeat:'Establish the institution.', agency:'world',
  primaryVariable:'Camera', supportingVariables:['Space'], restrainedVariables:['Texture'],
  visualEvents:['enter'],
  sceneStatePatch:{agency:'world',variables:{camera:{perspective:'world'}}},
  rationale:'The world still holds the frame.'
};

const provenance = {
  origin:'compiler-first', skeletonVersion:'0.1.0', grammarId:'camera-authority-transfer',
  fields:{
    'setup.agency':{owner:'compiler',support:'supported',source:'agency-constraint'},
    'setup.camera.perspective':{owner:'compiler',support:'supported',source:'camera-authority-transfer'},
    'pressure.color.temperature':{owner:'ai',support:'open',source:'sequence-completion'}
  }
};

test('fingerprints are deterministic and Beat-scoped', () => {
  assert.match(evidence.proposalBeatFingerprint(beat), /^pbeat-[0-9a-f]{16}$/);
  assert.match(evidence.provenanceFingerprint(provenance, 'setup'), /^pprv-[0-9a-f]{16}$/);
  const reordered = {...provenance, fields:{
    'pressure.color.temperature':provenance.fields['pressure.color.temperature'],
    'setup.camera.perspective':provenance.fields['setup.camera.perspective'],
    'setup.agency':provenance.fields['setup.agency']
  }};
  assert.equal(evidence.provenanceFingerprint(provenance, 'setup'), evidence.provenanceFingerprint(reordered, 'setup'));
});
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/generation-prompt-apply-evidence.test.js
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement canonical Beat snapshots**

Implementation must fingerprint:

```js
function beatProvenanceSnapshot(provenance, beatId) {
  const prefix = `${beatId}.`;
  const fields = Object.fromEntries(
    Object.entries(provenance?.fields || {})
      .filter(([key]) => key.startsWith(prefix))
  );
  const projectResolutions = (provenance?.projectConstraints?.resolutions || [])
    .filter(item => item?.beatId === beatId);
  return {
    origin: provenance?.origin || null,
    skeletonVersion: provenance?.skeletonVersion || null,
    grammarId: provenance?.grammarId || null,
    fields,
    projectConstraints: projectResolutions
  };
}

function sequenceBeatSnapshot(sequence, beatId) {
  const beat = (sequence?.beats || []).find(item => item?.id === beatId) || null;
  const events = (sequence?.events || []).filter(item => item?.beatId === beatId);
  return { beat, events };
}
```

Prefixes are fixed:

```js
registry.fingerprintSnapshot('pbeat', beat)
registry.fingerprintSnapshot('pprv', beatProvenanceSnapshot(provenance, beatId))
registry.fingerprintSnapshot('sbeat', sequenceBeatSnapshot(sequence, beatId))
```

- [ ] **Step 4: Add RED receipt lifecycle tests**

```js
const source = {
  readingId:'reading-01', strategyId:'strategy-01', grammarId:'camera-authority-transfer',
  sequenceOrigin:'compiler-first', skeletonVersion:'0.1.0'
};
const proposal = { beats:[beat, {...beat,id:'pressure',label:'PRESSURE',agency:'contested'}] };
const sequence = {
  beats: proposal.beats.map(item => ({
    id:item.id,label:item.label,narrativePurpose:item.narrativeBeat,
    primaryVariable:item.primaryVariable,supportingVariables:item.supportingVariables,
    restrainedVariables:item.restrainedVariables,scenePatch:item.sceneStatePatch,start:0,end:0.5
  })),
  events:[]
};

test('selected Apply records only selected Beats and increments action revision once', () => {
  const next = evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(), {
    source, proposal, provenance, sequence, beatIds:['setup']
  });
  assert.equal(next.revision, 1);
  assert.ok(next.beats.setup);
  assert.equal(next.beats.pressure, undefined);
  assert.equal(next.beats.setup.applyRevision, 1);
});

test('progressive selected Apply preserves current unselected receipt', () => {
  let state = evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(), {
    source, proposal, provenance, sequence, beatIds:['setup']
  });
  const setupReceipt = state.beats.setup;
  state = evidence.recordAppliedBeats(state, {
    source, proposal, provenance, sequence, beatIds:['pressure']
  });
  assert.equal(state.revision, 2);
  assert.deepEqual(state.beats.setup, setupReceipt);
  assert.equal(state.beats.pressure.applyRevision, 2);
});

test('changed Sequence Director Beat makes prior receipt stale', () => {
  const state = evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(), {
    source, proposal, provenance, sequence, beatIds:['setup']
  });
  const changed = structuredClone(sequence);
  changed.beats[0].primaryVariable = 'Color';
  const result = evidence.reconcileBeatApplyEvidence(state, {
    source, proposal, provenance, sequence:changed, beatId:'setup'
  });
  assert.equal(result.status, 'STALE');
  assert.equal(result.reason, 'SEQUENCE_DIRECTOR_BEAT_CHANGED');
});
```

- [ ] **Step 5: Implement receipt lifecycle**

`recordAppliedBeats` must:

1. validate current state;
2. require a non-empty unique `beatIds` list;
3. require every selected Beat in proposal and Sequence Director;
4. increment top-level `revision` once;
5. replace receipts only for selected Beats;
6. preserve still-current unselected receipts unchanged;
7. store exact `source`, `proposalBeatFingerprint`, `provenanceFingerprint`, `sequenceDirectorBeatFingerprint`;
8. never store timestamps.

`reconcileBeatApplyEvidence` returns exactly:

```js
{ status:'MISSING', reason:'NOT_APPLIED', receipt:null }
{ status:'CURRENT', reason:'MATCH', receipt:{...} }
{ status:'STALE', reason:'SOURCE_CHANGED'|'PROPOSAL_BEAT_CHANGED'|'PROVENANCE_CHANGED'|'SEQUENCE_DIRECTOR_BEAT_CHANGED', receipt:{...} }
```

- [ ] **Step 6: Run GREEN**

```bash
node --test visual-direction-os/generation-prompt-apply-evidence.test.js
node --check visual-direction-os/generation-prompt-apply-evidence.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/generation-prompt-apply-evidence.js visual-direction-os/generation-prompt-apply-evidence.test.js
git commit -m "feat: add beat apply evidence primitives"
```

---

## Task 2: Persist Apply Evidence in Narrative State

**Files:**
- Modify: `visual-direction-os/narrative-state.js`
- Create: `visual-direction-os/generation-prompt-narrative-state.test.js`

**Interfaces added to Narrative draft:**

```js
getState().sequenceApplyState
recordSequenceApplyEvidence({ proposal, provenance, sequence, beatIds })
clearSequenceApplyEvidence()
```

`recordSequenceApplyEvidence` derives `source` from current confirmed Reading / selected Strategy / Sequence provenance; the caller supplies the exact guarded proposal used for Apply.

- [ ] **Step 1: Write RED state tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createNarrativeState } = require('./narrative-state.js');
const evidence = require('./generation-prompt-apply-evidence.js');

const receiptState = evidence.createEmptySequenceApplyState();

test('Narrative State initializes and restores sequenceApplyState', () => {
  const fresh = createNarrativeState();
  assert.deepEqual(fresh.getState().sequenceApplyState, receiptState);

  const restored = createNarrativeState({ sequenceApplyState:{...receiptState,revision:3} });
  assert.equal(restored.getState().sequenceApplyState.revision, 3);
});

test('upstream input invalidation clears current Apply Evidence', () => {
  const draft = createNarrativeState({ sequenceApplyState:{
    schemaVersion:'0.1.0', revision:1,
    beats:{setup:{beatId:'setup',applyRevision:1,source:{},proposalBeatFingerprint:'pbeat-1111111111111111',provenanceFingerprint:'pprv-1111111111111111',sequenceDirectorBeatFingerprint:'sbeat-1111111111111111'}}
  }});
  draft.setInput('new scene');
  assert.deepEqual(draft.getState().sequenceApplyState.beats, {});
  assert.equal(draft.getState().sequenceApplyState.revision, 0);
});
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/generation-prompt-narrative-state.test.js
```

Expected: FAIL because `sequenceApplyState` is absent.

- [ ] **Step 3: Wire UMD dependency and initial state**

Change Narrative State wrapper to receive `generation-prompt-apply-evidence.js` alongside contracts. Add:

```js
sequenceApplyState: applyEvidence.createEmptySequenceApplyState(),
```

Inside `clearSequenceArtifacts()` add:

```js
state.sequenceApplyState = applyEvidence.createEmptySequenceApplyState();
```

On `createNarrativeState(initial)`, validate any supplied `initial.sequenceApplyState`; reject malformed restore with a controlled message:

```text
Invalid Sequence Apply Evidence: ...
```

- [ ] **Step 4: Add RED record API test**

Build a valid minimal Narrative State using existing demo fixture / existing State setters, then assert:

```js
const next = draft.recordSequenceApplyEvidence({
  proposal: guardedProposal,
  provenance: draft.getState().sequenceProvenance,
  sequence: appliedSequence,
  beatIds:['rupture','release']
});
assert.equal(next.sequenceApplyState.revision, 1);
assert.deepEqual(Object.keys(next.sequenceApplyState.beats).sort(), ['release','rupture']);
```

- [ ] **Step 5: Implement `recordSequenceApplyEvidence` / `clearSequenceApplyEvidence`**

Source identity must be constructed exactly from current state:

```js
const source = {
  readingId: state.confirmedReading?.id || null,
  strategyId: state.selectedStrategy?.id || null,
  grammarId: provenance?.grammarId || null,
  sequenceOrigin: provenance?.origin || null,
  skeletonVersion: provenance?.skeletonVersion || state.sequenceSkeleton?.version || null
};
```

Reject missing Reading/Strategy/provenance instead of creating a weak receipt.

- [ ] **Step 6: Run GREEN**

```bash
node --test visual-direction-os/generation-prompt-narrative-state.test.js
node --check visual-direction-os/narrative-state.js
```

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/narrative-state.js visual-direction-os/generation-prompt-narrative-state.test.js
git commit -m "feat: persist sequence apply evidence"
```

---

## Task 3: Build Generation Prompt IR and authority mapping

**Files:**
- Create: `visual-direction-os/generation-prompt-ir.js`
- Create: `visual-direction-os/generation-prompt-ir.test.js`

**Dependencies:**

```js
visual-ir-bridge.js                 // validateVisualIR v0.3.0
project-constraint-registry.js      // canonical JSON + FNV fingerprint
```

**Public interfaces:**

```js
PROMPT_IR_VERSION = '0.1.0'
readProposalPath(proposalBeat, path)
collectBeatProvenance(sequenceProvenance, beatId)
collectEvidenceGaps(visualIR)
validatePromptIR(promptIR)
buildGenerationPromptIR({
  sceneId,
  narrativeInput,
  confirmedReading,
  selectedStrategy,
  visualIR,
  skeletonBeat,
  proposalBeat,
  sequenceProvenance,
  projectResolutions = [],
  applyEvidence = null,
  compileState
})
fingerprintPromptIR(promptIR)
```

- [ ] **Step 1: Write RED source/authority mapping tests**

Use a Camera Authority fixture with:

```js
visualIR = {
  schemaVersion:'0.3.0', mode:'shadow',
  source:{readingId:'reading-01',strategyId:'strategy-01',grammarId:'camera-authority-transfer'},
  narrative:{problem:{value:'control'},coreConflict:{value:'obedience vs agency'},startingState:{value:'compliance'},endingState:{value:'refusal'},turningPoint:{value:'recognition'}},
  direction:{
    primaryVariable:{value:'Camera',status:'known'},
    supportingVariables:{value:['Space'],status:'known'},
    restrainedVariables:{value:['Texture'],status:'known'},
    mechanism:{value:'camera authority follows agency',status:'known'},
    rationale:{value:'camera carries control transfer',status:'known'}
  },
  agency:{transition:{value:['world','character']}},
  grammar:{id:'camera-authority-transfer',status:'resolved',contractStatus:'executable',evidenceStatus:'supported',evidenceTier:'calibrated',refs:[],guards:[]},
  visual:{
    character:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    world:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    composition:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    camera:{value:{authority:'agency-linked'},status:'known',evidenceStatus:'supported'},
    hierarchy:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    shape:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    value:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    color:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    edge:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    detail:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    medium:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    texture:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    fx:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    temporal:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    space:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    line:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'},
    rhythm:{value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'}
  },
  constraints:{antiRules:{value:['Do not change camera authority without narrative cause.'],status:'known'}},
  evidence:{status:'supported',confidence:'high',unresolved:['medium','texture'],refs:[]}
};
```

Skeleton/Proposal/Provenance:

```js
const skeletonBeat = {
  id:'setup', label:'SETUP',
  structure:{primaryVariable:'Camera',supportingVariables:['Space'],restrainedVariables:['Texture']},
  patchSlots:{
    'camera.perspective':{status:'compiler-derived',support:'supported',owner:'compiler'},
    'color.temperature':{status:'open',support:'open',owner:'ai'},
    'space.depth':{status:'blocked',support:'blocked',owner:'none',source:'camera-authority-transfer',why:'not justified'}
  }
};
const proposalBeat = {
  id:'setup', label:'SETUP', narrativeBeat:'The world still holds the frame.', agency:'world',
  primaryVariable:'Camera', supportingVariables:['Space'], restrainedVariables:['Texture'],
  visualEvents:['enter'],
  sceneStatePatch:{agency:'world',variables:{camera:{perspective:'world'},color:{temperature:'cool'}}},
  rationale:'Establish world authority.'
};
const sequenceProvenance = {
  origin:'compiler-first', skeletonVersion:'0.1.0', grammarId:'camera-authority-transfer',
  fields:{
    'setup.camera.perspective':{owner:'compiler',support:'supported',source:'camera-authority-transfer',projectConstraintIds:['constraint-1']},
    'setup.color.temperature':{owner:'ai',support:'open',source:'sequence-completion'},
    'setup.agency':{owner:'compiler',support:'supported',source:'agency-constraint'}
  },
  projectConstraints:{registryVersion:'0.1.0',resolutions:[{constraintId:'constraint-1',revision:1,result:'satisfied',beatId:'setup',path:'camera.perspective'}]}
};
```

Assertions:

```js
const ir = promptIR.buildGenerationPromptIR({
  sceneId:'scene-03', narrativeInput:'A young employee enters the office.',
  confirmedReading:{id:'reading-01'}, selectedStrategy:{id:'strategy-01',primaryVariable:'Camera'},
  visualIR, skeletonBeat, proposalBeat, sequenceProvenance,
  projectResolutions:[{constraintId:'constraint-1',revision:1,status:'SATISFIED',beatId:'setup',path:'camera.perspective'}],
  compileState:{phase:'proposal',applyRevision:null}
});

assert.ok(ir.required.some(item => item.kind === 'exact' && item.path === 'camera.perspective' && item.owner === 'compiler' && item.value === 'world'));
assert.ok(ir.guided.some(item => item.path === 'color.temperature' && item.owner === 'ai'));
assert.ok(ir.open.some(item => item.field === 'medium'));
assert.ok(ir.blocked.some(item => item.path === 'space.depth'));
assert.deepEqual(ir.required.find(item => item.path === 'camera.perspective').projectSupport.map(item => item.constraintId), ['constraint-1']);
assert.ok(ir.antiRules.length === 1);
assert.equal(ir.content.sceneDescription.owner, 'director');
assert.equal(ir.content.beatRealization.owner, 'ai');
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/generation-prompt-ir.test.js
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement exact path reading and source validation**

`readProposalPath` must support:

```text
agency
ownership.<key>
<family>.<field> through proposalBeat.sceneStatePatch.variables
```

Every public build call validates `visualIR` with `VDOSVisualIRBridge.validateVisualIR` before semantic access.

Required backbone checks:

```js
sceneId is non-empty
proposalBeat.id is canonical/non-empty
confirmedReading.id exists
selectedStrategy.id exists
skeletonBeat.structure.primaryVariable is non-empty
sequenceProvenance.origin === 'compiler-first'
sequenceProvenance.fields is an object
```

A malformed source throws a controlled error with `error.code = 'PROMPT_SOURCE_INVALID'` or `VISUAL_IR_INVALID`.

- [ ] **Step 4: Implement authority mapping**

Rules:

```js
// structural REQUIRED comes from Skeleton structure, not free Proposal prose
required.push({kind:'structural',key:'primaryVariable',value:skeletonBeat.structure.primaryVariable,owner:'director-confirmed',authorityClass:'required'});
required.push({kind:'structural',key:'supportingVariables',value:[...skeletonBeat.structure.supportingVariables],owner:'director-confirmed',authorityClass:'required'});
required.push({kind:'structural',key:'restrainedVariables',value:[...skeletonBeat.structure.restrainedVariables],owner:'director-confirmed',authorityClass:'required'});
```

For each Beat provenance field:

```js
owner === 'compiler' && support === 'supported'
→ Exact REQUIRED using exact proposal value

owner === 'ai'
→ GUIDED using exact proposal value
```

For every `skeletonBeat.patchSlots[path].status === 'blocked'`:

```js
blocked.push({path,authorityClass:'blocked',owner:'none',source,reason:why});
```

No lower-authority source may create REQUIRED.

- [ ] **Step 5: Add RED authority escalation tests**

```js
assert.throws(
  () => promptIR.validatePromptIR({ ...validPromptIR, required:[{kind:'exact',path:'color.temperature',value:'cool',owner:'ai',authorityClass:'required'}] }),
  error => error?.code === 'AUTHORITY_ESCALATION'
);

assert.throws(
  () => promptIR.validatePromptIR({ ...validPromptIR, required:[{kind:'exact',path:'medium',value:'painterly',owner:'none',authorityClass:'required'}] }),
  error => error?.code === 'AUTHORITY_ESCALATION'
);
```

- [ ] **Step 6: Implement data-driven evidence gaps**

`collectEvidenceGaps(visualIR)` must:

1. preserve `visualIR.evidence.gaps` items when present;
2. add `visualIR.evidence.unresolved` fields as `{field,status:'unresolved',source:'visual-ir'}` when they are not already represented;
3. preserve confidence only when upstream provides it;
4. never synthesize a visual value.

Example:

```js
{
  field:'temporal.signature',
  status:'evidence_incomplete',
  confidence:0.42,
  source:'visual-ir'
}
```

- [ ] **Step 7: Implement `pir-*` identity**

Prompt fingerprint input includes generation-relevant semantic data but removes timestamps:

```js
const semantic = {
  schemaVersion: promptIR.schemaVersion,
  meta: {...promptIR.meta, generatedAt:undefined},
  sceneId:promptIR.sceneId,
  beatId:promptIR.beatId,
  source:promptIR.source,
  content:promptIR.content,
  intent:promptIR.intent,
  required:promptIR.required,
  guided:promptIR.guided,
  open:promptIR.open,
  blocked:promptIR.blocked,
  antiRules:promptIR.antiRules,
  evidenceGaps:promptIR.evidenceGaps,
  provenance:promptIR.provenance,
  compileState:promptIR.compileState
};
return registry.fingerprintSnapshot('pir', semantic);
```

- [ ] **Step 8: Run GREEN**

```bash
node --test visual-direction-os/generation-prompt-ir.test.js
node --check visual-direction-os/generation-prompt-ir.js
```

- [ ] **Step 9: Commit**

```bash
git add visual-direction-os/generation-prompt-ir.js visual-direction-os/generation-prompt-ir.test.js
git commit -m "feat: compile generation prompt IR"
```

---

## Task 4: Controlled language registry and deterministic renderer

**Files:**
- Create: `visual-direction-os/prompt-language-registry.js`
- Create: `visual-direction-os/generation-prompt-renderer.js`
- Create: `visual-direction-os/generation-prompt-renderer.test.js`

**Interfaces:**

```js
LANGUAGE_REGISTRY_VERSION = '0.1.0'
getExactPhrase(path, value)
renderStructuralDirective(item)

RENDERER_VERSION = '0.1.0'
renderPromptIR(promptIR)
```

- [ ] **Step 1: Write RED exact language registry tests**

Registry v1 exact mappings are limited to current compiler-supported exact values:

```js
const EXACT = {
  agency: {
    world:'Keep agency with the world/system for this beat.',
    contested:'Keep agency contested between world/system and character.',
    shared:'Keep agency shared for this beat.',
    character:'Keep agency with the character for this beat.'
  },
  'camera.perspective': {
    world:'Keep camera authority primarily with the environment.',
    mixed:'Maintain mixed camera authority between world and character.',
    character:'Keep camera authority primarily with the character.'
  },
  'color.territory': {
    world:'Let the world hold the active color territory.',
    contested:'Maintain contested color territory between world and character.',
    character:'Let the character hold the active color territory.'
  }
};
```

Tests:

```js
assert.equal(registry.getExactPhrase('camera.perspective','mixed'), 'Maintain mixed camera authority between world and character.');
assert.equal(registry.getExactPhrase('color.territory','contested'), 'Maintain contested color territory between world and character.');
assert.equal(registry.getExactPhrase('camera.perspective','dutch-angle'), null);
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/generation-prompt-renderer.test.js
```

Expected: FAIL because renderer/registry do not exist.

- [ ] **Step 3: Implement structural templates**

Use deterministic wrappers only:

```js
primaryVariable → `${value} carries the primary visual change.`
supportingVariables → `${values.join(' and ')} may support that change.`
restrainedVariables → `Keep ${values.join(' and ')} subordinate.`
```

Empty support/restrain arrays render no sentence; they do not create `unknown` text.

- [ ] **Step 4: Add RED renderer tests**

Given a valid Prompt IR:

```js
const first = renderer.renderPromptIR(ir);
const second = renderer.renderPromptIR(structuredClone(ir));
assert.deepEqual(first, second);
assert.equal(first.rendererVersion, '0.1.0');
assert.match(first.neutralText, /^SCENE CONTENT/m);
assert.match(first.neutralText, /DIRECTING PRIORITY/);
assert.match(first.neutralText, /REQUIRED VISUAL BEHAVIOR/);
assert.match(first.neutralText, /VISUAL GUIDANCE/);
assert.doesNotMatch(first.neutralText, /EVIDENCE GAPS:/);
assert.match(first.auditText, /VISUAL DIRECTION \/ MODEL-NEUTRAL/);
assert.match(first.auditText, /EVIDENCE GAPS:/);
assert.match(first.negativeText, /Do not change camera authority/);
assert.doesNotMatch(first.neutralText, /Medium: unspecified|choose an appropriate/i);
```

- [ ] **Step 5: Implement fixed section order**

Canonical `neutralText` section order:

```text
SCENE CONTENT
NARRATIVE BEAT
DIRECTING PRIORITY
REQUIRED VISUAL BEHAVIOR
VISUAL GUIDANCE
```

`negativeText` contains only explicit ANTI-RULE text.

`auditText` starts with deterministic provenance header:

```text
VISUAL DIRECTION / MODEL-NEUTRAL — IR <sourceVisualIRVersion> / deterministic / grammar <grammarId>
```

and adds `EVIDENCE GAPS:` only when `promptIR.evidenceGaps.length > 0`.

- [ ] **Step 6: Add RED fail-closed and safe fallback tests**

```js
assert.throws(
  () => renderer.renderPromptIR({...ir,required:[...ir.required,{kind:'exact',path:'camera.perspective',value:'dutch-angle',owner:'compiler',support:'supported',authorityClass:'required'}]}),
  error => error?.code === 'UNRENDERABLE_REQUIRED_VALUE'
);

const guided = renderer.renderPromptIR({...ir,guided:[{path:'texture.noise',value:'localized near the doorway',owner:'ai',authorityClass:'guided'}]});
assert.match(guided.neutralText, /Guidance for texture\.noise: localized near the doorway\./);
```

- [ ] **Step 7: Add forbidden-injection tests**

```js
for (const word of ['masterpiece','best quality','cinematic','epic','8K','photorealistic','award-winning']) {
  assert.equal(renderer.renderPromptIR(ir).neutralText.toLowerCase().includes(word.toLowerCase()), false);
}

const literal = structuredClone(ir);
literal.content.sceneDescription.value = 'The Director literally writes cinematic in the scene description.';
assert.match(renderer.renderPromptIR(literal).neutralText, /cinematic/);
```

- [ ] **Step 8: Run GREEN**

```bash
node --test visual-direction-os/generation-prompt-renderer.test.js
node --check visual-direction-os/prompt-language-registry.js
node --check visual-direction-os/generation-prompt-renderer.js
```

- [ ] **Step 9: Commit**

```bash
git add visual-direction-os/prompt-language-registry.js visual-direction-os/generation-prompt-renderer.js visual-direction-os/generation-prompt-renderer.test.js
git commit -m "feat: render deterministic prompt packages"
```

---

## Task 5: Orchestrate per-Beat DRAFT / READY / BLOCKED packages

**Files:**
- Create: `visual-direction-os/generation-prompt-compiler.js`
- Create: `visual-direction-os/generation-prompt-compiler.test.js`

**Dependencies:**

```js
visual-ir-bridge.js
generation-prompt-apply-evidence.js
generation-prompt-ir.js
generation-prompt-renderer.js
project-constraint-authority.js
project-constraint-registry.js
narrative-contracts.js
visual-sequence-skeleton.js
```

**Public interfaces:**

```js
compileBeatPromptPackage({
  sceneId,
  narrativeState,
  visualIR,
  sequence,
  sceneState,
  projectConstraintContext,
  beatId
})

compileGenerationPromptSet({
  sceneId,
  narrativeState,
  visualIR,
  sequence,
  sceneState,
  projectConstraintContext
})
```

Return set shape:

```js
{
  schemaVersion:'0.1.0',
  sceneId,
  beatOrder:['setup','pressure','rupture','release','new-ownership'],
  packages:[...],
  summary:{draft,ready,blocked}
}
```

- [ ] **Step 1: Write RED readiness tests**

Before Apply:

```js
const set = compiler.compileGenerationPromptSet(validContextWithoutReceipts);
assert.deepEqual(set.packages.map(item => item.readiness.status), ['DRAFT','DRAFT','DRAFT','DRAFT','DRAFT']);
```

After selected Apply:

```js
const selected = compiler.compileGenerationPromptSet(contextWithRuptureReleaseReceipts);
assert.equal(selected.packages.find(item => item.promptIR.beatId === 'rupture').readiness.status, 'READY');
assert.equal(selected.packages.find(item => item.promptIR.beatId === 'release').readiness.status, 'READY');
assert.equal(selected.packages.find(item => item.promptIR.beatId === 'setup').readiness.status, 'DRAFT');
```

Non-backbone UNKNOWN remains READY:

```js
const ready = compiler.compileBeatPromptPackage(contextWithOpenMedium);
assert.equal(ready.readiness.status, 'READY');
assert.ok(ready.promptIR.open.some(item => item.field === 'medium'));
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/generation-prompt-compiler.test.js
```

Expected: FAIL because compiler does not exist.

- [ ] **Step 3: Implement controlled source validation**

Domain errors:

```js
function domainError(code, message, details = null) {
  const error = new Error(message);
  error.code = code;
  if (details != null) error.details = details;
  return error;
}
```

Before dereference:

```js
visualIR validation failure → VISUAL_IR_INVALID
missing/malformed Sequence Proposal → PROMPT_SOURCE_INVALID
missing/malformed Sequence Provenance → SEQUENCE_PROVENANCE_MISSING or PROMPT_SOURCE_INVALID
malformed Apply Evidence → PROMPT_SOURCE_INVALID
```

Tests must prove malformed input does not expose `Cannot read properties`.

- [ ] **Step 4: Implement current M7 re-resolution**

Do **not** call the throwing pre-AI guard. Call:

```js
projectConstraintAuthority.resolveProjectConstraintAuthority({
  ...projectConstraintContext,
  visualIR,
  baseSkeleton:narrativeState.sequenceSkeleton
});
```

Then scope resolutions by `beatId`:

```text
SATISFIED → support annotation
STALE → affected Beat BLOCKED / PROJECT_CONSTRAINT_STALE
CONFLICT → affected Beat BLOCKED / PROJECT_CONSTRAINT_CONFLICT
ACTIVE / INAPPLICABLE → no false READY support
```

A conflict on SETUP does not automatically block unrelated RUPTURE/RELEASE unless the underlying whole-Scene source is independently invalid.

- [ ] **Step 5: Implement Apply Evidence readiness**

For each Beat:

```js
const apply = applyEvidence.reconcileBeatApplyEvidence(...);
```

Mapping:

```text
MISSING → DRAFT / APPLY_REQUIRED
CURRENT → continue READY checks
STALE → BLOCKED / BEAT_APPLY_EVIDENCE_STALE
```

DRAFT packages are still fully inspectable/renderable, but are not generation-authorized.

- [ ] **Step 6: Add RED current Scene divergence tests**

Current Beat:

```js
const changedScene = structuredClone(sceneState);
changedScene.variables.camera.perspective = 'character';
const pkg = compiler.compileBeatPromptPackage({...context,sceneState:changedScene,beatId:'setup'});
assert.equal(pkg.readiness.status, 'BLOCKED');
assert.ok(pkg.readiness.reasons.some(item => item.code === 'SCENE_PROVENANCE_DIVERGENCE'));
```

Non-current Beat:

```js
const release = compiler.compileBeatPromptPackage({...context,sceneState:changedScene,beatId:'release'});
assert.notEqual(release.readiness.reasons.some(item => item.code === 'SCENE_PROVENANCE_DIVERGENCE'), true);
```

- [ ] **Step 7: Implement subset Scene reconciliation**

Only when:

```js
sceneState?.narrativeState === beatId
```

compare current Scene State to `proposalBeat.sceneStatePatch` **only for keys present in that patch**. Use recursive subset equality; do not require unrelated Scene State fields to match.

A mismatch returns:

```js
{code:'SCENE_PROVENANCE_DIVERGENCE', beatId, message:'Current Scene State no longer matches the applied Beat provenance.'}
```

- [ ] **Step 8: Add RED malformed backbone tests**

```js
assert.throws(
  () => compiler.compileGenerationPromptSet({...validContext,visualIR:{}}),
  error => error?.code === 'VISUAL_IR_INVALID'
);
assert.throws(
  () => compiler.compileGenerationPromptSet({...validContext,narrativeState:{...validContext.narrativeState,sequenceProvenance:null}}),
  error => error?.code === 'SEQUENCE_PROVENANCE_MISSING'
);
```

No output may contain synthetic REQUIRED `unknown` values.

- [ ] **Step 9: Run GREEN**

```bash
node --test visual-direction-os/generation-prompt-compiler.test.js
node --check visual-direction-os/generation-prompt-compiler.js
```

- [ ] **Step 10: Commit**

```bash
git add visual-direction-os/generation-prompt-compiler.js visual-direction-os/generation-prompt-compiler.test.js
git commit -m "feat: derive prompt package readiness"
```

---

## Task 6: Read-only Generation Prompt Inspector

**Files:**
- Create: `visual-direction-os/generation-prompt-inspector.js`
- Create: `visual-direction-os/generation-prompt.css`
- Create: `visual-direction-os/generation-prompt-inspector.test.js`

**Interfaces:**

```js
buildInspectorModel(promptSet, { activeBeatId = 'setup', view = 'structure' } = {})
renderGenerationPromptInspector(promptSet, options = {})
initGenerationPromptInspector(rootNode, {
  getPromptSet,
  initialBeatId = 'setup'
})
```

No mutation API is exported.

- [ ] **Step 1: Write RED pure renderer test**

```js
const html = inspector.renderGenerationPromptInspector(promptSet, {activeBeatId:'rupture',view:'structure'});
assert.match(html, /GENERATION PROMPT/);
assert.match(html, /data-generation-prompt-beat="setup"/);
assert.match(html, /data-generation-prompt-beat="rupture"/);
assert.match(html, /REQUIRED/);
assert.match(html, /GUIDED/);
assert.match(html, /OPEN/);
assert.match(html, /BLOCKED/);
assert.match(html, /APPLY EVIDENCE/);
assert.match(html, /PROJECT SUPPORT/);
assert.doesNotMatch(html, /GENERATE/);
```

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/generation-prompt-inspector.test.js
```

- [ ] **Step 3: Implement model and HTML**

UI contract:

```text
GENERATION PROMPT · DRAFT | READY | BLOCKED
[ SETUP ] [ PRESSURE ] [ RUPTURE ] [ RELEASE ] [ NEW OWNERSHIP ]
STRUCTURE | RENDERED
CONTENT
REQUIRED
GUIDED
OPEN
BLOCKED
PROJECT SUPPORT
APPLY EVIDENCE
```

For RENDERED view show:

```text
neutralText
negativeText
AUDIT / provenance + evidence gaps
```

Do not collapse audit text into generation text.

- [ ] **Step 4: Implement slot placement and interactions**

`initGenerationPromptInspector` inserts one `[data-generation-prompt-slot]` immediately before `.narrative-apply-preview`. It may use the existing MutationObserver pattern used by `visual-sequence-origin.js`.

Buttons change only local inspector state:

```text
data-generation-prompt-beat
[data-generation-prompt-view="structure"]
[data-generation-prompt-view="rendered"]
```

They do not write Narrative/Scene/Project state.

- [ ] **Step 5: Add read-only test**

The test should pass a frozen `promptSet`, render/switch model states, and assert deep equality with the original after all operations.

- [ ] **Step 6: Run GREEN**

```bash
node --test visual-direction-os/generation-prompt-inspector.test.js
node --check visual-direction-os/generation-prompt-inspector.js
```

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/generation-prompt-inspector.js visual-direction-os/generation-prompt.css visual-direction-os/generation-prompt-inspector.test.js
git commit -m "feat: add generation prompt inspector"
```

---

## Task 7: Record exact guarded Apply receipts and recompile Prompt UI

**Files:**
- Modify: `visual-direction-os/narrative-workspace.js`
- Modify: `visual-direction-os/narrative-apply-ui.js`
- Create: `visual-direction-os/generation-prompt-apply-integration.test.js`

**Interfaces added to Narrative Workspace controller:**

```js
recordSequenceApplyEvidence({ proposal, sequence, beatIds })
getGenerationPromptSet()
syncGenerationPromptInspector()
```

The controller delegates receipt storage to the Narrative draft and Prompt compilation to `VDOSGenerationPromptCompiler`.

- [ ] **Step 1: Write RED source/integration contract test**

Test source/runtime behavior that receipt recording occurs **after** the existing Apply operations and uses `proposalForApply`:

```text
proposalForApply = guarded ? authorityPlan.resolvedProposal : proposal
→ buildSequenceFromProposal(proposalForApply,...)
→ sequenceController.setSequence(nextSequence,...)
→ applySceneAtCurrentPlayhead(nextSequence)
→ workspace.recordSequenceApplyEvidence({proposal:proposalForApply,sequence:nextSequence,beatIds})
```

The test must fail if receipt recording moves before `setSequence` or before `applySceneAtCurrentPlayhead`.

- [ ] **Step 2: Run RED**

```bash
node --test visual-direction-os/generation-prompt-apply-integration.test.js
```

- [ ] **Step 3: Extend Narrative Workspace dependency boundary**

Inside `initNarrativeWorkspace` resolve:

```js
const generationPromptCompiler = options.generationPromptCompiler || root.VDOSGenerationPromptCompiler || null;
const generationPromptInspector = options.generationPromptInspector || root.VDOSGenerationPromptInspector || null;
const generationPromptContextProvider = options.generationPromptContextProvider || (() => null);
```

`getGenerationPromptSet()` reads current draft, Visual IR, Sequence Director sequence, Scene State, and Project context. It returns `null` until a valid Sequence Proposal/Provenance exists.

- [ ] **Step 4: Expose receipt recording on controller**

Controller method:

```js
recordSequenceApplyEvidence({proposal,sequence,beatIds}) {
  const state = draft.getState();
  return draft.recordSequenceApplyEvidence({
    proposal,
    provenance:state.sequenceProvenance,
    sequence,
    beatIds
  });
}
```

After recording, sync the Prompt Inspector.

- [ ] **Step 5: Modify Apply UI in normative order**

Inside the existing click handler, preserve M4 behavior and add only after successful current Scene apply:

```js
sequenceController.setSequence(nextSequence, { playhead: currentPlayhead });
applySceneAtCurrentPlayhead(nextSequence);
workspace.recordSequenceApplyEvidence?.({
  proposal: proposalForApply,
  sequence: nextSequence,
  beatIds
});
workspace.syncGenerationPromptInspector?.();
```

If receipt recording throws, do **not** fabricate a receipt or roll back Scene/Sequence. Surface a clear live/status message that Prompt generation authority could not be recorded and therefore remains unavailable.

- [ ] **Step 6: Add selected Apply regression**

Test that `beatIds` is the exact current Apply selection, not all five Beats. Test guarded mode uses `authorityPlan.resolvedProposal` rather than raw `proposal`.

- [ ] **Step 7: Run GREEN + existing Apply regression**

```bash
node --test visual-direction-os/generation-prompt-apply-integration.test.js
node visual-direction-os/narrative-apply.test.js
node --check visual-direction-os/narrative-workspace.js
node --check visual-direction-os/narrative-apply-ui.js
```

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/narrative-workspace.js visual-direction-os/narrative-apply-ui.js visual-direction-os/generation-prompt-apply-integration.test.js
git commit -m "feat: connect prompt readiness to explicit apply"
```

---

## Task 8: Browser/runtime dependency loading and Scene snapshot persistence

**Files:**
- Modify: `visual-direction-os/project-bootstrap.js`
- Modify: `visual-direction-os/director-v2.html` only if required by existing static dependency ordering.
- Modify: `visual-direction-os/build-pages-site.test.js` if Pages assembly enumerates expected assets.
- Add or extend a Node test for dependency/source ordering if the repo has a source-contract pattern.

**Runtime dependency order:**

```text
project-constraint-registry.js
↓
generation-prompt-apply-evidence.js
↓
narrative-state.js

visual-ir-bridge.js
visual-sequence-skeleton.js
project-constraint-authority.js
↓
generation-prompt-ir.js
prompt-language-registry.js
generation-prompt-renderer.js
↓
generation-prompt-compiler.js
↓
generation-prompt-inspector.js + generation-prompt.css
```

- [ ] **Step 1: Write RED dependency/asset test**

Assert the browser page/bootstrap loads all six M8 JS modules and the stylesheet before Prompt Inspector initialization.

- [ ] **Step 2: Run RED**

Use the existing relevant Node contract test, or create `visual-direction-os/generation-prompt-bootstrap.test.js` if no focused test exists:

```bash
node --test visual-direction-os/generation-prompt-bootstrap.test.js
```

- [ ] **Step 3: Load M8 dependencies in bootstrap**

Increment bootstrap asset version from the M7 value to an M8-specific version, for example:

```js
const VERSION = '20260824-m8-prompt-compiler';
```

Load `generation-prompt.css` and all M8 modules once. Do not add provider/generation scripts.

- [ ] **Step 4: Pass Prompt Compiler context from Project Bootstrap**

The Narrative Workspace restore call gains:

```js
generationPromptCompiler: root.VDOSGenerationPromptCompiler,
generationPromptInspector: root.VDOSGenerationPromptInspector,
generationPromptContextProvider: () => ({
  sceneId: store.getProject()?.activeSceneId || null,
  visualIR: root.VDOSVisualIRShadowController?.getVisualIR?.() || null,
  sequence: root.VDOSSequenceDirectorController?.getSequence?.() || null,
  sceneState: root.VDOSScene?.getSceneState?.() || null,
  projectConstraintContext: currentProjectConstraintContext(store)
})
```

Narrative State snapshots already flow through `project-runtime.js` as `workspace.narrativeState`; `sequenceApplyState` therefore persists automatically once it is part of draft state. Do not invent a second Project storage location.

- [ ] **Step 5: Add snapshot round-trip test**

Using existing Project Runtime adapters, prove:

```text
Scene A Narrative State has receipt for RUPTURE
→ capture Scene A
→ switch Scene B
→ switch back Scene A
→ sequenceApplyState receipt is restored
```

- [ ] **Step 6: Run GREEN / Pages checks**

```bash
node --test visual-direction-os/generation-prompt-bootstrap.test.js
node --test visual-direction-os/build-pages-site.test.js
node --check visual-direction-os/project-bootstrap.js
```

If the repo's existing build command is available, also run the same Pages assembly command used by CI.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/project-bootstrap.js visual-direction-os/director-v2.html visual-direction-os/build-pages-site.test.js visual-direction-os/generation-prompt-bootstrap.test.js
git commit -m "feat: load prompt compiler runtime"
```

Only add files that actually changed.

---

## Task 9: Browser acceptance — partial Apply, rendered audit, stale/Scene blocking

**Files:**
- Create: `visual-direction-os/generation-prompt-browser.spec.js`

**Browser fixture:** Use the existing `?narrativeDemo=1&projectDemo=1` path and existing public runtime APIs. Do not add a production-only test hook.

- [ ] **Step 1: Write RED positive browser chain**

Test flow:

```text
open Director demo
→ enter/select a Project Scene
→ NARRATIVE
→ use existing demo Reading/Strategy/Sequence path
→ wait for five Prompt Beat tabs
→ before Apply: all five show DRAFT
→ STRUCTURE shows REQUIRED / GUIDED / OPEN / APPLY EVIDENCE
→ RENDERED shows neutral text + audit/provenance view
→ Apply selected RUPTURE + RELEASE
→ RUPTURE + RELEASE become READY
→ SETUP + PRESSURE + NEW OWNERSHIP stay DRAFT
→ no Generate control exists
```

- [ ] **Step 2: Run RED**

```bash
npx playwright test visual-direction-os/generation-prompt-browser.spec.js
```

Expected: FAIL before UI/runtime integration is complete.

- [ ] **Step 3: Add Apply-all/progressive acceptance**

After selected Apply, apply remaining Beats / Apply all and assert all individually valid packages become READY while previous still-current receipts remain valid.

- [ ] **Step 4: Add current Scene divergence negative case**

Use normal DIRECT controls/public Scene API to change a generation-relevant field on the current Beat after Apply. Assert:

```text
current Beat → BLOCKED
reason → SCENE_PROVENANCE_DIVERGENCE
```

Assert a non-current previously applied Beat does **not** inherit that divergence.

- [ ] **Step 5: Add M7 stale/conflict negative case**

Use the existing Project Constraint public fixture/runtime setup used by `project-constraint-browser.spec.js` to create a confirmed constraint, then change the evidence so its current resolution becomes STALE or use an unsupported target Grammar to produce CONFLICT.

Assert only the scoped affected Prompt Beat becomes BLOCKED with:

```text
PROJECT_CONSTRAINT_STALE
or
PROJECT_CONSTRAINT_CONFLICT
```

No generation-ready control is present for DRAFT/BLOCKED.

- [ ] **Step 6: Run GREEN**

```bash
npx playwright test visual-direction-os/generation-prompt-browser.spec.js
```

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/generation-prompt-browser.spec.js
git commit -m "test: cover generation prompt browser flow"
```

---

## Task 10: CI wiring, full regression, exact-HEAD verification

**Files:**
- Modify: `.github/workflows/director-intelligence-ci.yml`

- [ ] **Step 1: Add M8 Node tests to the existing contracts job**

The workflow must run:

```bash
node --test visual-direction-os/generation-prompt-apply-evidence.test.js
node --test visual-direction-os/generation-prompt-narrative-state.test.js
node --test visual-direction-os/generation-prompt-ir.test.js
node --test visual-direction-os/generation-prompt-renderer.test.js
node --test visual-direction-os/generation-prompt-compiler.test.js
node --test visual-direction-os/generation-prompt-inspector.test.js
node --test visual-direction-os/generation-prompt-apply-integration.test.js
node --test visual-direction-os/generation-prompt-bootstrap.test.js
```

Use `node file.js` instead of `node --test` only for an existing test file that is intentionally script-style.

- [ ] **Step 2: Extend runtime syntax checks**

Add `node --check` for every new M8 runtime JS module.

- [ ] **Step 3: Extend Pages asset verification**

CI/Pages checks must prove:

```text
generation-prompt-apply-evidence.js
generation-prompt-ir.js
prompt-language-registry.js
generation-prompt-renderer.js
generation-prompt-compiler.js
generation-prompt-inspector.js
generation-prompt.css
```

are present in the assembled site/runtime.

- [ ] **Step 4: Add M8 Playwright spec to browser job**

Run the existing browser suite plus:

```bash
npx playwright test visual-direction-os/generation-prompt-browser.spec.js
```

- [ ] **Step 5: Run full local/available verification before completion claim**

Run all M8 tests plus every existing M0–M7 contract/runtime test invoked by `director-intelligence-ci.yml`. At minimum, explicitly re-run:

```bash
node visual-direction-os/narrative-apply.test.js
node --test visual-direction-os/project-constraint-registry.test.js
node --test visual-direction-os/project-constraint-candidates.test.js
node --test visual-direction-os/project-constraint-authority.test.js
node --test visual-direction-os/visual-sequence-project-constraints.test.js
node --test visual-direction-os/project-constraint-inspector.test.js
node --test visual-direction-os/project-constraint-workspace.test.js
node --test visual-direction-os/build-pages-site.test.js
```

Then run the CI-equivalent browser suite.

- [ ] **Step 6: Verify authority invariants by static search**

Search new M8 production code and fail review if it contains production assignment of:

```text
owner:'project'
owner:"project"
owner:'apply'
owner:"apply"
```

Search renderer/registry for injected generic quality words. Literal test fixtures / Director content are allowed; renderer templates are not.

- [ ] **Step 7: Verify branch history against M8 baseline**

Expected:

```text
base: 8551f0262d6a0ee7078f78e5f9957acb3afbbd0a
merge base: same SHA
behind: 0
```

No unrelated history divergence.

- [ ] **Step 8: Push exact HEAD and require fresh GitHub Actions success**

Do not reuse an older CI run. Record:

```text
exact implementation HEAD
workflow run id
contracts result
runtime syntax result
Pages assembly result
browser result
```

- [ ] **Step 9: Produce exact commit-pinned product preview**

Use:

```text
https://raw.githack.com/Caesar-ZZh/visual-direction-os/<EXACT_HEAD>/visual-direction-os/director-v2.html?narrativeDemo=1&projectDemo=1
```

Product review checklist:

```text
1. Prompt Preview appears only after a valid Sequence exists.
2. Five Beat tabs remain distinct.
3. Before Apply, all valid packages are DRAFT.
4. STRUCTURE clearly separates Director content, REQUIRED, GUIDED, OPEN, BLOCKED, Project support, Apply evidence.
5. RENDERED neutral text does not contain audit evidence-gap instructions.
6. Audit view shows IR/provenance header and evidence gaps.
7. Apply selected only changes selected Beat readiness.
8. Current Beat manual divergence becomes BLOCKED without rewriting the Director edit.
9. M7 stale/conflict blocks only its governed Beat scope.
10. No Generate button yet.
11. No provider syntax / model selection appears.
12. No global style rule, score, `owner:project`, or `owner:apply` appears.
```

- [ ] **Step 10: Commit CI changes**

```bash
git add .github/workflows/director-intelligence-ci.yml
git commit -m "ci: verify m8 prompt compiler"
```

- [ ] **Step 11: Keep branch unmerged for product approval**

Do not merge to `integration/director-workspace-v2-1` until the user explicitly approves the product review preview.

---

## Implementation Order and Review Gates

Execute strictly in this order:

```text
Task 1  Apply Evidence primitives
↓
Task 2  Narrative State persistence
↓
Task 3  Prompt IR / authority contract
↓
Task 4  Language registry / deterministic renderer
↓
Task 5  Readiness orchestrator
↓
Task 6  Read-only inspector
↓
Task 7  Explicit Apply integration
↓
Task 8  Bootstrap / snapshot integration
↓
Task 9  Browser acceptance
↓
Task 10 CI / exact-HEAD verification
```

Reviewer gates:

- After Task 2: Apply receipt state is deterministic, persistent, and creates no visual owner.
- After Task 4: pure translation path is complete and independently testable before runtime integration.
- After Task 5: DRAFT/READY/BLOCKED semantics are complete without UI.
- After Task 7: explicit Apply boundary is preserved.
- After Task 9: product behavior is testable end-to-end.
- After Task 10: only fresh exact-HEAD evidence permits an implementation-complete claim.

---

## Spec Coverage Matrix

| Spec requirement | Task |
| --- | --- |
| Canonical M8 successor; no parallel M1 authority | Global constraints / Task 10 search |
| Explicit schema validation / controlled errors | Task 3 / Task 5 |
| Required backbone fail-closed | Task 3 / Task 5 |
| Non-backbone UNKNOWN remains OPEN | Task 3 / Task 5 |
| Structured evidence gaps | Task 3 |
| Generation-facing vs audit-facing gap text | Task 4 |
| Structured provenance metadata | Task 3 / Task 4 / Task 5 |
| Prompt authority classes | Task 3 |
| No authority escalation | Task 3 |
| Project support not ownership | Task 3 / Task 5 |
| Deterministic renderer | Task 4 |
| Controlled language registry | Task 4 |
| No generic quality/style injection | Task 4 / Task 10 |
| OPEN/BLOCKED omitted from generation text | Task 4 |
| Anti-rules only negative source | Task 4 |
| Per-Beat Apply Evidence | Task 1 / Task 2 / Task 7 |
| Apply selected behavior | Task 1 / Task 7 / Task 9 |
| Current Scene reconciliation only for current Beat | Task 5 / Task 9 |
| M7 re-resolution / scoped blocking | Task 5 / Task 9 |
| DRAFT/READY/BLOCKED | Task 5 |
| Read-only Prompt Inspector | Task 6 |
| Narrative snapshot persistence | Task 2 / Task 8 |
| No M9 generation action | Task 6 / Task 9 |
| Exact fingerprints | Task 1 / Task 3 |
| Browser acceptance | Task 9 |
| M0–M7 regression / exact HEAD CI | Task 10 |

---

## Completion Definition

M8 is complete only when a fresh exact implementation HEAD proves all of the following:

```text
Visual IR v0.3.0 validated
↓
M5 Sequence / provenance validated
↓
current M7 evidence re-resolved
↓
Prompt IR maps authority without escalation
↓
Prompt renderer is byte-deterministic
↓
Evidence gaps stay audit-facing
↓
explicit Beat Apply Evidence controls READY
↓
current Scene divergence blocks only current Beat
↓
Prompt Inspector explains DRAFT / READY / BLOCKED
↓
no M9 generation exists yet
↓
M0–M7 regression remains green
```

Product completion statement:

> M8 makes generation prompts a reproducible projection of already-established directing truth, with explicit provenance, intentional UNKNOWN freedom, and per-Beat Apply authority preserved all the way to the generation boundary.
