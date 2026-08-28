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

## Current verification note

Implementation work is complete on the development branch. Focused local execution has passed for Project Store metadata, Project persistence (including storage-write failure isolation), and Project Workspace rendering. Exact-head Chromium/Playwright acceptance is intentionally not marked complete: the current managed execution environment blocks both localhost and `file://` browser navigation, and PR #1 is currently not mergeable so a newly-added `pull_request` gate cannot produce a merge-ref run. The existing push CI and the new Sector 7 gate contain the required browser checks for the next runnable GitHub Actions environment.

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

- [x] Write a failing Node contract proving valid Project snapshots round-trip, corrupt/invalid payloads are ignored, and store subscription autosaves.
- [x] Wire the persistence contract into Director v2.1 CI before adding the implementation.
- [x] Implement the minimal persistence module using injected Storage and existing Project validation.
- [x] Load persistence before Project Store initialization, hydrate valid saved state, otherwise create the current demo/default Project.
- [x] Bind Project Store subscription after initialization so Project mutations and Scene snapshots persist.
- [x] Add syntax/staging/Pages checks for the new module.
- [x] Ensure autosave storage failures are observable but cannot destabilize Project Store mutations.

### Task 2: Project metadata editing

**Files:**
- Modify: `visual-direction-os/project-state.test.js`
- Modify: `visual-direction-os/project-state.js`
- Modify: `visual-direction-os/project-workspace.test.js`
- Modify: `visual-direction-os/project-workspace.js`
- Modify: `visual-direction-os/project-workspace.css`

**Interfaces:**
- Produces: `projectStore.updateProjectMetadata({ title, projectIntent, sourceNarrative? })`

- [x] Write tests for renaming the Project and editing Director Intent without changing Scene state.
- [x] Implement the minimal Project Store metadata mutation with existing validation/notify semantics.
- [x] Add compact editable Project title and intent controls to Project Workspace; preserve existing editorial/workstation visual grammar.
- [x] Persist Breakdown Story and Director Intent into Project Store before the AI structure request.
- [x] Verify Project metadata mutation leaves Scene records and workspace snapshots unchanged.

### Task 3: Browser regression and MVP gate

**Files:**
- Modify: `visual-direction-os/project-workspace.spec.js`
- Add: `.github/workflows/sector-7-mvp-gate.yml`

**Interfaces:**
- Consumes the persistence and metadata interfaces from Tasks 1–2.

- [x] Add browser coverage: edit Project title, open/direct a Scene, reload, and verify Project/Scene state survives.
- [x] Add coverage that undirected Project Arc cells remain `—` after reload.
- [x] Add structural coverage proving an undirected Scene remains `workspace.sceneState === null` rather than relying on incidental camera differences.
- [x] Preserve the existing Scene-switch isolation coverage for independently restored Scene snapshots.
- [x] Add a narrow exact-head Sector 7 PR gate for Project Node/syntax/Chromium verification.
- [ ] Observe a complete exact-head Chromium/Playwright gate in a runnable environment before merge/readiness is claimed.
