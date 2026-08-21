# Multi-Scene Project / Project Arc Design

**Date:** 2026-08-18  
**Status:** Approved for implementation  
**Branch:** `agent/director-workspace-v2-1`

## 1. Product Goal

Extend Visual Direction OS from a single-scene directing workspace into a project-level directing system without replacing the existing Scene Director.

The product model is:

```text
PROJECT
├── Project Intent
├── Project Narrative Structure
├── Scene Records
├── derived Project Arc
└── derived Cross-Scene Continuity
      ↓
ACTIVE SCENE
      ↓
LEARN / NARRATIVE / DIRECT / DIAGNOSE
```

The core product statement is:

> A Project stores a work's narrative structure and multiple independent Scene snapshots; one Active Scene continues to run the existing VDOS Director; AI proposes Scene structure only; Project Arc and Continuity are deterministically derived from directed Scene state.

Scene remains the fundamental unit of directing. Project is the context and continuity layer around Scenes.

## 2. Core Architecture Decision

### 2.1 Project is context, not a fifth mode

Do not change the existing mode set:

```text
LEARN
NARRATIVE
DIRECT
DIAGNOSE
```

Do not introduce `PROJECT` as a peer mode. Project answers **what work / which scene is being directed**; the existing modes answer **what operation the director is performing**.

The Project shell sits above the existing Director Workspace:

```text
PROJECT / UNTITLED FILM
SCENE 03 / REFUSAL

[ PROJECT ARC ]  [ SCENE LIST ]

LEARN
NARRATIVE
DIRECT
DIAGNOSE
```

### 2.2 Single Scene is a special case of Multi-Scene

The existing single-scene experience must remain usable. When no explicit Project exists, the application may create an implicit:

```text
UNTITLED PROJECT
└── SCENE 01
```

Multi-Scene context becomes prominent only when the user enters Project Workspace or has more than one Scene.

## 3. Project Workspace Information Architecture

Project Workspace is a directing overview, not a generic project-management list.

Its first version contains four primary regions:

1. **Project Header**
2. **Scene Structure Rail**
3. **Project Arc**
4. **Cross-Scene Continuity**

### 3.1 Project Header

Displays project identity and progress:

```text
PROJECT / UNTITLED FILM
Compliance becomes self-authorship
04 SCENES
03 DIRECTED
01 PENDING
```

It does not expose Camera, Color, Space, or other visual controls.

### 3.2 Scene Structure Rail

Scenes are shown as a horizontal narrative progression rather than a file list:

```text
01                02                 03                 04
COMPLIANCE   →   RECOGNITION   →    REFUSAL      →     EXIT
WORLD             WORLD             CONTESTED          CHARACTER
```

Scene actions are contextual rather than permanently exposed. First-version structural actions are:

- Open
- Edit
- Add
- Split
- Merge adjacent
- Remove
- Reorder

### 3.3 Project Arc

Project Arc is the primary project-level visualization. It compresses each directed Scene into semantic directing signals rather than dumping raw Scene State fields.

The first-version rows are exactly:

```text
NARRATIVE ROLE
AGENCY
CAMERA AUTHORITY
COLOR TERRITORY
SPATIAL PRESSURE
GRAPHIC DENSITY
RHYTHMIC ENERGY
```

Example:

```text
                 01              02              03              04
              COMPLIANCE      RECOGNITION      REFUSAL          EXIT

NARRATIVE       SETUP       → RECOGNITION  →   RUPTURE      → RESOLUTION
AGENCY          WORLD       → CONTESTED    →   CHARACTER     → CHARACTER
CAMERA          WORLD       → WORLD        →   CONTESTED     → CHARACTER
COLOR           WORLD       → WORLD        →   CONTESTED     → CHARACTER
SPACE           LOW         → MEDIUM       →   HIGH          → RELEASE
DENSITY         LOW         → MEDIUM       →   HIGH          → LOW
RHYTHM          LOW         → MEDIUM       →   HIGH          → LOW
```

Project Arc is also a Scene navigator: Scene columns can open the corresponding Scene.

