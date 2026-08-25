# Generation Evaluation Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure Agnes generation proxy and an evidence-aware `GENERATE → EVALUATE → RE-DIRECT` loop without changing Visual IR v0.1.

**Architecture:** Keep generation provider-specific code in the Agnes adapter/transport layer, add a separate model-neutral image measurement/evaluation engine, and bind each generated image to a Generation Artifact. The static GitHub Pages frontend calls a separately deployed Vercel-compatible proxy so the Agnes key never enters the browser.

**Tech Stack:** Vanilla JavaScript, Node.js built-in `fetch`, browser Canvas, Node `assert`, Vercel-compatible `/api` function.

**Spec:** `docs/superpowers/specs/2026-08-24-generation-evaluation-loop-design.md`

## Global Constraints

- Visual IR schema remains `0.1.0`.
- Generation model remains `agnes-image-2.1-flash`.
- Agnes upstream endpoint remains `https://apihub.agnes-ai.com/v1/images/generations`.
- API Key must never be stored in frontend code or localStorage.
- Automatic QA may only score measurable evidence; semantic checks remain `human_required`.
- Maximum references: 8.
- Maximum prompt length: 24,000 characters.
- Maximum proxy request body: 16 MB.

---

### Task 1: Secure Agnes Proxy

**Files:**
- Create: `api/agnes-generate.js`
- Create: `api/agnes-generate-tests.js`
- Create: `vercel.json`

**Interfaces:**
- Consumes: Agnes request shape created by `runtime/agnes-adapter.js`.
- Produces: default exported async handler `(req, res)`, plus exported pure helpers `validateRequest`, `resolveAllowedOrigin`, and `buildUpstreamPayload` for tests.

- [ ] **Step 1: Write failing proxy tests**

Test pure validation and mocked handler behavior with Node `assert`: reject wrong method/model/size/ratio/reference count; preserve `extra_body.image`; whitelist output fields; ensure Authorization is created only from `process.env.AGNES_API_KEY`.

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
node api/agnes-generate-tests.js
```

Expected: fail because `api/agnes-generate.js` does not exist.

- [ ] **Step 3: Implement minimal proxy**

Implement:

```js
const AGNES_ENDPOINT = 'https://apihub.agnes-ai.com/v1/images/generations';
const MODEL = 'agnes-image-2.1-flash';
const SIZES = new Set(['1K','2K','3K','4K']);
const RATIOS = new Set(['1:1','3:4','4:3','16:9','9:16','2:3','3:2','21:9']);
```

Validate body size via `JSON.stringify(body).length`, sanitize output shape, use `AbortController` timeout, expose CORS only for configured origins, and return safe `{ error: { message, code } }` responses.

- [ ] **Step 4: Run proxy tests GREEN**

```bash
node api/agnes-generate-tests.js
node --check api/agnes-generate.js
```

Expected: PASS / syntax clean.

- [ ] **Step 5: Add Vercel function config**

Use `vercel.json` function pattern `api/agnes-generate.js` with `maxDuration: 300`.

---

### Task 2: Pixel Measurement Engine

**Files:**
- Create: `visual-direction-os/runtime/image-measurements.js`
- Create: `visual-direction-os/runtime/image-measurements-tests.js`

**Interfaces:**
- Produces: `measurePixels({width,height,data})`, `ratioToNumber(ratio)`, `compareRatio(width,height,targetRatio)`.
- `data` is RGBA Uint8ClampedArray-compatible input, allowing deterministic tests without DOM Canvas.

- [ ] **Step 1: Write failing deterministic tests**

Create synthetic black, white, checkerboard, grayscale gradient, and saturated-red pixel arrays. Assert relative behavior rather than fragile exact thresholds: checkerboard edge density > flat image; red saturation > grayscale; gradient luminance stddev > flat; correct 16:9 passes and 4:3 vs 16:9 warns.

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/runtime/image-measurements-tests.js
```

Expected: module missing.

- [ ] **Step 3: Implement measurement functions**

Compute Rec.709 luminance, HSL-like saturation proxy, histogram entropy, horizontal/vertical luminance gradients, local contrast, and dimension metadata. No semantic labels in this module.

- [ ] **Step 4: Run GREEN**

```bash
node visual-direction-os/runtime/image-measurements-tests.js
node --check visual-direction-os/runtime/image-measurements.js
```

---

### Task 3: Evidence-aware Evaluation + Re-direction Delta

**Files:**
- Create: `visual-direction-os/runtime/evaluation-engine.js`
- Create: `visual-direction-os/runtime/evaluation-engine-tests.js`

