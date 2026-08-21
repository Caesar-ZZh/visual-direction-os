# Director Workspace v2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing zero-build Visual Direction OS into a Director Workspace with explicit LEARN / DIRECT / DIAGNOSE modes, synchronized scene state, interactive visual direction tools, and deterministic diagnostics without changing the knowledge source semantics.

**Architecture:** Keep `visual-direction-os/index.html` as the semantic shell and retain Vanilla HTML/CSS/JS. Extract new interactive responsibilities into focused modules that communicate through one shared scene-state object; existing knowledge views remain available and are reorganized under the three modes. Extend the existing QA gate rather than replacing it.

**Tech Stack:** HTML5, CSS custom properties, Vanilla JavaScript ES modules/classic scripts as compatible with the existing site, SVG/Canvas where useful, native browser APIs, GitHub Pages; no build framework.

## Global Constraints

- `visual-direction-system/` remains read-only and is the semantic source of truth.
- Keep zero-build deployment and Vanilla HTML/CSS/JS.
- No React, Vue, Next.js, or unnecessary animation dependency.
- Required widths: 390, 768, 1024, 1440 with no horizontal page overflow.
- Primary mobile modes Learn / Direct / Diagnose must remain visible.
- Touch targets are at least 44px.
- Use PASS / WARN / FAIL for diagnostics; never fabricate aggregate scores.
- `transition: all` is disallowed.
- At most one WebGL context; prefer DOM/SVG/Canvas.
- `prefers-reduced-motion` must preserve equivalent information.
- Color cannot be the sole state signal.
- Every interaction must reveal information, state, ownership, or hierarchy.
- Anti-references: generic AI dashboard, purple-blue gradient, glassmorphism SaaS, cyberpunk HUD, random film grain, CRT simulation, excessive glow, rounded-card wall, meaningless particles, Auteur clone.

---

## File responsibility map

- `visual-direction-os/index.html` — semantic shell, route containers, accessible static fallbacks.
- `visual-direction-os/styles.css` — tokens, shell, responsive navigation, shared visual grammar.
- `visual-direction-os/app.js` — route/mode orchestration and compatibility with existing knowledge views.
- `visual-direction-os/scene-state.js` — canonical shared scene state and subscription API.
- `visual-direction-os/director-workspace.js` — variable-family controls and state rendering.
- `visual-direction-os/state-machine.js` — character mechanism timeline and playhead mapping.
- `visual-direction-os/sequence-score.js` — multi-track timeline and ownership markers.
- `visual-direction-os/color-ownership.js` — Character / World / Narrative territory views.
- `visual-direction-os/diagnostic.js` — deterministic diagnostic rules.
- `visual-direction-os/visual-qa.js` — release/static QA extensions.
- `visual-direction-os/qa-check.js` — preserve existing checks; invoke/bridge new QA checks where appropriate.

### Task 1: Mode shell and shared scene state

**Files:** Create `visual-direction-os/scene-state.js`; modify `visual-direction-os/index.html`, `visual-direction-os/app.js`, `visual-direction-os/styles.css`.

**Interfaces:** Produces `createSceneState(initial)`, `getSceneState()`, `updateSceneState(patch, source)`, `subscribeSceneState(listener)`; all later DIRECT/DIAGNOSE tools consume this API.

- [ ] Add semantic LEARN / DIRECT / DIAGNOSE mode landmarks and preserve every existing knowledge destination.
- [ ] Add a desktop grouped vertical navigation and a mobile persistent three-mode switch with accessible labels and 44px targets.
- [ ] Implement canonical default scene state containing `narrativeState`, `activeCase`, `playhead`, `variables`, `agency`, and `ownership`.
- [ ] Implement immutable top-level state updates and subscriptions; emit the new state plus update source to listeners.
- [ ] Wire mode routing so existing knowledge views continue to open under LEARN and new DIRECT/DIAGNOSE containers can be addressed without page reload.
- [ ] Verify keyboard navigation, deep-link/hash compatibility, and no lost existing destinations.
- [ ] Commit: `feat: add director workspace mode shell and scene state`.

### Task 2: Design tokens and Director Control Room homepage

**Files:** Modify `visual-direction-os/index.html`, `visual-direction-os/styles.css`, `visual-direction-os/app.js`.

**Interfaces:** Consumes shared scene state; produces homepage ownership-shift control that calls `updateSceneState()`.

