# Sector 8 Release Architecture Design

## Status

Approved direction: **SYSTEM remains the public homepage; STUDIO becomes the dedicated Director Workspace at `/studio/`.**

## Goal

Publish Visual Direction OS as two coordinated product spaces without sacrificing the current editorial knowledge experience or exposing unfinished staging behavior as the default homepage.

```text
Visual Direction OS
├── /                 SYSTEM
│                     editorial knowledge experience
└── /studio/           STUDIO
                      Director Workspace v2.1
                      Project / Narrative / Direct / Diagnose
```

## Product boundary

### SYSTEM

SYSTEM is the public default experience. It remains the current `visual-direction-os/index.html` editorial knowledge browser and continues to own the knowledge-first navigation, overview, Character, World, Sequence, Color, Production, Case Study, Glossary, Decision Tree, Workflow and QA surfaces.

SYSTEM may invite the user into STUDIO, but it does not write canonical Scene State.

### STUDIO

STUDIO is the operational directing workspace. It owns Project Context, Narrative, Direct, Diagnose, Scene switching, Project Arc, Continuity and local Project persistence.

STUDIO exposes a visible route back to SYSTEM. Returning to SYSTEM must not erase Project state.

## Public routes

Production Pages routes:

```text
/                         SYSTEM
/studio/                  STUDIO
/studio/?projectDemo=1&narrativeDemo=1   explicit review fixture
/director-v2.html         retained as a non-primary compatibility/staging artifact
```

The public root must never be replaced by `director-v2.html` during Pages assembly.

## Build architecture

`visual-direction-os/build-pages-site.js` remains the single zero-build Pages assembler.

The assembler must:

1. Copy the current `visual-direction-os/` tree into the output directory.
2. Preserve `index.html` as the deployed root `index.html` unchanged.
3. Create `_site/studio/index.html` from `director-v2.html`.
4. Make the generated Studio document resolve existing CSS/JS assets from the parent directory without duplicating the whole asset tree.
5. Preserve `director-v2.html` in the output as a compatibility/staging entry.

The preferred implementation is to inject `<base href="../">` into the generated Studio document immediately after `<head>`, so all existing relative asset URLs resolve to the shared root assets. Query parameters remain on `/studio/` and continue to drive explicit demo modes.

## Development preview behavior

RawGitHack and direct branch review still use `director-v2.html` as the exact-commit Studio staging entry. SYSTEM may link to a small source-level `/studio/` redirect shim for branch preview, but the Pages assembler overwrites the published `_site/studio/index.html` with the full generated Studio document.

The preview shim must preserve `location.search` and `location.hash` when redirecting to `../director-v2.html`.

## SYSTEM → STUDIO bridge

SYSTEM gets one restrained, first-class STUDIO entry in the existing navigation language. It should read as a transition between spaces rather than a fifth knowledge chapter.

Required behavior:

- Desktop rail: visible `ENTER STUDIO` / `STUDIO` action separated from chapter navigation.
- Mobile header/navigation: equivalent accessible entry.
- Link target: `studio/`.
- No Scene State mutation or Project creation occurs from SYSTEM.

A secondary hero CTA is optional only if it does not disturb the existing editorial hierarchy; the MVP requires the navigation bridge, not a new landing-page redesign.

## STUDIO → SYSTEM bridge

STUDIO gets one persistent but quiet `SYSTEM` route in the rail/brand area.

Because the same `director-v2.html` source is used both at root during staging and under `/studio/` in production, the link target is resolved at runtime:

```text
if pathname contains `/studio/` → `../`
otherwise → `index.html`
```

This avoids hard-coding the GitHub Pages repository path and keeps local/RawGitHack staging functional.

## Production and demo separation

`projectDemo=1` and `narrativeDemo=1` remain explicit fixtures only. Production `/studio/` does not silently enable fixtures.

The Studio chrome should no longer describe itself as a generic "staging build" in user-facing copy. Review fixtures may expose a compact `DEMO FIXTURE` status where already supported, but the core brand becomes `Director Workspace · v2.1` / `Director Control Room`.

No login, cloud sync, collaboration, image generation or automatic continuity repair is added in Sector 8.

## State and navigation guarantees

- Navigating STUDIO → SYSTEM leaves local Project persistence untouched.
- Returning SYSTEM → STUDIO restores the previously saved Project when persistence is available.
- If persistence is unavailable, STUDIO still initializes through the Sector 7 optional-persistence fallback.
- SYSTEM remains usable even if all Studio-specific scripts fail.

## Release gates

Pages assembly must verify:

1. `_site/index.html` is byte-identical to source `visual-direction-os/index.html`.
2. `_site/studio/index.html` exists and is generated from `director-v2.html` with parent-asset resolution.
3. `_site/director-v2.html` remains available.
4. SYSTEM contains a valid `studio/` route.
5. STUDIO contains a valid SYSTEM route.
6. Existing Project Node/syntax tests continue to pass.
7. Chromium opens both `/` and `/studio/?narrativeDemo=1&projectDemo=1` with no page-level horizontal overflow at mobile and desktop widths.
8. The Sector 7 persistence-failure browser regression remains green.

## Deployment safety

`.github/workflows/pages.yml` continues to deploy only from `master` (plus manual dispatch). Development-branch work and Draft PR review cannot replace the current live SYSTEM homepage.

The rollout sequence is:

```text
Development branch
→ build + browser gates
→ product review of exact commit
→ merge readiness
→ master
→ Pages assembly
→ SYSTEM remains /
→ STUDIO appears at /studio/
```

## Non-goals

- No new landing page.
- No framework migration.
- No React/Vue/build bundler.
- No account system.
- No cloud persistence.
- No automatic redirect from `/` to STUDIO.
- No replacement of SYSTEM with Director Workspace.
