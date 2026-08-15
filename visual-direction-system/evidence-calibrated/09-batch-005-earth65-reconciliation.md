# BATCH-005 — Earth-65 Reconciliation: Boundary Collapse & Color Fusion

## Audit status

- Source: Sorted-by-Scene corpus, Scene 1 — `Start - Gwen Hugs Her Dad`.
- Extraction window: `01:41:22–01:41:59`.
- Frames discovered: **38**.
- Frames individually loaded and visually reviewed: **38 / 38**.
- L1 annotations: **38 / 38**.
- L2 change points: **8**.
- Deep diagnostic frames: **6** (`01:41:31`, `01:41:43`, `01:41:48`, `01:41:49`, `01:41:53`, `01:41:59`).
- Scene cluster: `SCN-E65-001`.
- Shot clusters: `SHOT-E65-001N` through `SHOT-E65-001R`.

No frame is counted here merely because a neighbor was reviewed. Every image in this source window was opened and visually inspected.

## Sequence architecture

### N — 01:41:22–01:41:30 · Packing / object interaction

George remains a small warm island at frame left while Gwen works in the cool right side of the bedroom. The room is visually dense but perceptually compressed: props remain recognizable without competing with the relationship. Packing, reaching and lifting belongings become the lead motion/performance channel while camera and color architecture largely hold.

### O — 01:41:31–01:41:42 · Explicit relational divider

The shot cuts to an extreme scale split: Gwen becomes a huge cool foreground face; George is small and warm in depth. A bright pale vertical architectural strip separates them. Across twelve frames, the dominant changes are gaze, eyelid, mouth and head-angle shifts. The geometric/color relationship is intentionally held.

### P — 01:41:43–01:41:48 · Hug / boundary collapse

The cut to physical contact is a structural visual event. Previously separate chromatic islands become one combined silhouette. As the embrace settles, pink-magenta-lavender painterly bloom rises and background description recedes. The painterly behavior is therefore not a constant world filter; it is strongly state-dependent in this sequence.

### Q — 01:41:49–01:41:52 · George close-up

George's brows, eyes, nose, mouth and selected contours stay crisp while his face is modeled with broad magenta/peach planes. Emotional peak does not require realistic skin gradients or facial dissolution.

### R — 01:41:53–01:41:59 · Gwen close-up inside the embrace

Gwen's hair and skin migrate into the shared peach-pink relational field, but cool blue eyes/clothing and stable facial/hair geometry preserve identity. George's burgundy torso and arm form a large, simplified enclosure around her, changing the semantic role of a body mass from pressure/occlusion to protection/nesting.

## Key observed change points

| Frame | Observed mechanism |
|---|---|
| B005-001 / 01:41:22 | Wide separated warm/cool islands; object-rich bedroom compressed into low-energy middle field. |
| B005-010 / 01:41:31 | Extreme subject-scale contrast + bright vertical divider makes relational separation explicit. |
| B005-022 / 01:41:43 | First hug: separate figures become a merged silhouette; boundary state changes. |
| B005-023 / 01:41:44 | Pink-lavender painterly bloom visibly increases after contact. |
| B005-027 / 01:41:48 | Full embrace: bloom + detail suppression + shared territory reach a local peak. |
| B005-028 / 01:41:49 | George: high facial landmark precision with strongly simplified facial surface modeling. |
| B005-032 / 01:41:53 | Gwen enters shared warm field while cool identity anchors survive. |
| B005-038 / 01:41:59 | Protective body framing + integrated relational color complete the sequence transition. |

## Evidence-calibrated findings

### EV-E65-020 — Relational Color Fusion

**OBSERVED:** before the embrace, George and Gwen occupy separated warm/cool territories; after contact, those territories overlap and the environment enters a shared pink/magenta/lavender field.

**INFERRED:** character-relative temperature ownership is conditional on relational state, not immutable.

**GENERATIVE RULE:** model color territory as a state machine: `separate → approach → overlap → shared`. Do not encode Gwen/George as permanently fixed cool/warm labels.

### EV-E65-021 — Boundary Collapse

**OBSERVED:** `01:41:31–42` repeatedly holds a bright vertical divider between an enormous foreground Gwen and small distant George. `01:41:43` replaces separation with physical contact and a combined silhouette.

