(function attachM4Controller(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root) return;

  root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
  const runtime = root.VisualDirectionRuntime;

  function unavailableMemory(error) {
    const fail = async () => { throw error; };
    return {
      getLatestProject: fail,
      ensureProject: fail,
      listArtifacts: fail,
      listComparisons: async () => [],
      saveGenerationArtifact: fail,
      saveComparison: async (row) => row,
      estimateStorage: async () => null,
      deleteSubtree: fail,
      clearProject: fail
    };
  }

  let memory;
  try {
    memory = runtime.createDirectorMemory({ store:runtime.createIndexedDbStore(root) });
  } catch (error) {
    memory = unavailableMemory(error);
  }

  const controller = api.createM4Controller({
    memory,
    compareArtifacts:runtime.compareArtifacts,
    deriveMemoryForPath:runtime.deriveMemoryForPath,
    compileMemoryAppendix:runtime.compileMemoryAppendix,
    now:() => new Date().toISOString(),
    createObjectURL:(blob) => root.URL?.createObjectURL?.(blob) || null,
    revokeObjectURL:(url) => root.URL?.revokeObjectURL?.(url),
    onState:(state) => root.dispatchEvent(new CustomEvent('vdos:m4-state', { detail:{ state } }))
  });

  root.addEventListener('vdos:generation-complete', (event) => {
    const artifact = event.detail?.artifact;
    if (artifact) controller.ingestGeneration(artifact).catch((error) => console.error('[Visual Direction OS M4] Generation ingest failed:', error));
  });
  root.addEventListener('vdos:evaluation-updated', (event) => {
    if (event.detail?.artifact) controller.ingestEvaluation(event.detail).catch((error) => console.error('[Visual Direction OS M4] Evaluation ingest failed:', error));
  });
  root.addEventListener('beforeunload', () => controller.dispose());

  root.VisualDirectionOS = Object.assign(root.VisualDirectionOS || {}, { m4:controller });
})(typeof globalThis !== 'undefined' ? globalThis : this, function m4ControllerFactory() {
  'use strict';

  const SEMANTIC_STATES = new Set(['improved', 'unchanged', 'regressed', 'not_sure']);

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function emptyMemory() { return { pathArtifactIds:[], locked:[], active:[], watch:[] }; }
  function pairKey(a, b) { return `${a || ''}::${b || ''}`; }

  function createM4Controller({
    memory,
    compareArtifacts,
    deriveMemoryForPath,
    compileMemoryAppendix,
    generationRunner = null,
    now = () => new Date().toISOString(),
    createObjectURL = (blob) => typeof URL !== 'undefined' ? URL.createObjectURL(blob) : null,
    revokeObjectURL = (url) => typeof URL !== 'undefined' ? URL.revokeObjectURL(url) : undefined,
    onState = () => {}
  } = {}) {
    if (!memory) throw new Error('M4 controller requires director memory');
    if (typeof compareArtifacts !== 'function') throw new Error('M4 controller requires compareArtifacts');
    if (typeof deriveMemoryForPath !== 'function') throw new Error('M4 controller requires deriveMemoryForPath');
    if (typeof compileMemoryAppendix !== 'function') throw new Error('M4 controller requires compileMemoryAppendix');

    const objectUrls = new Map();
    const judgmentsByPair = new Map();
    const semanticLocksByHead = new Map();
    const state = {
      project:null,
      artifacts:[],
      comparisons:[],
      selectedAId:null,
      selectedBId:null,
      comparison:null,
      memory:emptyMemory(),
      storage:null,
      restoreError:'',
      persistenceWarning:''
    };

    function getArtifactLocal(id) { return state.artifacts.find((row) => row.id === id) || null; }
    function sortedArtifacts(rows = state.artifacts) { return [...rows].sort((a,b) => (a.generationIndex || 0) - (b.generationIndex || 0)); }
    function nextGenerationIndex() { return state.artifacts.reduce((max,row) => Math.max(max, Number(row.generationIndex) || 0), 0) + 1; }

    function snapshot() { return clone(state); }
    function emit() { onState(snapshot()); }
    function getState() { return snapshot(); }

    async function refreshStorage() {
      try { state.storage = await memory.estimateStorage(); }
      catch (_) { state.storage = null; }
    }

    function restoreComparisonMetadata(records) {
      judgmentsByPair.clear();
      semanticLocksByHead.clear();
      for (const record of records || []) {
        const key = pairKey(record.artifactAId, record.artifactBId);
        const judgments = clone(record.directorJudgments || {});
        judgmentsByPair.set(key, judgments);
        for (const [checkId, decision] of Object.entries(judgments)) {
          if (decision?.state !== 'improved') continue;
          if (!semanticLocksByHead.has(record.artifactBId)) semanticLocksByHead.set(record.artifactBId, {});
          semanticLocksByHead.get(record.artifactBId)[checkId] = true;
        }
      }
    }

    function chooseDefaultSelection() {
      const evaluated = sortedArtifacts().filter((row) => row.evaluation);
      const latest = [...evaluated].reverse().find((row) => row.parentArtifactId && getArtifactLocal(row.parentArtifactId));
      if (!latest) {
        if (!state.selectedAId || !getArtifactLocal(state.selectedAId)) state.selectedAId = null;
        if (!state.selectedBId || !getArtifactLocal(state.selectedBId)) state.selectedBId = null;
        return;
      }
      state.selectedAId = latest.parentArtifactId;
      state.selectedBId = latest.id;
    }

    async function persistCurrentComparison() {
      if (!state.project || !state.comparison || typeof memory.saveComparison !== 'function') return;
      const key = pairKey(state.selectedAId, state.selectedBId);
      const record = {
        id:key,
        projectId:state.project.id,
        artifactAId:state.selectedAId,
        artifactBId:state.selectedBId,
        directorJudgments:clone(judgmentsByPair.get(key) || {}),
        comparison:clone(state.comparison),
        updatedAt:now()
      };
      try {
        await memory.saveComparison(record);
        state.comparisons = state.comparisons.filter((row) => row.id !== key).concat(record);
      } catch (error) {
        state.persistenceWarning = `Comparison not persisted: ${error?.message || error}`;
      }
    }

    function recomputeDerived() {
      const artifactA = getArtifactLocal(state.selectedAId);
      const artifactB = getArtifactLocal(state.selectedBId);
      state.comparison = artifactA?.evaluation && artifactB?.evaluation
        ? compareArtifacts({ artifactA, artifactB, directorJudgments:judgmentsByPair.get(pairKey(artifactA.id, artifactB.id)) || {} })
        : null;
      const head = artifactB || sortedArtifacts().filter((row) => row.evaluation).at(-1) || null;
      state.memory = head
        ? deriveMemoryForPath({
            artifacts:state.artifacts,
            comparisons:state.comparisons,
            pathHeadId:head.id,
            semanticLocks:semanticLocksByHead.get(head.id) || {}
          })
        : emptyMemory();
    }

    async function boot() {
      state.restoreError = '';
      state.persistenceWarning = '';
      try {
        let project = await memory.getLatestProject();
        if (!project) {
          const timestamp = now();
          project = await memory.ensureProject({ createdAt:timestamp, updatedAt:timestamp });
        }
        state.project = clone(project);
        const rows = await memory.listArtifacts(project.id);
        state.artifacts = sortedArtifacts(rows || []);
        state.comparisons = typeof memory.listComparisons === 'function' ? clone(await memory.listComparisons(project.id) || []) : [];
        restoreComparisonMetadata(state.comparisons);
        chooseDefaultSelection();
        recomputeDerived();
        await refreshStorage();
      } catch (error) {
        state.restoreError = String(error?.message || error);
        state.artifacts = [];
        state.comparisons = [];
        state.selectedAId = null;
        state.selectedBId = null;
        state.comparison = null;
        state.memory = emptyMemory();
      }
      emit();
      return snapshot();
    }

    async function ensureProject() {
      if (state.project) return state.project;
      const timestamp = now();
      state.project = await memory.ensureProject({ createdAt:timestamp, updatedAt:timestamp });
      return state.project;
    }

    async function ingestGeneration(artifact) {
      if (!artifact?.id) throw new Error('M4 generation ingest requires an artifact');
      await ensureProject();
      const existing = getArtifactLocal(artifact.id);
      const parentArtifactId = artifact.iterationOf || artifact.parentArtifactId || existing?.parentArtifactId || null;
      const parent = parentArtifactId ? getArtifactLocal(parentArtifactId) : null;
      const enriched = {
        ...(existing ? clone(existing) : {}),
        ...clone(artifact),
        projectId:state.project.id,
        parentArtifactId,
        rootArtifactId:parent ? (parent.rootArtifactId || parent.id) : (existing?.rootArtifactId || artifact.id),
        generationIndex:existing?.generationIndex || nextGenerationIndex(),
        persistenceStatus:existing?.persistenceStatus || null
      };
      state.artifacts = sortedArtifacts(state.artifacts.filter((row) => row.id !== artifact.id).concat(enriched));
      emit();
      return clone(enriched);
    }

    async function ingestEvaluation({ artifact, human = {}, report, delta } = {}) {
      if (!artifact?.id || !report || !delta) throw new Error('M4 evaluation ingest requires artifact, report, and delta');
      let current = getArtifactLocal(artifact.id);
      if (!current) current = await ingestGeneration(artifact);
      const incomingIterationDelta = clone(current.iterationDelta || artifact.iterationDelta || null);
      const enriched = {
        ...clone(current),
        ...clone(artifact),
        projectId:current.projectId,
        rootArtifactId:current.rootArtifactId,
        parentArtifactId:current.parentArtifactId,
        generationIndex:current.generationIndex,
        measurements:clone(artifact.measurements || report.measurements || null),
        evaluation:clone(report),
        humanJudgments:clone(human),
        iterationDelta:incomingIterationDelta,
        evaluationDelta:clone(delta)
      };
      const persisted = await memory.saveGenerationArtifact({
        artifact:enriched,
        lineage:{
          projectId:enriched.projectId,
          rootArtifactId:enriched.rootArtifactId,
          parentArtifactId:enriched.parentArtifactId,
          generationIndex:enriched.generationIndex
        }
      });
      const merged = {
        ...enriched,
        imageBlob:persisted.imageBlob ?? enriched.imageBlob ?? null,
        imageMimeType:persisted.imageMimeType ?? enriched.imageMimeType ?? null,
        persistenceStatus:persisted.persistenceStatus,
        persistenceError:persisted.persistenceError || ''
      };
      state.artifacts = sortedArtifacts(state.artifacts.filter((row) => row.id !== merged.id).concat(merged));
      if (persisted.persistenceStatus === 'not_persisted') state.persistenceWarning = `Generation ${merged.id} not persisted: ${persisted.persistenceError || 'storage write failed'}`;
      else if (persisted.persistenceStatus === 'meta_only') state.persistenceWarning = `Generation ${merged.id}: image not persisted; metadata is saved.`;
      else state.persistenceWarning = '';

      try {
        state.project = await memory.ensureProject({ ...state.project, updatedAt:now() });
      } catch (_) {}
      chooseDefaultSelection();
      recomputeDerived();
      await persistCurrentComparison();
      await refreshStorage();
      emit();
      return clone(merged);
    }

    async function selectA(id) {
      if (id != null && !getArtifactLocal(id)) throw new Error(`Unknown A artifact: ${id}`);
      state.selectedAId = id || null;
      recomputeDerived();
      emit();
      return snapshot();
    }

    async function selectB(id) {
      if (id != null && !getArtifactLocal(id)) throw new Error(`Unknown B artifact: ${id}`);
      state.selectedBId = id || null;
      recomputeDerived();
      emit();
      return snapshot();
    }

    async function setSemanticJudgment(checkId, semanticState, note = '') {
      if (!state.selectedAId || !state.selectedBId) throw new Error('Select both A and B before semantic comparison');
      if (!SEMANTIC_STATES.has(semanticState)) throw new Error(`Unsupported semantic comparison state: ${semanticState}`);
      const key = pairKey(state.selectedAId, state.selectedBId);
      const judgments = clone(judgmentsByPair.get(key) || {});
      judgments[checkId] = { state:semanticState, note:String(note || '').trim() };
      judgmentsByPair.set(key, judgments);

      const artifactB = getArtifactLocal(state.selectedBId);
      const semanticCheck = artifactB?.evaluation?.checks?.find((check) => check.id === checkId && check.evidenceMode === 'human_required');
      const locks = { ...(semanticLocksByHead.get(state.selectedBId) || {}) };
      if (semanticState === 'improved' && semanticCheck?.status === 'pass') locks[checkId] = true;
      else delete locks[checkId];
      semanticLocksByHead.set(state.selectedBId, locks);

      recomputeDerived();
      await persistCurrentComparison();
      emit();
      return snapshot();
    }

    async function getRenderableImage(id) {
      const artifact = getArtifactLocal(id);
      if (!artifact) return null;
      if (objectUrls.has(id)) return objectUrls.get(id);
      if (artifact.imageBlob && typeof createObjectURL === 'function') {
        const url = createObjectURL(artifact.imageBlob);
        if (url) { objectUrls.set(id, url); return url; }
      }
      return artifact.result?.src || null;
    }

    function stateSubtreeIds(id) {
      const ids = new Set();
      const visit = (current) => {
        if (ids.has(current)) return;
        ids.add(current);
        for (const artifact of state.artifacts) if (artifact.parentArtifactId === current) visit(artifact.id);
      };
      visit(id);
      return ids;
    }

    function revokeIds(ids) {
      for (const id of ids) {
        const url = objectUrls.get(id);
        if (url) {
          try { revokeObjectURL(url); } catch (_) {}
          objectUrls.delete(id);
        }
      }
    }

    async function deleteSubtree(id) {
      if (!getArtifactLocal(id)) return [];
      const stateIds = stateSubtreeIds(id);
      let persistedIds = [];
      try { persistedIds = await memory.deleteSubtree(id); } catch (_) { persistedIds = []; }
      const ids = new Set([...stateIds, ...(persistedIds || [])]);
      revokeIds(ids);
      state.artifacts = state.artifacts.filter((row) => !ids.has(row.id));
      state.comparisons = state.comparisons.filter((row) => !ids.has(row.artifactAId) && !ids.has(row.artifactBId));
      for (const key of [...judgmentsByPair.keys()]) {
        const [a,b] = key.split('::');
        if (ids.has(a) || ids.has(b)) judgmentsByPair.delete(key);
      }
      for (const artifactId of ids) semanticLocksByHead.delete(artifactId);
      chooseDefaultSelection();
      recomputeDerived();
      await refreshStorage();
      emit();
      return [...ids];
    }

    async function clearProject() {
      const projectId = state.project?.id;
      if (projectId) await memory.clearProject(projectId);
      revokeIds(new Set(state.artifacts.map((row) => row.id)));
      state.project = null;
      state.artifacts = [];
      state.comparisons = [];
      state.selectedAId = null;
      state.selectedBId = null;
      state.comparison = null;
      state.memory = emptyMemory();
      state.storage = null;
      state.persistenceWarning = '';
      judgmentsByPair.clear();
      semanticLocksByHead.clear();
      emit();
      return snapshot();
    }

    function getMemoryFor(id) {
      if (!getArtifactLocal(id)) return emptyMemory();
      return clone(deriveMemoryForPath({
        artifacts:state.artifacts,
        comparisons:state.comparisons,
        pathHeadId:id,
        semanticLocks:semanticLocksByHead.get(id) || {}
      }));
    }

    function getCurrentMemoryAppendix() {
      const head = getArtifactLocal(state.selectedBId) || sortedArtifacts().filter((row) => row.evaluation).at(-1) || null;
      if (!head) return '';
      return compileMemoryAppendix({ currentDelta:head.evaluationDelta || null, memory:getMemoryFor(head.id) });
    }

    async function redirectFromArtifact(id) {
      if (typeof generationRunner !== 'function') throw new Error('M4 branch generation runner is not configured');
      const artifact = getArtifactLocal(id);
      if (!artifact) throw new Error(`Unknown generation artifact: ${id}`);
      return generationRunner({ artifact:clone(artifact), memory:getMemoryFor(id), promptAppendix:compileMemoryAppendix({ currentDelta:artifact.evaluationDelta || null, memory:getMemoryFor(id) }) });
    }

    function dispose() {
      revokeIds(new Set(objectUrls.keys()));
    }

    return {
      boot,
      getState,
      ingestGeneration,
      ingestEvaluation,
      selectA,
      selectB,
      setSemanticJudgment,
      getRenderableImage,
      getMemoryFor,
      getCurrentMemoryAppendix,
      redirectFromArtifact,
      deleteSubtree,
      clearProject,
      dispose
    };
  }

  return { createM4Controller };
});
