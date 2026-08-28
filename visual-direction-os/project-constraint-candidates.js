((root, factory) => {
  const registry = typeof module === 'object' && module.exports
    ? require('./project-constraint-registry.js')
    : root?.VDOSProjectConstraintRegistry;
  const api = factory(registry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectConstraintCandidates = api;
})(typeof window !== 'undefined' ? window : globalThis, registry => {
  'use strict';

  if (!registry?.fingerprintSnapshot) throw new Error('VDOSProjectConstraintRegistry is required before project-constraint-candidates.js');

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const FAMILY_PATHS = [
    ['camera', 'camera.perspective'],
    ['color', 'color.territory']
  ];

  function readPath(container, path) {
    if (!container || !path) return undefined;
    if (path === 'agency') return container.agency;
    const parts = String(path).split('.').filter(Boolean);
    if (!parts.length) return undefined;
    if (parts[0] === 'ownership') return parts.slice(1).reduce((value, key) => value?.[key], container.ownership);
    return parts.reduce((value, key, index) => index === 0 ? container.variables?.[key] : value?.[key], undefined);
  }

  function appliedProposalValue(scene, appliedBeatId, path) {
    const beats = scene?.workspace?.narrativeState?.sequenceProposal?.beats || [];
    const beat = beats.find(item => item?.id === appliedBeatId);
    return readPath(beat?.sceneStatePatch, path);
  }

  function sceneIntelById(projectIntelligence, sceneId) {
    return (projectIntelligence?.scenes || []).find(scene => scene?.sceneId === sceneId) || null;
  }

  function sourceBoundaryFor(projectIntelligence, sourceSceneId) {
    return (projectIntelligence?.boundaries || []).find(boundary => boundary?.toSceneId === sourceSceneId) || null;
  }

  function buildConstraintEvidenceSnapshot({ projectState, projectIntelligence, sourceSceneId, targetSceneId, family, path, type = 'ownership-carry', beatIds = ['setup'] } = {}) {
    const project = projectState || {};
    const sourceScene = project.scenes?.[sourceSceneId] || null;
    const targetScene = project.scenes?.[targetSceneId] || null;
    const sourceIntel = sceneIntelById(projectIntelligence, sourceSceneId);
    const targetIntel = sceneIntelById(projectIntelligence, targetSceneId);
    const sourceBoundary = sourceBoundaryFor(projectIntelligence, sourceSceneId);
    const sourceNarrative = sourceScene?.workspace?.narrativeState || {};
    const sourceFinal = readPath(sourceScene?.workspace?.sceneState, path);
    const sourceProposal = appliedProposalValue(sourceScene, sourceIntel?.appliedBeatId, path);
    const sourceIndex = Array.isArray(project.sceneOrder) ? project.sceneOrder.indexOf(sourceSceneId) : -1;
    const targetIndex = Array.isArray(project.sceneOrder) ? project.sceneOrder.indexOf(targetSceneId) : -1;

    return {
      authorityContractVersion: registry.AUTHORITY_CONTRACT_VERSION,
      type,
      sourceBoundaryId: sourceBoundary?.id || null,
      source: {
        sceneId: sourceSceneId || null,
        order: sourceIndex,
        narrativeRole: sourceScene?.narrativeRole?.role || null,
        agencyTransition: clone(sourceScene?.narrativeRole?.agencyTransition || null),
        appliedBeatId: sourceIntel?.appliedBeatId || null,
        readingId: sourceNarrative?.confirmedReading?.id || sourceNarrative?.selectedReading?.id || null,
        strategyId: sourceNarrative?.selectedStrategy?.id || null,
        grammarId: sourceIntel?.grammarId || null,
        family,
        path,
        compilerProducedValue: clone(sourceProposal),
        finalValue: clone(sourceFinal),
        provenanceSource: sourceIntel?.sources?.[family] || 'unknown',
        provenanceStatus: sourceIntel?.provenanceStatus || 'missing',
        integrityFindings: clone((sourceIntel?.integrityFindings || []).map(item => ({
          rule: item?.rule || null,
          status: item?.status || null,
          path: item?.path || null
        })))
      },
      target: {
        sceneId: targetSceneId || null,
        order: targetIndex,
        immediatePreviousSceneId: sourceSceneId || null,
        narrativeRole: targetScene?.narrativeRole?.role || null,
        agencyTransition: clone(targetScene?.narrativeRole?.agencyTransition || null),
        relationToPrevious: targetScene?.narrativeRole?.relationToPrevious || null,
        family,
        path,
        beatIds: clone(beatIds)
      },
      handoff: {
        sourceEndingAgency: sourceIntel?.narrativeAgency?.end || null,
        targetStartingAgency: targetIntel?.narrativeAgency?.start || null
      }
    };
  }

  function deriveProjectConstraintCandidates({ projectState, projectIntelligence, registry: registryState } = {}) {
    const project = clone(projectState) || {};
    const intelligence = clone(projectIntelligence) || {};
    const decisions = clone(registryState) || registry.createEmptyRegistry();
    const sceneOrder = Array.isArray(project.sceneOrder) ? project.sceneOrder : [];
    const results = [];

    for (let sourceIndex = 1; sourceIndex < sceneOrder.length - 1; sourceIndex += 1) {
      const sourceSceneId = sceneOrder[sourceIndex];
      const targetSceneId = sceneOrder[sourceIndex + 1];
      const sourceScene = project.scenes?.[sourceSceneId];
      const targetScene = project.scenes?.[targetSceneId];
      const sourceIntel = sceneIntelById(intelligence, sourceSceneId);
      const targetIntel = sceneIntelById(intelligence, targetSceneId);
      const sourceBoundary = sourceBoundaryFor(intelligence, sourceSceneId);

      if (!sourceScene || !targetScene || !sourceIntel || !targetIntel || !sourceBoundary) continue;
      if (sourceBoundary.status !== 'PASS') continue;
      if (sourceIntel.provenanceStatus !== 'compiler-first') continue;
      if ((sourceIntel.integrityFindings || []).length) continue;
      if (targetScene.status?.visual === 'directed') continue;
      if (!sourceIntel.narrativeAgency?.end || !targetIntel.narrativeAgency?.start || sourceIntel.narrativeAgency.end !== targetIntel.narrativeAgency.start) continue;

      for (const [family, path] of FAMILY_PATHS) {
        if (sourceIntel.sources?.[family] !== 'compiler-backed') continue;
        const materialResponse = (sourceBoundary.visualResponse || []).find(item =>
          item?.family === family && item.changed === true && item.source === 'compiler-backed'
        );
        if (!materialResponse) continue;

        const expected = readPath(sourceScene.workspace?.sceneState, path);
        if (expected == null || (typeof expected === 'string' && !expected.trim())) continue;

        const beatIds = ['setup'];
        const evidenceSnapshot = buildConstraintEvidenceSnapshot({
          projectState: project,
          projectIntelligence: intelligence,
          sourceSceneId,
          targetSceneId,
          family,
          path,
          type: 'ownership-carry',
          beatIds
        });
        const candidateFingerprint = registry.fingerprintSnapshot('pcand', evidenceSnapshot);
        if (decisions.dismissals?.[candidateFingerprint]?.decision === 'rejected') continue;
        const alreadyConfirmed = Object.values(decisions.constraints || {}).some(constraint => {
          if (constraint?.decision !== 'confirmed') return false;
          const revision = constraint.revisions?.[String(constraint.currentRevision)];
          if (!revision?.evidence?.canonicalSnapshot) return false;
          return registry.canonicalJSONString(revision.evidence.canonicalSnapshot) === registry.canonicalJSONString(evidenceSnapshot);
        });
        if (alreadyConfirmed) continue;

        results.push({
          candidateId: `candidate-${sourceSceneId}-${targetSceneId}-${family}-carry`,
          candidateFingerprint,
          eligibility: 'eligible',
          type: 'ownership-carry',
          sourceBoundaryId: sourceBoundary.id,
          sourceSceneId,
          targetSceneId,
          family,
          path,
          expected: clone(expected),
          scope: { sourceSceneId, targetSceneId, beatIds: clone(beatIds) },
          evidence: {
            source: 'compiler-backed',
            sourceAppliedBeatId: sourceIntel.appliedBeatId || null,
            handoff: 'pass',
            previousEndingAgency: sourceIntel.narrativeAgency.end,
            targetStartingAgency: targetIntel.narrativeAgency.start
          },
          evidenceSnapshot
        });
      }
    }

    return results;
  }

  return { buildConstraintEvidenceSnapshot, deriveProjectConstraintCandidates };
});