**GENERATIVE RULE:** solve relationship geometry before surface style. If reconciliation is the event, establish a boundary strongly enough that its crossing/removal has perceptual meaning.

### EV-E65-022 — Object Interaction as Emotional Carrier

**OBSERVED:** in `01:41:22–30`, packing/reaching/lifting changes while global staging and color remain stable.

**GENERATIVE RULE:** ordinary hand–object activity can lead an emotional beat. Do not spend color, camera or texture reserve when prop interaction already carries the progression.

### EV-E65-023 — Painterly Bloom is Conditional

**OBSERVED:** painterly bloom/detail softening becomes much stronger around the hug than in the preceding held dialogue.

**INFERRED:** Earth-65's watercolor/gouache-like behavior is a controllable event variable, not simply a full-frame look.

**GENERATIVE RULE:** add `painterly_bloom_trigger`, `bloom_intensity`, and `bloom_target`; reject global watercolor filtering when the reference state remains structurally crisp.

### EV-E65-024 — Facial Precision Survives Emotional Peak

**OBSERVED:** George and Gwen close-ups keep highly legible eye/brow/nose/mouth geometry while skin/background modeling remains broad and non-photoreal.

**GENERATIVE RULE:** control `facial_landmark_precision`, `facial_plane_abstraction`, and `skin_surface_detail` independently.

### EV-E65-025 — Protective Framing Mass

**OBSERVED:** George's dark burgundy torso/arm becomes an enclosing shape around Gwen in the close-ups.

**INFERRED:** a large low-detail body mass is not inherently oppressive. Its meaning depends on spatial role: block/pressure versus nest/protect.

**GENERATIVE RULE:** add `mass_role = pressure | occlusion | protection | nesting` and `protective_framing_mass`.

### EV-E65-026 — Identity Anchors Survive Color Integration

**OBSERVED:** Gwen's local cool identity partially yields to a shared warm field, yet eye color/shape, costume accents, face geometry and hair silhouette maintain specificity.

**GENERATIVE RULE:** permit color identity migration when at least two other identity channels remain protected.

## Major knowledge-base revision

Earlier evidence (`EV-E65-012`) correctly observed that Gwen often remains cool and George warm across camera changes **while relational distance is held**. BATCH-005 provides the necessary counter-condition:

```text
RELATIONAL DISTANCE
→ separate subject temperature ownership
→ geometric / depth partition

RELATIONAL RECONCILIATION
→ boundary crossing / collapse
→ color territory overlap
→ shared field
→ painterly bloom may rise
```

The stable rule is therefore **state-dependent relational color ownership**, not fixed character temperature.

## Rendering correction strengthened

This batch reinforces the project's most important generation correction:

```text
stylization ≠ blur + watercolor + palette
```

A closer construction is:

```text
Relationship Geometry
→ Shape / Silhouette
→ Value Massing
→ Focal Detail Allocation
→ Facial Landmark Precision
→ Color Ownership / Territory State
→ Edge Hierarchy
→ Conditional Medium Behavior
```

If color and texture are mentally removed and the image still behaves like generic semi-realistic 3D concept art, the rendering construction is not calibrated yet.

## Skill fields promoted by BATCH-005

- `relational_color_merge`
- `color_territory_state`
- `boundary_state`
- `object_interaction_salience`
- `painterly_bloom_trigger`
- `bloom_intensity`
- `bloom_target`
- `protective_framing_mass`
- `mass_role`
- `identity_anchor_persistence`
- `facial_landmark_precision`
- `facial_plane_abstraction`
- `skin_surface_detail`

## Counterexample questions for future batches

1. Does color-territory fusion recur in independent Earth-65 reconciliation/intimacy scenes?
2. Can painterly bloom increase for grief, fear or rupture as well as reconciliation, implying a broader emotional-permeability trigger?
3. Are there Earth-65 emotional peaks that remain crisp with no bloom increase?
4. How often does a body-mass enclosure signal protection versus threat across other characters/worlds?
5. Does identity-color migration occur for Miles, Hobie or Miguel, or is it especially characteristic of Earth-65?

## Corpus progress implication

BATCH-005 completes the currently reviewed tail of Scene 1 through extraction `01:41:59`. The chronological full-corpus pass should next begin from the first frame of Scene 2 (`Investigate Vulture - Gwen Meets Jess`), using the Sorted-by-Scene directory rather than the large flat-folder index.
