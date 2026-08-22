const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, 'director-v2.html'), 'utf8');
const workspace = fs.readFileSync(path.join(__dirname, 'narrative-workspace.js'), 'utf8');

function indexOfScript(name) {
  const index = html.indexOf(`src="${name}`);
  assert.notEqual(index, -1, `${name} must be loaded by Director V2`);
  return index;
}

test('loads compiler-first sequence runtime before Narrative Workspace', () => {
  const compiler = indexOfScript('visual-compiler.js');
  const skeleton = indexOfScript('visual-sequence-skeleton.js');
  const completion = indexOfScript('visual-sequence-completion.js');
  const narrative = indexOfScript('narrative-workspace.js');
  const shadow = indexOfScript('visual-ir-shadow.js');
  assert.ok(compiler < skeleton, 'Visual Compiler loads before Sequence Skeleton');
  assert.ok(skeleton < completion, 'Skeleton loads before Completion assembler');
  assert.ok(completion < narrative, 'Completion assembler loads before Narrative Workspace');
  assert.ok(narrative < shadow, 'Narrative Workspace remains ahead of the Shadow adapter');
});

test('requestSequence compiles a Skeleton before the network call and assembles the raw completion afterward', () => {
  assert.match(workspace, /VDOSVisualSequenceSkeleton/);
  assert.match(workspace, /compileSequenceSkeleton/);
  assert.match(workspace, /sequenceSkeleton\s*:\s*skeleton/);
  assert.match(workspace, /VDOSVisualSequenceCompletion/);
  assert.match(workspace, /assembleSequenceProposal/);
  assert.match(workspace, /setSequenceSkeleton/);
  assert.match(workspace, /setSequenceCompletionResult/);
  assert.match(workspace, /markRequestSuccess/);
  assert.match(workspace, /getVisualIR/);
});

test('compiler-first Sequence remains preview-only until the existing Apply boundary', () => {
  const requestStart = workspace.indexOf('async function requestSequence');
  const renderStart = workspace.indexOf('function renderSequence');
  const transaction = workspace.slice(requestStart, renderStart);
  assert.doesNotMatch(transaction, /updateSceneState/);
  assert.doesNotMatch(transaction, /setSequence\(/);
  assert.match(transaction, /renderSequence/);
});
