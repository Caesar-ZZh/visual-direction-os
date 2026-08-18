# Sector 7 MVP Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining Sector 7 MVP gaps without expanding scope: local Project persistence, Project metadata editing, and regression coverage across Project runtime and browser bootstrap.

**Architecture:** Keep the existing zero-build Vanilla HTML/CSS/JS architecture. Add one focused persistence module between Project Store and `localStorage`; hydrate before creating the default Project and autosave only validated Project snapshots. Keep Project metadata edits inside Project Store; do not add accounts, cloud sync, version history, generated imagery, or automatic continuity fixes.

**Tech Stack:** Vanilla JavaScript, CommonJS-compatible browser modules, Node `assert` behavior tests, Playwright browser acceptance, GitHub Actions.

**Spec:** `visual-direction-os/DESIGN-V2.md` plus the locked Sector 7 MVP boundaries agreed in the product design session.

## Global Constraints

- Work only on `agent/director-workspace-v2-1`; do not modify `master`.
- Project hierarchy remains `Project → Scene` only.
- Project Context may inform Narrative Interpret but must not mutate canonical Scene visual state.
- Persistence is local-only for v2.1.
- Project Arc must preserve `—` for undirected visual fields.
- Continuity remains deterministic PASS/WARN/FAIL guidance with no automatic repair.
- Keep Vanilla HTML/CSS/JS and zero-build delivery.

---

### Task 1: Local Project persistence

**Files:**
- Create: `visual-direction-os/project-persistence.test.js`
- Create: `visual-direction-os/project-persistence.js`
- Modify: `visual-direction-os/project-bootstrap.js`
- Modify: `.github/workflows/director-v2-ci.yml`

**Interfaces:**
- Produces: `createProjectPersistence({ storage, key, validateProjectState })`
- Produces methods: `load()`, `save(project)`, `clear()`, `bind(projectStore)`

- [ ] Write a failing Node test proving valid Project snapshots round-trip, corrupt/invalid payloads are ignored, and store subscription autosaves.
- [ ] Add the test to Director v2.1 CI and confirm RED while `project-persistence.js` is absent.
- [ ] Implement the minimal persistence module using injected Storage and existing Project validation.
- [ ] Load persistence before Project Store initialization, hydrate valid saved state, otherwise create the current demo/default Project.
- [ ] Bind Project Store subscription after initialization so Project mutations and Scene snapshots persist.
- [ ] Add syntax/staging/Pages checks for the new module and verify GREEN.

### Task 2: Project metadata editing

**Files:**
- Modify: `visual-direction-os/project-state.test.js`
- Modify: `visual-direction-os/project-state.js`
- Modify: `visual-direction-os/project-workspace.test.js`
- Modify: `visual-direction-os/project-workspace.js`
- Modify: `visual-direction-os/project-workspace.css`

**Interfaces:**
- Produces: `projectStore.updateProjectMetadata({ title, projectIntent, sourceNarrative? })`

- [ ] Write failing tests for renaming the Project and editing Director Intent without changing Scene state.
- [ ] Implement the minimal Project Store metadata mutation with existing validation/notify semantics.
- [ ] Add compact editable Project title and intent controls to Project Workspace; preserve existing editorial/workstation visual grammar.
- [ ] Verify edits persist through Task 1 autosave and never touch Scene workspace snapshots.

### Task 3: Browser regression and MVP gate

**Files:**
- Modify: `visual-direction-os/project-workspace.spec.js`
- Modify: `visual-direction-os/project-bootstrap.test.js`
- Modify: `.github/workflows/director-v2-ci.yml` only if coverage wiring is required

**Interfaces:**
- Consumes the persistence and metadata interfaces from Tasks 1–2.

- [ ] Add browser coverage: edit Project title, open/direct a Scene, reload, and verify Project/Scene state survives.
- [ ] Add coverage that undirected Project Arc cells remain `—` after reload.
- [ ] Add coverage that switching Scenes restores each Scene independently without cross-scene pollution.
- [ ] Run the complete Director Workspace v2.1 CI gate and stop feature work when all checks pass.
