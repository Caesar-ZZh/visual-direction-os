# 05 — Skill Calibration Notes

These notes define how the evidence-calibrated corpus should change `skills/narrative-visual-director/`.

The Skill must model **causal visual mechanisms**, not a surface style recipe. Spider-Verse evidence is promoted only when it changes an actual planning decision, parameter, constraint or QA test.

## Current failure modes

1. **Style-family shortcut** — reducing a world/character to palette, graffiti, halftone, watercolor or collage keywords.
2. **Identity preservation too literal** — realistic face/body construction survives under a style filter.
3. **Source framing over-preserved** — composition cannot be re-authored to express relationship/state.
4. **Palette before mechanism** — hue is chosen before color ownership, territory and role.
5. **Global texture filter** — material/pattern/marks leak across unrelated surfaces.
6. **Rendering Deconstruction missing** — the system knows what to add but not what realism to suppress.
7. **Automatic escalation** — stronger emotion/action automatically means more saturation, blur, texture and FX.
8. **Face-centric identity** — the face is protected even when silhouette/posture/gesture is the real carrier.
9. **Equal-detail rendering** — every visible surface/person receives similar descriptive authority.
10. **Simplification by deletion** — lived-in environments become empty instead of hierarchically compressed.
11. **Cartoonization by softness** — realism is reduced by blurring faces instead of redesigning planes/gradients.
12. **Shot-local palette reset** — cuts forget established color roles/residue.
13. **Single-medium assumption** — diegetic scene, editorial overlay, nested media and local notation are collapsed into one render layer.
14. **Action-detail rigidity** — environment detail stays constant regardless of velocity/readability demand.
15. **Global glow shortcut** — cyan/magenta bloom becomes a world filter instead of belonging to sources.
16. **Event-as-particle-layer** — explosions/major events are added on top of an unchanged base render with no attack/hold/recovery logic.

## Mandatory planning chain

```text
Narrative State
↓
Character × World Relation
↓
Composition Re-Authoring
↓
Carrier Selection / Handoff
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
Representational Layer Assignment
↓
Motion-state Detail Budget
↓
Source-owned Light / FX Assignment
↓
Event Render Mode if needed
↓
Generation
↓
Mechanism QA
```

---

## Composition Re-Authoring

Preserve meaning, not weak source framing. Track:

- identity anchors to preserve;
- pose/body orientation;
- subject scale;
- foreground dominance/occlusion;
- depth-plane roles;
- architectural partitions;
- negative-space pressure;
- camera geometry that may be changed.

### Fields

- `composition_reauthoring`
- `foreground_dominance_owner`
- `relationship_depth_role`
- `architectural_partition_role`
- `foreground_occluder_mass`
- `middle_field_energy`
- `chromatic_island_roles`
- `shot_reverse_shot_role_continuity`

---

## Emotional / Narrative Carrier Selection

Choose a lead carrier per beat and mark competing channels held/suppressed.

Possible carriers include:

- face / gaze / micro-expression;
- composition / scale / depth;
- boundary / architecture;
- body orientation;
- hand gesture;
- object interaction;
- object memory / nested media;
- color territory / residue;
- edge redistribution;
- environment hierarchy;
- presence / absence;
- silhouette / trajectory;
- diegetic light;
- event-specific rendering.

### Fields

- `lead_emotional_carriers`
- `held_visual_channels`
- `gesture_role`
- `gesture_salience`
- `object_interaction_salience`
- `carrier_handoff_sequence`
- `prior_carrier_residue`
- `next_carrier_activation`
- `memory_object_to_action_handoff`
- `carrier_causality`

---

## Focal Detail / Environment Detail

Detail is assigned by narrative function, not visibility.

### Environment strategy

```text
retain specificity
→ compress value bandwidth
→ compress chroma bandwidth
→ reduce local contrast
→ lose non-essential contours
→ preserve focal separation
```

Use:

- `environment_detail_strategy: compress | delete | retain`
- `environment_object_density`
- `non_focal_value_bandwidth`
- `non_focal_chroma_bandwidth`
- `environment_edge_authority`
- `lived_in_specificity_required`
- `focal_detail_assignment`
- `non_focal_character_suppression`

### Motion-state extension — BATCH-007/008

B007 proves that high-speed readability may require **less** environment; B008 proves that description can return as motion pressure drops.

