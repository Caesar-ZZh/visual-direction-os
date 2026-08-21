((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualSequenceOrigin = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const unique = values => [...new Set(values.filter(Boolean))];
  const displayPath = path => String(path || '').toUpperCase();

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

  return { buildSequenceOrigin, renderSequenceOrigin };
});