- [ ] Define/normalize core tokens: background `#090A0C`, surface `#111318`, raised `#171A20`, text `#F1EFEA`, muted `#8C8C8A`, accent `#E85D2A`, plus semantic PASS/WARN/FAIL tokens that remain distinguishable by text/icon.
- [ ] Build first-screen system chain `NARRATIVE → VARIABLE → STATE → SEQUENCE → AGENCY` with accessible explanatory copy.
- [ ] Build WORLD → CHARACTER ownership-shift demonstration using DOM/SVG; interpolation may alter temperature, focus, line stability, spatial compression, texture density, and camera distance.
- [ ] Ensure the same current ownership is always printed as text, e.g. `OWNERSHIP SHIFT — WORLD → CHARACTER`.
- [ ] Add reduced-motion behavior that switches state discretely rather than interpolating.
- [ ] Verify the homepage communicates the product model with JavaScript disabled through static fallback copy.
- [ ] Commit: `feat: build director control room homepage`.

### Task 3: Director Workspace

**Files:** Create `visual-direction-os/director-workspace.js`; modify `index.html`, `styles.css`, `app.js`.

**Interfaces:** Consumes/updates `scene-state.js`. Produces `initDirectorWorkspace(root)` and `renderDirectorWorkspace(state)`.

- [ ] Build a scene selector/prompt area with at least one canonical example scene and safe readable default.
- [ ] Build six collapsible variable families: Color, Space, Camera, Line, Texture, Rhythm.
- [ ] Represent variables with named/qualitative states unless a source-backed numeric scale exists.
- [ ] Make every control keyboard operable and expose current value through visible text and accessible names.
- [ ] Update canonical scene state first on control changes; render UI only from subscribed state.
- [ ] Add a current-state summary showing narrative state, agency, and ownership without fake precision.
- [ ] At mobile width, collapse variable families into accessible disclosure sections.
- [ ] Commit: `feat: add interactive director workspace`.

### Task 4: Character Visual State Machine

**Files:** Create `visual-direction-os/state-machine.js`; modify `index.html`, `styles.css`, `app.js`.

**Interfaces:** Produces `initStateMachine(root)` and `setCharacterCase(caseId)`; consumes scene state and writes playhead/variables/ownership.

- [ ] Encode mechanism-focused case data for Miles, Gwen, Hobie, and Elian without instructing direct style imitation.
- [ ] Give each case named narrative states and qualitative mappings for relevant visual variables.
- [ ] Build a timeline/playhead operable by pointer and keyboard arrows.
- [ ] On playhead/state changes, update all linked variables synchronously through shared scene state.
- [ ] Show a textual `CURRENT VISUAL STATE` panel with ownership, camera, line, abstraction, pressure/energy as qualitative values.
- [ ] Add explicit copy: `Mechanism, not style imitation.`
- [ ] Verify reduced-motion mode uses discrete state changes.
- [ ] Commit: `feat: upgrade character state machine timeline`.

### Task 5: Sequence Score synchronization

**Files:** Create `visual-direction-os/sequence-score.js`; modify `index.html`, `styles.css`, `app.js`.

**Interfaces:** Produces `initSequenceScore(root)` and `renderSequenceScore(state)`; consumes/writes shared `playhead` and ownership.

- [ ] Build tracks for Color, Space, Camera, Line, Texture, Agency.
- [ ] Use SVG/DOM paths/bands to show qualitative change over normalized time.
- [ ] Add a shared draggable/keyboard playhead.
- [ ] Add explicit keyboard-reachable Ownership Shift markers.
- [ ] Synchronize the right-side current-state panel with the same scene state used by the Character State Machine.
- [ ] Add textual equivalents for the current value of every track at the playhead.
- [ ] At 390px, allow the track surface to scroll horizontally while keeping the playhead position/state understandable.
- [ ] Commit: `feat: synchronize sequence score with scene state`.

### Task 6: Color Ownership Map

**Files:** Create `visual-direction-os/color-ownership.js`; modify `index.html`, `styles.css`, `app.js`.

**Interfaces:** Produces `initColorOwnership(root)` and `renderColorOwnership(state)`; consumes `ownership` and color variables.

- [ ] Build Character / World / Narrative ownership territories.
- [ ] Add Base Palette, Emotion Palette, Ownership Palette, Conflict Palette views.
- [ ] Use proportional visual territory only as a relative representation and pair it with named ownership labels.
- [ ] Show conflict state when multiple owners compete without narrative justification.
- [ ] Ensure patterns/labels/icons supplement color so color is never the only signal.
- [ ] Commit: `feat: add color ownership map`.