**Interfaces:**
- Consumes: `VisualIR`, Agnes request, measurement object, optional human decisions.
- Produces: `evaluateArtifact({ir,request,measurements,human})` and `compileReDirectionDelta(report)`.

- [ ] **Step 1: Write failing evaluation tests**

Assert:
- ratio mismatch becomes measured `warn`.
- unknown saturation/detail/value/edge targets become `unsupported` rather than guessed.
- semantic checks are `human_required` until user decisions exist.
- human `pass` adds preserve rule.
- human `needs_work` adds correct rule.
- `not_sure` only enters unresolved.
- delta appendix excludes unresolved rules.

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/runtime/evaluation-engine-tests.js
```

- [ ] **Step 3: Implement target mapping and report compiler**

Use conservative mappings for low/moderate/high directions only. Keep measured and human evidence separate. Do not calculate one synthetic overall confidence percentage.

- [ ] **Step 4: Run GREEN**

```bash
node visual-direction-os/runtime/evaluation-engine-tests.js
node --check visual-direction-os/runtime/evaluation-engine.js
```

---

### Task 4: Generation Artifact + QA / Iteration UI

**Files:**
- Modify: `visual-direction-os/runtime/generation-ui.js`
- Modify: `visual-direction-os/runtime/generation-client.js`
- Modify: `visual-direction-os/runtime/agnes-adapter.js`
- Modify: `visual-direction-os/app.js`
- Create: `visual-direction-os/runtime/evaluation-ui.js`
- Create: `visual-direction-os/runtime/evaluation.css`
- Create: `visual-direction-os/runtime/iteration-tests.js`

**Interfaces:**
- `generation-ui.js` publishes `VisualDirectionOS.generation.activeArtifact` and dispatches `vdos:generation-complete`.
- `agnes-adapter.js` gains `applyIterationDelta(request, delta)` that returns a cloned request with `ITERATION / EVALUATION DELTA` appended to prompt.
- `evaluation-ui.js` listens for generation events, measures the rendered image via Canvas, renders report controls, and calls generation runtime for re-generation.

- [ ] **Step 1: Write failing iteration tests**

Test `applyIterationDelta()` cloning and prompt appendix behavior; test artifact creation helper in a DOM-independent path if practical.

- [ ] **Step 2: Run RED**

```bash
node visual-direction-os/runtime/iteration-tests.js
```

- [ ] **Step 3: Add proxy configuration UI**

Allow a safe proxy URL to be stored in localStorage as `vdos-generation-proxy`. Continue supporting `window.VDOS_GENERATION_PROXY`. Do not store an API key.

- [ ] **Step 4: Add Generation Artifact creation**

On success capture provider, request snapshot, result, Visual IR version and grammar provenance; emit `vdos:generation-complete`.

- [ ] **Step 5: Add image measurement bridge**

For Base64 or CORS-readable URL images, draw to a downsampled Canvas and feed raw pixels to `measurePixels`. On canvas security error, create an evaluation report with pixel analysis marked unsupported and keep human QA available.

- [ ] **Step 6: Build QA / Iteration workbench**

Render Measured Signals, Director Judgment, Deviation Ledger, and `RE-DIRECT & GENERATE`. Human buttons use PASS / NEEDS WORK / NOT SURE. Recompute delta immediately after each decision.

- [ ] **Step 7: Wire runtime asset loading**

Load measurement/evaluation engines before UI, and load `evaluation.css` in `app.js`.

- [ ] **Step 8: Run full runtime verification**

```bash
node visual-direction-os/runtime/runtime-tests.js
node visual-direction-os/runtime/agnes-adapter-tests.js
node visual-direction-os/runtime/generation-client-tests.js
node visual-direction-os/runtime/image-measurements-tests.js
node visual-direction-os/runtime/evaluation-engine-tests.js
node visual-direction-os/runtime/iteration-tests.js
node api/agnes-generate-tests.js
node --check visual-direction-os/runtime/evaluation-ui.js
node --check visual-direction-os/runtime/generation-ui.js
node --check visual-direction-os/app.js
```

Expected: all tests pass and syntax checks return exit 0.

---

## Self-review

- Spec coverage: proxy security, measurable QA, human-required semantics, delta compilation, proxy configuration, CORS degradation and re-generation are all assigned to tasks.
- Placeholder scan: no TBD/TODO implementation gaps.
- Type consistency: `measurePixels`, `evaluateArtifact`, `compileReDirectionDelta`, `applyIterationDelta`, and `activeArtifact` are consistently named across tasks.
- Scope: no multimodal model evaluator, persistence, authentication or automatic retry is included.
