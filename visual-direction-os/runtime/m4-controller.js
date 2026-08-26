(function attachM4Controller(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }
  if (!root || typeof root.addEventListener !== 'function') return;

  root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
  const runtime = root.VisualDirectionRuntime;

  function unavailableMemory(error) {
    const fail = async () => { throw error; };
    return {
      getLatestProject:fail,
      getProject:fail,
      ensureProject:fail,
      listArtifacts:fail,
      listComparisons:async () => [],
      saveGenerationArtifact:fail,
      saveComparison:async (row) => row,
      estimateStorage:async () => null,
      deleteSubtree:fail,
      clearProject:fail
    };
  }

  let memory;
  try {
    memory = runtime.createDirectorMemory({ store:runtime.createIndexedDbStore(root) });
  } catch (error) {
    memory = unavailableMemory(error);
  }

  const generationRunner = api.createBrowserGenerationRunner({
    root,
    runGenerationIteration:runtime.runGenerationIteration,
    applyIterationDelta:runtime.applyIterationDelta
  });

  const controller = api.createM4Controller({
    memory,
    compareArtifacts:runtime.compareArtifacts,
    deriveMemoryForPath:runtime.deriveMemoryForPath,
    compileMemoryAppendix:runtime.compileMemoryAppendix,
    generationRunner,
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
  const clone = (value) => {
    if (value == null) return value;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };
  const emptyMemory = () => ({ pathArtifactIds:[], locked:[], active:[], watch:[] });
  const pairKey = (a, b) => `${a || ''}::${b || ''}`;

  function createBrowserGenerationRunner({ root, runGenerationIteration, applyIterationDelta } = {}) {
    return async function browserGenerationRunner({ artifact, promptAppendix } = {}) {
      if (!artifact?.id || !artifact?.request) throw new Error('A generation artifact is required for branch re-direction');
      if (!artifact.evaluationDelta?.promptAppendix && !String(promptAppendix || '').trim()) throw new Error('The selected artifact has no compiled evaluation delta');
      if (typeof runGenerationIteration !== 'function') throw new Error('M3 iteration runner is unavailable');
      if (typeof applyIterationDelta !== 'function') throw new Error('M3 iteration compiler is unavailable');
      return runGenerationIteration({
        root,
        artifact,
        delta:artifact.evaluationDelta,
        promptAppendix:String(promptAppendix || '').trim() || artifact.evaluationDelta.promptAppendix,
        baseRequest:clone(artifact.baseRequest || artifact.request),
        applyIterationDelta
      });
    };
  }

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

    const sorted = (rows = state.artifacts) => [...rows].sort((a,b) => (a.generationIndex || 0) - (b.generationIndex || 0));
    const localArtifact = (id) => state.artifacts.find((row) => row.id === id) || null;
    const nextIndex = () => state.artifacts.reduce((max,row) => Math.max(max, Number(row.generationIndex) || 0), 0) + 1;
    const snapshot = () => clone(state);
    const emit = () => onState(snapshot());
    const getState = () => snapshot();

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
          const locks = { ...(semanticLocksByHead.get(record.artifactBId) || {}) };
          locks[checkId] = true;
          semanticLocksByHead.set(record.artifactBId, locks);
        }
      }
    }

    function chooseDefaultSelection() {
      const latest = [...sorted().filter((row) => row.evaluation)].reverse().find((row) => row.parentArtifactId && localArtifact(row.parentArtifactId));
      if (latest) {
        state.selectedAId = latest.parentArtifactId;
        state.selectedBId = latest.id;
        return;
      }
      if (!localArtifact(state.selectedAId)) state.selectedAId = null;
      if (!localArtifact(state.selectedBId)) state.selectedBId = null;
    }

    function recomputeDerived() {
      const a = localArtifact(state.selectedAId);
      const b = localArtifact(state.selectedBId);
      state.comparison = a?.evaluation && b?.evaluation
        ? compareArtifacts({ artifactA:a, artifactB:b, directorJudgments:judgmentsByPair.get(pairKey(a.id,b.id)) || {} })
        : null;
      const head = b || sorted().filter((row) => row.evaluation).at(-1) || null;
      state.memory = head
        ? deriveMemoryForPath({
            artifacts:state.artifacts,
            comparisons:state.comparisons,
            pathHeadId:head.id,
            semanticLocks:semanticLocksByHead.get(head.id) || {}
          })
        : emptyMemory();
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

    async function readProjectState(project) {
      if (!project?.id) throw new Error('M4 project loading requires a project');
      const [artifacts, comparisons] = await Promise.all([
        memory.listArtifacts(project.id),
        typeof memory.listComparisons === 'function' ? memory.listComparisons(project.id) : Promise.resolve([])
      ]);
      return {
        project:clone(project),
        artifacts:sorted(artifacts || []),
        comparisons:clone(comparisons || [])
      };
    }

    function cloneMap(source) {
      return new Map([...source.entries()].map(([key, value]) => [key, clone(value)]));
    }

    function restoreMap(target, source) {
      target.clear();
      for (const [key, value] of source) target.set(key, clone(value));
    }

    async function loadProjectState(loaded) {
      const previousState = snapshot();
      const previousJudgments = cloneMap(judgmentsByPair);
      const previousLocks = cloneMap(semanticLocksByHead);
      try {
        state.project = clone(loaded.project);
        state.artifacts = sorted(loaded.artifacts || []);
        state.comparisons = clone(loaded.comparisons || []);
        state.selectedAId = null;
        state.selectedBId = null;
        state.comparison = null;
        state.memory = emptyMemory();
        state.restoreError = '';
        state.persistenceWarning = '';
        restoreComparisonMetadata(state.comparisons);
        chooseDefaultSelection();
        recomputeDerived();
        await refreshStorage();
      } catch (error) {
        Object.assign(state, previousState);
        restoreMap(judgmentsByPair, previousJudgments);
        restoreMap(semanticLocksByHead, previousLocks);
        throw error;
      }
      revokeIds(new Set(objectUrls.keys()));
      return snapshot();
    }

    async function boot({ projectId = null } = {}) {
      state.restoreError = '';
      state.persistenceWarning = '';
      try {
        let project = null;
        const requestedId = String(projectId || '').trim();
        if (requestedId && typeof memory.getProject === 'function') project = await memory.getProject(requestedId);
        if (!project) project = await memory.getLatestProject();
        if (!project) {
          const timestamp = now();
          project = await memory.ensureProject({ createdAt:timestamp, updatedAt:timestamp });
        }
        const loaded = await readProjectState(project);
        await loadProjectState(loaded);
      } catch (error) {
        state.restoreError = String(error?.message || error);
        state.project = null;
        state.artifacts = [];
        state.comparisons = [];
        state.selectedAId = null;
        state.selectedBId = null;
        state.comparison = null;
        state.memory = emptyMemory();
        judgmentsByPair.clear();
        semanticLocksByHead.clear();
      }
      emit();
      return snapshot();
    }

    async function openProject(projectId) {
      const id = String(projectId || '').trim();
      if (!id) throw new Error('Project ID is required');
      if (typeof memory.getProject !== 'function') throw new Error('Director memory cannot open projects by ID');
      const project = await memory.getProject(id);
      if (!project) throw new Error(`Unknown project: ${id}`);
      const loaded = await readProjectState(project);
      await loadProjectState(loaded);
      emit();
      return snapshot();
    }

    function getExportSnapshot() {
      const head = localArtifact(state.selectedBId) || sorted().filter((row) => row.evaluation).at(-1) || null;
      return clone({
        project:state.project,
        artifacts:state.artifacts,
        comparisons:state.comparisons,
        memorySnapshot:{
          ...state.memory,
          computedAt:now(),
          pathHeadArtifactId:head?.id || null
        }
      });
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
      const existing = localArtifact(artifact.id);
      const parentArtifactId = artifact.iterationOf || artifact.parentArtifactId || existing?.parentArtifactId || null;
      const parent = parentArtifactId ? localArtifact(parentArtifactId) : null;
      const enriched = {
        ...(existing ? clone(existing) : {}),
        ...clone(artifact),
        projectId:state.project.id,
        parentArtifactId,
        rootArtifactId:parent ? (parent.rootArtifactId || parent.id) : (existing?.rootArtifactId || artifact.id),
        generationIndex:existing?.generationIndex || nextIndex(),
        persistenceStatus:existing?.persistenceStatus || null
      };
      state.artifacts = sorted(state.artifacts.filter((row) => row.id !== artifact.id).concat(enriched));
      emit();
      return clone(enriched);
    }

    async function ingestEvaluation({ artifact, human = {}, report, delta } = {}) {
      if (!artifact?.id || !report || !delta) throw new Error('M4 evaluation ingest requires artifact, report, and delta');
      let current = localArtifact(artifact.id);
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
      state.artifacts = sorted(state.artifacts.filter((row) => row.id !== merged.id).concat(merged));

      if (persisted.persistenceStatus === 'not_persisted') state.persistenceWarning = `Generation ${merged.id} not persisted: ${persisted.persistenceError || 'storage write failed'}`;
      else if (persisted.persistenceStatus === 'meta_only') state.persistenceWarning = `Generation ${merged.id}: image not persisted; metadata is saved.`;
      else state.persistenceWarning = '';

      try { state.project = await memory.ensureProject({ ...state.project, updatedAt:now() }); } catch (_) {}
      chooseDefaultSelection();
      recomputeDerived();
      await persistCurrentComparison();
      await refreshStorage();
      emit();
      return clone(merged);
    }

    async function selectA(id) {
      if (id != null && !localArtifact(id)) throw new Error(`Unknown A artifact: ${id}`);
      state.selectedAId = id || null;
      recomputeDerived();
      emit();
      return snapshot();
    }

    async function selectB(id) {
      if (id != null && !localArtifact(id)) throw new Error(`Unknown B artifact: ${id}`);
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

      const b = localArtifact(state.selectedBId);
      const semanticCheck = b?.evaluation?.checks?.find((check) => check.id === checkId && check.evidenceMode === 'human_required');
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
      const artifact = localArtifact(id);
      if (!artifact) return null;
      if (objectUrls.has(id)) return objectUrls.get(id);
      if (artifact.imageBlob && typeof createObjectURL === 'function') {
        const url = createObjectURL(artifact.imageBlob);
        if (url) {
          objectUrls.set(id, url);
          return url;
        }
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
        if (!url) continue;
        try { revokeObjectURL(url); } catch (_) {}
        objectUrls.delete(id);
      }
    }

    async function deleteSubtree(id) {
      if (!localArtifact(id)) return [];
      const ids = stateSubtreeIds(id);
      try {
        for (const persistedId of await memory.deleteSubtree(id) || []) ids.add(persistedId);
      } catch (_) {}
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
      if (state.project?.id) await memory.clearProject(state.project.id);
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
      if (!localArtifact(id)) return emptyMemory();
      return clone(deriveMemoryForPath({
        artifacts:state.artifacts,
        comparisons:state.comparisons,
        pathHeadId:id,
        semanticLocks:semanticLocksByHead.get(id) || {}
      }));
    }

    function getCurrentMemoryAppendix() {
      const head = localArtifact(state.selectedBId) || sorted().filter((row) => row.evaluation).at(-1) || null;
      if (!head) return '';
      return compileMemoryAppendix({ currentDelta:head.evaluationDelta || null, memory:getMemoryFor(head.id) });
    }

    async function redirectFromArtifact(id) {
      if (typeof generationRunner !== 'function') throw new Error('M4 branch generation runner is not configured');
      const artifact = localArtifact(id);
      if (!artifact) throw new Error(`Unknown generation artifact: ${id}`);
      const branchMemory = getMemoryFor(id);
      return generationRunner({
        artifact:clone(artifact),
        memory:branchMemory,
        promptAppendix:compileMemoryAppendix({ currentDelta:artifact.evaluationDelta || null, memory:branchMemory })
      });
    }

    function dispose() { revokeIds(new Set(objectUrls.keys())); }

    return {
      boot,
      openProject,
      getState,
      getExportSnapshot,
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

  return { createM4Controller, createBrowserGenerationRunner };
});
