# Sector 8 Release Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the current editorial SYSTEM at the public root while publishing Director Workspace v2.1 as STUDIO at `/studio/`, with safe two-way navigation and release gates.

**Architecture:** Keep the zero-build static architecture. `build-pages-site.js` remains the Pages assembler, but it must preserve the source `index.html` as the deployed root and generate `studio/index.html` from `director-v2.html` with `<base href="../">` so Studio shares the existing root CSS/JS assets. Source branch review continues to support `director-v2.html`, while a small `studio/index.html` redirect shim makes `studio/` links usable in RawGitHack branch previews.

**Tech Stack:** Vanilla HTML/CSS/JS, Node.js filesystem build script, GitHub Actions, Playwright Chromium, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-18-sector-8-release-architecture-design.md`

## Global Constraints

- SYSTEM remains the public default experience at `/`.
- STUDIO is published at `/studio/`.
- Do not replace source `visual-direction-os/index.html` with Director Workspace.
- Keep Vanilla HTML/CSS/JS and zero-build delivery.
- `projectDemo=1` and `narrativeDemo=1` remain explicit fixtures only.
- No login, cloud sync, collaboration, generated imagery or automatic continuity repair.
- Pages deployment remains gated to `master` plus manual workflow dispatch.
- Sector 7 optional-persistence failure isolation must remain intact.

---

### Task 1: Lock the Pages route contract with failing tests

**Files:**
- Create: `visual-direction-os/build-pages-site.test.js`
- Modify: `.github/workflows/director-v2-ci.yml`

**Interfaces:**
- Consumes: `buildSite(sourceDir, outputDir)` from `visual-direction-os/build-pages-site.js`
- Produces: executable route contract for `/`, `/studio/`, and compatibility `director-v2.html`

- [ ] **Step 1: Write the failing Node test**

Create `visual-direction-os/build-pages-site.test.js` that builds into a temporary directory and asserts:

```js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('./build-pages-site.js');

const source = __dirname;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'vdos-pages-'));
buildSite(source, output);

const systemSource = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
const systemBuilt = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const studioBuilt = fs.readFileSync(path.join(output, 'studio', 'index.html'), 'utf8');

