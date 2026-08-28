# Sequence Director + Diagnostic Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing Sequence Score into a narrative Sequence Director that drives the canonical Scene State and Visual Response, then extend deterministic diagnostics with actionable routes back to the exact DIRECT control without auto-fixing user choices.

**Architecture:** Add a pure `sequence-director-model.js` as the single semantic source for beats, events, hierarchy, tension, and sequence-derived scene patches. Keep `scene-state.js` as the only mutable state store. `sequence-score.js` becomes a compatibility delegate, `sequence-director.js` owns playback/rendering, and `diagnostic-routing.js` resolves navigation/focus only; diagnostics remain deterministic and advisory.

**Tech Stack:** Vanilla HTML/CSS/JS, CommonJS-compatible UMD modules for pure/model code, existing `VDOSScene` state API, Node `assert` model tests, Playwright Chromium acceptance tests, GitHub Actions CI. No framework or new runtime dependency.

## Global Constraints

- Keep LEARN / DIRECT / DIAGNOSE as the only top-level product modes.
- Keep `scene-state.js` as the only canonical mutable Scene State store.
- Sequence playback may publish state patches through `VDOSScene.updateSceneState(...)`; it must not keep a competing scene-state store.
- Diagnostic routing may navigate, focus, highlight, and recommend; it must never silently change a selected DIRECT value.
- Manual DIRECT edits pause active sequence playback.
- Reduced Motion preserves sequence state changes while disabling non-essential animated transitions.
- Do not add AI image generation, WebGL/3D, freeform nonlinear editing, arbitrary user rule scripting, numeric quality scores, or automatic correction.
- Keep the zero-build Vanilla HTML/CSS/JS architecture and existing GitHub Pages assembly contract.
- Preserve all current mobile, desktop rail, typography, ownership, Visual Response, Diagnostic fixture, and Knowledge Atlas regressions.

---

## File Structure

### New files

- `visual-direction-os/sequence-director-model.js` — pure sequence semantics: default beats, visual events, tension lookup, hierarchy, interpolation, validation, and deterministic scene patches.
- `visual-direction-os/sequence-director-model.test.js` — Node assertions for beat boundaries, event activation, hierarchy validation, playhead clamp, tension, interpolation, and state patches.
- `visual-direction-os/sequence-director.js` — Sequence Director DOM renderer and playback controller; publishes through `VDOSScene` only.
- `visual-direction-os/diagnostic-routing.js` — resolves `route` metadata to DIRECT controls and performs scroll/focus/highlight without mutation.
- `visual-direction-os/diagnostic-routing.test.js` — pure route resolution tests.

### Existing files to modify

- `visual-direction-os/sequence-score.js` — compatibility facade delegating `sampleSequence()` to `sequence-director-model.js`; retain global `VDOSSequenceScore` so timeline sync and older tests continue to work.
- `visual-direction-os/diagnostic.js` — enrich findings with `category`, `route`, `learnTarget`, `current`, and `recommendedDirection`; render actionable controls when a valid route exists.
- `visual-direction-os/director-v2-app.js` — initialize Sequence Director and Diagnostic Routing, pause playback on explicit DIRECT edits, and keep initialization-only responsibilities.
- `visual-direction-os/timeline-sync.js` — continue sharing one playhead while reading compatible sequence view data from the new model facade.
- `visual-direction-os/director-v2.html` — load new scripts in deterministic order and preserve the existing `#sequence-root` / `#diagnostic-root` mounting points.
- `visual-direction-os/director-v2-tools.css` — Sequence Director beat band, tension curve, events, hierarchy panel, playback controls, diagnostic route actions, target focus ring.
- `visual-direction-os/director-v2-models.test.js` — keep old assertions and add compatibility checks against the new model.
- `visual-direction-os/director-v2-browser.spec.js` — integrated 390px / 1440px acceptance for Sequence Director, playback, manual-pause behavior, route navigation, no auto-fix, recheck, Reduced Motion, and overflow.
- `.github/workflows/director-v2-ci.yml` — run the two new pure-model test files and syntax-check the two new runtime modules.
- `visual-direction-os/build-pages-site.js` / `site-publish.test.js` only if the current build copier uses an explicit asset allow-list; otherwise leave untouched.

