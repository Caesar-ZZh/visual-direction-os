(function attachIterationController(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function iterationControllerFactory() {
  'use strict';

  function canRedirect(delta) {
    return Boolean(String(delta?.promptAppendix || '').trim());
  }

  function resolveGenerationController(root) {
    const generation = root?.VisualDirectionOS?.generation || null;
    return generation && typeof generation.generate === 'function' ? generation : null;
  }

  async function runGenerationIteration({ root, artifact, delta, applyIterationDelta } = {}) {
    if (!artifact?.request || !artifact?.id) throw new Error('Generation artifact is required for re-direction');
    if (!canRedirect(delta)) throw new Error('A compiled iteration delta is required for re-direction');
    if (typeof applyIterationDelta !== 'function') throw new Error('Iteration compiler is unavailable');

    const generation = resolveGenerationController(root);
    if (!generation) throw new Error('Generation runtime is not ready');

    const revised = applyIterationDelta(artifact.request, delta);
    generation.setRequest?.(revised, { label: 'ITERATION / QA DELTA' });

    return generation.generate(revised, {
      iterationOf: artifact.id,
      iterationDelta: delta,
      visualIR: artifact.visualIR
    });
  }

  return {
    canRedirect,
    resolveGenerationController,
    runGenerationIteration
  };
});
