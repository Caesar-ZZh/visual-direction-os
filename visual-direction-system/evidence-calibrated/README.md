# Evidence-Calibrated Spider-Verse Visual Corpus

> Status: **v1.5 research in progress**  
> Purpose: turn the existing Visual Direction theory draft into an evidence-calibrated visual grammar grounded in the full screenshot corpus.

## Why this layer exists

The original `visual-direction-system/` established a useful methodology, but some Spider-Verse-specific statements were inferred from a limited sample and can overgeneralize local scene behavior. This research layer separates three kinds of knowledge:

- **OBSERVED** — directly visible in one or more frames.
- **INFERRED** — a mechanism supported by multiple frames / scene clusters.
- **GENERATIVE RULE** — a transferable production rule derived from evidence.

No whole-film rule should be promoted without cross-scene support and counterexample search.

## Source corpus

The source is the user's Google Drive screenshot corpus of *Spider-Man: Across the Spider-Verse*. Original images remain untouched. Every source image is intended to receive at least Level-1 review; adjacent near-duplicate frames are still viewed but grouped into Scene / Shot Clusters so analysis focuses on meaningful change points rather than repetitive prose.

## Three-pass workflow

1. **PASS A — Frame-by-Frame Census**  
   View every frame and record structured metadata: world, character, shot, composition, shape, value, color, edge, rendering, texture, motion, narrative state.
2. **PASS B — Cluster & Change-Point Analysis**  
   Group adjacent frames, identify changes in staging, camera, color territory, edge hierarchy, rendering mode, temporal behavior, visual intensity, state and world grammar.
3. **PASS C — Deep Visual Forensics**  
   Deep-analyze diagnostic frames and sequences: Rendering Deconstruction, Controlled Flattening, Facial Plane Abstraction, Value Massing, Line Strategy, Halftone, Hatching, CMYK Misregistration, Texture Frequency, Color Ownership, Camera Grammar, Readability and Visual Authorship.

## Review levels

- **L1** — census annotation; mandatory for every frame.
- **L2** — meaningful visual change / strong representative frame.
- **L3** — deep forensic analysis and rule extraction.

## Research outputs

- `00-research-protocol.md` — evidence standard and workflow.
- `01-annotation-taxonomy.md` — canonical frame annotation schema.
- `02-evidence-ledger.md` — claims, supporting frames, counterexamples and confidence.
- `03-batch-001-earth65-domestic.md` — first real 11-frame review batch.
- `04-rendering-deconstruction.md` — the missing production layer discovered through failed generation tests.
- `05-skill-calibration-notes.md` — how evidence must change the image-generation Skill.
- `progress.md` — corpus completion log.

## Version path

```text
v1.0  Theory Draft
  ↓
v1.5  Evidence-Calibrated Edition
  ↓
v2.0  Generative Visual Grammar / Scene Re-Authoring Engine
```

The goal is not to collect style adjectives. The goal is to understand **how the film decides what may remain realistic, what becomes graphic, what changes with character/world/state, and how those rules evolve over time**.