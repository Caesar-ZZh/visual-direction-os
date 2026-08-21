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

const sequence = promptFor('sequence');
assert.match(sequence, /Sequence Skeleton/i);
assert.match(sequence, /authoritative/i);
assert.match(sequence, /sequenceCompletion/i);
assert.match(sequence, /openPatch/i);
assert.match(sequence, /Agency Constraint/i);
assert.match(sequence, /compiler-owned/i);
assert.match(sequence, /blocked/i);
assert.match(sequence, /do not.*primary/i);
assert.doesNotMatch(sequence, /complete Scene State patch for every beat/i);
console.log('_prompts.test.js passed');
