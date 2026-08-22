const test = require('node:test');
const assert = require('node:assert/strict');

let authority = null;
try {
  authority = require('./visual-compiler-authority.js');
} catch (_) {}

const cameraIR = { grammar: { status: 'resolved', id: 'camera-authority-transfer' } };
const spatialIR = { grammar: { status: 'resolved', id: 'spatial-authorship' } };
const surfaceIR = { grammar: { status: 'resolved', id: 'surface-assignment' } };

function cameraBeat(perspective) {
  const camera = perspective == null ? {} : { perspective };
  return {
    id: 'rupture',
    label: 'RUPTURE',
    agency: 'contested',
    narrativeBeat: 'Recognition breaks the institutional frame.',
    primaryVariable: 'camera',
    supportingVariables: ['space'],
    restrainedVariables: ['texture'],
    visualEvents: ['CAMERA BREAK'],
    sceneStatePatch: { agency: 'contested', variables: { camera } }
  };
}

test('authority resolver module exists', () => {
  assert.ok(authority, 'visual-compiler-authority.js must exist');
});

test('supported matching assertion confirms without changing the patch', () => {
  assert.ok(authority);
  const beat = cameraBeat('mixed');
  const result = authority.resolveBeatAuthority({ visualIR: cameraIR, beat });
  assert.equal(result.decisions[0].action, 'CONFIRM');
  assert.equal(result.decisions[0].authority, 'compiler');
  assert.equal(result.resolvedPatch.variables.camera.perspective, 'mixed');
});

test('supported conflict is overridden by the compiler', () => {
  assert.ok(authority);
  const beat = cameraBeat('world');
  const result = authority.resolveBeatAuthority({ visualIR: cameraIR, beat });
  assert.equal(result.decisions[0].action, 'OVERRIDE');
  assert.equal(result.decisions[0].from, 'world');
  assert.equal(result.decisions[0].to, 'mixed');
  assert.equal(result.resolvedPatch.variables.camera.perspective, 'mixed');
});

test('supported missing field is injected by the compiler', () => {
  assert.ok(authority);
  const beat = cameraBeat(null);
  const result = authority.resolveBeatAuthority({ visualIR: cameraIR, beat });
  assert.equal(result.decisions[0].action, 'INJECT');
  assert.equal(result.decisions[0].from, null);
  assert.equal(result.decisions[0].to, 'mixed');
  assert.equal(result.resolvedPatch.variables.camera.perspective, 'mixed');
});

test('partial assertion remains observation-only', () => {
  assert.ok(authority);
  const beat = cameraBeat('world');
  const result = authority.resolveBeatAuthority({ visualIR: spatialIR, beat });
  const partial = result.decisions.find(item => item.action === 'PARTIAL');
  assert.ok(partial);
  assert.equal(partial.path, 'camera.perspective');
  assert.equal(result.resolvedPatch.variables.camera.perspective, 'world');
});

test('blocked gap never writes or coerces texture into medium', () => {
  assert.ok(authority);
  const beat = {
    ...cameraBeat('world'),
    sceneStatePatch: { variables: { texture: { materiality: 'rough' } } }
  };
  const result = authority.resolveBeatAuthority({ visualIR: surfaceIR, beat });
  const blocked = result.decisions.find(item => item.action === 'BLOCKED');
  assert.ok(blocked);
  assert.equal(blocked.path, 'texture.surfaceOwnership');
  assert.deepEqual(result.resolvedPatch, beat.sceneStatePatch);
});

test('sequence authority preserves raw proposal immutably and aggregates decisions', () => {
  assert.ok(authority);
  const proposal = { beats: [cameraBeat('world'), { ...cameraBeat('mixed'), id: 'release', label: 'RELEASE' }] };
  const before = JSON.stringify(proposal);
  const result = authority.resolveSequenceAuthority({ visualIR: cameraIR, proposal });
  assert.equal(JSON.stringify(proposal), before);
  assert.equal(result.mode, 'guarded');
  assert.equal(result.grammarId, 'camera-authority-transfer');
  assert.equal(result.totals.OVERRIDE, 1);
  assert.equal(result.totals.CONFIRM, 1);
  assert.equal(result.resolvedProposal.beats[0].sceneStatePatch.variables.camera.perspective, 'mixed');
  assert.equal(proposal.beats[0].sceneStatePatch.variables.camera.perspective, 'world');
});
