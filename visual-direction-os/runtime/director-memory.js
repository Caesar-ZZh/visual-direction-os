(function attachDirectorMemory(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function directorMemoryFactory(root) {
  'use strict';

  const DB_NAME = 'visual-direction-os-m4';
  const DB_VERSION = 2;
  const PERSISTENCE_STATUSES = Object.freeze(['persisted', 'not_persisted', 'meta_only']);

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function decodeBase64(value) {
    const encoded = String(value || '');
    if (typeof root?.atob === 'function') {
      const binary = root.atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(encoded, 'base64'));
    throw new Error('Base64 decoding is unavailable in this runtime');
  }

  function dataUrlToBlob(src) {
    const match = String(src || '').match(/^data:([^;,]+);base64,(.+)$/s);
    if (!match) throw new Error('Expected a Base64 data URL');
    return new Blob([decodeBase64(match[2])], { type: match[1] });
  }

  function assertPersistenceStatus(status) {
    if (!PERSISTENCE_STATUSES.includes(status)) throw new Error(`Unsupported persistenceStatus: ${status}`);
    return status;
  }

  function requiredId(value, label) {
    const id = String(value || '').trim();
    if (!id) throw new Error(`${label} is required for persistence`);
    return id;
  }

  function shapeArtifactRecord({
    artifact,
    projectId,
    sequenceId,
    shotId,
    rootArtifactId,
    parentArtifactId = null,
    generationIndex,
    imageBlob = null,
    persistenceStatus = 'persisted'
  } = {}) {
    if (!artifact?.id) throw new Error('Artifact id is required for persistence');
    projectId = requiredId(projectId, 'projectId');
    sequenceId = requiredId(sequenceId, 'sequenceId');
    shotId = requiredId(shotId, 'shotId');
    if (!rootArtifactId) throw new Error('rootArtifactId is required for persistence');
    if (!Number.isInteger(generationIndex) || generationIndex < 1) throw new Error('generationIndex must be a positive integer');
    assertPersistenceStatus(persistenceStatus);

    const result = artifact.result ? clone(artifact.result) : null;
    if (result && Object.prototype.hasOwnProperty.call(result, 'src')) delete result.src;

    return {
      id:artifact.id,
      projectId,
      sequenceId,
      shotId,
      rootArtifactId,
      parentArtifactId:parentArtifactId ?? null,
      generationIndex,
      createdAt:artifact.createdAt || new Date().toISOString(),
      provider:String(artifact.provider || artifact.request?.model || 'unknown'),
      request:clone(artifact.request || null),
      baseRequest:clone(artifact.baseRequest || artifact.request || null),
      result,
      visualIR:clone(artifact.visualIR || null),
      measurements:clone(artifact.measurements || null),
      evaluation:clone(artifact.evaluation || null),
      humanJudgments:clone(artifact.humanJudgments || {}),
      iterationDelta:clone(artifact.iterationDelta || null),
      evaluationDelta:clone(artifact.evaluationDelta || null),
      comparison:clone(artifact.comparison || null),
      continuityProvenance:clone(artifact.continuityProvenance || null),
      imageBlob,
      imageMimeType:imageBlob?.type || artifact.imageMimeType || null,
      persistenceStatus
    };
  }

  function imageFetchError(message, cause) {
    const error = new Error(message);
    error.code = 'IMAGE_FETCH_FAILED';
    if (cause) error.cause = cause;
    return error;
  }

  async function resolveImageBlob(result, fetchImpl) {
    const src = String(result?.src || '');
    if (!src) return null;
    if (src.startsWith('data:')) return dataUrlToBlob(src);
    if (result?.kind !== 'url' && !/^https?:\/\//i.test(src)) return null;
    if (typeof fetchImpl !== 'function') throw imageFetchError('Image fetch is unavailable for URL persistence');
    let response;
    try { response = await fetchImpl(src); }
    catch (error) { throw imageFetchError(error?.message || 'Generated image URL could not be fetched', error); }
    if (!response?.ok) throw imageFetchError(`Generated image URL returned HTTP ${response?.status || 'error'}`);
    try { return await response.blob(); }
    catch (error) { throw imageFetchError('Generated image response could not be converted to a Blob', error); }
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
  }

  function transactionToPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    });
  }

  function ensureIndex(store, name, keyPath, options) {
    if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
  }

  function sortProjects(rows = []) {
    return [...rows].sort((a,b) => {
      const byTime = String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || ''));
      return byTime || String(a?.id || '').localeCompare(String(b?.id || ''));
    });
  }
  function sortOrdered(rows = []) {
    return [...rows].sort((a,b) => (Number(a?.order) || 0) - (Number(b?.order) || 0) || String(a?.id || '').localeCompare(String(b?.id || '')));
  }
  function sortArtifacts(rows = []) {
    return [...rows].sort((a,b) => (Number(a?.generationIndex) || 0) - (Number(b?.generationIndex) || 0) || String(a?.id || '').localeCompare(String(b?.id || '')));
  }

  function assertProjectBundle({ mode, project, sequences = [], shots = [], artifacts = [], comparisons = [], replaceProjectId = null } = {}) {
    if (!['copy','replace'].includes(mode)) throw new Error(`Unsupported project bundle mode: ${mode}`);
    if (!project?.id) throw new Error('Project bundle requires project.id');
    for (const rows of [sequences,shots,artifacts,comparisons]) if (!Array.isArray(rows)) throw new Error('Project bundle collections must be arrays');
    if (mode === 'replace' && !String(replaceProjectId || project.id).trim()) throw new Error('Replace bundle requires a target project id');

    const projectId = String(project.id);
    const sequenceIds = new Set();
    const shotById = new Map();
    const artifactById = new Map();
    for (const row of sequences) {
      if (!row?.id) throw new Error('Project bundle sequence id is required');
      if (row.projectId !== projectId) throw new Error(`Sequence ${row.id} does not belong to project ${projectId}`);
      if (sequenceIds.has(row.id)) throw new Error(`Duplicate sequence id: ${row.id}`);
      sequenceIds.add(row.id);
    }
    for (const row of shots) {
      if (!row?.id) throw new Error('Project bundle shot id is required');
      if (row.projectId !== projectId) throw new Error(`Shot ${row.id} does not belong to project ${projectId}`);
      if (!sequenceIds.has(row.sequenceId)) throw new Error(`Shot ${row.id} references unknown sequence ${row.sequenceId}`);
      if (shotById.has(row.id)) throw new Error(`Duplicate shot id: ${row.id}`);
      shotById.set(row.id, row);
    }
    const structured = sequences.length || shots.length;
    for (const row of artifacts) {
      if (!row?.id) throw new Error('Project bundle artifact id is required');
      if (row.projectId !== projectId) throw new Error(`Artifact ${row.id} does not belong to project ${projectId}`);
      if (structured) {
        const shot = shotById.get(row.shotId);
        if (!shot || row.sequenceId !== shot.sequenceId) throw new Error(`Artifact ${row.id} does not belong to a valid Shot`);
      }
      if (artifactById.has(row.id)) throw new Error(`Duplicate artifact id: ${row.id}`);
      artifactById.set(row.id, row);
    }
    for (const row of comparisons) {
      if (!row?.id) throw new Error('Project bundle comparison id is required');
      if (row.projectId !== projectId) throw new Error(`Comparison ${row.id} does not belong to project ${projectId}`);
      if (structured) {
        const shot = shotById.get(row.shotId);
        if (!shot || row.sequenceId !== shot.sequenceId) throw new Error(`Comparison ${row.id} does not belong to a valid Shot`);
        const a = artifactById.get(row.artifactAId);
        const b = artifactById.get(row.artifactBId);
        if ((a && a.shotId !== row.shotId) || (b && b.shotId !== row.shotId)) throw new Error(`Comparison ${row.id} crosses Shot boundaries`);
      }
    }
    return { mode, project, sequences, shots, artifacts, comparisons, replaceProjectId:replaceProjectId || null };
  }

  function createIndexedDbStore(runtimeRoot = root) {
    const indexedDB = runtimeRoot?.indexedDB;
    if (!indexedDB) throw new Error('IndexedDB is unavailable in this browser');
    let dbPromise = null;

    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve,reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          const tx = request.transaction;
          const projectStore = db.objectStoreNames.contains('projects') ? tx.objectStore('projects') : db.createObjectStore('projects',{keyPath:'id'});
          ensureIndex(projectStore,'updatedAt','updatedAt');
          const sequenceStore = db.objectStoreNames.contains('sequences') ? tx.objectStore('sequences') : db.createObjectStore('sequences',{keyPath:'id'});
          ensureIndex(sequenceStore,'projectId','projectId');
          ensureIndex(sequenceStore,'order','order');
          const shotStore = db.objectStoreNames.contains('shots') ? tx.objectStore('shots') : db.createObjectStore('shots',{keyPath:'id'});
          ensureIndex(shotStore,'projectId','projectId');
          ensureIndex(shotStore,'sequenceId','sequenceId');
          ensureIndex(shotStore,'order','order');
          const artifactStore = db.objectStoreNames.contains('artifacts') ? tx.objectStore('artifacts') : db.createObjectStore('artifacts',{keyPath:'id'});
          ensureIndex(artifactStore,'projectId','projectId');
          ensureIndex(artifactStore,'sequenceId','sequenceId');
          ensureIndex(artifactStore,'shotId','shotId');
          ensureIndex(artifactStore,'parentArtifactId','parentArtifactId');
          ensureIndex(artifactStore,'rootArtifactId','rootArtifactId');
          ensureIndex(artifactStore,'generationIndex','generationIndex');
          const comparisonStore = db.objectStoreNames.contains('comparisons') ? tx.objectStore('comparisons') : db.createObjectStore('comparisons',{keyPath:'id'});
          ensureIndex(comparisonStore,'projectId','projectId');
          ensureIndex(comparisonStore,'sequenceId','sequenceId');
          ensureIndex(comparisonStore,'shotId','shotId');
          ensureIndex(comparisonStore,'artifactAId','artifactAId');
          ensureIndex(comparisonStore,'artifactBId','artifactBId');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Unable to open M6 IndexedDB'));
        request.onblocked = () => reject(new Error('M6 IndexedDB upgrade is blocked by another page'));
      });
      return dbPromise;
    }

    async function getAllByIndex(storeName,indexName,value) {
      const db = await open();
      const tx = db.transaction(storeName,'readonly');
      const done = transactionToPromise(tx);
      const rows = await requestToPromise(tx.objectStore(storeName).index(indexName).getAll(value));
      await done;
      return rows || [];
    }
    function deleteByProject(tx,storeName,projectId) {
      return new Promise((resolve,reject) => {
        const request = tx.objectStore(storeName).index('projectId').openCursor(projectId);
        request.onsuccess = () => { const cursor = request.result; if (!cursor) return resolve(); cursor.delete(); cursor.continue(); };
        request.onerror = () => reject(request.error || new Error(`Unable to clear ${storeName}`));
      });
    }
    async function deleteOne(storeName,id) {
      const db = await open();
      const tx = db.transaction(storeName,'readwrite');
      const done = transactionToPromise(tx);
      tx.objectStore(storeName).delete(id);
      await done;
    }

    return {
      async putProject(project) { const db=await open(); const tx=db.transaction('projects','readwrite'); const done=transactionToPromise(tx); tx.objectStore('projects').put(clone(project)); await done; return project; },
      async getProject(id) { const db=await open(); const tx=db.transaction('projects','readonly'); const done=transactionToPromise(tx); const row=await requestToPromise(tx.objectStore('projects').get(id)); await done; return row ? clone(row) : null; },
      async listProjects() { const db=await open(); const tx=db.transaction('projects','readonly'); const done=transactionToPromise(tx); const rows=await requestToPromise(tx.objectStore('projects').getAll()); await done; return sortProjects((rows||[]).map(clone)); },
      async getLatestProject() { const db=await open(); const tx=db.transaction('projects','readonly'); const done=transactionToPromise(tx); const index=tx.objectStore('projects').index('updatedAt'); const row=await new Promise((resolve,reject)=>{const request=index.openCursor(null,'prev');request.onsuccess=()=>resolve(request.result?.value||null);request.onerror=()=>reject(request.error||new Error('Unable to read latest project'));}); await done; return row ? clone(row) : null; },

      async putSequence(row) { const db=await open(); const tx=db.transaction('sequences','readwrite'); const done=transactionToPromise(tx); tx.objectStore('sequences').put(clone(row)); await done; return row; },
      async getSequence(id) { const db=await open(); const tx=db.transaction('sequences','readonly'); const done=transactionToPromise(tx); const row=await requestToPromise(tx.objectStore('sequences').get(id)); await done; return row ? clone(row) : null; },
      async listSequences(projectId) { return sortOrdered((await getAllByIndex('sequences','projectId',projectId)).map(clone)); },
      async deleteSequence(id) { return deleteOne('sequences',id); },

      async putShot(row) { const db=await open(); const tx=db.transaction('shots','readwrite'); const done=transactionToPromise(tx); tx.objectStore('shots').put(clone(row)); await done; return row; },
      async getShot(id) { const db=await open(); const tx=db.transaction('shots','readonly'); const done=transactionToPromise(tx); const row=await requestToPromise(tx.objectStore('shots').get(id)); await done; return row ? clone(row) : null; },
      async listShots(sequenceId) { return sortOrdered((await getAllByIndex('shots','sequenceId',sequenceId)).map(clone)); },
      async deleteShot(id) { return deleteOne('shots',id); },

      async putArtifact(row) { const db=await open(); const tx=db.transaction('artifacts','readwrite'); const done=transactionToPromise(tx); tx.objectStore('artifacts').put(clone(row)); await done; return row; },
      async getArtifact(id) { const db=await open(); const tx=db.transaction('artifacts','readonly'); const done=transactionToPromise(tx); const row=await requestToPromise(tx.objectStore('artifacts').get(id)); await done; return row ? clone(row) : null; },
      async listArtifacts(projectId) { return sortArtifacts((await getAllByIndex('artifacts','projectId',projectId)).map(clone)); },
      async listArtifactsForShot(projectId,sequenceId,shotId) { return sortArtifacts((await getAllByIndex('artifacts','shotId',shotId)).filter((row)=>row.projectId===projectId&&row.sequenceId===sequenceId).map(clone)); },
      async getChildren(parentArtifactId) { return sortArtifacts((await getAllByIndex('artifacts','parentArtifactId',parentArtifactId)).map(clone)); },
      async deleteArtifacts(ids) { const db=await open(); const tx=db.transaction('artifacts','readwrite'); const done=transactionToPromise(tx); const store=tx.objectStore('artifacts'); for (const id of ids) store.delete(id); await done; },

      async putComparison(row) { const db=await open(); const tx=db.transaction('comparisons','readwrite'); const done=transactionToPromise(tx); tx.objectStore('comparisons').put(clone(row)); await done; return row; },
      async listComparisons(projectId) { return (await getAllByIndex('comparisons','projectId',projectId)).map(clone); },
      async listComparisonsForShot(projectId,sequenceId,shotId) { return (await getAllByIndex('comparisons','shotId',shotId)).filter((row)=>row.projectId===projectId&&row.sequenceId===sequenceId).map(clone); },

      async clearProject(projectId) {
        const db=await open(); const tx=db.transaction(['projects','sequences','shots','artifacts','comparisons'],'readwrite'); const done=transactionToPromise(tx);
        tx.objectStore('projects').delete(projectId);
        await Promise.all(['sequences','shots','artifacts','comparisons'].map((name)=>deleteByProject(tx,name,projectId)));
        await done;
      },

      async loadProjectBundle(projectId) {
        const db=await open(); const tx=db.transaction(['projects','sequences','shots','artifacts','comparisons'],'readonly'); const done=transactionToPromise(tx);
        const [project,sequences,shots,artifacts,comparisons]=await Promise.all([
          requestToPromise(tx.objectStore('projects').get(projectId)),
          requestToPromise(tx.objectStore('sequences').index('projectId').getAll(projectId)),
          requestToPromise(tx.objectStore('shots').index('projectId').getAll(projectId)),
          requestToPromise(tx.objectStore('artifacts').index('projectId').getAll(projectId)),
          requestToPromise(tx.objectStore('comparisons').index('projectId').getAll(projectId))
        ]);
        await done;
        return { project:project?clone(project):null, sequences:sortOrdered((sequences||[]).map(clone)), shots:sortOrdered((shots||[]).map(clone)), artifacts:sortArtifacts((artifacts||[]).map(clone)), comparisons:(comparisons||[]).map(clone) };
      },

      async commitProjectBundle(input={}) {
        const bundle=assertProjectBundle(input); const db=await open();
        const tx=db.transaction(['projects','sequences','shots','artifacts','comparisons'],'readwrite'); const done=transactionToPromise(tx);
        const stores={ projects:tx.objectStore('projects'), sequences:tx.objectStore('sequences'), shots:tx.objectStore('shots'), artifacts:tx.objectStore('artifacts'), comparisons:tx.objectStore('comparisons') };
        try {
          if (bundle.mode==='replace') {
            const target=bundle.replaceProjectId||bundle.project.id;
            stores.projects.delete(target);
            await Promise.all(['sequences','shots','artifacts','comparisons'].map((name)=>deleteByProject(tx,name,target)));
          }
          const writeProject=bundle.mode==='copy'?stores.projects.add.bind(stores.projects):stores.projects.put.bind(stores.projects);
          writeProject(clone(bundle.project));
          for (const row of bundle.sequences) stores.sequences.add(clone(row));
          for (const row of bundle.shots) stores.shots.add(clone(row));
          for (const row of bundle.artifacts) stores.artifacts.add(clone(row));
          for (const row of bundle.comparisons) stores.comparisons.add(clone(row));
          await done;
        } catch (error) {
          try { tx.abort(); } catch (_) {}
          try { await done; } catch (_) {}
          throw error;
        }
        return { project:clone(bundle.project), sequenceCount:bundle.sequences.length, shotCount:bundle.shots.length, artifactCount:bundle.artifacts.length, comparisonCount:bundle.comparisons.length };
      }
    };
  }

  function createDirectorMemory({ store, storageManager, fetchImpl } = {}) {
    if (!store) throw new Error('Director memory requires a persistence store');
    const storage=storageManager||root?.navigator?.storage||null;
    const fetchFn=fetchImpl||root?.fetch;

    async function ensureProject(input={}) {
      const now=input.updatedAt||new Date().toISOString();
      const id=input.id||`project-${Date.now().toString(36)}`;
      const project={
        id,
        createdAt:input.createdAt||now,
        updatedAt:now,
        title:input.title||'Untitled Director Project',
        ...(input.activeSequenceId!==undefined?{activeSequenceId:input.activeSequenceId}:{}),
        ...(input.activeShotId!==undefined?{activeShotId:input.activeShotId}:{}),
        ...(input.provenance?{provenance:clone(input.provenance)}:{}),
        ...(input.importAudit?{importAudit:clone(input.importAudit)}:{})
      };
      await store.putProject(project); return project;
    }

    async function saveArtifact(record){ await store.putArtifact(record); return record; }
    async function saveGenerationArtifact({artifact,lineage}={}) {
      if (!artifact||!lineage) throw new Error('Artifact and lineage are required for persistence');
      for (const key of ['projectId','sequenceId','shotId','rootArtifactId']) requiredId(lineage[key],key);
      let imageBlob=null; let imageStatus='persisted';
      try { imageBlob=await resolveImageBlob(artifact.result,fetchFn); if (!imageBlob) imageStatus='meta_only'; }
      catch(error){ if(error?.code!=='IMAGE_FETCH_FAILED') throw error; imageStatus='meta_only'; }
      const base={ artifact, projectId:lineage.projectId, sequenceId:lineage.sequenceId, shotId:lineage.shotId, rootArtifactId:lineage.rootArtifactId, parentArtifactId:lineage.parentArtifactId??null, generationIndex:lineage.generationIndex };
      const record=shapeArtifactRecord({...base,imageBlob,persistenceStatus:imageStatus});
      try { await store.putArtifact(record); return record; }
      catch(error){ return {...shapeArtifactRecord({...base,imageBlob:null,persistenceStatus:'not_persisted'}),persistenceError:String(error?.message||error)}; }
    }

    async function getArtifact(id){ return store.getArtifact(id); }
    async function listArtifacts(projectId){ return store.listArtifacts(projectId); }
    async function listArtifactsForShot(projectId,sequenceId,shotId){ return typeof store.listArtifactsForShot==='function' ? store.listArtifactsForShot(projectId,sequenceId,shotId) : (await listArtifacts(projectId)).filter((r)=>r.sequenceId===sequenceId&&r.shotId===shotId); }
    async function getChildren(parentArtifactId){ return store.getChildren(parentArtifactId); }
    async function getLatestProject(){ return store.getLatestProject(); }
    async function getProject(id){ if(typeof store.getProject!=='function') throw new Error('Persistence store cannot read projects by id'); return store.getProject(id); }
    async function listProjects(){ if(typeof store.listProjects!=='function') throw new Error('Persistence store cannot list projects'); return store.listProjects(); }
    async function putSequence(row){ if(typeof store.putSequence!=='function') throw new Error('Persistence store cannot write sequences'); return store.putSequence(row); }
    async function getSequence(id){ return typeof store.getSequence==='function'?store.getSequence(id):null; }
    async function listSequences(projectId){ return typeof store.listSequences==='function'?store.listSequences(projectId):[]; }
    async function deleteSequence(id){ if(typeof store.deleteSequence!=='function') throw new Error('Persistence store cannot delete sequences'); return store.deleteSequence(id); }
    async function putShot(row){ if(typeof store.putShot!=='function') throw new Error('Persistence store cannot write shots'); return store.putShot(row); }
    async function getShot(id){ return typeof store.getShot==='function'?store.getShot(id):null; }
    async function listShots(sequenceId){ return typeof store.listShots==='function'?store.listShots(sequenceId):[]; }
    async function deleteShot(id){ if(typeof store.deleteShot!=='function') throw new Error('Persistence store cannot delete shots'); return store.deleteShot(id); }
    async function saveComparison(record){ if(typeof store.putComparison!=='function') return record; await store.putComparison(record); return record; }
    async function listComparisons(projectId){ return typeof store.listComparisons==='function'?store.listComparisons(projectId):[]; }
    async function listComparisonsForShot(projectId,sequenceId,shotId){ return typeof store.listComparisonsForShot==='function' ? store.listComparisonsForShot(projectId,sequenceId,shotId) : (await listComparisons(projectId)).filter((r)=>r.sequenceId===sequenceId&&r.shotId===shotId); }
    async function loadProjectBundle(projectId){
      if(typeof store.loadProjectBundle==='function') {
        const bundle=await store.loadProjectBundle(projectId);
        return { project:bundle?.project||null, sequences:bundle?.sequences||[], shots:bundle?.shots||[], artifacts:bundle?.artifacts||[], comparisons:bundle?.comparisons||[] };
      }
      return { project:await getProject(projectId), sequences:await listSequences(projectId), shots:[], artifacts:await listArtifacts(projectId), comparisons:await listComparisons(projectId) };
    }
    async function commitProjectBundle(bundle){ if(typeof store.commitProjectBundle!=='function') throw new Error('Persistence store cannot commit project bundles atomically'); return store.commitProjectBundle(bundle); }
    async function estimateStorage(){ if(!storage||typeof storage.estimate!=='function') return null; const estimate=await storage.estimate(); return {usage:estimate?.usage??null,quota:estimate?.quota??null}; }
    async function collectSubtreeIds(id,ids=new Set()){ if(ids.has(id)) return ids; ids.add(id); for(const child of await store.getChildren(id)||[]) await collectSubtreeIds(child.id,ids); return ids; }
    async function deleteSubtree(id){ const ids=[...await collectSubtreeIds(id)]; if(typeof store.deleteArtifacts!=='function') throw new Error('Persistence store cannot delete artifact subtrees'); await store.deleteArtifacts(ids); return ids; }
    async function clearProject(projectId){ if(typeof store.clearProject!=='function') throw new Error('Persistence store cannot clear projects'); await store.clearProject(projectId); }

    return {
      ensureProject,saveArtifact,saveGenerationArtifact,getArtifact,listArtifacts,listArtifactsForShot,getChildren,getLatestProject,getProject,listProjects,
      putSequence,getSequence,listSequences,deleteSequence,putShot,getShot,listShots,deleteShot,
      loadProjectBundle,commitProjectBundle,saveComparison,listComparisons,listComparisonsForShot,estimateStorage,deleteSubtree,clearProject
    };
  }

  return {
    DIRECTOR_MEMORY_DB_NAME:DB_NAME,
    DIRECTOR_MEMORY_DB_VERSION:DB_VERSION,
    DIRECTOR_MEMORY_PERSISTENCE_STATUSES:PERSISTENCE_STATUSES,
    dataUrlToBlob,
    shapeArtifactRecord,
    createDirectorMemory,
    createIndexedDbStore
  };
});
