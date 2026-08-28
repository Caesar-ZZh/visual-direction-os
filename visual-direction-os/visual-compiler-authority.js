((root, factory) => {
  const compiler = typeof module === 'object' && module.exports
    ? require('./visual-compiler.js')
    : root?.VDOSVisualCompiler;
  const api = factory(compiler);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualCompilerAuthority = api;
})(typeof window !== 'undefined' ? window : globalThis, compiler => {
  'use strict';

  if (!compiler) throw new Error('VDOSVisualCompiler is required before visual-compiler-authority.js');

  const VERSION = '0.1.0';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const EMPTY_TOTALS = () => ({ CONFIRM: 0, OVERRIDE: 0, INJECT: 0, PARTIAL: 0, BLOCKED: 0 });

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

  function setPatchValue(sceneStatePatch, path, value) {
    if (path === 'agency') {
      sceneStatePatch.agency = clone(value);
      return;
    }
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return;
    let cursor = sceneStatePatch.variables || (sceneStatePatch.variables = {});
    parts.forEach((part, index) => {
      if (index === parts.length - 1) cursor[part] = clone(value);
      else cursor = cursor[part] || (cursor[part] = {});
    });
  }

  function decision({ path, action, from = null, to = null, authority = 'ai', support = null, source = null, why = '' }) {
    return { path, action, from, to, authority, support, source, why };
  }

  function resolveBeatAuthority({ visualIR, beat } = {}) {
    if (!beat) throw new Error('Compiler authority requires a beat.');
    const expectations = compiler.compileBeatExpectations({ visualIR, beat });
    const originalPatch = clone(beat.sceneStatePatch || {});
    const resolvedPatch = clone(originalPatch);
    const decisions = [];

    for (const item of expectations.assertions || []) {
      const actual = readPatchValue(originalPatch, item.path);
      if (item.status !== 'supported') {
        decisions.push(decision({
          path: item.path,
          action: 'PARTIAL',
          from: actual,
          to: item.expected,
          authority: 'ai',
          support: item.status,
          source: item.source,
          why: item.why
        }));
        continue;
      }

      const action = actual == null ? 'INJECT' : Object.is(actual, item.expected) ? 'CONFIRM' : 'OVERRIDE';
      if (action !== 'CONFIRM') setPatchValue(resolvedPatch, item.path, item.expected);
      decisions.push(decision({
        path: item.path,
        action,
        from: actual,
        to: item.expected,
        authority: 'compiler',
        support: item.status,
        source: item.source,
        why: item.why
      }));
    }

    for (const item of expectations.gaps || []) {
      decisions.push(decision({
        path: item.path,
        action: 'BLOCKED',
        from: readPatchValue(originalPatch, item.path),
        to: null,
        authority: 'ai',
        support: item.status,
        source: item.source,
        why: item.why
      }));
    }

    return {
      id: beat.id,
      label: beat.label,
      grammarId: expectations.grammarId || null,
      originalPatch,
      resolvedPatch,
      decisions
    };
  }

  function resolveSequenceAuthority({ visualIR, proposal } = {}) {
    if (!proposal || !Array.isArray(proposal.beats)) throw new Error('Compiler authority requires a sequence proposal with beats.');
    const totals = EMPTY_TOTALS();
    const beatResults = proposal.beats.map(beat => {
      const result = resolveBeatAuthority({ visualIR, beat });
      result.decisions.forEach(item => {
        if (Object.prototype.hasOwnProperty.call(totals, item.action)) totals[item.action] += 1;
      });
      return result;
    });

    const resolvedProposal = clone(proposal);
    const byId = new Map(beatResults.map(result => [result.id, result]));
    resolvedProposal.beats = resolvedProposal.beats.map(beat => ({
      ...beat,
      sceneStatePatch: clone(byId.get(beat.id)?.resolvedPatch || beat.sceneStatePatch || {})
    }));

    return {
      version: VERSION,
      mode: 'guarded',
      grammarId: visualIR?.grammar?.status === 'resolved' ? visualIR.grammar.id : null,
      beats: beatResults,
      resolvedProposal,
      totals
    };
  }

  return { VERSION, readPatchValue, setPatchValue, resolveBeatAuthority, resolveSequenceAuthority };
});
