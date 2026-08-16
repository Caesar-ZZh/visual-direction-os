# BATCH-013 — Earth-65 domain exit / sustained contact / fragment occupancy

## Verified source span

- Extraction window: `01:44:12–01:44:23`
- Source frames actually opened and visually inspected: **12 / 12**
- L1: **12**
- At least L2: **8**
- Deep diagnostics: **4**
- Curated references: **3**
- Cumulative viewed/L1 after this batch: **226**
- Next chronological boundary: **`01:44:24`**

This batch continues Scene 2 (`Investigate Vulture - Gwen Meets Jess`) only because the frames still carry unique evidence about Vulture's rendering ownership, cross-medium contact and dimensional/event instability. Earth-65 is already over-represented, so this chronology should not become an excuse to delay under-covered worlds.

## Observed sequence

- `B013-001` / 01:44:12 — the frame remains entirely inside Vulture's sepia parchment/ink historical-expository domain; the host Earth-65 grammar is absent.
- `B013-002` / 01:44:13 — the image cuts directly back to smoother purple Earth-65 space while Vulture keeps his local rough brown etched medium. No gradual material dissolve is required.
- `B013-003` / 01:44:14 — a localized magenta/cyan anomaly and rough fragments occupy part of otherwise smoother blue museum architecture.
- `B013-004–005` — Vulture remains a distinct rough medium territory inside broader multi-character staging rather than averaging into the host-world rendering.
- `B013-006` / 01:44:17 — Gwen's clean white-hood/black-suit rendering makes direct body contact with Vulture's brown etched body under a strong directional magenta field. Their materials remain separately legible.
- `B013-007` — Vulture's beak/wing profile remains readable through jagged contour and hatching while the motion/world field operates separately.
- `B013-008` — the room opens into a broader, lower-description blue-purple field, providing a decompression beat between denser action states.
- `B013-009–010` — sustained Gwen/Vulture overlap and occlusion still preserve the clean-vs-etched medium distinction.
- `B013-011` / 01:44:22 — a bright blue-white web line crosses Vulture's body without repainting him, reinforcing connector FX as an independent interaction layer.
- `B013-012` / 01:44:23 — a dense RGB/CMYK-like geometric fragment cluster occupies a bounded object/region while the surrounding museum world remains comparatively smooth.

## Evidence revisions

### EV-E65-063 — Discrete narrative-domain exit

**OBSERVED:** a full-frame parchment/ink narrative domain is followed directly by the normal host-world field plus Vulture's local entity medium.

**INFERRED:** narrative-domain overrides can behave as ownership states with a discrete handoff rather than requiring a gradual media morph.

**GENERATIVE RULE:** support `domain_override_exit_mode = hard_cut | state_switch | motivated_transition`. Do not automatically crossfade or morph between medium-ownership states.

**QA failure:** an unmotivated material dissolve that makes every layer partially inherit the departing narrative domain.

### EV-E65-064 — Contact-boundary preservation

**OBSERVED:** Gwen and Vulture physically touch and overlap for several frames while keeping different edge, texture and description-frequency systems; the web can remain a third independently rendered connector.

**INFERRED:** physical contact does not imply medium homogenization. Medium boundaries can survive sustained overlap and occlusion.

**GENERATIVE RULE:** preserve `edge_ownership_by_entity`, `description_frequency_by_entity` and `contact_boundary_preservation` unless the story explicitly calls for contamination, transfer or fusion.

**QA failure:** averaging both subjects into one texture merely because they touch.

### EV-E65-065 — Bounded fragment occupancy

**OBSERVED:** dimensional/event fragmentation can occupy the object/entity region as a dense fragment cloud while unaffected architecture outside the region keeps the host-world grammar.

**INFERRED:** an event override may temporarily replace an object's visual occupancy rather than globally filtering the frame.

**GENERATIVE RULE:** use `event_override_mask + fragment_occupancy + host_world_preservation_outside_mask`.

**QA failure:** frame-wide chromatic aberration or glitch when only one causal object is destabilizing.

## Model revision

BATCH-013 turns the prior layer model into an explicit **ownership handoff + bounded-mask model**:

```text
base world grammar
+ entity-owned media
+ interaction/connector layers
+ event override masks
+ narrative-domain ownership states

transition rules:
- narrative-domain may exit through a discrete authority handoff
- physical contact does not imply medium averaging
- event override may replace object occupancy while preserving host world outside mask
```

The important question is no longer “what style is this frame?” but **which layer owns which pixels, and when does that ownership transfer?**

## Production / Skill consequences

Add or strengthen the following controls:

- `narrative_domain_owner`
- `domain_override_exit_mode`
- `entity_medium_owner`
- `edge_ownership_by_entity`
- `description_frequency_by_entity`
- `contact_boundary_preservation`
- `interaction_layer_owner`
- `event_override_mask`
- `fragment_occupancy`
- `host_world_preservation_outside_mask`

Prompting should specify owner, scope and transition behavior rather than ask for a generic “Spider-Verse mixed-media look.”

## Chapters strengthened

- `01-master-framework.md` — explicit ownership and authority-transfer model.
- `02-character-system.md` — medium remains an identity carrier through contact and occlusion.
- `03-world-system.md` — host-world grammar can remain stable outside local causal masks.
- `05-production-system.md` — concrete layer/mask/transition controls.
- `06-project-worksheets.md` — new fields for domain exit, contact boundary and fragment occupancy.
- `09-decision-tree.md` — ask who owns the medium, whether ownership transfers, and what the causal mask covers.
- `11-visual-qa.md` — rejects texture averaging, ownerless crossfades and global glitch filters.

## Coverage consequence

Earth-65 now has unusually dense support for mixed-media ownership and override mechanics. Immediate chronology from `01:44:24` is justified only while it yields unique Jess/Vulture evidence. Sampling pressure should then move aggressively toward Miles/Brooklyn, Hobie, Miguel/Spider Society, Mumbattan, world collision and climax/authorship, specifically searching for counterexamples to these Earth-65-derived rules.