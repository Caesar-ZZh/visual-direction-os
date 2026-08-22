# M6 Project Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, read-only Project Intelligence layer that explains cross-Scene narrative cause, visual response, ownership consequence, and provenance without altering existing Project Arc, Continuity, Scene State, or M5 behavior.

**Architecture:** Add a pure `project-intelligence.js` domain module that normalizes Scene snapshots and evaluates adjacent boundaries. Add a separate `project-intelligence-inspector.js` presentation module and integrate its read-only output into `project-workspace.js` after existing Continuity. Keep Project State schema unchanged; derive all intelligence at runtime from existing Scene workspace snapshots.

**Tech Stack:** Vanilla JavaScript UMD modules, Node contract tests, Playwright browser acceptance, existing GitHub Actions Director Intelligence CI.

**Spec:** `docs/superpowers/specs/2026-08-22-m6-project-intelligence-design.md`

## Global Constraints

- M6 is read-only: no mutation of Project State, Scene State, Narrative State, Sequence State, Visual IR, or provenance.
- Existing `project-arc.js` and `project-continuity.js` semantics must remain unchanged.
- Boundary reasoning is `current Scene narrative cause → previous/current final visual response → ownership consequence`.
- Handoff continuity is separately `previous ending agency ↔ current starting agency`.
- Provenance labels are allowed only when current final Scene State still matches the recorded M5 value.
- Missing/blocked/unsupported evidence remains `UNRESOLVED`; never guess.
- Grammar changes are not findings by themselves.
- No numeric score, no automatic repair, no same-Grammar enforcement.
- Legacy Projects remain valid.
- No merge to integration or `master`; PR #4 remains Draft until explicit user approval.

---

### Task 1: Scene Intelligence Normalizer

**Files:**
- Create: `visual-direction-os/project-intelligence.js`
- Create: `visual-direction-os/project-intelligence.test.js`
- Modify: `.github/workflows/director-intelligence-ci.yml`

**Interfaces:**
- Consumes: a Project Scene object with `narrativeRole`, `workspace.narrativeState`, `workspace.sequenceState`, `workspace.sceneState`, and `status.visual`.
- Produces: `normalizeSceneIntelligence(scene, options?)` and helper-normalized provenance/visual fields.

- [ ] **Step 1: Write failing normalization tests**

Cover exact cases:

```js
const assert = require('assert');
const { normalizeSceneIntelligence } = require('./project-intelligence.js');

// compiler-first Camera source is retained only when final state matches provenance
// AI-completed family is identified from M5 completion provenance
// blocked family remains blocked
// legacy directed Scene => provenanceStatus 'legacy'
// incomplete compiler-first markers => provenanceStatus 'missing'
// grammarId comes only from explicit provenance, never inferred from camera/color final state
// provenance/final-state divergence => response source 'unknown'
// input object remains deep-equal to pre-call clone
// same input twice => deep-equal result
```

Use fixture builders inside the test file so test intent is explicit and does not depend on unrelated browser/demo fixtures.

- [ ] **Step 2: Add the new test to Director Intelligence contracts CI and verify RED**

Expected failure: `Cannot find module './project-intelligence.js'` or missing exported `normalizeSceneIntelligence`.

- [ ] **Step 3: Implement the minimal UMD normalizer**

`project-intelligence.js` must expose:

```js
normalizeSceneIntelligence(scene, options?)
```

Normalize agency exactly:

```js
world => WORLD
character => CHARACTER
contested/shared/mixed => CONTESTED
unknown => null
```

Return a deterministic Scene record containing at least:

```js
{
  sceneId,
  title,
  order,
  narrativeRole,
  grammarId,
  provenanceStatus,
  narrativeAgency:{ start, end },
  compilerOwnedFamilies:[],
  aiCompletedFamilies:[],
  blockedFamilies:[],
  visualAgency,
  cameraAuthority,
  colorTerritory,
  sources:{ agency, camera, color },
  evidence:{
    hasNarrativeState,
    hasSceneState,
    hasSequenceState,
    hasCompilerFirstProvenance
  },
  integrityFindings:[]
}
```

