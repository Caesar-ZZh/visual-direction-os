# 05 — Skill Calibration Notes

These notes define how the evidence-calibrated corpus should change `skills/narrative-visual-director/`.

## Current v1 Skill failure modes

Recent generation tests exposed several systematic errors:

1. **Style-family shortcut** — “Spider-Verse / Brooklyn” collapsed into neon, graffiti, sunset, water towers and halftone.
2. **Identity preservation too literal** — realistic face/body construction survived underneath stylization.
3. **Source framing over-preserved** — relationship and world grammar could not re-author the camera/composition.
4. **Palette before mechanism** — pink/blue/purple could be applied without correct territory/ownership behavior.
5. **Global texture filter** — halftone/paint/grain were treated as whole-image style rather than surface assignments.
6. **Rendering Deconstruction missing** — the system described what to add but not what realism to remove.
7. **Automatic style escalation** — stronger emotion tended to trigger more blur, color, texture and effects even when the reference sequence holds its visual grammar.

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
Emotional Carrier Selection
↓
Rendering Deconstruction
↓
Shape + Value Structure
↓
Color Ownership / Territory
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

- **identity anchors to preserve**;
- **pose information to preserve**;
- **camera geometry that may change**;
- **background information that may be suppressed/reconstructed**.

Evidence from Batch 001 shows that relational meaning may depend on foreground scale, occlusion and plane separation. Batch 002 strengthens this with a cleaner two-plane example where Gwen fills the cool foreground while George is reduced into a warm doorway plane. Therefore preserving a source photograph's framing can be incompatible with the target visual mechanism.

## Emotional Carrier Selection — added after Batch 002

The Skill must not assume that every emotional beat should be expressed through the same variables.

Before rendering, choose one or more **lead emotional carriers**:

- composition / subject scale;
- foreground-background depth;
- architectural boundary;
- color territory;
- edge redistribution;
- subject detail suppression;
- environment detail suppression;
- character presence / absence;
- gaze / micro-expression;
- motion / temporal irregularity.

Then explicitly mark other channels as **held** or **suppressed**.

### Why

Batch 002 shows several emotional frames where:

- facial detail stays crisp;
- camera remains locked;
- palette architecture remains stable;
- only gaze or expression changes.

The system therefore needs **Variable Substitution**, not one-direction escalation.

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
- `color_ownership`
- `color_territory`
- `edge_script_regions`
- `composition_reauthoring`
- `protected_readability_channels`
- `lead_emotional_carriers`
- `held_visual_channels`
- `character_presence_strategy`
- `relationship_plane_assignments`
- `architectural_boundary_role`
- `visual_grammar_hold`

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
→ Color Ownership + Territory
→ decide which physical-description channels are suppressed
→ Selective Edge Redistribution
→ Readability Substitution
→ local medium behavior
```

Hue comes later.

### Batch 002 counterexample

George and Gwen close-ups remain comparatively crisp while the emotional load is carried by:

- violet/cool/warm relationship fields;
- environment flattening;
- foreground/background scale contrast;
- doorway separation;
- gaze and micro-expression.

Therefore the Skill must not penalize a crisp face merely because the requested state is emotional.

## Visual Silence correction

Visual silence is not equivalent to:

- desaturation;
- white emptiness;
- low contrast;
- no color.

Batch 002 shows a saturated/painterly room becoming quiet when Gwen exits and the camera holds.

Add a `character-removal hold` option:

```text
establish visual field
→ remove character
→ keep camera + color field stable
→ let negative space / color memory carry residue
```

## Relationship color correction

The Skill must support **spatial color ownership**:

```text
Character A / plane A → cool field
Character B / plane B → warm field
Architecture → boundary between territories
```

This is different from applying one palette to the whole image.

## Brooklyn / Miles correction

Do **not** encode Brooklyn as a cyberpunk preset.

Future corpus research must separate:

- ordinary lived-in Brooklyn reality;
- family / bedroom / school / street environments;
- rooftop and urban depth;
- action sequences;
- emotional scenes;
- Spider-Society collision / pursuit behavior.

The likely target is closer to:

> **lived-in urban reality × graphic abstraction**

but this remains an evidence hypothesis until the Miles/Brooklyn batches are systematically reviewed.

## QA changes

Generation QA must independently score:

1. Identity Anchor Preservation
2. Composition Mechanism
3. Shape Simplification
4. Value Massing
5. Rendering Deconstruction
6. Primary Visual Variable
7. Color Ownership / Territory
8. Edge Script
9. Surface-specific Medium Coherence
10. Readability Substitution
11. Emotional Carrier Fidelity
12. Held-Channel Discipline

### Hard failure

If `Rendering Deconstruction < pass` or the image still reads as generic semi-realistic 3D after mentally removing color/texture, retry from the structural plan rather than adding more effects.

Also fail when:

- every emotional increase automatically increases saturation/texture/blur;
- all surfaces receive the same treatment;
- a relationship scene preserves weak source framing instead of building the required scale/plane geometry;
- a crisp face is softened without evidence that facial-detail suppression is the intended carrier.

## Revision timing

Do **not** lock a final v2 Skill from Earth-65 alone. Update the Skill after representative evidence exists for at minimum:

- Miles / Brooklyn daily
- Miles / Brooklyn action
- Gwen / Earth-65
- Hobie / punk rendering
- Miguel / Spider Society
- Mumbattan
- cross-character close-up rendering
- camera/composition families
- motion/temporal FX

Until then, all character/world presets remain provisional.