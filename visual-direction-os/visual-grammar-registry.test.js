const test = require('node:test');
const assert = require('node:assert/strict');

let registry = null;
try {
  registry = require('./visual-grammar-registry.js');
} catch (_) {
  registry = null;
}

const grounded = value => ({ value, sourceType: 'inferred', basis: 'Confirmed upstream evidence.' });
const reading = {
  id: 'reading-authorship',
  title: 'Authorship under pressure',
  confidence: 'high',
  narrativeProblem: grounded('The world defines the available route.'),
  coreConflict: grounded('Compliance conflicts with self-authorship.'),
  startingState: grounded('world-led'),
  endingState: grounded('character-led'),
  turningPoint: grounded('The character rejects the prescribed route.'),
  agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'Agency transfers.' }
};

const strategy = (primaryVariable, grammarId = 'unresolved', supportingVariables = [], restrainedVariables = []) => ({
  id: `strategy-${primaryVariable}`,
  title: `${primaryVariable} strategy`,
  grammarId,
  primaryVariable,
  supportingVariables,
  restrainedVariables,
  mechanism: `${primaryVariable} carries the directing change.`,
  rationale: `The confirmed reading assigns narrative responsibility to ${primaryVariable}.`
});

test('registers executable and latent grammars with source-backed evidence metadata', () => {
  assert.equal(typeof registry?.listGrammars, 'function', 'registry must expose listGrammars');
  const grammars = registry.listGrammars();
  const ids = grammars.map(item => item.id);

  ['spatial-authorship','camera-authority-transfer','color-ownership-transfer','surface-assignment','agency-ownership-transfer','relational-boundary','medium-locality']
    .forEach(id => assert.ok(ids.includes(id), `missing grammar ${id}`));

  grammars.forEach(grammar => {
    assert.ok(grammar.evidence?.status, `${grammar.id} must declare evidence status`);
    assert.ok(Array.isArray(grammar.evidence?.refs) && grammar.evidence.refs.length > 0, `${grammar.id} must cite source files`);
    assert.ok(grammar.contract?.status, `${grammar.id} must declare contract support`);
  });
});

test('resolves only an explicitly identified compatible grammar', () => {
  assert.equal(typeof registry?.resolveGrammar, 'function', 'registry must expose resolveGrammar');
  const resolved = registry.resolveGrammar({ confirmedReading: reading, selectedStrategy: strategy('space', 'spatial-authorship', ['camera','agency'], ['texture']) });

  assert.equal(resolved.id, 'spatial-authorship');
  assert.equal(resolved.contract.status, 'supported');
  assert.equal(resolved.evidence.status, 'supported');
  assert.equal(resolved.bindings.space.value, 'authorship-transfer');
  assert.equal(resolved.bindings.camera.status, 'partial');
  assert.ok(resolved.antiRules.includes('Do not equate large space with freedom.'));
  assert.ok(resolved.evidence.refs.some(ref => ref.path === 'visual-direction-system/02-character-system.md'));
});

test('rejects missing, unresolved or primary-variable-incompatible grammar identity instead of guessing', () => {
  const missing = registry.resolveGrammar({ confirmedReading: reading, selectedStrategy: { ...strategy('space'), grammarId: undefined } });
  const unresolved = registry.resolveGrammar({ confirmedReading: reading, selectedStrategy: strategy('space', 'unresolved') });
  const mismatch = registry.resolveGrammar({ confirmedReading: reading, selectedStrategy: strategy('color', 'spatial-authorship') });

  assert.equal(missing, null);
  assert.equal(unresolved, null);
  assert.equal(mismatch, null);
});

test('keeps Boundary and Medium/Time grammars latent when the current Strategy contract cannot express them', () => {
  const boundary = registry.getGrammar('relational-boundary');
  const medium = registry.getGrammar('medium-locality');

  assert.equal(boundary.contract.status, 'blocked');
  assert.deepEqual(boundary.contract.missingVariables, ['boundary','edge']);
  assert.equal(medium.contract.status, 'blocked');
  assert.deepEqual(medium.contract.missingVariables, ['medium','time']);
  assert.equal(medium.evidence.status, 'evidence_incomplete');
  assert.ok(medium.evidence.refs.some(ref => ref.path === '63-batch-059-occupied-transit-hobie-local-medium-phase.md'));
  assert.ok(medium.guards.includes('Do not infer a numerical animation frame rate or on-ones/on-twos cadence.'));
});

test('does not silently reinterpret line as boundary or texture as medium', () => {
  const line = registry.resolveGrammar({ confirmedReading: reading, selectedStrategy: strategy('line', 'unresolved') });
  const texture = registry.resolveGrammar({ confirmedReading: reading, selectedStrategy: strategy('texture', 'surface-assignment') });

  assert.equal(line, null);
  assert.equal(texture.id, 'surface-assignment');
  assert.notEqual(texture.id, 'medium-locality');
  assert.equal(texture.bindings.texture.value, 'assigned-not-overlaid');
  assert.equal(texture.bindings.medium, undefined);
});
