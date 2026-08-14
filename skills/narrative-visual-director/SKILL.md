---
name: narrative-visual-director
description: Use when transforming a user-provided photo into a stylized cinematic comic image whose camera, color, edge, space, medium, or focus behavior should respond to visible emotion, pose, relationships, or a requested narrative state.
---

# Narrative Visual Director

## Overview

把照片转译成“被导演过的视觉语言”，而不是套滤镜。核心链路：

`Photo Reading → Narrative State → Archetype → Primary Variable → Visual Plan → Generation → QA / Retry`

## Required References

Before execution, read as needed:
- `prompts/system.md` — runtime role and hard priorities
- `prompts/developer.md` — decision and generation procedure
- `references/archetypes.md` — four visual archetypes
- `references/state-mappings.md` — state and emotion mapping
- `references/style-stack.md` — comic-cinematic rendering mechanisms and intensity
- `references/prompt-assembler.md` — final prompt construction
- `references/qa-retry.md` — output QA and retry routing
- `schemas/input.schema.json` and `schemas/visual-plan.schema.json` — structured contracts

## Runtime Rules

1. A usable source image is required for photo transformation. If missing, request the image; never invent visual analysis.
2. Explicit user choices override automatic inference: `archetype > state/emotion > camera/output preferences > auto defaults`.
3. Infer only from visible expression, pose, gaze, spatial relation, composition, and environment. Do not infer sensitive identity, diagnosis, trauma history, or hidden biography.
4. Choose one Primary Variable. Secondary variables support it; surface effects never replace it.
5. Preserve identity anchors before increasing stylization: face likeness, hair/head silhouette, pose direction, distinctive clothing silhouette, and subject relationships as relevant.
6. When the user asks for an Across-the-Spider-Verse / multiverse-comic transformation, translate the request into concrete mechanisms rather than relying on a franchise label alone.
7. For multi-person images, direct the relationship field as well as each individual.
8. For `four_state_sheet`, preserve identity while changing visual organization across states.
9. Generate first only after a compact Visual Plan exists. After generation, evaluate against `references/qa-retry.md`; retry when a core criterion fails.

## Default Behavior

If the user uploads a photo and simply asks for transformation:
- mode: `auto_director`
- output: `single_portrait` or `cinematic_frame` based on composition
- intensity: `high`
- background: `stylize`
- state: infer conservatively
- archetype: infer from visible scene mechanics

Do not ask unnecessary questions when defaults can produce a strong result.
