const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const readIfPresent = file => fs.existsSync(path.join(__dirname, file)) ? read(file) : '';

test('loads compiler authority modules before the shadow adapter and keeps intelligence outside Narrative Workspace core', () => {
  const html = read('director-v2.html');
  const shadow = read('visual-ir-shadow.js');
  const workspace = read('narrative-workspace.js');
  const inspector = readIfPresent('visual-compiler-inspector.js');
  const authorityInspector = readIfPresent('visual-authority-inspector.js');

  const bridgeIndex = html.indexOf('visual-ir-bridge.js');
  const compilerIndex = html.indexOf('visual-compiler.js');
  const compareIndex = html.indexOf('visual-compiler-compare.js');
  const authorityIndex = html.indexOf('visual-compiler-authority.js');
  const compilerInspectorIndex = html.indexOf('visual-compiler-inspector.js');
  const authorityInspectorIndex = html.indexOf('visual-authority-inspector.js');
  const workspaceIndex = html.indexOf('narrative-workspace.js');
  const shadowIndex = html.indexOf('visual-ir-shadow.js');

  assert.ok(bridgeIndex > -1, 'Visual IR bridge must still load');
  assert.ok(compilerIndex > bridgeIndex, 'visual-compiler.js must load after Visual IR bridge');
  assert.ok(compareIndex > compilerIndex, 'visual-compiler-compare.js must load after compiler');
  assert.ok(authorityIndex > compareIndex, 'visual-compiler-authority.js must load after compare engine');
  assert.ok(compilerInspectorIndex > authorityIndex, 'M3 compare inspector must load after authority engine');
  assert.ok(authorityInspectorIndex > compilerInspectorIndex, 'M4 authority inspector must load after M3 compare inspector');
  assert.ok(workspaceIndex > authorityInspectorIndex, 'Narrative Workspace keeps its existing initialization boundary');
  assert.ok(shadowIndex > workspaceIndex, 'shadow adapter attaches after Narrative Workspace');

  assert.match(shadow, /MutationObserver/);
  assert.match(shadow, /data-visual-compiler-slot/);
  assert.match(shadow, /data-visual-authority-slot/);
  assert.match(shadow, /compareSequence/);
  assert.match(shadow, /resolveSequenceAuthority/);
  assert.match(shadow, /renderCompilerComparison/);
  assert.match(shadow, /renderAuthorityPlan/);
  assert.match(shadow, /sequenceProposal/);
  assert.match(shadow, /getCompilerComparison/);
  assert.match(shadow, /getAuthorityPlan/);
  assert.doesNotMatch(shadow, /updateSceneState/);
  assert.doesNotMatch(shadow, /setSceneState/);
  assert.doesNotMatch(shadow, /applySceneState/);

  assert.doesNotMatch(workspace, /visual-compiler/i, 'Narrative Workspace core must not learn about the compiler');
  assert.match(inspector, /data-visual-compiler-compare/);
  assert.match(authorityInspector, /data-visual-authority-plan/);
});
