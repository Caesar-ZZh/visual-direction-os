((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./narrative-contracts.js')
    : root?.VDOSNarrativeContracts;
  const api = factory(contracts);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualSequenceSkeleton = api;
})(typeof window !== 'undefined' ? window : globalThis, contracts => {
  'use strict';

  const VERSION = '0.1.0';
  const AGENCIES = contracts?.AGENCIES || ['world', 'contested', 'shared', 'character'];
  const BEATS = [
    ['setup', 'SETUP'],
    ['pressure', 'PRESSURE'],
    ['rupture', 'RUPTURE'],
    ['release', 'RELEASE'],
    ['new-ownership', 'NEW OWNERSHIP']
  ];
  const PATCH_PATHS = [
    'ownership.character', 'ownership.world', 'ownership.narrative',
    'color.temperature', 'color.saturation', 'color.contrast', 'color.territory',
    'space.depth', 'space.compression', 'space.openness', 'space.negativeSpace',
    'camera.distance', 'camera.stability', 'camera.perspective', 'camera.movement',
    'line.stability', 'line.density', 'line.direction',
    'texture.noise', 'texture.granularity', 'texture.materiality',
    'rhythm.cutDensity', 'rhythm.motionEnergy', 'rhythm.repetition'
  ];

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function normalizeAgencyPath(path) {
    if (!Array.isArray(path)) throw new Error('Agency transition path must be an array.');
    const normalized = [];
    for (const value of path) {
      if (!AGENCIES.includes(value)) throw new Error(`Unsupported agency state: ${value}`);
      if (normalized[normalized.length - 1] !== value) normalized.push(value);
    }
    if (normalized.length < 2) throw new Error('Agency transition requires at least two distinct agency states.');
    return normalized;
  }

  function openSlot() {
    return { status: 'open', support: 'open', owner: 'ai' };
  }

  function blockedSlot(source, why) {
    return { status: 'blocked', support: 'blocked', owner: 'none', source, why };
  }

  function derivedSlot(source, derivation, why) {
    return { status: 'compiler-derived', support: 'supported', owner: 'compiler', source, derivation, why };
  }

  function patchSlotsForGrammar(grammarId) {
    const slots = Object.fromEntries(PATCH_PATHS.map(path => [path, openSlot()]));

    if (grammarId === 'camera-authority-transfer') {
      slots['camera.perspective'] = derivedSlot(
        grammarId,
        'agency->camera.perspective',
        'Camera perspective is derived from the validated beat agency.'
      );
    } else if (grammarId === 'color-ownership-transfer') {
      slots['color.territory'] = derivedSlot(
        grammarId,
        'agency->color.territory',
        'Color territory is derived from the validated beat agency.'
      );
    } else if (grammarId === 'spatial-authorship') {
      for (const path of PATCH_PATHS.filter(path => path.startsWith('space.'))) {
        slots[path] = blockedSlot(
          grammarId,
          'Spatial Authorship does not justify one exact Scene State space value for this beat.'
        );
      }
      slots['camera.perspective'] = blockedSlot(
        grammarId,
        'The current Spatial Authorship camera mapping is partial and does not grant exact write authority.'
      );
    }

    return slots;
  }

  function validateSkeleton(skeleton) {
    const errors = [];
    if (!skeleton || typeof skeleton !== 'object') return { valid: false, errors: ['Skeleton must be an object.'] };
    if (!Array.isArray(skeleton.beats) || skeleton.beats.length !== BEATS.length) errors.push('Skeleton must contain exactly five beats.');
    const path = skeleton.agencyConstraint?.path;
    if (!Array.isArray(path) || path.length < 2) errors.push('Skeleton requires an agency path with at least two states.');
    (skeleton.beats || []).forEach((beat, index) => {
      const expected = BEATS[index];
      if (!expected) return;
      if (beat.id !== expected[0]) errors.push(`Beat ${index} id must be ${expected[0]}.`);
      if (beat.label !== expected[1]) errors.push(`Beat ${index} label must be ${expected[1]}.`);
      if (!beat.structure || typeof beat.structure.primaryVariable !== 'string') errors.push(`Beat ${beat.id || index} requires compiler-owned structure.`);
      if (!beat.patchSlots || typeof beat.patchSlots !== 'object') errors.push(`Beat ${beat.id || index} requires patch slots.`);
    });
    return errors.length ? { valid: false, errors } : { valid: true, errors: [], value: clone(skeleton) };
  }

  function compileSequenceSkeleton({ confirmedReading, selectedStrategy, visualIR } = {}) {
    if (!confirmedReading?.agencyTransition?.value) throw new Error('Confirmed Reading with agency transition is required.');
    if (!selectedStrategy?.id || !selectedStrategy?.primaryVariable) throw new Error('Selected Strategy is required.');

    const agencyPath = normalizeAgencyPath(confirmedReading.agencyTransition.value);
    const grammarResolved = visualIR?.grammar?.status === 'resolved' && Boolean(visualIR.grammar.id);
    const grammarId = grammarResolved ? visualIR.grammar.id : null;
    const patchSlots = patchSlotsForGrammar(grammarId);
    const structure = {
      primaryVariable: selectedStrategy.primaryVariable,
      supportingVariables: clone(selectedStrategy.supportingVariables || []),
      restrainedVariables: clone(selectedStrategy.restrainedVariables || [])
    };

    const beats = BEATS.map(([id, label], index) => {
      const endpoint = index === 0 ? agencyPath[0] : index === BEATS.length - 1 ? agencyPath[agencyPath.length - 1] : null;
      return {
        id,
        label,
        structure: clone(structure),
        agencySlot: endpoint
          ? { status: 'fixed', owner: 'compiler', value: endpoint, allowedValues: [endpoint] }
          : { status: 'open', owner: 'ai', allowedValues: clone(agencyPath), rule: 'monotonic-progression' },
        patchSlots: clone(patchSlots),
        completionSlots: {
          narrativeBeat: 'open',
          agency: endpoint ? 'compiler-fixed' : 'constrained-open',
          visualEvents: 'open',
          rationale: 'open',
          openPatch: 'dynamic-open-paths-only'
        },
        provenance: {
          readingId: confirmedReading.id || visualIR?.source?.readingId || null,
          strategyId: selectedStrategy.id,
          grammarId
        }
      };
    });

    const result = {
      version: VERSION,
      mode: 'compiler-first',
      grammarId,
      grammarStatus: grammarResolved ? 'resolved' : 'unresolved',
      readingId: confirmedReading.id || visualIR?.source?.readingId || null,
      strategyId: selectedStrategy.id,
      agencyConstraint: {
        path: clone(agencyPath),
        start: agencyPath[0],
        end: agencyPath[agencyPath.length - 1],
        rule: 'monotonic-progression'
      },
      beats
    };

    const checked = validateSkeleton(result);
    if (!checked.valid) throw new Error(`Invalid Sequence Skeleton: ${checked.errors.join('; ')}`);
    return checked.value;
  }

  return {
    VERSION,
    BEATS: clone(BEATS),
    PATCH_PATHS: clone(PATCH_PATHS),
    normalizeAgencyPath,
    validateSkeleton,
    compileSequenceSkeleton
  };
});
