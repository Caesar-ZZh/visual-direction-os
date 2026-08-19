((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSAuteurPolishRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis, root => {
  'use strict';

  const UI_COPY_SELECTORS = [
    '.hero-copy > p:not(.eyebrow)',
    '.ownership-copy > p:not(.eyebrow):not(.status-line)',
    '.workspace > p:not(.eyebrow)',
    '.narrative-editor > p',
    '.narrative-aside-block > p',
    '.narrative-section-head > p:not(.eyebrow)',
    '.narrative-grounded-field > p',
    '.narrative-clarification > p',
    '.narrative-stage-error > p',
    '.narrative-live'
  ];

  function normalizeInterfaceCopy(value) {
    let text = String(value ?? '');
    if (!text.trim()) return text;
    text = text.replace(/。\s*/g, match => match.includes('\n') ? '\n' : '，');
    text = text.replace(/，\s*$/u, '');
    text = text.replace(/\.\s+(?=[A-Z\u4e00-\u9fff])/g, ' · ');
    text = text.replace(/\.\s*$/u, '');
    return text;
  }

  function polishNode(node) {
    if (!node || typeof node.textContent !== 'string') return false;
    const next = normalizeInterfaceCopy(node.textContent);
    if (next === node.textContent) return false;
    node.textContent = next;
    return true;
  }

  function apply(container = root?.document) {
    if (!container?.querySelectorAll) return 0;
    let changed = 0;
    UI_COPY_SELECTORS.forEach(selector => {
      container.querySelectorAll(selector).forEach(node => { if (polishNode(node)) changed += 1; });
    });
    return changed;
  }

  function start() {
    const doc = root?.document;
    if (!doc || root.__VDOS_AUTEUR_COPY_POLISH_STARTED__) return null;
    root.__VDOS_AUTEUR_COPY_POLISH_STARTED__ = true;
    const run = () => apply(doc);
    run();
    if (typeof root.MutationObserver !== 'function' || !doc.documentElement) return null;
    let queued = false;
    const observer = new root.MutationObserver(() => {
      if (queued) return;
      queued = true;
      root.queueMicrotask?.(() => { queued = false; run(); }) || Promise.resolve().then(() => { queued = false; run(); });
    });
    observer.observe(doc.documentElement, { childList:true, subtree:true });
    return observer;
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once:true });
    else start();
  }

  return { UI_COPY_SELECTORS:[...UI_COPY_SELECTORS], normalizeInterfaceCopy, apply, start };
});