# Scene State Visual Response Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Director Workspace v2.1 visibly respond to canonical `VDOSScene` state through a restrained, testable Visual Response Layer without changing knowledge-source semantics or production `master`.

**Architecture:** Add one focused `visual-response.js` module that derives qualitative presentation state from `VDOSScene` and applies root-level data attributes/CSS variables. Existing controls, State Machine, Sequence Score, Color Ownership, and Diagnose remain semantic producers/consumers of the same canonical scene state; none of them writes visual-response styles directly. CSS handles bounded atmosphere/focus/pressure/line/texture/motion effects, while a compact live readout explains the current response in text.

**Tech Stack:** Vanilla JavaScript, CSS custom properties/data attributes, existing HTML/CSS shell, Node behavior tests, Playwright browser acceptance, GitHub Actions; no new dependencies in production.

## Global Constraints

- Work only on `agent/director-workspace-v2-1`; do not merge or mutate `master` in this increment.
- Do not modify files under `visual-direction-system/`.
- `VDOSScene` remains the single source of truth.
- Explicit user-selected scene variables must never be overwritten by ownership presets or presentation logic.
- No WebGL, no Canvas animation loop, no new external library, no image asset requirement.
- The orange product accent remains stable; scene state changes atmosphere, not brand identity.
- Color is never the sole state signal; visible textual feedback must explain derived response.
- Focus rings, PASS/WARN/FAIL styling, text contrast, and semantic borders remain stable.
- `prefers-reduced-motion: reduce` disables all non-essential drift/interpolation.
- No horizontal page overflow at 390, 768, 1024, or 1440px.
- Do not introduce `transition: all`.
- Avoid continuous JavaScript animation; state changes update root tokens and CSS handles bounded transitions.

---

## File responsibility map

- `visual-direction-os/visual-response.js` — pure scene→response derivation plus DOM adapter/subscription.
- `visual-direction-os/visual-response.test.js` — Node tests for deterministic derivation and explicit-variable precedence.
- `visual-direction-os/director-v2.html` — adds decorative response layers, live response readout, and script inclusion.
- `visual-direction-os/director-v2.css` — page-level atmosphere/focus/pressure/line/texture response tokens and reduced-motion overrides.
- `visual-direction-os/director-v2-app.js` — initializes the Visual Response Layer once; does not own response derivation.
- `visual-direction-os/director-v2-browser.spec.js` — integration acceptance at mobile/desktop plus regression checks.
- `.github/workflows/director-v2-ci.yml` — runs the new pure behavior test and syntax check.

### Task 1: Pure Visual Response derivation

**Files:** Create `visual-direction-os/visual-response.js`; create `visual-direction-os/visual-response.test.js`.

**Interfaces:**
- Consumes: `sceneState` shaped like `VDOSScene.getSceneState()`.
- Produces: `deriveVisualResponse(sceneState) -> response` where response includes `temperature`, `agency`, `pressure`, `focus`, `focusDistance`, `line`, `texture`, `motion`, `territory`, `css`.

- [ ] **Step 1: Write failing behavior tests** covering baseline WORLD, warm CHARACTER territory + high compression, CONTESTED/mixed/high-tension, and explicit-variable precedence.
- [ ] **Step 2: Run** `node visual-direction-os/visual-response.test.js` and confirm failure because `visual-response.js` does not exist.
- [ ] **Step 3: Implement minimal pure derivation** with bounded mappings only. Pressure must derive from compression/openness; focus from camera perspective/distance; line from stability/density; texture from noise/granularity; motion from motionEnergy/cutDensity. Ownership/agency may influence defaults for presentation but must not mutate the input state or replace explicit scene values.
- [ ] **Step 4: Re-run** `node visual-direction-os/visual-response.test.js` and require PASS.
- [ ] **Step 5: Commit** `feat: add deterministic visual response model`.

### Task 2: DOM adapter and root response contract

**Files:** Modify `visual-direction-os/visual-response.js`; modify `visual-direction-os/director-v2-app.js`.

**Interfaces:**
- `applyVisualResponse(root, response)` writes `data-vr-temperature`, `data-vr-agency`, `data-vr-pressure`, `data-vr-focus`, `data-vr-line`, `data-vr-texture`, `data-vr-motion`, plus bounded CSS variables.
- `initVisualResponse(root, sceneApi = window.VDOSScene)` subscribes exactly once and returns an unsubscribe function.

