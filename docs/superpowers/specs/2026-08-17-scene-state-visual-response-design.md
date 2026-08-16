# Scene State → Visual Response Layer Design

**Status:** Approved direction, implementation spec
**Branch:** `agent/director-workspace-v2-1`
**Scope:** Director Workspace v2.1 staging only; no `master` mutation and no changes under `visual-direction-system/`.

## Goal

Make the page itself visibly respond to the canonical `VDOSScene` state so DIRECT feels like a visual-direction simulator rather than a collection of controls. A change in Color, Space, Camera, Line, Texture, Rhythm, Agency, or Ownership should create a restrained, legible visual consequence while preserving typography, accessibility, performance, and diagnostic clarity.

The governing principle is: **state changes should alter visual behavior, not decorate the interface.**

## Chosen approach

Use one centralized **Visual Response Layer** that subscribes to `VDOSScene`, derives a small set of semantic response tokens, and writes them to the root staging element as CSS custom properties and data attributes. Existing modules continue to own scene-state semantics; they do not directly manipulate page styling.

This approach is preferred over per-module styling because it keeps one-way data flow:

`Control / State Machine / Sequence → VDOSScene → Visual Response Layer → CSS tokens → page response`

It is also preferred over Canvas/WebGL because the required effects are low-cost layout/color/texture responses and should remain inspectable, accessible, and compatible with GitHub Pages.

## Response channels

### 1. Color atmosphere

Derived primarily from `variables.color.temperature`, `variables.color.territory`, and `agency`.

- `cool` shifts ambient field toward restrained blue-gray.
- `neutral` keeps the baseline charcoal/ivory balance.
- `warm` increases restrained rust/amber presence.
- `world` territory keeps color influence broader and environmental.
- `character` territory pulls the active glow/focus closer to the content core.
- `contested` creates two competing low-opacity fields rather than increasing saturation.

The orange product accent remains stable; scene state changes atmosphere, not brand identity.

### 2. Spatial pressure

Derived from `space.compression` and `space.openness`.

- Low compression preserves generous section spacing and wider visual breathing room.
- Medium compression subtly tightens gaps and field scale.
- High compression reduces selected inter-module spacing and increases edge pressure without making text cramped.
- Openness changes the width/scale of ambient fields, not the readable text column width.

No state may create horizontal page overflow at 390, 768, 1024, or 1440px.

### 3. Camera ownership / focus

Derived from `camera.perspective`, `camera.distance`, `camera.stability`, and `agency`.

- `world` places the main focus field farther from the text core and keeps it broad.
- `mixed` centers the field between environmental and character positions.
- `character` pulls focus toward the active content core.
- Camera distance changes field scale only; it does not scale body text.
- Camera stability changes the amount of permitted field drift. Reduced-motion always removes drift.

### 4. Line behavior

Derived from `line.stability`, `line.density`, and `line.direction`.

- Stability changes the regularity/offset of non-semantic system lines and track decorations.
- Density controls how many decorative system traces are visible.
- Semantic borders, focus rings, text underlines, and diagnostic status indicators never become unstable.

### 5. Texture behavior

Derived from `texture.noise`, `texture.granularity`, and `texture.materiality`.

- Implemented with CSS gradients/pattern layers only.
- Noise/granularity changes opacity and scale of a subtle non-interactive texture overlay.
- No raster film grain, fake scratches, CRT effects, or heavy animation.

### 6. Rhythm / motion energy

Derived from `rhythm.motionEnergy` and `rhythm.cutDensity`.

- Controls duration and amplitude of non-essential transitions.
- Low = slower/subtle; medium = normal; high = quicker but not flashy.
- Does not change navigation timing, focus behavior, or diagnostic correctness.
- `prefers-reduced-motion: reduce` disables all non-essential motion regardless of state.

## Ownership presets

Ownership changes should create a recognizable but restrained page-level composition:

### WORLD
- broad environmental field
- cooler/default atmosphere unless Color overrides it
- low edge pressure
- stable system traces

### CONTESTED
- dual competing fields
- slightly higher spatial pressure
- mixed camera focus
- visible but restrained line/texture tension

### CHARACTER
- focus field moves toward content core
- atmosphere becomes more locally concentrated
- higher foreground emphasis
- system traces recede from the environment

Ownership presets are derived defaults only. Explicit user-selected variables remain authoritative and must not be silently overwritten.

## UI feedback

Add one compact, non-blocking `LIVE VISUAL RESPONSE` readout near the DIRECT state summary. It lists the currently derived response in qualitative language, for example:

- `ATMOSPHERE · WARM / CHARACTER-LED`
- `PRESSURE · HIGH`
- `FOCUS · CHARACTER / NEAR`
- `MOTION · LOW`

This is explanatory feedback, not a second control surface.

## Architecture

Create `visual-direction-os/visual-response.js` with a pure derivation function plus DOM adapter:

- `deriveVisualResponse(sceneState)` → serializable response object
- `applyVisualResponse(root, response)` → root data attributes + CSS variables
- `initVisualResponse(root)` → subscribes once to `VDOSScene`

The pure function must be testable without a browser.

The response object contains qualitative values and bounded numeric CSS-ready values only where needed for presentation. It must never invent semantic scores.

Suggested root attributes:

- `data-vr-temperature`
- `data-vr-agency`
- `data-vr-pressure`
- `data-vr-focus`
- `data-vr-line`
- `data-vr-texture`
- `data-vr-motion`

Suggested CSS variables:

- `--vr-atmosphere-a`
- `--vr-atmosphere-b`
- `--vr-focus-x`
- `--vr-focus-y`
- `--vr-focus-scale`
- `--vr-pressure`
- `--vr-line-opacity`
- `--vr-texture-opacity`
- `--vr-texture-size`
- `--vr-motion-duration`

## Accessibility and performance

- Decorative response layers use `pointer-events: none` and are hidden from assistive technology.
- Color is never the only explanation; the live response readout provides text equivalents.
- No text contrast may depend on scene state.
- Focus rings and PASS/WARN/FAIL colors remain stable.
- `prefers-reduced-motion` disables field drift and non-essential interpolation.
- No WebGL, no new external dependencies, no image assets required.
- Avoid continuous JavaScript animation; state changes update CSS variables and CSS handles bounded transitions.

## Testing

### Pure behavior tests

Verify `deriveVisualResponse()` for representative states:

1. Baseline WORLD state.
2. Warm + CHARACTER territory + high compression.
3. CONTESTED agency with mixed camera and high line/texture energy.
4. Explicit variable choices remain reflected even when ownership preset differs.

### Browser tests

At 390 and 1440px:

1. Changing Temperature updates root response attributes and visible live-response text.
2. Changing Camera Perspective moves the derived focus state.
3. High Compression changes pressure state without horizontal overflow.
4. Character ownership updates agency response without overwriting unrelated explicit variable choices.
5. Reduced Motion disables response animation.
6. Existing State Machine → Sequence synchronization still passes.
7. Diagnose still reads the same canonical scene state.

## Non-goals

- No new scene editor.
- No AI-generated imagery.
- No WebGL or 3D camera simulation.
- No redesign of Knowledge Atlas in this increment.
- No new diagnostic rules in this increment.
- No replacement of the existing Director controls.

## Acceptance criteria

The increment is complete when a user can change a DIRECT variable and immediately perceive a restrained page-level visual consequence, read a textual explanation of that consequence, and continue through State Machine, Sequence, Color Ownership, and Diagnose with the same canonical state and no accessibility, overflow, or reduced-motion regressions.

## Self-review

- No placeholders or TBDs.
- One canonical state remains the source of truth.
- Explicit user variables are never overwritten by visual presets.
- Scope is limited to the response layer and its tests/readout.
- No knowledge-source files or production `master` are modified.