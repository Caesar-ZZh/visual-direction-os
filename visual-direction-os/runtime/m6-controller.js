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
    deriveContinuityStatus,
    buildContinuityDependents,
    collectContinuityDescendants,
    detectAutoSourceChange
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
    for (const fn of [shapeSequence,shapeShot,sortSequences,sortShots,migrateLegacyBundleToM6,resolveContinuitySource,deriveContinuityStatus,buildContinuityDependents,collectContinuityDescendants,detectAutoSourceChange]) {
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

    function effectiveResolutionForShot(shot, shots = state.shots) {
      if (shot?.continuityInvalidation?.directSourceDeleted) {
        return {
          status:'missing',
          sourceShotId:shot.continuityInvalidation.previousSourceShotId || shot.continuityInvalidation.causedByShotId || null,
          sourceArtifactId:shot.continuityInvalidation.previousArtifactId || null,
          sourceArtifact:null,
          reason:'source_shot_deleted'
        };
      }
      return resolveContinuitySource({ shot, shots, artifactsById });
    }

    function statusFromResolution(shot, resolution) {
      if (resolution.status === 'not_applicable') return 'not_applicable';
      if (resolution.status === 'out_of_order') return 'source_out_of_order';
      if (resolution.status === 'missing') return 'source_missing';
      if (resolution.status === 'unavailable') return 'source_unavailable';
      return deriveContinuityStatus({ shot, shots:state.shots, artifactsById });
    }

    function refreshDerived() {
      const next = {};
      for (const shot of state.shots) next[shot.id] = statusFromResolution(shot, effectiveResolutionForShot(shot));
      state.continuityByShotId = next;
    }

    function resolveContinuity(shotId) {
      const shot = shotById(shotId);
      if (!shot) throw new Error(`Unknown Shot: ${shotId}`);
      return clone(effectiveResolutionForShot(shot));
    }

    async function refreshArtifacts() {
      if (!state.project?.id) return;
      const bundle = await memory.loadProjectBundle(state.project.id);
      artifactsById = new Map((bundle.artifacts || []).map((artifact) => [artifact.id, clone(artifact)]));
      refreshDerived();
    }

    function invalidationRecord({ reason, causedByShotId, previousArtifactId = null, currentArtifactId = null, previousSourceShotId = null, currentSourceShotId = null, directSourceDeleted = false } = {}) {
      return {
        reason, causedByShotId, previousArtifactId, currentArtifactId, previousSourceShotId, currentSourceShotId,
        directSourceDeleted:Boolean(directSourceDeleted), invalidatedAt:now()
      };
    }

    async function commitShotRecords(nextShots) {
      const current = await memory.loadProjectBundle(state.project.id);
      const next = {
        project:{ ...current.project, activeSequenceId:state.activeSequenceId, activeShotId:state.activeShotId },
        sequences:clone(current.sequences || state.sequences),
        shots:orderedShots(state.sequences, clone(nextShots)),
        artifacts:clone(current.artifacts || []),
        comparisons:clone(current.comparisons || [])
      };
      await memory.commitProjectBundle({ mode:'replace', replaceProjectId:state.project.id, ...next });
      await applyBundle(next, { openM4:false });
      return next;
    }

    function applyInvalidationToDescendants(shots, sourceShotId, record, { includeSource = false } = {}) {
      const affected = new Set(collectContinuityDescendants(sourceShotId, shots));
      if (includeSource) affected.add(sourceShotId);
      return shots.map((shot) => affected.has(shot.id) ? { ...shot, continuityInvalidation:clone(record), updatedAt:now() } : shot);
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
      const beforeShots = clone(state.shots);
      const timestamp = now();
      const reordered = orderedShotIds.map((id,index)=>shapeShot({ ...shotById(id), order:index+1, updatedAt:timestamp }));
      const reorderedMap = new Map(reordered.map((shot)=>[shot.id,shot]));
      let nextShots = state.shots.map((shot)=>reorderedMap.get(shot.id)||shot);
      nextShots = orderedShots(state.sequences,nextShots);

      for (const shot of nextShots.filter((row)=>row.sequenceId===sequenceId && row.continuityMode==='auto')) {
        const change = detectAutoSourceChange({ shotId:shot.id, beforeShots, afterShots:nextShots });
        if (!change || !shot.approvedArtifactId) continue;
        const beforeShot = beforeShots.find((row)=>row.id===shot.id);
        const beforeResolution = resolveContinuitySource({ shot:beforeShot, shots:beforeShots, artifactsById });
        const afterResolution = resolveContinuitySource({ shot, shots:nextShots, artifactsById });
        const record = invalidationRecord({
          reason:'auto_source_changed_after_reorder', causedByShotId:shot.id,
          previousArtifactId:beforeResolution.sourceArtifactId || null, currentArtifactId:afterResolution.sourceArtifactId || null,
          previousSourceShotId:change.previousSourceShotId, currentSourceShotId:change.currentSourceShotId
        });
        nextShots = nextShots.map((row)=>row.id===shot.id ? { ...row, continuityInvalidation:record, updatedAt:now() } : row);
        nextShots = applyInvalidationToDescendants(nextShots, shot.id, record);
      }
      await commitShotRecords(nextShots);
      emit();
      return clone(sortShots(state.shots.filter((shot)=>shot.sequenceId===sequenceId)));
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
      const current = await memory.loadProjectBundle(state.project.id);
      const beforeShots = clone(state.shots);
      const dependents = buildContinuityDependents(beforeShots);
      const direct = new Set(dependents.get(shotId) || []);
      const descendants = new Set(collectContinuityDescendants(shotId, beforeShots));
      const previousArtifactId = existing.approvedArtifactId || null;
      let nextShots = (current.shots || []).filter((row)=>row.id!==shotId);
      nextShots = nextShots.map((shot) => {
        if (direct.has(shot.id)) return {
          ...shot,
          continuityInvalidation:invalidationRecord({ reason:'source_deleted', causedByShotId:shotId, previousArtifactId, previousSourceShotId:shotId, directSourceDeleted:true }),
          updatedAt:now()
        };
        if (descendants.has(shot.id)) return {
          ...shot,
          continuityInvalidation:invalidationRecord({ reason:'dependency_source_deleted', causedByShotId:shotId, previousArtifactId, previousSourceShotId:shotId }),
          updatedAt:now()
        };
        return shot;
      });
      const next = {
        project:{...current.project},
        sequences:clone(current.sequences||[]),
        shots:nextShots,
        artifacts:(current.artifacts||[]).filter((row)=>row.shotId!==shotId),
        comparisons:(current.comparisons||[]).filter((row)=>row.shotId!==shotId)
      };
      await memory.commitProjectBundle({mode:'replace',replaceProjectId:state.project.id,...next});
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

    async function setApprovedFrame(shotId, artifactId) {
      await refreshArtifacts();
      const shot = shotById(shotId);
      if (!shot) throw new Error(`Unknown Shot: ${shotId}`);
      const artifact = artifactsById.get(artifactId);
      if (!artifact || artifact.shotId !== shot.id) throw new Error('Approved Frame must belong to the same Shot');
      const previousArtifactId = shot.approvedArtifactId || null;
      if (previousArtifactId === artifactId) return clone(shot);
      const incoming = effectiveResolutionForShot(shot);
      let updatedSource = { ...shot, approvedArtifactId:artifactId, updatedAt:now() };
      const provenance = artifact.continuityProvenance || null;
      if (updatedSource.continuityInvalidation) {
        const repaired = incoming.status === 'not_applicable'
          ? provenance?.status === 'not_applicable'
          : incoming.status === 'resolved' && provenance?.status === 'resolved' && provenance.sourceArtifactId === incoming.sourceArtifactId;
        if (repaired) updatedSource = { ...updatedSource, continuityInvalidation:null, continuityReview:null };
      }
      const record = invalidationRecord({ reason:'approved_frame_changed', causedByShotId:shot.id, previousArtifactId, currentArtifactId:artifactId });
      let nextShots = state.shots.map((row)=>row.id===shot.id ? updatedSource : row);
      nextShots = applyInvalidationToDescendants(nextShots, shot.id, record);
      await commitShotRecords(nextShots);
      emit();
      return clone(shotById(shot.id));
    }

    async function clearApprovedFrame(shotId) {
      const shot = shotById(shotId);
      if (!shot) throw new Error(`Unknown Shot: ${shotId}`);
      if (!shot.approvedArtifactId) return clone(shot);
      const previousArtifactId = shot.approvedArtifactId;
      const record = invalidationRecord({ reason:'approved_frame_cleared', causedByShotId:shot.id, previousArtifactId, currentArtifactId:null });
      let nextShots = state.shots.map((row)=>row.id===shot.id ? { ...row, approvedArtifactId:null, updatedAt:now() } : row);
      nextShots = applyInvalidationToDescendants(nextShots, shot.id, record);
      await commitShotRecords(nextShots);
      emit();
      return clone(shotById(shot.id));
    }

    function sourceChangeRecord(shot, previousResolution, currentResolution, reason) {
      return invalidationRecord({
        reason, causedByShotId:shot.id,
        previousArtifactId:previousResolution?.sourceArtifactId || null, currentArtifactId:currentResolution?.sourceArtifactId || null,
        previousSourceShotId:previousResolution?.sourceShotId || null, currentSourceShotId:currentResolution?.sourceShotId || null
      });
    }

    async function changeContinuityMode(shotId, nextMode, sourceShotId = null) {
      const shot = shotById(shotId);
      if (!shot) throw new Error(`Unknown Shot: ${shotId}`);
      await refreshArtifacts();
      const previousResolution = effectiveResolutionForShot(shot);
      let nextShot;
      if (nextMode === 'manual') {
        const source = shotById(sourceShotId);
        if (!source || source.sequenceId !== shot.sequenceId) throw new Error('Manual continuity source must be in the same Sequence');
        const siblings = sortShots(state.shots.filter((row)=>row.sequenceId===shot.sequenceId));
        if (siblings.findIndex((row)=>row.id===source.id) >= siblings.findIndex((row)=>row.id===shot.id)) throw new Error('Manual continuity source must be an earlier Shot');
        nextShot = { ...shot, continuityMode:'manual', continuitySourceShotId:source.id, updatedAt:now() };
      } else {
        nextShot = { ...shot, continuityMode:'auto', continuitySourceShotId:null, updatedAt:now() };
        if (nextShot.continuityInvalidation?.directSourceDeleted) nextShot.continuityInvalidation = null;
      }
      const hypothetical = state.shots.map((row)=>row.id===shot.id ? nextShot : row);
      const currentResolution = resolveContinuitySource({ shot:nextShot, shots:hypothetical, artifactsById });
      let nextShots = hypothetical;
      const changed = previousResolution.sourceShotId !== currentResolution.sourceShotId || previousResolution.sourceArtifactId !== currentResolution.sourceArtifactId || previousResolution.status !== currentResolution.status;
      if (changed && shot.approvedArtifactId) {
        const record = sourceChangeRecord(shot, previousResolution, currentResolution, nextMode === 'auto' ? 'continuity_reset_to_auto' : 'continuity_source_changed');
        nextShots = nextShots.map((row)=>row.id===shot.id ? { ...row, continuityInvalidation:record, updatedAt:now() } : row);
        nextShots = applyInvalidationToDescendants(nextShots, shot.id, record);
      }
      await commitShotRecords(nextShots);
      emit();
      return clone(shotById(shot.id));
    }

    async function setContinuityManual(shotId, sourceShotId) { return changeContinuityMode(shotId,'manual',sourceShotId); }
    async function setContinuityAuto(shotId) { return changeContinuityMode(shotId,'auto',null); }

    async function acceptCurrentContinuity(shotId, note = '') {
      await refreshArtifacts();
      const shot = shotById(shotId);
      if (!shot?.approvedArtifactId) throw new Error('Accept Current Continuity requires an Approved Frame');
      const resolution = effectiveResolutionForShot(shot);
      if (resolution.status !== 'resolved') throw new Error('Accept Current Continuity requires a resolved continuity source');
      const updated = {
        ...shot,
        continuityReview:{ status:'accepted', reviewedArtifactId:shot.approvedArtifactId, sourceArtifactId:resolution.sourceArtifactId, reviewedAt:now(), note:String(note || '') },
        continuityInvalidation:null, updatedAt:now()
      };
      await commitShotRecords(state.shots.map((row)=>row.id===shot.id ? updated : row));
      emit();
      return clone(shotById(shot.id));
    }

    function getContinuityImpact(shotId) {
      if (!shotById(shotId)) throw new Error(`Unknown Shot: ${shotId}`);
      const map = buildContinuityDependents(state.shots);
      const direct = clone(map.get(shotId) || []);
      const descendants = collectContinuityDescendants(shotId,state.shots);
      return { directDependents:direct, descendants:clone(descendants) };
    }

    async function prepareGeneration({ ordinaryReferences = [] } = {}) {
      if (!state.activeShotId) throw new Error('No Active Shot is available for generation');
      await refreshArtifacts();
      const shot = shotById(state.activeShotId);
      const sequence = sequenceById(shot.sequenceId);
      const resolution = effectiveResolutionForShot(shot);
      const usable = (resolution.status === 'resolved' || resolution.status === 'out_of_order') && resolution.sourceArtifact;
      const continuityReference = usable ? {
        role:'continuity', sourceShotId:resolution.sourceShotId, sourceArtifactId:resolution.sourceArtifactId,
        imageBlob:resolution.sourceArtifact.imageBlob || null, source:resolution.sourceArtifact.result?.src || null, preserve:[]
      } : null;
      let provenance;
      if (resolution.status === 'not_applicable') provenance = {sourceShotId:null,sourceArtifactId:null,status:'not_applicable'};
      else if (usable) provenance = {sourceShotId:resolution.sourceShotId,sourceArtifactId:resolution.sourceArtifactId,status:'resolved'};
      else if (resolution.status === 'unavailable') provenance = {sourceShotId:resolution.sourceShotId,sourceArtifactId:resolution.sourceArtifactId||null,status:'unavailable_at_generation'};
      else provenance = {sourceShotId:resolution.sourceShotId||null,sourceArtifactId:null,status:'missing_at_generation'};
      return {
        projectId:state.project.id, sequenceId:sequence.id, shotId:shot.id,
        sequenceIntent:sequence.intent || '', shotIntent:shot.intent || '',
        continuity:{...clone(resolution),reference:clone(continuityReference)},
        continuityProvenance:provenance,
        ordinaryReferences:clone(ordinaryReferences)
      };
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
      setApprovedFrame,
      clearApprovedFrame,
      setContinuityAuto,
      setContinuityManual,
      acceptCurrentContinuity,
      getContinuityImpact,
      prepareGeneration,
      refreshArtifacts,
      getState,
      resolveContinuity
    };
  }

  return { createM6Controller };
});
