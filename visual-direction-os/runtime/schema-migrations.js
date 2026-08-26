(function attachSchemaMigrations(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function schemaMigrationsFactory(root) {
  'use strict';

  function clone(value) {
    if (value == null) return value;
    if (typeof root?.structuredClone === 'function') return root.structuredClone(value);
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeVersion(value, label = 'schemaVersion') {
    const version = Number(value);
    if (!Number.isInteger(version) || version < 1) {
      throw new Error(`${label} must be a positive integer`);
    }
    return version;
  }

  function createSchemaMigrator({ currentVersion = 1, migrations = {} } = {}) {
    const targetVersion = normalizeVersion(currentVersion, 'currentVersion');
    const registry = { ...(migrations || {}) };

    function assertSupported(versionInput) {
      const version = normalizeVersion(versionInput);
      if (version > targetVersion) {
        throw new Error(`VDOS schema v${version} is newer than this runtime v${targetVersion}; update Visual Direction OS before importing this package`);
      }
      return version;
    }

    function migrate(model) {
      if (!model || typeof model !== 'object') throw new Error('A schema model object is required');
      let version = assertSupported(model.schemaVersion);
      let current = clone(model);
      const steps = [];

      while (version < targetVersion) {
        const nextVersion = version + 1;
        const migration = registry[version];
        if (typeof migration !== 'function') {
          throw new Error(`Missing schema migration ${version}→${nextVersion}`);
        }
        const input = clone(current);
        const migrated = migration(input);
        if (!migrated || typeof migrated !== 'object') {
          throw new Error(`Schema migration ${version}→${nextVersion} must return an object`);
        }
        const declared = normalizeVersion(migrated.schemaVersion);
        if (declared !== nextVersion) {
          throw new Error(`Schema migration ${version}→${nextVersion} returned schemaVersion ${declared}`);
        }
        current = clone(migrated);
        steps.push(`${version}→${nextVersion}`);
        version = nextVersion;
      }

      return { model:current, steps };
    }

    return {
      currentVersion:targetVersion,
      assertSupported,
      migrate
    };
  }

  return { createSchemaMigrator };
});
