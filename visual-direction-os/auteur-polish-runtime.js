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

  const BRAND_STYLE_ID = 'vdos-auteur-brand-structure';

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

  function ensureBrandStyle(doc = root?.document) {
    if (!doc?.head || doc.getElementById(BRAND_STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = BRAND_STYLE_ID;
    style.textContent = `
      .v2-rail .brand::before{content:none!important;display:none!important}
      .v2-rail .brand-monogram{display:none}
      .v2-rail .brand-wordmark{display:inline}
      @media (min-width:901px){
        .v2-rail:not([data-expanded='true']) .brand{
          width:44px!important;height:44px!important;margin-inline:auto!important;
          display:grid!important;place-items:center!important;overflow:hidden!important;
          white-space:nowrap!important;font-size:0!important;line-height:1!important;
          color:transparent!important;text-shadow:none!important
        }
        .v2-rail:not([data-expanded='true']) .brand-wordmark,
        .v2-rail:not([data-expanded='true']) .brand small{display:none!important}
        .v2-rail:not([data-expanded='true']) .brand-monogram{
          display:grid!important;place-items:center!important;width:44px;height:44px;
          font:700 1.45rem/1 var(--serif);letter-spacing:-.06em;color:#f2efe8!important;
          text-shadow:0 1px 0 rgba(255,255,255,.025)
        }
        .v2-rail[data-expanded='true'] .brand-monogram{display:none!important}
        .v2-rail[data-expanded='true'] .brand-wordmark{display:inline!important}
      }
    `;
    doc.head.appendChild(style);
  }

  function ensureBrandStructure(doc = root?.document) {
    const brand = doc?.querySelector?.('.v2-rail .brand');
    if (!brand) return null;
    ensureBrandStyle(doc);
    if (brand.dataset.auteurBrandStructure === 'true') return brand;

    const directTextNodes = [...brand.childNodes].filter(node => node.nodeType === 3);
    const wordmarkText = directTextNodes.map(node => node.textContent || '').join(' ').replace(/\s+/g, ' ').trim() || 'Visual Direction OS';
    directTextNodes.forEach(node => node.remove());

    const monogram = doc.createElement('span');
    monogram.className = 'brand-monogram';
    monogram.setAttribute('aria-hidden', 'true');
    monogram.textContent = 'V';

    const wordmark = doc.createElement('span');
    wordmark.className = 'brand-wordmark';
    wordmark.textContent = wordmarkText;

    const small = brand.querySelector('small');
    brand.insertBefore(monogram, brand.firstChild);
    brand.insertBefore(wordmark, small || null);
    brand.dataset.auteurBrandStructure = 'true';
    return brand;
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
    const run = () => {
      ensureBrandStructure(doc);
      apply(doc);
    };
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

  return {
    UI_COPY_SELECTORS:[...UI_COPY_SELECTORS],
    normalizeInterfaceCopy,
    ensureBrandStructure,
    apply,
    start
  };
});