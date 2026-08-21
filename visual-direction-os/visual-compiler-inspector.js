((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualCompilerInspector = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const upper = value => String(value ?? '—').toUpperCase();
  const grammarLabel = id => id ? upper(String(id).replace(/-/g, ' ')) : 'UNRESOLVED GRAMMAR';

  function renderItem(item) {
    if (item.result === 'BLOCKED') {
      return `<div class="visual-compiler-item" data-result="BLOCKED"><span>${escapeHtml(item.path)}</span><strong>BLOCKED</strong><small>${escapeHtml(item.why)}</small></div>`;
    }
    return `<div class="visual-compiler-item" data-result="${escapeHtml(item.result)}"><span>${escapeHtml(item.path)}</span><strong>${escapeHtml(item.result)}</strong><div><i>AI · ${escapeHtml(upper(item.actual))}</i><i>EXPECT · ${escapeHtml(upper(item.expected))}</i></div><small>${escapeHtml(item.why)}</small></div>`;
  }

  function renderBeat(beat) {
    return `<article class="visual-compiler-beat" data-compiler-beat="${escapeHtml(beat.id)}" data-result="${escapeHtml(beat.status)}">
      <header><div><span>${escapeHtml(beat.label || beat.id)}</span><small>AGENCY · ${escapeHtml(upper(beat.agency))}</small></div><strong>${escapeHtml(beat.status)}</strong></header>
      <div class="visual-compiler-items">${(beat.items || []).map(renderItem).join('')}</div>
    </article>`;
  }

  function renderCompilerComparison(comparison = {}) {
    const totals = comparison.totals || { MATCH:0, CONFLICT:0, MISSING:0, BLOCKED:0 };
    const json = escapeHtml(JSON.stringify(comparison, null, 2));
    return `
      <section class="visual-compiler-compare" data-visual-compiler-compare aria-labelledby="visual-compiler-title">
        <header class="visual-compiler-head">
          <div><p class="eyebrow">Sequence Intelligence / Shadow compare</p><h4 id="visual-compiler-title">AI Proposal vs Director Compiler</h4></div>
          <span>DETERMINISTIC / READ-ONLY</span>
        </header>
        <div class="visual-compiler-summary">
          <div><span>GRAMMAR</span><strong>${escapeHtml(grammarLabel(comparison.grammarId))}</strong></div>
          <div><span>MATCH · ${Number(totals.MATCH || 0)}</span></div>
          <div><span>CONFLICT · ${Number(totals.CONFLICT || 0)}</span></div>
          <div><span>MISSING · ${Number(totals.MISSING || 0)}</span></div>
          <div><span>BLOCKED · ${Number(totals.BLOCKED || 0)}</span></div>
        </div>
        <div class="visual-compiler-beats">${(comparison.beats || []).map(renderBeat).join('')}</div>
        <details class="visual-compiler-audit" data-visual-compiler-audit>
          <summary><span>Inspect compiler audit</span><small>categorical comparison · no Scene State mutation</small></summary>
          <pre><code>${json}</code></pre>
        </details>
      </section>`;
  }

  return { renderCompilerComparison };
});
