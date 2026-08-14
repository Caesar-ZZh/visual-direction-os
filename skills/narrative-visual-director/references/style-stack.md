# Rendering Style Stack

The rendering family is inspired by multiverse comic-cinematic animation, but the skill must express it through mechanisms rather than one franchise label.

## Style Stack Order

`Narrative → Composition → Shape → Value → Edge → Color → Medium → Texture → FX → Polish`

The lower layers may decorate the image, but they may not contradict higher layers.

## Common Rendering Mechanisms

Use selectively, not all at once:
- mixed 2D / 3D comic rendering
- graphic value blocks and simplified shadow families
- variable contour weight and hand-drawn line accents
- halftone / screentone applied to selected value regions
- crosshatching or dry-brush shadow texture
- offset print plates / controlled chromatic misregistration
- risograph / screenprint / xerographic texture
- paper grain and ink imperfection
- collage fragments where medium behavior is narratively justified
- watercolor bloom and wash for emotional permeability
- graphic lighting rather than passive photoreal light
- selective depth flattening or perspective exaggeration
- simplified background detail to preserve hero readability
- shape echoes, directional marks, or panel-like graphic framing when composition supports them

## Still-Image Camera Translation

A single generated still cannot literally vary animation frame rate. Translate temporal ideas into visible still-image cues:
- pose spacing implied by directional echoes
- layered registration offsets
- staggered contour duplicates
- temporal smear only where it reinforces the chosen archetype
- stable camera + unstable medium for `rebellion_time`
- predictive negative space for `path_space`

Do not describe fake technical animation properties that cannot be seen in a still image unless generating a sequence/video.

## Intensity Presets

### low
Preserve photographic composition strongly. Use restrained comic line, mild graphic value grouping, subtle print grain, selective halftone. Minimal abstraction.

### medium
Strengthen graphic lighting, value simplification, contour stylization and environment hierarchy. Add one medium-specific signature from the archetype.

### high — default
Allow meaningful composition emphasis, stronger print layers, controlled abstraction, selective registration offset, graphic color territory and archetype-specific edge/space/focus behavior. Subject likeness remains dominant.

### extreme
Push the archetype’s primary mechanism aggressively while preserving the lowest recognizable system. Never maximize every effect simultaneously.

## Output-Format Modulation

### `single_portrait`
- face and identity are highest priority
- background supports but does not compete
- crop can remain close to source
- one strong archetype mechanism is enough

### `cinematic_frame`
- environment participates in narrative
- stronger camera allegiance and negative-space design
- allow wider composition and deeper world behavior

### `poster`
- strongest graphic hierarchy
- large shape masses and deliberate negative space
- controlled abstraction is acceptable
- poster does not imply adding text unless user asks

### `comic_panel`
- moment-focused composition
- clear action / reaction direction
- panel-like edge framing may be used subtly
- avoid fake dialogue text unless requested

### `four_state_sheet`
- identity continuity first
- consistent camera family unless camera change is part of the state logic
- distinct state behavior across panels
- labels should not be generated inside image unless user explicitly asks for typography

## Surface-Effect Budget

At `high`, select roughly 3–5 surface mechanisms. At `extreme`, 5–7 may be used if they support one coherent engine. Avoid effect soup.

A good stack example for `boundary_emotion / pressure`:
- graphic value anchor
- watercolor field
- selective lost edges
- mild halftone only in stable clothing/background masses
- subtle paper grain

A bad stack:
- watercolor + punk collage + heavy glitch + speed lines + neon chromatic aberration + maximal halftone + lens flare with no narrative reason.
