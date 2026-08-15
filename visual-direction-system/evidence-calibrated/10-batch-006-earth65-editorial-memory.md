# BATCH-006 — Earth-65 Editorial Layers, Object Memory & Carrier Handoff

## Audit status

- Source: Sorted-by-Scene corpus, Scene 2 — `Investigate Vulture - Gwen Meets Jess`.
- Extraction window: `01:42:00–01:42:23`.
- Adaptive batch size: **24 frames** because this is a high-change segment; the review was intentionally closed at a natural mechanism boundary instead of forcing 48.
- Frames individually loaded and visually reviewed: **24 / 24**.
- L1 annotations: **24 / 24**.
- L2 change points: **9**.
- Deep diagnostic frames: **6** (`01:42:00`, `01:42:10`, `01:42:14`, `01:42:19`, `01:42:21`, `01:42:22`).
- Scene cluster: `SCN-E65-002`.
- Shot clusters: `SHOT-E65-002A` through `SHOT-E65-002J`.

Every counted image was individually opened. The contact sheet was used only for sequence-level comparison after the individual frame pass.

## Sequence architecture

### A · 01:42:00–01 · Foreground narrative-domain re-entry

The reconciled Gwen/George pair is seen behind oversized police/institutional equipment in the extreme foreground. The objects have far more screen area than the characters. This is not neutral clutter: the composition introduces another narrative system into the domestic field before the scene fully moves away from reconciliation.

### B · 01:42:02–07 · Held father-daughter exchange

Gwen dominates the cool right foreground while George remains warmer and slightly deeper at left. The architecture, subject scales and color roles remain largely stable while brow, eye, mouth, head and hand changes carry the exchange.

This continues the evidence for **held visual grammar**, but also shows how a reconciled relationship can retain local differentiation without reverting to the earlier hard relational boundary.

### C–E · 01:42:08–12 · Departure → solitary room → crisp reaction

George exits the shared exchange. The sequence gives Gwen a wide solitary frame, then returns to close facial reaction. Importantly, the strong painterly bloom seen at the hug peak has receded. The world remains magenta/violet/pink, but facial landmarks and architectural boundaries become structurally crisp again.

This supplies the missing back half of the previous `painterly_bloom_trigger` finding: **bloom has decay and structural recovery**.

### F · 01:42:13–15 · Screen-space editorial panels

The film stops behaving like a single camera view. Brush-framed inset images appear over the continuous bedroom shot and magnify object details while Gwen's full-body action remains visible in the diegetic layer.

Two depth systems coexist:

```text
Diegetic 3D / room perspective
+
Screen-space 2D editorial hierarchy
```

The inset can be physically impossible in scale and still feel correct because it is not pretending to be part of the room. It is an authored attention layer.

### G · 01:42:16–18 · Local comic punctuation

The large inserts disappear, but small magenta burst marks remain around the fingertip/object event. Crucially, the marks are local. Gwen's face, clothing, room and shelf do not suddenly receive equivalent comic FX.

The film therefore treats comic notation as **event-scoped syntax**, not a style filter.

### H–I · 01:42:19–21 · Object-memory relay and nested media

The live character leaves the frame. Drum/personal-object detail becomes the primary subject, followed by a photograph embedded inside that object field. The absent relationship is carried by possessions and image-within-image information rather than a live face.

### J · 01:42:22–23 · Object-to-face carrier handoff

A low-angle Gwen close-up receives expressive authority after the object/photo insert. The personal bedroom environment surrounds the portrait while Gwen's facial landmarks remain selective and crisp.

The emotional carrier has therefore migrated:

```text
relationship dialogue
→ solitary spatial field
→ editorial inset
→ touch/object event
→ personal-object close-up
→ nested photograph
→ facial reaction
```

This is broader than simple Parameter Dominance Rotation. It is **Carrier Handoff across representational modalities**.

## Frame-level distillation

