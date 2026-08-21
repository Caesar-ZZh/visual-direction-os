((root, factory) => {
  const bridge = typeof module === 'object' && module.exports
    ? require('./visual-ir-bridge.js')
    : root?.VDOSVisualIRBridge;
  const api = factory(bridge);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualIRInspector = api;
})(typeof window !== 'undefined' ? window : globalThis, bridge => {
  'use strict';

  if (!bridge) throw new Error('VDOSVisualIRBridge is required before visual-ir-inspector.js');

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const upper = value => String(value ?? 'UNKNOWN').toUpperCase();
  const list = value => Array.isArray(value) && value.length ? value.map(upper).join(' / ') : '—';
  const agency = value => Array.isArray(value) && value.length ? value.map(upper).join(' → ') : 'UNKNOWN';

  function renderVisualIRInspector(ir) {
    const checked = bridge.validateVisualIR(ir);
    if (!checked.valid) throw new Error(`Cannot render invalid Visual IR: ${checked.errors.join('; ')}`);

    const unresolvedCount = ir.evidence.unresolved.length;
    const json = escapeHtml(JSON.stringify(ir, null, 2));

    return `
      <section class="visual-ir-shadow" data-visual-ir-shadow aria-labelledby="visual-ir-title">
        <header class="visual-ir-shadow__head">
          <div>
            <p class="eyebrow">Direction Logic / Shadow mode</p>
            <h4 id="visual-ir-title">Direction Logic</h4>
          </div>
          <span class="visual-ir-shadow__status">${escapeHtml(upper(ir.evidence.status))} · ${unresolvedCount} UNRESOLVED</span>
        </header>
        <div class="visual-ir-shadow__grid">
          <div><span>PRIMARY</span><strong>${escapeHtml(upper(ir.direction.primaryVariable.value))}</strong></div>
          <div><span>SUPPORT</span><strong>${escapeHtml(list(ir.direction.supportingVariables.value))}</strong></div>
          <div><span>RESTRAIN</span><strong>${escapeHtml(list(ir.direction.restrainedVariables.value))}</strong></div>
          <div><span>AGENCY</span><strong>${escapeHtml(agency(ir.agency.transition.value))}</strong></div>
        </div>
        <div class="visual-ir-shadow__mechanism">
          <span>MECHANISM</span>
          <p>${escapeHtml(ir.direction.mechanism.value)}</p>
        </div>
        <details data-visual-ir-details class="visual-ir-shadow__details">
          <summary><span>Inspect Visual IR v0.2</span><small>${unresolvedCount} unresolved · no Scene State mutation</small></summary>
          <pre><code>${json}</code></pre>
        </details>
      </section>`;
  }

  return { renderVisualIRInspector };
});
