# Sequence Director + Diagnostic Routing — Design Spec

Date: 2026-08-17
Branch: `agent/director-workspace-v2-1`
Status: Approved direction, design gate before implementation

## 1. Goal

Upgrade Visual Direction OS from a visual-state simulator into a visual-direction decision system.

The next release must answer four questions that the current Scene State layer cannot answer by itself:

1. **When should a visual change happen?**
2. **Why should it happen at that moment?**
3. **Which visual variable leads, which variables support, and which should be restrained?**
4. **If the resulting visual system is incoherent, where should the user go to correct it?**

The governing principle is:

> A sequence is not six independent tracks changing over time. It is a narrative structure that causes staged visual events, transfers visual ownership, and can be diagnosed and corrected.

This phase extends the existing canonical Scene State rather than replacing it.

---

## 2. Product Scope

This phase contains five tightly coupled deliverables:

1. **Narrative Beat System**
2. **Visual Events**
3. **Primary / Support / Restrain hierarchy**
4. **Sequence Playback → Scene State → Visual Response**
5. **Diagnostic Routing → Direct control → Recheck**

No new top-level product mode is introduced. LEARN / DIRECT / DIAGNOSE remain the primary product structure.

### Explicitly out of scope

- AI image generation
- WebGL / 3D
- a freeform nonlinear sequence editor
- user-authored arbitrary rule scripting
- new Knowledge Atlas information architecture
- numeric “quality scores” or fake precision
- automatic correction without user confirmation
- rewriting the current Scene State model

---

## 3. Architecture

The current architecture remains the source of truth:

```text
DIRECT controls
State Machine
Sequence
    ↓
Canonical Scene State
    ↓
Visual Response
Diagnostic
```

The new architecture adds two deterministic layers:

```text
Narrative Sequence Model
  ├─ Beats
  ├─ Visual Events
  └─ Variable Hierarchy
          ↓
Sequence Director
          ↓
Canonical Scene State
          ↓
Visual Response
          ↓
Diagnostic Engine
          ↓
Diagnostic Route
          ↓
DIRECT control target
```

### Design rule

`Sequence Director` may **publish** scene-state changes, but must never become a second independent scene-state store.

`Diagnostic Routing` may **recommend and navigate**, but must never silently mutate the scene state.

---

## 4. Narrative Beat System

### 4.1 Purpose

The existing Sequence Score shows visual values at a playhead position. The new Sequence Director must show the narrative function of time.

A sequence is divided into named beats. Initial built-in beat vocabulary:

- `SETUP`
- `PRESSURE`
- `RUPTURE`
- `RELEASE`
- `NEW OWNERSHIP`

These are semantic roles, not fixed timestamps. A character sequence may omit or rename beats internally, but the UI should preserve a compact five-stage default for the first implementation.

### 4.2 Beat data contract

Each beat contains:

```js
{
  id,
  label,
  start,
  end,
  narrativePurpose,
  primaryVariable,
  supportingVariables,
  restrainedVariables,
  tensionLevel,
  events
}
```

`start` and `end` use normalized timeline positions from `0` to `1`, matching the existing shared playhead model.

### 4.3 Beat behavior

At any playhead position, exactly one beat is active.

The UI must visibly answer:

- What beat am I in?
- What is this beat trying to achieve?
- Which visual variable leads here?
- Which visual variables should remain secondary?

The beat model must remain deterministic and static for the initial version. No drag-to-create beat editor is added in this phase.

---

## 5. Visual Events

### 5.1 Purpose

Visual change should not be treated as continuous anonymous motion. Important causal changes need explicit event markers.

Initial event vocabulary:

- `OWNERSHIP SHIFT`
- `CAMERA BREAK`
- `COLOR MIGRATION`
- `SPACE COLLAPSE`
- `TEXTURE PEAK`
- `AGENCY TRANSFER`

### 5.2 Event data contract

```js
{
  id,
  type,
  at,
  beatId,
  cause,
  primaryChange,
  supportingChanges,
  heldBack,
  targetPatch
}
```

`targetPatch` is a deterministic Scene State patch used during playback. It is not applied merely because the user selects the event.

### 5.3 Event interaction

Clicking an event marker opens an explanation panel containing:

- **CAUSE**
- **PRIMARY CHANGE**
- **SUPPORTING CHANGE**
- **HELD BACK**

Selecting an event must not itself mutate the current Scene State.

