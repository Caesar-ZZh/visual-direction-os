# Visual Direction OS — Narrative Input / Narrative → Direction

Date: 2026-08-17
Status: Approved design, pre-implementation
Target branch: `agent/director-workspace-v2-1`

## 1. Purpose

Visual Direction OS already supports a downstream directing loop:

`LEARN → DIRECT → SEQUENCE → DIAGNOSE → GO TO CONTROL`

The missing layer is upstream: users still need to know the methodology well enough to decide which visual variables should change and why.

Narrative Input adds a new entry point that translates a scene or story problem into a structured, inspectable visual-direction proposal without taking director ownership away from the user.

The governing principle is:

> Narrative → Interpretation → Direction Strategy → Sequence Proposal → User Apply → Canonical Scene State

The system must help the user form a directing judgment. It must not behave like a generic style generator or silently rewrite current director state.

## 2. Product Position

Narrative Input is a first-class upstream mode, visually and conceptually before DIRECT.

Recommended navigation model:

- LEARN — understand the grammar
- NARRATIVE — turn story into a directing hypothesis
- DIRECT — make visual decisions
- SEQUENCE — orchestrate change over time
- DIAGNOSE — test coherence

For the first implementation, Narrative Input can be introduced into the existing Director Workspace without reorganizing unrelated views. The feature should feel like part of the current OS rather than a detached AI chat surface.

The current visual language must be preserved:

- dark background and restrained surface hierarchy
- orange as the key action / active-state accent
- serif display and section-title hierarchy
- mono metadata, labels, status, provenance, confidence and system-state text
- no generic SaaS card aesthetic
- no conversational chatbot bubble interface

## 3. Locked User Flow

The user flow is deliberately staged. AI cannot skip past a user decision.

### Stage 1 — Narrative Input

Required input:

- free-text scene / story description

Optional input:

- Director Intent

Example:

Scene description:

> He enters the office expecting to accept an assignment. As the conversation develops, he realizes that the assignment itself is a mechanism of control. He refuses and leaves.

Director Intent:

> I want the final moment to feel like the character has reclaimed control.

Primary action:

`START INTERPRETATION`

### Stage 2 — Interpret

The model returns 2–3 candidate Narrative Readings rather than one supposedly definitive answer.

Examples:

- Agency Recovery
- Institutional Rupture
- Moral Refusal

Each reading must include:

- title
- Narrative Problem
- Core Conflict
- Starting State
- Ending State
- Turning Point
- Agency Transition
- confidence signal
- field-level grounding metadata

The user selects one reading.

### Stage 3 — Edit & Confirm Reading

The selected Narrative Reading is editable before confirmation.

Editable fields:

- Narrative Problem
- Core Conflict
- Starting State
- Ending State
- Turning Point
- Agency Transition

The AI result is a proposal, never immutable truth.

The user must explicitly confirm the edited reading before Strategy generation.

Primary action:

`CONFIRM READING`

### Stage 4 — Direction Strategy

The confirmed reading is sent to the next model stage.

The model returns 2–3 distinct Visual Direction Strategies. All strategies must be valid interpretations of the same confirmed reading, but they should express different causal visual mechanisms.

Each strategy must include:

- title
- Primary Variable
- Supporting Variables
- Restrained Variables
- concise mechanism statement
- concise rationale for the primary-variable choice

Illustrative strategies:

- Space-led
- Camera-led
- Color Ownership-led

The system must not reduce the choice to a style preset. The user is choosing a directing mechanism.

Primary action:

`SELECT STRATEGY`

### Stage 5 — Sequence Proposal

The selected strategy is expanded into a five-beat Sequence Proposal:

1. SETUP
2. PRESSURE
3. RUPTURE
4. RELEASE
5. NEW OWNERSHIP

Each beat includes:

- Narrative Beat
- Agency
- Primary Variable
- Supporting Variables
- Restrained Variables
- Visual Events
- proposed Scene State changes
- concise causal rationale

The proposal is preview-only. It must not mutate current canonical Scene State while the user is reviewing it.

### Stage 6 — Apply

The user can choose:

- Apply All
- Apply Selected Beats

Only explicit Apply actions may write to the existing directing system.

Apply targets:

- Sequence Director / Sequence Score
- the canonical Scene State structure used by DIRECT and DIAGNOSE

The user must be able to preview impact before applying.

