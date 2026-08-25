(function attachDirectorMemory(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function directorMemoryFactory(root) {
  'use strict';

  const DB_NAME = 'visual-direction-os-m4';
  const DB_VERSION = 1;
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

  function shapeArtifactRecord({
    artifact,
    projectId,
    rootArtifactId,
    parentArtifactId = null,
    generationIndex,
    imageBlob = null,
    persistenceStatus = 'persisted'
  } = {}) {
    if (!artifact?.id) throw new Error('Artifact id is required for persistence');
    if (!projectId) throw new Error('projectId is required for persistence');
    if (!rootArtifactId) throw new Error('rootArtifactId is required for persistence');
    if (!Number.isInteger(generationIndex) || generationIndex < 1) throw new Error('generationIndex must be a positive integer');
    assertPersistenceStatus(persistenceStatus);

    const result = artifact.result ? clone(artifact.result) : null;
    if (result && Object.prototype.hasOwnProperty.call(result, 'src')) delete result.src;

    return {
      id: artifact.id,
      projectId,
      rootArtifactId,
      parentArtifactId: parentArtifactId ?? null,
      generationIndex,
      createdAt: artifact.createdAt || new Date().toISOString(),
      provider: String(artifact.provider || artifact.request?.model || 'unknown'),
      request: clone(artifact.request || null),
      baseRequest: clone(artifact.baseRequest || artifact.request || null),
      result,
      visualIR: clone(artifact.visualIR || null),
      measurements: clone(artifact.measurements || null),
      evaluation: clone(artifact.evaluation || null),
      humanJudgments: clone(artifact.humanJudgments || {}),
      iterationDelta: clone(artifact.iterationDelta || null),
      evaluationDelta: clone(artifact.evaluationDelta || null),
      comparison: clone(artifact.comparison || null),
      imageBlob,
      imageMimeType: imageBlob?.type || null,
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
    try {
      response = await fetchImpl(src);
    } catch (error) {
      throw imageFetchError(error?.message || 'Generated image URL could not be fetched', error);
    }
    if (!response?.ok) throw imageFetchError(`Generated image URL returned HTTP ${response?.status || 'error'}`);
    try {
      return await response.blob();
    } catch (error) {
      throw imageFetchError('Generated image response could not be converted to a Blob', error);
    }
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

  function createIndexedDbStore(runtimeRoot = root) {
    const indexedDB = runtimeRoot?.indexedDB;
    if (!indexedDB) throw new Error('IndexedDB is unavailable in this browser');
    let dbPromise = null;

    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          const projectStore = db.objectStoreNames.contains('projects')
            ? request.transaction.objectStore('projects')
            : db.createObjectStore('projects', { keyPath:'id' });
          ensureIndex(projectStore, 'updatedAt', 'updatedAt');

          const artifactStore = db.objectStoreNames.contains('artifacts')
            ? request.transaction.objectStore('artifacts')
            : db.createObjectStore('artifacts', { keyPath:'id' });
          ensureIndex(artifactStore, 'projectId', 'projectId');
          ensureIndex(artifactStore, 'parentArtifactId', 'parentArtifactId');
          ensureIndex(artifactStore, 'rootArtifactId', 'rootArtifactId');
          ensureIndex(artifactStore, 'generationIndex', 'generationIndex');

          const comparisonStore = db.objectStoreNames.contains('comparisons')
            ? request.transaction.objectStore('comparisons')
            : db.createObjectStore('comparisons', { keyPath:'id' });
          ensureIndex(comparisonStore, 'projectId', 'projectId');
          ensureIndex(comparisonStore, 'artifactAId', 'artifactAId');
          ensureIndex(comparisonStore, 'artifactBId', 'artifactBId');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Unable to open M4 IndexedDB'));
        request.onblocked = () => reject(new Error('M4 IndexedDB upgrade is blocked by another page'));
      });
      return dbPromise;
    }

    async function getAllByIndex(storeName, indexName, value) {
      const db = await open();
      const tx = db.transaction(storeName, 'readonly');
      const rows = await requestToPromise(tx.objectStore(storeName).index(indexName).getAll(value));
      await transactionToPromise(tx);
      return rows || [];
    }

    return {
      async putProject(project) {
        const db = await open();
        const tx = db.transaction('projects', 'readwrite');
        tx.objectStore('projects').put(clone(project));
        await transactionToPromise(tx);
        return project;
      },
      async getLatestProject() {
        const db = await open();
        const tx = db.transaction('projects', 'readonly');
        const index = tx.objectStore('projects').index('updatedAt');
        const result = await new Promise((resolve, reject) => {
          const request = index.openCursor(null, 'prev');
          request.onsuccess = () => resolve(request.result?.value || null);
          request.onerror = () => reject(request.error || new Error('Unable to read latest M4 project'));
        });
        await transactionToPromise(tx);
        return result;
      },
      async putArtifact(row) {
        const db = await open();
        const tx = db.transaction('artifacts', 'readwrite');
        tx.objectStore('artifacts').put(row);
        await transactionToPromise(tx);
        return row;
      },
      async getArtifact(id) {
        const db = await open();
        const tx = db.transaction('artifacts', 'readonly');
        const result = await requestToPromise(tx.objectStore('artifacts').get(id));
        await transactionToPromise(tx);
        return result || null;
      },
      async listArtifacts(projectId) {
        const rows = await getAllByIndex('artifacts', 'projectId', projectId);
        return rows.sort((a, b) => (a.generationIndex || 0) - (b.generationIndex || 0));
      },
      async getChildren(parentArtifactId) {
        const rows = await getAllByIndex('artifacts', 'parentArtifactId', parentArtifactId);
        return rows.sort((a, b) => (a.generationIndex || 0) - (b.generationIndex || 0));
      },
      async deleteArtifacts(ids) {
        const db = await open();
        const tx = db.transaction('artifacts', 'readwrite');
        const store = tx.objectStore('artifacts');
        for (const id of ids) store.delete(id);
        await transactionToPromise(tx);
      },
      async clearProject(projectId) {
        const db = await open();
        const tx = db.transaction(['projects','artifacts','comparisons'], 'readwrite');
        tx.objectStore('projects').delete(projectId);
        const deleteByProject = (storeName) => new Promise((resolve, reject) => {
          const index = tx.objectStore(storeName).index('projectId');
          const request = index.openCursor(projectId);
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return resolve();
            cursor.delete();
            cursor.continue();
          };
          request.onerror = () => reject(request.error || new Error(`Unable to clear ${storeName}`));
        });
        await Promise.all([deleteByProject('artifacts'), deleteByProject('comparisons')]);
        await transactionToPromise(tx);
      },
      async putComparison(row) {
        const db = await open();
        const tx = db.transaction('comparisons', 'readwrite');
        tx.objectStore('comparisons').put(clone(row));
        await transactionToPromise(tx);
        return row;
      },
      async listComparisons(projectId) {
        return getAllByIndex('comparisons', 'projectId', projectId);
      }
    };
  }

  function createDirectorMemory({ store, storageManager, fetchImpl } = {}) {
    if (!store) throw new Error('Director memory requires a persistence store');
    const storage = storageManager || root?.navigator?.storage || null;
    const fetchFn = fetchImpl || root?.fetch;

    async function ensureProject(input = {}) {
      const now = input.updatedAt || new Date().toISOString();
      const id = input.id || `project-${Date.now().toString(36)}`;
      const project = {
        id,
        createdAt: input.createdAt || now,
        updatedAt: now,
        title: input.title || 'Untitled Director Project'
      };
      await store.putProject(project);
      return project;
    }

    async function saveArtifact(record) {
      await store.putArtifact(record);
      return record;
    }

    async function saveGenerationArtifact({ artifact, lineage } = {}) {
      if (!artifact || !lineage) throw new Error('Artifact and lineage are required for persistence');
      let imageBlob = null;
      let imageStatus = 'persisted';
      try {
        imageBlob = await resolveImageBlob(artifact.result, fetchFn);
        if (!imageBlob) imageStatus = 'meta_only';
      } catch (error) {
        if (error?.code !== 'IMAGE_FETCH_FAILED') throw error;
        imageStatus = 'meta_only';
      }

      const record = shapeArtifactRecord({
        artifact,
        projectId:lineage.projectId,
        rootArtifactId:lineage.rootArtifactId,
        parentArtifactId:lineage.parentArtifactId ?? null,
        generationIndex:lineage.generationIndex,
        imageBlob,
        persistenceStatus:imageStatus
      });

      try {
        await store.putArtifact(record);
        return record;
      } catch (error) {
        return {
          ...shapeArtifactRecord({
            artifact,
            projectId:lineage.projectId,
            rootArtifactId:lineage.rootArtifactId,
            parentArtifactId:lineage.parentArtifactId ?? null,
            generationIndex:lineage.generationIndex,
            imageBlob:null,
            persistenceStatus:'not_persisted'
          }),
          persistenceError:String(error?.message || error)
        };
      }
    }

    async function getArtifact(id) { return store.getArtifact(id); }
    async function listArtifacts(projectId) { return store.listArtifacts(projectId); }
    async function getChildren(parentArtifactId) { return store.getChildren(parentArtifactId); }
    async function getLatestProject() { return store.getLatestProject(); }
    async function saveComparison(record) {
      if (typeof store.putComparison !== 'function') return record;
      await store.putComparison(record);
      return record;
    }
    async function listComparisons(projectId) {
      if (typeof store.listComparisons !== 'function') return [];
      return store.listComparisons(projectId);
    }

    async function estimateStorage() {
      if (!storage || typeof storage.estimate !== 'function') return null;
      const estimate = await storage.estimate();
      return { usage:estimate?.usage ?? null, quota:estimate?.quota ?? null };
    }

    async function collectSubtreeIds(id, ids = new Set()) {
      if (ids.has(id)) return ids;
      ids.add(id);
      const children = await store.getChildren(id);
      for (const child of children || []) await collectSubtreeIds(child.id, ids);
      return ids;
    }

    async function deleteSubtree(id) {
      const ids = [...await collectSubtreeIds(id)];
      if (typeof store.deleteArtifacts !== 'function') throw new Error('Persistence store cannot delete artifact subtrees');
      await store.deleteArtifacts(ids);
      return ids;
    }

    async function clearProject(projectId) {
      if (typeof store.clearProject !== 'function') throw new Error('Persistence store cannot clear projects');
      await store.clearProject(projectId);
    }

    return {
      ensureProject,
      saveArtifact,
      saveGenerationArtifact,
      getArtifact,
      listArtifacts,
      getChildren,
      getLatestProject,
      saveComparison,
      listComparisons,
      estimateStorage,
      deleteSubtree,
      clearProject
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
