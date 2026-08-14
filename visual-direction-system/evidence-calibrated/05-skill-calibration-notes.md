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

Evidence from Batch 001 shows that relational meaning may depend on foreground scale, occlusion and plane separation. Therefore preserving a source photograph's framing can be incompatible with the target visual mechanism.

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

## Gwen / Earth-65 correction

Do **not** encode Earth-65 as:

```text
pink + purple + blue + watercolor + soft edges
```

Instead plan:

```text
Relationship / Emotional Authority
→ Composition Territory
→ Color Ownership + Territory
→ Physical Description Suppression
→ Selective Edge Redistribution
→ Readability Substitution
→ local medium behavior
```

Hue comes later.

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

### Hard failure

If `Rendering Deconstruction < pass` or the image still reads as generic semi-realistic 3D after mentally removing color/texture, retry from the structural plan rather than adding more effects.

## Revision timing

Do **not** lock a final v2 Skill from Batch 001 alone. Update the Skill after representative evidence exists for at minimum:

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