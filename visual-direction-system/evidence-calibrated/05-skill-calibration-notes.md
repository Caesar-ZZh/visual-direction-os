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
Shape + Value Structure
↓
World Field Color + Subject Role Color
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

Evidence across Batches 001–003 shows that relational meaning may depend on foreground scale, occlusion, plane separation, frame-within-frame architecture and camera reversal. Preserving a source photograph's framing can therefore be incompatible with the target mechanism.

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
- edge redistribution;
- subject detail suppression;
- environment detail suppression;
- character presence / absence;
- motion / temporal irregularity.

Then explicitly mark other channels as **held** or **suppressed**.

Batch 003 supplies direct evidence for **Parameter Dominance Rotation**:

```text
face / gaze
→ spatial staging + scale
→ hand gesture
→ facial reaction
→ back silhouette + object interaction
```

The Skill should not intensify every channel just because the emotional state becomes stronger.

## Shot / Reverse-shot Role Continuity — added after Batch 003

A scene's visual grammar should preserve **relational roles**, not exact camera placement.

Evidence:

- one shot gives Gwen the dominant cool foreground and George the small warm rear plane;
- the reverse angle gives George the dominant foreground mass and Gwen the smaller cool closet plane;
- the relational polarity remains coherent.

Add planning fields:

- `shot_reverse_shot_role_continuity`
- `foreground_dominance_owner`
- `relationship_depth_role`
- `architectural_partition_role`

A camera reversal is allowed to change subject scale and foreground ownership while keeping the relationship legible.

## Focal Detail Assignment — added after Batch 003

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

## Multi-channel Identity Preservation — added after Batch 003

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

## New Visual Plan fields

Add or promote:

- `reality_suppression`
- `controlled_flattening`
- `detail_suppression_subject`
- `detail_suppression_environment`
- `facial_plane_abstraction`
- `value_massing`
- `depth_treatment`
- `line_strategy`
- `surface_assignments`
- `world_field_color`
- `subject_temperature_role`
- `color_ownership`
- `color_territory`
- `edge_script_regions`
- `composition_reauthoring`
- `protected_readability_channels`
- `non_face_identity_anchors`
- `lead_emotional_carriers`
- `held_visual_channels`
- `character_presence_strategy`
- `relationship_plane_assignments`
- `architectural_boundary_role`
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
- Props such as wardrobe clothing may function as chromatic rhythm rather than descriptive inventory.

## Visual Silence correction

Visual silence is not equivalent to desaturation, white emptiness, low contrast or no color. A saturated/painterly room can become quiet when the character exits and the camera holds.

## Brooklyn / Miles correction

Do **not** encode Brooklyn as a cyberpunk preset.

Future corpus research must separate ordinary lived-in Brooklyn reality, family/bedroom/school/street environments, rooftop depth, action, emotional scenes and Spider-Society collision behavior.

The likely target is closer to:

> **lived-in urban reality × graphic abstraction**

but this remains an evidence hypothesis until the Miles/Brooklyn batches are systematically reviewed.

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
9. Primary Visual Variable
10. World Field / Subject Role Color
11. Color Ownership / Territory
12. Edge Script
13. Surface-specific Medium Coherence
14. Readability Substitution
15. Emotional Carrier Fidelity
16. Held-Channel Discipline

### Hard failure

Fail and re-plan when:

- the image still reads as generic semi-realistic 3D after mentally removing color/texture;
- every emotional increase automatically increases saturation, texture or blur;
- all people and surfaces receive equal detail;
- weak source framing is preserved despite missing relationship geometry;
- a crisp face is softened without evidence that face-detail suppression is the intended carrier;
- the face is over-protected when the beat would work better through silhouette/posture/gesture;
- one global palette replaces spatial or character-relative color ownership.

## Revision timing

Do not lock a final v2 Skill from Earth-65 alone. Representative evidence is still required for Miles/Brooklyn daily and action, Hobie, Miguel/Spider Society, Mumbattan, cross-character close-up rendering, camera/composition families and motion/temporal FX.