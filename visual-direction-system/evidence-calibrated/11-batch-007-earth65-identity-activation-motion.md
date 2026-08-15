# BATCH-007 — Earth-65 Memory → Identity Activation → Motion Field

**Source window:** extraction `01:42:24–01:42:47`  
**Review:** 24 / 24 frames individually opened and visually inspected  
**Depth:** 24 L1 minimum; 16 at least L2; 8 L3/deep diagnostics  
**Scene cluster:** `SCN-E65-002` continuation

## Sequence spine

```text
Gwen/Miles nested-media memory
→ low/object-POV facial reaction
→ equipment / suit detail montage
→ frontal identity activation
→ local police-radio signal graphics
→ signal decay + hand-object response
→ leave private room
→ city-scale release
→ negative-space acrobatics
→ directional world-field motion
```

This batch is important because it connects three systems that had previously been better evidenced in isolation: **Object Memory**, **Character Identity Activation**, and **Motion / Spatial Design**.

---

## 1. Memory object becomes a transition carrier

`B007-001` isolates a Polaroid-like image of Gwen and Miles as the brightest contained rectangle inside a dark violet bedroom. Miles is absent as a live character, yet the relationship remains highly legible through nested media.

`B007-002–004` then hold nearly the same low/object-POV facial composition while Gwen's gaze, eyelids and mouth shift. `B007-005` hands expressive authority to equipment preparation.

### OBSERVED

The visual carrier moves from photograph → face → hands/equipment without a palette or global-style reset.

### INFERRED

The memory object is not only reflective decoration. In this sequence it participates in the transition from longing toward decision and identity activation.

### GENERATIVE RULE

Use `memory_object_to_action_handoff` when a personal object or embedded image should seed the next action state. Preserve the object details that encode relationship memory and suppress unrelated surroundings.

---

## 2. Focal detail migrates during preparation

`B007-005` replaces the face with an extreme hand/wrist view. `B007-006` moves to ankle/foot straps and suit-surface pattern. The crops are aggressive and foreshortened, but the actions remain readable.

### OBSERVED

Hands, devices, straps and selected costume regions temporarily receive greater descriptive authority than face or room.

### INFERRED

Focal detail is assigned by **narrative function**, not by anatomy. A preparation montage can communicate identity through tactile interaction rather than portrait continuity.

### GENERATIVE RULE

During preparation, allow detail authority to migrate into hands/equipment. Re-author object scale and crop aggressively when the interaction is the carrier.

---

## 3. Identity activation can be structural rather than FX-driven

`B007-007` is a near-frontal close-up. Gwen's eyes are direct; hands and hood frame the face; landmark geometry is precise while skin remains broad and graphic.

### OBSERVED

The activation beat reads through symmetry, eye authority, facial landmarks, hood closure and costume framing.

### INFERRED

Identity activation does not require global glow, particles, distortion or a whole-frame texture escalation.

### GENERATIVE RULE

Solve:

```text
eye authority
→ facial geometry
→ costume closure / framing
→ silhouette
→ optional FX only if evidenced
```

Add controls `identity_activation_transition`, `activation_geometry`, and `activation_fx_budget`.

---

## 4. Local graphic signal FX have attack / hold / decay

`B007-008–010` show a large diagonal police radio with magenta radial marks tightly localized around it. `B007-011` places masked Gwen behind the radio while the marks still overlap the event region. At `B007-012` the marks disappear but the base radio/Gwen staging remains. `B007-013–014` shift the carrier into hand-object response.

### OBSERVED

The graphic notation is both **spatially local** and **temporally bounded**.

### INFERRED

Comic notation functions as an event layer rather than a global comic filter.

### GENERATIVE RULE

Plan local graphic FX with:

- `target_region`
- `trigger_event`
- `attack`
- `hold`
- `decay`
- `base_grammar_persistence`

The underlying scene must remain coherent before and after the marks disappear.

This upgrades the earlier `EV-E65-030` local-punctuation hypothesis from still-level evidence into direct temporal evidence.

---

## 5. Costume pattern is surface-assigned

In `B007-006–007` and later exterior frames, teal triangular/web-like motifs are concentrated on specific costume regions. They do not leak onto skin, architecture, sky or unrelated props.

### GENERATIVE RULE

Treat pattern as a material/region assignment:

```text
pattern identity
→ eligible surface mask
→ local density / orientation
→ local edge behavior
```

Do not use costume motifs as a global style texture.

---

## 6. Domestic intimacy expands into city-scale action

At `B007-015` Gwen launches from a high window into a peach/pink city canyon. `B007-016–018` progressively enlarge the world and reduce Gwen to a compact black-white anchor.

The exterior action preserves Earth-65's non-physical color-field logic, but its function changes: the world is no longer mainly a domestic relational field; it becomes a **directional kinetic field**.

