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

  return { selectorForRoute, learnHref };
});
