((root, factory) => {
  const compiler = typeof module === 'object' && module.exports
    ? require('./visual-compiler.js')
    : root?.VDOSVisualCompiler;
  const api = factory(compiler);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualCompilerCompare = api;
})(typeof window !== 'undefined' ? window : globalThis, compiler => {
  'use strict';

  if (!compiler) throw new Error('VDOSVisualCompiler is required before visual-compiler-compare.js');

  const EMPTY_COUNTS = () => ({ MATCH: 0, CONFLICT: 0, MISSING: 0, BLOCKED: 0 });
  const PRIORITY = ['CONFLICT', 'MISSING', 'BLOCKED', 'MATCH'];

  function readPatchValue(sceneStatePatch, path) {
    if (!sceneStatePatch) return null;
    if (path === 'agency') return sceneStatePatch.agency ?? null;
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return null;
    let cursor = sceneStatePatch.variables;
    for (const part of parts) {
      if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return null;
      cursor = cursor[part];
    }
    return cursor ?? null;
  }

  function summaryStatus(counts) {
    return PRIORITY.find(key => counts[key] > 0) || 'BLOCKED';
  }

  function compareBeat({ expectations, sceneStatePatch } = {}) {
    const counts = EMPTY_COUNTS();
    const items = [];

    for (const expected of expectations?.assertions || []) {
      const actual = readPatchValue(sceneStatePatch, expected.path);
      const result = actual == null ? 'MISSING' : Object.is(actual, expected.expected) ? 'MATCH' : 'CONFLICT';
      counts[result] += 1;
      items.push({
        path: expected.path,
        expected: expected.expected,
        actual,
        result,
        support: expected.status,
        source: expected.source,
        why: expected.why
      });
    }

    for (const blocked of expectations?.gaps || []) {
      counts.BLOCKED += 1;
      items.push({
        path: blocked.path,
        expected: null,
        actual: null,
        result: 'BLOCKED',
        support: blocked.status,
        source: blocked.source,
        why: blocked.why
      });
    }

    return {
      grammarId: expectations?.grammarId ?? null,
      status: summaryStatus(counts),
      counts,
      items
    };
  }

  function addCounts(target, source) {
    Object.keys(target).forEach(key => { target[key] += source[key] || 0; });
  }

  function compareSequence({ visualIR, beats } = {}) {
    const totals = EMPTY_COUNTS();
    const comparedBeats = (Array.isArray(beats) ? beats : []).map(beat => {
      const expectations = compiler.compileBeatExpectations({ visualIR, beat });
      const compared = compareBeat({ expectations, sceneStatePatch: beat.sceneStatePatch || {} });
      addCounts(totals, compared.counts);
      return {
        id: beat.id,
        label: beat.label,
        agency: beat.agency,
        ...compared
      };
    });

    return {
      grammarId: visualIR?.grammar?.status === 'resolved' ? visualIR.grammar.id : null,
      beats: comparedBeats,
      totals
    };
  }

  return { readPatchValue, compareBeat, compareSequence };
});
