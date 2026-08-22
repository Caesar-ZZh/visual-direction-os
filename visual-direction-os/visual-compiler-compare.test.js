const test = require('node:test');
const assert = require('node:assert/strict');

let compare = null;
try {
  compare = require('./visual-compiler-compare.js');
} catch (_) {
  compare = null;
}

const cameraExpectation = expected => ({
  grammarId: 'camera-authority-transfer',
  assertions: [{
    path: 'camera.perspective', expected, status: 'supported', source: 'camera-authority-transfer', why: 'Camera follows agency.'
  }],
  gaps: []
});

test('classifies explicit AI values as MATCH or CONFLICT and omissions as MISSING', () => {
  assert.equal(typeof compare?.compareBeat, 'function', 'compare engine must expose compareBeat');

  const match = compare.compareBeat({
    expectations: cameraExpectation('character'),
    sceneStatePatch: { variables: { camera: { perspective: 'character' } } }
  });
  assert.equal(match.items[0].result, 'MATCH');
  assert.equal(match.items[0].actual, 'character');
  assert.deepEqual(match.counts, { MATCH: 1, CONFLICT: 0, MISSING: 0, BLOCKED: 0 });
  assert.equal(match.status, 'MATCH');

  const conflict = compare.compareBeat({
    expectations: cameraExpectation('character'),
    sceneStatePatch: { variables: { camera: { perspective: 'world' } } }
  });
  assert.equal(conflict.items[0].result, 'CONFLICT');
  assert.equal(conflict.items[0].actual, 'world');
  assert.equal(conflict.status, 'CONFLICT');

  const missing = compare.compareBeat({ expectations: cameraExpectation('character'), sceneStatePatch: { variables: {} } });
  assert.equal(missing.items[0].result, 'MISSING');
  assert.equal(missing.items[0].actual, null);
  assert.equal(missing.status, 'MISSING');
});

test('keeps compiler contract gaps visible as BLOCKED instead of treating them as matches', () => {
  const result = compare.compareBeat({
    expectations: {
      grammarId: 'surface-assignment',
      assertions: [],
      gaps: [{ path:'texture.surfaceOwnership', status:'blocked', source:'surface-assignment', why:'Contract cannot express surface ownership.' }]
    },
    sceneStatePatch: { variables: { texture: { noise:'high' } } }
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.items[0].result, 'BLOCKED');
  assert.equal(result.items[0].actual, null);
  assert.deepEqual(result.counts, { MATCH: 0, CONFLICT: 0, MISSING: 0, BLOCKED: 1 });
});

test('compares top-level agency without looking inside variables', () => {
  const result = compare.compareBeat({
    expectations: {
      grammarId: 'agency-ownership-transfer',
      assertions: [{ path:'agency', expected:'contested', status:'supported', source:'agency-ownership-transfer', why:'Agency is canonical.' }],
      gaps: []
    },
    sceneStatePatch: { agency:'contested', variables:{ agency:{ value:'character' } } }
  });
  assert.equal(result.items[0].actual, 'contested');
  assert.equal(result.items[0].result, 'MATCH');
});

test('compares a full sequence with the deterministic compiler and totals categories without a score', () => {
  assert.equal(typeof compare?.compareSequence, 'function', 'compare engine must expose compareSequence');
  const visualIR = { grammar:{ id:'camera-authority-transfer', status:'resolved' } };
  const beats = [
    { id:'setup', label:'SETUP', agency:'world', sceneStatePatch:{ variables:{ camera:{ perspective:'world' } } } },
    { id:'rupture', label:'RUPTURE', agency:'contested', sceneStatePatch:{ variables:{ camera:{ perspective:'character' } } } },
    { id:'new-ownership', label:'NEW OWNERSHIP', agency:'character', sceneStatePatch:{ variables:{ camera:{} } } }
  ];

  const result = compare.compareSequence({ visualIR, beats });
  assert.equal(result.grammarId, 'camera-authority-transfer');
  assert.deepEqual(result.beats.map(item => item.status), ['MATCH','CONFLICT','MISSING']);
  assert.deepEqual(result.totals, { MATCH:1, CONFLICT:1, MISSING:1, BLOCKED:0 });
  assert.equal('score' in result, false);
});
