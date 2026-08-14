# 01 — Annotation Taxonomy

This schema mirrors the Google Drive **Spider-Verse Frame Atlas — Master Manifest**. It is designed for complete corpus review rather than cherry-picked style references.

## Frame identity

`Frame_No` · `Source_File_ID` · `Source_File_Name` · `Source_URL` · `Source_Timecode` · `Extraction_Timestamp` · `Scene_Cluster_ID` · `Shot_Cluster_ID` · `Review_Status` · `Review_Level` · `Confidence`

Important: the timestamp inside the screenshot filename may be an extraction timestamp rather than true movie timecode. Do not silently equate the two.

## Character / world / narrative

`World_Primary` · `World_Secondary` · `Location` · `Character_Tags` · `Character_Dominance` · `World_Dominance` · `Narrative_Beat` · `Narrative_State` · `Scene_Function` · `Emotion_Visible` · `Relationship_Dynamic`

Canonical state machine:

```text
Baseline → Pressure → Crisis → Decision → Agency → Resolution
```

Visible emotion and narrative state are separate fields.

## Camera / composition / space

`Shot_Size` · `Camera_Angle` · `Camera_Orientation` · `Camera_Motion` · `Projection_Perspective` · `Composition_Type` · `Subject_Scale` · `Depth_Model` · `Spatial_Pressure` · `Negative_Space` · `Figure_Ground`

Useful composition tags include:

- centered
- asymmetrical
- diagonal
- frame-within-frame
- foreground-occlusion
- two-plane
- crowd-field
- silhouette-field
- negative-space-led

Projection is tracked separately from color stylization:

- natural
- exaggerated
- compressed
- flattened
- warped
- multi-perspective

## Shape / value

`Shape_Grammar` · `Silhouette_Strength` · `Value_Architecture` · `Lighting_Model`

**Value Massing** asks whether the image organizes light/dark as continuous shading, grouped planes, blocky masses, silhouette dominance, high-key fields or low-key fields.

## Rendering Deconstruction

`Reality_Suppression` · `Controlled_Flattening` · `Detail_Suppression` · `Line_Strategy`

Deep analysis additionally tracks:

- Shape Simplification
- Facial Plane Abstraction
- Value Massing
- Depth Suppression
- Contour Strategy
- Surface Heterogeneity
- 2D / 3D Relationship
- Physical vs Psychological Lighting

### Reality Suppression
Degree to which realistic physical description is intentionally replaced by graphic/narrative abstraction.

### Controlled Flattening
Reduction of 3D form/depth into deliberately readable graphic planes. This can coexist with 3D geometry.

### Detail Suppression
Removal of physically available detail to protect hierarchy, emotion, speed or graphic clarity.

### Facial Plane Abstraction
Degree to which the face is constructed from designed planes instead of continuous realistic skin shading. It is **not** equivalent to larger cartoon eyes.

## Edge / color

`Edge_Hierarchy` · `Color_Family` · `Color_Ownership` · `Color_Territory` · `Saturation_Level`

Edge hierarchy:

- hard-dominant
- mixed
- soft-dominant
- lost-edge-heavy
- polarized

Color Ownership candidates:

- character
- relationship
- world
- institution
- threat
- memory
- mixed / uncertain

Color Territory describes how much perceptual territory a color owner controls, not how saturated it is.

## Texture / print / surface

`Texture_Medium` · `Texture_Frequency` · `Halftone` · `Hatching` · `CMYK_Misregistration` · `Glitch_Distortion`

Important distinctions:

- **Halftone** is recorded as `none / local / structural / dominant`; never assumed globally.
- **CMYK Misregistration** means intentional color-plate displacement, not generic lens-style chromatic aberration.
- **Texture Frequency** = size/frequency of texture marks, not amount of texture.
- **Surface Heterogeneity** records whether face, clothing, environment and FX have different medium treatments. This is central to distinguishing the film from a global “comic filter”.

## Motion / time / mechanism

`Temporal_Effect` · `Motion_Energy` · `Primary_Visual_Variable` · `Secondary_Visual_Variables`

Temporal tags include:

- smear
- echo
- duplicate
- desync
- stepped
- registration-change
- glitch

Primary Visual Variable is **scene-specific**, not a permanent character style label. Candidate variables include space, direction, boundary, edge, color, time, medium, focus, visibility, density, scale and value.

## Evidence / curation

`Representative_Score` · `Curated_Set_Tags` · `Observed_Notes` · `Deep_Analysis_Link`

Representative Score measures diagnostic evidence value, not beauty:

- 1–7: ordinary supporting frame
- 8–9: strong curated reference
- 10: unusually diagnostic / mechanism-defining frame

## Review hierarchy

| Level | Requirement |
|---|---|
| L1 | Every frame: census annotation and cluster assignment. |
| L2 | Meaningful visual change or strong reference. |
| L3 | Full forensic analysis + evidence-ledger rule extraction. |

The final corpus must preserve both representative frames and counterexamples.