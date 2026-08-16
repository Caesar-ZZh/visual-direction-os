# BATCH-012 — Scene 2 — 01:44:00–01:44:11 — Evidence Analysis

## Batch verification

12/12 source frames were individually opened and visually inspected.

- L1: 12
- L2: 8
- Deep diagnostics: 4
- Curated references: 3
- Cumulative verified viewed/L1: 214
- Next chronological boundary: 01:44:12

## OBSERVED

1. **01:44:00–02 — Vulture medium survives scale change.** Close Vulture is carried by dense sepia-brown hatching, jagged feather edges and etched facial construction; as he recedes, internal detail drops out and identity moves to serrated wing silhouette, brown value family and edge rhythm. At 01:44:02 a clean pale web vector enters a large cool negative field while Vulture remains rough and sepia.
2. **01:44:03–05 — low-description threat continuity.** Gwen becomes the clean white/black anchor against a dark blue-violet field while Vulture remains small and materially distinct behind her. Threat survives without global FX because the medium mismatch itself remains readable.
3. **01:44:06–08 — force-vector peak and contact.** A saturated magenta/green directional field aligns with Gwen/Vulture pose axes and web vectors. Gwen then physically contacts/crouches on Vulture while their rendering grammars remain distinct; the following frame reduces directional density and reopens teal space.
4. **01:44:09–10 — editorial partition.** A hard triangular triptych separates sepia teacup sketches from the live/action center. Black panel boundaries become structural edges; the panel architecture remains fixed while the center action/color state progresses.
5. **01:44:11 — full-frame narrative-domain shift.** Earth-65 painterly space disappears and the entire image becomes a sepia parchment/ink café sketch with diners, marginal diagrams and handwritten marks associated with Vulture's historical/expository telling.

No camera motion is inferred from individual stills; temporal claims rely on adjacent inspected frames.

## INFERRED

### A. Entity-medium identity is scale-invariant, but its readable carriers are not

Close scale can use internal hatching and facial detail. Mid/far scale must transfer authority to value family, jagged contour and silhouette rhythm. A single texture-frequency recipe will fail across framing changes.

### B. Cross-medium interaction does not require homogenization

Gwen, Vulture and web can remain three materially distinct layers even when linked or in direct contact. The interaction device can act as a third connector layer instead of forcing both entities toward one averaged texture.

### C. Rendering precedence needs a Narrative-Domain layer

The previous model `base world grammar < entity medium < event override` is too one-dimensional. BATCH-012 separates two frame-wide override families:

- **event-render override** — instability, impact, anomaly or other causally owned event state;
- **narrative-domain override** — memory, explanation, joke, dossier, subjective account or character-owned telling.

A character-specific medium may legitimately expand across the whole frame when narrative/editorial authority shifts to that character. That is different from applying a global comic/paper filter without ownership.

### D. Force-vector environment is stronger than blur-only motion

At 01:44:06, figure pose, environmental streaks and web lines agree on a principal direction. The environment itself becomes a force diagram. Motion blur is optional support, not the primary carrier.

## GENERATIVE RULES

1. **Multiscale medium identity:** define `entity_medium_close`, `entity_medium_mid`, and `entity_medium_far`; shift identity carriers from detail to value/contour/silhouette as scale decreases.
2. **Contact without homogenization:** preserve each entity's rendering ownership at contact; assign web/contact marks an explicit `interaction_layer_owner`.
3. **Force-vector environment:** choose one principal motion vector and align body axes, streaks, debris and interaction lines to it.
4. **Editorial partition with function:** panel geometry must change information order, simultaneity or timing; do not use comic splits as decoration.
5. **Narrative-domain override:** permit frame-wide medium change only when narrative/editorial authority has a clear owner; exit cleanly when objective/world authority returns.
6. **Hard failure:** fail any reconstruction that averages all media together or applies parchment/comic texture globally with no causal/narrative owner.

## Belief changes

- **Validated:** Vulture's entity-medium identity survives radical scale reduction, but through different feature carriers.
- **Validated:** physical cross-medium contact can preserve medium boundaries.
- **Strengthened:** Force-vector Alignment can extend from object/body vectors into a frame-wide directional world field.
- **Revised:** rendering-layer precedence now distinguishes event-render override from narrative-domain override.
- **Counterexample to naive locality:** frame-wide entity medium can be correct, but only when narrative/editorial domain authority shifts to the entity.

## Production / Skill parameters

```text
entity_medium_close = detail + internal hatching + facial anchors
entity_medium_mid   = value family + contour vocabulary + selected texture
entity_medium_far   = silhouette rhythm + value/color family
interaction_layer_owner = explicit and separate from both entities
principal_motion_vector = dominant direction shared by pose/world/interaction lines
narrative_domain_owner = none | character | world | event | editorial
override_type = event_render | narrative_domain | none
```

## Hard-failure QA

- Fail if distant character identity depends on close-scale texture detail that no longer reads.
- Fail if two touching characters automatically blend into one texture/medium.
- Fail if background streaks, body axes and web/debris vectors disagree at an intended action peak.
- Fail if editorial paneling changes nothing about information order or temporal structure.
- Fail if a frame-wide paper/comic treatment has no narrative, event or editorial owner.

## Coverage implications

Earth-65/Vulture now has strong evidence for entity-medium persistence, localized event override, cross-medium contact, multiscale identity and narrative-domain expansion. After immediate unique Jess/Vulture chronological evidence, sampling pressure should increase toward Miles/Brooklyn, Hobie, Miguel/Spider Society, Mumbattan, world collision and climax/authorship. Specifically test narrative-domain overrides, connector layers and force-vector environments outside Earth-65.

## Evidence IDs

- `EV-E65-059` — multiscale entity-medium identity
- `EV-E65-060` — cross-medium contact without homogenization
- `EV-E65-061` — narrative-domain override distinct from event override
- `EV-E65-062` — environment-wide force-vector alignment
