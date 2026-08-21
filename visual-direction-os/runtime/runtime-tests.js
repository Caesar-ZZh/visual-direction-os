const assert = require('node:assert/strict');
const { createDefaultVisualIR, validateVisualIR } = require('./visual-ir.js');
const { grammarRegistry } = require('./grammar-registry.js');
const { directBrief } = require('./decision-engine.js');
const { compileVisualIR } = require('./prompt-compiler.js');

const demoA = 'A teenage girl sits alone at an empty subway station late at night after an argument with her father.';
const demoB = 'A teenage boy runs through a dense city while trying to create his own escape route rather than following the crowd.';
const demoC = 'A rebellious guitarist enters an otherwise orderly institutional space without visually blending into it.';

const base = createDefaultVisualIR('test');
assert.equal(validateVisualIR(base).valid, true, 'default Visual IR should validate');
assert.equal(base.narrative.verb.status, 'unknown', 'default IR should preserve UNKNOWN state');
assert.equal(base.temporal.evidenceStatus, 'unknown', 'default IR should expose evidence state');

assert.deepEqual(Object.keys(grammarRegistry).sort(), ['boundary-relational', 'institutional-authority', 'medium-locality', 'spatial-authorship']);
assert.equal(grammarRegistry['medium-locality'].temporal.evidenceStatus, 'evidence_incomplete');

const irA = directBrief(demoA);
assert.equal(irA.character.primaryVariable.value, 'Boundary');
assert.equal(irA.world.relation.value, 'Resist');
assert.equal(irA.composition.negativeSpace.value, 'high');
assert.equal(irA.fx.global, false);
assert.ok(irA.antiRules.includes('no global watercolor filter'));

const irB = directBrief(demoB);
assert.equal(irB.character.primaryVariable.value, 'Space');
assert.equal(irB.agency.mode.value, 'route authorship');
assert.match(irB.composition.direction.value, /route/i);
assert.ok(irB.antiRules.includes('no global graffiti treatment'));

const irC = directBrief(demoC);
assert.equal(irC.character.primaryVariable.value, 'Time / Medium');
assert.equal(irC.medium.ownership.value, 'character_local');
assert.equal(irC.medium.hostContamination, false);
assert.equal(irC.temporal.evidenceStatus, 'evidence_incomplete');

for (const ir of [irA, irB, irC]) {
  const compiled = compileVisualIR(ir);
  assert.ok(compiled.must.length > 0, 'compiler should emit MUST rules');
  assert.ok(compiled.should.length > 0, 'compiler should emit SHOULD rules');
  assert.ok(compiled.antiRules.length > 0, 'compiler should preserve anti-rules');
  assert.match(compiled.prompt, /MUST:/);
  assert.match(compiled.prompt, /ANTI-RULES:/);
  for (const rule of ir.antiRules) assert.ok(compiled.antiRules.includes(rule));
}

console.log('runtime tests passed');
