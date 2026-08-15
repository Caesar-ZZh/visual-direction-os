# 05 — Skill Calibration Notes

These notes define how the evidence-calibrated corpus should change `skills/narrative-visual-director/`.

## Current v1 Skill failure modes

1. **Style-family shortcut** — “Spider-Verse / Brooklyn” collapsed into neon, graffiti, sunset, water towers and halftone.
2. **Identity preservation too literal** — realistic face/body construction survived underneath stylization.
3. **Source framing over-preserved** — relationship and world grammar could not re-author the camera/composition.
4. **Palette before mechanism** — pink/blue/purple could be applied without correct territory/ownership behavior.
5. **Global texture filter** — halftone/paint/grain were treated as whole-image style rather than surface assignments.
6. **Rendering Deconstruction missing** — the system described what to add but not what realism to remove.
7. **Automatic style escalation** — stronger emotion tended to trigger more blur, color, texture and effects even when the reference sequence holds its visual grammar.
8. **Face-centric identity** — the Skill over-protected facial similarity even when the reference beat communicates identity through silhouette, posture, color or gesture.
9. **Equal-detail rendering** — every visible person tended to receive similar rendering detail instead of focal/function-based allocation.
10. **Simplification by deletion** — environments tended to become empty/generic instead of preserving lived-in specificity through hierarchy compression.
11. **Cartoonization by softness** — reducing realism often meant softening the face instead of separating landmark precision from skin-surface realism.
12. **Shot-local palette reset** — cuts could lose established character/world color memory instead of carrying role-color and residue forward.

## New mandatory planning stages

```text
Photo / Brief Reading
↓
Narrative State
↓
Character × World Relation
↓
Composition Re-Authoring
↓
Shot / Reverse-shot Role Continuity
↓
Emotional Carrier Selection
↓
Rendering Deconstruction + Focal Detail Assignment
↓
Environment Detail Strategy
↓
Shape + Value Structure
↓
World Field Color + Subject Role Color + Color Memory
↓
Edge Script
↓
Surface-specific Medium Assignment
↓
Temporal / Motion behavior if applicable
↓
Generation
↓
Mechanism QA
```

## Composition Re-Authoring

The Skill must distinguish:

- identity anchors to preserve;
- pose information to preserve;
- camera geometry that may change;
- subject scale that may change;
- foreground occluders that may be introduced or simplified;
- background information that may be suppressed/reconstructed.

Evidence across Batches 001–004 shows that relational meaning may depend on foreground scale, occlusion, plane separation, frame-within-frame architecture, camera reversal and the energy of the space between characters. Preserving a source photograph's framing can therefore be incompatible with the target mechanism.

## Emotional Carrier Selection

Before rendering, choose one or more **lead emotional carriers**:

- face / gaze / micro-expression;
- composition / subject scale;
- foreground-background depth;
- architectural boundary;
- body orientation;
- hand gesture;
- object interaction;
- color territory / temperature ownership;
- color residue / off-screen presence;
- edge redistribution;
- subject detail suppression;
- environment hierarchy compression;
- character presence / absence;
- motion / temporal irregularity.

Then explicitly mark other channels as **held** or **suppressed**.

Batches 003–004 provide direct evidence for **Parameter Dominance Rotation** and held-channel discipline:

```text
face / gaze
→ spatial staging + scale
→ hand gesture
→ facial reaction
→ back silhouette + object interaction
```

At `B004-005`, a single open-palm change carries the relational beat while camera, depth, palette and texture remain stable. The Skill should not intensify every channel just because the emotional state becomes stronger.

### Gesture-led beat fields — added after Batch 004

- `gesture_role`
- `gesture_salience`
- `gesture_shape_change`
- `held_visual_channels`

A small hand/body change may be more faithful than adding global color or texture intensity.

## Shot / Reverse-shot Role Continuity

A scene's visual grammar should preserve **relational roles**, not exact camera placement.

Evidence:

- one shot gives Gwen the dominant cool foreground and George the small warm rear plane;
- the reverse angle gives George the dominant foreground mass and Gwen the smaller cool closet plane;
- the later wide shot preserves George as a warm island and Gwen as a cool/bright island across a subdued middle field.

Add planning fields:

