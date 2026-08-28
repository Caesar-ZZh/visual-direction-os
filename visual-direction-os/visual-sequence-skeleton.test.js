const assert = require('node:assert/strict');
const { test } = require('node:test');
const skeleton = require('./visual-sequence-skeleton.js');

const confirmedReading = {
  id: 'reading-1',
  agencyTransition: {
    value: ['world', 'world', 'contested', 'character'],
    sourceType: 'explicit',
    basis: 'Control begins with the world and ends with the character.'
  }
};

const cameraStrategy = {
  id: 'camera',
  grammarId: 'camera-authority-transfer',
  primaryVariable: 'camera',
  supportingVariables: ['space'],
  restrainedVariables: ['texture']
};

const spaceStrategy = {
  id: 'space',
  grammarId: 'spatial-authorship',
  primaryVariable: 'space',
  supportingVariables: ['camera'],
  restrainedVariables: ['texture']
};

const cameraIR = {
  grammar: { status: 'resolved', id: 'camera-authority-transfer' },
  source: { readingId: 'reading-1', strategyId: 'camera' }
};

const spaceIR = {
  grammar: { status: 'resolved', id: 'spatial-authorship' },
  source: { readingId: 'reading-1', strategyId: 'space' }
};

test('normalizes adjacent agency duplicates while preserving distinct shared and contested states', () => {
  assert.deepEqual(
    skeleton.normalizeAgencyPath(['world', 'world', 'contested', 'shared', 'character']),
    ['world', 'contested', 'shared', 'character']
  );
});

test('rejects an agency path that collapses below two states', () => {
  assert.throws(
    () => skeleton.normalizeAgencyPath(['world', 'world']),
    /at least two distinct agency states/i
  );
});

test('compiles five canonical beats and compiler-owned strategy hierarchy', () => {
  const result = skeleton.compileSequenceSkeleton({ confirmedReading, selectedStrategy: cameraStrategy, visualIR: cameraIR });
  assert.deepEqual(result.beats.map(beat => beat.id), ['setup', 'pressure', 'rupture', 'release', 'new-ownership']);
  assert.deepEqual(result.beats.map(beat => beat.label), ['SETUP', 'PRESSURE', 'RUPTURE', 'RELEASE', 'NEW OWNERSHIP']);
  assert.equal(result.beats[0].structure.primaryVariable, 'camera');
  assert.deepEqual(result.beats[0].structure.supportingVariables, ['space']);
  assert.deepEqual(result.beats[0].structure.restrainedVariables, ['texture']);
  assert.equal(result.beats[0].agencySlot.status, 'fixed');
  assert.equal(result.beats[0].agencySlot.value, 'world');
  assert.equal(result.beats[4].agencySlot.status, 'fixed');
  assert.equal(result.beats[4].agencySlot.value, 'character');
  assert.equal(result.beats[2].agencySlot.status, 'open');
  assert.deepEqual(result.agencyConstraint.path, ['world', 'contested', 'character']);
});

test('camera authority claims camera perspective as derived compiler-owned while leaving unclaimed camera distance open', () => {
  const result = skeleton.compileSequenceSkeleton({ confirmedReading, selectedStrategy: cameraStrategy, visualIR: cameraIR });
  assert.equal(result.beats[2].patchSlots['camera.perspective'].status, 'compiler-derived');
  assert.equal(result.beats[2].patchSlots['camera.perspective'].support, 'supported');
  assert.equal(result.beats[2].patchSlots['camera.perspective'].derivation, 'agency->camera.perspective');
  assert.equal(result.beats[2].patchSlots['camera.distance'].status, 'open');
});

test('spatial authorship blocks exact space fields and does not promote partial camera mapping to exact ownership', () => {
  const result = skeleton.compileSequenceSkeleton({ confirmedReading, selectedStrategy: spaceStrategy, visualIR: spaceIR });
  assert.equal(result.beats[2].patchSlots['space.depth'].status, 'blocked');
  assert.equal(result.beats[2].patchSlots['space.compression'].status, 'blocked');
  assert.equal(result.beats[2].patchSlots['space.openness'].status, 'blocked');
  assert.equal(result.beats[2].patchSlots['space.negativeSpace'].status, 'blocked');
  assert.equal(result.beats[2].patchSlots['camera.perspective'].status, 'blocked');
});

test('unresolved grammar preserves structure but claims no exact grammar-owned patch value', () => {
  const unresolvedIR = { grammar: { status: 'unresolved', id: null }, source: { readingId: 'reading-1', strategyId: 'camera' } };
  const result = skeleton.compileSequenceSkeleton({ confirmedReading, selectedStrategy: cameraStrategy, visualIR: unresolvedIR });
  assert.equal(result.grammarId, null);
  assert.equal(result.grammarStatus, 'unresolved');
  assert.ok(Object.values(result.beats[0].patchSlots).every(slot => slot.status === 'open'));
});