Do not infer `grammarId` from final state. If stored compiler/AI provenance value differs from final state, set that source to `unknown` and append an integrity finding with status `UNRESOLVED`.

- [ ] **Step 4: Run normalization tests and all existing Project Arc/Continuity tests**

Expected: new tests PASS; existing `project-arc.test.js` and `project-continuity.test.js` remain PASS without production changes.

- [ ] **Step 5: Commit**

Commit message: `feat: normalize M6 project intelligence scenes`

---

### Task 2: Boundary Cause / Handoff Rules

**Files:**
- Modify: `visual-direction-os/project-intelligence.js`
- Modify: `visual-direction-os/project-intelligence.test.js`

**Interfaces:**
- Consumes: two outputs of `normalizeSceneIntelligence`.
- Produces: `deriveBoundaryIntelligence(previousSceneRecord, currentSceneRecord)`.

- [ ] **Step 1: Write failing boundary-rule tests**

Required cases:

```text
1. Current Scene WORLD→CONTESTED + compiler-backed Camera WORLD→MIXED => PASS.
2. Current Scene WORLD→WORLD + compiler-backed Camera WORLD→CHARACTER => WARN.
3. Current Scene narrative agency changes but supported compiler-backed response is absent => WARN.
4. Same narrative change with relevant family blocked/unsupported => UNRESOLVED.
5. Previous ending agency != current starting agency => WARN handoff mismatch.
6. Missing handoff side => UNRESOLVED.
7. Camera-led → Color-led grammar change alone => no warning.
8. Legacy directed Scene => UNRESOLVED, never FAIL merely for missing provenance.
9. Provenance/final-state divergence => UNRESOLVED and source unknown.
```

Each assertion must inspect `status`, `rule`, `cause`, `handoff`, `visualResponse`, `ownershipConsequence`, `why`, and `evidenceStatus` rather than matching copy alone.

- [ ] **Step 2: Run the new tests and verify RED**

Expected failure: missing `deriveBoundaryIntelligence`.

- [ ] **Step 3: Implement deterministic boundary analysis**

Expose:

```js
deriveBoundaryIntelligence(previousSceneRecord, currentSceneRecord)
```

Rules must use:

```text
Cause: current narrativeAgency.start → current narrativeAgency.end + current narrativeRole
Visual response: previous final visual state → current final visual state
Handoff: previous narrativeAgency.end ↔ current narrativeAgency.start
```

Camera and Color ownership may be evaluated only when their sources are safely attributable. Space/Texture/Medium and unsupported exact mappings remain unresolved.

Use precedence:

```js
PASS < UNRESOLVED < WARN < FAIL
```

but do not emit FAIL in v1 unless a deterministic hard invariant is proven.

- [ ] **Step 4: Run boundary and regression tests**

Expected: all M6 unit tests PASS and existing Continuity output tests remain unchanged.

- [ ] **Step 5: Commit**

Commit message: `feat: derive M6 cross-scene intelligence`

---

### Task 3: Project-Level Aggregate

**Files:**
- Modify: `visual-direction-os/project-intelligence.js`
- Modify: `visual-direction-os/project-intelligence.test.js`

**Interfaces:**
- Consumes: current Project State with `sceneOrder` and `scenes`.
- Produces: `deriveProjectIntelligence(projectState)`.

- [ ] **Step 1: Write failing aggregate tests**

Assert exact top-level shape:

```js
{
  schemaVersion:'0.1.0',
  mode:'shadow',
  status,
  sceneOrder,
  scenes,
  boundaries,
  findings
}
```

Test:

```text
- empty Project => UNRESOLVED, zero boundaries
- three-Scene Project => two adjacent boundaries in exact sceneOrder
- Scene integrity findings are preserved in top-level findings
- overall status follows categorical precedence
- input remains unchanged
- deterministic repeat call returns deep-equal result
```