- [ ] **Step 1: Extend tests** with a lightweight fake root that verifies exact attributes/CSS property writes and verifies input scene state is unchanged.
- [ ] **Step 2: Run test** and confirm adapter expectations fail.
- [ ] **Step 3: Implement `applyVisualResponse()` and `initVisualResponse()`** with no timers/animation loop.
- [ ] **Step 4: Initialize the response layer once from `director-v2-app.js`** after `VDOSScene` exists, without duplicating any semantic state logic.
- [ ] **Step 5: Re-run Node tests and `node --check`** for both JS files.
- [ ] **Step 6: Commit** `feat: connect visual response to canonical scene state`.

### Task 3: Live Visual Response readout

**Files:** Modify `visual-direction-os/director-v2.html`; modify `visual-direction-os/visual-response.js`; modify `visual-direction-os/director-v2.css`.

**Interfaces:** `applyVisualResponse()` updates text targets `#vr-atmosphere`, `#vr-pressure`, `#vr-focus`, `#vr-motion`.

- [ ] **Step 1: Add browser acceptance assertions** that DIRECT contains a visible `LIVE VISUAL RESPONSE` block and that changing Temperature/Camera updates its text.
- [ ] **Step 2: Run browser acceptance** and confirm failure before markup/adapter changes.
- [ ] **Step 3: Add compact readout markup** adjacent to the existing state summary; it is explanatory only, not interactive.
- [ ] **Step 4: Update adapter** to render qualitative text such as `ATMOSPHERE · WARM / CHARACTER-LED`, `PRESSURE · HIGH`, `FOCUS · CHARACTER / NEAR`, `MOTION · LOW`.
- [ ] **Step 5: Style readout** with stable contrast, compact editorial/production-console treatment, and no card-wall feel.
- [ ] **Step 6: Re-run Node + browser tests**.
- [ ] **Step 7: Commit** `feat: explain live visual response state`.

### Task 4: Atmosphere and focus response layer

**Files:** Modify `visual-direction-os/director-v2.html`; modify `visual-direction-os/director-v2.css`.

**Interfaces:** CSS consumes `data-vr-temperature`, `data-vr-agency`, `data-vr-focus`, and `--vr-atmosphere-a/b`, `--vr-focus-x/y/scale`, `--vr-motion-duration`.

- [ ] **Step 1: Add browser tests** at 390 and 1440px that Temperature changes `data-vr-temperature`, Camera Perspective changes `data-vr-focus`, and root computed custom properties change between representative states.
- [ ] **Step 2: Run browser test** and confirm failure on missing presentation response.
- [ ] **Step 3: Add one non-interactive page response layer** behind content using CSS pseudo/layer elements, hidden from assistive tech and `pointer-events:none`.
- [ ] **Step 4: Implement cool/neutral/warm atmosphere mappings** while keeping `--accent` unchanged.
- [ ] **Step 5: Implement WORLD/MIXED/CHARACTER focus positioning and bounded distance scaling** without scaling text/content.
- [ ] **Step 6: Implement CONTESTED as dual low-opacity competing fields**, not increased saturation.
- [ ] **Step 7: Re-run browser tests** and verify no horizontal overflow.
- [ ] **Step 8: Commit** `feat: make atmosphere and focus respond to scene state`.

### Task 5: Spatial pressure, line, and texture behavior

**Files:** Modify `visual-direction-os/director-v2.css`; modify `visual-direction-os/director-v2-browser.spec.js`.

**Interfaces:** CSS consumes `data-vr-pressure`, `data-vr-line`, `data-vr-texture`, `--vr-pressure`, `--vr-line-opacity`, `--vr-texture-opacity`, `--vr-texture-size`.

