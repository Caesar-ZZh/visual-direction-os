((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./project-contracts.js')
    : root?.VDOSProjectContracts;
  const api = factory(contracts, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectPersistence = api;
})(typeof window !== 'undefined' ? window : globalThis, (contracts, root) => {
  'use strict';

  if (!contracts?.validateProjectState) throw new Error('VDOSProjectContracts is required before project-persistence.js');

  const DEFAULT_KEY = 'vdos-project-v2.1';
  const STORAGE_VERSION = 1;

  function defaultStorage() {
    try {
      return root?.localStorage || null;
    } catch (_error) {
      return null;
    }
  }

  function createProjectPersistence(options = {}) {
    const storage = options.storage === undefined ? defaultStorage() : options.storage;
    const key = String(options.key || DEFAULT_KEY);
    const validateProjectState = options.validateProjectState || contracts.validateProjectState;

    if (typeof validateProjectState !== 'function') throw new Error('Project persistence requires validateProjectState.');

    function load() {
      if (!storage?.getItem) return null;
      let raw = null;
      try {
        raw = storage.getItem(key);
      } catch (_error) {
        return null;
      }
      if (!raw) return null;

      let envelope = null;
      try {
        envelope = JSON.parse(raw);
      } catch (_error) {
        return null;
      }

      const project = envelope?.version === STORAGE_VERSION && envelope?.project
        ? envelope.project
        : envelope;
      const checked = validateProjectState(project);
      return checked.valid ? checked.value : null;
    }

    function save(project) {
      const checked = validateProjectState(project);
      if (!checked.valid) throw new Error(`Invalid Project State: ${checked.errors.join('; ')}`);
      if (!storage?.setItem) return checked.value;
      storage.setItem(key, JSON.stringify({ version:STORAGE_VERSION, project:checked.value }));
      return checked.value;
    }

    function clear() {
      if (!storage?.removeItem) return;
      storage.removeItem(key);
    }

    function bind(projectStore) {
      if (!projectStore || typeof projectStore.subscribe !== 'function') {
        throw new Error('Project persistence requires a Project Store subscription interface.');
      }
      return projectStore.subscribe(project => {
        if (project) save(project);
      });
    }

    return { key, load, save, clear, bind };
  }

  return { DEFAULT_KEY, STORAGE_VERSION, createProjectPersistence };
});
