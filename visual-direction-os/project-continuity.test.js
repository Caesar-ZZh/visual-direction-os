const assert = require('assert');
const { deriveContinuity } = require('./project-continuity.js');
const project = {
  sceneOrder:['scene-01','scene-02','scene-03'],
  scenes:{
    'scene-01':{ id:'scene-01', title:'Compliance', narrativeRole:{ role:'setup', agencyTransition:['world','world'] }, status:{visual:'directed'}, workspace:{sceneState:{agency:'world',variables:{camera:{perspective:'world'},color:{territory:'world'},space:{compression:'low',openness:'high'},line:{density:'low'},texture:{noise:'low',granularity:'low'},rhythm:{motionEnergy:'low',cutDensity:'low',repetition:'stable'}}}} },
    'scene-02':{ id:'scene-02', title:'Recognition', narrativeRole:{ role:'recognition', agencyTransition:['world','contested'] }, status:{visual:'directed'}, workspace:{sceneState:{agency:'world',variables:{camera:{perspective:'character'},color:{territory:'world'},space:{compression:'low',openness:'high'},line:{density:'low'},texture:{noise:'low',granularity:'low'},rhythm:{motionEnergy:'low',cutDensity:'low',repetition:'stable'}}}} },
    'scene-03':{ id:'scene-03', title:'Refusal', narrativeRole:{ role:'rupture', agencyTransition:['contested','character'] }, status:{visual:'undirected'}, workspace:{sceneState:null} }
  }
};
const before = JSON.stringify(project);
const result = deriveContinuity(project);
assert.ok(result.findings.some(f => f.rule === 'agency-alignment' && f.status === 'WARN'));
assert.ok(result.findings.some(f => f.rule === 'unresolved-scene' && f.sceneIds.includes('scene-03')));
assert.equal(JSON.stringify(project), before, 'diagnostics must not mutate project');
console.log('project-continuity.test.js passed');
