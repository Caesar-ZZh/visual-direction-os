(function attachSequenceModel(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function sequenceModelFactory(root) {
  'use strict';

  function clone(value) {
    if (value == null) return value;
    if (typeof root?.structuredClone === 'function') return root.structuredClone(value);
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function requireId(value, label) {
    const id = String(value || '').trim();
    if (!id) throw new Error(`${label} is required`);
    return id;
  }

  function safeIdentity(value, label = 'projectId') {
    return encodeURIComponent(requireId(value, label));
  }

  function legacySequenceIdForProject(projectId) {
    return `sequence-legacy-${safeIdentity(projectId, 'projectId')}`;
  }

  function legacyShotIdForProject(projectId) {
    return `shot-legacy-${safeIdentity(projectId, 'projectId')}`;
  }

  function normalizeOrder(value, fallback = 1) {
    const order = Number(value);
    return Number.isFinite(order) && order > 0 ? order : fallback;
  }

  function shapeSequence(input = {}) {
    const id = requireId(input.id, 'Sequence id');
    const projectId = requireId(input.projectId, 'Sequence projectId');
    return {
      id,
      projectId,
      order:normalizeOrder(input.order),
      title:String(input.title || 'Sequence 01'),
      intent:String(input.intent || ''),
      createdAt:String(input.createdAt || ''),
      updatedAt:String(input.updatedAt || input.createdAt || '')
    };
  }

  function shapeShot(input = {}) {
    const id = requireId(input.id, 'Shot id');
    const projectId = requireId(input.projectId, 'Shot projectId');
    const sequenceId = requireId(input.sequenceId, 'Shot sequenceId');
    const continuityMode = input.continuityMode === 'manual' ? 'manual' : 'auto';
    return {
      id,
      projectId,
      sequenceId,
      order:normalizeOrder(input.order),
      title:String(input.title || 'Shot 01'),
      intent:String(input.intent || ''),
      approvedArtifactId:input.approvedArtifactId ? String(input.approvedArtifactId) : null,
      continuityMode,
      continuitySourceShotId:continuityMode === 'manual' && input.continuitySourceShotId
        ? String(input.continuitySourceShotId)
        : null,
      continuityReview:input.continuityReview ? clone(input.continuityReview) : null,
      continuityInvalidation:input.continuityInvalidation ? clone(input.continuityInvalidation) : null,
      createdAt:String(input.createdAt || ''),
      updatedAt:String(input.updatedAt || input.createdAt || '')
    };
  }

  function compareByOrderThenId(a, b) {
    const byOrder = normalizeOrder(a?.order, Number.MAX_SAFE_INTEGER) - normalizeOrder(b?.order, Number.MAX_SAFE_INTEGER);
    return byOrder || String(a?.id || '').localeCompare(String(b?.id || ''));
  }

  function sortSequences(rows = []) {
    return [...rows].sort(compareByOrderThenId);
  }

  function sortShots(rows = []) {
    return [...rows].sort(compareByOrderThenId);
  }

  function migrateLegacyBundleToM6({ project, artifacts = [], comparisons = [] } = {}) {
    if (!project?.id) throw new Error('Legacy migration requires project.id');
    if (!Array.isArray(artifacts) || !Array.isArray(comparisons)) {
      throw new Error('Legacy migration requires artifact and comparison arrays');
    }

    const projectId = String(project.id);
    const sequenceId = legacySequenceIdForProject(projectId);
    const shotId = legacyShotIdForProject(projectId);
    const createdAt = String(project.createdAt || project.updatedAt || '');
    const updatedAt = String(project.updatedAt || project.createdAt || '');

    const sequence = shapeSequence({
      id:sequenceId,
      projectId,
      order:1,
      title:'Sequence 01',
      intent:'',
      createdAt,
      updatedAt
    });
    const shot = shapeShot({
      id:shotId,
      projectId,
      sequenceId,
      order:1,
      title:'Shot 01',
      intent:'',
      approvedArtifactId:null,
      continuityMode:'auto',
      continuitySourceShotId:null,
      createdAt,
      updatedAt
    });

    const migratedProject = {
      ...clone(project),
      activeSequenceId:sequenceId,
      activeShotId:shotId
    };
    const migratedArtifacts = artifacts.map((artifact) => ({
      ...clone(artifact),
      projectId,
      sequenceId,
      shotId
    }));
    const migratedComparisons = comparisons.map((comparison) => ({
      ...clone(comparison),
      projectId,
      sequenceId,
      shotId
    }));

    return {
      project:migratedProject,
      sequences:[sequence],
      shots:[shot],
      artifacts:migratedArtifacts,
      comparisons:migratedComparisons
    };
  }

  return {
    legacySequenceIdForProject,
    legacyShotIdForProject,
    shapeSequence,
    shapeShot,
    sortSequences,
    sortShots,
    migrateLegacyBundleToM6
  };
});