- [ ] **Step 2: Verify RED**

Expected failure: missing `deriveProjectIntelligence`.

- [ ] **Step 3: Implement aggregate without persisting output**

Do not write intelligence into Project State. Read Scene order once, normalize each Scene, derive adjacent boundaries, flatten findings, calculate categorical status.

- [ ] **Step 4: Run M6 and existing Project model tests**

Include:

```text
project-arc.test.js
project-continuity.test.js
project-state.test.js
project-runtime.test.js
```

Expected: all PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: aggregate M6 project intelligence`

---

### Task 4: Project Intelligence Inspector

**Files:**
- Create: `visual-direction-os/project-intelligence-inspector.js`
- Create: `visual-direction-os/project-intelligence-inspector.test.js`
- Modify: `visual-direction-os/project-workspace.css`
- Modify: `.github/workflows/director-intelligence-ci.yml`

**Interfaces:**
- Consumes: result of `deriveProjectIntelligence(projectState)`.
- Produces: `renderProjectIntelligence(intelligenceState)` returning escaped HTML only.

- [ ] **Step 1: Write failing renderer tests**

Require copy/structure:

```text
PROJECT INTELLIGENCE · SHADOW
CAUSE · CURRENT SCENE
VISUAL RESPONSE
OWNERSHIP CONSEQUENCE
COMPILER-BACKED / AI-COMPLETED / LEGACY / BLOCKED / UNKNOWN where applicable
PASS / WARN / UNRESOLVED status
```

Also assert:

```text
- no numeric score copy
- no Fix automatically action
- no same-Grammar recommendation
- expandable details show handoff, grammar, provenance status, compiler-owned/AI-completed/blocked families
- all dynamic strings are escaped
```

- [ ] **Step 2: Verify RED**

Expected: missing module/renderer.

- [ ] **Step 3: Implement compact read-only inspector**

UMD export:

```js
renderProjectIntelligence(intelligenceState)
```

Render a compact summary plus boundary cards. Details may use `<details>` and must not include mutation actions.

- [ ] **Step 4: Add restrained CSS**

Place visual weight below Project Arc and Continuity. Reuse existing Project typography, spacing, status tokens, and buttons only for existing `open-scene` navigation where needed.

- [ ] **Step 5: Run renderer tests and commit**

Commit message: `feat: render M6 project intelligence inspector`

---

### Task 5: Project Workspace Read-Only Integration

**Files:**
- Modify: `visual-direction-os/project-workspace.js`
- Modify: `visual-direction-os/project-workspace.test.js`
- Modify: `visual-direction-os/project-workspace.spec.js`
- Modify: `visual-direction-os/director-v2.html`
- Modify: `visual-direction-os/build-pages-site.js` / `build-pages-site.test.js` only if explicit asset copy list requires it
- Modify: `.github/workflows/director-intelligence-ci.yml`

**Interfaces:**
- Consumes: `VDOSProjectIntelligence.deriveProjectIntelligence` and `VDOSProjectIntelligenceInspector.renderProjectIntelligence`.
- Produces: Project Workspace order `Project Arc → Continuity → Project Intelligence · Shadow`.

- [ ] **Step 1: Write failing integration/static-order tests**

Require:

```text
project-intelligence.js loads before project-workspace.js
project-intelligence-inspector.js loads before project-workspace.js
Project Intelligence section appears after Continuity
renderProjectWorkspace() does not mutate project input
existing Project Arc and Continuity HTML remains present
```

- [ ] **Step 2: Verify RED**

Expected failure: missing dependencies/script tags/section.

- [ ] **Step 3: Wire pure dependencies into `project-workspace.js`**

Change UMD dependency list to consume Project Intelligence and its inspector. Default `renderProjectWorkspace(project, arcState, continuityState, intelligenceState)` may derive intelligence when omitted, but must never capture Scene state or dispatch store mutations.

- [ ] **Step 4: Add Director script load order and Pages assembly checks**

Required order around Project modules:

```text
project-arc.js
project-continuity.js
project-intelligence.js
project-intelligence-inspector.js
project-workspace.js
```

- [ ] **Step 5: Run contracts, syntax, Pages assembly, existing Project browser suite**

Expected: all existing Project behavior remains green before adding new browser acceptance.

- [ ] **Step 6: Commit**

Commit message: `feat: integrate M6 intelligence into Project Workspace`

---

### Task 6: M6 Browser Acceptance + Negative Evidence Paths

**Files:**
- Create: `visual-direction-os/project-intelligence-browser.spec.js`
- Modify: project demo fixtures only if a deterministic compiler-first/legacy/divergence fixture cannot be created locally inside the spec
- Modify: `.github/workflows/director-intelligence-ci.yml`

**Interfaces:**
- Uses current Director V2 browser with `?narrativeDemo=1&projectDemo=1` plus minimal deterministic fixture injection if needed.
- Validates only visible behavior and canonical state invariants.

- [ ] **Step 1: Write browser acceptance RED**

Positive path must prove:

```text
- PROJECT INTELLIGENCE · SHADOW visible after Continuity
- at least one adjacent compiler-first Scene pair displays Cause, Visual Response, Ownership Consequence
- compiler-backed Camera or Color provenance is shown only when final state matches provenance
- Scene switching continues to restore Scene/Narrative/Sequence state
- opening/expanding intelligence details does not change canonical Scene State
```

Negative paths must prove:

```text
- legacy directed Scene => UNRESOLVED, workspace still usable
- provenance/final-state divergence => UNRESOLVED and not COMPILER-BACKED
- grammar change alone does not create a warning
```

- [ ] **Step 2: Verify RED**

Expected failure should be missing M6 visible behavior/fixture support only; older browser specs should stay green.

- [ ] **Step 3: Add only the minimal fixture/integration behavior needed**

Do not add production mutation hooks or test-only code that alters Project State semantics. Prefer browser-side deterministic setup through existing public store APIs when possible.

- [ ] **Step 4: Run full browser suite**

Include existing:

```text
director-v2-rail-intent.spec.js
visual-ir-shadow.spec.js
visual-compiler-shadow.spec.js
visual-authority-handoff.spec.js
visual-sequence-compiler-first.spec.js
narrative-workspace.spec.js
project-workspace.spec.js
project-intelligence-browser.spec.js
```

Expected: all PASS.

- [ ] **Step 5: Commit**

Commit message: `test: prove M6 project intelligence in browser`

---

### Task 7: Exact-HEAD Verification and PR Review Handoff

**Files:**
- Modify PR #4 metadata only after fresh final CI succeeds.

**Interfaces:**
- Produces the user-testable M6 milestone; performs no merge.

- [ ] **Step 1: Run/fetch fresh exact-HEAD Director Intelligence CI**

Require all jobs:

```text
contracts SUCCESS
changed runtime syntax SUCCESS
Pages assembly SUCCESS
browser acceptance SUCCESS
```

- [ ] **Step 2: Compare branch to Director V2.1 baseline**

Require:

```text
base = fbf3329557c02452a9175ab0d9ed02bf55a8368a
behind = 0
merge-base remains baseline
```

- [ ] **Step 3: Verify PR state**

Require:

```text
PR #4 open
Draft true
base integration/director-workspace-v2-1
merged false
```

- [ ] **Step 4: Update PR title/body to M6**

Title:

```text
Phase II M6: provenance-aware Project Intelligence
```

Body must document M6 architecture, positive/negative browser proof, exact HEAD, CI result, and keep-Draft instruction.

- [ ] **Step 5: Provide commit-pinned RawGitHack preview and exact interactions to test**

Do not merge. User visual/product approval is required before any integration action.
