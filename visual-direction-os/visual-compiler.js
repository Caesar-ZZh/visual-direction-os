((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualCompiler = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const perspectiveForAgency = agency => agency === 'character' ? 'character' : agency === 'world' ? 'world' : 'mixed';
  const territoryForAgency = agency => agency === 'character' ? 'character' : agency === 'world' ? 'world' : 'contested';

  const assertion = (path, expected, status, source, why) => ({ path, expected, status, source, why });
  const gap = (path, source, why) => ({ path, status: 'blocked', source, why });

  function compileBeatExpectations({ visualIR, beat } = {}) {
    if (!beat || !beat.agency) throw new Error('Visual compiler requires a sequence beat with agency.');

    const grammarId = visualIR?.grammar?.status === 'resolved' ? visualIR.grammar.id : null;
    const assertions = [];
    const gaps = [];

    if (!grammarId) {
      gaps.push(gap('grammar', null, 'No explicit resolved grammar is available; the compiler will not guess from Primary Variable alone.'));
      return { grammarId: null, assertions, gaps };
    }

    if (grammarId === 'camera-authority-transfer') {
      const expected = perspectiveForAgency(beat.agency);
      const owner = beat.agency === 'character' ? 'character-owned' : beat.agency === 'world' ? 'world-owned' : 'contested';
      assertions.push(assertion(
        'camera.perspective',
        expected,
        'supported',
        grammarId,
        `Camera authority follows the confirmed ${owner} agency state.`
      ));
      return { grammarId, assertions, gaps };
    }

    if (grammarId === 'spatial-authorship') {
      assertions.push(assertion(
        'camera.perspective',
        perspectiveForAgency(beat.agency),
        'partial',
        grammarId,
        'Camera may track the contested authorship state, but exact spatial compression remains sequence-dependent.'
      ));
      gaps.push(gap(
        'space',
        grammarId,
        'Spatial Authorship establishes ownership of route/space, but the current grammar does not justify one exact compression or openness value for every beat.'
      ));
      return { grammarId, assertions, gaps };
    }

    if (grammarId === 'color-ownership-transfer') {
      const expected = territoryForAgency(beat.agency);
      const owner = beat.agency === 'character' ? 'character-owned' : beat.agency === 'world' ? 'world-owned' : 'contested';
      assertions.push(assertion(
        'color.territory',
        expected,
        'supported',
        grammarId,
        `Color territory follows the confirmed ${owner} agency state.`
      ));
      return { grammarId, assertions, gaps };
    }

    if (grammarId === 'agency-ownership-transfer') {
      assertions.push(assertion(
        'agency',
        beat.agency,
        'supported',
        grammarId,
        'The compiler preserves the beat agency selected by the confirmed ownership transition.'
      ));
      return { grammarId, assertions, gaps };
    }

    if (grammarId === 'surface-assignment') {
      gaps.push(gap(
        'texture.surfaceOwnership',
        grammarId,
        'Current Scene State texture fields cannot express per-surface ownership; Texture is not coerced into Medium.'
      ));
      return { grammarId, assertions, gaps };
    }

    gaps.push(gap(
      'grammar',
      grammarId,
      'The resolved grammar has no deterministic Scene State mapping in M3; it remains inspectable but non-authoritative.'
    ));
    return { grammarId, assertions, gaps };
  }

  return { compileBeatExpectations };
});