- `shot_reverse_shot_role_continuity`
- `foreground_dominance_owner`
- `relationship_depth_role`
- `architectural_partition_role`
- `middle_field_energy`
- `chromatic_island_roles`

A camera reversal or widening is allowed to change subject scale and foreground ownership while keeping the relationship legible.

## Focal Detail Assignment

Reality Suppression is not only an environment operation.

A foreground person may be simplified into:

```text
Shape + Value + Occlusion + Temperature
```

if their function is mainly framing or pressure. Detail should be allocated according to **narrative/focal function**, not visibility or screen size.

Add:

- `foreground_occluder_mass`
- `focal_detail_assignment`
- `non_focal_character_suppression`

Do not force equal facial/anatomical detail on all visible people.

## Environment Detail Strategy — added after Batch 004

Detail Suppression must not mean automatic object removal.

`B004-011` retains a lived-in bedroom full of books, posters, shelves, a drum, clothes and furniture. Perceptual simplicity is achieved by **hierarchical compression**:

```text
retain object specificity
→ group non-focal props by value
→ compress chroma range
→ lower local contrast
→ soften / lose non-essential edges
→ reduce contour density
→ reserve strong separation for focal subjects
```

Add:

- `environment_detail_strategy: compress | delete | retain`
- `environment_object_density`
- `non_focal_value_bandwidth`
- `non_focal_chroma_bandwidth`
- `environment_edge_authority`
- `lived_in_specificity_required`

This is critical for future Brooklyn/Miles calibration. A lived-in city or bedroom must not become generic simply because the image is graphic.

## Multi-channel Identity Preservation

Identity preservation must not mean “keep the face visible and realistic.”

Protected identity channels may include:

- face landmarks;
- hair silhouette;
- head/neck shape;
- body proportion;
- posture;
- garment mass;
- hand gesture;
- motion signature;
- color anchor;
- negative-space relationship.

A back-facing subject is valid when 2–3 or more non-face anchors remain strong.

Add:

- `non_face_identity_anchors`
- `identity_channel_count`
- `face_visibility_required: true/false`

## Facial landmark precision vs surface realism — added after Batch 004

Do not cartoonize a face by globally softening it.

`B004-008–009` show a stronger model: George retains crisp brows, eyes, nose, mouth, jaw and hand geometry while continuous skin description is simplified into broad warm planes.

Separate these controls:

- `facial_landmark_precision`
- `facial_plane_abstraction`
- `facial_surface_realism`
- `skin_surface_detail`
- `continuous_skin_gradient_suppression`
- `selective_facial_edge_authority`

Preferred construction:

```text
identity landmarks
→ graphic facial geometry
→ broad value/color planes
→ reduce continuous skin gradients
→ preserve selected crisp landmarks
→ allow environment/surfaces to use different medium behavior
```

A successful stylized face may be **more precise in landmarks and less realistic in surface modeling at the same time**.

## Color Memory / Off-screen Presence — added after Batch 004

Do not recompute color independently for every shot.

After a relationship territory is established, a color field may persist when its associated character leaves frame. Batch 004 suggests a pale warm field remains near Gwen after George is off-screen; this interpretation is still provisional, but the system should be capable of representing it.

Add:

- `offscreen_presence_color_residue`
- `color_memory_hold`
- `prior_shot_color_roles`
- `residual_color_territory`

Planning model:

```text
establish character/world color role
→ cut / remove character
→ decide whether role-color persists, migrates, decays or disappears
→ preserve scene memory intentionally
```

## New Visual Plan fields

Add or promote:

- `reality_suppression`
- `controlled_flattening`
- `detail_suppression_subject`
- `detail_suppression_environment`
- `environment_detail_strategy`
- `environment_object_density`
- `lived_in_specificity_required`
- `facial_plane_abstraction`
- `facial_landmark_precision`
- `facial_surface_realism`
- `skin_surface_detail`
- `continuous_skin_gradient_suppression`
- `value_massing`
- `depth_treatment`
- `line_strategy`
- `surface_assignments`
- `world_field_color`
- `subject_temperature_role`
- `color_ownership`
- `color_territory`
- `color_memory_hold`
- `offscreen_presence_color_residue`
- `edge_script_regions`
- `composition_reauthoring`
- `protected_readability_channels`
- `non_face_identity_anchors`
- `lead_emotional_carriers`
- `held_visual_channels`
- `gesture_role`
- `gesture_salience`
- `character_presence_strategy`
- `relationship_plane_assignments`
- `architectural_boundary_role`
- `middle_field_energy`
- `chromatic_island_roles`
- `visual_grammar_hold`
- `foreground_occluder_mass`
- `focal_detail_assignment`
- `shot_reverse_shot_role_continuity`

