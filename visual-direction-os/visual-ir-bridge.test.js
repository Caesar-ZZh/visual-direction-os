const test = require('node:test');
const assert = require('node:assert/strict');

let bridge = null;
try {
  bridge = require('./visual-ir-bridge.js');
} catch (_) {
  bridge = null;
}

const grounded = (value, basis = 'Supported by the confirmed Narrative Reading.') => ({
  value,
  sourceType: 'inferred',
  basis
});

const confirmedReading = {
  id: 'reading-authorship',
  title: 'Authorship under pressure',
  confidence: 'high',
  narrativeProblem: grounded('The character is following a route defined by the world.'),
  coreConflict: grounded('Compliance conflicts with self-authorship.'),
  startingState: grounded('world-led'),
  endingState: grounded('character-led'),
  turningPoint: grounded('The character rejects the prescribed route.'),
  agencyTransition: {
    value: ['world', 'contested', 'character'],
    sourceType: 'inferred',
    basis: 'The confirmed reading explicitly describes an agency transfer.'
  }
};

const selectedStrategy = {
  id: 'strategy-space-authorship',
  title: 'Let space carry authorship',
  primaryVariable: 'space',
  supportingVariables: ['camera', 'agency'],
  restrainedVariables: ['texture'],
  mechanism: 'The route becomes authored by the character rather than inherited from the world.',
  rationale: 'Space leads because the narrative change is about who defines the path.'
};

test('compiles Visual IR only from the confirmed reading and selected strategy', () => {
  assert.equal(typeof bridge?.compileVisualIR, 'function', 'Visual IR bridge must expose compileVisualIR');

  const ir = bridge.compileVisualIR({ confirmedReading, selectedStrategy });

  assert.equal(ir.schemaVersion, '0.2.0');
  assert.equal(ir.mode, 'shadow');
  assert.equal(ir.source.readingId, 'reading-authorship');
  assert.equal(ir.source.strategyId, 'strategy-space-authorship');
  assert.equal(ir.direction.primaryVariable.value, 'space');
  assert.deepEqual(ir.direction.supportingVariables.value, ['camera', 'agency']);
  assert.deepEqual(ir.direction.restrainedVariables.value, ['texture']);
  assert.deepEqual(ir.agency.transition.value, ['world', 'contested', 'character']);
});

test('marks unsupported visual dimensions unresolved instead of inventing values', () => {
  const ir = bridge.compileVisualIR({ confirmedReading, selectedStrategy });
  const visualFields = ['character','world','composition','camera','hierarchy','shape','value','color','edge','detail','medium','texture','fx','temporal'];

  visualFields.forEach(field => {
    assert.equal(ir.visual[field].value, 'UNKNOWN', `${field} must not receive a fabricated default`);
    assert.equal(ir.visual[field].status, 'unknown');
    assert.equal(ir.visual[field].evidenceStatus, 'unresolved');
  });

  assert.equal(ir.constraints.antiRules.value, 'UNKNOWN');
  assert.equal(ir.constraints.antiRules.status, 'unknown');
  assert.equal(ir.evidence.status, 'partial');
  assert.equal(ir.evidence.confidence, 'high');
  assert.deepEqual(ir.evidence.unresolved, [...visualFields, 'antiRules']);
});
