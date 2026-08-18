# Sector 8 Release Architecture Design

## Status

Approved direction: **SYSTEM remains the public homepage; STUDIO becomes the dedicated Director Workspace at `/studio/`.**

Implementation note: release-space navigation is injected into the assembled `_site` output rather than rewriting the large SYSTEM / Director source documents. This keeps the source experiences stable while giving production Pages the two-space chrome.

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
/                                      SYSTEM
/studio/                               STUDIO
/studio/?projectDemo=1&narrativeDemo=1 explicit review fixture
/director-v2.html                      compatibility / exact-commit staging artifact
```

The public root must never be replaced by `director-v2.html` during Pages assembly.

## Build architecture

`visual-direction-os/build-pages-site.js` remains the single zero-build Pages assembler.

The assembler must:

1. Copy the current `visual-direction-os/` tree into the output directory.
2. Keep SYSTEM as the deployed root and inject only the restrained SYSTEM → STUDIO release bridge plus the shared release stylesheet.
3. Create `_site/studio/index.html` from `director-v2.html`.
4. Make the generated Studio document resolve existing CSS/JS assets from the parent directory without duplicating the whole asset tree.
5. Add desktop and mobile STUDIO → SYSTEM release routes without making SYSTEM a fifth Director mode.
6. Remove staging-only wording from the published Studio chrome while keeping the source staging entry intact.
7. Preserve `director-v2.html` in the output as a compatibility / exact-commit entry.

The generated Studio injects `<base href="../">` so existing CSS/JS and Project bootstrap dynamic dependencies resolve to the shared root assets. Because a base element changes hash-link resolution, generated `href="#..."` links are rewritten to `href="studio/#..."` so skip links and mobile Director-mode anchors stay inside `/studio/`.

## Development preview behavior

RawGitHack and direct branch review continue to use `director-v2.html` as the exact-commit Studio staging entry. A source-level `visual-direction-os/studio/index.html` redirect shim makes `/studio/` convenient during branch review; Pages assembly overwrites the published `_site/studio/index.html` with the full generated Studio document.

The preview shim preserves `location.search` and `location.hash` when redirecting to `../director-v2.html`.

## SYSTEM → STUDIO bridge

SYSTEM gets one restrained, first-class STUDIO entry in the existing navigation language. It reads as a transition between spaces rather than a fifth knowledge chapter.

Required behavior:

- Desktop rail: `STUDIO / Enter Director Workspace` action separated from chapter navigation.
- Mobile navigation drawer: the same entry remains reachable; the rail may scroll vertically if needed.
- Link target: `studio/`.
- No Scene State mutation or Project creation occurs from SYSTEM.

A secondary hero CTA is not required for the MVP.

## STUDIO → SYSTEM bridge

Desktop STUDIO gets a quiet `SYSTEM / Knowledge Space` route in the rail/brand area.

Published Studio uses `<base href="../">`; therefore `href="./"` resolves to the Visual Direction OS root and remains deployment-path agnostic.

At mobile breakpoints the desktop rail is hidden. SYSTEM therefore appears as a separate compact `SYSTEM ↗` control, not as a fifth item in Learn / Narrative / Direct / Diagnose.

## Production and demo separation

`projectDemo=1` and `narrativeDemo=1` remain explicit fixtures only. Production `/studio/` does not silently enable fixtures.

Published Studio chrome uses `Director Workspace · v2.1` and `Director Control Room`; source `director-v2.html` may retain staging wording for exact-commit development review.

No login, cloud sync, collaboration, image generation or automatic continuity repair is added in Sector 8.

## State and navigation guarantees

- Navigating STUDIO → SYSTEM leaves local Project persistence untouched.
- Returning SYSTEM → STUDIO restores the previously saved Project when persistence is available.
- If persistence is unavailable, STUDIO still initializes through the Sector 7 optional-persistence fallback.
- SYSTEM remains usable even if all Studio-specific scripts fail.
- SYSTEM never becomes a Director mode.

## Release gates

Pages assembly must verify:

1. `_site/index.html` still contains the SYSTEM editorial experience and now includes the `studio/` release route.
2. `_site/studio/index.html` exists and is generated from `director-v2.html` with parent-asset resolution.
3. Studio-local hash links remain under `/studio/` despite the parent asset base.
4. `_site/director-v2.html` remains available unchanged as a compatibility entry.
5. SYSTEM contains a valid `studio/` route.
6. STUDIO contains desktop and mobile SYSTEM routes.
7. Published Studio does not present itself as `staging`.
8. Existing Project Node/syntax tests continue to pass.
9. Chromium opens both `/` and `/studio/?narrativeDemo=1&projectDemo=1` with no page-level horizontal overflow at mobile and desktop widths.
10. Mobile Studio still exposes exactly four Director modes: Learn / Narrative / Direct / Diagnose.
11. The Sector 7 persistence-failure browser regression remains green.

## Deployment safety

`.github/workflows/pages.yml` continues to deploy only from `master` plus manual dispatch. Development-branch work and Draft PR review cannot replace the current live SYSTEM homepage.

The rollout sequence is:

```text
Development branch
→ build + browser gates
→ product review
→ merge readiness
→ master
→ Pages assembly
→ SYSTEM remains /
→ STUDIO appears at /studio/
```

## Non-goals

- No new landing page.
- No framework migration.
- No React / Vue / build bundler.
- No account system.
- No cloud persistence.
- No automatic redirect from `/` to STUDIO.
- No replacement of SYSTEM with Director Workspace.