- [ ] **Step 1: Add tests** that High Compression yields `data-vr-pressure="high"`, changes a bounded pressure token, and still produces zero page overflow at all four canonical widths.
- [ ] **Step 2: Add tests** that Line/Texture controls change their root response attributes without changing semantic border/focus/diagnostic colors.
- [ ] **Step 3: Run browser tests** and confirm failures before CSS behavior is implemented.
- [ ] **Step 4: Implement spatial pressure** by changing selected section gaps/ambient edge pressure only; never shrink readable type or text column below current responsive constraints.
- [ ] **Step 5: Implement decorative line traces** whose opacity/regularity respond to line state; semantic lines stay untouched.
- [ ] **Step 6: Implement CSS-only texture overlay** using gradients/pattern scale+opacity; no raster grain, scratches, CRT, or fake film treatment.
- [ ] **Step 7: Re-run full browser suite** at 390/768/1024/1440.
- [ ] **Step 8: Commit** `feat: add pressure line and texture response`.

### Task 6: Rhythm and reduced-motion hardening

**Files:** Modify `visual-direction-os/director-v2.css`; modify `visual-direction-os/director-v2-browser.spec.js`.

**Interfaces:** CSS consumes `data-vr-motion` and `--vr-motion-duration`; reduced-motion overrides all non-essential response transitions/drift.

- [ ] **Step 1: Add tests** for LOW/MEDIUM/HIGH motion duration token ordering and reduced-motion computed styles.
- [ ] **Step 2: Run test** and confirm failure before motion mapping/override is complete.
- [ ] **Step 3: Apply motion duration only to non-essential response layers**; navigation, focus, scrolling correctness, diagnostics, and controls are excluded.
- [ ] **Step 4: Add/strengthen `prefers-reduced-motion: reduce`** so atmosphere/focus/line/texture interpolation and drift are disabled while the final state remains visible.
- [ ] **Step 5: Re-run browser acceptance including existing reduced-motion test**.
- [ ] **Step 6: Commit** `fix: harden visual response motion behavior`.

### Task 7: Cross-tool integration and regression

**Files:** Modify `visual-direction-os/director-v2-browser.spec.js`; modify `.github/workflows/director-v2-ci.yml`.

**Interfaces:** No new product API. Validates one-way flow `Controls/State Machine/Sequence → VDOSScene → Visual Response Layer`.

- [ ] **Step 1: Add integration test**: choose a Character case/state, verify shared Scene/Sequence state still syncs, then assert visual-response attributes/readout reflect the same scene.
- [ ] **Step 2: Add integration test**: explicitly set Temperature `cool`, then switch ownership/agency to Character and verify Temperature remains `cool` while agency/focus response changes.
- [ ] **Step 3: Add integration test** that Diagnose still reports from canonical scene state after visual response changes.
- [ ] **Step 4: Add `visual-response.test.js` and `node --check visual-response.js` to Director CI**.
- [ ] **Step 5: Run complete CI**: model tests, visual-response tests, Visual QA, JS syntax, staging contracts, Pages assembly, browser acceptance.
- [ ] **Step 6: Resolve every FAIL without weakening acceptance semantics**.
- [ ] **Step 7: Commit** `test: integrate scene visual response into director ci`.

### Task 8: Delivery verification and preview pin

**Files:** Modify documentation only if needed; product files only for verified regressions.

**Interfaces:** Produces a verified commit SHA suitable for a fixed raw.githack preview URL; no merge.

- [ ] **Step 1: Verify branch diff contains no changes under `visual-direction-system/` and no direct `master` mutation.**
- [ ] **Step 2: Verify current HEAD CI is completed/success, not an older run.**
- [ ] **Step 3: Check Draft PR #1 remains draft/open/unmerged.**
- [ ] **Step 4: Provide a commit-pinned preview URL so mobile/desktop review cannot mix cached branch assets.**
- [ ] **Step 5: Stop feature expansion after the verified response layer; collect desktop review feedback as the next issue batch.**

## Plan self-review

- Spec coverage: all six response channels, ownership composition, live textual feedback, architecture, accessibility/performance, pure/browser tests, explicit-variable precedence, and non-goals map to explicit tasks.
- Placeholder scan: no TBD/TODO/"similar to" shortcuts remain.
- Interface consistency: `deriveVisualResponse`, `applyVisualResponse`, and `initVisualResponse` names are stable across tasks; all presentation is downstream of `VDOSScene`.
- Scope: one subsystem only — scene state visual response. No Knowledge Atlas redesign, new diagnostics, AI imagery, or new editor is included.