### OBSERVED

As world scale increases, character descriptive complexity falls while silhouette/value contrast increases in importance.

### GENERATIVE RULE

For intimate → action transitions:

```text
facial / object detail ↓
world scale ↑
silhouette authority ↑
trajectory authority ↑
environment hierarchy compression ↑
```

This is not a requirement that every action frame be minimal; it is a state-dependent reallocation of descriptive authority.

---

## 7. Motion readability can improve through removal

`B007-019` is the strongest action diagnostic in the batch. Nearly all city description disappears into a high-key near-white field. Gwen remains a tiny black-white/pink/teal silhouette and a looping web curve preserves trajectory.

### OBSERVED

The movement remains legible despite extreme environment suppression.

### INFERRED

High-speed readability can improve by **removing information** rather than adding blur, debris, speed lines or environmental detail.

### GENERATIVE RULE

For a high-speed clarity beat, prioritize:

1. silhouette;
2. trajectory / action curve;
3. value separation;
4. spatial direction;
5. only then world detail.

Add:

- `motion_readability_substitution`
- `trajectory_line_priority`
- `environment_suppression_for_velocity`

This is the first strong action-specific extension of the project's earlier Reality Suppression / Readability Substitution model.

---

## 8. Directional World Field

`B007-020–024` reintroduce the city beneath huge vertical magenta/violet/cyan painterly streaks. Gwen alternates between stretched horizontal, vertical flip and diagonal extension poses while remaining graphically simple.

### OBSERVED

The sky/world field itself carries directional information. City detail is selectively compressed into lower layers while large vertical streak structures dominate the image.

### INFERRED

Earth-65 exterior action extends the world's emotional permeability into **kinetic field behavior**. The world field can encode direction and energy without behaving like literal photographic motion blur.

### GENERATIVE RULE

Add independent controls:

- `directional_world_field`
- `world_streak_orientation`
- `world_streak_density`
- `silhouette_complexity_budget`
- `city_detail_reentry`

Do not equate this mechanism with generic motion blur.

---

## Evidence claims added

- `EV-E65-033` — memory object can hand off into action / identity activation.
- `EV-E65-034` — identity activation can be structural rather than FX-driven.
- `EV-E65-035` — costume pattern is surface-assigned rather than globally distributed.
- `EV-E65-036` — local signal graphics have attack / hold / decay.
- `EV-E65-037` — motion readability can improve through environment suppression.
- `EV-E65-038` — Earth-65 exterior action can use a directional world field with a simplified character silhouette.

## GitHub chapter impact

| Existing chapter | BATCH-007 contribution |
|---|---|
| `01-master-framework.md` | strengthens Parameter Dominance Rotation into state-dependent descriptive-authority migration |
| `02-character-system.md` | adds identity activation geometry and surface-local costume pattern logic |
| `03-world-system.md` | extends Earth-65 from domestic emotional field into kinetic directional world field |
| `04-sequence-color.md` | shows violet domestic memory → peach city release → near-white clarity beat → magenta/cyan kinetic field |
| `05-production-system.md` | adds preparation detail pass, local FX envelope, action readability suppression pass |
| `06-project-worksheets.md` | requires fields for activation geometry, trajectory priority and world-field direction |
| `08-glossary.md` | candidates: Directional World Field, Motion Readability Substitution, Activation Geometry |
| `09-decision-tree.md` | adds: is speed clarity improved by removing world detail? is FX event-local or global? |
| `10-master-workflow.md` | adds memory → decision → activation → signal → spatial release carrier handoff |
| `11-visual-qa.md` | rejects global motif leakage, permanent signal rays, generic motion blur and detail-heavy speed beats when silhouette/trajectory should dominate |

## Skill calibration delta

Add/promote:

```text
memory_object_to_action_handoff
carrier_causality
identity_activation_transition
activation_geometry
activation_fx_budget
costume_surface_pattern_assignment
pattern_region_mask
local_fx_attack
local_fx_hold
local_fx_decay
base_grammar_persistence
motion_readability_substitution
trajectory_line_priority
environment_suppression_for_velocity
directional_world_field
world_streak_orientation
silhouette_complexity_budget
city_detail_reentry
```

## QA hard failures

Fail/re-plan when:

- one device signal causes whole-frame comic rays;
- identity activation is communicated only by generic transformation effects;
- costume motifs leak onto unrelated surfaces;
- a speed beat becomes less readable because environment detail was preserved or added;
- painterly directional world streaks are replaced with generic photographic motion blur;
- a tiny high-speed figure retains unnecessary facial/anatomical detail instead of using silhouette and trajectory.

## Next boundary

Next chronological source boundary: **`01:42:48`**.