```text
velocity/readability pressure ↑
→ environment detail ↓
→ silhouette / trajectory authority ↑

velocity/readability pressure ↓
→ location/object/institution detail may re-enter
```

Add:

- `motion_readability_substitution`
- `trajectory_line_priority`
- `environment_suppression_for_velocity`
- `directional_world_field`
- `world_streak_orientation`
- `silhouette_complexity_budget`
- `city_detail_reentry`
- `detail_reentry_trigger`
- `velocity_detail_budget`
- `world_detail_recovery`

---

## Multi-channel Identity Preservation

Identity may survive through:

- face landmarks;
- hair/head silhouette;
- body proportion/posture;
- garment mass;
- hand gesture;
- motion signature;
- costume accent/pattern;
- color anchor;
- negative-space relation.

A hidden/back-facing face is valid when enough stronger anchors remain.

### Fields

- `protected_readability_channels`
- `non_face_identity_anchors`
- `identity_channel_count`
- `face_visibility_required`
- `identity_anchor_persistence`

### Identity Activation — BATCH-007

Gwen's suit-up peak is readable through direct eyes, symmetry, hood/hand framing and costume closure without global transformation FX.

Add:

- `identity_activation_transition`
- `activation_geometry`
- `activation_fx_budget`

---

## Facial Landmark Precision ≠ Surface Realism

