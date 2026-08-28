((root, factory) => {
  const registry = typeof module === 'object' && module.exports
    ? require('./project-constraint-registry.js')
    : root?.VDOSProjectConstraintRegistry;
  const candidates = typeof module === 'object' && module.exports
    ? require('./project-constraint-candidates.js')
    : root?.VDOSProjectConstraintCandidates;
  const compiler = typeof module === 'object' && module.exports
    ? require('./visual-compiler.js')
    : root?.VDOSVisualCompiler;
  const api = factory(registry, candidates, compiler);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectConstraintAuthority = api;
})(typeof window !== 'undefined' ? window : globalThis, (registry, candidates, compiler) => {
  'use strict';

  if (!registry?.validateRegistry || !registry?.canonicalJSONString) throw new Error('VDOSProjectConstraintRegistry is required before project-constraint-authority.js');
  if (!candidates?.buildConstraintEvidenceSnapshot) throw new Error('VDOSProjectConstraintCandidates is required before project-constraint-authority.js');
  if (!compiler?.compileBeatExpectations) throw new Error('VDOSVisualCompiler is required before project-constraint-authority.js');

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function currentRevision(constraint) {
    return constraint?.revisions?.[String(constraint.currentRevision)] || null;
  }

  function releasedFor(revision, targetSceneId, beatId) {
    return (revision?.exceptions || []).some(item =>
      item?.action === 'release'
      && item?.revision === revision.revision
      && item?.sceneId === targetSceneId
      && item?.beatId === beatId
    );
  }

  function evidenceMatches(saved, current) {
    return registry.canonicalJSONString(saved) === registry.canonicalJSONString(current);
  }

  function skeletonBeat(baseSkeleton, beatId) {
    return (baseSkeleton?.beats || []).find(beat => beat?.id === beatId) || null;
  }

  function fixedBeatAgency(beat) {
    if (!beat) return null;
    if (beat.agencySlot?.status === 'fixed') return beat.agencySlot.value || null;
    return beat.agency || null;
  }

  function resolutionBase(constraint, revision, status, reason, sceneExpected = null) {
    const beatId = revision?.scope?.beatIds?.[0] || null;
    return {
      constraintId: constraint.constraintId,
      revision: revision.revision,
      status,
      type: constraint.type,
      family: revision.family,
      path: revision.path,
      beatId,
      expected: clone(revision.expected),
      sceneExpected: clone(sceneExpected),
      reason
    };
  }

  function buildCurrentEvidence({ projectState, projectIntelligence, constraint, revision }) {
    return candidates.buildConstraintEvidenceSnapshot({
      projectState,
      projectIntelligence,
      sourceSceneId: revision.scope.sourceSceneId,
      targetSceneId: revision.scope.targetSceneId,
      family: revision.family,
      path: revision.path,
      type: constraint.type,
      beatIds: revision.scope.beatIds
    });
  }

  function resolveProjectConstraintAuthority({ projectState, projectIntelligence, registry: registryState, targetSceneId, visualIR, baseSkeleton } = {}) {
    const project = clone(projectState) || {};
    const intelligence = clone(projectIntelligence) || {};
    const checked = registry.validateRegistry(registryState || registry.createEmptyRegistry());
    if (!checked.valid) throw new Error(`Invalid Project Constraint Registry: ${checked.errors.join('; ')}`);
    const state = checked.value;
    const resolutions = [];
    const conflicts = [];
    const contextConstraints = [];

    for (const constraint of Object.values(state.constraints || {})) {
      if (constraint?.decision !== 'confirmed') continue;
      const revision = currentRevision(constraint);
      if (!revision || revision.scope?.targetSceneId !== targetSceneId) continue;
      const beatId = revision.scope?.beatIds?.[0] || 'setup';

      if (releasedFor(revision, targetSceneId, beatId)) {
        resolutions.push(resolutionBase(constraint, revision, 'INAPPLICABLE', 'DIRECTOR_RELEASE'));
        continue;
      }

      const currentEvidence = buildCurrentEvidence({ projectState:project, projectIntelligence:intelligence, constraint, revision });
      if (!evidenceMatches(revision.evidence?.canonicalSnapshot, currentEvidence)) {
        resolutions.push(resolutionBase(constraint, revision, 'STALE', 'EVIDENCE_CHANGED'));
        continue;
      }

      if (!baseSkeleton) {
        resolutions.push(resolutionBase(constraint, revision, 'ACTIVE', 'AWAITING_SEQUENCE_SKELETON'));
        continue;
      }

      const beat = skeletonBeat(baseSkeleton, beatId);
      const agency = fixedBeatAgency(beat);
      if (!beat || !agency) {
        const item = resolutionBase(constraint, revision, 'CONFLICT', 'TARGET_BEAT_UNAVAILABLE');
        resolutions.push(item);
        conflicts.push(clone(item));
        continue;
      }

      const expectations = compiler.compileBeatExpectations({
        visualIR,
        beat: { id:beat.id, label:beat.label, agency }
      });
      const assertion = (expectations.assertions || []).find(item => item?.path === revision.path && item?.status === 'supported');
      if (!assertion) {
        const item = resolutionBase(constraint, revision, 'CONFLICT', 'TARGET_GRAMMAR_UNSUPPORTED');
        resolutions.push(item);
        conflicts.push(clone(item));
        continue;
      }

      if (registry.canonicalJSONString(assertion.expected) !== registry.canonicalJSONString(revision.expected)) {
        const item = resolutionBase(constraint, revision, 'CONFLICT', 'SCENE_COMPILER_DISAGREES', assertion.expected);
        resolutions.push(item);
        conflicts.push(clone(item));
        continue;
      }

      const item = resolutionBase(constraint, revision, 'SATISFIED', 'SCENE_COMPILER_CONFIRMS', assertion.expected);
      resolutions.push(item);
      contextConstraints.push({
        constraintId: constraint.constraintId,
        revision: revision.revision,
        type: constraint.type,
        beatId,
        path: revision.path,
        expected: clone(revision.expected),
        resolution: 'satisfied'
      });
    }

    const blocking = resolutions.some(item => item.status === 'CONFLICT' || item.status === 'STALE');
    return {
      mode: 'guarded',
      targetSceneId: targetSceneId || null,
      safeToComplete: !blocking,
      resolutions,
      conflicts,
      projectConstraintContext: {
        targetSceneId: targetSceneId || null,
        constraints: contextConstraints
      }
    };
  }

  return { resolveProjectConstraintAuthority };
});