assert.equal(systemBuilt, systemSource, 'SYSTEM root must remain byte-identical');
assert.match(studioBuilt, /<base href="\.\.\/">/);
assert.match(studioBuilt, /Director Workspace/);
assert.ok(fs.existsSync(path.join(output, 'director-v2.html')));
assert.ok(fs.existsSync(path.join(output, 'director-v2.css')));
console.log('build-pages-site.test.js passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node visual-direction-os/build-pages-site.test.js
```

Expected: FAIL because current build overwrites root `index.html` with `director-v2.html` and does not generate `studio/index.html`.

- [ ] **Step 3: Wire the test into CI before implementation**

Add:

```bash
node visual-direction-os/build-pages-site.test.js
```

to the Node test stage in `.github/workflows/director-v2-ci.yml`.

- [ ] **Step 4: Commit the RED contract**

Commit message:

```text
test: lock SYSTEM and STUDIO Pages routes
```

---

### Task 2: Change Pages assembly to preserve SYSTEM and generate STUDIO

**Files:**
- Modify: `visual-direction-os/build-pages-site.js`
- Test: `visual-direction-os/build-pages-site.test.js`
- Modify: `.github/workflows/director-v2-ci.yml`

**Interfaces:**
- Consumes: source `index.html`, `director-v2.html`
- Produces: output root SYSTEM and generated `studio/index.html`

- [ ] **Step 1: Implement Studio document generation**

Add a focused helper:

```js
function createStudioDocument(directorHtml) {
  if (!directorHtml.includes('<head>')) throw new Error('Director v2.1 document is missing <head>.');
  if (directorHtml.includes('<base ')) return directorHtml;
  return directorHtml.replace('<head>', '<head>\n  <base href="../">');
}
```

Export it for direct testing:

```js
module.exports = { buildSite, createStudioDocument };
```

- [ ] **Step 2: Preserve root index and write Studio index**

Inside `buildSite()` remove the old copies that promoted Director to root and moved SYSTEM to `knowledge.html`. After `copyTree(source, output)`:

```js
const studioDir = path.join(output, 'studio');
fs.mkdirSync(studioDir, { recursive:true });
const directorHtml = fs.readFileSync(directorIndex, 'utf8');
fs.writeFileSync(path.join(studioDir, 'index.html'), createStudioDocument(directorHtml));
```

Do not rewrite `output/index.html`.

- [ ] **Step 3: Update CI assembly assertions**

Replace the old checks:

```bash
cmp visual-direction-os/director-v2.html /tmp/vdos-site/index.html
cmp visual-direction-os/index.html /tmp/vdos-site/knowledge.html
```

with:

```bash
cmp visual-direction-os/index.html /tmp/vdos-site/index.html
test -f /tmp/vdos-site/studio/index.html
grep -q '<base href="../">' /tmp/vdos-site/studio/index.html
cmp visual-direction-os/director-v2.html /tmp/vdos-site/director-v2.html
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
node visual-direction-os/build-pages-site.test.js
node --check visual-direction-os/build-pages-site.js
```

Expected: PASS, zero syntax errors.

- [ ] **Step 5: Commit**

Commit message:

```text
feat: publish Director Workspace under studio
```

---

### Task 3: Add a branch-preview `/studio/` shim

**Files:**
- Create: `visual-direction-os/studio/index.html`
- Test: `visual-direction-os/build-pages-site.test.js`

**Interfaces:**
- Produces: RawGitHack/direct-source `/studio/` preview that redirects to `../director-v2.html` while preserving query/hash
- Build output overwrites this shim with the generated full Studio document

- [ ] **Step 1: Add a failing source-preview assertion**

Extend `build-pages-site.test.js` before the build step or with a separate source assertion:

```js
const previewShim = fs.readFileSync(path.join(source, 'studio', 'index.html'), 'utf8');
assert.match(previewShim, /\.\.\/director-v2\.html/);
assert.match(previewShim, /location\.search/);
assert.match(previewShim, /location\.hash/);
```

Expected: FAIL while source `studio/index.html` is absent.

- [ ] **Step 2: Create the minimal redirect shim**

Use an accessible static fallback plus immediate script redirect:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Visual Direction OS · Studio Preview</title>
  <script>
    (() => {
      const target = `../director-v2.html${location.search}${location.hash}`;
      location.replace(target);
    })();
  </script>
</head>
<body>
  <p>Opening Visual Direction OS Studio… <a href="../director-v2.html">Continue</a></p>
</body>
</html>
```

- [ ] **Step 3: Re-run the build test**

Run:

```bash
node visual-direction-os/build-pages-site.test.js
```

Expected: PASS and generated output Studio must contain Director Workspace, not the redirect shim.

- [ ] **Step 4: Commit**

Commit message:

```text
feat: add Studio branch preview route
```

---

### Task 4: Add SYSTEM → STUDIO navigation

**Files:**
- Modify: `visual-direction-os/index.html`
- Modify: `visual-direction-os/styles.css`
- Create: `visual-direction-os/release-routing.test.js`

**Interfaces:**
- Produces: `.studio-entry` link with `href="studio/"`

- [ ] **Step 1: Write the failing routing test**

Create `visual-direction-os/release-routing.test.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const system = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const studio = fs.readFileSync(path.join(__dirname, 'director-v2.html'), 'utf8');

assert.match(system, /class="[^"]*studio-entry[^"]*"[^>]*href="studio\/"/);
assert.match(studio, /data-system-home/);
console.log('release-routing.test.js passed');
```

Run:

```bash
node visual-direction-os/release-routing.test.js
```

Expected: FAIL because neither bridge exists yet.

- [ ] **Step 2: Add the desktop/mobile SYSTEM entry**

Add a single anchor in the rail below the system status and before chapter navigation:

```html
<a class="studio-entry" href="studio/">
  <span>STUDIO</span>
  <strong>Enter Director Workspace</strong>
  <i aria-hidden="true">→</i>
</a>
```

Ensure the same anchor remains reachable in the mobile rail; do not create a duplicate chapter item.

- [ ] **Step 3: Style it as a space transition, not a SaaS button**

Add restrained styles using existing rail typography/borders. Required mobile behavior: full-width tap target at least 44px high and no horizontal overflow.

- [ ] **Step 4: Run source and QA checks**

Run:

```bash
node visual-direction-os/release-routing.test.js
node visual-direction-os/qa-check.js
```

The routing test will still fail on the STUDIO → SYSTEM assertion until Task 5; verify the SYSTEM assertion itself now succeeds.

- [ ] **Step 5: Commit**

Commit message:

```text
feat: connect SYSTEM to Studio
```

---

### Task 5: Add STUDIO → SYSTEM navigation and production-neutral chrome

**Files:**
- Modify: `visual-direction-os/director-v2.html`
- Modify: `visual-direction-os/director-v2-app.js`
- Modify: `visual-direction-os/director-v2.css`
- Test: `visual-direction-os/release-routing.test.js`

**Interfaces:**
- Produces: `[data-system-home]` anchor
- Produces runtime route resolver:

```js
function resolveSystemHome(pathname = location.pathname) {
  return pathname.includes('/studio/') ? '../' : 'index.html';
}
```

- [ ] **Step 1: Add route resolver test**

Expose `resolveSystemHome` from `director-v2-app.js` in the existing module export surface or a small pure helper module if direct importing is not currently possible. Assert:

```js
assert.equal(resolveSystemHome('/visual-direction-os/studio/'), '../');
assert.equal(resolveSystemHome('/visual-direction-os/director-v2.html'), 'index.html');
```

- [ ] **Step 2: Add the SYSTEM link to Studio rail**

Under the brand, add:

```html
<a class="system-home-link" data-system-home href="index.html">SYSTEM <span>Knowledge Space ↗</span></a>
```

- [ ] **Step 3: Resolve the link at startup**

At Director app initialization:

```js
const systemHome = document.querySelector('[data-system-home]');
if (systemHome) systemHome.href = resolveSystemHome(location.pathname);
```

- [ ] **Step 4: Remove staging-only user-facing branding**

Change:

```text
Director Workspace · v2.1 staging
Director Control Room / staging build
```

to:

```text
Director Workspace · v2.1
Director Control Room
```

Do not change explicit fixture badges or query-controlled demo behavior.

- [ ] **Step 5: Run routing and syntax tests**

Run:

```bash
node visual-direction-os/release-routing.test.js
node --check visual-direction-os/director-v2-app.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

Commit message:

```text
feat: connect Studio back to SYSTEM
```

---

### Task 6: Add assembled-site browser release acceptance

**Files:**
- Create: `visual-direction-os/release-routing.spec.js`
- Modify: `.github/workflows/director-v2-ci.yml`

**Interfaces:**
- Tests built `_site`, not raw source tree

- [ ] **Step 1: Write browser acceptance**

The spec must verify:

```js
const { test, expect } = require('@playwright/test');

const base = 'http://127.0.0.1:4180';

test('SYSTEM remains root and routes to STUDIO', async ({ page }) => {
  await page.goto(`${base}/`);
  await expect(page.locator('#overview-title')).toBeVisible();
  await expect(page.locator('.studio-entry')).toHaveAttribute('href', 'studio/');
  await page.locator('.studio-entry').click();
  await expect(page).toHaveURL(/\/studio\/$/);
  await expect(page.getByText('Director Workspace · v2.1')).toBeVisible();
  await expect(page.locator('.project-bootstrap-error')).toHaveCount(0);
});

test('STUDIO returns to SYSTEM and explicit fixtures remain explicit', async ({ page }) => {
  await page.goto(`${base}/studio/?narrativeDemo=1&projectDemo=1`);
  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await page.locator('[data-system-home]').click();
  await expect(page.locator('#overview-title')).toBeVisible();
});
```

Add viewport checks at 390x844 and 1440x1000 ensuring:

```js
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
expect(overflow).toBe(false);
```

- [ ] **Step 2: Add assembled-site browser step to CI**

After `build-pages-site.js` creates `/tmp/vdos-site`, start a second static server:

```bash
python3 -m http.server 4180 --directory /tmp/vdos-site >/tmp/vdos-release-server.log 2>&1 &
RELEASE_SERVER_PID=$!
trap 'kill $RELEASE_SERVER_PID || true' EXIT
npx playwright test visual-direction-os/release-routing.spec.js --reporter=line --workers=1
```

Do not remove the existing source-tree browser acceptance.

- [ ] **Step 3: Run browser acceptance in a runnable environment**

Expected: both SYSTEM and STUDIO navigation tests pass at mobile and desktop widths.

- [ ] **Step 4: Commit**

Commit message:

```text
test: gate SYSTEM Studio release routes
```

---

### Task 7: Update release documentation and final verification

**Files:**
- Modify: `README.md`
- Modify: `visual-direction-os/DESIGN-V2.md`
- Modify: `docs/superpowers/plans/2026-08-18-sector-8-release-architecture.md`

**Interfaces:**
- Documents production routes and preserves explicit demo route

- [ ] **Step 1: Update route documentation**

Document:

```text
SYSTEM: https://caesar-zzh.github.io/visual-direction-os/
STUDIO: https://caesar-zzh.github.io/visual-direction-os/studio/
Demo review: /studio/?narrativeDemo=1&projectDemo=1
```

Remove statements claiming `director-v2.html` becomes deployed root `index.html`.

- [ ] **Step 2: Run full Node/syntax/build gates**

Run at minimum:

```bash
node visual-direction-os/build-pages-site.test.js
node visual-direction-os/release-routing.test.js
node visual-direction-os/project-bootstrap.test.js
node visual-direction-os/project-persistence.test.js
node visual-direction-os/project-workspace.test.js
node visual-direction-os/qa-check.js
node --check visual-direction-os/build-pages-site.js
node --check visual-direction-os/director-v2-app.js
node --check visual-direction-os/project-bootstrap.js
```

Expected: all exit 0.

- [ ] **Step 3: Verify Pages workflow safety**

Confirm `.github/workflows/pages.yml` still contains:

```yaml
on:
  push:
    branches: [master]
```

and still assembles `_site` before deployment.

- [ ] **Step 4: Mark plan completion only after evidence**

Update completed checkboxes only for tasks with observed test/build evidence. Do not claim Chromium release acceptance if the execution environment cannot run it.

- [ ] **Step 5: Commit docs/status**

Commit message:

```text
docs: record Sector 8 release architecture
```
