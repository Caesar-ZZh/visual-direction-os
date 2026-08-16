((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualQA = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const result = (id, level, message, detail = '') => ({ id, level, message, detail });
  const matches = (text, regex) => [...String(text || '').matchAll(regex)].map(match => match[1]);

  function scanSource({ html = '', css = '' } = {}) {
    const findings = [];
    const ids = matches(html, /\bid=["']([^"']+)["']/gi);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    findings.push(duplicateIds.length
      ? result('duplicate-id','FAIL','Duplicate IDs found.', duplicateIds.join(', '))
      : result('duplicate-id','PASS','IDs are unique.'));

    const idSet = new Set(ids);
    const refs = matches(html, /\bhref=["']#([^"']+)["']/gi).filter(Boolean);
    const controls = matches(html, /\baria-controls=["']([^"']+)["']/gi).filter(Boolean);
    const broken = [...new Set([...refs, ...controls].filter(ref => !idSet.has(ref)))];
    findings.push(broken.length
      ? result('broken-internal-target','FAIL','Broken internal navigation target found.', broken.join(', '))
      : result('broken-internal-target','PASS','Internal targets resolve.'));

    const hasTransitionAll = /transition\s*:\s*all\b/i.test(css);
    findings.push(hasTransitionAll
      ? result('transition-all','FAIL','`transition: all` is disallowed.','Animate only properties that communicate state, normally transform/opacity.')
      : result('transition-all','PASS','No `transition: all` rule found.'));

    const hasFocusVisible = /:focus-visible\b/i.test(css);
    findings.push(hasFocusVisible
      ? result('focus-visible','PASS','Visible keyboard focus rule exists.')
      : result('focus-visible','FAIL','Missing `:focus-visible` rule.'));

    const hasReducedMotion = /prefers-reduced-motion\s*:\s*reduce/i.test(css);
    findings.push(hasReducedMotion
      ? result('reduced-motion','PASS','Reduced-motion branch exists.')
      : result('reduced-motion','FAIL','Missing reduced-motion branch.'));

    const buttonBodies = [...String(html).matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
    const unnamedButtons = buttonBodies.filter(match => {
      const attrs = match[1];
      const visibleText = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      return !/aria-label\s*=|aria-labelledby\s*=|title\s*=/i.test(attrs) && !visibleText;
    });
    findings.push(unnamedButtons.length
      ? result('accessible-control-name','FAIL','Interactive controls without accessible names found.', String(unnamedButtons.length))
      : result('accessible-control-name','PASS','Interactive controls have accessible names or visible text.'));

    const nestedInteractive = /<button\b[^>]*>[\s\S]*?<a\b|<a\b[^>]*>[\s\S]*?<button\b/i.test(html);
    findings.push(nestedInteractive
      ? result('nested-interactive','FAIL','Nested interactive elements found.')
      : result('nested-interactive','PASS','No obvious nested interactive elements found.'));

    return findings;
  }

  function runDocumentQA(doc = (typeof document !== 'undefined' ? document : null), cssText = '') {
    if (!doc) return [result('document','FAIL','Document is unavailable.')];
    return scanSource({ html: doc.documentElement.outerHTML, css: cssText });
  }

  return { scanSource, runDocumentQA };
});