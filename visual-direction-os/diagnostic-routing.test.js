const assert = require('assert');
const routing = require('./diagnostic-routing.js');

assert.equal(
  routing.selectorForRoute({ family: 'camera', control: 'perspective' }),
  '[data-variable-family="camera"][data-variable-key="perspective"]'
);
assert.equal(
  routing.selectorForRoute({ family: 'texture', control: 'noise' }),
  '[data-variable-family="texture"][data-variable-key="noise"]'
);
assert.equal(routing.selectorForRoute(null), null);
assert.equal(routing.selectorForRoute({ family: '', control: 'noise' }), null);
assert.equal(routing.learnHref('color'), 'knowledge.html#color');
assert.equal(routing.learnHref(null), null);

console.log('diagnostic routing tests passed');
