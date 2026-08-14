# Prompt Assembler

Build the generation prompt from structured modules. Do not write one monolithic preset for every image.

## Assembly Order

1. Transformation intent
2. Identity preservation
3. Narrative state
4. Archetype + Primary Variable
5. Composition / camera
6. Space / value / readability
7. Edge behavior
8. Color ownership / territory
9. Medium / texture
10. Background treatment
11. Output format
12. Anti-rules / negative guidance

## Core Template

```text
Transform the uploaded reference photo into a highly stylized, cinematic multiverse-comic illustration while preserving the visible identity of the subject(s), essential facial likeness, hair/head silhouette, body proportions, key pose direction, and relationship geometry.

Narrative state: {STATE}.
Visual archetype: {ARCHETYPE}.
Primary visual variable: {PRIMARY_VARIABLE}.
Coupled pair: {COUPLED_PAIR}.
Narrative function: {NARRATIVE_FUNCTION}.

Direct the image through the following causal visual logic:
- Camera: {CAMERA_STRATEGY}
- Space: {SPACE_STRATEGY}
- Value and readability: {VALUE_STRATEGY}; {READABILITY_STRATEGY}
- Edge: {EDGE_STRATEGY}
- Color ownership: {COLOR_STRATEGY}
- Focus hierarchy: {FOCUS_HIERARCHY}
- Medium and texture: {MEDIUM_STRATEGY}
- Background: {BACKGROUND_STRATEGY}

Rendering family: mixed 2D/3D graphic comic rendering with selective print texture, expressive linework, stylized value grouping, graphic lighting, and only the archetype-relevant halftone / watercolor / collage / registration mechanisms. The image should feel directed and narratively specific rather than like a generic filter.

Output format: {OUTPUT_FORMAT}.
Stylization intensity: {INTENSITY}.

Protect these identity anchors: {IDENTITY_ANCHORS}.
Avoid: {ANTI_RULES}.
```

## Narrative Function Module

Derive one short visual verb from state and scene:
- baseline → HOLD / OBSERVE / EXIST
- pressure → COMPRESS / SEPARATE / CONTEST
- crisis → BREAK / MISDIRECT / DESYNCHRONIZE
- decision → CHOOSE / WITHHOLD / ALIGN
- agency → CLAIM / OPEN / REFOCUS / AUTHOR
- resolution → INTEGRATE / REMAIN / NEGOTIATE

The verb should match the archetype. Example: `agency + focus_attention → REFOCUS`; `agency + path_space → CLAIM / OPEN`.

## Camera Modules

Use one dominant camera instruction:
- `intimate_close`: close or medium-close, face first, negative space carrying emotion
- `observational`: stable framing, less manipulation, lets medium/relationship behavior read
- `heroic`: low or open angle, clean silhouette, increased usable space around intended movement
- `kinetic`: directional framing and perspective, camera participates in motion
- `distant`: subject compressed by environment, useful for pressure or system dominance
- `confrontational`: frontal axis, direct gaze, strong symmetric/asymmetric tension

If user did not specify camera, derive it from state + archetype.

## Color Ownership Language

Avoid generic “vibrant colors.” Prefer phrases such as:
- “reserve the warm accent for the institution while the subject remains in a cooler field”
- “let relationship color occupy the negative space between the two subjects”
- “allow the subject to reclaim the previously assigned accent as agency increases”
- “keep saturation localized so the face remains readable”

## Edge Language

Prefer causal edge descriptions:
- “hard edge on face and hand; lost edge where emotion dissolves into background”
- “clean action-side contour, softer trailing-side contour”
- “printed torn edges locally while preserving global silhouette”
- “edge clarity propagates from gaze toward the chosen object”

## Background Modules

- `preserve`: keep scene semantics and major geometry; stylize rendering only
- `simplify`: remove nonessential detail; retain key landmarks and light direction
- `stylize`: preserve semantic place but re-author shape, value, color and texture behavior
- `abstract`: retain only the relational/spatial meaning of the environment; convert details into fields, shapes, print layers or graphic structures

## Negative Prompt Base

```text
avoid generic flat cartoon rendering, weak facial likeness, identity drift, broken anatomy, duplicated limbs, unreadable silhouette, random visual noise, muddy value hierarchy, overcluttered background, arbitrary neon effects, excessive chromatic aberration, effects that obscure the face, style mixing without narrative purpose, text artifacts, unwanted captions, watermarks
```

Append archetype anti-rules from `references/archetypes.md`.

## Four-State Sheet Template

```text
Using the uploaded photo as the identity reference, create one coherent four-panel visual state sheet of the same subject: BASELINE, PRESSURE, CRISIS, AGENCY.

Keep face, hair/head silhouette, clothing identity and body proportions consistent across all four panels. Use the same primary archetype: {ARCHETYPE} / {PRIMARY_VARIABLE}.

Differentiate states structurally, not only by palette:
- BASELINE: {BASELINE_BEHAVIOR}
- PRESSURE: {PRESSURE_BEHAVIOR}
- CRISIS: {CRISIS_BEHAVIOR}
- AGENCY: {AGENCY_BEHAVIOR}

Use camera, edge, space/focus ownership, color territory, medium behavior and information density to show the state transition. Agency must show regained visual authorship, not merely maximum spectacle.

Do not add panel labels as rendered text unless explicitly requested.
```

## Prompt Compression Rule

If the generation model performs worse with long prompts, preserve these modules first:

`identity → state → primary variable → camera → readability → archetype medium → background → anti-rules`

Drop decorative adjectives before dropping causal visual rules.