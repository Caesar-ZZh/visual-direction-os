# Visual Direction OS Director Workspace v2.1 — Design Spec

## Goal

Upgrade the current Visual Direction OS from a high-quality interactive knowledge browser into a director workspace that supports three explicit user intents: learn the visual grammar, direct a scene through controllable visual variables, and diagnose whether a visual system is coherent.

The existing v2.0 remains the baseline. The upgrade is developed in isolation on `agent/director-workspace-v2-1`; `master` is not modified until the new experience is validated.

## Existing baseline

The repository already ships a zero-build Vanilla HTML/CSS/JS frontend in `visual-direction-os/`, a knowledge source in `visual-direction-system/`, 11 knowledge views, Sequence Score, State Machine, Color Territory, Workflow, Glossary, Decision Tree, and a 50-check QA script. The upgrade must preserve the semantic source material and the current zero-build deployment model.

## Product model

### LEARN
Purpose: understand the grammar.

Destinations: Framework, Character, World, Sequence, Color, Production, Case Studies, Glossary.

### DIRECT
Purpose: make visual decisions for a scene.

Decision chain: Narrative → Primary Variable → State → Sequence → Agency → Ownership → Visual Output.

Core tools: System Map, Director Workspace, Character Visual State Machine, Sequence Score, Color Ownership Map.

### DIAGNOSE
Purpose: identify incoherent visual behavior.

Checks: narrative alignment, ownership conflict, state transition logic, color logic, camera logic, world consistency, character agency, motion hierarchy, and anti-slop violations.

## Homepage / Director Control Room

The homepage explains the operating model within one screen. The principal visual demonstration is an ownership transfer, not a decorative hero. It begins with WORLD owning the frame and allows the user to move through a state where CHARACTER takes visual ownership.

The transition may alter background temperature, focal emphasis, line stability, spatial compression, texture density, and camera distance. A visible label announces the semantic transition, e.g. `OWNERSHIP SHIFT — WORLD → CHARACTER`.

A static semantic explanation must exist alongside or beneath the visualization so the concept remains understandable without animation.

## Navigation

### Desktop
Persistent vertical navigation, visually weighted into three groups:

- LEARN
- DIRECT
- DIAGNOSE

Current destination and current mode must both be obvious. Theme, language, and GitHub remain secondary utilities.

### Mobile
At 390px, use a persistent bottom-level mode switch for Learn / Direct / Diagnose. Do not remove primary navigation at small widths. Detailed destinations may be opened from the active mode.

## Director Workspace

The main DIRECT surface accepts/selects a scene and exposes six visual variable families:

1. Color — hue, temperature, saturation, contrast, territory.
2. Space — depth, compression, openness, negative space.
3. Camera — distance, stability, perspective, movement.
4. Line — stability, density, direction.
5. Texture — noise, granularity, materiality.
6. Rhythm — cut density, motion energy, repetition.

The control surface should resemble a restrained grading/timing/mixing workstation rather than a spreadsheet or SaaS dashboard. Controls show relative qualitative state (Low / Medium / High or named states) unless the knowledge source provides a defensible numeric scale.

## Character Visual State Machine

The state machine becomes a timeline with a draggable playhead. Selecting or moving through states updates all relevant visual variables synchronously.

Initial mechanism studies:

- Miles — identity collision, Brooklyn ownership, multiverse pressure, self-authorship.
- Gwen — emotion owns environment; palette temperature, negative space, background abstraction, edge softness.
- Hobie — system refusal; collage discontinuity, timing mismatch, print texture, graphic rupture.
- Elian — focus ownership shift.

These examples explain mechanisms and explicitly avoid encouraging direct replication of copyrighted film style.

## Sequence Score

The Sequence Score becomes a time-based track editor similar to a DAW / film score sheet.

Tracks:

- Color
- Space
- Camera
- Line
- Texture
- Agency

A shared playhead updates a side panel with the current visual state. Ownership Shift markers are explicit and keyboard reachable. The visualization must provide text alternatives for its current state.

## Color Ownership Map

The Color module becomes an ownership map across Character / World / Narrative. Proportional visuals may be used, but labels and qualitative ownership descriptions must remain primary so the system does not imply false measurement precision.

Required views:

- Base Palette
- Emotion Palette
- Ownership Palette
- Conflict Palette

## Visual System Diagnostic

The DIAGNOSE mode reports PASS / WARN / FAIL only, never a fabricated aggregate score.

It tests questions such as:

- Did a visual variable change without a narrative cause?
- Did camera ownership switch unexpectedly?
- Does background abstraction match the emotional state?
- Are too many primary variables changing simultaneously?
- Are Character and World competing for ownership?

The governing diagnostic question is: `Why did this visual behavior change?`

## Visual direction

The visual language is editorial + production-console, not marketing SaaS.

Base tokens:

- background `#090A0C`
- surface `#111318`
- raised surface `#171A20`
- primary text `#F1EFEA`
- muted text `#8C8C8A`
- accent `#E85D2A`

