# Visual Direction OS — Director Workspace v2.1

## Design thesis

Visual Direction OS is not a style library and not a generic AI dashboard. It is a two-space directing system for understanding and deciding how narrative becomes visual behavior.

Primary rule:

> Narrative becomes visual behavior.

Secondary rule:

> Decoration is not direction.

Every visible behavior must be attributable to narrative state, ownership, hierarchy, or transition. If it cannot be explained, it should be removed.

## Product spaces

### SYSTEM — `/`

The editorial knowledge experience remains the public default homepage. SYSTEM owns the methodology browser: Overview, Character, World, Sequence, Color, Production, Case Studies, Glossary, Decision Tree, Master Workflow and Visual QA.

SYSTEM explains what to think about. It does not mutate canonical Scene State.

### STUDIO — `/studio/`

The Director Workspace is the operational control room. STUDIO owns Project Context, Scene workspaces, Project Arc, Continuity, Narrative interpretation, Direct controls and Diagnose.

STUDIO decides what happens in the Scene.

SYSTEM and STUDIO use the same Visual Direction OS DNA but remain distinct spaces. Release chrome provides a restrained two-way transition between them.

## Project context layer

**Project is not a fifth mode.** It is a context layer above the four Director modes.

Project responsibilities:

- Project Breakdown proposal
- Director edit / add / split / merge / remove / reorder
- Confirm Scene Structure
- Scene Rail and active Scene routing
- independent Scene snapshots
- Project Arc
- Cross-Scene Continuity
- local Project persistence

Project Breakdown may propose narrative structure only. It must not output Camera / Color / Space or other visual direction fields.

## Director modes

### LEARN

Understand the grammar and connect back to SYSTEM knowledge.

### NARRATIVE

Scene Description + optional Director Intent + upstream Project Context → Narrative Readings → confirmed Reading → Visual Direction Strategies → Sequence Proposal → explicit Apply.

Project Context enters Interpret only and is treated as upstream intent, not confirmed Scene truth.

### DIRECT

Make visual decisions against the active Scene's canonical Scene State. The control surface includes Color, Space, Camera, Line, Texture, Rhythm, State Machine, Sequence Score and Color Ownership.

### DIAGNOSE

Inspect coherence using the same canonical Scene State. Output deterministic PASS / WARN / FAIL; do not fabricate a total score and do not auto-fix Director choices.

## Interface architecture

SYSTEM uses the existing editorial atlas and navigation rail.

STUDIO desktop uses a persistent left control rail. Mobile preserves the four Director modes in the existing bottom navigation; SYSTEM is available through a separate compact return control so it never becomes a fifth mode.

The STUDIO hero is a Director Control Room. It introduces the live system map and demonstrates an ownership shift from WORLD to CHARACTER rather than using decorative particles or generic cinematic effects.

The core DIRECT surface is a Director Workspace with six variable families: Color, Space, Camera, Line, Texture, Rhythm. It should feel closer to a grading/timing/mixing workstation than a spreadsheet or SaaS dashboard.

## Release architecture

Production GitHub Pages routes:

```text
/                     SYSTEM
/studio/              STUDIO
/studio/?narrativeDemo=1&projectDemo=1   explicit review fixture
/director-v2.html     compatibility / exact-commit staging entry
```

`build-pages-site.js` remains the zero-build Pages assembler.

- Source `index.html` remains the SYSTEM source.
- The assembler produces the published SYSTEM root and adds only the restrained release-space bridge.
- `director-v2.html` is transformed into published `studio/index.html`.
- Studio shares the existing root CSS/JS assets.
- A source `studio/index.html` shim exists only to make RawGitHack / branch review routes convenient; the Pages build replaces that shim with the full STUDIO document.
- `pages.yml` deploys only from `master` plus manual dispatch, so Draft PR development cannot replace the live SYSTEM homepage.

The generated Studio uses a parent asset base and rewrites Studio-local hash links so `#main` and mobile mode anchors remain inside `/studio/`.

User-facing published Studio chrome is production-neutral: `Director Workspace · v2.1` and `Director Control Room`. Explicit demo fixtures remain query-controlled and are never silently enabled.

## State boundary

Project and Scene state remain separate.

```text
Project Store
├── title / projectIntent / sourceNarrative
├── sceneOrder
├── activeSceneId
└── SceneRecord[]
    ├── narrativeRole
    ├── workspace.narrativeState
    ├── workspace.sceneState
    ├── workspace.sequenceState
    └── visual status
```

`ProjectRuntime.switchScene(sceneId)` performs save → abort transient work → switch → restore. Restore-generated technical events must not persist one Scene into another.

Persistent state includes confirmed Narrative state, canonical Scene State, Sequence state and Director edits. Hover, loading, preview, open panels and unconfirmed AI candidates are transient.

Local persistence is optional capability, not a Project bootstrap dependency. Storage load/write/bind failure may disable local save but must never kill Project Workspace.

## Color system

STUDIO core:

- `--bg: #090A0C`
- `--surface: #111318`
- `--raised: #171A20`
- `--text: #F1EFEA`
- `--muted: #8C8C8A`
- `--line: #2A2D33`
- `--accent: #E85D2A`

SYSTEM keeps its existing editorial dark/light variables and signal color.

No purple-blue AI gradients. No glassmorphism. No arbitrary neon glow.

## Typography

Display: editorial serif with directing / screenplay character. Preferred order: Instrument Serif, Fraunces, Newsreader, serif fallback.

Body: native system sans stack for legibility and performance.

Metadata: `ui-monospace` for state labels, timelines, ownership metadata, QA status, and system annotations.

Avoid Inter and Space Grotesk as the visual identity.

