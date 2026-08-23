const test = require('node:test');
const assert = require('node:assert/strict');
const contracts = require('./project-contracts.js');
const stateApi = require('./project-state.js');
const registry = require('./project-constraint-registry.js');
const { createProjectPersistence } = require('./project-persistence.js');

function validProjectFixture() {
  return {
    id:'project-1', title:'Film', projectIntent:'Recover agency', sourceNarrative:'story',
    sceneOrder:[], activeSceneId:null, scenes:{}
  };
}

function candidateFixture() {
  return {
    candidateId:'candidate-1', candidateFingerprint:'pcand-1111111111111111',
    type:'ownership-carry', family:'camera', path:'camera.perspective', expected:'mixed',
    scope:{sourceSceneId:'scene-02',targetSceneId:'scene-03',beatIds:['setup']},
    evidenceSnapshot:{sourceSceneId:'scene-02',targetSceneId:'scene-03',path:'camera.perspective',expected:'mixed'}
  };
}

function memoryStorage() {
  const map = new Map();
  return { getItem:k => map.has(k) ? map.get(k) : null, setItem:(k,v) => map.set(k,String(v)), removeItem:k => map.delete(k) };
}

test('legacy Project without Registry remains valid', () => {
  const project = validProjectFixture();
  assert.equal(contracts.validateProjectState(project).valid, true);
  assert.equal(project.projectConstraints, undefined);
});

test('Project contract rejects invalid optional Registry', () => {
  const project = validProjectFixture();
  project.projectConstraints = {schemaVersion:'bad',constraints:{},dismissals:{}};
  assert.equal(contracts.validateProjectState(project).valid, false);
});

test('Store commits validated Registry only', () => {
  const store = stateApi.createProjectStore(validProjectFixture());
  const nextRegistry = registry.rejectCandidate(registry.createEmptyRegistry(), candidateFixture());
  const result = store.setProjectConstraints(nextRegistry);
  assert.deepEqual(result.projectConstraints, nextRegistry);
  assert.throws(() => store.setProjectConstraints({schemaVersion:'bad'}), /Invalid Project Constraint Registry/);
});

test('Persistence round-trips Registry and preserves legacy shape', () => {
  const storage = memoryStorage();
  const persistence = createProjectPersistence({storage,key:'m7'});
  const project = validProjectFixture();
  project.projectConstraints = registry.confirmCandidate(registry.createEmptyRegistry(), candidateFixture());
  persistence.save(project);
  assert.deepEqual(persistence.load().projectConstraints, project.projectConstraints);

  const legacy = validProjectFixture();
  storage.setItem('m7', JSON.stringify({version:1,project:legacy}));
  assert.equal(persistence.load().projectConstraints, undefined);
});