---

### Task 1: Build the pure Sequence Director model

**Files:**
- Create: `visual-direction-os/sequence-director-model.js`
- Create: `visual-direction-os/sequence-director-model.test.js`
- Modify: `.github/workflows/director-v2-ci.yml`

**Interfaces:**
- Produces: `DEFAULT_SEQUENCE`, `clamp01(value)`, `validateSequence(sequence)`, `deriveActiveBeat(sequence, playhead)`, `deriveActiveEvents(sequence, playhead)`, `deriveTension(sequence, playhead)`, `deriveHierarchy(sequence, playhead)`, `deriveSequenceState(sequence, playhead)`, `sampleSequence(playhead, sequence = DEFAULT_SEQUENCE)`.
- `deriveSequenceState(...)` returns `{ playhead, beat, events, hierarchy, tension, tracks, qualitative, patch }`.
- `patch` is a partial object compatible with `VDOSScene.updateSceneState(patch, source)`.

- [ ] **Step 1: Write failing model tests**

Create assertions equivalent to:

```js
const assert = require('assert');
const model = require('./sequence-director-model.js');

assert.equal(model.clamp01(-1), 0);
assert.equal(model.clamp01(2), 1);

const setup = model.deriveActiveBeat(model.DEFAULT_SEQUENCE, 0.05);
assert.equal(setup.id, 'setup');
const rupture = model.deriveActiveBeat(model.DEFAULT_SEQUENCE, 0.5);
assert.equal(rupture.id, 'rupture');
const ownership = model.deriveActiveBeat(model.DEFAULT_SEQUENCE, 0.92);
assert.equal(ownership.id, 'new-ownership');

const atShift = model.deriveSequenceState(model.DEFAULT_SEQUENCE, 0.82);
assert.ok(atShift.events.some(event => event.type === 'OWNERSHIP SHIFT'));
assert.equal(atShift.hierarchy.primary, 'agency');
assert.equal(atShift.patch.agency, 'character');
assert.equal(atShift.patch.variables.color.territory, 'character');

const release = model.deriveSequenceState(model.DEFAULT_SEQUENCE, 0.68);
assert.equal(release.beat.id, 'release');
assert.ok(['low','medium'].includes(release.tension));
assert.ok(release.hierarchy.restrain.includes('texture'));

assert.deepStrictEqual(model.validateSequence(model.DEFAULT_SEQUENCE), { valid:true, errors:[] });
```

- [ ] **Step 2: Add the new test to CI and run the branch CI to verify RED**

Add:

```yaml
node visual-direction-os/sequence-director-model.test.js
```

under the existing model-test step.

Expected: FAIL because `sequence-director-model.js` does not exist yet.

- [ ] **Step 3: Implement the default five-beat sequence and pure derivation functions**

Use these semantic beat ranges:

```js
[
  { id:'setup', label:'SETUP', start:0, end:.18 },
  { id:'pressure', label:'PRESSURE', start:.18, end:.42 },
  { id:'rupture', label:'RUPTURE', start:.42, end:.58 },
  { id:'release', label:'RELEASE', start:.58, end:.78 },
  { id:'new-ownership', label:'NEW OWNERSHIP', start:.78, end:1 }
]
```

Use explicit visual events at stable normalized positions, including at least:

```js
{ id:'evt-space-collapse', type:'SPACE COLLAPSE', at:.42, beatId:'rupture' }
{ id:'evt-texture-peak', type:'TEXTURE PEAK', at:.50, beatId:'rupture' }
{ id:'evt-ownership-shift', type:'OWNERSHIP SHIFT', at:.82, beatId:'new-ownership' }
```

Preserve the existing six numeric track semantics by interpolating between stable anchors rather than removing them. Map numeric tracks to `low / medium / high` with the existing `.34 / .67` thresholds.

- [ ] **Step 4: Run model tests to verify GREEN**

Run:

