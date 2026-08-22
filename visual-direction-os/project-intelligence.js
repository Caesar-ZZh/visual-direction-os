((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectIntelligence = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const FAMILY_ORDER = ['agency', 'camera', 'color', 'space', 'line', 'texture', 'rhythm', 'ownership'];
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function normalizeAuthority(value) {
    if (value === 'world') return 'WORLD';
    if (value === 'character') return 'CHARACTER';
    if (['mixed', 'contested', 'shared'].includes(value)) return 'CONTESTED';
    return value ? String(value).toUpperCase() : null;
  }

  function familyForPath(path) {
    if (path === 'agency') return 'agency';
    return String(path || '').split('.')[0] || null;
  }

  function sortFamilies(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => {
      const ai = FAMILY_ORDER.indexOf(a);
      const bi = FAMILY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  function readPath(container, path) {
    if (!container || !path) return undefined;
    if (path === 'agency') return container.agency;
    const parts = String(path).split('.').filter(Boolean);
    if (!parts.length) return undefined;
    if (parts[0] === 'ownership') {
      return parts.slice(1).reduce((value, key) => value?.[key], container.ownership);
    }
    return parts.reduce((value, key, index) => {
      if (index === 0) return container.variables?.[key];
      return value?.[key];
    }, undefined);
  }

  function valuesEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function activeBeat(narrativeState, appliedBeatId) {
    if (!appliedBeatId) return null;
    return narrativeState?.sequenceProposal?.beats?.find(beat => beat?.id === appliedBeatId) || null;
  }

  function activeSkeletonBeat(narrativeState, appliedBeatId) {
    if (!appliedBeatId) return null;
    return narrativeState?.sequenceSkeleton?.beats?.find(beat => beat?.id === appliedBeatId) || null;
  }

  function activeProvenanceFields(narrativeState, appliedBeatId) {
    if (!appliedBeatId) return [];
    const prefix = `${appliedBeatId}.`;
    return Object.entries(narrativeState?.sequenceProvenance?.fields || {})
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, meta]) => ({ path: key.slice(prefix.length), meta: clone(meta) }));
  }

  function normalizeSceneIntelligence(scene = {}, options = {}) {
    const input = clone(scene) || {};
    const narrativeState = input.workspace?.narrativeState || {};
    const sequenceState = input.workspace?.sequenceState || {};
    const sceneState = input.workspace?.sceneState || null;
    const directed = input.status?.visual === 'directed';
    const transition = Array.isArray(input.narrativeRole?.agencyTransition)
      ? input.narrativeRole.agencyTransition
      : [];
    const appliedBeatId = sceneState?.narrativeState || sequenceState?.activeBeatId || null;
    const provenance = narrativeState.sequenceProvenance;
    const compilerFirst = provenance?.origin === 'compiler-first';
    const compilerFirstMarkers = Boolean(
      narrativeState.sequenceSkeleton
      || narrativeState.sequenceCompletion
      || provenance
    );
    const provenanceStatus = compilerFirst
      ? 'compiler-first'
      : (directed && sceneState && !compilerFirstMarkers ? 'legacy' : 'missing');
    const grammarId = provenance?.grammarId
      || narrativeState.sequenceSkeleton?.grammarId
      || narrativeState.selectedStrategy?.grammarId
      || null;

    const proposalBeat = activeBeat(narrativeState, appliedBeatId);
    const skeletonBeat = activeSkeletonBeat(narrativeState, appliedBeatId);
    const provenanceFields = activeProvenanceFields(narrativeState, appliedBeatId);
    const fieldSources = {};
    const integrityFindings = [];
    const compilerFamilies = [];
    const aiFamilies = [];
    const blockedFamilies = [];

    if (provenanceStatus === 'compiler-first') {
      for (const { path, meta } of provenanceFields) {
        const family = familyForPath(path);
        if (meta?.owner === 'compiler') compilerFamilies.push(family);
        if (meta?.owner === 'ai') aiFamilies.push(family);
        const expected = readPath(proposalBeat?.sceneStatePatch, path);
        const current = readPath(sceneState, path);
        const attributed = meta?.owner === 'compiler' ? 'compiler-backed'
          : meta?.owner === 'ai' ? 'ai-completed'
          : 'unknown';
        if (expected !== undefined && valuesEqual(expected, current)) {
          fieldSources[path] = attributed;
        } else {
          fieldSources[path] = 'unknown';
          if (expected !== undefined) {
            integrityFindings.push({
              id: `divergence-${input.id || 'scene'}-${path}`,
              status: 'UNRESOLVED',
              rule: 'provenance-final-state-divergence',
              family,
              path,
              expected: clone(expected),
              actual: clone(current),
              why: `Final ${path} no longer matches the value recorded for the applied compiler-first beat.`
            });
          }
        }
      }
      for (const [path, slot] of Object.entries(skeletonBeat?.patchSlots || {})) {
        if (slot?.status !== 'blocked') continue;
        blockedFamilies.push(familyForPath(path));
        if (!(path in fieldSources)) fieldSources[path] = 'blocked';
      }
    }

    const visualAgency = normalizeAuthority(sceneState?.agency);
    const cameraAuthority = normalizeAuthority(sceneState?.variables?.camera?.perspective);
    const colorTerritory = normalizeAuthority(sceneState?.variables?.color?.territory);

    const legacyOrUnknown = provenanceStatus === 'legacy' ? 'legacy' : 'unknown';
    const familySource = (family, preferredPath, hasFinalValue) => {
      if (preferredPath && fieldSources[preferredPath]) return fieldSources[preferredPath];
      const familyEntries = Object.entries(fieldSources).filter(([path]) => familyForPath(path) === family);
      if (familyEntries.some(([, source]) => source === 'blocked')) return 'blocked';
      if (familyEntries.some(([, source]) => source === 'compiler-backed')) return 'compiler-backed';
      if (familyEntries.some(([, source]) => source === 'ai-completed')) return 'ai-completed';
      if (familyEntries.some(([, source]) => source === 'unknown')) return 'unknown';
      return hasFinalValue ? legacyOrUnknown : 'unknown';
    };

    return {
      sceneId: input.id || null,
      title: input.title || '',
      order: Number.isInteger(options.order) ? options.order : null,
      narrativeRole: input.narrativeRole?.role ? String(input.narrativeRole.role).toUpperCase() : null,
      grammarId,
      provenanceStatus,
      appliedBeatId,
      narrativeAgency: {
        start: normalizeAuthority(transition[0]),
        end: normalizeAuthority(transition.length ? transition[transition.length - 1] : null)
      },
      compilerOwnedFamilies: sortFamilies(compilerFamilies),
      aiCompletedFamilies: sortFamilies(aiFamilies),
      blockedFamilies: sortFamilies(blockedFamilies),
      visualAgency,
      cameraAuthority,
      colorTerritory,
      sources: {
        agency: familySource('agency', 'agency', Boolean(visualAgency)),
        camera: familySource('camera', 'camera.perspective', Boolean(cameraAuthority)),
        color: familySource('color', 'color.territory', Boolean(colorTerritory)),
        space: familySource('space', null, Boolean(sceneState?.variables?.space))
      },
      fieldSources,
      evidence: {
        hasNarrativeState: Boolean(input.workspace?.narrativeState),
        hasSceneState: Boolean(sceneState),
        hasSequenceState: Boolean(input.workspace?.sequenceState),
        hasCompilerFirstProvenance: compilerFirst
      },
      integrityFindings
    };
  }

  return {
    normalizeAuthority,
    normalizeSceneIntelligence
  };
});
