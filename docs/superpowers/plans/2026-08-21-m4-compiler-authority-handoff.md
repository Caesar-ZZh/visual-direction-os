# M4 Compiler Authority Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the deterministic Visual Compiler guarded write authority over evidence-supported Scene State fields at the explicit Narrative Apply boundary while preserving the raw AI proposal and manual DIRECT editability.

**Architecture:** Add a pure authority resolver that derives an immutable `AuthorityPlan` and `resolvedProposal` from the existing Visual IR + raw AI Sequence proposal. Keep M3 Shadow Compare reading the raw proposal, but let `narrative-apply-ui.js` use the resolved proposal only at explicit Apply time. Unsupported, partial, blocked, latent, and unresolved claims remain non-authoritative.

**Tech Stack:** Vanilla JavaScript UMD modules, Node `node:test`, Playwright browser acceptance, existing Director V2 Scene State / Narrative / Sequence Director runtime.

**Spec:** `docs/superpowers/specs/2026-08-21-m4-compiler-authority-handoff-design.md`

## Global Constraints

- Only compiler assertions with `status === 'supported'` may alter an Apply patch.
- `partial`, `blocked`, latent, and unresolved claims never write.
- The raw Narrative `sequenceProposal` remains immutable.
- No canonical Scene State or Sequence Director mutation occurs before explicit **Apply to Director**.
- Unclaimed AI fields remain in the resolved proposal as AI-retained values.
- Manual DIRECT controls remain editable after Apply.
- Existing M3 Shadow Compare must continue comparing the raw AI proposal, not the resolved proposal.
- No new Scene State dimensions are introduced.
- Keep PR #4 draft and based on `integration/director-workspace-v2-1`; do not merge.

---

### Task 1: Pure Guarded Authority Resolver

**Files:**
- Create: `visual-direction-os/visual-compiler-authority.js`
- Create: `visual-direction-os/visual-compiler-authority.test.js`

**Interfaces:**
- Consumes: `VDOSVisualCompiler.compileBeatExpectations({ visualIR, beat })`
- Produces: `resolveBeatAuthority({ visualIR, beat })`
- Produces: `resolveSequenceAuthority({ visualIR, proposal })`

- [ ] **Step 1: Write the failing resolver tests**

Cover supported confirm/override/inject, partial no-write, blocked no-write, immutability, and sequence aggregation.

```js
const authority = require('./visual-compiler-authority.js');

const result = authority.resolveBeatAuthority({
  visualIR: { grammar:{ status:'resolved', id:'camera-authority-transfer' } },
  beat: { id:'rupture', label:'RUPTURE', agency:'contested', sceneStatePatch:{ variables:{ camera:{ perspective:'world' } } } }
});

assert.equal(result.resolvedPatch.variables.camera.perspective, 'mixed');
assert.equal(result.decisions[0].action, 'OVERRIDE');
```

- [ ] **Step 2: Run the resolver test and verify red**

Run:

```bash
node --test visual-direction-os/visual-compiler-authority.test.js
```

Expected: FAIL because `visual-compiler-authority.js` does not exist.

- [ ] **Step 3: Implement the minimal resolver**

Use deep clones and a safe path writer for Scene State patch paths:

```js
function setPatchValue(patch, path, value) {
  if (path === 'agency') {
    patch.agency = value;
    return;
  }
  const parts = String(path).split('.');
  let cursor = patch.variables || (patch.variables = {});
  parts.forEach((part, index) => {
    if (index === parts.length - 1) cursor[part] = value;
    else cursor = cursor[part] || (cursor[part] = {});
  });
}
```

Only call `setPatchValue()` when `assertion.status === 'supported'`. Map actions as:

```js
const action = actual == null ? 'INJECT' : Object.is(actual, expected) ? 'CONFIRM' : 'OVERRIDE';
```

Represent partial assertions as `PARTIAL` audit decisions without changing the patch. Represent compiler gaps as `BLOCKED` audit decisions.

- [ ] **Step 4: Run resolver tests and verify green**

