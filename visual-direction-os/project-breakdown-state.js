((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./project-contracts.js')
    : root?.VDOSProjectContracts;
  const api = factory(contracts);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectBreakdownState = api;
})(typeof window !== 'undefined' ? window : globalThis, contracts => {
  'use strict';

  if (!contracts) throw new Error('VDOSProjectContracts is required before project-breakdown-state.js');
  const { clone, validateBreakdownResponse } = contracts;
  const SCENE_FIELDS = ['title','role','narrativeFunction','startingState','endingState','turningPoint','agencyTransition','relationToPrevious','sourceBasis','breakBasis'];
  const READING_FIELDS = ['narrativeProblem','coreConflict','startingState','endingState','agencyArc'];

  const initialState = () => ({
    status:'input',
    sourceNarrative:'',
    directorIntent:'',
    projectReading:null,
    projectReadingDirectorEdits:{},
    proposedScenes:[],
    selectedSceneId:null,
    structureNeedsReview:false,
    request:{ status:'idle', token:0, error:null }
  });

  function createProjectBreakdownState(initial = {}) {
    let state = { ...initialState(), ...clone(initial) };
    const listeners = new Set();

    function getState() { return clone(state); }
    function notify(source) {
      const snapshot = getState();
      listeners.forEach(listener => listener(snapshot, source));
    }
    function subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(getState(), 'subscribe');
      return () => listeners.delete(listener);
    }

    function setInput(sourceNarrative, directorIntent = state.directorIntent) {
      const source = String(sourceNarrative ?? '');
      const intent = String(directorIntent ?? '');
      const changed = source !== state.sourceNarrative || intent !== state.directorIntent;
      state.sourceNarrative = source;
      state.directorIntent = intent;
      if (changed) {
        state.status = 'input';
        state.projectReading = null;
        state.projectReadingDirectorEdits = {};
        state.proposedScenes = [];
        state.selectedSceneId = null;
        state.structureNeedsReview = false;
        state.request = { status:'idle', token:state.request.token + 1, error:null };
      }
      notify('input');
      return getState();
    }

    function beginRequest() {
      const token = state.request.token + 1;
      state.request = { status:'loading', token, error:null };
      notify('request:loading');
      return token;
    }

    function acceptResponse(token, payload) {
      if (state.request.token !== token) return false;
      const checked = validateBreakdownResponse(payload);
      if (!checked.valid) throw new Error(`Invalid Project Breakdown: ${checked.errors.join('; ')}`);
      state.projectReading = clone(checked.value.projectReading);
      state.projectReadingDirectorEdits = {};
      state.proposedScenes = checked.value.scenes.map(scene => ({ ...clone(scene), directorEdits:{} }));
      state.selectedSceneId = state.proposedScenes[0]?.id || null;
      state.status = 'proposal';
      state.structureNeedsReview = false;
      state.request = { status:'success', token, error:null };
      notify('request:success');
      return true;
    }

    function failRequest(token, error) {
      if (state.request.token !== token) return false;
      state.request = { status:'error', token, error:clone(error || { code:'UNKNOWN', message:'Unknown error' }) };
      notify('request:error');
      return true;
    }

    function requireProposal() {
      if (state.status !== 'proposal') throw new Error('Project Breakdown must be in proposal state.');
    }

    function sceneIndex(sceneId) {
      const index = state.proposedScenes.findIndex(scene => scene.id === sceneId);
      if (index < 0) throw new Error(`Unknown proposed Scene: ${sceneId}`);
      return index;
    }

    function validateSceneCandidate(scene) {
      const checked = validateBreakdownResponse({ projectReading:state.projectReading, scenes:[scene] });
      if (!checked.valid) throw new Error(`Invalid proposed Scene: ${checked.errors.join('; ')}`);
      return clone(scene);
    }

    function editProjectReadingField(key, value) {
      requireProposal();
      if (!READING_FIELDS.includes(key)) throw new Error(`Unsupported Project Reading field: ${key}`);
      const next = clone(state.projectReading);
      next[key] = key === 'agencyArc' ? clone(value) : String(value ?? '');
      const checked = validateBreakdownResponse({ projectReading:next, scenes:state.proposedScenes });
      if (!checked.valid) throw new Error(`Invalid Project Reading edit: ${checked.errors.join('; ')}`);
      state.projectReading = next;
      state.projectReadingDirectorEdits[key] = true;
      state.structureNeedsReview = true;
      notify('project-reading:edit');
      return getState();
    }

    function editSceneField(sceneId, key, value) {
      requireProposal();
      if (!SCENE_FIELDS.includes(key)) throw new Error(`Unsupported proposed Scene field: ${key}`);
      const index = sceneIndex(sceneId);
      const next = clone(state.proposedScenes[index]);
      next[key] = key === 'agencyTransition' ? clone(value) : (key === 'relationToPrevious' && value == null ? null : String(value ?? ''));
      next.directorEdits = { ...(next.directorEdits || {}), [key]:true };
      validateSceneCandidate(next);
      state.proposedScenes[index] = next;
      state.structureNeedsReview = true;
      notify('scene:edit');
      return getState();
    }

    function addScene(scene, index = state.proposedScenes.length) {
      requireProposal();
      const next = clone(scene);
      if (!next.id) next.id = `proposal-manual-${Date.now()}`;
      next.directorEdits = { ...(next.directorEdits || {}), manual:true };
      validateSceneCandidate(next);
      const at = Number.isInteger(index) ? Math.max(0, Math.min(index, state.proposedScenes.length)) : state.proposedScenes.length;
      state.proposedScenes.splice(at, 0, next);
      state.selectedSceneId = next.id;
      state.structureNeedsReview = true;
      notify('scene:add');
      return getState();
    }

    function removeScene(sceneId) {
      requireProposal();
      if (state.proposedScenes.length <= 1) throw new Error('A Project Breakdown must keep at least one Scene.');
      const index = sceneIndex(sceneId);
      state.proposedScenes.splice(index, 1);
      if (state.selectedSceneId === sceneId) state.selectedSceneId = state.proposedScenes[Math.min(index, state.proposedScenes.length - 1)]?.id || null;
      state.structureNeedsReview = true;
      notify('scene:remove');
      return getState();
    }

    function reorderScenes(ids) {
      requireProposal();
      if (!Array.isArray(ids) || ids.length !== state.proposedScenes.length || new Set(ids).size !== ids.length) {
        throw new Error('Scene reorder must contain every proposed Scene exactly once.');
      }
      const byId = new Map(state.proposedScenes.map(scene => [scene.id, scene]));
      if (ids.some(id => !byId.has(id))) throw new Error('Scene reorder contains unknown Scene IDs.');
      state.proposedScenes = ids.map(id => clone(byId.get(id)));
      state.structureNeedsReview = true;
      notify('scene:reorder');
      return getState();
    }

    function splitScene(sceneId, children) {
      requireProposal();
      const index = sceneIndex(sceneId);
      if (!Array.isArray(children) || children.length !== 2) throw new Error('Split requires exactly two proposed child Scenes.');
      const validated = children.map(child => validateSceneCandidate({ ...clone(child), directorEdits:{ ...(child.directorEdits || {}), split:true } }));
      if (validated[0].id === validated[1].id) throw new Error('Split child Scene IDs must be unique.');
      state.proposedScenes.splice(index, 1, ...validated);
      state.selectedSceneId = validated[0].id;
      state.structureNeedsReview = true;
      notify('scene:split');
      return getState();
    }

    function mergeScenes(firstId, secondId, merged) {
      requireProposal();
      const firstIndex = sceneIndex(firstId);
      const secondIndex = sceneIndex(secondId);
      if (Math.abs(firstIndex - secondIndex) !== 1) throw new Error('Only adjacent proposed Scenes can be merged.');
      const start = Math.min(firstIndex, secondIndex);
      const next = validateSceneCandidate({ ...clone(merged), directorEdits:{ ...(merged.directorEdits || {}), merge:true } });
      state.proposedScenes.splice(start, 2, next);
      state.selectedSceneId = next.id;
      state.structureNeedsReview = true;
      notify('scene:merge');
      return getState();
    }

    return {
      getState,
      subscribe,
      setInput,
      beginRequest,
      acceptResponse,
      failRequest,
      editProjectReadingField,
      editSceneField,
      addScene,
      removeScene,
      reorderScenes,
      splitScene,
      mergeScenes
    };
  }

  return { createProjectBreakdownState };
});
