const assert = require('assert');
const { createProjectStore } = require('./project-state.js');
const { createProjectRuntime } = require('./project-runtime.js');

const roleA = { role:'setup', narrativeFunction:'Establish order.', startingState:'Order accepted.', endingState:'Task accepted.', turningPoint:'Task binds.', agencyTransition:['world','world'], relationToPrevious:null };
const roleB = { role:'rupture', narrativeFunction:'Turn recognition into refusal.', startingState:'Pressure.', endingState:'Open refusal.', turningPoint:'Control is recognized.', agencyTransition:['contested','character'], relationToPrevious:'Recognition becomes action.' };
const store = createProjectStore({
  id:'p', title:'Film', projectIntent:'', sourceNarrative:'', sceneOrder:['scene-01','scene-02'], activeSceneId:'scene-01',
  scenes:{
    'scene-01':{ id:'scene-01',order:1,title:'A',narrativeRole:roleA,workspace:{sceneState:{agency:'world',variables:{camera:{perspective:'world'}}},narrativeState:{stage:'input'},sequenceState:null},status:{narrative:'defined',visual:'directed',continuity:'unresolved'} },
    'scene-02':{ id:'scene-02',order:2,title:'B',narrativeRole:roleB,workspace:{sceneState:{agency:'character',variables:{camera:{perspective:'character'}}},narrativeState:{stage:'input'},sequenceState:null},status:{narrative:'defined',visual:'directed',continuity:'unresolved'} }
  }
});
let liveScene = JSON.parse(JSON.stringify(store.getProject().scenes['scene-01'].workspace.sceneState));
let liveNarrative = { stage:'input' };
let liveSequence = null;
let aborts = 0;
const runtime = createProjectRuntime({
  projectStore:store,
  sceneRuntime:{ getState:()=>JSON.parse(JSON.stringify(liveScene)), restore:s=>{ liveScene=JSON.parse(JSON.stringify(s)); } },
  narrativeRuntime:{ getState:()=>JSON.parse(JSON.stringify(liveNarrative)), restore:s=>{ liveNarrative=JSON.parse(JSON.stringify(s)); } },
  sequenceRuntime:{ getState:()=>liveSequence == null ? null : JSON.parse(JSON.stringify(liveSequence)), restore:s=>{ liveSequence=s == null ? null : JSON.parse(JSON.stringify(s)); } },
  abortTransient:()=>{ aborts += 1; }
});

liveScene.variables.camera.perspective = 'mixed';
liveNarrative = { stage:'strategy', selectedStrategyId:'camera' };
(async () => {
  await runtime.switchScene('scene-02');
  assert.equal(aborts, 1);
  assert.equal(store.getProject().scenes['scene-01'].workspace.sceneState.variables.camera.perspective, 'mixed');
  assert.equal(store.getProject().scenes['scene-01'].workspace.narrativeState.stage, 'strategy');
  assert.equal(store.getProject().activeSceneId, 'scene-02');
  assert.equal(liveScene.variables.camera.perspective, 'character');
  liveScene.variables.camera.perspective = 'world';
  assert.equal(store.getProject().scenes['scene-01'].workspace.sceneState.variables.camera.perspective, 'mixed');

  runtime.markVisualDirected();
  assert.equal(store.getProject().scenes['scene-02'].status.visual, 'directed');
  await runtime.switchScene('scene-01');
  assert.equal(liveScene.variables.camera.perspective, 'mixed');
  assert.equal(liveNarrative.stage, 'strategy');
  console.log('project-runtime.test.js passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
