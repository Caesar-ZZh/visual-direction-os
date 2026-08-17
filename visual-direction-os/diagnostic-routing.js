((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSDiagnosticRouting = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const SAFE_TOKEN = /^[a-z0-9-]+$/i;

  function selectorForRoute(route) {
    if (!route?.family || !route?.control) return null;
    if (!SAFE_TOKEN.test(route.family) || !SAFE_TOKEN.test(route.control)) return null;
    return `[data-variable-family="${route.family}"][data-variable-key="${route.control}"]`;
  }

  function learnHref(target) {
    if (!target || !SAFE_TOKEN.test(target)) return null;
    return `knowledge.html#${target}`;
  }

  function clearRouteTargets(doc) {
    if (!doc?.querySelectorAll) return;
    doc.querySelectorAll('.is-route-target').forEach(node => node.classList.remove('is-route-target'));
  }

  function goToControl(route, options = {}) {
    const doc = options.doc || (typeof document !== 'undefined' ? document : null);
    const selector = selectorForRoute(route);
    if (!doc || !selector) return { found: false };

    const controls = [...doc.querySelectorAll(selector)];
    if (!controls.length) return { found: false };

    const group = controls[0].closest('.control-row') || controls[0].closest('.variable-family') || controls[0].parentElement;
    clearRouteTargets(doc);
    if (group) group.classList.add('is-route-target');

    if (typeof options.setMode === 'function') options.setMode('direct');

    const selected = controls.find(control => control.getAttribute('aria-pressed') === 'true') || controls[0];
    if (group?.scrollIntoView) group.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    if (selected?.focus) selected.focus({ preventScroll: true });

    return { found: true, target: group || selected, control: selected };
  }

  return { selectorForRoute, learnHref, goToControl, clearRouteTargets };
});
