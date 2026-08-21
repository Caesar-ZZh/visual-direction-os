((root, factory) => {
  const bridge = typeof module === 'object' && module.exports ? require('./visual-ir-bridge.js') : root?.VDOSVisualIRBridge;
  const inspector = typeof module === 'object' && module.exports ? require('./visual-ir-inspector.js') : root?.VDOSVisualIRInspector;
  const api = factory(root, bridge, inspector);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualIRShadow = api;
})(typeof window !== 'undefined' ? window : globalThis, (root, bridge, inspector) => {
  'use strict';

  if (!bridge || !inspector) throw new Error('Visual IR shadow dependencies are missing.');

  const clone = value => JSON.parse(JSON.stringify(value));

  function initVisualIRShadow(rootNode, options = {}) {
    const target = rootNode || root.document?.querySelector('#narrative-root');
    if (!target) return null;

    let activeVisualIR = null;
    let destroyed = false;

    const getWorkspaceController = () => options.workspaceController || root.VDOSNarrativeWorkspaceController;

    function removeSlot() {
      target.querySelector('[data-visual-ir-slot]')?.remove();
    }

    function clearVisualIR() {
      activeVisualIR = null;
      removeSlot();
    }

    function ensureSlot() {
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

    function sync() {
      if (destroyed) return null;
      const workspace = getWorkspaceController();
      const state = workspace?.getDraftState?.();
      if (!state?.confirmedReading || !state?.selectedStrategy) {
        clearVisualIR();
        return null;
      }

      const ir = bridge.compileVisualIR({
        confirmedReading: state.confirmedReading,
        selectedStrategy: state.selectedStrategy
      });
      const checked = bridge.validateVisualIR(ir);
      if (!checked.valid) throw new Error(`Visual IR shadow validation failed: ${checked.errors.join('; ')}`);

      activeVisualIR = clone(ir);
      const slot = ensureSlot();
      if (slot) slot.innerHTML = inspector.renderVisualIRInspector(ir);
      return clone(ir);
    }

    function getVisualIR() {
      return activeVisualIR ? clone(activeVisualIR) : null;
    }

    function handleClick(event) {
      const element = event.target?.closest?.('[data-strategy-card],[data-reading-card],[data-confirm-reading]');
      if (!element) return;
      if (element.matches('[data-strategy-card]')) {
        queueMicrotask(sync);
        return;
      }
      clearVisualIR();
    }

    function handleInput(event) {
      if (event.target?.matches?.('#narrative-scene,#narrative-intent,[data-reading-field]')) clearVisualIR();
    }

    target.addEventListener('click', handleClick);
    target.addEventListener('input', handleInput);

    return {
      sync,
      getVisualIR,
      clear: clearVisualIR,
      destroy() {
        destroyed = true;
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