### Task 7: Deterministic Visual System Diagnostic

**Files:** Create `visual-direction-os/diagnostic.js`; modify `index.html`, `styles.css`, `app.js`.

**Interfaces:** Produces `runDiagnostic(sceneState) -> {status, findings[]}` where each finding has `id`, `level`, `message`, `reason`, `suggestion`.

- [ ] Implement deterministic rules for unexplained variable change, unexpected camera ownership switch, abstraction/state mismatch, excessive simultaneous primary changes, and ownership conflict.
- [ ] Report individual PASS/WARN/FAIL findings; do not compute a fake numeric score.
- [ ] Make the governing question prominent: `Why did this visual behavior change?`
- [ ] Add one coherent fixture and one deliberately incoherent fixture so results are reproducible.
- [ ] Render reason and corrective suggestion for every WARN/FAIL.
- [ ] Ensure diagnostic consumes the exact same shared state as DIRECT.
- [ ] Commit: `feat: add deterministic visual diagnostics`.

### Task 8: Anti-slop and release QA extension

**Files:** Create `visual-direction-os/visual-qa.js`; modify `visual-direction-os/qa-check.js`, `styles.css`, `index.html` as needed.

**Interfaces:** `runVisualQA(document)` returns named PASS/WARN/FAIL checks; existing QA remains callable.

- [ ] Add checks for duplicate IDs and broken internal targets.
- [ ] Add checks for missing accessible names on controls and icon-only buttons.
- [ ] Add source/style checks for `transition: all`, missing `:focus-visible`, and missing `prefers-reduced-motion` branch.
- [ ] Add check for nested interactive elements.
- [ ] Preserve and run the existing 50-check QA suite.
- [ ] Render or log failures with exact rule IDs so fixes are actionable.
- [ ] Commit: `test: extend visual direction release qa`.

### Task 9: Responsive and accessibility hardening

**Files:** Modify all frontend files touched above.

**Interfaces:** No new public API; hardens all previous tasks.

- [ ] Verify 390px: persistent mode navigation, 44px targets, collapsible workspace, usable horizontal timeline, no hidden key capability.
- [ ] Verify 768px, 1024px, 1440px for no horizontal page overflow or clipped labels.
- [ ] Complete keyboard-only route: homepage → DIRECT → state machine → sequence → DIAGNOSE.
- [ ] Verify visible `:focus-visible` on every interactive control.
- [ ] Verify diagrams expose current semantic state as text.
- [ ] Verify reduced-motion mode preserves every state transition as discrete information.
- [ ] Verify sufficient contrast and that PASS/WARN/FAIL are not color-only.
- [ ] Commit: `fix: harden director workspace accessibility and responsive behavior`.

### Task 10: Integration, regression, and delivery

**Files:** Modify `CONTEXT.md`, `README.md`, and frontend files only for verified integration fixes.

**Interfaces:** Final integrated branch ready for PR; no master mutation.

- [ ] Run existing QA plus new Visual QA and resolve all FAIL results.
- [ ] Exercise canonical scenario: change character state → linked variables update → Sequence Score matches → Ownership Shift updates → Diagnostic reflects the same state.
- [ ] Exercise coherent and incoherent diagnostic fixtures and verify deterministic findings.
- [ ] Exercise JavaScript-disabled fallback and reduced-motion path.
- [ ] Verify console has zero errors in representative flows.
- [ ] Verify all existing LEARN destinations remain accessible and knowledge-source files are unchanged.
- [ ] Update `CONTEXT.md` to describe v2.1 branch status and update `README.md` only with user-facing architecture/use changes.
- [ ] Compare branch against `master` and confirm no changes under `visual-direction-system/`.
- [ ] Commit: `docs: finalize director workspace v2.1 delivery`.
- [ ] Open a draft PR from `agent/director-workspace-v2-1` to `master` with QA results and known limitations; do not merge until reviewed.

## Plan self-review

- Spec coverage: LEARN/DIRECT/DIAGNOSE, homepage, workspace, state machine, sequence, color ownership, diagnostic, anti-slop, mobile, accessibility, performance constraints, QA, and delivery are mapped to explicit tasks.
- Scope: large but sequential; every task leaves a reviewable static-site state and shares one canonical scene-state interface.
- Dependency consistency: Tasks 2–7 consume the state API created in Task 1; diagnostic and visualization tools do not maintain competing state models.
- Source protection: no task modifies `visual-direction-system/`.
- No framework/build dependency is introduced.
- No placeholders remain in this plan.