```bash
node --test visual-direction-os/visual-compiler-authority.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Commit message:

```text
M4: add guarded compiler authority resolver
```

---

### Task 2: Authority Inspector and Shadow Runtime Integration

**Files:**
- Create: `visual-direction-os/visual-authority-inspector.js`
- Create: `visual-direction-os/visual-authority-inspector.test.js`
- Modify: `visual-direction-os/visual-ir-shadow.js`
- Modify: `visual-direction-os/visual-ir-inspector.css`
- Modify: `visual-direction-os/director-v2.html`

**Interfaces:**
- Consumes: `VDOSVisualCompilerAuthority.resolveSequenceAuthority({ visualIR, proposal })`
- Produces: `renderAuthorityPlan(plan)`
- Extends `VDOSVisualIRShadowController` with `getAuthorityPlan()`

- [ ] **Step 1: Write failing inspector and integration tests**

Require the inspector to render:

```text
COMPILER AUTHORITY
GUARDED / APPLY-TIME
CONFIRM
OVERRIDE
INJECT
PARTIAL
BLOCKED
```

Require `visual-ir-shadow.js` to expose `getAuthorityPlan()` and place `[data-visual-authority-slot]` after `[data-visual-compiler-slot]` but before `.narrative-apply-preview`.

- [ ] **Step 2: Run tests and verify red**

```bash
node --test visual-direction-os/visual-authority-inspector.test.js
node --test visual-direction-os/visual-compiler-integration.test.js
```

Expected: FAIL because the authority inspector/controller integration does not exist.

- [ ] **Step 3: Implement read-only Authority Plan rendering**

In `visual-ir-shadow.js`:

```js
let activeAuthorityPlan = null;

function syncAuthorityPlan() {
  const state = getWorkspaceController()?.getDraftState?.();
  if (!activeVisualIR || !state?.sequenceProposal) return clearAuthorityPlan();
  activeAuthorityPlan = authority.resolveSequenceAuthority({
    visualIR: activeVisualIR,
    proposal: state.sequenceProposal
  });
  // render into slot before Apply
}

function getAuthorityPlan() {
  return activeAuthorityPlan ? clone(activeAuthorityPlan) : null;
}
```

Do not replace `activeCompilerComparison` or change what M3 compares.

- [ ] **Step 4: Add compact M4 styles and script order**

Load order in `director-v2.html` must remain:

```text
Visual IR Bridge
Visual Compiler
Visual Compiler Compare
Visual Compiler Authority
M3 Compare Inspector
M4 Authority Inspector
Visual IR Inspector
Narrative Workspace
Shadow Adapter
```

- [ ] **Step 5: Run Task 2 tests and syntax checks**

```bash
node --test visual-direction-os/visual-authority-inspector.test.js
node --test visual-direction-os/visual-compiler-integration.test.js
node --check visual-direction-os/visual-compiler-authority.js
node --check visual-direction-os/visual-authority-inspector.js
node --check visual-direction-os/visual-ir-shadow.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Commit message:

```text
M4: expose guarded authority plan in Sequence Preview
```

---

### Task 3: Apply Resolved Proposal at the Existing Explicit Boundary

**Files:**
- Modify: `visual-direction-os/narrative-apply-ui.js`
- Modify: `visual-direction-os/narrative-workspace.spec.js`
- Create: `visual-direction-os/visual-authority-apply.test.js`

**Interfaces:**
- Consumes: `VDOSVisualIRShadowController.getAuthorityPlan()`
- Consumes: `VDOSNarrativeApply.buildSequenceFromProposal(proposal, currentSequence, selectedBeatIds)`
- Produces: guarded Apply behavior with fallback to raw AI proposal when authority is unavailable/unresolved

- [ ] **Step 1: Write failing Apply integration tests**

Pure integration contract:

```js
const plan = authority.resolveSequenceAuthority({ visualIR, proposal });
const next = apply.buildSequenceFromProposal(plan.resolvedProposal, currentSequence, ['rupture']);
assert.equal(next.beats.find(b => b.id === 'rupture').scenePatch.variables.camera.perspective, 'mixed');
assert.equal(next.events.find(e => e.beatId === 'rupture').targetPatch.variables.camera.perspective, 'mixed');
```

Also assert the original `proposal` still contains the conflicting AI value.

- [ ] **Step 2: Run test and verify red at UI boundary**

```bash
node --test visual-direction-os/visual-authority-apply.test.js
```

Expected: resolver test may pass, but Apply UI contract fails until it reads the Authority Plan.

- [ ] **Step 3: Update Apply UI to select the proposal source at click time**

Inside the existing `data-apply-action` listener:

```js
const authorityPlan = root.VDOSVisualIRShadowController?.getAuthorityPlan?.();
const proposalForApply = authorityPlan?.resolvedProposal || proposal;
const nextSequence = apply.buildSequenceFromProposal(proposalForApply, currentSequence, beatIds);
```

Update the status copy to distinguish:

```text
COMPILER GUARDED · Applied ...
```

from fallback:

```text
COMPILER UNRESOLVED · AI proposal applied ...
```

Do not change selected-beat semantics or `narrative:apply` source.

