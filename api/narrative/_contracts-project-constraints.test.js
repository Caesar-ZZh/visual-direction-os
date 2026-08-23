const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInput } = require('./_contracts.js');
const { promptFor } = require('./_prompts.js');

function body(context) {
  return {
    narrative:'story', directorIntent:'', reading:{id:'r'}, strategy:{id:'s'},
    sequenceSkeleton:{beats:[1,2,3,4,5],agencyConstraint:{path:['contested','character']}},
    projectConstraintContext:context
  };
}
const context = {
  targetSceneId:'scene-03',
  constraints:[{constraintId:'constraint-1',revision:1,type:'ownership-carry',beatId:'setup',path:'camera.perspective',expected:'mixed',resolution:'satisfied'}]
};

test('sequence input preserves validated read-only Project Constraint Context', () => {
  const checked = validateInput('sequence',body(context));
  assert.equal(checked.valid,true);
  assert.deepEqual(checked.value.projectConstraintContext,context);
});

test('sequence input rejects executable-looking Project Constraint Context', () => {
  const bad = JSON.parse(JSON.stringify(context));
  bad.constraints[0].resolution = 'override';
  assert.equal(validateInput('sequence',body(bad)).valid,false);
});

test('sequence prompt marks Project Constraint Context explanatory-only and non-writable', () => {
  const prompt = promptFor('sequence');
  assert.match(prompt,/Project Constraint Context/i);
  assert.match(prompt,/explanatory only/i);
  assert.match(prompt,/Do not write, override, or infer constrained paths/i);
});