## Layout grammar

- Large editorial headings paired with dense instrument-like controls.
- Strong horizontal alignment between timelines, state labels, and variable families.
- SYSTEM remains spacious and editorial.
- NARRATIVE is interpretive and review-oriented.
- DIRECT is dense and tool-like.
- DIAGNOSE is precise and analytical.
- Project Arc compresses cross-Scene state without pretending to be an NLE timeline.

Cards are used only when they represent an actual bounded object. Do not turn every content block into a rounded card.

## Interaction grammar

Interaction must reveal meaning.

- Hover: lightweight hierarchy cue only.
- State transitions: interpolate meaningful visual variables.
- Timeline playhead: synchronizes all visible tracks.
- Ownership controls: expose who currently owns Color / Camera / Space / Line.
- Character state machine: shows variable change across narrative states.
- Color Territory: visualizes relative ownership without pretending to scientific precision.
- SYSTEM ↔ STUDIO transitions preserve Project state and do not create visual presets.

Never add motion solely to make the interface look more cinematic.

## Motion budget

Tier 0 — static content.

Tier 1 — hover / micro interaction.

Tier 2 — state transition.

Tier 3 — narrative transition.

Tier 4 — ownership-shift demonstration only.

DOM motion should use `transform` and `opacity` by default. `filter` is exceptional. No `transition: all`. At most one WebGL context across the product; prefer SVG, Canvas, and DOM.

`prefers-reduced-motion` must preserve every piece of information with static equivalents.

## Core interactive systems

### System Map

Narrative → Variable → State → Sequence → Agency, with semantic child variables revealed on focus/hover.

### Project Breakdown

Long narrative → Project Reading + Scene Structure Proposal → Director review → Confirm Scene Structure. AI proposal is never canonical truth before confirmation.

### Project Arc

Cross-Scene semantic matrix for Narrative Role, Agency, Camera, Color, Space, Density and Rhythm. Undirected visual fields remain `—`.

### Cross-Scene Continuity

Explainable PASS / WARN / FAIL / UNRESOLVED findings with Scene routing. No Auto Fix.

### Director Workspace

Scene-level control surface with Color, Space, Camera, Line, Texture, and Rhythm families.

### Character Visual State Machine

Mechanism, not style imitation.

### Sequence Score

DAW-like time axis with tracks for Color, Space, Camera, Line, Texture, Agency, and explicit Ownership Shift markers.

### Color Ownership Map

Shows relative CHARACTER / WORLD / NARRATIVE territory over time using both labels and visual proportion.

### Visual System Diagnostic

PASS / WARN / FAIL output for coherence. No fake numeric score.

## Character case-study rules

Miles: identity collision, Brooklyn ownership, multiverse pressure, self-authorship.

Gwen: emotion owns environment; palette temperature, negative space, abstraction, edge softness.

Hobie: system refusal; collage discontinuity, timing mismatch, print texture, graphic rupture.

Elian: focus ownership shift.

These are mechanism studies. Do not encourage direct style imitation of copyrighted film imagery.

## Anti-references

Reject:

- generic AI dashboard
- Notion / Linear / Vercel clones
- glassmorphism SaaS
- purple-blue gradients
- floating rounded-card walls
- generic cyberpunk HUD
- meaningless particles
- random film grain or CRT effects
- excessive glow
- all elements moving simultaneously
- decoration pretending to be art direction
- direct Auteur visual cloning

## Mobile strategy

Required checkpoints: 390, 768, 1024, 1440.

SYSTEM:

- mobile header opens the existing navigation rail
- release STUDIO entry remains inside that rail
- the rail may scroll vertically when content exceeds the viewport

STUDIO:

- Learn / Narrative / Direct / Diagnose remain the Director modes
- SYSTEM return is a separate compact mobile control, never a fifth mode
- Project Arc may scroll horizontally inside its own region
- timelines may scroll horizontally with a visible position cue
- touch targets are at least 44px where they represent primary controls
- no page-level horizontal overflow

## Accessibility strategy

- Semantic HTML and keyboard-complete navigation.
- `:focus-visible` on every interactive element.
- ARIA labels where control meaning is not explicit in text.
- Text equivalents for charts, canvases, and ownership diagrams.
- Color never acts as the only state signal.
- Sufficient text and control contrast.
- Reduced-motion mode keeps equivalent content.
- Release-space navigation remains reachable at desktop and mobile breakpoints.

## Performance strategy

Keep Vanilla HTML/CSS/JS and the current zero-build architecture unless a demonstrated limitation requires otherwise.

Use native APIs first: CSS variables, IntersectionObserver, requestAnimationFrame, SVG, Canvas.

No large framework or tracking dependency for this upgrade.

## Content source

`visual-direction-system/` remains the semantic source of truth. Existing knowledge meaning is preserved. Frontend work may reorganize, visualize, and connect it, but should not silently rewrite the methodology.

## QA gate

Release checks include:

- SYSTEM remains the public root
- `/studio/` assembles the full Director Workspace
- SYSTEM → STUDIO and STUDIO → SYSTEM links
- explicit fixture-only demo behavior
- Project bootstrap with persistence unavailable
- independent Scene restore
- undirected Project Arc values remain `—`
- duplicate IDs
- broken internal navigation
- missing accessible labels/descriptions
- missing reduced-motion handling
- `transition: all`
- keyboard focus states
- console errors
- invalid interactive nesting
- overflow risk at 390 / 768 / 1024 / 1440

Report only PASS / WARN / FAIL. No fabricated quality score.

## Acceptance principle

For each proposed effect, ask:

> Is this visual behavior caused by narrative, state, ownership, or hierarchy?

If not, remove it.
