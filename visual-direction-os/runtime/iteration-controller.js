(function attachIterationController(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function iterationControllerFactory() {
  'use strict';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function canRedirect(delta, promptAppendix = null) {
    return Boolean(String(promptAppendix || delta?.promptAppendix || '').trim());
  }

  function resolveGenerationController(root) {
    const generation = root?.VisualDirectionOS?.generation || null;
    return generation && typeof generation.generate === 'function' ? generation : null;
  }

  async function runGenerationIteration({ root, artifact, delta, applyIterationDelta, baseRequest = null, promptAppendix = null } = {}) {
    if (!artifact?.request || !artifact?.id) throw new Error('Generation artifact is required for re-direction');
    if (!canRedirect(delta, promptAppendix)) throw new Error('A compiled iteration delta is required for re-direction');
    if (typeof applyIterationDelta !== 'function') throw new Error('Iteration compiler is unavailable');

    const generation = resolveGenerationController(root);
    if (!generation) throw new Error('Generation runtime is not ready');

    const cleanBase = clone(baseRequest || artifact.baseRequest || artifact.request);
    const effectiveAppendix = String(promptAppendix || delta?.promptAppendix || '').trim();
    const effectiveDelta = { ...(delta || {}), promptAppendix:effectiveAppendix };
    const revised = applyIterationDelta(cleanBase, effectiveDelta);
    generation.setRequest?.(revised, { label: 'ITERATION / QA DELTA' });

    return generation.generate(revised, {
      iterationOf: artifact.id,
      iterationDelta: delta,
      visualIR: artifact.visualIR,
      baseRequest: clone(cleanBase)
    });
  }

  return {
    canRedirect,
    resolveGenerationController,
    runGenerationIteration
  };
});