### 3.4 Cross-Scene Continuity

Continuity answers whether visual change has an explainable relationship to narrative cause. It does **not** reward smoothness for its own sake and does not judge whether a project is aesthetically good.

Findings are limited to:

```text
PASS
WARN
FAIL
UNRESOLVED
```

No numerical score is allowed.

Findings identify the affected Scene or Scene boundary and can route the user to relevant Scene(s). They never auto-fix Scene State.

## 4. Project State and Scene Snapshot Model

### 4.1 Project canonical state

The Project canonical model is conceptually:

```js
ProjectState = {
  id,
  title,
  projectIntent,
  sourceNarrative,
  sceneOrder: ['scene-01', 'scene-02'],
  activeSceneId: 'scene-01',
  scenes: {
    'scene-01': SceneRecord,
    'scene-02': SceneRecord
  }
}
```

Project does not own Camera / Color / Space / Line / Texture / Rhythm values directly.

### 4.2 SceneRecord

A SceneRecord is not identical to `VDOSScene`:

```js
SceneRecord = {
  id,
  order,
  title,
  narrativeRole: {
    role,
    narrativeFunction,
    startingState,
    endingState,
    turningPoint,
    agencyTransition,
    relationToPrevious
  },
  workspace: {
    narrativeState,
    sceneState,
    sequenceState
  },
  status: {
    narrative,
    visual,
    continuity
  }
}
```

`narrativeRole` belongs to Project Structure. `workspace` belongs to the Scene Director.

Editing Project Structure must never silently overwrite an already-directed Scene workspace.

### 4.3 Clone-on-read / clone-on-write

All Project Store public reads and writes use deep snapshots. Mutable references must not be shared between SceneRecords.

Changing Scene 02 must never mutate Scene 01 through shared nested object references.

### 4.4 Active Scene Runtime

`VDOSScene` remains a single active runtime. It represents only the Scene currently being edited.

Scene switching is a transaction:

```text
SAVE CURRENT SCENE
↓
ABORT ACTIVE REQUESTS
↓
UNBIND CURRENT RUNTIME
↓
LOAD TARGET SCENE SNAPSHOT
↓
CREATE / RESTORE ACTIVE VDOSScene
↓
REBIND TOOLS
↓
RENDER TARGET SCENE
```

UI components must not reconstruct this sequence themselves. A dedicated Project Runtime owns the transition.

### 4.5 Persisted vs runtime-only state

Persist per Scene:

- Narrative input
- Director intent
- Interpret readings
- Selected / edited reading
- Confirmed reading
- Strategies
- Selected strategy
- Sequence proposal
- Apply selection
- canonical Scene State snapshot
- stable Sequence state

Do not persist as stable Scene snapshot data:

- active network request
- `AbortController`
- in-flight request token as an active operation
- hover/focus state
- transient DOM state

If a Scene is switched while AI is running, abort the request. A stale response must not write into another active Scene.

## 5. Project Structure and AI Scene Breakdown

### 5.1 Dual entry

Project creation supports both:

- Manual Scene creation
- AI Scene Breakdown

Both paths converge into the same canonical Project State.

### 5.2 AI responsibility boundary

Project-level AI answers:

> Where does narrative state materially change enough to justify a Scene boundary?

It may produce:

- Project Reading
- Scene title
- Narrative role
- Narrative function
- Starting state
- Ending state
- Turning point
- Agency transition
- Relation to previous Scene
- Source basis / break basis

It must not produce or prescribe:

- Camera
- Color
- Space
- Line
- Texture
- Rhythm
- shot size
- lens
- lighting
- composition
- edit rhythm
- visual style

Those belong to Scene-level `NARRATIVE → STRATEGY → SEQUENCE → DIRECT`.

### 5.3 Project Reading before Scene Breakdown

A Breakdown response includes a Project Reading so the Director can inspect the global interpretation underlying the proposed Scene structure:

```text
Narrative Problem
Core Conflict
Starting State
Ending State
Agency Arc
```

### 5.4 Scene role vocabulary

First-version semantic roles are finite:

```text
SETUP
DEVELOPMENT
PRESSURE
RECOGNITION
ESCALATION
RUPTURE
REVERSAL
RELEASE
RESOLUTION
TRANSITION
```

A Scene may still have a work-specific natural-language title such as `REFUSAL` while its semantic role is `RUPTURE`.

### 5.5 Agency vocabulary

Use the existing VDOS agency vocabulary only:

```text
WORLD
CONTESTED
SHARED
CHARACTER
```

Do not create a Project-only agency language.

### 5.6 Proposal isolation

AI Breakdown writes only to `ProjectBreakdownDraft`.

```text
PROJECT STORY
↓
BREAK DOWN STORY
↓
ProjectBreakdownDraft
↓
DIRECTOR EDIT / SPLIT / MERGE / ADD / REMOVE / REORDER
↓
CONFIRM SCENE STRUCTURE
↓
ProjectState
```

No canonical Project mutation occurs before `CONFIRM SCENE STRUCTURE`.

### 5.7 Structural editing

#### Edit
All Scene proposal fields are editable. Director-edited fields are marked `DIRECTOR EDIT` and must not be silently overwritten by later AI operations.

#### Split
Split proposes two child Scenes and explains why the Scene boundary is meaningful. It is a local proposal until accepted.

#### Merge
Only adjacent Scenes can be merged in v1.

#### Remove
Removing a proposed Scene changes only the Draft until structure confirmation.

#### Add
Manual Scene insertion requires Project-level narrative fields only. Visual state remains undirected.

#### Reorder
Reordering is allowed but marks Project structure / continuity for review. Structural editing is not blocked merely because the resulting narrative may be unusual.

## 6. Directed / Undirected Semantics

A technical default Scene State must never be interpreted as a Director decision.

New SceneRecords may internally contain `DEFAULT_SCENE_STATE` for runtime compatibility, but Project Arc must render visual rows as `—` while:

```js
status.visual !== 'directed'
```

First-version visual status vocabulary:

```text
UNDIRECTED
IN PROGRESS
DIRECTED
```

A Scene remains editable after becoming directed; there is no heavyweight `FINALIZE SCENE` gate in v1.

## 7. Project Arc Derivation Rules

Project Arc is derived state. Do not persist a second editable copy of visual arc values.

Public derivation entry point:

```js
deriveProjectArc(projectState)
```

### 7.1 Narrative Role

Read directly from `SceneRecord.narrativeRole.role`.

### 7.2 Agency

Keep Project narrative intent and directed visual agency distinguishable.

A Scene can legitimately expose a mismatch such as:

```text
NARRATIVE → CHARACTER
VISUAL → CONTESTED
```

That mismatch is diagnostic information, not something to normalize away.

### 7.3 Camera Authority

Derive primarily from `variables.camera.perspective`:

```text
world      → WORLD
mixed      → CONTESTED
character  → CHARACTER
```

### 7.4 Color Territory

Derive from `variables.color.territory`:

```text
world      → WORLD
contested  → CONTESTED
character  → CHARACTER
```

Temperature, saturation, and contrast remain secondary detail, not primary Project Arc rows.

### 7.5 Spatial Pressure

Derive categorical Scene summary from compression / openness / negative space:

```text
LOW
MEDIUM
HIGH
```

Cross-Scene transition language may additionally expose `BUILD` or `RELEASE` when a boundary materially raises or releases pressure. `RELEASE` is a transition interpretation, not a raw Scene State enum.

### 7.6 Graphic Density

Derive from line density plus texture noise / granularity, using deterministic categorical rules:

```text
LOW
MEDIUM
HIGH
```

Do not invent percentage precision.

### 7.7 Rhythmic Energy

Derive from motion energy, cut density, and repetition into:

```text
LOW
MEDIUM
HIGH
```

No percentage score.

## 8. Cross-Scene Continuity Rules

Public deterministic entry point:

```js
deriveContinuity(projectState)
```

The v1 rule set is exactly:

### 8.1 Agency alignment

Compare narrative agency transition with directed visual ownership. Surface meaningful divergence.