```bash
node visual-direction-os/sequence-director-model.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/sequence-director-model.js visual-direction-os/sequence-director-model.test.js .github/workflows/director-v2-ci.yml
git commit -m "feat: add sequence director model"
```

---

### Task 2: Preserve Sequence Score compatibility and shared timeline semantics

**Files:**
- Modify: `visual-direction-os/sequence-score.js`
- Modify: `visual-direction-os/director-v2-models.test.js`
- Modify: `visual-direction-os/timeline-sync.js` only if field names need compatibility adaptation
- Modify: `visual-direction-os/director-v2.html`

**Interfaces:**
- Consumes: `VDOSSequenceDirectorModel.sampleSequence(playhead)` / CommonJS `require('./sequence-director-model.js')`.
- Produces: existing `VDOSSequenceScore.sampleSequence(playhead)` shape with `currentBeat`, `tracks`, `qualitative`, `ownership`, and `agency`, plus optional new `hierarchy`, `tension`, and `events` fields.

- [ ] **Step 1: Extend existing model tests before changing the facade**

Add assertions:

```js
const seq = sequence.sampleSequence(0.5);
assert.equal(seq.currentBeat.id, 'rupture');
assert.ok(seq.hierarchy.primary);
assert.ok(seq.tension);
assert.ok(Array.isArray(seq.events));
```

Expected before implementation: FAIL because the old facade returns none of the new semantic fields.

- [ ] **Step 2: Make `sequence-score.js` delegate its pure sampling to the new model**

Keep the UMD/CommonJS shape and global name `VDOSSequenceScore`. In browser mode require `window.VDOSSequenceDirectorModel` to be loaded before `sequence-score.js`; in Node use `require('./sequence-director-model.js')`.

Do not keep a second beat dataset in `sequence-score.js`.

- [ ] **Step 3: Load `sequence-director-model.js` before `sequence-score.js` in `director-v2.html`**

The page load order must be deterministic and zero-build.

- [ ] **Step 4: Run compatibility tests**

Run:

```bash
node visual-direction-os/director-v2-models.test.js
node visual-direction-os/sequence-director-model.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/sequence-score.js visual-direction-os/director-v2-models.test.js visual-direction-os/timeline-sync.js visual-direction-os/director-v2.html
git commit -m "refactor: delegate sequence score to director model"
```

---

### Task 3: Replace the Sequence Score UI with Sequence Director composition

**Files:**
- Create: `visual-direction-os/sequence-director.js`
- Modify: `visual-direction-os/director-v2-app.js`
- Modify: `visual-direction-os/director-v2.html`
- Modify: `visual-direction-os/director-v2-tools.css`
- Modify: `.github/workflows/director-v2-ci.yml`
- Test: `visual-direction-os/director-v2-browser.spec.js`

**Interfaces:**
- Consumes: `VDOSSequenceDirectorModel`, `VDOSScene`.
- Produces: `window.VDOSSequenceDirector.initSequenceDirector(root, scene)` returning controller `{ play(), pause(), destroy(), isPlaying() }`.
- Keeps `#sequence-playhead` so `timeline-sync.js` can continue syncing the state-machine playhead.

- [ ] **Step 1: Add browser acceptance for semantic Sequence Director UI**

At 1440px and 390px assert the mounted `#sequence-root` contains:

```text
.sequence-beat-band
.sequence-tension
[data-sequence-event]
.sequence-hierarchy
#sequence-playhead
```

and the active beat label at playhead `0.50` is `RUPTURE`.

Expected before implementation: FAIL.

- [ ] **Step 2: Render the semantic UI in `sequence-director.js`**

The root composition must include:

```html
<div class="sequence-director-toolbar">...</div>
<div class="sequence-tension" aria-label="Narrative tension curve">...</div>
<div class="sequence-beat-band">...</div>
<div class="sequence-events">...</div>
<div class="score-tracks">...</div>
<div class="sequence-detail-grid">
  <section class="sequence-hierarchy">...</section>
  <section class="sequence-event-detail">...</section>
</div>
<p id="sequence-text-state" ...></p>
```

