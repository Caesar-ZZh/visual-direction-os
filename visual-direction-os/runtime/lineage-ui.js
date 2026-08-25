(function attachLineageUI(root) {
  'use strict';
  if (!root || !root.document) return;

  const document = root.document;
  const $ = (selector, base = document) => base.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const state = { snapshot:null, selectedBranchId:null, imageTokens:new Map() };

  function m4() { return root.VisualDirectionOS?.m4 || null; }
  function generationLabel(artifact) { return `GEN ${String(artifact?.generationIndex || '?').padStart(2, '0')}`; }
  function artifactById(id) { return state.snapshot?.artifacts?.find((artifact) => artifact.id === id) || null; }
  function statusLabel(value) { return String(value || 'unresolved').replace(/_/g, ' ').toUpperCase(); }
  function formatTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  }
  function formatStorage(storage) {
    if (!storage || !Number.isFinite(storage.usage)) return 'Storage estimate unavailable';
    const mb = storage.usage / (1024 * 1024);
    const quotaMb = Number.isFinite(storage.quota) ? storage.quota / (1024 * 1024) : null;
    return quotaMb == null ? `${mb.toFixed(1)} MB used` : `${mb.toFixed(1)} MB / ${quotaMb.toFixed(1)} MB`;
  }

  function buildPanel() {
    const generation = $('#generation-console');
    if (!generation || $('#iteration-memory-console')) return;
    const section = document.createElement('section');
    section.id = 'iteration-memory-console';
    section.className = 'iteration-memory-console';
    section.hidden = true;
    section.innerHTML = `
      <header class="m4-head">
        <div><small>ITERATION MEMORY / M4</small><h3>Compare the lineage. <em>Protect what worked.</em></h3><p>Persistent generations, comparative evidence, and branch-aware director memory.</p></div>
        <div class="m4-storage-summary"><span>PROJECT STORAGE</span><strong id="m4-generation-count">0 generations</strong><small id="m4-storage-usage">Storage estimate unavailable</small></div>
      </header>
      <p class="m4-warning" id="m4-warning" hidden></p>
      <section class="m4-lineage-section">
        <header><div><span>GENERATION LINEAGE</span><h4>Branches stay branches.</h4></div><small>Click a generation to choose a branch action target.</small></header>
        <div class="m4-lineage" id="m4-lineage"></div>
      </section>
      <section class="m4-ab-section">
        <header><div><span>A / B VIEWER</span><h4>Compare any two persisted generations.</h4></div><div class="m4-ab-selectors"><label>A<select id="m4-select-a"></select></label><label>B<select id="m4-select-b"></select></label></div></header>
        <div class="m4-ab-viewer"><article data-side="a"><header><span>A</span><strong id="m4-a-label">—</strong></header><div class="m4-image-frame" id="m4-image-a"></div></article><article data-side="b"><header><span>B</span><strong id="m4-b-label">—</strong></header><div class="m4-image-frame" id="m4-image-b"></div></article></div>
      </section>
      <section class="m4-comparison-section">
        <header><div><span>COMPARATIVE QA</span><h4>Measured change and director judgment stay separate.</h4></div><div class="m4-comparison-summary" id="m4-comparison-summary"></div></header>
        <div class="m4-measured-compare"><div class="m4-compare-table-head"><span>CHECK</span><span>TARGET</span><span>A</span><span>B</span><span>RESULT</span></div><div id="m4-measured-rows"></div></div>
        <div class="m4-semantic-compare"><header><span>SEMANTIC COMPARISON</span><small>Director evidence only</small></header><div id="m4-semantic-rows"></div></div>
      </section>
      <section class="m4-memory-section">
        <header><div><span>DIRECTOR MEMORY</span><h4>Locked, active, and unresolved rules.</h4></div><small id="m4-memory-path">No active path</small></header>
        <div class="m4-memory-columns"><article><span>LOCKED</span><div id="m4-memory-locked"></div></article><article><span>ACTIVE CORRECTION</span><div id="m4-memory-active"></div></article><article><span>WATCH / UNRESOLVED</span><div id="m4-memory-watch"></div></article></div>
      </section>
      <section class="m4-actions"><div><span>BRANCH TARGET</span><strong id="m4-branch-target">Select a generation</strong><small id="m4-branch-meta">—</small></div><div class="m4-action-buttons"><button type="button" id="m4-redirect-branch" disabled>RE-DIRECT FROM THIS GENERATION</button><button type="button" id="m4-delete-branch" disabled>DELETE THIS BRANCH</button><button type="button" id="m4-clear-project">CLEAR PROJECT MEMORY</button></div></section>`;
    generation.append(section);

    $('#m4-select-a')?.addEventListener('change', (event) => m4()?.selectA?.(event.target.value || null));
    $('#m4-select-b')?.addEventListener('change', (event) => m4()?.selectB?.(event.target.value || null));
    $('#m4-redirect-branch')?.addEventListener('click', redirectBranch);
    $('#m4-delete-branch')?.addEventListener('click', deleteBranch);
    $('#m4-clear-project')?.addEventListener('click', clearProject);
  }

  function comparisonForArtifact(artifact) {
    const comparisons = state.snapshot?.comparisons || [];
    const matches = comparisons.filter((row) => row.artifactBId === artifact.id);
    return matches.sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]?.comparison || null;
  }

  function buildTree(artifacts) {
    const children = new Map();
    const roots = [];
    for (const artifact of artifacts) {
      const parentId = artifact.parentArtifactId || null;
      if (!parentId || !artifacts.some((candidate) => candidate.id === parentId)) roots.push(artifact);
      else {
        if (!children.has(parentId)) children.set(parentId, []);
        children.get(parentId).push(artifact);
      }
    }
    for (const list of children.values()) list.sort((a,b) => (a.generationIndex || 0) - (b.generationIndex || 0));
    roots.sort((a,b) => (a.generationIndex || 0) - (b.generationIndex || 0));
    return { roots, children };
  }

  function lineageNode(artifact, children, depth = 0) {
    const comparison = comparisonForArtifact(artifact);
    const resolved = comparison?.summary?.resolved || 0;
    const regressed = comparison?.summary?.regressed || 0;
    const persistence = artifact.persistenceStatus || (artifact.evaluation ? 'pending' : 'evaluating');
    const childHtml = (children.get(artifact.id) || []).map((child) => lineageNode(child, children, depth + 1)).join('');
    return `<div class="m4-lineage-branch" style="--branch-depth:${depth}"><button type="button" class="m4-lineage-node${state.selectedBranchId === artifact.id ? ' is-selected' : ''}" data-artifact="${escapeHtml(artifact.id)}"><span>${escapeHtml(generationLabel(artifact))}</span><strong>${escapeHtml(formatTime(artifact.createdAt))}</strong><small>${artifact.parentArtifactId ? `parent ${escapeHtml(artifact.parentArtifactId.slice(0, 12))}` : 'BASE'} · ${escapeHtml(persistence)}</small><em>${resolved} resolved · ${regressed} regressed</em></button>${childHtml ? `<div class="m4-lineage-children">${childHtml}</div>` : ''}</div>`;
  }

  function renderLineage() {
    const node = $('#m4-lineage');
    if (!node) return;
    const artifacts = state.snapshot?.artifacts || [];
    if (!artifacts.length) {
      node.innerHTML = '<p class="m4-empty">No generations yet. Generate and evaluate a frame to start the lineage.</p>';
      return;
    }
    const tree = buildTree(artifacts);
    node.innerHTML = tree.roots.map((rootArtifact) => lineageNode(rootArtifact, tree.children)).join('');
    node.querySelectorAll('[data-artifact]').forEach((button) => button.addEventListener('click', () => {
      state.selectedBranchId = button.dataset.artifact;
      renderLineage();
      renderBranchActions();
    }));
  }

  function selectorOptions(selectedId) {
    const artifacts = state.snapshot?.artifacts || [];
    return `<option value="">—</option>${artifacts.map((artifact) => `<option value="${escapeHtml(artifact.id)}"${artifact.id === selectedId ? ' selected' : ''}>${escapeHtml(generationLabel(artifact))} · ${escapeHtml(artifact.id.slice(0, 12))}</option>`).join('')}`;
  }

  function renderSelectors() {
    const a = $('#m4-select-a');
    const b = $('#m4-select-b');
    if (a) a.innerHTML = selectorOptions(state.snapshot?.selectedAId || null);
    if (b) b.innerHTML = selectorOptions(state.snapshot?.selectedBId || null);
  }

  async function renderImage(side, artifactId) {
    const frame = $(`#m4-image-${side}`);
    const label = $(`#m4-${side}-label`);
    if (!frame || !label) return;
    const artifact = artifactById(artifactId);
    if (!artifact) {
      label.textContent = '—';
      frame.innerHTML = '<p class="m4-image-empty">Select a generation.</p>';
      return;
    }
    label.textContent = `${generationLabel(artifact)} · ${artifact.id}`;
    if (artifact.persistenceStatus === 'meta_only' && !artifact.result?.src) {
      frame.innerHTML = '<p class="m4-image-empty">IMAGE NOT PERSISTED<br><small>Metadata and QA remain available.</small></p>';
      return;
    }

    const token = Symbol(side);
    state.imageTokens.set(side, token);
    frame.innerHTML = '<p class="m4-image-empty">Loading image…</p>';
    try {
      const src = await m4()?.getRenderableImage?.(artifact.id);
      if (state.imageTokens.get(side) !== token) return;
      frame.innerHTML = src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(generationLabel(artifact))}">` : '<p class="m4-image-empty">IMAGE NOT AVAILABLE</p>';
    } catch (error) {
      if (state.imageTokens.get(side) === token) frame.innerHTML = `<p class="m4-image-empty">${escapeHtml(error.message || 'Image unavailable')}</p>`;
    }
  }

  function renderComparisonSummary() {
    const node = $('#m4-comparison-summary');
    if (!node) return;
    const summary = state.snapshot?.comparison?.summary;
    if (!summary) {
      node.innerHTML = '<span>SELECT A / B</span>';
      return;
    }
    node.innerHTML = `<span><b>${summary.resolved}</b> RESOLVED</span><span><b>${summary.regressed}</b> REGRESSED</span><span><b>${summary.stablePass}</b> STABLE PASS</span><span><b>${summary.stableWarn}</b> STABLE WARN</span><span><b>${summary.unresolved}</b> UNRESOLVED</span>`;
  }

  function renderMeasuredComparison() {
    const node = $('#m4-measured-rows');
    if (!node) return;
    const rows = state.snapshot?.comparison?.measuredComparisons || [];
    if (!rows.length) {
      node.innerHTML = '<p class="m4-empty">No comparable measured evidence.</p>';
      return;
    }
    node.innerHTML = rows.map((row) => `<article class="m4-compare-row" data-state="${escapeHtml(row.state)}"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.target || '—')}</span><span>${escapeHtml(row.metricA ?? row.observedA ?? '—')}<small>${escapeHtml(row.statusA || '')}</small></span><span>${escapeHtml(row.metricB ?? row.observedB ?? '—')}<small>${escapeHtml(row.statusB || '')}</small></span><b>${escapeHtml(statusLabel(row.state))}</b></article>`).join('');
  }

  function renderSemanticComparison() {
    const node = $('#m4-semantic-rows');
    if (!node) return;
    const rows = state.snapshot?.comparison?.semanticComparisons || [];
    if (!rows.length) {
      node.innerHTML = '<p class="m4-empty">Select an evaluated A/B pair for semantic comparison.</p>';
      return;
    }
    node.innerHTML = rows.map((row) => `<article class="m4-semantic-row" data-check="${escapeHtml(row.checkId)}"><div><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.target || '—')}</small></div><div class="m4-semantic-actions">${['improved','unchanged','regressed','not_sure'].map((value) => `<button type="button" data-state="${value}" aria-pressed="${row.state === value}">${statusLabel(value)}</button>`).join('')}</div><label><span>COMPARISON NOTE</span><input data-note value="${escapeHtml(row.note || '')}" placeholder="What changed between A and B?"></label></article>`).join('');
    node.querySelectorAll('.m4-semantic-row').forEach((rowNode) => {
      const checkId = rowNode.dataset.check;
      rowNode.querySelectorAll('[data-state]').forEach((button) => button.addEventListener('click', async () => {
        const note = rowNode.querySelector('[data-note]')?.value || '';
        await m4()?.setSemanticJudgment?.(checkId, button.dataset.state, note);
      }));
    });
  }

  function memoryRows(rows, emptyCopy) {
    if (!rows?.length) return `<p class="m4-empty">${escapeHtml(emptyCopy)}</p>`;
    return rows.map((row) => `<article class="m4-memory-row"><div><strong>${escapeHtml(row.label)}</strong><b>${escapeHtml(statusLabel(row.state))}</b></div><p>${escapeHtml(row.instruction || row.target || '')}</p><small>${escapeHtml(row.evidenceSource || 'unresolved')} · ${escapeHtml(row.sourceArtifactId || 'unknown')} · ${escapeHtml(row.checkId)}</small></article>`).join('');
  }

  function renderMemory() {
    const memory = state.snapshot?.memory || { locked:[], active:[], watch:[], pathArtifactIds:[] };
    if ($('#m4-memory-locked')) $('#m4-memory-locked').innerHTML = memoryRows(memory.locked, 'No validated locks yet.');
    if ($('#m4-memory-active')) $('#m4-memory-active').innerHTML = memoryRows(memory.active, 'No active correction.');
    if ($('#m4-memory-watch')) $('#m4-memory-watch').innerHTML = memoryRows(memory.watch, 'No unresolved evidence.');
    const path = $('#m4-memory-path');
    if (path) path.textContent = memory.pathArtifactIds?.length ? `PATH / ${memory.pathArtifactIds.map((id) => id.slice(0, 8)).join(' → ')}` : 'No active path';
  }

  function renderBranchActions() {
    const artifact = artifactById(state.selectedBranchId);
    const target = $('#m4-branch-target');
    const meta = $('#m4-branch-meta');
    const redirect = $('#m4-redirect-branch');
    const remove = $('#m4-delete-branch');
    if (target) target.textContent = artifact ? `${generationLabel(artifact)} · ${artifact.id}` : 'Select a generation';
    if (meta) meta.textContent = artifact ? `${artifact.parentArtifactId ? `parent ${artifact.parentArtifactId}` : 'BASE'} · ${artifact.persistenceStatus || 'session'}` : '—';
    if (redirect) redirect.disabled = !artifact?.evaluationDelta;
    if (remove) remove.disabled = !artifact;
  }

  function renderStatus() {
    const artifacts = state.snapshot?.artifacts || [];
    if ($('#m4-generation-count')) $('#m4-generation-count').textContent = `${artifacts.length} generation${artifacts.length === 1 ? '' : 's'}`;
    if ($('#m4-storage-usage')) $('#m4-storage-usage').textContent = formatStorage(state.snapshot?.storage);
    const warning = $('#m4-warning');
    const message = state.snapshot?.restoreError ? `M4 restore unavailable: ${state.snapshot.restoreError}` : state.snapshot?.persistenceWarning || '';
    if (warning) { warning.hidden = !message; warning.textContent = message; }
  }

  async function redirectBranch() {
    const artifact = artifactById(state.selectedBranchId);
    if (!artifact) return;
    const button = $('#m4-redirect-branch');
    if (button) { button.disabled = true; button.textContent = 'GENERATING BRANCH…'; }
    try {
      await m4()?.redirectFromArtifact?.(artifact.id);
    } catch (error) {
      const warning = $('#m4-warning');
      if (warning) { warning.hidden = false; warning.textContent = error.message || 'Branch generation failed.'; }
    } finally {
      if (button) { button.textContent = 'RE-DIRECT FROM THIS GENERATION'; renderBranchActions(); }
    }
  }

  async function deleteBranch() {
    const artifact = artifactById(state.selectedBranchId);
    if (!artifact) return;
    if (!root.confirm?.(`Delete ${generationLabel(artifact)} and all descendants from this project memory?`)) return;
    await m4()?.deleteSubtree?.(artifact.id);
    state.selectedBranchId = null;
  }

  async function clearProject() {
    if (!root.confirm?.('Clear all persisted M4 project memory? This cannot be undone.')) return;
    await m4()?.clearProject?.();
    state.selectedBranchId = null;
  }

  function render(snapshot) {
    state.snapshot = snapshot || null;
    const panel = $('#iteration-memory-console');
    if (!panel) return;
    panel.hidden = false;
    if (state.selectedBranchId && !artifactById(state.selectedBranchId)) state.selectedBranchId = null;
    renderStatus();
    renderLineage();
    renderSelectors();
    renderImage('a', snapshot?.selectedAId || null);
    renderImage('b', snapshot?.selectedBId || null);
    renderComparisonSummary();
    renderMeasuredComparison();
    renderSemanticComparison();
    renderMemory();
    renderBranchActions();
  }

  buildPanel();
  root.addEventListener('vdos:m4-state', (event) => render(event.detail?.state || null));
  const existing = m4()?.getState?.();
  if (existing) render(existing);
})(typeof globalThis !== 'undefined' ? globalThis : window);