### 8.2 Change without narrative cause

Warn when a major visual authority transition appears at a Scene boundary without a corresponding narrative transition.

### 8.3 Narrative rupture without visual response

Warn when a material narrative rupture has no visible response across the major visual systems.

### 8.4 Simultaneous maximum escalation

Warn when multiple major systems all peak or make maximum authority jumps at the same boundary. The diagnostic asks whether one system should lead; it does not automatically reduce anything.

### 8.5 Unresolved Scene

A missing undirected Scene yields `UNRESOLVED`, not `WARN`.

### 8.6 Severity semantics

- `PASS`: narrative change and visual response are explainably coherent.
- `WARN`: meaningful mismatch exists but may be an intentional Director choice.
- `FAIL`: reserved for severe project-level incoherence or invariant violation; not for ordinary stylistic disagreement.
- `UNRESOLVED`: insufficient directed data.

A large or abrupt change is not itself a problem. Continuity evaluates **cause → visual response → ownership consequence**, not smoothness.

## 9. Project Interaction Flow

### 9.1 New Project

```text
NEW PROJECT
PROJECT TITLE
PROJECT STORY
DIRECTOR INTENT (optional)

BREAK DOWN STORY
or
START WITH EMPTY PROJECT
```

No visual variables are shown at Project creation.

### 9.2 Breakdown flow

```text
PROJECT STORY
↓
PROJECT READING
↓
PROPOSED SCENE STRUCTURE
↓
DIRECTOR EDIT
↓
CONFIRM SCENE STRUCTURE
```

The UI clearly labels the pre-confirmation state as a proposal.

### 9.3 Project default landing

After Scene Structure confirmation, land on Project Arc rather than automatically entering Scene 01. Show the difference between confirmed narrative structure and still-undirected visual rows.

Primary CTA may be `DIRECT SCENE 01`.

### 9.4 Scene Context Bar

When a Scene is open, keep Project context visible above the existing modes:

```text
UNTITLED FILM / 01 COMPLIANCE
SETUP · WORLD → WORLD

← PROJECT ARC     01 / 04     NEXT SCENE →
```

### 9.5 Project Context inside Scene Narrative

A Scene's Narrative workspace receives upstream Project context:

```text
ROLE
FUNCTION
START
END
AGENCY
```

This context is intent, not confirmed truth about the actual Scene description. The Scene-level Interpret stage may identify divergence.

### 9.6 Apply propagation

After a successful Scene-level Apply:

```text
VDOSScene updated
↓
SceneRecord workspace snapshot updated
↓
status.visual = directed
↓
deriveProjectArc()
↓
deriveContinuity()
```

The user stays in the current Scene until choosing Project Arc or another Scene.

### 9.7 Scene switching

Support both:

```text
Scene 01 → NEXT SCENE → Scene 02
```

and:

```text
Scene 01 → PROJECT ARC → inspect continuity → Scene 02
```

### 9.8 Project Story edits

Editing source Project Story must not automatically re-run Breakdown or mutate existing directed Scenes. It may mark structure as needing review and allow a later new proposal.

Automatic Project reconcile is out of scope for v1.

## 10. AI API Boundary

Add one Project AI endpoint:

```text
POST /api/project/breakdown
```

Input:

```js
{
  sourceNarrative,
  directorIntent
}
```

Output:

```js
{
  projectReading: {
    narrativeProblem,
    coreConflict,
    startingState,
    endingState,
    agencyArc
  },
  scenes: [
    {
      id,
      title,
      role,
      narrativeFunction,
      startingState,
      endingState,
      turningPoint,
      agencyTransition,
      relationToPrevious,
      sourceBasis,
      breakBasis
    }
  ]
}
```

Use the existing server-side OpenAI Responses / Structured Outputs infrastructure, `store:false`, and server-only credentials.

Project Arc and Continuity do not require AI endpoints; they remain deterministic client-side logic.

Existing Narrative Interpret may accept optional:

```js
projectContext: {
  projectIntent,
  sceneRole,
  narrativeFunction,
  startingState,
  endingState,
  agencyTransition
}
```

