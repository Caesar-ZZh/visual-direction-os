(function attachM6Controller(root, factory) {
  const dependencies = typeof module !== 'undefined' && module.exports
    ? { ...require('./sequence-model.js'), ...require('./continuity-engine.js') }
    : (root?.VisualDirectionRuntime || {});
  const api = factory(root, dependencies);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function m6ControllerFactory(root, dependencies) {
  'use strict';

  const {
    shapeSequence,
    shapeShot,
    sortSequences,
    sortShots,
    migrateLegacyBundleToM6,
    resolveContinuitySource,
    deriveContinuityStatus
  } = dependencies;

  const clone = (value) => value == null ? value : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

  function randomId(prefix) {
    const uuid = root?.crypto?.randomUUID?.() || globalThis?.crypto?.randomUUID?.();
    return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  }

  function createM6Controller({
    memory,
    m4,
    now = () => new Date().toISOString(),
    makeSequenceId = () => randomId('sequence'),
    makeShotId = () => randomId('shot'),
    onState = () => {}
  } = {}) {
    if (!memory || typeof memory.loadProjectBundle !== 'function') throw new Error('M6 controller requires Director Memory project bundles');
    if (!m4 || typeof m4.openShot !== 'function') throw new Error('M6 controller requires M4 openShot()');
    for (const fn of [shapeSequence,shapeShot,sortSequences,sortShots,migrateLegacyBundleToM6,resolveContinuitySource,deriveContinuityStatus]) {
      if (typeof fn !== 'function') throw new Error('M6 controller dependencies are unavailable');
    }

    const state = {
      project:null,
      sequences:[],
      shots:[],
      activeSequenceId:null,
      activeShotId:null,
      continuityByShotId:{},
      restoreError:'',
      persistenceWarning:''
    };
    let artifactsById = new Map();

    const snapshot = () => clone(state);
    const emit = () => onState(snapshot());
    const getState = () => snapshot();
    const sequenceById = (id) => state.sequences.find((row) => row.id === id) || null;
    const shotById = (id) => state.shots.find((row) => row.id === id) || null;

    function orderedShots(sequences = state.sequences, shots = state.shots) {
      const output = [];
      for (const sequence of sortSequences(sequences)) output.push(...sortShots(shots.filter((shot) => shot.sequenceId === sequence.id)));
      return output;
    }

    function refreshDerived() {
      const next = {};
      for (const shot of state.shots) next[shot.id] = deriveContinuityStatus({ shot, shots:state.shots, artifactsById });
      state.continuityByShotId = next;
    }

    function resolveContinuity(shotId) {
      const shot = shotById(shotId);
      if (!shot) throw new Error(`Unknown Shot: ${shotId}`);
      return clone(resolveContinuitySource({ shot, shots:state.shots, artifactsById }));
    }

    function shouldMigrateLegacy(bundle) {
      if (!bundle?.project || (bundle.sequences || []).length) return false;
      const hasM6Navigation = Object.prototype.hasOwnProperty.call(bundle.project, 'activeSequenceId')
        || Object.prototype.hasOwnProperty.call(bundle.project, 'activeShotId');
      const hasLegacyArtifact = (bundle.artifacts || []).some((artifact) => !artifact.sequenceId || !artifact.shotId);
      return !hasM6Navigation || hasLegacyArtifact;
    }

    async function persistNavigation() {
      if (!state.project) return;
      const updated = {
        ...state.project,
        activeSequenceId:state.activeSequenceId,
        activeShotId:state.activeShotId,
        updatedAt:now()
      };
      if (typeof memory.ensureProject === 'function') state.project = await memory.ensureProject(updated);
      else state.project = updated;
    }

    function repairActiveContext(project) {
      let activeSequenceId = sequenceById(project?.activeSequenceId)?.id || null;
      let activeShotId = shotById(project?.activeShotId)?.id || null;
      if (activeShotId) {
        const activeShot = shotById(activeShotId);
        if (!activeSequenceId || activeShot.sequenceId !== activeSequenceId) activeSequenceId = activeShot.sequenceId;
      }
      if (!activeSequenceId) activeSequenceId = state.sequences[0]?.id || null;
      if (!activeShotId || shotById(activeShotId)?.sequenceId !== activeSequenceId) {
        activeShotId = sortShots(state.shots.filter((shot) => shot.sequenceId === activeSequenceId))[0]?.id || null;
      }
      if (!activeShotId && state.shots.length) {
        const fallback = orderedShots()[0];
        activeShotId = fallback?.id || null;
        activeSequenceId = fallback?.sequenceId || activeSequenceId;
      }
      state.activeSequenceId = activeSequenceId;
      state.activeShotId = activeShotId;
    }

    async function applyBundle(bundle, { openM4 = true } = {}) {
      state.project = clone(bundle.project);
      state.sequences = sortSequences(clone(bundle.sequences || []));
      state.shots = orderedShots(state.sequences, clone(bundle.shots || []));
      artifactsById = new Map((bundle.artifacts || []).map((artifact) => [artifact.id, clone(artifact)]));
      repairActiveContext(state.project);
      refreshDerived();
      const navigationChanged = state.project?.activeSequenceId !== state.activeSequenceId || state.project?.activeShotId !== state.activeShotId;
      if (navigationChanged) await persistNavigation();
      if (openM4 && state.activeShotId) {
        await m4.openShot({ projectId:state.project.id, sequenceId:state.activeSequenceId, shotId:state.activeShotId });
      }
      return snapshot();
    }

    async function loadProject(projectId) {
      let bundle = await memory.loadProjectBundle(projectId);
      if (!bundle?.project) throw new Error(`Unknown project: ${projectId}`);
      if (shouldMigrateLegacy(bundle)) {
        const migrated = migrateLegacyBundleToM6(bundle);
        await memory.commitProjectBundle({ mode:'replace', replaceProjectId:bundle.project.id, ...migrated });
        bundle = migrated;
      }
      return applyBundle(bundle);
    }

    async function boot({ projectId = null } = {}) {
      state.restoreError = '';
      state.persistenceWarning = '';
      try {
        let project = null;
        const requested = String(projectId || '').trim();
        if (requested && typeof memory.getProject === 'function') project = await memory.getProject(requested);
        if (!project && typeof memory.getLatestProject === 'function') project = await memory.getLatestProject();
        if (!project && typeof memory.ensureProject === 'function') project = await memory.ensureProject({ updatedAt:now() });
        if (!project?.id) throw new Error('M6 could not resolve a project');
        await loadProject(project.id);
      } catch (error) {
        state.restoreError = String(error?.message || error);
        state.project = null;
        state.sequences = [];
        state.shots = [];
        state.activeSequenceId = null;
        state.activeShotId = null;
        state.continuityByShotId = {};
        artifactsById = new Map();
      }
      emit();
      return snapshot();
    }

    async function openProject(projectId) {
      const id = String(projectId || '').trim();
      if (!id) throw new Error('Project ID is required');
      const result = await loadProject(id);
      emit();
      return result;
    }

    async function createSequence({ title = 'Untitled Sequence', intent = '' } = {}) {
      if (!state.project?.id) throw new Error('No active project');
      const timestamp = now();
      const order = state.sequences.reduce((max,row) => Math.max(max, Number(row.order) || 0), 0) + 1;
      const sequence = shapeSequence({ id:makeSequenceId(), projectId:state.project.id, order, title, intent, createdAt:timestamp, updatedAt:timestamp });
      await memory.putSequence(sequence);
      state.sequences = sortSequences(state.sequences.concat(sequence));
      emit();
      return clone(sequence);
    }

    async function updateSequence(sequenceId, patch = {}) {
      const existing = sequenceById(sequenceId);
      if (!existing) throw new Error(`Unknown Sequence: ${sequenceId}`);
      const sequence = shapeSequence({ ...existing, title:patch.title ?? existing.title, intent:patch.intent ?? existing.intent, updatedAt:now() });
      await memory.putSequence(sequence);
      state.sequences = sortSequences(state.sequences.filter((row)=>row.id!==sequence.id).concat(sequence));
      emit();
      return clone(sequence);
    }

    async function createShot({ sequenceId, title = 'Untitled Shot', intent = '' } = {}) {
      const sequence = sequenceById(sequenceId);
      if (!sequence) throw new Error(`Unknown Sequence: ${sequenceId}`);
      const timestamp = now();
      const siblings = state.shots.filter((shot)=>shot.sequenceId===sequenceId);
      const order = siblings.reduce((max,row)=>Math.max(max,Number(row.order)||0),0)+1;
      const shot = shapeShot({ id:makeShotId(), projectId:state.project.id, sequenceId, order, title, intent, approvedArtifactId:null, continuityMode:'auto', continuitySourceShotId:null, createdAt:timestamp, updatedAt:timestamp });
      await memory.putShot(shot);
      state.shots = orderedShots(state.sequences,state.shots.concat(shot));
      refreshDerived();
      if (!state.activeShotId) await setActiveShot(shot.id);
      else emit();
      return clone(shot);
    }

    async function updateShot(shotId, patch = {}) {
      const existing = shotById(shotId);
      if (!existing) throw new Error(`Unknown Shot: ${shotId}`);
      const shot = shapeShot({ ...existing, title:patch.title ?? existing.title, intent:patch.intent ?? existing.intent, updatedAt:now() });
      await memory.putShot(shot);
      state.shots = orderedShots(state.sequences,state.shots.filter((row)=>row.id!==shot.id).concat(shot));
      refreshDerived();
      emit();
      return clone(shot);
    }

    async function reorderShots(sequenceId, orderedShotIds = []) {
      if (!sequenceById(sequenceId)) throw new Error(`Unknown Sequence: ${sequenceId}`);
      const siblings = sortShots(state.shots.filter((shot)=>shot.sequenceId===sequenceId));
      const expected = new Set(siblings.map((shot)=>shot.id));
      if (orderedShotIds.length !== siblings.length || orderedShotIds.some((id)=>!expected.has(id)) || new Set(orderedShotIds).size !== orderedShotIds.length) {
        throw new Error('Shot reorder must include every Shot in the Sequence exactly once');
      }
      const timestamp = now();
      const updated = orderedShotIds.map((id,index)=>shapeShot({ ...shotById(id), order:index+1, updatedAt:timestamp }));
      for (const shot of updated) await memory.putShot(shot);
      const updatedMap = new Map(updated.map((shot)=>[shot.id,shot]));
      state.shots = orderedShots(state.sequences,state.shots.map((shot)=>updatedMap.get(shot.id)||shot));
      refreshDerived();
      emit();
      return clone(updated);
    }

    async function setActiveShot(shotId) {
      const shot = shotById(shotId);
      if (!shot) throw new Error(`Unknown Shot: ${shotId}`);
      state.activeShotId = shot.id;
      state.activeSequenceId = shot.sequenceId;
      await persistNavigation();
      await m4.openShot({ projectId:state.project.id, sequenceId:shot.sequenceId, shotId:shot.id });
      emit();
      return snapshot();
    }

    async function replaceWithFilteredBundle({ removeSequenceId = null, removeShotId = null } = {}) {
      const current = await memory.loadProjectBundle(state.project.id);
      const removedShotIds = new Set();
      if (removeSequenceId) for (const shot of current.shots || []) if (shot.sequenceId === removeSequenceId) removedShotIds.add(shot.id);
      if (removeShotId) removedShotIds.add(removeShotId);
      const sequences = (current.sequences || []).filter((row)=>row.id!==removeSequenceId);
      const shots = (current.shots || []).filter((row)=>!removedShotIds.has(row.id));
      const artifacts = (current.artifacts || []).filter((row)=>!removedShotIds.has(row.shotId));
      const comparisons = (current.comparisons || []).filter((row)=>!removedShotIds.has(row.shotId));
      const nextProject = { ...current.project };
      const next = { project:nextProject, sequences, shots, artifacts, comparisons };
      await memory.commitProjectBundle({ mode:'replace', replaceProjectId:state.project.id, ...next });
      return next;
    }

    async function deleteShot(shotId) {
      const existing = shotById(shotId);
      if (!existing) return false;
      const next = await replaceWithFilteredBundle({ removeShotId:shotId });
      await applyBundle(next);
      emit();
      return true;
    }

    async function deleteSequence(sequenceId) {
      if (!sequenceById(sequenceId)) return false;
      const next = await replaceWithFilteredBundle({ removeSequenceId:sequenceId });
      await applyBundle(next);
      emit();
      return true;
    }

    return {
      boot,
      openProject,
      createSequence,
      updateSequence,
      deleteSequence,
      createShot,
      updateShot,
      reorderShots,
      deleteShot,
      setActiveShot,
      getState,
      resolveContinuity
    };
  }

  return { createM6Controller };
});
