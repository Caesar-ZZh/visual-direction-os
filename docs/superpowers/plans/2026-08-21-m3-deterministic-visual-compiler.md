# M3 Deterministic Visual Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only deterministic compiler and Shadow Compare that checks AI Sequence patches against evidence-bounded Visual IR expectations without mutating Scene State.

**Architecture:** Add two focused runtime modules: `visual-compiler.js` converts resolved Visual IR + beat agency into supported assertions and explicit gaps; `visual-compiler-compare.js` compares those assertions against AI `sceneStatePatch` values. Extend the existing Visual IR shadow adapter to render a compare panel only after Sequence Preview exists. Do not modify Narrative Workspace core, Scene State, Apply, Project, or Sequence contracts.

**Tech Stack:** Vanilla JavaScript UMD modules, Node `node:test`, Playwright browser acceptance, existing GitHub Actions Director Intelligence CI.

**Spec:** `docs/superpowers/specs/2026-08-21-m3-deterministic-visual-compiler-design.md`

## Global Constraints

- M3 remains Shadow Mode and read-only.
- No grammar guessing from primary variable alone.
- No `line ≈ edge` or `texture ≈ medium` coercion.
- No synthetic score; report categorical comparison states only.
- Unknown, blocked, and evidence-incomplete dimensions remain explicit.
- Existing Director V2 UI structure and Narrative/Project/Sequence flows remain intact.

---

### Task 1: Deterministic compiler contract

**Files:**
- Create: `visual-direction-os/visual-compiler.test.js`
- Create: `visual-direction-os/visual-compiler.js`

**Interfaces:**
- Consumes: `VisualIR` from `VDOSVisualIRBridge.compileVisualIR`, and one Sequence beat.
- Produces: `compileBeatExpectations({ visualIR, beat }) -> { grammarId, assertions, gaps }`.

- [ ] **Step 1: Write the failing test**

Create tests that require:

```js
const result = compiler.compileBeatExpectations({ visualIR, beat });
assert.deepEqual(result.assertions[0], {
  path: 'camera.perspective',
  expected: 'character',
  status: 'supported',
  source: 'camera-authority-transfer',
  why: 'Camera authority follows the confirmed character-owned agency state.'
});
```

Also require Color Ownership to compile only `color.territory`, Agency Ownership to compile only top-level `agency`, Surface Assignment to emit a blocked gap, and unresolved grammar to emit no assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test visual-direction-os/visual-compiler.test.js`

Expected: FAIL because `visual-compiler.js` / `compileBeatExpectations` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement exact agency mappings:

```js
const perspectiveForAgency = agency => agency === 'character' ? 'character' : agency === 'world' ? 'world' : 'mixed';
const territoryForAgency = agency => agency === 'character' ? 'character' : agency === 'world' ? 'world' : 'contested';
```

Emit only grammar-authorized assertions and explicit blocked gaps.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test visual-direction-os/visual-compiler.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `M3: add deterministic visual compiler expectations`

---

### Task 2: Shadow comparison engine

**Files:**
- Create: `visual-direction-os/visual-compiler-compare.test.js`
- Create: `visual-direction-os/visual-compiler-compare.js`

**Interfaces:**
- Consumes: compiler output plus AI `sceneStatePatch`.
- Produces: `compareBeat({ expectations, sceneStatePatch }) -> { status, items, counts }` and `compareSequence({ visualIR, beats }) -> { beats, totals }`.

- [ ] **Step 1: Write the failing test**

Require exact categorical behavior:

```js
assert.equal(compare({ expected:'character', actual:'character' }), 'MATCH');
assert.equal(compare({ expected:'character', actual:'world' }), 'CONFLICT');
assert.equal(compare({ expected:'character', actual:undefined }), 'MISSING');
```

Require blocked gaps to appear as `BLOCKED`, and sequence totals to count categories without creating a score.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test visual-direction-os/visual-compiler-compare.test.js`

Expected: FAIL because comparison module does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement path lookup for top-level `agency` and nested `variables.<family>.<key>` using compiler paths such as `camera.perspective` and `color.territory`. Return per-item `{ path, expected, actual, result, why }`.

- [ ] **Step 4: Run test to verify it passes**

Run both Task 1 and Task 2 tests. Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `M3: compare compiler expectations with AI sequence patches`

---

### Task 3: Read-only Shadow Compare UI

**Files:**
- Create: `visual-direction-os/visual-compiler-inspector.test.js`
- Create: `visual-direction-os/visual-compiler-inspector.js`
- Modify: `visual-direction-os/visual-ir-inspector.css`
- Modify: `visual-direction-os/visual-ir-shadow.js`
- Modify: `visual-direction-os/director-v2.html`

**Interfaces:**
- Consumes: `compareSequence(...)` output.
- Produces: restrained HTML panel marked `data-visual-compiler-compare`.

- [ ] **Step 1: Write the failing UI/integration tests**

Require rendered copy:

```text
SHADOW COMPARE
DETERMINISTIC / READ-ONLY
MATCH
CONFLICT
MISSING
BLOCKED
```

Require `visual-ir-shadow.js` to observe Sequence Preview and call the compare renderer without calling `updateSceneState`.

- [ ] **Step 2: Run test to verify it fails**

Run inspector/integration tests. Expected: FAIL because modules and wiring do not exist.

- [ ] **Step 3: Implement minimal UI and wiring**

Load order in `director-v2.html`:

```text
visual-grammar-registry.js
visual-ir-bridge.js
visual-compiler.js
visual-compiler-compare.js
visual-compiler-inspector.js
visual-ir-inspector.js
...
narrative-workspace.js
visual-ir-shadow.js
```

Use a `MutationObserver` inside the shadow adapter only to notice when `[data-sequence-proposal-beat]` exists, then render the read-only compare panel before `.narrative-apply-preview`.

- [ ] **Step 4: Run Node integration tests**

Expected: PASS with no Scene State mutation calls.

- [ ] **Step 5: Commit**

Commit message: `M3: render deterministic shadow compare in sequence preview`

---

### Task 4: Browser acceptance and CI

**Files:**
- Create: `visual-direction-os/visual-compiler-shadow.spec.js`
- Modify: `.github/workflows/director-intelligence-ci.yml`

**Interfaces:**
- Browser test exercises existing Demo flow through Strategy → Sequence.

- [ ] **Step 1: Write failing browser acceptance**

Test Camera Strategy and assert the compare panel appears after Sequence Preview with five beat rows. Capture `window.VDOSScene.getSceneState()` before Narrative flow and after compare render and require deep equality.

- [ ] **Step 2: Run CI to verify initial failure**

Trigger Director Intelligence CI against the feature HEAD and confirm the new browser/contract tests fail for missing M3 implementation.

- [ ] **Step 3: Add M3 tests/modules to CI**

Include compiler tests, comparison tests, inspector tests, syntax checks, Pages assembly file checks, and the new browser spec.

- [ ] **Step 4: Run full Director Intelligence CI**

Expected: contracts = SUCCESS; browser = SUCCESS.

- [ ] **Step 5: Final diff audit**

Compare against `fbf3329557c02452a9175ab0d9ed02bf55a8368a` and verify no edits to canonical Scene State, Apply, Project, Sequence Director, or Narrative Workspace core.
