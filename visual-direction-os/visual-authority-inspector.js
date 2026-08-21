((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualAuthorityInspector = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const display = value => value == null ? '—' : String(value).toUpperCase();
  const order = ['CONFIRM','OVERRIDE','INJECT','PARTIAL','BLOCKED'];

  function renderDecision(item) {
    const retained = item.authority !== 'compiler' ? '<em>AI RETAINED · NOT COMPILER-ENDORSED</em>' : '<em>COMPILER AUTHORITATIVE</em>';
    const values = item.action === 'BLOCKED'
      ? `<div><i>EXPECTED · —</i><i>ACTUAL · ${display(item.from)}</i></div>`
      : `<div><i>AI · ${display(item.from)}</i><i>RESOLVED · ${display(item.to)}</i></div>`;
    return `<div class="visual-authority-item" data-authority-action="${esc(item.action)}">
      <span>${esc(item.path)}</span>
      <strong>${esc(item.action)}</strong>
      ${values}
      <small>${esc(item.why || '')}</small>
      ${retained}
    </div>`;
  }

  function renderBeat(beat) {
    return `<section class="visual-authority-beat" data-authority-beat="${esc(beat.id)}">
      <header><div><span>${esc(beat.label || beat.id)}</span><small>${esc(beat.grammarId || 'UNRESOLVED')}</small></div></header>
      <div class="visual-authority-items">${(beat.decisions || []).map(renderDecision).join('') || '<p>NO AUTHORITATIVE CLAIMS</p>'}</div>
    </section>`;
  }

  function renderAuthorityPlan(plan) {
    const totals = plan?.totals || {};
    return `<section class="visual-authority-plan" data-visual-authority-plan>
      <header class="visual-authority-head">
        <div><p class="eyebrow">Compiler authority</p><h4>Guarded handoff at Apply</h4></div>
        <span>GUARDED / APPLY-TIME</span>
      </header>
      <div class="visual-authority-summary">
        <div><span>GRAMMAR</span><strong>${esc((plan?.grammarId || 'unresolved').toUpperCase())}</strong></div>
        ${order.map(key => `<div><span>${key}</span><strong>${Number(totals[key] || 0)}</strong></div>`).join('')}
      </div>
      <p class="visual-authority-note">No mutation has happened yet. Supported compiler claims become authoritative only when Apply is explicit; partial or blocked claims remain AI retained and not compiler-endorsed.</p>
      <div class="visual-authority-beats">${(plan?.beats || []).map(renderBeat).join('')}</div>
    </section>`;
  }

  return { renderAuthorityPlan };
});