Use current visual language: serif key values, clean sans metadata, orange active state, no new decorative theme.

- [ ] **Step 3: Wire scrubbing to canonical Scene State**

On `input`:

```js
const view = model.deriveSequenceState(model.DEFAULT_SEQUENCE, value / 100);
scene.updateSceneState({
  ...view.patch,
  playhead:view.playhead,
  narrativeState:view.beat.id,
  diagnosticContext:{
    hasNarrativeCause:true,
    primaryChanges:1 + view.hierarchy.support.length,
    sequenceBeat:view.beat.id,
    declaredPrimary:view.hierarchy.primary,
    restrainedVariables:view.hierarchy.restrain,
    tension:view.tension
  }
}, 'sequence-director:playhead');
```

- [ ] **Step 4: Replace old Sequence Score initializer in `director-v2-app.js`**

Initialize:

```js
const sequenceController = window.VDOSSequenceDirector.initSequenceDirector($('#sequence-root'), scene);
```

Keep `VDOSSequenceScore` loaded only as compatibility data facade for timeline sync.

- [ ] **Step 5: Add CSS and test no overflow at 390 / 1440**

The mobile order must be: toolbar → tension → beats → events → tracks → hierarchy → event detail.

- [ ] **Step 6: Run browser acceptance and syntax checks**

