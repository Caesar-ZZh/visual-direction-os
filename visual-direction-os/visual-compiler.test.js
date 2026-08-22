const test = require('node:test');
const assert = require('node:assert/strict');

let compiler = null;
try {
  compiler = require('./visual-compiler.js');
} catch (_) {
  compiler = null;
}

const visualIR = grammarId => ({
  schemaVersion: '0.3.0',
  mode: 'shadow',
  grammar: { id: grammarId, status: grammarId ? 'resolved' : 'unresolved' },
  visual: {
    space: { value: grammarId === 'spatial-authorship' ? 'authorship-transfer' : 'UNKNOWN', status: grammarId === 'spatial-authorship' ? 'known' : 'unknown' },
    camera: { value: ['spatial-authorship','camera-authority-transfer'].includes(grammarId) ? 'authority-transfer' : 'UNKNOWN', status: ['spatial-authorship','camera-authority-transfer'].includes(grammarId) ? 'known' : 'unknown' },
    color: { value: grammarId === 'color-ownership-transfer' ? 'ownership-territory-transfer' : 'UNKNOWN', status: grammarId === 'color-ownership-transfer' ? 'known' : 'unknown' },
    texture: { value: grammarId === 'surface-assignment' ? 'assigned-not-overlaid' : 'UNKNOWN', status: grammarId === 'surface-assignment' ? 'known' : 'unknown' }
  }
});

const beat = agency => ({ id: `beat-${agency}`, agency });

test('camera authority compiles only the agency-owned camera perspective', () => {
  assert.equal(typeof compiler?.compileBeatExpectations, 'function', 'compiler must expose compileBeatExpectations');
  const result = compiler.compileBeatExpectations({ visualIR: visualIR('camera-authority-transfer'), beat: beat('character') });

  assert.equal(result.grammarId, 'camera-authority-transfer');
  assert.deepEqual(result.assertions, [{
    path: 'camera.perspective',
    expected: 'character',
    status: 'supported',
    source: 'camera-authority-transfer',
    why: 'Camera authority follows the confirmed character-owned agency state.'
  }]);
  assert.deepEqual(result.gaps, []);
});

test('spatial authorship may compare camera ownership but does not invent exact space intensity', () => {
  const result = compiler.compileBeatExpectations({ visualIR: visualIR('spatial-authorship'), beat: beat('contested') });
  assert.deepEqual(result.assertions, [{
    path: 'camera.perspective',
    expected: 'mixed',
    status: 'partial',
    source: 'spatial-authorship',
    why: 'Camera may track the contested authorship state, but exact spatial compression remains sequence-dependent.'
  }]);
  assert.equal(result.assertions.some(item => item.path.startsWith('space.')), false);
  assert.ok(result.gaps.some(item => item.path === 'space' && item.status === 'blocked'));
});

test('color ownership compiles territory without inventing hue saturation or temperature', () => {
  const result = compiler.compileBeatExpectations({ visualIR: visualIR('color-ownership-transfer'), beat: beat('world') });
  assert.deepEqual(result.assertions, [{
    path: 'color.territory',
    expected: 'world',
    status: 'supported',
    source: 'color-ownership-transfer',
    why: 'Color territory follows the confirmed world-owned agency state.'
  }]);
  assert.equal(result.assertions.some(item => /temperature|saturation|contrast/.test(item.path)), false);
});

test('agency ownership compiles only top-level agency', () => {
  const result = compiler.compileBeatExpectations({ visualIR: visualIR('agency-ownership-transfer'), beat: beat('contested') });
  assert.deepEqual(result.assertions, [{
    path: 'agency',
    expected: 'contested',
    status: 'supported',
    source: 'agency-ownership-transfer',
    why: 'The compiler preserves the beat agency selected by the confirmed ownership transition.'
  }]);
});

test('surface assignment exposes its contract gap instead of treating texture as medium ownership', () => {
  const result = compiler.compileBeatExpectations({ visualIR: visualIR('surface-assignment'), beat: beat('character') });
  assert.deepEqual(result.assertions, []);
  assert.deepEqual(result.gaps, [{
    path: 'texture.surfaceOwnership',
    status: 'blocked',
    source: 'surface-assignment',
    why: 'Current Scene State texture fields cannot express per-surface ownership; Texture is not coerced into Medium.'
  }]);
});

test('unresolved grammar emits no deterministic assertions', () => {
  const result = compiler.compileBeatExpectations({ visualIR: visualIR(null), beat: beat('character') });
  assert.equal(result.grammarId, null);
  assert.deepEqual(result.assertions, []);
  assert.ok(result.gaps.some(item => item.status === 'blocked'));
});
