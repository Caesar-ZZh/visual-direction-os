const assert = require('assert');
const { deriveProjectArc } = require('./project-arc.js');

const project = {
  sceneOrder:['scene-01','scene-02'],
  scenes:{
    'scene-01':{
      id:'scene-01', title:'Compliance',
      narrativeRole:{ role:'setup', agencyTransition:['world','world'] },
      status:{ visual:'directed' },
      workspace:{ sceneState:{ agency:'world', variables:{
        camera:{ perspective:'world' }, color:{ territory:'world' },
        space:{ compression:'low', openness:'high', negativeSpace:'medium' },
        line:{ density:'low' }, texture:{ noise:'low', granularity:'low' },
        rhythm:{ motionEnergy:'low', cutDensity:'low', repetition:'stable' }
      } } }
    },
    'scene-02':{
      id:'scene-02', title:'Refusal',
      narrativeRole:{ role:'rupture', agencyTransition:['contested','character'] },
      status:{ visual:'undirected' },
      workspace:{ sceneState:{ agency:'character', variables:{ camera:{ perspective:'character' }, color:{ territory:'character' } } } }
    }
  }
};
const arc = deriveProjectArc(project);
assert.equal(arc.scenes[0].cameraAuthority, 'WORLD');
assert.equal(arc.scenes[0].spatialPressure, 'LOW');
assert.equal(arc.scenes[1].narrativeRole, 'RUPTURE');
assert.equal(arc.scenes[1].cameraAuthority, null, 'undirected technical state must be hidden');
assert.equal(arc.scenes[1].visualAgency, null);
console.log('project-arc.test.js passed');