Expected: semantic UI tests PASS; existing State Machine / Sequence shared-state test remains PASS.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/sequence-director.js visual-direction-os/director-v2-app.js visual-direction-os/director-v2.html visual-direction-os/director-v2-tools.css visual-direction-os/director-v2-browser.spec.js .github/workflows/director-v2-ci.yml
git commit -m "feat: add sequence director interface"
```

---

### Task 4: Add playback and manual-edit priority

**Files:**
- Modify: `visual-direction-os/sequence-director.js`
- Modify: `visual-direction-os/director-v2-app.js`
- Modify: `visual-direction-os/director-v2-browser.spec.js`

**Interfaces:**
- `controller.play()` starts advancing the canonical `playhead` with `requestAnimationFrame`.
- `controller.pause()` stops advancement without resetting the playhead.
- `controller.isPlaying()` returns a boolean.
- Explicit DIRECT controls call `sequenceController.pause()` before publishing the manual state change.

- [ ] **Step 1: Add browser tests for playback**

Test:

1. click `[data-sequence-action="play"]`
2. wait ~350ms
3. assert Scene State `playhead` increased
4. assert `.sequence-beat-band` and `data-vr-*` response reflect the new state

- [ ] **Step 2: Add browser test for manual control priority**

Start playback, then click:

```css
[data-variable-family="color"][data-variable-key="temperature"][data-variable-value="cool"]
```

Assert:

```js
window.VDOSSequenceDirectorController.isPlaying() === false
window.VDOSScene.getSceneState().variables.color.temperature === 'cool'
```

- [ ] **Step 3: Implement deterministic playback**

Use a normalized duration of `12000ms` for the first version. Playback advances from current playhead to `1`, then pauses at `1`. Do not loop automatically.

Reduced Motion changes visual transition styling only; it does not stop the playhead clock.

- [ ] **Step 4: Expose the controller only for integration/testing**

After initialization:

```js
window.VDOSSequenceDirectorController = sequenceController;
```

- [ ] **Step 5: Pause before explicit user DIRECT edits**

In the existing variable-button handler and Ownership demo handler, call `sequenceController?.pause()` before `scene.updateSceneState(...)`.

Do not pause for scene updates emitted by State Machine / timeline synchronization unless they originate from an explicit user control handled by those modules.

- [ ] **Step 6: Run browser acceptance**

Expected: playback advances; manual DIRECT choice pauses; Visual Response still updates; Reduced Motion test remains PASS.

- [ ] **Step 7: Commit**

```bash
git add visual-direction-os/sequence-director.js visual-direction-os/director-v2-app.js visual-direction-os/director-v2-browser.spec.js
git commit -m "feat: drive visual response from sequence playback"
```

---

### Task 5: Enrich deterministic diagnostics with categories and routes

**Files:**
- Modify: `visual-direction-os/diagnostic.js`
- Create: `visual-direction-os/diagnostic-routing.test.js`
- Create: `visual-direction-os/diagnostic-routing.js`
- Modify: `.github/workflows/director-v2-ci.yml`
- Modify: `visual-direction-os/director-v2-models.test.js`

**Interfaces:**
- Diagnostic finding shape becomes:

```js
{
  id,
  level,
  category,
  message,
  reason,
  suggestion,
  route,
  learnTarget,
  current,
  recommendedDirection
}
```

- `diagnostic-routing.js` produces pure `resolveRoute(route, doc)` plus DOM action `goToControl(route, options)`.

- [ ] **Step 1: Extend diagnostic model tests**

For incoherent fixture assert:

```js
const cameraFinding = incoherent.findings.find(f => f.id === 'camera-ownership');
assert.equal(cameraFinding.category, 'OWNERSHIP');
assert.deepStrictEqual(cameraFinding.route, {
  family:'camera',
  control:'perspective',
  suggestedDirection:'character'
});
assert.ok(cameraFinding.learnTarget);
```

For simultaneous-change assert category `HIERARCHY` and a useful route or `route:null` when no single control is authoritative.

- [ ] **Step 2: Add route resolver tests**

Create a minimal fake document contract or test the pure selector builder:

```js
assert.equal(
  routing.selectorForRoute({family:'camera', control:'perspective'}),
  '[data-variable-family="camera"][data-variable-key="perspective"]'
);
assert.equal(routing.selectorForRoute(null), null);
```

- [ ] **Step 3: Add categories and route metadata to current rules**

Use:

- `ownership-conflict` → `OWNERSHIP`, route to `color.territory` only when a single corrective control can be recommended; otherwise advisory only.
- `camera-ownership` → `OWNERSHIP`, route `camera.perspective`, recommended direction `character`.
- `narrative-cause` → `CAUSALITY`, no auto route when the cause itself is missing.
- `simultaneous-change` → `HIERARCHY`, route null in first version.
- `state-abstraction` → `CONTINUITY`, route `texture.noise` or `space.compression` according to the current mismatch evidence.

Add sequence-aware deterministic rules only when `diagnosticContext.sequenceBeat` exists:

- restrained variable peaking → `HIERARCHY`
- high visual pressure remaining in `release` → `RECOVERY`

- [ ] **Step 4: Run model tests**

Expected: old PASS/WARN/FAIL semantics remain intact; new metadata exists deterministically.

- [ ] **Step 5: Commit**

```bash
git add visual-direction-os/diagnostic.js visual-direction-os/diagnostic-routing.js visual-direction-os/diagnostic-routing.test.js visual-direction-os/director-v2-models.test.js .github/workflows/director-v2-ci.yml
git commit -m "feat: add diagnostic routing metadata"
```

---

### Task 6: Build GO TO CONTROL and recheck loop

**Files:**
- Modify: `visual-direction-os/diagnostic.js`
- Modify: `visual-direction-os/diagnostic-routing.js`
- Modify: `visual-direction-os/director-v2-app.js`
- Modify: `visual-direction-os/director-v2-tools.css`
- Modify: `visual-direction-os/director-v2-browser.spec.js`
- Modify: `visual-direction-os/director-v2.html`

**Interfaces:**
- `goToControl(route, { doc, setMode })` scrolls to `#direct-panel`, resolves the target control group, focuses the first relevant control, and applies `.is-route-target` temporarily.
- It returns `{ found:boolean, target?:Element }` and never calls `click()` or `VDOSScene.updateSceneState()`.

- [ ] **Step 1: Add browser test for an actionable camera mismatch**

Create/select a current Scene State with:

```js
{
  agency:'character',
  variables:{ camera:{ perspective:'world' } }
}
```

Then in Current scene diagnostic assert a camera WARN card contains `[data-fix-route]`.

- [ ] **Step 2: Test GO TO CONTROL navigation without mutation**

Capture the camera perspective before clicking route action, click `GO TO CONTROL`, then assert:

```js
window.VDOSScene.getSceneState().variables.camera.perspective === 'world'
```

