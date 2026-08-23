const assert = require('assert');
const { validateProjectState } = require('./project-contracts.js');
const { createProjectStore } = require('./project-state.js');
const { createProjectPersistence } = require('./project-persistence.js');
const registry = require('./project-constraint-registry.js');

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const storage = createMemoryStorage();
const key = 'vdos-project-test';
const persistence = createProjectPersistence({ storage, key, validateProjectState });

assert.strictEqual(persistence.load(), null, 'empty storage should hydrate as no Project');

const store = createProjectStore();
const unbind = persistence.bind(store);
store.createProject({
  id:'project-persisted',
  title:'Persisted Film',
  projectIntent:'Preserve Director decisions across reloads.',
  sourceNarrative:'A Project that must survive a page reload.'
});
store.addScene({
  title:'SCENE ONE',
  role:'setup',
  narrativeFunction:'Establish the initial state.',
  startingState:'Stable.',
  endingState:'Pressure appears.',
  turningPoint:'Pressure becomes visible.',
  agencyTransition:['world','contested'],
  relationToPrevious:null
});
store.saveSceneSnapshot('scene-01', {
  narrativeState:{ status:'confirmed', selectedReadingId:'reading-1' },
  sceneState:{ mode:'direct', variables:{ camera:'constrained' } },
  sequenceState:{ id:'sequence-1', beats:[{ id:'beat-1' }] }
});

assert.deepStrictEqual(persistence.load(), store.getProject(), 'valid Project Store mutations should autosave');

const candidate = {
  candidateId:'candidate-persistence', candidateFingerprint:'pcand-2222222222222222', type:'ownership-carry', family:'camera', path:'camera.perspective', expected:'mixed',
  scope:{sourceSceneId:'scene-01',targetSceneId:'scene-02',beatIds:['setup']},
  evidenceSnapshot:{sourceSceneId:'scene-01',targetSceneId:'scene-02',path:'camera.perspective',expected:'mixed'}
};
store.setProjectConstraints(registry.confirmCandidate(registry.createEmptyRegistry(), candidate));
assert.deepStrictEqual(persistence.load().projectConstraints, store.getProject().projectConstraints, 'Project Constraint Registry should autosave with Project State');

const reloadedStore = createProjectStore(persistence.load());
assert.deepStrictEqual(reloadedStore.getProject(), store.getProject(), 'saved Project should hydrate a fresh Project Store without losing Scene workspace state');

unbind();

storage.setItem(key, '{not-json');
assert.strictEqual(persistence.load(), null, 'corrupt JSON must be ignored instead of crashing Project bootstrap');

storage.setItem(key, JSON.stringify({ version:1, project:{ id:'broken' } }));
assert.strictEqual(persistence.load(), null, 'invalid Project payload must be rejected by Project contracts');

assert.throws(
  () => persistence.save({ id:'invalid' }),
  /Invalid Project State/,
  'invalid Project state must never be written to persistence'
);

persistence.clear();
assert.strictEqual(storage.getItem(key), null, 'clear should remove the local Project snapshot');

let persistenceError = null;
const failingStorage = {
  getItem() { return null; },
  setItem() { throw new Error('quota exceeded'); },
  removeItem() {}
};
const resilientPersistence = createProjectPersistence({
  storage:failingStorage,
  key:'vdos-project-failing-storage',
  validateProjectState,
  onError(error) { persistenceError = error; }
});
const resilientStore = createProjectStore();
resilientPersistence.bind(resilientStore);
assert.doesNotThrow(() => resilientStore.createProject({
  id:'project-resilient',
  title:'Resilient Film',
  projectIntent:'Persistence failure must not block directing.',
  sourceNarrative:'story'
}), 'autosave failures must not destabilize Project Store mutations');
assert.match(persistenceError?.message || '', /quota exceeded/, 'persistence write failures should remain observable');

console.log('project-persistence.test.js passed');