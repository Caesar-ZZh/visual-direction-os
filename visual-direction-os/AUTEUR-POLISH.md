# AUTEUR POLISH CONTRACT — Visual Direction OS / STUDIO

This pass applies the `agiwhitelist/auteur` **system** register to the existing Director Workspace. It is a polish pass, not a product-architecture change.

## Register

- `system`: multi-screen / multi-state product.
- Unit of design: **component × state**.
- Goal: coherence and quiet precision; no new hero-level spectacle.

## 1. Signature / moment of care

The signature is the **director control surface itself**: editorial display type over a disciplined, instrument-like workspace where state changes feel physically legible. No new decorative peak is introduced.

## 2. Color

- Tier: **restrained**.
- Keep the existing near-black control-room field and burnt orange accent because they are already part of the Visual Direction OS identity, not an arbitrary “premium dark” reflex.
- Surfaces gain a subtle warm-red/graphite tint and directional light response instead of additional glow.
- Accent remains sparse: current/selected/decisive actions only.

## 3. Type

- Display: existing serif.
- Text / metadata: existing clean sans.
- Mono: restricted to true machine-readable / code-like values only.
- Small tracked mono service labels are explicitly reduced; Project typography contract remains authoritative.

## 4. Grid break

The Project workspace avoids a uniform card wall: status, reading, proposal and continuity surfaces use **asymmetric density and open separators** rather than identical boxed tiles.

## 5. Motion budget

No scroll choreography.

1. control feedback: 120–150ms, transform/opacity/color only;
2. state/current transitions: 160–220ms ease-out;
3. large workspace surface changes: max 240ms, opacity/transform only.

`prefers-reduced-motion` keeps color/state feedback and removes positional movement.

## 6. Reflex check

- First-order AI product reflex: black dashboard, neon/amber accent, tiny mono labels, bordered cards everywhere, glow for depth.
- Second-order reflex: cream editorial “anti-SaaS” product with oversized serif and sparse controls.
- Chosen deviation: retain the dark control-room identity, but make depth come from **directional light, material separation, typography, and density**, while removing generic mono/service chrome and card-grid repetition.

## 7. Auteur house tells deliberately broken

1. **Mono service labels** → clean sans metadata; mono only for actual machine/status values.
2. **Glow as depth** → directional surface light, hairlines, restrained shadow, and a 2–3% fixed grain field.

## Component-state contract

- Buttons: one shared press response (`scale(.98)`, ~130ms), deliberate hover only under `(hover:hover)`, visible focus ring.
- Inputs / selects: same border and focus treatment across Project, Narrative and Director surfaces.
- Current / selected: accent border + subtle tonal fill; never glow-only.
- Disabled: opacity plus cursor/state distinction, not color alone.
- Cards/surfaces: borders are structural 1px hairlines; no colored side stripe.
- Sticky chrome may use blur only when content actually passes underneath it.

## Verification

The pass must preserve:

- exactly four Director modes;
- Project / Scene isolation and persistence;
- SYSTEM `/` and STUDIO `/studio/` release contract;
- no horizontal overflow at release breakpoints;
- all Sector 7, Sector 8 and full Director CI gates.