## Gwen / Earth-65 correction

Do **not** encode Earth-65 as:

```text
pink + purple + blue + watercolor + soft edges
```

And do **not** encode emotional escalation as:

```text
more emotion → softer face → more watercolor → more color
```

Instead plan:

```text
Relationship / Emotional Authority
→ Composition Territory
→ choose Emotional Carrier(s)
→ assign World Field Color + Subject Role Color
→ decide whether prior Color Memory persists
→ choose Environment Detail Strategy
→ decide which physical-description channels are suppressed
→ Selective Edge Redistribution
→ Readability Substitution
→ local medium behavior
```

Hue comes later.

### Important evidence-backed corrections

- Emotional close-ups may remain crisp.
- Color can be spatially assigned by relationship plane.
- A character can leave frame while the emotional field remains active.
- Shot/reverse-shot can invert scale dominance while preserving relational roles.
- A large foreground person may be intentionally low-detail.
- Gwen can remain readable with no visible face.
- Props may function as chromatic / value rhythm rather than descriptive inventory.
- A lived-in environment can retain many objects while compressing their perceptual hierarchy.
- A small hand gesture can carry a major emotional change while every other channel stays held.
- Facial landmark precision and realistic skin rendering are independent variables.
- Character-associated color may persist as scene memory after a cut; this remains provisional pending counterexample search.

## Visual Silence correction

Visual silence is not equivalent to desaturation, white emptiness, low contrast or no color. A saturated/painterly room can become quiet when the character exits and the camera holds.

## Brooklyn / Miles correction

Do **not** encode Brooklyn as a cyberpunk preset.

Future corpus research must separate ordinary lived-in Brooklyn reality, family/bedroom/school/street environments, rooftop depth, action, emotional scenes and Spider-Society collision behavior.

The likely target is closer to:

> **lived-in urban reality × graphic abstraction**

Batch 004 adds an important candidate production mechanism for that future calibration: **compress before delete**. Preserve lived-in object specificity while reducing its perceptual competition through value/chroma/edge hierarchy. This remains a transfer hypothesis until Miles/Brooklyn frames are systematically reviewed.

## QA changes

Generation QA must independently score:

1. Identity Anchor Preservation
2. Non-face Identity Coverage
3. Composition Mechanism
4. Shot/Reverse-shot Role Continuity
5. Shape Simplification
6. Value Massing
7. Rendering Deconstruction
8. Focal Detail Assignment
9. Environment Hierarchy Compression
10. Lived-in Specificity Preservation
11. Facial Landmark Precision
12. Facial Surface Realism Suppression
13. Primary Visual Variable
14. World Field / Subject Role Color
15. Color Ownership / Territory
16. Color Memory Continuity
17. Edge Script
18. Surface-specific Medium Coherence
19. Readability Substitution
20. Emotional Carrier Fidelity
21. Gesture Fidelity
22. Held-Channel Discipline

### Hard failure

Fail and re-plan when:

- the image still reads as generic semi-realistic 3D after mentally removing color/texture;
- every emotional increase automatically increases saturation, texture or blur;
- all people and surfaces receive equal detail;
- weak source framing is preserved despite missing relationship geometry;
- a crisp face is softened without evidence that face-detail suppression is the intended carrier;
- the face is over-protected when the beat would work better through silhouette/posture/gesture;
- one global palette replaces spatial or character-relative color ownership;
- cartoonization leaves continuous realistic skin gradients beneath a surface filter;
- a lived-in environment becomes empty/generic when compression could preserve specificity;
- a small gesture-led beat is drowned by unnecessary FX;
- camera widening or cutting resets established color roles without narrative reason.

## Revision timing

Do not lock a final v2 Skill from Earth-65 alone. Representative evidence is still required for Miles/Brooklyn daily and action, Hobie, Miguel/Spider Society, Mumbattan, cross-character close-up rendering, camera/composition families and motion/temporal FX.