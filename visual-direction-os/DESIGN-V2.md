# Visual Direction OS — Director Workspace v2.1

## Design thesis

Visual Direction OS is not a landing page and not a style library. It is a director workspace for deciding how narrative becomes visual behavior.

Primary rule:

> Narrative becomes visual behavior.

Secondary rule:

> Decoration is not direction.

Every visible behavior must be attributable to narrative state, ownership, hierarchy, or transition. If it cannot be explained, it should be removed.

## Product modes

### LEARN
Understand the grammar: Framework, Character, World, Sequence, Color, Production, Case Studies, Glossary.

### DIRECT
Make visual decisions: Narrative → Primary Variable → State → Sequence → Agency → Ownership → Visual Output.

### DIAGNOSE
Inspect coherence: narrative alignment, ownership conflicts, transition logic, color logic, camera logic, world consistency, motion hierarchy, and anti-slop rules.

## Interface architecture

Desktop uses a persistent left navigation with three weighted groups: LEARN, DIRECT, DIAGNOSE. Mobile uses a three-item bottom navigation for those same modes; key destinations are never removed at smaller breakpoints.

The homepage becomes a Director Control Room. It introduces the live system map and demonstrates an ownership shift from WORLD to CHARACTER rather than using decorative particles or generic cinematic effects.

The core DIRECT surface is a Director Workspace with six variable families: Color, Space, Camera, Line, Texture, Rhythm. It should feel closer to a grading/timing/mixing workstation than a spreadsheet or SaaS dashboard.

## Color system

- `--vdo-bg: #090A0C`
- `--vdo-surface: #111318`
- `--vdo-surface-raised: #171A20`
- `--vdo-text: #F1EFEA`
- `--vdo-muted: #8C8C8A`
- `--vdo-line: rgba(241,239,234,.14)`
- `--vdo-accent: #E85D2A` — electric vermilion / burnt orange
- `--vdo-accent-soft: rgba(232,93,42,.16)`

No purple-blue AI gradients. No glassmorphism. No arbitrary neon glow.

## Typography

Display: editorial serif with directing / screenplay character. Preferred order: Instrument Serif, Fraunces, Newsreader, serif fallback.

Body: native system sans stack for legibility and performance.

Metadata: `ui-monospace` for state labels, timelines, ownership metadata, QA status, and system annotations.

Avoid Inter and Space Grotesk as the visual identity.

## Layout grammar

- Large editorial headings paired with dense instrument-like controls.
- Strong horizontal alignment between timelines, state labels, and variable families.
- Section rhythm changes by mode instead of repeating the same card layout.
- ACT I / LEARN is quieter and more spacious.
- ACT II / CHARACTER is more expressive.
- ACT III / DIRECT is denser and tool-like.
- ACT IV / DIAGNOSE is precise and analytical.

Cards are used only when they represent an actual bounded object. Do not turn every content block into a rounded card.

## Interaction grammar

Interaction must reveal meaning.

- Hover: lightweight hierarchy cue only.
- State transitions: interpolate meaningful visual variables.
- Timeline playhead: synchronizes all visible tracks.
- Ownership controls: expose who currently owns Color / Camera / Space / Line.
- Character state machine: shows variable change across narrative states.
- Color Territory: visualizes relative ownership without pretending to scientific precision.

Never add motion solely to make the interface look more cinematic.

## Motion budget

Tier 0 — static content.

Tier 1 — hover / micro interaction.

Tier 2 — state transition.

Tier 3 — narrative transition.

Tier 4 — homepage ownership-shift demonstration only.

DOM motion should use `transform` and `opacity` by default. `filter` is exceptional. No `transition: all`. At most one WebGL context across the product; prefer SVG, Canvas, and DOM.

`prefers-reduced-motion` must preserve every piece of information with static equivalents.

## Core interactive systems

### System Map
Narrative → Variable → State → Sequence → Agency, with semantic child variables revealed on focus/hover.

### Director Workspace
Scene-level control surface with Color, Space, Camera, Line, Texture, and Rhythm families.

### Character Visual State Machine
A draggable timeline for Miles, Gwen, Hobie, and Elian examples. Mechanism, not style imitation.

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

At 390px, key modes remain available via bottom navigation: Learn / Direct / Diagnose.

- Timelines may scroll horizontally with a visible position cue.
- Character state controls become vertical.
- Director Workspace variable families collapse into expandable sections.
- Touch targets are at least 44px.
- No key navigation is hidden.

Required checkpoints: 390, 768, 1024, 1440.

## Accessibility strategy

- Semantic HTML and keyboard-complete navigation.
- `:focus-visible` on every interactive element.
- ARIA labels where control meaning is not explicit in text.
- Text equivalents for charts, canvases, and ownership diagrams.
- Color never acts as the only state signal.
- Sufficient text and control contrast.
- Reduced-motion mode keeps equivalent content.

## Performance strategy

Keep Vanilla HTML/CSS/JS and the current zero-build architecture unless a demonstrated limitation requires otherwise.

Use native APIs first: CSS variables, IntersectionObserver, requestAnimationFrame, SVG, Canvas.

No large framework or tracking dependency for this upgrade.

## Content source

`visual-direction-system/` remains the semantic source of truth. Existing knowledge meaning is preserved. Frontend work may reorganize, visualize, and connect it, but should not silently rewrite the methodology.

## QA gate

Extend the current QA so release checks include:

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
