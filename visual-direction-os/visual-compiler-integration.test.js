const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const readIfPresent = file => fs.existsSync(path.join(__dirname, file)) ? read(file) : '';

test('loads compiler modules before the shadow adapter and keeps Sequence comparison outside Narrative Workspace core', () => {
  const html = read('director-v2.html');
  const shadow = read('visual-ir-shadow.js');
  const workspace = read('narrative-workspace.js');
  const inspector = readIfPresent('visual-compiler-inspector.js');

  const bridgeIndex = html.indexOf('visual-ir-bridge.js');
  const compilerIndex = html.indexOf('visual-compiler.js');
  const compareIndex = html.indexOf('visual-compiler-compare.js');
  const compilerInspectorIndex = html.indexOf('visual-compiler-inspector.js');
  const workspaceIndex = html.indexOf('narrative-workspace.js');
  const shadowIndex = html.indexOf('visual-ir-shadow.js');

  assert.ok(bridgeIndex > -1, 'Visual IR bridge must still load');
  assert.ok(compilerIndex > bridgeIndex, 'visual-compiler.js must load after Visual IR bridge');
  assert.ok(compareIndex > compilerIndex, 'visual-compiler-compare.js must load after compiler');
  assert.ok(compilerInspectorIndex > compareIndex, 'compiler inspector must load after compare engine');
  assert.ok(workspaceIndex > compilerInspectorIndex, 'Narrative Workspace keeps its existing initialization boundary');
  assert.ok(shadowIndex > workspaceIndex, 'shadow adapter attaches after Narrative Workspace');

  assert.match(shadow, /MutationObserver/);
  assert.match(shadow, /data-visual-compiler-slot/);
  assert.match(shadow, /compareSequence/);
  assert.match(shadow, /renderCompilerComparison/);
  assert.match(shadow, /sequenceProposal/);
  assert.match(shadow, /getCompilerComparison/);
  assert.doesNotMatch(shadow, /updateSceneState/);
  assert.doesNotMatch(shadow, /setSceneState/);
  assert.doesNotMatch(shadow, /applySceneState/);

  assert.doesNotMatch(workspace, /visual-compiler/i, 'Narrative Workspace core must not learn about the compiler');
  assert.match(inspector, /data-visual-compiler-compare/);
});