| Frame | L1 observation |
|---|---|
| B006-001 / 01:42:00 | Oversized police radio/badge forms dominate foreground while Gwen and George remain smaller in the doorway; an external system enters the domestic field compositionally. |
| B006-002 / 01:42:01 | Foreground objects hold while the pair subtly shift; prop hierarchy remains dominant. |
| B006-003 / 01:42:02 | Gwen's cool hair/face dominates right while warmer George remains left-rear against a luminous doorway. |
| B006-004 / 01:42:03 | Expression and gaze progress inside stable scale/color architecture. |
| B006-005 / 01:42:04 | George's open hand becomes the local change while Gwen turns inward; no global FX escalation. |
| B006-006 / 01:42:05 | Warm rear field and cool Gwen anchor continue through dialogue. |
| B006-007 / 01:42:06 | Facial landmarks remain crisp over simplified chromatic planes. |
| B006-008 / 01:42:07 | A small gaze/head change carries the beat inside the held frame. |
| B006-009 / 01:42:08 | George turns away into the darker side while a high-key pink room opens behind him. |
| B006-010 / 01:42:09 | Gwen becomes a small isolated figure inside the bright room; a dark left mass amplifies spatial solitude. |
| B006-011 / 01:42:10 | Close Gwen returns to crisp landmark geometry after the preceding reconciliation bloom; diagonal light crosses a broad pink field. |
| B006-012 / 01:42:11 | Eyes/mouth change while background field is held. |
| B006-013 / 01:42:12 | Hair silhouette, eyes and simplified planes maintain identity as gaze changes. |
| B006-014 / 01:42:13 | A brush-framed screen-space inset appears over the bedroom, splitting attention without a conventional cut. |
| B006-015 / 01:42:14 | Two oversized insets magnify detail while a tiny magenta burst mark punctuates Gwen's fingertip. |
| B006-016 / 01:42:15 | Multi-scale composite hierarchy remains active over the diegetic room. |
| B006-017 / 01:42:16 | Return to single diegetic view; comic marks remain attached only to the touch event. |
| B006-018 / 01:42:17 | Local graphic punctuation persists without becoming a whole-frame treatment. |
| B006-019 / 01:42:18 | Object interaction remains lead carrier inside painterly but structurally legible rendering. |
| B006-020 / 01:42:19 | Personal drum/object cluster replaces the character as subject; curved violet forms redirect attention into possessions. |
| B006-021 / 01:42:20 | Tighter object view abstracts rim/metal forms into shape and value masses. |
| B006-022 / 01:42:21 | A photograph nested in the personal-object field becomes a direct memory anchor for an absent relationship. |
| B006-023 / 01:42:22 | Low-angle Gwen reaction hands emotional authority back from object to face. |
| B006-024 / 01:42:23 | Gaze/brow change continues inside a stable purple-peach personal environment. |

## Evidence-calibrated findings

### EV-E65-027 — Foreground Narrative Object

**OBSERVED:** institutional equipment occupies extreme foreground scale while the reconciled pair remains smaller and deeper.

**INFERRED:** props can introduce a new narrative domain before it becomes the explicit dialogue/action subject.

**GENERATIVE RULE:** support `foreground_narrative_object`, `narrative_domain_role`, and `prop_scale_authority`. Do not treat every foreground object as decoration.

### EV-E65-028 — Bloom Decay / Structural Recovery

**OBSERVED:** after the hug's high painterly bloom, magenta-violet world color persists but facial and architectural structure becomes cleaner again.

**GENERATIVE RULE:** model painterly behavior as `attack → hold → decay → structural recovery`, not as a permanent watercolor toggle.

### EV-E65-029 — Screen-space Editorial Layer

**OBSERVED:** brush-framed magnified insets coexist with the continuous diegetic room shot.

**INFERRED:** the film can temporarily create an attention hierarchy that is independent of physical perspective.