## 4. AI Pipeline

The pipeline uses three sequential AI calls rather than one monolithic generation.

### Call 1 — Interpret

Input:

- raw narrative text
- optional Director Intent
- methodology context required for Narrative Reading

Output:

- 2–3 candidate Narrative Readings

User decision gate:

- select
- edit
- confirm

### Call 2 — Strategy

Input:

- the user-confirmed Narrative Reading
- relevant methodology context

Output:

- 2–3 Visual Direction Strategies

User decision gate:

- select one strategy

### Call 3 — Sequence

Input:

- confirmed Narrative Reading
- selected Visual Direction Strategy
- current Sequence / Scene State compatibility context as needed

Output:

- five-beat Sequence Proposal
- proposed visual events
- proposed state changes

User decision gate:

- preview
- apply all or selected beats

A later stage must never be generated from an unconfirmed earlier stage.

If the user edits a previously confirmed upstream decision, downstream generated data becomes stale and must be invalidated or explicitly regenerated.

## 5. AI Architecture

The frontend must never call a model provider directly with a production secret.

Architecture:

`Visual Direction OS frontend → Narrative API → thin AI Adapter → initial model provider`

The frontend only knows Visual Direction OS API contracts.

Initial endpoints:

- `POST /api/narrative/interpret`
- `POST /api/narrative/strategy`
- `POST /api/narrative/sequence`

The AI Adapter owns provider-specific request syntax, model selection and structured-output configuration.

The adapter does not own:

- canonical Scene State
- user selection state
- Apply behavior
- DIRECT state mutation
- DIAGNOSE state mutation

This keeps provider replacement isolated. The first release connects one model only; there is no user-facing model switcher.

## 6. Structured Output Contracts

Exact field names may be adjusted during implementation, but the semantic contract is fixed.

### Interpretation response

```json
{
  "readings": [
    {
      "id": "reading-1",
      "title": "AGENCY RECOVERY",
      "confidence": "high",
      "narrativeProblem": { "value": "...", "sourceType": "inferred", "basis": "..." },
      "coreConflict": { "value": "...", "sourceType": "inferred", "basis": "..." },
      "startingState": { "value": "...", "sourceType": "explicit", "basis": "..." },
      "endingState": { "value": "...", "sourceType": "explicit", "basis": "..." },
      "turningPoint": { "value": "...", "sourceType": "inferred", "basis": "..." },
      "agencyTransition": { "value": ["world", "contested", "character"], "sourceType": "inferred", "basis": "..." }
    }
  ],
  "clarification": null
}
```

### Strategy response

```json
{
  "strategies": [
    {
      "id": "strategy-1",
      "title": "SPACE-LED",
      "primaryVariable": "space",
      "supportingVariables": ["camera", "color"],
      "restrainedVariables": ["texture", "rhythm"],
      "mechanism": "...",
      "rationale": "..."
    }
  ]
}
```

### Sequence response

```json
{
  "sequenceProposal": {
    "beats": [
      {
        "id": "setup",
        "label": "SETUP",
        "narrativeBeat": "...",
        "agency": "world",
        "primaryVariable": "camera",
        "supportingVariables": ["space"],
        "restrainedVariables": ["texture"],
        "visualEvents": [],
        "sceneStatePatch": {},
        "rationale": "..."
      }
    ]
  }
}
```

Schema validation is mandatory at the Narrative API boundary.

Malformed or semantically invalid model output must be rejected before it reaches application state.

## 7. Grounded Interpretation

Visual Direction OS must distinguish user evidence from model interpretation.

Every core Narrative field supports:

- `EXPLICIT` — directly supported by user text
- `INFERRED` — model interpretation based on the text
- `DIRECTOR INTENT` — derived from the optional Director Intent input

Each field also includes a short Basis / rationale.

The UI should show concise support, not a model chain-of-thought transcript.

The system must never expose or claim to expose internal model reasoning.

The design goal is inspectable judgment:

> What did the user say? What did the system infer? Why is that inference relevant to this directing choice?

## 8. Ambiguity and Uncertainty

Principle:

> Don't block ambiguity. Expose it.

Narrative signal may be described as:

- Strong
- Partial
- Weak

A weak or partial signal does not automatically block the user.

Individual fields may be marked `LOW CONFIDENCE` or equivalent.

When clarification is materially useful, the system asks one targeted question with the highest expected information gain.

