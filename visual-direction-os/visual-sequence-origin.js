((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualSequenceOrigin = api;
})(typeof window !== 'undefined' ? window : globalThis, root => {
  'use strict';

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const unique = values => [...new Set(values.filter(Boolean))];
  const displayPath = path => String(path || '').toUpperCase();
  const defer = callback => (root?.queueMicrotask || queueMicrotask)(callback);

  function buildSequenceOrigin({ skeleton, completion, provenance, proposal } = {}) {
    if (provenance?.origin !== 'compiler-first') return null;
    if (!skeleton || !Array.isArray(skeleton.beats)) return null;
    if (!completion?.sequenceCompletion || !Array.isArray(completion.sequenceCompletion.beats)) return null;
    if (!proposal || !Array.isArray(proposal.beats)) return null;

    const fields = provenance.fields && typeof provenance.fields === 'object' ? provenance.fields : {};
    const beats = skeleton.beats.map(skeletonBeat => {
      const prefix = `${skeletonBeat.id}.`;
      const compilerOwned = [];
      const aiCompleted = [];
      for (const [key, meta] of Object.entries(fields)) {
        if (!key.startsWith(prefix)) continue;
        const path = key.slice(prefix.length);
        if (meta?.owner === 'compiler') compilerOwned.push(path);
        else if (meta?.owner === 'ai') aiCompleted.push(path);
      }
      const blocked = Object.entries(skeletonBeat.patchSlots || {})
        .filter(([, slot]) => slot?.status === 'blocked')
        .map(([path]) => path);
      return {
        id: skeletonBeat.id,
        label: skeletonBeat.label || skeletonBeat.id,
        compilerOwned: unique(compilerOwned),
        aiCompleted: unique(aiCompleted),
        blocked: unique(blocked)
      };
    });

    return {
      origin: 'compiler-first',
      skeletonVersion: provenance.skeletonVersion || skeleton.version || null,
      grammarId: provenance.grammarId || skeleton.grammarId || null,
      assembled: proposal.beats.length === skeleton.beats.length,
      beats
    };
  }

  function renderList(label, paths, type) {
    const items = paths.length
      ? paths.map(path => `<span>${escapeHtml(displayPath(path))}</span>`).join('')
      : '<span>—</span>';
    return `<div class="visual-sequence-origin__group" data-origin-group="${escapeHtml(type)}"><strong>${escapeHtml(label)}</strong><div>${items}</div></div>`;
  }

  function renderSequenceOrigin(input = {}) {
    const model = buildSequenceOrigin(input);
    if (!model) return '';
    return `
      <section class="visual-sequence-origin" data-sequence-origin>
        <header class="visual-sequence-origin__head">
          <div><p class="eyebrow">Sequence provenance</p><h4>SEQUENCE ORIGIN · COMPILER-FIRST</h4></div>
          <span>READ-ONLY · PRE-M3</span>
        </header>
        <div class="visual-sequence-origin__summary">
          <div><span>Skeleton</span><strong>${escapeHtml(model.skeletonVersion || 'UNKNOWN')}</strong></div>
          <div><span>Grammar</span><strong>${escapeHtml((model.grammarId || 'unresolved').toUpperCase())}</strong></div>
          <div><span>Assembly</span><strong>${model.assembled ? 'ASSEMBLED' : 'UNRESOLVED'}</strong></div>
        </div>
        <details class="visual-sequence-origin__details" data-sequence-origin-details>
          <summary>Inspect ownership provenance <small>${model.beats.length} canonical beats</small></summary>
          <div class="visual-sequence-origin__beats">
            ${model.beats.map(beat => `
              <article class="visual-sequence-origin__beat" data-origin-beat="${escapeHtml(beat.id)}">
                <header><span>${escapeHtml(beat.label)}</span><small>${escapeHtml(beat.id.toUpperCase())}</small></header>
                <div class="visual-sequence-origin__groups">
                  ${renderList('COMPILER OWNED', beat.compilerOwned, 'compiler')}
                  ${renderList('AI COMPLETED', beat.aiCompleted, 'ai')}
                  ${renderList('BLOCKED', beat.blocked, 'blocked')}
                </div>
              </article>`).join('')}
          </div>
        </details>
      </section>`;
  }

  function initSequenceOrigin(rootNode, options = {}) {
    const target = rootNode || root?.document?.querySelector('#narrative-root');
    if (!target) return null;
    let activeModel = null;
    let lastKey = null;
    let destroyed = false;
    const getWorkspaceController = () => options.workspaceController || root.VDOSNarrativeWorkspaceController;

    function removeSlot() {
      target.querySelector('[data-sequence-origin-slot]')?.remove();
      activeModel = null;
      lastKey = null;
    }

    function ensureSlot() {
      const output = target.querySelector('[data-narrative-output]');
      const applyPreview = output?.querySelector('.narrative-apply-preview');
      if (!output || !applyPreview) return null;
      let slot = output.querySelector('[data-sequence-origin-slot]');
      if (!slot) {
        slot = root.document.createElement('div');
        slot.setAttribute('data-sequence-origin-slot', '');
      }
      const compilerSlot = output.querySelector('[data-visual-compiler-slot]');
      if (compilerSlot) compilerSlot.before(slot);
      else applyPreview.before(slot);
      return slot;
    }

    function sync() {
      if (destroyed) return null;
      const workspace = getWorkspaceController();
      const state = workspace?.getDraftState?.();
      const model = buildSequenceOrigin({
        skeleton: state?.sequenceSkeleton,
        completion: state?.sequenceCompletion,
        provenance: state?.sequenceProvenance,
        proposal: state?.sequenceProposal
      });
      if (!model || !target.querySelector('[data-sequence-proposal-beat]')) {
        removeSlot();
        return null;
      }
      const key = JSON.stringify(model);
      const existing = target.querySelector('[data-sequence-origin-slot]');
      if (existing && key === lastKey) return clone(activeModel || model);
      const slot = ensureSlot();
      if (!slot) return null;
      slot.innerHTML = renderSequenceOrigin({
        skeleton: state.sequenceSkeleton,
        completion: state.sequenceCompletion,
        provenance: state.sequenceProvenance,
        proposal: state.sequenceProposal
      });
      activeModel = clone(model);
      lastKey = key;
      return clone(model);
    }

    const observer = typeof root?.MutationObserver === 'function'
      ? new root.MutationObserver(() => defer(sync))
      : null;
    observer?.observe(target, { childList: true, subtree: true });
    defer(sync);

    return {
      sync,
      getModel: () => activeModel ? clone(activeModel) : null,
      clear: removeSlot,
      destroy() {
        destroyed = true;
        observer?.disconnect();
        removeSlot();
      }
    };
  }

  function autoInit() {
    const target = root?.document?.querySelector('#narrative-root');
    if (!target || root.VDOSVisualSequenceOriginController) return;
    root.VDOSVisualSequenceOriginController = initSequenceOrigin(target);
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', autoInit, { once: true });
    else autoInit();
  }

  return { buildSequenceOrigin, renderSequenceOrigin, initSequenceOrigin };
});