**GENERATIVE RULE:** separate `diegetic_camera_layer` from `screen_space_attention_layer`; plan `editorial_overlay_panels`, `inset_scale_ratio`, `panel_border_medium`, and explicit target detail.

### EV-E65-030 — Local Comic Punctuation

**OBSERVED:** small burst marks appear only around the fingertip/object event.

**GENERATIVE RULE:** bind graphic notation to `fx_trigger_event + local_graphic_fx_target + fx_spatial_scope + fx_decay`. Global comic-symbol spam is a failure mode.

### EV-E65-031 — Object Memory / Nested Media

**OBSERVED:** the sequence removes the live character, focuses on personal objects, and then centers a photograph inside the object field.

**GENERATIVE RULE:** allow `memory_object_anchor`, `nested_media_role`, `absent_character_reference`, and `object_detail_priority` to become lead emotional controls.

### EV-E65-032 — Cross-modal Carrier Handoff

**OBSERVED:** expressive authority moves from dialogue and space into editorial inserts, object interaction, nested media, then back to facial reaction.

**GENERATIVE RULE:** plan `carrier_handoff_sequence`, `prior_carrier_residue`, and `next_carrier_activation`. Continuity of meaning matters more than keeping every visual channel active.

## GitHub chapter impact

| Existing chapter | BATCH-006 impact |
|---|---|
| `01-master-framework.md` | Primary Visual Variable may be **Medium / Editorial Layer**, not only color, space, edge, focus or texture. |
| `02-character-system.md` | Character continuity can be maintained through possessions, nested media and absent-character reference. |
| `03-world-system.md` | World grammar includes state-triggered representational intervention, not only palette/rendering defaults. |
| `04-sequence-color.md` | Add bloom decay and cross-modal carrier handoff. |
| `05-production-system.md` | Separate diegetic pass, editorial overlay pass, local comic-FX pass and memory-object pass. |
| `06-project-worksheets.md` | Add fields for overlay panels, FX scope, memory anchors and carrier handoff. |
| `07-original-case-study.md` | Future reconstruction must prove triggered medium changes rather than applying one style stack everywhere. |
| `08-glossary.md` | Add Screen-space Editorial Layer, Carrier Handoff, Local Comic Punctuation, Nested Media, Bloom Decay. |
| `09-decision-tree.md` | Ask whether a cut is sufficient, whether detail needs magnification, and whether FX should be local or global. |
| `10-master-workflow.md` | Add Editorial Layer Planning and Carrier Handoff Planning. |
| `11-visual-qa.md` | Reject global comic filters, perpetual watercolor softness and overlay panels with no attention target. |

## Skill implications

Add/promote:

- `foreground_narrative_object`
- `narrative_domain_role`
- `prop_scale_authority`
- `painterly_bloom_trigger`
- `bloom_attack`
- `bloom_hold`
- `bloom_decay`
- `post_event_structure_recovery`
- `diegetic_camera_layer`
- `screen_space_attention_layer`
- `editorial_overlay_panels`
- `inset_scale_ratio`
- `panel_border_medium`
- `local_graphic_fx_target`
- `fx_trigger_event`
- `fx_spatial_scope`
- `fx_decay`
- `memory_object_anchor`
- `nested_media_role`
- `absent_character_reference`
- `object_detail_priority`
- `carrier_handoff_sequence`
- `prior_carrier_residue`
- `next_carrier_activation`

## QA additions

Hard-fail when:

1. every frame is globally 'comicized' instead of local notation being assigned to specific events;
2. Earth-65 is rendered with constant watercolor softness instead of stateful onset/decay;
3. a screen-space inset has no explicit target, attention purpose or scale logic;
4. an object-memory beat is forced back into a character close-up before the object has been allowed to carry meaning;
5. changing carriers causes narrative meaning to reset instead of hand off.

## Next boundary

Next unreviewed source frame in Scene 2: `01:42:24`.