Example:

> Does the character leave because they made an independent decision, or because another person required them to leave?

After a clarification answer:

- regenerate only the current Interpret stage
- preserve the original user narrative
- preserve explicitly confirmed content where compatible
- do not regenerate Strategy or Sequence until the revised Reading is reconfirmed

There is no generic `REGENERATE EVERYTHING` as the primary recovery mechanism.

## 9. State Model and Ownership

Narrative generation state is separate from canonical directing state until Apply.

Recommended conceptual state boundary:

```text
NarrativeDraft
  input
  directorIntent
  readings
  selectedReading
  confirmedReading
  strategies
  selectedStrategy
  sequenceProposal
  selectedBeatIds
  generationStatus
  errors

Canonical Scene State
  existing VDOSScene state
```

NarrativeDraft can reference current Scene State for compatibility, but cannot mutate it before Apply.

Apply is a deliberate transaction from proposal state into the existing directing state.

Current canonical state remains the source of truth for DIRECT and DIAGNOSE.

## 10. Apply Semantics

### Apply All

Apply the full proposed sequence in beat order.

The implementation must map proposal state patches into the existing Sequence Director model without silently destroying unrelated state.

### Apply Selected Beats

The user chooses one or more beats.

Only selected beat state/event changes are transferred.

Unselected beats remain unchanged in the current director sequence.

If applying a selected beat would create an invalid sequence dependency, the UI must surface the conflict rather than silently compensating.

### Preview Impact

Before Apply, show the difference between current state and proposed state at a meaningful level, especially:

- agency / ownership
- primary variables
- major variable state changes
- visual events

The first version does not require a full generic object diff viewer.

## 11. Interface Composition

### Navigation / placement

Narrative Input is presented as a dedicated upstream workspace, not embedded inside a variable control card.

The approved visual direction uses:

- left-side mode/navigation entry on desktop
- a clear `NARRATIVE INPUT` workspace title
- stage progress across the top of the workspace

Primary stage labels:

1. Interpret
2. Edit Reading
3. Strategy
4. Sequence
5. Apply

### Narrative entry screen

The entry screen should feel editorial and directional, not like chat.

Elements:

- `TELL YOUR STORY`
- large scene description field
- optional Director Intent field
- character count / sensible input bounds
- `START INTERPRETATION`

### Interpretation candidates

2–3 readings are presented side by side on desktop and sequentially on narrow layouts.

Each candidate emphasizes:

- title
- short mechanism summary
- agency transition
- confidence

Detailed field grounding appears after selection or through a focused detail region to avoid overloading the comparison cards.

### Edit & Confirm

The selected Reading becomes an editable structured sheet.

Source-type tags remain visible near the corresponding field.

Editing a value changes the field into user-owned content for the current draft and must not misleadingly preserve the original AI provenance label.

### Strategy candidates

Strategies are comparable cards emphasizing:

- Primary
- Support
- Restrain
- mechanism
- concise rationale

The active strategy is visually unambiguous.

### Sequence Proposal

The primary representation is a five-beat structured sequence view rather than an undifferentiated AI paragraph.

The user must be able to inspect each beat's Narrative, Agency, visual-variable roles, events and proposed Scene State.

### Apply

Apply controls are separated from generation controls.

The user chooses Apply All or Apply Selected Beats and receives a clear preview of what will change.

## 12. Error and Loading Behavior

Each AI stage is independently recoverable.

Required states:

- idle
- loading
- success
- low-confidence / clarification-needed
- schema-invalid response
- provider/network failure
- user-cancelled / superseded request if supported by runtime

Rules:

- preserve user input on failure
- preserve confirmed upstream decisions
- never partially apply model output to canonical Scene State
- provide retry for the failed stage only
- do not silently fall back to fabricated local results when the server call fails

If a later response arrives after the user changed the upstream input, stale responses must not overwrite the newer draft.

## 13. Accessibility and Responsive Behavior

The feature must meet the quality bar already enforced in Director Workspace.

Requirements include:

- semantic form labels
- keyboard-operable reading, strategy and beat selection
- visible focus states
- clear accessible names for all controls
- no nested interactive controls
- screen-reader announcement of stage completion and validation errors where appropriate
- reduced-motion compliance
- no horizontal interaction trap on mobile
- stage flow must remain understandable without relying on color alone
- confidence and provenance must use text labels, not color-only badges