Playback or playhead movement may apply the event-derived state for the current time.

---

## 6. Primary / Support / Restrain Hierarchy

### 6.1 Purpose

The system must explicitly reject the idea that stronger direction means making every variable peak together.

Each beat assigns the six visual families into three roles:

- **PRIMARY** — the main narrative carrier
- **SUPPORT** — reinforces the primary variable
- **RESTRAIN** — intentionally held back to preserve hierarchy

### 6.2 UI

The Sequence Director shows a compact hierarchy block for the active beat, for example:

```text
PRIMARY
SPACE

SUPPORT
COLOR · CAMERA

RESTRAIN
TEXTURE · LINE · RHYTHM
```

The hierarchy must be readable at a glance and must not rely on a synthetic score.

### 6.3 Diagnostic relationship

The diagnostic engine can compare actual Scene State behavior against the declared hierarchy.

Example finding:

> `HIERARCHY · WARN` — Texture is peaking during a Space-led beat and is competing with the declared primary variable.

---

## 7. Visual Tension Curve

### 7.1 Purpose

Add one qualitative tension envelope to show narrative pressure across the sequence.

This is a shape, not a numeric score.

The UI may display LOW / MEDIUM / HIGH anchors, but must not expose fake precision such as `72.4`.

### 7.2 Use

The tension curve gives context to the six visual tracks and enables recovery diagnostics.

Example:

- narrative pressure has entered RELEASE
- texture, compression, and camera instability remain HIGH
- diagnostic result: visual energy has failed to recover after narrative pressure released

---

## 8. Sequence Playback → Visual Response

### 8.1 Required data flow

```text
Playhead
  ↓
Active Beat + Active Events
  ↓
deriveSequenceState(playhead)
  ↓
Scene State patch
  ↓
VDOSScene.set(...)
  ↓
Visual Response Layer
  ↓
Page atmosphere / focus / pressure / line / texture / motion
```

### 8.2 Playback semantics

Playback controls:

- Play / Pause
- scrub playhead
- jump to previous / next visual event

The first version does not need frame-accurate playback or audio synchronization.

### 8.3 Manual-control priority

Sequence playback is an explicit mode of control.

When playback is active, sequence-derived state controls the Scene State.

When the user manually edits a DIRECT control, playback pauses and the user regains direct control.

This avoids hidden competition between manual controls and the sequence player.

### 8.4 Reduced motion

`prefers-reduced-motion` does not disable timeline state changes. It disables non-essential animated transitions between those states.

Information equivalence must remain intact.

---

## 9. Diagnostic Routing

### 9.1 Finding categories

Each deterministic diagnostic finding belongs to one category:

- `CAUSALITY`
- `HIERARCHY`
- `OWNERSHIP`
- `TIMING`
- `CONTINUITY`
- `RECOVERY`

### 9.2 Finding contract

A finding extends the current PASS / WARN / FAIL model:

```js
{
  id,
  severity,
  category,
  title,
  evidence,
  recommendation,
  route,
  learnTarget
}
```

`route` is optional and points to a DIRECT control:

```js
{
  family: 'camera',
  control: 'perspective',
  suggestedDirection: 'character'
}
```

### 9.3 Fix Route interaction

A WARN / FAIL card can expose:

- `GO TO CONTROL`
- `UNDERSTAND MECHANISM` when a matching Knowledge Atlas target exists

`GO TO CONTROL` must:

1. switch to / scroll to DIRECT
2. reveal the correct variable family
3. focus the relevant control group
4. apply a temporary visual highlight
5. **not automatically change the selected value**

The recommendation remains advisory.

### 9.4 Recheck loop

The intended product loop is:

```text
DIRECT
  ↓
DIAGNOSE
  ↓
Finding
  ↓
GO TO CONTROL
  ↓
User changes variable
  ↓
Visual Response updates
  ↓
Diagnostic re-evaluates
```

The system may show severity transitions such as FAIL → WARN → PASS, but must not claim a universal numeric improvement score.

---

## 10. Before / Recommended Direction

For actionable WARN / FAIL findings, display the relevant current state and recommended direction.

Example:

```text
CURRENT
Agency      CHARACTER
Camera      WORLD
Color       CHARACTER

RECOMMENDED DIRECTION
Camera      MIXED → CHARACTER
```

This is intentionally a directional recommendation rather than an auto-fix.

