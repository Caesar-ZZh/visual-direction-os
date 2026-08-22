((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualGrammarRegistry = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const ref = (path, kind, basis) => ({ path, kind, basis });
  const binding = (value, status = 'known', evidenceStatus = 'supported') => ({
    value,
    status,
    evidenceStatus
  });

  const GRAMMARS = [
    {
      id: 'spatial-authorship',
      label: 'Spatial Authorship',
      match: { primaryVariables: ['space'] },
      contract: { status: 'supported', primaryVariables: ['space'], missingVariables: [] },
      evidence: {
        status: 'supported',
        tier: 'method',
        refs: [
          ref('visual-direction-system/01-master-framework.md', 'method', 'Freedom/restraint maps to Space/Direction and agency is ownership of the primary variable.'),
          ref('visual-direction-system/02-character-system.md', 'method', 'Space agency creates routes rather than follows them; camera/environment may anticipate the chosen path.'),
          ref('visual-direction-system/03-world-system.md', 'method', 'Systematized worlds can constrain movement through controlled routes; large space is not automatically freedom.'),
          ref('visual-direction-system/04-sequence-color.md', 'method', 'Open→compressed space and reactive→predictive framing are valid visual beats.')
        ]
      },
      bindings: {
        space: binding('authorship-transfer'),
        camera: binding('reactive-to-predictive-after-route-ownership', 'partial')
      },
      antiRules: [
        'Do not equate large space with freedom.',
        'Do not make every visual dimension deviate at once.',
        'Do not make every sequence curve peak at the same moment.'
      ],
      guards: ['Camera prediction is contingent on character-authored path ownership.']
    },
    {
      id: 'camera-authority-transfer',
      label: 'Camera Authority Transfer',
      match: { primaryVariables: ['camera'] },
      contract: { status: 'supported', primaryVariables: ['camera'], missingVariables: [] },
      evidence: {
        status: 'supported',
        tier: 'method',
        refs: [
          ref('visual-direction-system/01-master-framework.md', 'method', 'Agency becomes visible when control of the primary variable transfers from world/system to character.'),
          ref('visual-direction-system/04-sequence-color.md', 'method', 'Visual POV tracks whose image-generating rules dominate and is distinct from literal first-person POV.')
        ]
      },
      bindings: { camera: binding('authority-transfer') },
      antiRules: [
        'Do not confuse visual POV with literal first-person camera POV.',
        'Do not change camera authority without a narrative cause.',
        'Do not spend all camera-energy reserve before the ownership change.'
      ],
      guards: ['Camera authority must follow the confirmed agency logic, not generic cinematic intensity.']
    },
    {
      id: 'color-ownership-transfer',
      label: 'Color Ownership Transfer',
      match: { primaryVariables: ['color'] },
      contract: { status: 'supported', primaryVariables: ['color'], missingVariables: [] },
      evidence: {
        status: 'supported',
        tier: 'method',
        refs: [
          ref('visual-direction-system/04-sequence-color.md', 'method', 'Color meaning depends on ownership, territory, boundary and timing rather than hue alone.'),
          ref('visual-direction-system/01-master-framework.md', 'method', 'Agency is expressed as ownership of the primary variable.')
        ]
      },
      bindings: { color: binding('ownership-territory-transfer') },
      antiRules: [
        'Do not map emotion to a fixed hue.',
        'Do not treat hue alone as the color meaning.',
        'Do not force saturation to rise with emotional intensity.'
      ],
      guards: ['Color ownership may change without changing the entire palette.']
    },
    {
      id: 'surface-assignment',
      label: 'Surface Assignment',
      match: { primaryVariables: ['texture'] },
      contract: { status: 'supported', primaryVariables: ['texture'], missingVariables: [] },
      evidence: {
        status: 'supported',
        tier: 'method+generation-calibration',
        refs: [
          ref('visual-direction-system/evidence-calibrated/04-rendering-deconstruction.md', 'calibration', 'Texture must be assigned by surface/function rather than globally overlaid.'),
          ref('visual-direction-system/03-world-system.md', 'method', 'Selective deviation allows a character to differ in some dimensions while obeying the host in others.')
        ]
      },
      bindings: {
        texture: binding('assigned-not-overlaid'),
        detail: binding('function-led-detail-suppression', 'partial')
      },
      antiRules: [
        'Do not apply one global texture treatment to every surface.',
        'Do not use global halftone as a substitute for surface assignment.',
        'Do not let surface enrichment obscure identity or the primary narrative variable.'
      ],
      guards: ['Texture is not equivalent to Medium; this grammar does not claim medium ownership or timing.']
    },
    {
      id: 'agency-ownership-transfer',
      label: 'Agency Ownership Transfer',
      match: { primaryVariables: ['agency'] },
      contract: { status: 'supported', primaryVariables: ['agency'], missingVariables: [] },
      evidence: {
        status: 'supported',
        tier: 'method',
        refs: [
          ref('visual-direction-system/01-master-framework.md', 'method', 'Agency equals ownership of the primary variable: WORLD/SYSTEM → CONFLICT → CHARACTER.'),
          ref('visual-direction-system/04-sequence-color.md', 'method', 'Visual POV can move from world/system dominance through conflict toward character dominance.')
        ]
      },
      bindings: {},
      antiRules: [
        'Do not represent agency as generic visual chaos.',
        'Do not declare character ownership before the confirmed narrative transition supports it.'
      ],
      guards: ['Agency transfer governs ownership; it does not prescribe unsupported surface values by itself.']
    },
    {
      id: 'relational-boundary',
      label: 'Relational Boundary',
      match: { primaryVariables: [] },
      contract: { status: 'blocked', primaryVariables: [], missingVariables: ['boundary','edge'] },
      evidence: {
        status: 'supported',
        tier: 'method',
        refs: [
          ref('visual-direction-system/02-character-system.md', 'method', 'Boundary-driven mechanisms couple Edge × Color and agency means selective boundary ownership.'),
          ref('visual-direction-system/03-world-system.md', 'method', 'Emotionally permeable worlds allow edge hierarchy and psychological distance to override physical description.'),
          ref('visual-direction-system/04-sequence-color.md', 'method', 'Physical boundary and color boundary are distinct variables.')
        ]
      },
      bindings: {},
      antiRules: ['Do not substitute line density for boundary ownership.'],
      guards: ['Latent until the Strategy contract can express Boundary/Edge directly.']
    },
    {
      id: 'medium-locality',
      label: 'Character-local Medium / Time',
      match: { primaryVariables: [] },
      contract: { status: 'blocked', primaryVariables: [], missingVariables: ['medium','time'] },
      evidence: {
        status: 'evidence_incomplete',
        tier: 'method+observed',
        refs: [
          ref('visual-direction-system/02-character-system.md', 'method', 'Time/Medium mechanisms express autonomy through selective synchronization and medium independence.'),
          ref('63-batch-059-occupied-transit-hobie-local-medium-phase.md', 'observed', 'Character-local material/color/edge phase changes occur while neighboring actors and host remain comparatively stable; numerical cadence is withheld.'),
          ref('visual-direction-system/evidence-calibrated/04-rendering-deconstruction.md', 'calibration', 'Different surfaces may use heterogeneous media; texture must be assigned rather than globally overlaid.')
        ]
      },
      bindings: {},
      antiRules: [
        'Do not apply collage or print treatment globally.',
        'Do not homogenize the host world to match a character-local medium.',
        'Do not infer temporal cadence from surface texture alone.'
      ],
      guards: [
        'Do not infer a numerical animation frame rate or on-ones/on-twos cadence.',
        'Do not infer literal paper anatomy from a paper/canvas-like rendering treatment.',
        'Latent until the Strategy contract can express Medium/Time directly.'
      ]
    }
  ];

  const byId = new Map(GRAMMARS.map(grammar => [grammar.id, grammar]));

  function listGrammars() {
    return clone(GRAMMARS);
  }

  function getGrammar(id) {
    const grammar = byId.get(id);
    return grammar ? clone(grammar) : null;
  }

  function resolveGrammar({ selectedStrategy } = {}) {
    const grammarId = selectedStrategy?.grammarId;
    const primaryVariable = selectedStrategy?.primaryVariable;
    if (!grammarId || grammarId === 'unresolved' || !primaryVariable) return null;
    const grammar = byId.get(grammarId);
    if (!grammar || grammar.contract.status !== 'supported') return null;
    if (!grammar.match.primaryVariables.includes(primaryVariable)) return null;
    return clone(grammar);
  }

  return { listGrammars, getGrammar, resolveGrammar };
});
