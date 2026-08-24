((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSGenerationPromptInspector = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const BEAT_LABELS = {
    setup:'SETUP', pressure:'PRESSURE', rupture:'RUPTURE', release:'RELEASE', 'new-ownership':'NEW OWNERSHIP'
  };
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const escapeHTML = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function assertPromptSet(promptSet) {
    if (!promptSet || typeof promptSet !== 'object' || !Array.isArray(promptSet.beatOrder) || !Array.isArray(promptSet.packages)) {
      throw new Error('Generation Prompt Inspector requires a Prompt Set.');
    }
  }

  function packageForBeat(promptSet, beatId) {
    return promptSet.packages.find(item => item?.promptIR?.beatId === beatId) || null;
  }

  function buildInspectorModel(promptSet, { activeBeatId = 'setup', view = 'structure' } = {}) {
    assertPromptSet(promptSet);
    const beatOrder = promptSet.beatOrder.filter(beatId => Boolean(packageForBeat(promptSet, beatId)));
    const normalizedBeat = beatOrder.includes(activeBeatId) ? activeBeatId : (beatOrder[0] || 'setup');
    const normalizedView = view === 'rendered' ? 'rendered' : 'structure';
    const activePackage = packageForBeat(promptSet, normalizedBeat);
    return {
      sceneId: promptSet.sceneId || null,
      summary: clone(promptSet.summary || {}),
      activeBeatId: normalizedBeat,
      view: normalizedView,
      beats: beatOrder.map(beatId => {
        const pkg = packageForBeat(promptSet, beatId);
        return {
          id: beatId,
          label: BEAT_LABELS[beatId] || String(beatId).toUpperCase(),
          status: pkg?.readiness?.status || 'DRAFT',
          reasons: clone(pkg?.readiness?.reasons || [])
        };
      }),
      activePackage: clone(activePackage)
    };
  }

  function rows(items, formatter) {
    if (!items?.length) return '<p class="generation-prompt-empty">—</p>';
    return `<div class="generation-prompt-rows">${items.map(formatter).join('')}</div>`;
  }

  function badge(label, value) {
    return `<span class="generation-prompt-badge"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong></span>`;
  }

  function renderRequired(item) {
    const identity = item.kind === 'exact' ? (item.path || 'exact') : (item.key || 'structural');
    const value = Array.isArray(item.value) ? item.value.join(' · ') : item.value;
    const support = (item.projectSupport || []).map(entry => entry.constraintId).filter(Boolean);
    return `<div class="generation-prompt-row"><div><small>${escapeHTML(item.kind || 'required')}</small><strong>${escapeHTML(identity)}</strong></div><span>${escapeHTML(value)}</span><em>${escapeHTML(item.owner || '—')}</em>${support.length ? `<p>PROJECT SUPPORT · ${escapeHTML(support.join(' · '))}</p>` : ''}</div>`;
  }

  function renderGuided(item) {
    const value = typeof item.value === 'object' ? JSON.stringify(item.value) : item.value;
    return `<div class="generation-prompt-row"><div><small>guided</small><strong>${escapeHTML(item.path || 'guidance')}</strong></div><span>${escapeHTML(value)}</span><em>${escapeHTML(item.owner || 'ai')}</em></div>`;
  }

  function renderOpen(item) {
    return `<div class="generation-prompt-row"><div><small>open</small><strong>${escapeHTML(item.field || item.path || 'field')}</strong></div><span>Intentional generation freedom</span><em>${escapeHTML(item.owner || 'none')}</em></div>`;
  }

  function renderBlocked(item) {
    return `<div class="generation-prompt-row"><div><small>blocked</small><strong>${escapeHTML(item.path || 'field')}</strong></div><span>${escapeHTML(item.reason || 'Exact assertion unavailable.')}</span><em>${escapeHTML(item.owner || 'none')}</em></div>`;
  }

  function renderProjectSupport(ir) {
    const refs = ir?.provenance?.projectConstraintRefs || [];
    if (!refs.length) return '<p class="generation-prompt-empty">No active Project support for this Beat.</p>';
    return rows(refs, entry => `<div class="generation-prompt-row"><div><small>constraint</small><strong>${escapeHTML(entry.constraintId || '—')}</strong></div><span>${escapeHTML(entry.path || '—')}</span><em>REV ${escapeHTML(entry.revision ?? '—')}</em></div>`);
  }

  function renderApplyEvidence(ir) {
    const receipt = ir?.provenance?.applyEvidence;
    if (!receipt) return '<p class="generation-prompt-empty">Not applied.</p>';
    return `<div class="generation-prompt-evidence">${badge('BEAT', receipt.beatId || ir.beatId || '—')}${badge('APPLY REV', receipt.applyRevision ?? '—')}${badge('PROPOSAL', receipt.proposalBeatFingerprint || '—')}${badge('PROVENANCE', receipt.provenanceFingerprint || '—')}${badge('SEQUENCE', receipt.sequenceDirectorBeatFingerprint || '—')}</div>`;
  }

  function renderStructure(pkg) {
    const ir = pkg?.promptIR || {};
    const content = ir.content || {};
    return `<div class="generation-prompt-structure">
      <section><h5>CONTENT</h5><p>${escapeHTML(content.sceneDescription?.value || '—')}</p><p class="generation-prompt-subtle">Beat realization · ${escapeHTML(content.beatRealization?.value || '—')}</p></section>
      <section><h5>REQUIRED</h5>${rows(ir.required || [], renderRequired)}</section>
      <section><h5>GUIDED</h5>${rows(ir.guided || [], renderGuided)}</section>
      <section><h5>OPEN</h5>${rows(ir.open || [], renderOpen)}</section>
      <section><h5>BLOCKED</h5>${rows(ir.blocked || [], renderBlocked)}</section>
      <section><h5>PROJECT SUPPORT</h5>${renderProjectSupport(ir)}</section>
      <section><h5>APPLY EVIDENCE</h5>${renderApplyEvidence(ir)}</section>
    </div>`;
  }

  function renderRendered(pkg) {
    const rendered = pkg?.rendered;
    if (!rendered) {
      const reasons = (pkg?.readiness?.reasons || []).map(item => item.code).filter(Boolean);
      return `<div class="generation-prompt-rendered generation-prompt-rendered--unavailable"><h5>RENDERED PROMPT UNAVAILABLE</h5><p>${escapeHTML(reasons.join(' · ') || 'Prompt rendering is unavailable for the current authority state.')}</p></div>`;
    }
    return `<div class="generation-prompt-rendered">
      <section><h5>GENERATION-FACING</h5><pre>${escapeHTML(rendered.neutralText || '')}</pre></section>
      <section><h5>NEGATIVE GUIDANCE</h5><pre>${escapeHTML(rendered.negativeText || '—')}</pre></section>
      <section><h5>AUDIT / PROVENANCE</h5><pre>${escapeHTML(rendered.auditText || '—')}</pre></section>
    </div>`;
  }

  function renderGenerationPromptInspector(promptSet, options = {}) {
    const model = buildInspectorModel(promptSet, options);
    const pkg = model.activePackage;
    const status = pkg?.readiness?.status || 'DRAFT';
    const reasons = (pkg?.readiness?.reasons || []).map(item => item.code).filter(Boolean);
    return `<section class="generation-prompt-panel" data-generation-prompt-panel data-status="${escapeHTML(status.toLowerCase())}">
      <header class="generation-prompt-head"><div><span>GENERATION PROMPT · ${escapeHTML(status)}</span><h4>Scene ${escapeHTML(model.sceneId || '—')} · ${escapeHTML(BEAT_LABELS[model.activeBeatId] || model.activeBeatId)}</h4></div><small>${escapeHTML(reasons.join(' · ') || 'DIRECTING TRUTH CURRENT')}</small></header>
      <div class="generation-prompt-beats" role="tablist" aria-label="Generation Prompt Beats">${model.beats.map(beat => `<button type="button" data-generation-prompt-beat="${escapeHTML(beat.id)}" aria-pressed="${beat.id === model.activeBeatId}"><small>${escapeHTML(beat.label)}</small><span>${escapeHTML(beat.status)}</span></button>`).join('')}</div>
      <div class="generation-prompt-views" role="group" aria-label="Generation Prompt view"><button type="button" data-generation-prompt-view="structure" aria-pressed="${model.view === 'structure'}">STRUCTURE</button><button type="button" data-generation-prompt-view="rendered" aria-pressed="${model.view === 'rendered'}">RENDERED</button></div>
      <div class="generation-prompt-body">${model.view === 'rendered' ? renderRendered(pkg) : renderStructure(pkg)}</div>
    </section>`;
  }

  function initGenerationPromptInspector(rootNode, { getPromptSet, initialBeatId = 'setup' } = {}) {
    if (!rootNode || typeof getPromptSet !== 'function') return { destroy() {}, sync() { return false; } };
    let activeBeatId = initialBeatId;
    let view = 'structure';
    let observer = null;
    let slot = null;

    const ensureSlot = () => {
      if (slot?.isConnected) return slot;
      slot = rootNode.querySelector?.('[data-generation-prompt-slot]') || null;
      if (slot) return slot;
      const applyPreview = rootNode.querySelector?.('.narrative-apply-preview');
      if (!applyPreview?.parentNode) return null;
      slot = rootNode.ownerDocument.createElement('div');
      slot.setAttribute('data-generation-prompt-slot', '');
      applyPreview.parentNode.insertBefore(slot, applyPreview);
      return slot;
    };

    const render = () => {
      const target = ensureSlot();
      const promptSet = getPromptSet();
      if (!target || !promptSet) {
        if (target) target.replaceChildren();
        return false;
      }
      const model = buildInspectorModel(promptSet, { activeBeatId, view });
      activeBeatId = model.activeBeatId;
      view = model.view;
      target.innerHTML = renderGenerationPromptInspector(promptSet, { activeBeatId, view });
      target.querySelectorAll('[data-generation-prompt-beat]').forEach(button => button.addEventListener('click', () => {
        activeBeatId = button.dataset.generationPromptBeat;
        render();
      }));
      target.querySelectorAll('[data-generation-prompt-view]').forEach(button => button.addEventListener('click', () => {
        view = button.dataset.generationPromptView === 'rendered' ? 'rendered' : 'structure';
        render();
      }));
      return true;
    };

    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => render());
      observer.observe(rootNode, { childList:true, subtree:true });
    }
    render();
    return { sync:render, destroy() { observer?.disconnect(); slot?.replaceChildren(); } };
  }

  return { buildInspectorModel, renderGenerationPromptInspector, initGenerationPromptInspector };
});