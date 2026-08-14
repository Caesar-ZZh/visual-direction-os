# Narrative Visual Director v1

A reusable image-direction skill built from the Visual Direction OS methodology.

## What it does

Transforms a user-provided photo through:

`visible scene reading → narrative state → visual archetype → primary variable → generation prompt → image QA → targeted retry`

The intended result is not a generic comic filter. Camera, color, edge, space, focus and medium should respond to the subject's visible state and the user's requested narrative direction.

## Package

```text
narrative-visual-director/
├── SKILL.md
├── prompts/
│   ├── system.md
│   └── developer.md
├── schemas/
│   ├── input.schema.json
│   └── visual-plan.schema.json
├── references/
│   ├── archetypes.md
│   ├── state-mappings.md
│   ├── style-stack.md
│   ├── prompt-assembler.md
│   └── qa-retry.md
├── examples/
│   └── example-pack.md
└── tests/
    └── pressure-scenarios.md
```

## Four archetypes

- `path_space` — Space / Direction
- `boundary_emotion` — Boundary / Edge / Relationship Color
- `rebellion_time` — Time / Medium / Registration
- `focus_attention` — Focus / Visibility / Contrast Hierarchy

## Quick execution

1. Require a usable reference photo.
2. Normalize user controls with `schemas/input.schema.json`.
3. Read visible scene evidence only.
4. Resolve one state and one primary archetype.
5. Build a Visual Plan using `schemas/visual-plan.schema.json`.
6. Assemble the image prompt using `references/prompt-assembler.md`.
7. Generate using the original image as reference.
8. Score the result using `references/qa-retry.md` and retry only failed dimensions.

## Default request

For “把这张照片做成纵横宇宙那种感觉” with no other instruction:

- mode: `auto_director`
- rendering family: multiverse comic cinematic
- intensity: high
- background: stylize
- infer state conservatively
- infer one archetype from visible composition
- preserve face / silhouette / pose identity
- translate the requested aesthetic into concrete graphic, print, edge, camera and color mechanisms

## Verification status

The package includes acceptance pressure scenarios. Runtime RED/GREEN agent tests and real image-output QA should be executed in the target deployment environment before calling the skill fully verified.
