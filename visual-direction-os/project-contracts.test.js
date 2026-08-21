const assert = require('assert');
const c = require('./project-contracts.js');

const scene = c.createEmptySceneRecord({
  id: 'scene-01',
  order: 1,
  title: 'Compliance',
  narrativeRole: {
    role: 'setup',
    narrativeFunction: 'Establish accepted institutional authority.',
    startingState: 'The order is accepted as normal.',
    endingState: 'The assignment is accepted.',
    turningPoint: 'The assignment becomes binding.',
    agencyTransition: ['world', 'world'],
    relationToPrevious: null
  }
});
assert.equal(c.validateSceneRecord(scene).valid, true);
assert.equal(scene.status.visual, 'undirected');

const breakdown = {
  projectReading: {
    narrativeProblem: 'Compliance becomes recognition of control.',
    coreConflict: 'Institutional order versus self-authorship.',
    startingState: 'The system defines the available action.',
    endingState: 'The character acts outside that structure.',
    agencyArc: ['world', 'contested', 'character']
  },
  scenes: [{
    id: 'proposal-scene-01',
    title: 'Compliance',
    role: 'setup',
    narrativeFunction: 'Establish compliance.',
    startingState: 'Order is normal.',
    endingState: 'Assignment accepted.',
    turningPoint: 'Assignment becomes binding.',
    agencyTransition: ['world', 'world'],
    relationToPrevious: null,
    sourceBasis: 'The opening describes routine acceptance.',
    breakBasis: 'A later state change has not happened yet.'
  }]
};
assert.equal(c.validateBreakdownResponse(breakdown).valid, true);
assert.equal(c.validateBreakdownResponse({
  ...breakdown,
  scenes: [{ ...breakdown.scenes[0], camera: { perspective: 'character' } }]
}).valid, false);
assert.equal(c.validateBreakdownResponse({
  ...breakdown,
  scenes: [{ ...breakdown.scenes[0], role: 'cool-climax' }]
}).valid, false);
console.log('project-contracts.test.js passed');
