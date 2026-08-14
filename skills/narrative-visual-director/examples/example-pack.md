# Example Pack

These examples demonstrate routing and prompt construction. They are not claims about unseen images.

---

## Example 1｜Urban portrait → `path_space / decision`

**User:** Uploads a street portrait. Subject leans forward slightly and looks past camera. “做得有那种纵横宇宙的电影感，人物要有决心。”

### Visual Plan excerpt
```json
{
  "state": "decision",
  "archetype": "path_space",
  "primary_variable": "space / direction",
  "coupled_pair": "space × shape",
  "secondary_variables": ["camera allegiance", "negative space", "identity color accent"],
  "camera_strategy": "kinetic medium-low framing with open space in the subject's intended direction",
  "space_strategy": "compress competing paths behind the subject, then establish one dominant forward path",
  "color_strategy": "keep identity accent localized on the subject; use cooler support tones in the city",
  "edge_strategy": "clean leading contour with softer trailing/environment edges"
}
```

### Prompt core
```text
Preserve the subject's facial likeness, hairstyle, clothing silhouette and forward-leaning pose. Render a decision-state path/space image: one clear direction emerges from a previously crowded urban field. Use kinetic perspective and predictive negative space ahead of the subject. Keep the face and silhouette crisp, with selective print texture, halftone in secondary value regions and controlled chromatic registration only at motion edges. The image should feel like a directed multiverse-comic cinematic frame, not a speed-line filter.
```

---

## Example 2｜Quiet portrait → `boundary_emotion / pressure`

**User:** “这张有点脆弱、疏离，想要更像Gwen那种情绪化画面。”

### Visual Plan excerpt
```json
{
  "state": "pressure",
  "archetype": "boundary_emotion",
  "primary_variable": "boundary / edge",
  "coupled_pair": "edge × color",
  "secondary_variables": ["negative space", "relationship field"],
  "camera_strategy": "intimate close framing with breathing room around the gaze direction",
  "color_strategy": "separate the subject from the environment through relational color fields, not a fixed pink-purple palette",
  "edge_strategy": "preserve hard face/eye anchors while allowing shoulders and background edges to soften or disappear"
}
```

### Prompt core
```text
Preserve face likeness and the quiet inward pose. Build a pressure-state emotional boundary image: the subject remains structurally readable while selected shoulder and background edges dissolve into a painterly watercolor field. Let negative space carry emotional distance. Keep hard edges around eyes and essential facial features, use restrained halftone in stable clothing masses, and let relationship color occupy the space around rather than simply recoloring the person.
```

---

## Example 3｜Confrontational fashion portrait → `rebellion_time / agency`

**User:** “要非常炸，非常叛逆，拼贴印刷感强，但脸一定要像。”

### Visual Plan excerpt
```json
{
  "state": "agency",
  "archetype": "rebellion_time",
  "primary_variable": "time / medium",
  "coupled_pair": "time × medium",
  "secondary_variables": ["registration", "fragmented coherence", "graphic silhouette"],
  "camera_strategy": "stable confrontational frontal camera so medium desynchronization has a reference",
  "medium_strategy": "screenprint, risograph offset, xerographic collage and torn-paper layers with a persistent high-contrast structural silhouette",
  "readability_strategy": "face, head silhouette and global gesture remain stable while color plates and local texture desynchronize"
}
```

### Prompt core
```text
Keep the camera frontal and stable. Preserve the exact facial identity and head silhouette. Let the rebellion occur in the rendering medium: controlled risograph registration shifts, torn xerographic collage, rough screenprint edges, duplicated local ink layers and zine-like paper texture. Maintain one strong high-contrast body/face skeleton so the subject is instantly recognizable. Agency should feel like the subject intentionally controls the misregistration rather than being swallowed by random glitch noise.
```

---

## Example 4｜Observational portrait → `focus_attention / agency`

**User:** “想做成一种她决定什么值得被看见的感觉。”

### Visual Plan excerpt
```json
{
  "state": "agency",
  "archetype": "focus_attention",
  "primary_variable": "focus / visibility",
  "coupled_pair": "focus × edge",
  "secondary_variables": ["contrast hierarchy", "gaze", "camera alignment"],
  "camera_strategy": "observational-to-aligned framing; negative space follows the gaze",
  "focus_hierarchy": "eye/face anchor is clear first, then clarity propagates toward the chosen object or direction",
  "color_strategy": "use one previously external accent as character-owned attention punctuation"
}
```

### Prompt core
```text
Preserve the subject's identity and gaze. Build an agency-state attention image in which clarity is actively authored by the subject. Keep the eye and face as the first stable anchor, then let edge sharpness, contrast and print detail propagate in the direction of the gaze. Simplify or suppress unchosen background information instead of applying uniform blur. Use graphic comic value grouping and selective print texture so the image visibly answers: the subject decides what becomes important.
```

---

## Example 5｜Two-person conflict

**User:** Uploads two people and selects `duo_conflict`.

### Direction
- Preserve both identities.
- Do not style each person independently.
- Treat the space between them as a relationship field.
- Use edge hardness and color territory to prevent visual reconciliation.
- Camera allegiance may be neutral or intentionally biased by user request.

### Prompt core
```text
Preserve both people and their spatial relationship. Direct the conflict primarily through the field between them: separate color ownership, opposing directional shapes and a hard relationship boundary in the negative space. Keep both faces readable. Let the background simplify around the conflict axis rather than adding generic action effects.
```

---

## Example 6｜Four-state sheet

**User:** Same portrait, `four_state_sheet`, archetype `boundary_emotion`.

### Required differentiation
- Baseline: stable soft boundary and balanced negative space.
- Pressure: selective hardening and color-field separation.
- Crisis: edge contradiction and emotional field expansion while face anchors survive.
- Agency: strong feeling remains, but permeability becomes chosen and organized.

A valid sheet must read as one person's state machine, not four different illustration styles.
