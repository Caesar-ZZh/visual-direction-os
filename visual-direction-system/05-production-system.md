# 05｜Production System

## Reverse Engineering Sheet

Use this fixed structure when analyzing an image or shot:

```text
Narrative Verb
Primary Visual Variable
Shape Map
Value Map
Color Function
Edge Map
Density Map
Direction Map
Negative Space Map
Camera Map
Texture / Medium Map
Read Order
Character–World Relationship
State Position
Reusable Rule
Anti-Rule
Reconstruction Constraint
```

The analysis chain is:

```text
WHAT
→ HOW
→ WHY
→ REUSABLE RULE
→ HOW TO REBUILD
```

Avoid descriptions such as “beautiful blue-purple comic style.” Describe mechanisms that can survive removal of the original IP.

## Constraint Reconstruction

The test for understanding is: **keep the mechanism, remove the surface identity**.

Five levels:

1. Change the character
2. Change the world
3. Change the palette
4. Change the medium
5. Ban all recognizable surface features; retain only narrative verb, primary variable, hierarchy, and sequence rule

Score reconstruction on two separate axes:

- Surface Similarity
- Mechanism Similarity

The target is low surface similarity and high mechanism similarity.

## Concept Art Reconstruction Pipeline

```text
01 Brief
02 Narrative Verb
03 Primary Visual Variable
04 Composition Thumbnail
05 Shape Map
06 Value Structure
07 Edge / Direction / Negative Space
08 Color Function
09 Medium / Texture
10 Polish + Consistency Check
```

### Brief

Define:

- Narrative Situation
- Character State
- Desired Viewer Response
- Visual Priority

### Thumbnail

Use 3–7 large shapes. Do not draw details. Solve spatial logic first.

### Shape

Ask whether the character is acting as Anchor, Cutter, Floater, Compressed Object, Expanding Force, or Misfit Shape.

### Value

Create two-value and three-value versions before color. Treat contrast as a limited attention budget.

### Edge / Direction / Negative Space

These form the **Visual Traffic System**:

- Edge tells the eye where to stop.
- Direction tells the eye where to move.
- Negative Space tells the eye where to breathe.

### Color

Assign jobs before hues:

- Base Field
- Identity
- Conflict
- Bridge
- Accent

### Medium

Choose medium behavior, not medium labels. Ask what the material naturally does: bleed, fracture, misregister, align, smear, repeat, erase, accumulate, or stabilize.

### Polish

Polish is not “more detail.” Check hierarchy, shape integrity, edge discipline, texture frequency, color function, and camera consistency.

## AI Concept Art Prompt Architecture

Use six layers:

```text
1. Narrative Function
2. Primary Variable
3. Composition
4. Hierarchy
5. Visual Behavior
6. Surface Treatment
```

Example mechanism-oriented structure:

```text
Narrative: a character realizes the surrounding space is no longer under their control.
Primary variable: spatial compression.
Composition: small protagonist, large architectural masses, progressively fewer visible escape routes.
Hierarchy: first read protagonist, second read narrowing path, third read crowd mass.
Behavior: preserve protagonist silhouette while merging secondary figures into broad value groups.
Surface: apply the chosen medium only after structural rules are clear.
```

## Anti-rule prompting

Add narrative negative rules, not only technical negatives.

Examples:

- Do not fill every area with equal detail.
- Do not use random motion directions.
- Do not soften the entire image uniformly.
- Do not destroy the identity silhouette.
- Do not let texture override pose clarity.

## Priority prompting

Separate prompt content into:

```text
MUST
SHOULD
OPTIONAL
```

This protects hierarchy when generative models treat descriptors too equally.

## Style Stack

```text
Narrative Layer
↓
Composition Layer
↓
Shape Layer
↓
Value Layer
↓
Edge Layer
↓
Color Layer
↓
Medium Layer
↓
Texture Layer
↓
Polish Layer
```

Surface imitation usually copies only the bottom three layers. Structural understanding begins at the top.

## Bidirectional development

```text
Character Bible
→ Narrative State
→ Concept / Sequence
→ Constraint Test
→ Sequence Test
→ Bible Update
```

The Bible guides production, and production validates the Bible.
