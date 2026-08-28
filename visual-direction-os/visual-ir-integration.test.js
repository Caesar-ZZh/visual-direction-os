const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const readIfPresent = file => fs.existsSync(path.join(__dirname, file)) ? read(file) : '';

test('loads an evidence-aware Grammar Registry ahead of the read-only Visual IR shadow adapter', () => {
  const html = read('director-v2.html');
  const shadow = readIfPresent('visual-ir-shadow.js');
  const css = readIfPresent('visual-ir-inspector.css');

  const registryIndex = html.indexOf('visual-grammar-registry.js');
  const bridgeIndex = html.indexOf('visual-ir-bridge.js');
  const inspectorIndex = html.indexOf('visual-ir-inspector.js');
  const workspaceIndex = html.indexOf('narrative-workspace.js');
  const shadowIndex = html.indexOf('visual-ir-shadow.js');

  assert.ok(registryIndex > -1, 'Director v2 must load visual-grammar-registry.js');
  assert.ok(bridgeIndex > registryIndex, 'visual-ir-bridge.js must load after the Grammar Registry');
  assert.ok(inspectorIndex > bridgeIndex, 'visual-ir-inspector.js must load after the bridge');
  assert.ok(workspaceIndex > inspectorIndex, 'Narrative Workspace must retain its existing initialization order');
  assert.ok(shadowIndex > workspaceIndex, 'visual-ir-shadow.js must attach after Narrative Workspace');
  assert.match(html, /visual-ir-inspector\.css/);

  assert.match(shadow, /root\.VDOSNarrativeWorkspaceController/);
  assert.match(shadow, /getDraftState\(\)/);
  assert.match(shadow, /bridge\.compileVisualIR/);
  assert.match(shadow, /inspector\.renderVisualIRInspector/);
  assert.match(shadow, /data-visual-ir-slot/);
  assert.match(shadow, /getVisualIR/);
  assert.doesNotMatch(shadow, /updateSceneState/);

  assert.match(css, /\.visual-ir-shadow/);
  assert.match(css, /\.visual-ir-shadow__grammar/);
  assert.match(css, /\.visual-ir-shadow__details summary:focus-visible/);
  assert.match(css, /@media \(max-width: 720px\)/);
});
