'use strict';

const assert = require('assert');
const { GRAMMAR_IDS, validateOutput, schemaFor } = require('./_contracts.js');

const strategy = grammarId => ({
  id: 'space',
  title: 'SPACE-LED',
  grammarId,
  primaryVariable: 'space',
  supportingVariables: ['camera'],
  restrainedVariables: ['texture'],
  mechanism: 'Space carries the authorship change.',
  rationale: 'The confirmed reading makes path ownership causal.'
});

assert.deepEqual(GRAMMAR_IDS, [
  'spatial-authorship',
  'camera-authority-transfer',
  'color-ownership-transfer',
  'surface-assignment',
  'agency-ownership-transfer',
  'unresolved'
]);

const schema = schemaFor('strategy');
const item = schema.properties.strategies.items;
assert.deepEqual(item.properties.grammarId.enum, GRAMMAR_IDS);
assert.ok(item.required.includes('grammarId'));

assert.equal(validateOutput('strategy', { strategies: [strategy('spatial-authorship'), { ...strategy('unresolved'), id: 'other' }] }).valid, true);
const missing = strategy('spatial-authorship');
delete missing.grammarId;
assert.equal(validateOutput('strategy', { strategies: [missing, { ...strategy('unresolved'), id: 'other' }] }).valid, false, 'API output must not accept a new Strategy without grammarId');
assert.equal(validateOutput('strategy', { strategies: [strategy('invented'), { ...strategy('unresolved'), id: 'other' }] }).valid, false, 'API output must reject invented grammar ids');

console.log('_contracts-grammar.test.js passed');
