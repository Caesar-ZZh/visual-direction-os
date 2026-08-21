const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const readIfPresent = file => fs.existsSync(path.join(__dirname, file)) ? read(file) : '';

test('loads a read-only Visual IR shadow adapter around the existing Narrative Workspace', () => {
  const html = read('director-v2.html');
  const shadow = readIfPresent('visual-ir-shadow.js');

  const bridgeIndex = html.indexOf('visual-ir-bridge.js');
  const inspectorIndex = html.indexOf('visual-ir-inspector.js');
  const workspaceIndex = html.indexOf('narrative-workspace.js');
  const shadowIndex = html.indexOf('visual-ir-shadow.js');

  assert.ok(bridgeIndex > -1, 'Director v2 must load visual-ir-bridge.js');
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
});