Display typography uses an editorial serif; body uses system sans; metadata uses system monospace. Avoid Inter/Space Grotesk as identity fonts.

No purple-blue gradient, glassmorphism, cyberpunk HUD, excessive glow, random film grain, CRT simulation, rounded-card wall, meaningless particles, or direct Auteur visual cloning.

## Motion and interaction

Motion is tiered:

- Tier 0 — static
- Tier 1 — hover / micro interaction
- Tier 2 — state transition
- Tier 3 — narrative transition
- Tier 4 — homepage ownership-shift demonstration

DOM transitions should use transform and opacity by default. `transition: all` is disallowed. At most one WebGL context may exist across the site; SVG, Canvas, and DOM are preferred.

Every interaction must reveal information or hierarchy. If it is only more cinematic, remove it.

## Responsive behavior

Required verification widths: 390, 768, 1024, 1440.

At 390:

- Learn / Direct / Diagnose remain visible.
- Timelines may horizontally scroll, with an obvious position cue.
- Character state controls stack vertically.
- Director Workspace variable families collapse into accessible sections.
- Touch targets are at least 44px.
- No key capability is hidden.

All breakpoints must avoid horizontal page overflow and clipped labels.

## Accessibility

Required:

- semantic HTML
- complete keyboard navigation
- `:focus-visible` states
- explicit names for icon-only or ambiguous controls
- text equivalents for visual diagrams/canvas
- color is never the sole state signal
- sufficient contrast
- complete `prefers-reduced-motion` path with equivalent information

## Architecture

Retain Vanilla HTML/CSS/JS and zero-build deployment.

The current large files may be split only where the new responsibilities justify it. Preferred boundaries:

- `index.html` — shell and semantic route containers
- `styles.css` — global tokens, shell, shared components
- `app.js` — route/mode orchestration only after extraction
- `director-workspace.js` — workspace variable state and rendering
- `state-machine.js` — character timeline state
- `sequence-score.js` — synchronized timeline model
- `diagnostic.js` — deterministic diagnostic rules
- `visual-qa.js` — static/release QA checks

Do not introduce a framework to achieve this split.

## Data flow

Interactive tools use explicit state objects rather than direct DOM-to-DOM coupling.

A shared scene state contains:

- narrative state
- active character/case
- playhead time
- six visual variable families
- agency
- ownership

Views subscribe/render from that state. Timeline movement updates the state first; UI then reflects the state. Diagnostic rules consume the same state so DIRECT and DIAGNOSE cannot disagree about the current scene.

## Error / fallback behavior

- If JavaScript is unavailable, LEARN content and a static explanation of DIRECT/DIAGNOSE remain readable.
- If Canvas/WebGL is unavailable, use SVG/DOM or a static semantic ownership diagram.
- If reduced motion is enabled, no essential information depends on interpolation.
- Invalid scene data should fail to a readable default example rather than a blank tool.

## QA and testing

Preserve the existing 50-check QA and extend it rather than replacing it.

Add deterministic checks for:

- duplicate IDs
- broken internal navigation targets
- missing accessible control names
- missing reduced-motion branch
- `transition: all`
- missing focus-visible rules
- invalid nested interactive elements
- console errors in representative flows
- horizontal overflow at 390 / 768 / 1024 / 1440

Interactive acceptance scenarios:

1. Change character state and verify all linked variables update.
2. Move Sequence Score playhead and verify side-panel state matches track position.
3. Trigger an Ownership Shift and verify visual + textual ownership change.
4. Run Visual Diagnostic against a coherent and deliberately incoherent sample state and verify deterministic PASS/WARN/FAIL findings.
5. Navigate the full primary flow with keyboard only.
6. Repeat with reduced motion enabled.

## Delivery phases

1. Information architecture and mode shell.
2. Design tokens and responsive navigation.
3. Director Control Room homepage.
4. Director Workspace state model and UI.
5. Character Visual State Machine.
6. Sequence Score synchronization.
7. Color Ownership Map.
8. Visual System Diagnostic.
9. Mobile adaptation.
10. Accessibility, performance, and QA hardening.

Each phase must leave the branch in a working, reviewable state.

## Acceptance criteria

The upgrade is acceptable when:

- A new user can explain within 10 seconds that VDO turns narrative into controlled visual behavior.
- LEARN, DIRECT, and DIAGNOSE are distinct and usable.
- Director Workspace, State Machine, Sequence Score, Color Ownership, and Visual Diagnostic share a coherent state model.
- No key navigation disappears on mobile.
- 390 / 768 / 1024 / 1440 have no horizontal page overflow.
- Keyboard and reduced-motion paths preserve all essential functionality.
- The frontend remains zero-build Vanilla HTML/CSS/JS.
- The site teaches its own methodology through its behavior rather than decorative effects.

## Governing rule

For every design or implementation choice, ask:

> Is this visual behavior caused by narrative, state, ownership, or hierarchy?

If not, remove it.