## 14. Testing Strategy

Implementation will use TDD.

### Contract / schema tests

Validate:

- Interpret request / response schema
- Strategy request / response schema
- Sequence request / response schema
- invalid response rejection
- allowed enum values for source type, agency and variable families

### State-transition tests

Lock:

- Strategy cannot generate before Reading confirmation
- Sequence cannot generate before Strategy selection
- editing confirmed Reading invalidates downstream Strategy / Sequence
- proposal generation never mutates canonical Scene State
- Apply All mutates only at explicit Apply
- Apply Selected Beats transfers only selected beats
- stale responses cannot replace newer draft state

### Browser acceptance tests

Lock:

- Narrative Input navigation reachable on desktop and mobile
- free text + optional Director Intent submission
- 2–3 Reading candidates visible
- candidate select → editable Reading → confirm
- 2–3 Strategy candidates visible
- Strategy selection → Sequence Proposal
- five beats visible in correct order
- Apply controls separated from preview
- field-level provenance labels shown
- low-confidence clarification flow asks one question
- stage retry preserves confirmed upstream state

### Regression tests

Existing DIRECT, Sequence, Diagnose, ownership transfer, route-to-control and current Scene State tests must remain green.

## 15. Security and Privacy

- No production model API key in browser code.
- Narrative text is sent only through the server-side Narrative API.
- Provider credentials live in server environment configuration.
- The frontend should not log raw narrative content to analytics by default.
- Server error responses should not expose provider secrets or raw internal prompts.

## 16. Scope Boundaries / Non-Goals

Not part of the first Narrative Input release:

- multi-scene project management
- visual bible generation
- shot-list generation
- image generation
- automatic storyboard generation
- user-facing model selection
- provider comparison
- collaboration / comments
- long-term cloud project persistence unless required by deployment infrastructure
- automatically applying AI output without user confirmation
- arbitrary chat with the model

These can be addressed in later project stages, especially Multi-Scene Project and Director Output.

## 17. Success Criteria

The first release succeeds if a user with a story fragment can:

1. enter a scene without already knowing Visual Direction OS variable terminology;
2. compare multiple plausible Narrative Readings;
3. inspect what is explicit vs inferred;
4. edit and confirm the interpretation they actually want;
5. compare multiple visual directing mechanisms rather than style presets;
6. preview a causal five-beat sequence;
7. selectively transfer approved choices into the existing Director / Sequence system;
8. see DIAGNOSE evaluate the resulting canonical state using the existing coherence model.

The feature is not successful if users experience it as “type a prompt and receive an AI aesthetic.”

## 18. Approved Design Decisions

The following decisions are locked for implementation:

- Free-text scene description + optional Director Intent.
- Generate 2–3 Narrative Readings.
- Selected Reading is editable before confirmation.
- Generate 2–3 Visual Direction Strategies from the confirmed Reading.
- Strategy selection is based on Primary / Support / Restrain and causal mechanism.
- Generate a five-beat Sequence Proposal.
- Proposal is Preview-only until explicit Apply.
- Support Apply All and Apply Selected Beats.
- Use an independent server-side Narrative API with a thin provider Adapter.
- First release uses one model provider; no model switcher.
- Use three staged AI calls: Interpret → Strategy → Sequence.
- Each stage requires user confirmation / selection before the next stage.
- Use field-level grounding with EXPLICIT / INFERRED / DIRECTOR INTENT.
- Do not expose internal model chain-of-thought.
- Expose uncertainty instead of blocking all ambiguous input.
- Ask at most one targeted clarification question at a time.
- Regenerate the current stage only after clarification.
- Narrative proposal state remains isolated from canonical Scene State until Apply.
- Existing DIRECT / Sequence / DIAGNOSE architecture remains authoritative downstream.

## 19. Implementation Order

The implementation plan should decompose the work into small independently testable slices, approximately:

1. Narrative draft state + UI shell + stage navigation
2. typed / validated Narrative API contracts
3. Interpret stage with mock / adapter boundary and Reading confirmation
4. Strategy stage
5. Sequence Proposal stage
6. Apply transaction into existing Sequence / Scene State
7. uncertainty / clarification recovery
8. server-side provider adapter and deployment configuration
9. accessibility, responsive polish and full regression verification

No implementation should begin until this spec is reviewed and accepted.