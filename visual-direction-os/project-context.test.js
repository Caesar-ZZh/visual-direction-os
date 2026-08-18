const assert = require('assert');
const { validateProjectContext, projectContextForScene } = require('./project-context.js');

const context = {
  projectIntent:'End with reclaimed agency.',
  sceneRole:'rupture',
  narrativeFunction:'Recognition becomes explicit refusal.',
  startingState:'Agency is contested.',
  endingState:'The character refuses.',
  agencyTransition:['contested','character']
};
const checked = validateProjectContext(context);
assert.equal(checked.valid, true);
assert.notStrictEqual(checked.value, context);
assert.equal(validateProjectContext({...context,camera:{perspective:'character'}}).valid, false);
assert.equal(validateProjectContext({...context,sceneRole:'cool-climax'}).valid, false);
assert.equal(validateProjectContext({...context,unknown:'x'}).valid, false);

const project = {
  projectIntent:'End with reclaimed agency.',
  scenes:{
    'scene-03':{
      narrativeRole:{
        role:'rupture', narrativeFunction:'Recognition becomes explicit refusal.',
        startingState:'Agency is contested.', endingState:'The character refuses.',
        agencyTransition:['contested','character']
      }
    }
  }
};
assert.deepEqual(projectContextForScene(project,'scene-03'), context);
console.log('project-context.test.js passed');