- [ ] **Step 4: Run unit/integration regression**

```bash
node --test visual-direction-os/visual-authority-apply.test.js
node visual-direction-os/narrative-apply.test.js
node visual-direction-os/narrative-contracts.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Commit message:

```text
M4: apply compiler-resolved proposal at Director boundary
```

---

### Task 4: Browser Acceptance for a Real Compiler Override

**Files:**
- Create: `visual-direction-os/visual-authority-handoff.spec.js`
- Modify: `.github/workflows/director-intelligence-ci.yml`

**Interfaces:**
- Browser consumes the normal demo URL: `director-v2.html?narrativeDemo=1&projectDemo=1`
- Test may deliberately alter only the in-memory Narrative draft proposal after Sequence Preview to create one camera conflict; it must not mutate Scene State before Apply.

- [ ] **Step 1: Write the failing browser test**

Flow:

1. reach Camera Strategy Sequence Preview;
2. deep-read raw draft and Scene State;
3. change the raw proposal's rupture camera perspective to `world` through an explicit test-only controller/draft seam if available, or add a deterministic M4 demo query fixture if no seam exists;
4. resync M3/M4 inspectors;
5. assert M3 reports `CONFLICT` for rupture;
6. assert M4 reports `OVERRIDE world → mixed`;
7. assert Scene State still equals the pre-preview snapshot;
8. click **Apply to Director**;
9. assert applied Sequence rupture patch is `mixed`;
10. assert raw Narrative proposal remains `world`;
11. manually set DIRECT camera perspective to `character` and verify it remains editable.

- [ ] **Step 2: Run browser test and verify red**

```bash
npx playwright test visual-direction-os/visual-authority-handoff.spec.js --reporter=line --workers=1
```

Expected: FAIL until M4 runtime + Apply integration is complete.

- [ ] **Step 3: Add the M4 browser spec to Director Intelligence CI**

Keep existing M3, Narrative, and rail regression specs in the same browser job.

- [ ] **Step 4: Run the full browser acceptance suite**

Expected browser suite:

```bash
npx playwright test \
  visual-direction-os/director-v2-rail-intent.spec.js \
  visual-direction-os/visual-ir-shadow.spec.js \
  visual-direction-os/visual-compiler-shadow.spec.js \
  visual-direction-os/visual-authority-handoff.spec.js \
  visual-direction-os/narrative-workspace.spec.js \
  --reporter=line --workers=1
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Commit message:

```text
M4: verify compiler authority handoff in browser
```

---

### Task 5: Final CI, PR, and Review Fixture

**Files:**
- Modify: `.github/workflows/director-intelligence-ci.yml` if Task 4 did not already include all new contract/syntax/pages checks
- Update PR #4 title/body only; do not merge

**Interfaces:**
- CI must run all M0–M4 contracts and browser regressions.

- [ ] **Step 1: Ensure CI includes new unit, syntax, and Pages checks**

Add:

```bash
node --test visual-direction-os/visual-compiler-authority.test.js
node --test visual-direction-os/visual-authority-inspector.test.js
node --test visual-direction-os/visual-authority-apply.test.js
node --check visual-direction-os/visual-compiler-authority.js
node --check visual-direction-os/visual-authority-inspector.js
```

Pages assembly must assert the new runtime JS files are copied and referenced by `director-v2.html`.

- [ ] **Step 2: Trigger a clean PR CI run and require both jobs green**

Required conclusions:

```text
contracts: SUCCESS
browser: SUCCESS
```

- [ ] **Step 3: Compare the M4 head against `fbf3329557c02452a9175ab0d9ed02bf55a8368a`**

Verify:

- M4 branch remains strictly ahead of the Director V2 baseline;
- no accidental `master` merge;
- core Project and Narrative Workspace files are unchanged except the intentional Apply integration and existing M3 rail fix.

- [ ] **Step 4: Update Draft PR #4**

Title:

```text
Phase II M4: guarded Visual Compiler authority handoff
```

Body must describe:

- raw AI proposal remains immutable;
- compiler writes only supported claims at Apply;
- partial/blocked/unresolved claims remain non-authoritative;
- M3 Shadow Compare still audits raw AI output;
- manual DIRECT remains editable;
- final CI run IDs and outcomes.

- [ ] **Step 5: Produce commit-pinned review fixture**

Use:

```text
https://raw.githack.com/Caesar-ZZh/visual-direction-os/<M4_HEAD>/visual-direction-os/director-v2.html?narrativeDemo=1&projectDemo=1
```

Do not merge until visual/product review approves the milestone.