# 04 — Rendering Deconstruction

The failed image-generation tests exposed a missing layer between visual-direction theory and final rendering.

## The problem

A prompt can correctly mention narrative state, character, world, color and camera and still produce a generic AI concept-art image because the model defaults to:

```text
realistic / semi-realistic 3D form
+ cinematic lighting
+ detailed material description
+ smooth gradients
+ global comic texture overlay
```

That is not enough.

The film frequently changes **how reality itself is described**. Therefore production translation must explicitly answer:

> What must **not** be rendered in the default realistic way?

## Rendering Deconstruction Stack

```text
Narrative Function
↓
World + Character + State
↓
Composition Skeleton
↓
Rendering Deconstruction
├── Reality Suppression
├── Shape Simplification
├── Facial Plane Abstraction
├── Value Massing
├── Controlled Flattening
├── Depth Treatment
├── Detail Suppression
├── Line Strategy
└── Surface Assignment
↓
Color / Edge / Texture / Print
↓
Temporal behavior
↓
Polish
```

## 1. Reality Suppression

Decide which physical facts are unnecessary or narratively harmful.

Possible targets:

- realistic skin gradients;
- accurate object-local colors;
- small architectural features;
- fine fabric folds;
- realistic specular highlights;
- continuous atmospheric perspective;
- natural light falloff;
- physically consistent reflections.

**Question:** if a realistic renderer would describe it, does this frame actually need it?

## 2. Shape Simplification

Reduce objects and bodies to designed masses before texture.

Look for:

- large hair mass;
- large face plane;
- grouped torso / limb shapes;
- simplified architecture;
- crowd as graphic field;
- props as silhouettes or color blocks.

A character should remain readable when micro-detail disappears.

## 3. Facial Plane Abstraction

A common generation failure is “real face with comic outline”. Instead, study how:

- nose becomes one or two designed planes;
- cheek / eye socket become graphic value shapes;
- lips may be simplified;
- skin color can become non-natural;
- line is selectively added rather than uniformly outlining the face;
- halftone/hatching may appear locally rather than globally.

**Identity preservation ≠ realistic skin preservation.**

## 4. Value Massing

Before hue, reduce the image to a small number of light/dark territories.

Questions:

- Is the character a dark mass against a high-key world?
- Is the face built from 2–4 planes rather than continuous shading?
- Is an environment collapsed into one value family?
- Does the frame depend on silhouette more than material modeling?

## 5. Controlled Flattening

Flattening is deliberate, not a limitation.

Mechanisms include:

- compressed depth;
- reduced gradients;
- large flat color planes;
- poster-like silhouettes;
- simplified perspective layers;
- background and character using different depth logic.

The goal is not “make everything 2D”. The goal is to decide **which depth information remains narratively useful**.

## 6. Depth Treatment

Possible depth modes:

- realistic deep perspective;
- exaggerated Z-depth;
- compressed depth;
- planar stacking;
- multi-perspective;
- graphic overlap;
- psychological depth replacing physical depth.

Depth is a variable, not a permanent film-wide setting.

## 7. Detail Suppression

Track what the film refuses to describe.

Possible rule:

```text
Information Importance ↑ → Description ↑
Narrative Irrelevance ↑ → Detail Suppression ↑
```

But this must be calibrated per world/state. Earth-65 Batch 001 provides one strong local example: environmental physical detail drops while emotional territory rises.

## 8. Line Strategy

Never default to “outline everything”. Track:

- no line;
- sparse accents;
- selective contour;
- broken contour;
- structural hatching;
- directional motion line;
- print / xerox edge;
- mixed surface-specific line systems.

## 9. Surface Assignment / Surface Heterogeneity

This is one of the largest differences between film logic and generic AI style filters.

A single frame may assign different media to:

- skin;
- hair;
- costume;
- background architecture;
- atmospheric field;
- effects;
- typography;
- motion trails.

Therefore:

> Texture must be **assigned**, not overlaid.

A global halftone layer is usually an impoverished approximation.

## 10. Print behavior

Track independently:

- Halftone — none / local / structural / dominant
- Hatching — none / local / structural / dominant
- CMYK Misregistration — none / subtle / local / strong
- Xerox / grain / rough brush
- color plate behavior

Do not collapse all of these into “comic texture”.

## QA gates

A transformed image fails if:

1. body and face remain fully realistic underneath effects;
2. environment retains excessive AI-detail that the intended mechanism would suppress;
3. every surface receives the same texture;
4. halftone is added everywhere regardless of value/surface/function;
5. perspective is generic cinematic concept-art perspective when the target grammar calls for flattening/compression/exaggeration;
6. color is correct but value/shape/composition are generic;
7. removing palette and FX reveals a conventional realistic illustration.

## Production principle

```text
Do not ask only:
“What should be added to make it look stylized?”

Ask first:
“What realistic information must be removed, flattened, reassigned or redesigned?”
```

This layer becomes mandatory in v1.5 of the methodology and in the next Narrative Visual Director Skill revision.