Project Context is upstream intent, not forced truth.

## 11. Module Boundaries

Create focused modules rather than growing `director-v2-app.js` into a Project monolith:

```text
visual-direction-os/
  project-contracts.js
  project-state.js
  project-runtime.js
  project-breakdown-state.js
  project-breakdown-api-client.js
  project-breakdown-fixtures.js
  project-arc.js
  project-continuity.js
  project-workspace.js
  project-workspace.css
```

Responsibilities:

- `project-contracts.js`: Project enums, schemas, validation.
- `project-state.js`: pure Project / Scene store; no DOM.
- `project-runtime.js`: Active Scene lifecycle bridge between Project Store and existing `VDOSScene` / Narrative workspace.
- `project-breakdown-state.js`: isolated Breakdown proposal state.
- `project-breakdown-api-client.js`: Project Breakdown HTTP client and explicit demo path only.
- `project-breakdown-fixtures.js`: deterministic demo fixture.
- `project-arc.js`: pure deterministic Project Arc derivation.
- `project-continuity.js`: pure deterministic continuity findings.
- `project-workspace.js`: DOM rendering and interaction orchestration only.
- `project-workspace.css`: Project UI presentation.

Server modules live under `api/project/` and reuse existing Narrative provider infrastructure where practical.

## 12. MVP Scope

The first release includes:

1. Project Store
2. Scene Runtime Manager
3. Project Workspace
4. Manual Scene creation
5. AI Scene Breakdown
6. Breakdown editor: Edit / Add / Split / Merge adjacent / Remove / Reorder / Confirm
7. Project Arc derivation and rendering
8. Cross-Scene Continuity derivation and routing
9. Scene Context bar and upstream Project Context integration
10. Backward-compatible single-scene behavior

## 13. Explicit Non-Goals

Do not add in this release:

- collaboration / multi-user accounts
- cloud database or sync
- project version history
- project-wide Undo
- Final Draft / Fountain parser
- screenplay PDF parser
- shot list
- storyboard image generation
- image/video generation
- asset library
- production schedule
- budget
- character bible
- location bible
- non-linear Scene graph
- branching narrative
- Scene version comparison
- AI auto-fix
- automatic Project Story reconcile
- cross-Project management

## 14. Hard Invariants

These are release-blocking constraints:

1. **AI Project Breakdown never generates visual-direction variables.**
2. **Breakdown Proposal never mutates canonical Project State before explicit Confirm.**
3. **Technical default Scene State never appears as a Director decision for an undirected Scene.**
4. **Scene snapshots never share mutable nested state.**
5. **Switching Scene cannot allow a stale AI response to write into another Scene.**
6. **Project Arc is derived, not manually persisted as a competing copy.**
7. **Continuity explains and routes; it never auto-mutates a Scene.**
8. **Existing single-scene Narrative / Direct / Sequence / Diagnose behavior remains valid.**
9. **Project remains a context layer, not a fifth Director mode.**
10. **Do not merge to `master` without explicit user authorization.**

## 15. MVP Acceptance Flow

The browser-level acceptance path must prove that a Director can:

```text
Create Project
→ Generate 4 proposed Scenes
→ Edit one Scene
→ Split one Scene
→ Confirm structure
→ See 5 Scenes in Project Arc
→ Open Scene 01
→ Direct Scene 01
→ Apply
→ Return Project
→ See only Scene 01 visual rows populated
→ Open Scene 02
→ Change its Camera / Agency
→ Return Project
→ See Scene 01 and Scene 02 independently preserved
→ Receive continuity result for Scene 01 → Scene 02
→ Return Scene 01
→ Confirm Scene 01 values were not contaminated
```

Regression acceptance must also prove:

- AI Breakdown does not mutate Project before Confirm.
- Undirected Scenes render `—`, never default visual values.
- stale requests do not cross Scene boundaries.
- Project Arc derives from Scene snapshots.
- Continuity never mutates Scene state.
- Single-scene mode still works.
- accessibility, reduced-motion, mobile and desktop navigation remain intact.