Separate:

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
→ broad color/value planes
→ suppress continuous skin gradients
→ preserve selected crisp landmarks
```

B008 adds a useful non-Gwen confirmation: an institutional officer remains highly specific under strong magenta/cool-blue source lighting because landmarks stay crisp while surface modeling is broad.

---

## Color Ownership / Memory

Do not encode Earth-65 as `pink + purple + blue + watercolor`.

Plan:

```text
Narrative / Relationship State
→ World Field Color
→ Subject Role Color
→ Territory / Boundary
→ Memory / Migration / Merge
→ Hue
```

Add/retain:

- `world_field_color`
- `subject_temperature_role`
- `color_ownership`
- `color_territory`
- `color_memory_hold`
- `offscreen_presence_color_residue`
- `prior_shot_color_roles`
- `residual_color_territory`
- `relational_color_merge`
- `color_territory_state`

Painterly bloom is event-driven, not constant:

- `painterly_bloom_trigger`
- `bloom_intensity`
- `bloom_target`
- `bloom_decay`
- `post_event_structure_recovery`
- `color_memory_after_bloom`

---

## Surface-specific Medium Assignment

Pattern and texture belong to surfaces/functions, not to the whole frame.

Add:

- `surface_assignments`
- `costume_surface_pattern_assignment`
- `pattern_region_mask`
- `pattern_density_by_surface`

**Hard failure:** costume motifs/halftone/hatching leaking indiscriminately into skin, sky, architecture or unrelated props.

---

## Representational Layers — BATCH-006 onward

The Skill must separate:

1. **Diegetic Camera Layer**
2. **Screen-space Editorial Layer**
3. **Local Graphic FX Layer**
4. **Nested Media / Object-memory Layer**
5. **Event Render Layer**

### Editorial / nested fields

- `editorial_overlay_panels`
- `screen_space_attention_layer`
- `inset_scale_ratio`
- `panel_border_medium`
- `diegetic_view_hold`
- `memory_object_anchor`
- `nested_media_role`
- `absent_character_reference`
- `object_detail_priority`
- `nested_medium_foreshadowing`
- `evidence_object_medium`
- `identity_medium_preview`

B008 shows that a rough illustrated Vulture dossier image can coexist inside crisp typed police paperwork. Embedded media must remain independently controllable from the host material.

---

## Local Graphic FX: Spatial + Temporal Envelope

Local marks need explicit target, radius and time behavior.

Add:

- `local_graphic_fx_target`
- `fx_spatial_scope`
- `fx_trigger_event`
- `fx_decay`
- `local_fx_attack`
- `local_fx_hold`
- `local_fx_decay`
- `base_grammar_persistence`

B006 fingertip punctuation, B007 police-radio signal rays and B008 hand-contact zigzags all argue against global comic notation.

---

## Diegetic Vector Light / Source-owned Bloom — added after BATCH-008

Lighting can be a composition system rather than only illumination.

### Attention Funnel

```text
subject orientation
+ diegetic light-vector direction
+ target contrast
+ depth convergence
→ attention lock
```

Add:

- `diegetic_vector_light`
- `light_cone_target`
- `attention_funnel`

### Source-owned bloom

Every intense bloom/streak needs a source and region mask.

Add:

- `source_owned_bloom`
- `bloom_region_mask`
- `siren_streak_orientation`

**Hard failure:** global magenta/cyan emergency glow with no source ownership.

---

## Event Render Override — added after BATCH-008

A major event may temporarily own the rendering system.

```text
BASE GRAMMAR
→ EVENT ATTACK
→ EVENT HOLD
→ BASE RECOVERY
```

Add:

- `event_render_mode`
- `event_render_attack`
- `event_render_hold`
- `event_render_recovery`
- `base_grammar_recovery`

The event layer is not simply extra particles. It can suppress normal world description, change value architecture, change edge authority and temporarily introduce another shape/medium grammar.

### Explosion Shape Grammar

B008-023 shows a plume constructed from discrete dark scalloped/rosette lobes with cream/gold nested contours rather than continuous photoreal volume.

Add:

- `explosion_cloud_shape_grammar`
- `plume_lobe_scale`
- `graphic_smoke_edge_mode`

Plan:

```text
plume silhouette
→ lobe hierarchy
→ contour rhythm
→ value grouping
→ edge mode
→ debris integration
```

---

## Consolidated Visual Plan fields

The v2 schema should now explicitly cover at least:

- narrative / relationship state;
- primary visual variable;
- carrier + carrier handoff;
- composition re-authoring;
- depth / boundary / occlusion roles;
- reality suppression / controlled flattening;
- focal and environmental detail strategies;
- velocity-driven detail budget + recovery;
- facial landmark vs surface realism controls;
- multi-channel identity anchors;
- world-field / subject-role color + color memory;
- edge script;
- surface-specific medium assignment;
- editorial overlay / nested media layers;
- local FX spatial-temporal envelope;
- diegetic vector light;
- source-owned bloom;
- event render attack/hold/recovery;
- event-specific shape grammar.

---

## QA changes

Generation QA should independently score:

1. Identity Anchor Preservation
2. Non-face Identity Coverage
3. Composition Mechanism
4. Role Continuity
5. Shape Simplification
6. Value Massing
7. Rendering Deconstruction
8. Focal Detail Assignment
9. Environment Hierarchy Compression
10. Velocity Detail Budget
11. Detail Re-entry / Recovery
12. Facial Landmark Precision
13. Facial Surface Realism Suppression
14. Primary Visual Variable
15. Color Ownership / Territory / Memory
16. Edge Script
17. Surface-specific Medium Coherence
18. Representational-layer Separation
19. Readability Substitution
20. Carrier Fidelity / Handoff
21. Held-channel Discipline
22. Local FX Scope + Envelope
23. Diegetic Light Direction
24. Bloom Source Ownership
25. Event Render Phase
26. Base Grammar Recovery
27. Event Shape Grammar

### Hard failures

Fail and re-plan when:

- the image still reads as generic semi-realistic 3D after mentally removing color/texture;
- stronger emotion/action automatically adds more blur/saturation/FX;
- all people/surfaces receive equal detail;
- a lived-in environment becomes empty when hierarchy compression could preserve specificity;
- a face is softened instead of restructured through planes/gradient suppression;
- identity is over-dependent on face visibility;
- one global palette replaces spatial/role-based color ownership;
- costume/halftone/graphic motifs leak across unrelated surfaces;
- editorial panels or nested media are flattened into the base diegetic medium;
- local comic marks spread across the whole frame;
- environment detail stays constant through large velocity changes;
- emergency bloom has no identifiable source;
- non-diegetic arrows are used when diegetic light already provides the attention vector;
- an explosion is merely a particle overlay and never changes rendering authority;
- event rendering fails to recover to the base grammar;
- smoke defaults to smooth photoreal volumetrics when the evidence calls for graphic shape grammar.

## Revision timing

Do not lock a final v2 Skill from Earth-65 alone. Representative evidence is still required for Miles/Brooklyn daily and action, Hobie, Miguel/Spider Society, Mumbattan, world collision, climax/authorship and cross-world counterexamples to the mechanisms above.