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

  function normalizeVersion(value,label='schemaVersion') {
    const version=Number(value);
    if(!Number.isInteger(version)||version<1) throw new Error(`${label} must be a positive integer`);
    return version;
  }

  function stableSegment(value){ return encodeURIComponent(String(value||'').trim()); }
  function legacySequenceId(projectId){ return `sequence-legacy-${stableSegment(projectId)}`; }
  function legacyShotId(projectId){ return `shot-legacy-${stableSegment(projectId)}`; }

  function migrateV1ToV2(model) {
    if(!model?.project?.id) throw new Error('Schema migration 1→2 requires project identity');
    const source=clone(model);
    const projectId=String(source.project.id);
    const sequenceId=legacySequenceId(projectId);
    const shotId=legacyShotId(projectId);
    const timestamp=source.project.updatedAt||source.project.exportedAt||source.project.createdAt||null;
    source.schemaVersion=2;
    source.project={...source.project,schemaVersion:2,activeSequenceId:sequenceId,activeShotId:shotId};
    source.sequences=[{schemaVersion:2,id:sequenceId,projectId,order:1,title:'Sequence 01',intent:'',createdAt:source.project.createdAt||timestamp,updatedAt:timestamp}];
    source.shots=[{schemaVersion:2,id:shotId,projectId,sequenceId,order:1,title:'Shot 01',intent:'',approvedArtifactId:null,continuityMode:'auto',continuitySourceShotId:null,continuityReview:null,continuityInvalidation:null,createdAt:source.project.createdAt||timestamp,updatedAt:timestamp}];
    source.artifacts=(source.artifacts||[]).map((artifact)=>({...artifact,schemaVersion:2,projectId,sequenceId,shotId,continuityProvenance:artifact.continuityProvenance||null}));
    source.comparisons=(source.comparisons||[]).map((row)=>({...row,projectId,sequenceId,shotId}));
    if(source.lineage) source.lineage={...source.lineage,schemaVersion:2,projectId};
    if(source.memory) source.memory={...source.memory,schemaVersion:2,projectId};
    return source;
  }

  const VDOS_SCHEMA_MIGRATIONS=Object.freeze({1:migrateV1ToV2});

  function createSchemaMigrator({currentVersion=1,migrations=VDOS_SCHEMA_MIGRATIONS}={}) {
    const targetVersion=normalizeVersion(currentVersion,'currentVersion');
    const registry={...(migrations||{})};
    function assertSupported(versionInput){ const version=normalizeVersion(versionInput); if(version>targetVersion) throw new Error(`VDOS schema v${version} is newer than this runtime v${targetVersion}; update Visual Direction OS before importing this package`); return version; }
    function migrate(model){
      if(!model||typeof model!=='object') throw new Error('A schema model object is required');
      let version=assertSupported(model.schemaVersion); let current=clone(model); const steps=[];
      while(version<targetVersion){
        const nextVersion=version+1; const migration=registry[version];
        if(typeof migration!=='function') throw new Error(`Missing schema migration ${version}→${nextVersion}`);
        const migrated=migration(clone(current));
        if(!migrated||typeof migrated!=='object') throw new Error(`Schema migration ${version}→${nextVersion} must return an object`);
        const declared=normalizeVersion(migrated.schemaVersion);
        if(declared!==nextVersion) throw new Error(`Schema migration ${version}→${nextVersion} returned schemaVersion ${declared}`);
        current=clone(migrated); steps.push(`${version}→${nextVersion}`); version=nextVersion;
      }
      return {model:current,steps};
    }
    return {currentVersion:targetVersion,assertSupported,migrate};
  }

  return {createSchemaMigrator,migrateV1ToV2,VDOS_SCHEMA_MIGRATIONS,legacySequenceId,legacyShotId};
});