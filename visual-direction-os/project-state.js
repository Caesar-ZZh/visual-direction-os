((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./project-contracts.js')
    : root?.VDOSProjectContracts;
  const api = factory(contracts);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectState = api;
})(typeof window !== 'undefined' ? window : globalThis, contracts => {
  'use strict';

  if (!contracts) throw new Error('VDOSProjectContracts is required before project-state.js');
  const { clone, createEmptySceneRecord, validateSceneRecord, validateProjectState } = contracts;
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  function mergeNested(base, patch) {
    if (!isObject(base) || !isObject(patch)) return clone(patch);
    const next = clone(base);
    Object.entries(patch).forEach(([key, value]) => {
      if (isObject(value) && isObject(next[key])) next[key] = mergeNested(next[key], value);
      else next[key] = clone(value);
    });
    return next;
  }

  function nextFreeSceneId(scenes = {}) {
    const max = Object.keys(scenes).reduce((highest, id) => {
      const match = /^scene-(\d+)$/.exec(id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    return `scene-${String(max + 1).padStart(2, '0')}`;
  }

  function createProjectStore(initial = null) {
    let state = null;
    const listeners = new Set();

    function notify(source) {
      const snapshot = getProject();
      listeners.forEach(listener => listener(snapshot, source));
    }

    function getProject() {
      return clone(state);
    }

    function requireProject() {
      if (!state) throw new Error('Create a Project before modifying it.');
    }

    function requireScene(sceneId) {
      requireProject();
      const scene = state.scenes[sceneId];
      if (!scene) throw new Error(`Unknown Scene: ${sceneId}`);
      return scene;
    }

    function validateAndCommit(next, source) {
      const checked = validateProjectState(next);
      if (!checked.valid) throw new Error(`Invalid Project State: ${checked.errors.join('; ')}`);
      state = checked.value;
      notify(source);
      return getProject();
    }

    function normalizeOrders(project) {
      project.sceneOrder.forEach((id, index) => {
        project.scenes[id].order = index + 1;
      });
      return project;
    }

    function createProject(input = {}) {
      const next = {
        id: String(input.id || `project-${Date.now()}`),
        title: String(input.title || 'Untitled Project'),
        projectIntent: String(input.projectIntent || ''),
        sourceNarrative: String(input.sourceNarrative || ''),
        sceneOrder: [],
        activeSceneId: null,
        scenes: {}
      };
      return validateAndCommit(next, 'project:create');
    }

    function updateProjectMetadata(patch = {}) {
      requireProject();
      const next = getProject();
      ['title','projectIntent','sourceNarrative'].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(patch, key)) next[key] = String(patch[key] ?? '');
      });
      return validateAndCommit(next, 'project:metadata');
    }

    function addScene(sceneInput = {}, options = {}) {
      requireProject();
      const next = getProject();
      const index = Number.isInteger(options.index)
        ? Math.max(0, Math.min(options.index, next.sceneOrder.length))
        : next.sceneOrder.length;
      const requestedId = String(sceneInput.id || '');
      const generatedId = requestedId && !requestedId.startsWith('proposal-') ? requestedId : nextFreeSceneId(next.scenes);
      if (next.scenes[generatedId]) throw new Error(`Scene already exists: ${generatedId}`);
      const record = sceneInput.workspace && sceneInput.status
        ? clone(sceneInput)
        : createEmptySceneRecord({
          id: generatedId,
          order: index + 1,
          title: sceneInput.title,
          narrativeRole: sceneInput.narrativeRole || {
            role: sceneInput.role,
            narrativeFunction: sceneInput.narrativeFunction,
            startingState: sceneInput.startingState,
            endingState: sceneInput.endingState,
            turningPoint: sceneInput.turningPoint,
            agencyTransition: sceneInput.agencyTransition,
            relationToPrevious: sceneInput.relationToPrevious ?? null
          }
        });
      record.id = generatedId;
      const checked = validateSceneRecord(record);
      if (!checked.valid) throw new Error(`Invalid Scene Record: ${checked.errors.join('; ')}`);
      next.scenes[generatedId] = checked.value;
      next.sceneOrder.splice(index, 0, generatedId);
      normalizeOrders(next);
      if (!next.activeSceneId) next.activeSceneId = generatedId;
      return validateAndCommit(next, 'scene:add');
    }

    function updateScene(sceneId, patch = {}) {
      requireScene(sceneId);
      const next = getProject();
      const merged = mergeNested(next.scenes[sceneId], patch);
      merged.id = sceneId;
      const checked = validateSceneRecord(merged);
      if (!checked.valid) throw new Error(`Invalid Scene Record: ${checked.errors.join('; ')}`);
      next.scenes[sceneId] = checked.value;
      return validateAndCommit(next, 'scene:update');
    }

    function removeScene(sceneId) {
      requireScene(sceneId);
      const next = getProject();
      delete next.scenes[sceneId];
      next.sceneOrder = next.sceneOrder.filter(id => id !== sceneId);
      normalizeOrders(next);
      if (next.activeSceneId === sceneId) next.activeSceneId = next.sceneOrder[0] || null;
      return validateAndCommit(next, 'scene:remove');
    }

    function reorderScenes(sceneIds) {
      requireProject();
      if (!Array.isArray(sceneIds) || sceneIds.length !== state.sceneOrder.length) throw new Error('Scene reorder must include every Scene exactly once.');
      if (new Set(sceneIds).size !== sceneIds.length || sceneIds.some(id => !state.scenes[id])) throw new Error('Scene reorder contains invalid or duplicate Scene IDs.');
      const next = getProject();
      next.sceneOrder = clone(sceneIds);
      normalizeOrders(next);
      return validateAndCommit(next, 'scene:reorder');
    }

    function setActiveScene(sceneId) {
      requireScene(sceneId);
      const next = getProject();
      next.activeSceneId = sceneId;
      return validateAndCommit(next, 'scene:activate');
    }

    function saveSceneSnapshot(sceneId, snapshot = {}) {
      requireScene(sceneId);
      const next = getProject();
      next.scenes[sceneId].workspace = {
        narrativeState: clone(snapshot.narrativeState ?? null),
        sceneState: clone(snapshot.sceneState ?? null),
        sequenceState: clone(snapshot.sequenceState ?? null)
      };
      return validateAndCommit(next, 'scene:snapshot');
    }

    function confirmBreakdown(draft = {}) {
      requireProject();
      if (draft.status !== 'proposal') throw new Error('Breakdown must be in proposal state before confirmation.');
      if (!Array.isArray(draft.proposedScenes) || !draft.proposedScenes.length) throw new Error('Breakdown proposal must contain at least one Scene.');
      if (state.sceneOrder.length) throw new Error('Project already has confirmed Scenes; automatic reconcile is not supported.');
      const next = getProject();
      next.sceneOrder = [];
      next.scenes = {};
      draft.proposedScenes.forEach((proposal, index) => {
        const id = `scene-${String(index + 1).padStart(2, '0')}`;
        const record = createEmptySceneRecord({
          id,
          order: index + 1,
          title: proposal.title,
          narrativeRole: {
            role: proposal.role,
            narrativeFunction: proposal.narrativeFunction,
            startingState: proposal.startingState,
            endingState: proposal.endingState,
            turningPoint: proposal.turningPoint,
            agencyTransition: clone(proposal.agencyTransition),
            relationToPrevious: proposal.relationToPrevious ?? null
          }
        });
        const checked = validateSceneRecord(record);
        if (!checked.valid) throw new Error(`Invalid Scene Proposal ${index + 1}: ${checked.errors.join('; ')}`);
        next.sceneOrder.push(id);
        next.scenes[id] = checked.value;
      });
      next.activeSceneId = next.sceneOrder[0] || null;
      return validateAndCommit(next, 'breakdown:confirm');
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(getProject(), 'subscribe');
      return () => listeners.delete(listener);
    }

    if (initial) {
      const checked = validateProjectState(initial);
      if (!checked.valid) throw new Error(`Invalid initial Project State: ${checked.errors.join('; ')}`);
      state = checked.value;
    }

    return {
      getProject,
      subscribe,
      createProject,
      updateProjectMetadata,
      addScene,
      updateScene,
      removeScene,
      reorderScenes,
      setActiveScene,
      saveSceneSnapshot,
      confirmBreakdown
    };
  }

  return { createProjectStore };
});
