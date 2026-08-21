const assert = require('assert');
const { promptFor } = require('./_prompts.js');
const interpret = promptFor('interpret');
assert.match(interpret, /Project Context/i);
assert.match(interpret, /upstream intent/i);
assert.match(interpret, /not confirmed truth/i);
assert.match(interpret, /diverge/i);

const strategy = promptFor('strategy');
assert.match(strategy, /grammarId/);
assert.match(strategy, /spatial-authorship/);
assert.match(strategy, /camera-authority-transfer/);
assert.match(strategy, /color-ownership-transfer/);
assert.match(strategy, /surface-assignment/);
assert.match(strategy, /agency-ownership-transfer/);
assert.match(strategy, /unresolved/);
assert.match(strategy, /do not infer/i);
console.log('_prompts.test.js passed');
