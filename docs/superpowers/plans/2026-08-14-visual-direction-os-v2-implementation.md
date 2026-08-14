# Visual Direction OS v2.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Build a polished, responsive, interactive static knowledge interface that turns the existing Visual Direction System into a director-facing operating system without changing the root homepage or the Markdown source library.

**Architecture:** Add a self-contained `visual-direction-os/` static application made of semantic HTML, one stylesheet, and one vanilla JavaScript controller. The HTML hand-maps the core mechanisms from the 12 Markdown source files, while every section links back to its canonical source. Inline SVG, CSS grids, and data attributes provide the visualizations and interactions without a build step or remote JavaScript dependency.

**Tech Stack:** HTML5, CSS3 custom properties and container-aware responsive layouts, vanilla JavaScript, inline SVG, Playwright/browser inspection for QA.

---

### Task 1: Establish the implementation contract

**Files:**
- Create: `docs/superpowers/plans/2026-08-14-visual-direction-os-v2-implementation.md`
- Create: `CONTEXT.md`

**Step 1: Record repository constraints**

Document that `index.html` and all files under `visual-direction-system/` are protected inputs, the output lives only under `visual-direction-os/`, and the application must run from a static server or GitHub Pages without compilation.

**Step 2: Record the source-to-interface map**

Map Overview to `01-master-framework.md`; Character to `02-character-system.md`; World to `03-world-system.md`; Sequence and Color to `04-sequence-color.md`; Production to `05-production-system.md` and `06-project-worksheets.md`; Case Study to `07-original-case-study.md`; and the utility views to files `08` through `11`.

**Step 3: Record the verification baseline**

Run: `git status --short && git diff --stat`

Expected: only the new plan and context files appear before frontend implementation.

### Task 2: Build the semantic application shell and knowledge architecture

**Files:**
- Create: `visual-direction-os/index.html`
- Create: `visual-direction-os/styles.css`
- Create: `visual-direction-os/app.js`

**Step 1: Create the application shell**

Build a skip link, persistent desktop System Map, collapsible mobile navigation, theme control, chapter progress indicator, main content region, and source links. Use buttons for view changes and native links for source navigation.

**Step 2: Add all required views**

Create navigable sections for Overview, Character, World, Sequence, Color, Production, Case Study, Glossary, Decision Tree, Master Workflow, and Visual QA. Keep universal mechanisms visually distinct from the Elian / Meridian case study.

**Step 3: Preserve editorial reading quality**

Use meaningful headings, short explanatory decks, marginal notes, pull quotes, numbered systems, and open layouts rather than a uniform dashboard card grid.

**Step 4: Add canonical source links**

Every view must include a relative link to the corresponding file in `../visual-direction-system/` so the Markdown library remains the single source of truth.

### Task 3: Implement the core visual language and diagrams

**Files:**
- Modify: `visual-direction-os/index.html`
- Modify: `visual-direction-os/styles.css`

**Step 1: Implement the Director Console frame**

Use a restrained ink-and-paper palette, a narrow control rail, editorial serif display type, compact technical labels, and a single signal-red ownership accent. Provide both light and dark themes with the same hierarchy.

**Step 2: Implement Sequence Score**

Create an accessible inline SVG with Space, Color, Camera, and Agency tracks across named beats. Mark the ownership shift explicitly and provide an adjacent text interpretation so color is not the only encoding.

**Step 3: Implement Character State Machine**

Create a six-state Baseline → Pressure → Crisis → Decision → Agency → Resolution system. Selecting a state updates the primary variable, camera relationship, readability strategy, trigger, and ownership display.

**Step 4: Implement World–Character Compatibility Matrix**

Create a keyboard-readable matrix for Harmonize, Amplify, Resist, Destabilize, and Rewrite. Selecting a cell exposes the corresponding collision rule and preserves labels outside color encoding.

**Step 5: Implement Color Ownership / Territory**

Create an interactive frame territory model showing System, Character, Relationship, and Residue ownership over several beats, with area changes, boundary behavior, migration labels, and a text legend.

**Step 6: Implement Master Workflow**

Render the 20-step process as four production phases with progress affordance and clear progression from Brief to Bible Update.

### Task 4: Implement navigation, theme, and progressive disclosure

**Files:**
- Modify: `visual-direction-os/app.js`

**Step 1: Implement hash-based view routing**

Sync navigation state, view visibility, document title, scroll reset, and browser history through hashes. Unknown hashes fall back to Overview.

**Step 2: Implement accessible mobile navigation**

Toggle `aria-expanded`, close after selection and Escape, restore focus, and avoid trapping keyboard users.

**Step 3: Implement theme behavior**

Respect saved preference first, then `prefers-color-scheme`; toggle light/dark without flashes or remote dependencies.

**Step 4: Implement visualization controls**

Use event delegation and `aria-pressed` or selected-state semantics for State Machine, compatibility matrix, color territory, workflow phases, glossary filters, decision tree, and QA checklist progress.

**Step 5: Respect reduced motion**

Disable transitions, animated reveals, and smooth scrolling under `prefers-reduced-motion: reduce`.

### Task 5: Verify usability and responsive behavior

**Files:**
- Create: `visual-direction-os/qa-check.js`
- Modify if needed: `visual-direction-os/index.html`
- Modify if needed: `visual-direction-os/styles.css`
- Modify if needed: `visual-direction-os/app.js`

**Step 1: Add a dependency-free structural smoke check**

Verify required files, all 11 routes, protected-file integrity, source links, visualization labels, viewport metadata, reduced-motion CSS, and the absence of remote scripts.

Run: `node visual-direction-os/qa-check.js`

Expected: all structural checks pass and protected inputs remain unchanged.

**Step 2: Run browser interaction checks**

Serve the repository over localhost and test routing, theme switching, mobile navigation, state selection, matrix selection, territory selection, and workflow progression in a real browser.

Expected: every control changes the intended visible/accessible state with no console errors.

**Step 3: Run responsive checks**

Inspect 1440×1000, 1024×768, 768×1024, and 390×844 viewports.

Expected: no horizontal overflow; desktop rail becomes a compact tablet/mobile control; visualizations remain readable; body text and controls do not clip.

**Step 4: Run accessibility checks**

Navigate core controls using keyboard only and inspect landmarks, heading order, names, selected states, text alternatives, focus visibility, contrast, and reduced-motion behavior.

Expected: required views and visualizations remain understandable without pointer input, color, or animation.

### Task 6: Document completion and commit

**Files:**
- Modify: `CONTEXT.md`

**Step 1: Update project context**

Record the delivered directory, architecture decision, protected inputs, verification result, and final commit state in concise Chinese.

**Step 2: Review the final diff**

Run: `git diff --check && git status --short && git diff --stat`

Expected: no whitespace errors; only the plan, context, and `visual-direction-os/` application are changed.

**Step 3: Commit the completed implementation**

Run: `git add CONTEXT.md docs/superpowers/plans/2026-08-14-visual-direction-os-v2-implementation.md visual-direction-os && git commit -m "feat: implement Visual Direction OS v2"`

Expected: one implementation commit on `master` containing the plan, application, QA check, and context record.

**Step 4: Push the authorized branch**

Run: `git push origin master`

Expected: remote `master` advances to the verified implementation commit.
