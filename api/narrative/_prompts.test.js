const assert = require('assert');
const { promptFor } = require('./_prompts.js');
const interpret = promptFor('interpret');
assert.match(interpret, /Project Context/i);
assert.match(interpret, /upstream intent/i);
assert.match(interpret, /not confirmed truth/i);
assert.match(interpret, /diverge/i);
console.log('_prompts.test.js passed');
