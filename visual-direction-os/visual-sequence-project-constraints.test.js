const test = require('node:test');
const assert = require('node:assert/strict');
const bridge = require('./visual-sequence-project-constraints.js');
const clone = value => JSON.parse(JSON.stringify(value));

function fixture(safe = true) {
  const resolution = {
    mode:'guarded', targetSceneId:'scene-03', safeToComplete:safe,
    resolutions:safe
      ? [{constraintId:'constraint-1',revision:1,status:'SATISFIED',type:'ownership-carry',family:'camera',path:'camera.perspective',beatId:'setup',expected:'mixed',sceneExpected:'mixed',reason:'SCENE_COMPILER_CONFIRMS'}]
      : [{constraintId:'constraint-1',revision:1,status:'CONFLICT',type:'ownership-carry',family:'camera',path:'camera.perspective',beatId:'setup',expected:'mixed',sceneExpected:null,reason:'TARGET_GRAMMAR_UNSUPPORTED'}],
    conflicts:safe ? [] : [{constraintId:'constraint-1'}],
    projectConstraintContext:{targetSceneId:'scene-03',constraints:safe ? [{constraintId:'constraint-1',revision:1,type:'ownership-carry',beatId:'setup',path:'camera.perspective',expected:'mixed',resolution:'satisfied'}] : []}
  };
  return { resolver:{ resolveProjectConstraintAuthority(){ return clone(resolution); } }, baseSkeleton:{beats:[{id:'setup'}]} };
}

test('guard returns satisfied read-only context without mutating Skeleton', () => {
  const input = fixture(true);
  const before = clone(input.baseSkeleton);
  const result = bridge.guardProjectConstraints({...input,baseSkeleton:input.baseSkeleton});
  assert.equal(result.safeToComplete,true);
  assert.equal(result.projectConstraintContext.constraints[0].resolution,'satisfied');
  assert.deepEqual(input.baseSkeleton,before);
});

test('guard throws review-required before completion for blocking result', () => {
  const input = fixture(false);
  assert.throws(
    () => bridge.guardProjectConstraints({...input,baseSkeleton:input.baseSkeleton}),
    error => error.code === 'PROJECT_CONSTRAINT_REVIEW_REQUIRED' && error.resolutions[0].status === 'CONFLICT'
  );
});
