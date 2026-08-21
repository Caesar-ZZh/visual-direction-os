((root, factory) => {
  const bridge = typeof module === 'object' && module.exports ? require('./visual-ir-bridge.js') : root?.VDOSVisualIRBridge;
  const inspector = typeof module === 'object' && module.exports ? require('./visual-ir-inspector.js') : root?.VDOSVisualIRInspector;
  const compare = typeof module === 'object' && module.exports ? require('./visual-compiler-compare.js') : root?.VDOSVisualCompilerCompare;
  const compilerInspector = typeof module === 'object' && module.exports ? require('./visual-compiler-inspector.js') : root?.VDOSVisualCompilerInspector;
  const api = factory(root, bridge, inspector, compare, compilerInspector);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualIRShadow = api;
})(typeof window !== 'undefined' ? window : globalThis, (root, bridge, inspector, compare, compilerInspector) => {
  'use strict';

  if (!bridge || !inspector || !compare || !compilerInspector) throw new Error('Visual IR shadow dependencies are missing.');

  const clone = value => JSON.parse(JSON.stringify(value));
  const defer = callback => (root.queueMicrotask || queueMicrotask)(callback);

  function initVisualIRShadow(rootNode, options = {}) {
    const target = rootNode || root.document?.querySelector('#narrative-root');
    if (!target) return null;

    let activeVisualIR = null;
    let activeCompilerComparison = null;
    let lastComparisonKey = null;
    let destroyed = false;

    const getWorkspaceController = () => options.workspaceController || root.VDOSNarrativeWorkspaceController;

    function removeVisualIRSlot() {
      target.querySelector('[data-visual-ir-slot]')?.remove();
    }

    function removeCompilerSlot() {
      target.querySelector('[data-visual-compiler-slot]')?.remove();
    }

    function clearCompilerComparison() {
      activeCompilerComparison = null;
      lastComparisonKey = null;
      removeCompilerSlot();
    }

    function clearVisualIR() {
      activeVisualIR = null;
      removeVisualIRSlot();
      clearCompilerComparison();
    }

    function ensureVisualIRSlot() {
      const output = target.querySelector('[data-narrative-output]');
      const actions = output?.querySelector('.narrative-actions');
      if (!output || !actions) return null;
      let slot = output.querySelector('[data-visual-ir-slot]');
      if (!slot) {
        slot = root.document.createElement('div');
        slot.setAttribute('data-visual-ir-slot', '');
        actions.before(slot);
      }
      return slot;
    }

    function ensureCompilerSlot() {
      const output = target.querySelector('[data-narrative-output]');
      const applyPreview = output?.querySelector('.narrative-apply-preview');
      if (!output || !applyPreview) return null;
      let slot = output.querySelector('[data-visual-compiler-slot]');
      if (!slot) {
        slot = root.document.createElement('div');
        slot.setAttribute('data-visual-compiler-slot', '');
        applyPreview.before(slot);
      }
      return slot;
    }

    function buildVisualIR(state) {
      if (!state?.confirmedReading || !state?.selectedStrategy) return null;
      const ir = bridge.compileVisualIR({
        confirmedReading: state.confirmedReading,
        selectedStrategy: state.selectedStrategy
      });
      const checked = bridge.validateVisualIR(ir);
      if (!checked.valid) throw new Error(`Visual IR shadow validation failed: ${checked.errors.join('; ')}`);
      return ir;
    }

    function sync() {
      if (destroyed) return null;
      const workspace = getWorkspaceController();
      if (!workspace || typeof workspace.getDraftState !== 'function') {
        clearVisualIR();
        return null;
      }
      const state = workspace.getDraftState();
      const ir = buildVisualIR(state);
      if (!ir) {
        clearVisualIR();
        return null;
      }

      activeVisualIR = clone(ir);
      const slot = ensureVisualIRSlot();
      if (slot) slot.innerHTML = inspector.renderVisualIRInspector(ir);
      syncSequenceCompare();
      return clone(ir);
    }

    function syncSequenceCompare() {
      if (destroyed) return null;
      const workspace = getWorkspaceController();
      if (!workspace || typeof workspace.getDraftState !== 'function') {
        clearCompilerComparison();
        return null;
      }

      const state = workspace.getDraftState();
      const beats = state?.sequenceProposal?.beats;
      if (!Array.isArray(beats) || beats.length === 0 || !target.querySelector('[data-sequence-proposal-beat]')) {
        clearCompilerComparison();
        return null;
      }

      const ir = activeVisualIR || buildVisualIR(state);
      if (!ir) {
        clearCompilerComparison();
        return null;
      }
      activeVisualIR = clone(ir);

      const comparison = compare.compareSequence({ visualIR: ir, beats });
      const comparisonKey = JSON.stringify(comparison);
      const existing = target.querySelector('[data-visual-compiler-slot]');
      if (existing && comparisonKey === lastComparisonKey) return clone(activeCompilerComparison || comparison);

      activeCompilerComparison = clone(comparison);
      lastComparisonKey = comparisonKey;
      const slot = ensureCompilerSlot();
      if (slot) slot.innerHTML = compilerInspector.renderCompilerComparison(comparison);
      return clone(comparison);
    }

    function getVisualIR() {
      return activeVisualIR ? clone(activeVisualIR) : null;
    }

    function getCompilerComparison() {
      return activeCompilerComparison ? clone(activeCompilerComparison) : null;
    }

    function handleClick(event) {
      const element = event.target?.closest?.('[data-strategy-card],[data-reading-card],[data-confirm-reading]');
      if (!element) return;
      if (element.matches('[data-strategy-card]')) {
        clearCompilerComparison();
        defer(sync);
        return;
      }
      clearVisualIR();
    }

    function handleInput(event) {
      if (event.target?.matches?.('#narrative-scene,#narrative-intent,[data-reading-field]')) clearVisualIR();
    }

    const observer = typeof root.MutationObserver === 'function'
      ? new root.MutationObserver(() => defer(syncSequenceCompare))
      : null;

    target.addEventListener('click', handleClick);
    target.addEventListener('input', handleInput);
    observer?.observe(target, { childList: true, subtree: true });

    return {
      sync,
      syncSequenceCompare,
      getVisualIR,
      getCompilerComparison,
      clear: clearVisualIR,
      destroy() {
        destroyed = true;
        observer?.disconnect();
        target.removeEventListener('click', handleClick);
        target.removeEventListener('input', handleInput);
        clearVisualIR();
      }
    };
  }

  function autoInit() {
    const target = root.document?.querySelector('#narrative-root');
    if (!target || root.VDOSVisualIRShadowController) return;
    root.VDOSVisualIRShadowController = initVisualIRShadow(target);
  }

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', autoInit, { once: true });
    else autoInit();
  }

  return { initVisualIRShadow };
});
