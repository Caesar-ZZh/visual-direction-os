const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');

test('loads Visual IR shadow runtime before Narrative Workspace and exposes a read-only inspector slot', () => {
  const html = read('director-v2.html');
  const workspace = read('narrative-workspace.js');

  const bridgeIndex = html.indexOf('visual-ir-bridge.js');
  const inspectorIndex = html.indexOf('visual-ir-inspector.js');
  const workspaceIndex = html.indexOf('narrative-workspace.js');

  assert.ok(bridgeIndex > -1, 'Director v2 must load visual-ir-bridge.js');
  assert.ok(inspectorIndex > bridgeIndex, 'visual-ir-inspector.js must load after the bridge');
  assert.ok(workspaceIndex > inspectorIndex, 'Narrative Workspace must load after Visual IR runtime');
  assert.match(html, /visual-ir-inspector\.css/);

  assert.match(workspace, /const visualIRBridge = options\.visualIRBridge \|\| root\.VDOSVisualIRBridge/);
  assert.match(workspace, /const visualIRInspector = options\.visualIRInspector \|\| root\.VDOSVisualIRInspector/);
  assert.match(workspace, /data-visual-ir-slot/);
  assert.match(workspace, /renderDirectionLogic\(\)/);
  assert.match(workspace, /getVisualIR:\(\) => activeVisualIR \? JSON\.parse\(JSON\.stringify\(activeVisualIR\)\) : null/);
  assert.doesNotMatch(workspace, /visualIRBridge[^\n]*updateSceneState/);
});
