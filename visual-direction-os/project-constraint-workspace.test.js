const test = require('node:test');
const assert = require('node:assert/strict');
const workspace = require('./project-workspace.js');
const registry = require('./project-constraint-registry.js');

function emptyProject() {
  return {id:'project-1',title:'Film',projectIntent:'',sourceNarrative:'',sceneOrder:[],activeSceneId:null,scenes:{}};
}

function confirmedRegistry() {
  return registry.confirmCandidate(registry.createEmptyRegistry(), {
    candidateId:'candidate-1',candidateFingerprint:'pcand-1111111111111111',type:'ownership-carry',
    family:'camera',path:'camera.perspective',expected:'mixed',
    scope:{sourceSceneId:'scene-02',targetSceneId:'scene-03',beatIds:['setup']},
    evidenceSnapshot:{sourceSceneId:'scene-02',targetSceneId:'scene-03',path:'camera.perspective',expected:'mixed'}
  });
}

test('Project Constraints render after Project Intelligence', () => {
  const project = emptyProject();
  const html = workspace.renderProjectWorkspace(
    project,
    {scenes:[]},
    {status:'UNRESOLVED',findings:[]},
    {schemaVersion:'0.1.0',mode:'shadow',status:'UNRESOLVED',sceneOrder:[],scenes:[],boundaries:[],findings:[]}
  );
  const intelligenceIndex = html.indexOf('data-project-intelligence-panel');
  const constraintsIndex = html.indexOf('data-project-constraints');
  assert.ok(intelligenceIndex >= 0);
  assert.ok(constraintsIndex > intelligenceIndex);
});

test('explicit revoke action mutates Registry only', () => {
  const project = emptyProject();
  project.projectConstraints = confirmedRegistry();
  const beforeScenes = structuredClone(project.scenes);
  const id = Object.keys(project.projectConstraints.constraints)[0];
  let persisted = null;
  const store = {
    getProject(){ return structuredClone(project); },
    setProjectConstraints(next){ persisted = structuredClone(next); project.projectConstraints = structuredClone(next); return structuredClone(project); }
  };
  const handled = workspace.applyConstraintAction('revoke-project-constraint',{dataset:{constraintId:id}},store);
  assert.equal(handled,true);
  assert.equal(persisted.constraints[id].decision,'revoked');
  assert.deepEqual(project.scenes,beforeScenes);
});
