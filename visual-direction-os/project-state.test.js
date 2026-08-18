const assert = require('assert');
const { createProjectStore } = require('./project-state.js');

const store = createProjectStore();
store.createProject({ id:'project-1', title:'Film', projectIntent:'Recover agency', sourceNarrative:'story' });
assert.deepEqual(store.getProject().sceneOrder, []);

const draft = {
  status: 'proposal',
  proposedScenes: [
    { id:'proposal-1', title:'Compliance', role:'setup', narrativeFunction:'Establish order.', startingState:'Order accepted.', endingState:'Task accepted.', turningPoint:'Task binds.', agencyTransition:['world','world'], relationToPrevious:null, sourceBasis:'opening', breakBasis:'first state' },
    { id:'proposal-2', title:'Refusal', role:'rupture', narrativeFunction:'Recognition becomes refusal.', startingState:'Pressure.', endingState:'Open refusal.', turningPoint:'Control is recognized.', agencyTransition:['contested','character'], relationToPrevious:'Recognition becomes action.', sourceBasis:'refusal', breakBasis:'agency changes' }
  ]
};
assert.equal(store.getProject().sceneOrder.length, 0, 'proposal must not mutate project');
store.confirmBreakdown(draft);
assert.deepEqual(store.getProject().sceneOrder, ['scene-01','scene-02']);

const external = store.getProject();
external.scenes['scene-01'].narrativeRole.endingState = 'MUTATED OUTSIDE';
assert.notEqual(store.getProject().scenes['scene-01'].narrativeRole.endingState, 'MUTATED OUTSIDE');

store.saveSceneSnapshot('scene-01', { sceneState:{ variables:{ camera:{ perspective:'world' } } }, narrativeState:{ stage:'input' }, sequenceState:null });
store.saveSceneSnapshot('scene-02', { sceneState:{ variables:{ camera:{ perspective:'character' } } }, narrativeState:{ stage:'input' }, sequenceState:null });
const p = store.getProject();
p.scenes['scene-02'].workspace.sceneState.variables.camera.perspective = 'mixed';
assert.equal(store.getProject().scenes['scene-01'].workspace.sceneState.variables.camera.perspective, 'world');
assert.equal(store.getProject().scenes['scene-02'].workspace.sceneState.variables.camera.perspective, 'character');
console.log('project-state.test.js passed');