---

## 11. Knowledge Atlas Integration

Diagnostic findings may contain `learnTarget` identifiers that map to existing Knowledge Atlas sections.

Examples:

- color ownership conflict → Color / Ownership mechanism
- camera / agency mismatch → Agency / Camera mechanism
- hierarchy conflict → Visual hierarchy / sequence mechanism

This phase adds routing only. It does not rewrite Knowledge Atlas content.

---

## 12. UI Composition

### 12.1 Sequence Director replaces, not duplicates, Sequence Score

The existing Sequence Score section evolves in place.

Desktop composition:

1. section title + active beat
2. tension curve
3. beat band
4. event markers
5. six visual tracks
6. active-beat hierarchy + event explanation panel
7. playback controls

Mobile composition collapses vertically but preserves the same semantic order.

### 12.2 Visual style

Reuse the current Visual Direction OS system:

- ivory editorial serif for major titles and key values
- clean sans metadata system
- dark charcoal surfaces
- orange for current/active directional state
- green / amber / red reserved for Diagnostic severity

No new decorative visual language should compete with the existing system.

---

## 13. Error and Edge Handling

- playhead values are clamped to `0…1`
- beat ranges must be ordered and non-overlapping
- exactly one active beat is derived at each valid playhead position
- events outside a valid beat are rejected in model tests
- unknown event types degrade to a generic `VISUAL EVENT` label rather than breaking the UI
- invalid diagnostic route targets render recommendation text without a `GO TO CONTROL` action
- missing Knowledge Atlas targets hide `UNDERSTAND MECHANISM` rather than linking nowhere
- playback stops if the user performs an explicit DIRECT edit
- the sequence model never overwrites the canonical Scene State object directly; it publishes via the existing state API

---

## 14. File Boundaries

Prefer focused modules rather than growing existing files indefinitely.

Proposed new files:

- `sequence-director-model.js` — beats, events, tension, state derivation
- `sequence-director.js` — UI rendering + playback controller
- `diagnostic-routing.js` — route resolution and Direct navigation/focus behavior
- corresponding model tests

Existing files extended carefully:

- `sequence-score.js` — either becomes a thin compatibility wrapper or delegates to Sequence Director
- `diagnostic.js` — emits route/category metadata
- `director-v2-app.js` — initialization only
- `director-v2-tools.css` — Sequence Director and routing visual states

The canonical `scene-state.js` API remains the state boundary.

---

## 15. Testing Strategy

### 15.1 Model tests

Test:

- active beat derivation at boundaries
- event selection at exact positions
- valid hierarchy declarations
- tension envelope lookup
- deterministic sequence-state patches
- playhead clamp behavior
- diagnostic route generation
- invalid route fallback

### 15.2 Browser acceptance

At 390px and 1440px verify:

1. Sequence Director renders beat band + visual events + hierarchy.
2. Scrubbing across a visual event updates shared Scene State.
3. Visual Response visibly receives the sequence-derived state.
4. State Machine and Sequence remain synchronized on the same playhead.
5. Starting playback updates state over time.
6. Manual DIRECT edit pauses playback.
7. Diagnostic finding exposes a deterministic `GO TO CONTROL` route.
8. `GO TO CONTROL` lands on the correct DIRECT variable and focuses/highlights it.
9. The route does not auto-change the value.
10. After the user changes the routed control, Diagnostic re-evaluates from the shared Scene State.
11. Reduced Motion preserves state changes while suppressing non-essential transitions.
12. No page-level horizontal overflow is introduced.

### 15.3 Regression gates

All current model, Visual QA, Pages assembly, mobile navigation, desktop rail, typography, ownership, Visual Response, and Diagnostic fixture tests remain mandatory.

---

## 16. Success Criteria

The phase is complete when a user can experience this loop without ambiguity:

1. Play or scrub a narrative sequence.
2. See the active narrative beat and explicit visual event.
3. See which variable is primary, supporting, or restrained.
4. Watch the canonical Scene State drive the page’s Visual Response.
5. Receive a deterministic Diagnostic finding when direction becomes incoherent.
6. Use `GO TO CONTROL` to reach the exact DIRECT variable involved.
7. Make the correction manually.
8. See the diagnostic state re-evaluate.

At that point Visual Direction OS has moved from **Visual State Simulator** toward a genuine **Visual Direction Decision System** without adding fake automation or fake precision.