and the Camera/Perspective control group is in viewport, focused/highlighted, with the Direct mode active.

- [ ] **Step 3: Render current and recommended direction**

Actionable cards display a compact block such as:

```text
CURRENT
Camera · WORLD

RECOMMENDED DIRECTION
Camera · MIXED → CHARACTER
```

Use text, not a numeric score.

- [ ] **Step 4: Add `UNDERSTAND MECHANISM` only for valid Knowledge Atlas targets**

Map existing IDs to `knowledge.html#...`; omit the action when `learnTarget` is missing.

- [ ] **Step 5: Verify recheck**

After routing to Camera/Perspective, manually choose Character. Assert the current diagnostic re-renders from shared Scene State and camera finding moves from WARN to PASS.

- [ ] **Step 6: Style route focus state**

`.is-route-target` uses the existing orange directional accent and a short outline/background emphasis. It must not use Diagnostic green/amber/red as navigation color.

- [ ] **Step 7: Run 390px / 1440px acceptance**

Verify route scrolling works under fixed desktop rail and mobile bottom navigation; no horizontal overflow.

- [ ] **Step 8: Commit**

```bash
git add visual-direction-os/diagnostic.js visual-direction-os/diagnostic-routing.js visual-direction-os/director-v2-app.js visual-direction-os/director-v2-tools.css visual-direction-os/director-v2-browser.spec.js visual-direction-os/director-v2.html
git commit -m "feat: route diagnostics back to director controls"
```

---

### Task 7: Complete integration, release gates, and fixed preview

**Files:**
- Modify only as required by failing regression gates: `visual-direction-os/director-v2-browser.spec.js`, `.github/workflows/director-v2-ci.yml`, `visual-direction-os/build-pages-site.js`, `visual-direction-os/site-publish.test.js`
- Verify: no changes under `visual-direction-system/`

**Interfaces:**
- Final runtime globals: `VDOSSequenceDirectorModel`, `VDOSSequenceScore`, `VDOSSequenceDirector`, `VDOSDiagnostic`, `VDOSDiagnosticRouting`, `VDOSScene`, `VDOSVisualResponse`.

- [ ] **Step 1: Ensure CI syntax checks include new modules**

Add:

```bash
node --check visual-direction-os/sequence-director-model.js
node --check visual-direction-os/sequence-director.js
node --check visual-direction-os/diagnostic-routing.js
```

- [ ] **Step 2: Ensure Pages assembly copies the new assets**

If the build script uses an explicit list, add:

```text
sequence-director-model.js
sequence-director.js
diagnostic-routing.js
```

and assert them in `site-publish.test.js`.

- [ ] **Step 3: Run the complete model and browser suite**

Run the equivalent CI commands:

```bash
node visual-direction-os/director-v2-models.test.js
node visual-direction-os/sequence-director-model.test.js
node visual-direction-os/diagnostic-routing.test.js
node visual-direction-os/visual-response.test.js
node visual-direction-os/visual-qa.test.js
node visual-direction-os/site-publish.test.js
npx playwright test visual-direction-os/director-v2-browser.spec.js visual-direction-os/director-v2-desktop-polish.spec.js --reporter=line --workers=1
```

Expected: all existing and new tests PASS.

- [ ] **Step 4: Verify source-scope safety**

Compare the feature branch against `master` and confirm this phase adds no files under:

```text
visual-direction-system/
```

- [ ] **Step 5: Verify Draft PR remains open and unmerged**

Confirm PR #1 is still Draft before sharing preview.

- [ ] **Step 6: Commit any final gate-only adjustments**

```bash
git add .github/workflows/director-v2-ci.yml visual-direction-os/
git commit -m "test: lock sequence director decision loop"
```

Skip this commit if no final adjustment was necessary.

- [ ] **Step 7: Share a fixed-commit raw.githack preview**

Use:

```text
https://raw.githack.com/Caesar-ZZh/visual-direction-os/<FINAL_SHA>/visual-direction-os/director-v2.html
```

so the user reviews one immutable, CI-verified build.
