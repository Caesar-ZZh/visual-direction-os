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

const lineStrategy = {
  ...selectedStrategy,
  id: 'strategy-line',
  title: 'Line strategy',
  primaryVariable: 'line',
  supportingVariables: [],
  restrainedVariables: []
};

test('compiles Visual IR v0.3 from confirmed upstream direction plus an evidence-aware grammar', () => {
  assert.equal(typeof bridge?.compileVisualIR, 'function', 'Visual IR bridge must expose compileVisualIR');

  const ir = bridge.compileVisualIR({ confirmedReading, selectedStrategy });

  assert.equal(ir.schemaVersion, '0.3.0');
  assert.equal(ir.mode, 'shadow');
  assert.equal(ir.source.readingId, 'reading-authorship');
  assert.equal(ir.source.strategyId, 'strategy-space-authorship');
  assert.equal(ir.direction.primaryVariable.value, 'space');
  assert.deepEqual(ir.direction.supportingVariables.value, ['camera', 'agency']);
  assert.deepEqual(ir.direction.restrainedVariables.value, ['texture']);
  assert.deepEqual(ir.agency.transition.value, ['world', 'contested', 'character']);
  assert.equal(ir.grammar.id, 'spatial-authorship');
  assert.equal(ir.grammar.status, 'resolved');
  assert.equal(ir.grammar.contractStatus, 'supported');
  assert.equal(ir.grammar.evidenceStatus, 'supported');
});

test('applies only grammar-authorized visual fields and leaves every unrelated dimension unresolved', () => {
  const ir = bridge.compileVisualIR({ confirmedReading, selectedStrategy });
  const visualFields = ['character','world','composition','camera','hierarchy','shape','value','color','edge','detail','medium','texture','fx','temporal','space','line','rhythm'];
  const unresolvedFields = visualFields.filter(field => !['space','camera'].includes(field));

  assert.equal(ir.visual.space.value, 'authorship-transfer');
  assert.equal(ir.visual.space.status, 'known');
  assert.equal(ir.visual.camera.value, 'reactive-to-predictive-after-route-ownership');
  assert.equal(ir.visual.camera.status, 'partial');

  unresolvedFields.forEach(field => {
    assert.equal(ir.visual[field].value, 'UNKNOWN', `${field} must not receive a fabricated default`);
    assert.equal(ir.visual[field].status, 'unknown');
    assert.equal(ir.visual[field].evidenceStatus, 'unresolved');
  });

  assert.equal(ir.constraints.antiRules.status, 'known');
  assert.ok(ir.constraints.antiRules.value.includes('Do not equate large space with freedom.'));
  assert.equal(ir.evidence.status, 'supported');
  assert.equal(ir.evidence.confidence, 'high');
  assert.deepEqual(ir.evidence.unresolved, unresolvedFields);
});

test('keeps Visual IR unresolved when no exact grammar matches instead of coercing variables', () => {
  const ir = bridge.compileVisualIR({ confirmedReading, selectedStrategy: lineStrategy });
  assert.equal(ir.grammar.status, 'unresolved');
  assert.equal(ir.grammar.id, null);
  assert.equal(ir.visual.line.value, 'UNKNOWN');
  assert.equal(ir.visual.edge.value, 'UNKNOWN');
  assert.equal(ir.constraints.antiRules.value, 'UNKNOWN');
  assert.equal(ir.evidence.status, 'partial');
});

test('validates the shadow Visual IR contract before UI consumption', () => {
  assert.equal(typeof bridge?.validateVisualIR, 'function', 'Visual IR bridge must expose validateVisualIR');
  const valid = bridge.validateVisualIR(bridge.compileVisualIR({ confirmedReading, selectedStrategy }));
  assert.deepEqual(valid, { valid: true, errors: [] });

  const invalid = bridge.validateVisualIR({ schemaVersion: '0.3.0', mode: 'shadow' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.includes('source.readingId is required'));
  assert.ok(invalid.errors.includes('direction.primaryVariable must be known'));
  assert.ok(invalid.errors.includes('grammar.status is required'));
  assert.ok(invalid.errors.includes('evidence.unresolved must be an array'));
});
