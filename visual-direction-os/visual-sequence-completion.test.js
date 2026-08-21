const assert = require('node:assert/strict');
const { test } = require('node:test');
const skeletonCompiler = require('./visual-sequence-skeleton.js');
const completion = require('./visual-sequence-completion.js');

const confirmedReading = {
  id: 'reading-1',
  agencyTransition: { value: ['world', 'contested', 'character'], sourceType: 'explicit', basis: 'Ownership transfers.' }
};
const cameraStrategy = {
  id: 'camera', grammarId: 'camera-authority-transfer', primaryVariable: 'camera',
  supportingVariables: ['space'], restrainedVariables: ['texture']
};
const spaceStrategy = {
  id: 'space', grammarId: 'spatial-authorship', primaryVariable: 'space',
  supportingVariables: ['camera'], restrainedVariables: ['texture']
};
const colorStrategy = {
  id: 'color', grammarId: 'color-ownership-transfer', primaryVariable: 'color',
  supportingVariables: ['space'], restrainedVariables: ['texture']
};
const cameraIR = { grammar: { status: 'resolved', id: 'camera-authority-transfer' }, source: { readingId: 'reading-1', strategyId: 'camera' } };
const spaceIR = { grammar: { status: 'resolved', id: 'spatial-authorship' }, source: { readingId: 'reading-1', strategyId: 'space' } };
const colorIR = { grammar: { status: 'resolved', id: 'color-ownership-transfer' }, source: { readingId: 'reading-1', strategyId: 'color' } };

function compile(strategy = cameraStrategy, visualIR = cameraIR) {
  return skeletonCompiler.compileSequenceSkeleton({ confirmedReading, selectedStrategy: strategy, visualIR });
}

function validCompletion(agencies = ['world', 'world', 'contested', 'character', 'character']) {
  const ids = ['setup', 'pressure', 'rupture', 'release', 'new-ownership'];
  return {
    sequenceCompletion: {
      beats: ids.map((id, index) => ({
        id,
        narrativeBeat: `Narrative beat ${index + 1}`,
        agency: agencies[index],
        visualEvents: [`event-${index + 1}`],
        rationale: `Rationale ${index + 1}`,
        openPatch: index === 0
          ? { ownership: { world: 'high' }, variables: { camera: { distance: 'wide' } } }
          : {}
      }))
    }
  };
}

function errorCodes(result) {
  return result.errors.map(error => error.code);
}

test('accepts a legal monotonic agency completion', () => {
  const result = completion.validateSequenceCompletion({ skeleton: compile(), completion: validCompletion() });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('rejects agency regression after an advance', () => {
  const result = completion.validateSequenceCompletion({
    skeleton: compile(),
    completion: validCompletion(['world', 'contested', 'world', 'character', 'character'])
  });
  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes('AGENCY_REGRESSION'));
});

test('rejects an agency outside the confirmed path', () => {
  const result = completion.validateSequenceCompletion({
    skeleton: compile(),
    completion: validCompletion(['world', 'shared', 'contested', 'character', 'character'])
  });
  assert.ok(errorCodes(result).includes('AGENCY_OUTSIDE_CONFIRMED_PATH'));
});

test('requires the final confirmed agency state', () => {
  const result = completion.validateSequenceCompletion({
    skeleton: compile(),
    completion: validCompletion(['world', 'world', 'contested', 'contested', 'contested'])
  });
  assert.ok(errorCodes(result).includes('FINAL_AGENCY_NOT_REACHED'));
});

test('rejects reordered beat ids', () => {
  const raw = validCompletion();
  [raw.sequenceCompletion.beats[1], raw.sequenceCompletion.beats[2]] = [raw.sequenceCompletion.beats[2], raw.sequenceCompletion.beats[1]];
  const result = completion.validateSequenceCompletion({ skeleton: compile(), completion: raw });
  assert.ok(errorCodes(result).includes('BEAT_ID_MISMATCH'));
});

test('rejects AI writes to compiler-owned camera perspective', () => {
  const raw = validCompletion();
  raw.sequenceCompletion.beats[2].openPatch = { variables: { camera: { perspective: 'world' } } };
  const result = completion.validateSequenceCompletion({ skeleton: compile(), completion: raw });
  assert.ok(errorCodes(result).includes('COMPILER_OWNED_FIELD_WRITE'));
});

test('rejects AI writes to blocked spatial values', () => {
  const raw = validCompletion();
  raw.sequenceCompletion.beats[2].openPatch = { variables: { space: { compression: 'high' } } };
  const result = completion.validateSequenceCompletion({ skeleton: compile(spaceStrategy, spaceIR), completion: raw });
  assert.ok(errorCodes(result).includes('BLOCKED_FIELD_WRITE'));
});

test('rejects undeclared patch paths and invalid ownership values', () => {
  const raw = validCompletion();
  raw.sequenceCompletion.beats[1].openPatch = {
    ownership: { world: 'extreme' },
    variables: { camera: { imaginaryField: 'x' } }
  };
  const result = completion.validateSequenceCompletion({ skeleton: compile(), completion: raw });
  assert.ok(errorCodes(result).includes('INVALID_SCENE_STATE_VALUE'));
  assert.ok(errorCodes(result).includes('UNDECLARED_OPEN_FIELD_WRITE'));
});

test('assembler derives camera perspective from validated agency and preserves raw completion immutably', () => {
  const raw = validCompletion();
  const before = JSON.parse(JSON.stringify(raw));
  const result = completion.assembleSequenceProposal({ skeleton: compile(), completion: raw, visualIR: cameraIR });
  assert.deepEqual(raw, before);
  const rupture = result.sequenceProposal.beats.find(beat => beat.id === 'rupture');
  assert.equal(rupture.agency, 'contested');
  assert.equal(rupture.sceneStatePatch.variables.camera.perspective, 'mixed');
  assert.equal(rupture.primaryVariable, 'camera');
  assert.deepEqual(rupture.supportingVariables, ['space']);
  assert.deepEqual(rupture.restrainedVariables, ['texture']);
  assert.equal(result.sequenceProvenance.origin, 'compiler-first');
  assert.equal(result.sequenceProvenance.fields['rupture.camera.perspective'].owner, 'compiler');
});

test('assembler derives color territory from validated agency', () => {
  const raw = validCompletion();
  const result = completion.assembleSequenceProposal({ skeleton: compile(colorStrategy, colorIR), completion: raw, visualIR: colorIR });
  const rupture = result.sequenceProposal.beats.find(beat => beat.id === 'rupture');
  assert.equal(rupture.sceneStatePatch.variables.color.territory, 'contested');
  assert.equal(result.sequenceProvenance.fields['rupture.color.territory'].owner, 'compiler');
});
