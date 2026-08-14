# QA & Retry Rules

Evaluate the generated result against narrative and identity goals. Do not reward raw visual intensity.

## Core Rubric

Score each dimension 0–2:
- `0` = failed
- `1` = partially successful
- `2` = clear success

### 1. Identity Preservation
- 2: face/head silhouette/pose identity clearly preserved
- 1: recognizable but drifted
- 0: different person or major anatomy/identity failure

### 2. Primary Variable Fidelity
- 2: the archetype’s primary variable clearly drives the image
- 1: present but competing with unrelated effects
- 0: output behaves like generic style transfer

### 3. State Readability
- 2: state is visible through structure, not just color
- 1: emotion reads but state mechanics are weak
- 0: chosen state is absent or opposite

### 4. Subject Readability
- 2: subject remains first or intentionally controlled read
- 1: readable but background competes
- 0: silhouette/face lost in effects

### 5. Camera / Composition Intent
- 2: framing supports narrative function
- 1: acceptable but generic
- 0: composition contradicts the visual plan

### 6. Color / Edge Logic
- 2: color ownership and edge behavior support the state
- 1: attractive but semantically weak
- 0: random palette / indiscriminate blur or hard edges

### 7. Medium Coherence
- 2: surface mechanisms support archetype
- 1: mixed but still readable
- 0: effect soup or wrong archetype language

## Pass Rule

Mandatory dimensions:
- Identity Preservation ≥ 1
- Primary Variable Fidelity = 2
- State Readability ≥ 1
- Subject Readability = 2

Recommended total: **11/14 or higher**.

A visually beautiful image fails if Primary Variable Fidelity is 0 or Subject Readability is 0.

## Retry Routing

### `identity_retry`
Trigger: identity score 0, or likeness visibly drifts.

Append:
```text
Preserve the reference subject much more faithfully. Reduce surface noise around the face, hairline and body silhouette. Keep facial proportions, hairstyle, head shape, key clothing silhouette and pose direction close to the uploaded image. Maintain the same narrative mechanism, but let stylization occur around and through the preserved identity rather than replacing it.
```

### `primary_variable_retry`
Trigger: archetype is visually unclear.

Append:
```text
Remove unrelated decorative effects and reinforce {PRIMARY_VARIABLE} as the main storytelling mechanism. The image should be readable as {ARCHETYPE} even if the palette and texture were removed. Keep secondary variables subordinate.
```

### `state_retry`
Trigger: chosen state is weak or reads as another state.

Append:
```text
Make the {STATE} condition structurally clearer through camera, spatial/focal organization, edge behavior and ownership. Do not solve this only by increasing saturation or contrast. Preserve the subject identity and archetype.
```

### `readability_retry`
Trigger: subject lost in background/effects.

Append:
```text
Simplify the background hierarchy and restore a strong subject-first read. Strengthen silhouette separation and face readability. Keep high stylization in secondary areas rather than across every surface.
```

### `camera_retry`
Trigger: generic or contradictory framing.

Append:
```text
Recompose the image so the camera clearly expresses {CAMERA_STRATEGY}. Preserve the subject identity and pose direction while changing framing, negative space and perspective emphasis.
```

### `color_edge_retry`
Trigger: palette is attractive but behavior is semantically wrong.

Append:
```text
Rebuild color and edge behavior around ownership: {COLOR_STRATEGY}. Use edge hierarchy intentionally: {EDGE_STRATEGY}. Avoid applying the same saturation, softness or outline strength everywhere.
```

### `medium_retry`
Trigger: generic cartoon or incoherent effect soup.

Append:
```text
Unify the rendering medium around {MEDIUM_STRATEGY}. Keep only the print/painterly/collage mechanisms that support the selected archetype. Remove arbitrary glitch, neon and texture layers.
```

## Retry Limit

Default: maximum 2 targeted retries for the same requested image unless the user asks for more variations.

Retry 1 fixes the most severe mandatory failure. Retry 2 may fix one remaining major issue. Do not repeatedly intensify the same effects.

## Four-State Sheet QA

Additional checks:
- same person in all panels
- stable identity anchors
- at least two structural variables change across states
- crisis is not simply “most colorful”
- agency shows regained organization/ownership

If identity consistency fails, prioritize consistency over stylistic difference on retry.
