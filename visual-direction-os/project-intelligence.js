((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectIntelligence = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const FAMILY_ORDER = ['agency', 'camera', 'color', 'space', 'line', 'texture', 'rhythm', 'ownership'];
  const AUTHORITY_SCORE = { WORLD: 0, CONTESTED: 1, CHARACTER: 2 };
  const OWNERSHIP_CAUSE_ROLES = new Set(['PRESSURE', 'RECOGNITION', 'ESCALATION', 'RUPTURE', 'REVERSAL', 'RELEASE', 'RESOLUTION']);
  const SUPPORTED_GRAMMAR_FAMILY = {
    'camera-authority-transfer': 'camera',
    'color-ownership-transfer': 'color',
    'agency-ownership-transfer': 'agency'
  };
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function normalizeAuthority(value) {
    if (value === 'world' || value === 'WORLD') return 'WORLD';
    if (value === 'character' || value === 'CHARACTER') return 'CHARACTER';
    if (['mixed', 'contested', 'shared', 'MIXED', 'CONTESTED', 'SHARED'].includes(value)) return 'CONTESTED';
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
      relationToPrevious: input.narrativeRole?.relationToPrevious || null,
      turningPoint: input.narrativeRole?.turningPoint || null,
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

  function authorityDistance(from, to) {
    const a = normalizeAuthority(from);
    const b = normalizeAuthority(to);
    if (!(a in AUTHORITY_SCORE) || !(b in AUTHORITY_SCORE)) return null;
    return Math.abs(AUTHORITY_SCORE[a] - AUTHORITY_SCORE[b]);
  }

  function responseItem(family, from, to, source) {
    const normalizedFrom = normalizeAuthority(from);
    const normalizedTo = normalizeAuthority(to);
    return {
      family,
      from: normalizedFrom,
      to: normalizedTo,
      changed: Boolean(normalizedFrom && normalizedTo && normalizedFrom !== normalizedTo),
      distance: authorityDistance(normalizedFrom, normalizedTo),
      source: source || 'unknown'
    };
  }

  function boundaryResult(previous, current, patch = {}) {
    const camera = responseItem('camera', previous?.cameraAuthority, current?.cameraAuthority, current?.sources?.camera);
    const color = responseItem('color', previous?.colorTerritory, current?.colorTerritory, current?.sources?.color);
    const cause = {
      narrativeRole: current?.narrativeRole || null,
      agencyFrom: normalizeAuthority(current?.narrativeAgency?.start),
      agencyTo: normalizeAuthority(current?.narrativeAgency?.end),
      relationToPrevious: current?.relationToPrevious || null,
      turningPoint: current?.turningPoint || null
    };
    const previousEndingAgency = normalizeAuthority(previous?.narrativeAgency?.end);
    const currentStartingAgency = normalizeAuthority(current?.narrativeAgency?.start);
    const handoffStatus = !previousEndingAgency || !currentStartingAgency
      ? 'UNRESOLVED'
      : previousEndingAgency === currentStartingAgency ? 'PASS' : 'WARN';
    const handoff = {
      previousEndingAgency,
      currentStartingAgency,
      status: handoffStatus
    };
    const visualResponse = [camera, color];
    const changed = visualResponse.find(item => item.changed && item.source === 'compiler-backed')
      || visualResponse.find(item => item.changed)
      || null;
    const ownershipConsequence = changed
      ? {
          summary: `${changed.family.toUpperCase()} authority moves from ${changed.from} to ${changed.to}.`,
          from: changed.from,
          to: changed.to
        }
      : {
          summary: 'No attributable Camera or Color ownership transfer is established at this boundary.',
          from: null,
          to: null
        };
    return {
      id: `${previous?.sceneId || 'unknown'}->${current?.sceneId || 'unknown'}`,
      fromSceneId: previous?.sceneId || null,
      toSceneId: current?.sceneId || null,
      status: patch.status || 'PASS',
      rule: patch.rule || 'boundary-pass',
      cause,
      handoff,
      visualResponse,
      ownershipConsequence,
      why: patch.why || 'The supported visual ownership response is explainable from the current Scene narrative cause.',
      evidenceStatus: patch.evidenceStatus || 'supported',
      findings: clone(patch.findings || [])
    };
  }

  function deriveBoundaryIntelligence(previousSceneRecord = {}, currentSceneRecord = {}) {
    const previous = clone(previousSceneRecord) || {};
    const current = clone(currentSceneRecord) || {};

    const divergence = (current.integrityFindings || []).find(item => item?.rule === 'provenance-final-state-divergence')
      || (previous.integrityFindings || []).find(item => item?.rule === 'provenance-final-state-divergence');
    if (divergence) {
      return boundaryResult(previous, current, {
        status: 'UNRESOLVED',
        rule: 'provenance-final-state-divergence',
        why: 'A final Scene value no longer matches its recorded decision origin, so Project Intelligence cannot safely preserve the old provenance claim.',
        evidenceStatus: 'unresolved',
        findings: [divergence]
      });
    }

    if (previous.provenanceStatus === 'legacy' || current.provenanceStatus === 'legacy') {
      return boundaryResult(previous, current, {
        status: 'UNRESOLVED',
        rule: 'legacy-provenance',
        why: 'At least one directed Scene predates compiler-first provenance, so the visual decision origin cannot be attributed safely.',
        evidenceStatus: 'legacy'
      });
    }

    if (previous.provenanceStatus === 'missing' || current.provenanceStatus === 'missing') {
      return boundaryResult(previous, current, {
        status: 'UNRESOLVED',
        rule: 'missing-provenance',
        why: 'Compiler-first markers are incomplete or required Scene evidence is missing.',
        evidenceStatus: 'unresolved'
      });
    }

    const previousEndingAgency = normalizeAuthority(previous?.narrativeAgency?.end);
    const currentStartingAgency = normalizeAuthority(current?.narrativeAgency?.start);
    if (!previousEndingAgency || !currentStartingAgency) {
      return boundaryResult(previous, current, {
        status: 'UNRESOLVED',
        rule: 'narrative-handoff-unresolved',
        why: 'The adjacent Scene handoff cannot be evaluated because one side of the narrative agency boundary is unknown.',
        evidenceStatus: 'unresolved'
      });
    }
    if (previousEndingAgency !== currentStartingAgency) {
      return boundaryResult(previous, current, {
        status: 'WARN',
        rule: 'narrative-handoff-mismatch',
        why: `Previous Scene ends with ${previousEndingAgency} agency while the current Scene starts with ${currentStartingAgency}.`,
        evidenceStatus: 'supported'
      });
    }

    const grammarFamily = SUPPORTED_GRAMMAR_FAMILY[current.grammarId] || null;
    const narrativeFrom = normalizeAuthority(current?.narrativeAgency?.start);
    const narrativeTo = normalizeAuthority(current?.narrativeAgency?.end);
    const narrativeTransferred = Boolean(narrativeFrom && narrativeTo && narrativeFrom !== narrativeTo);
    const hasStructuralCause = OWNERSHIP_CAUSE_ROLES.has(current.narrativeRole);
    const hasNarrativeCause = narrativeTransferred || hasStructuralCause;

    if (!grammarFamily) {
      if (narrativeTransferred || current.blockedFamilies?.length) {
        return boundaryResult(previous, current, {
          status: 'UNRESOLVED',
          rule: 'visual-family-unsupported',
          why: 'The current Grammar does not provide an exact supported ownership mapping for the narrative transfer.',
          evidenceStatus: current.blockedFamilies?.length ? 'blocked' : 'unresolved'
        });
      }
      return boundaryResult(previous, current, {
        status: 'UNRESOLVED',
        rule: 'visual-family-unsupported',
        why: 'The current Grammar does not provide an exact supported Project-level ownership mapping.',
        evidenceStatus: 'unresolved'
      });
    }

    const responses = {
      camera: responseItem('camera', previous.cameraAuthority, current.cameraAuthority, current.sources?.camera),
      color: responseItem('color', previous.colorTerritory, current.colorTerritory, current.sources?.color),
      agency: responseItem('agency', previous.visualAgency, current.visualAgency, current.sources?.agency)
    };
    const relevant = responses[grammarFamily];

    if (narrativeTransferred) {
      if (current.blockedFamilies?.includes(grammarFamily) || relevant?.source === 'blocked') {
        return boundaryResult(previous, current, {
          status: 'UNRESOLVED',
          rule: 'visual-family-unsupported',
          why: `The ${grammarFamily.toUpperCase()} response is blocked by the current compiler contract, so the narrative transfer cannot be judged safely.`,
          evidenceStatus: 'blocked'
        });
      }
      if (!relevant || !relevant.changed || relevant.source !== 'compiler-backed') {
        return boundaryResult(previous, current, {
          status: 'WARN',
          rule: 'narrative-transfer-without-visual-response',
          why: `The current Scene changes narrative agency from ${narrativeFrom} to ${narrativeTo}, but the supported ${grammarFamily.toUpperCase()} ownership response is not compiler-backed and visibly changed.`,
          evidenceStatus: relevant?.source === 'unknown' ? 'unresolved' : 'supported'
        });
      }
    }

    if (relevant?.changed && relevant.source === 'compiler-backed' && !hasNarrativeCause) {
      return boundaryResult(previous, current, {
        status: 'WARN',
        rule: 'visual-transfer-without-narrative-cause',
        why: `A compiler-backed ${grammarFamily.toUpperCase()} ownership transfer occurs without a comparable narrative cause in the current Scene.`,
        evidenceStatus: 'supported'
      });
    }

    return boundaryResult(previous, current, {
      status: 'PASS',
      rule: 'boundary-pass',
      why: hasNarrativeCause
        ? 'The supported visual ownership response follows the current Scene narrative cause.'
        : 'No unexplained compiler-backed ownership transfer is present at this boundary.',
      evidenceStatus: 'supported'
    });
  }

  return {
    normalizeAuthority,
    normalizeSceneIntelligence,
    deriveBoundaryIntelligence
  };
});
