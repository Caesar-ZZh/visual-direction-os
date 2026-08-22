((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectIntelligenceInspector = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function label(value, fallback = 'UNKNOWN') {
    return escapeHtml(value || fallback).toUpperCase();
  }

  function listLabel(values) {
    const items = Array.isArray(values) ? values.filter(Boolean) : [];
    return items.length ? items.map(value => label(value)).join(' · ') : 'NONE';
  }

  function sourceLabel(source) {
    return label(source || 'unknown');
  }

  function sceneById(state, id) {
    return (state?.scenes || []).find(scene => scene?.sceneId === id) || null;
  }

  function renderResponse(item) {
    const family = label(item?.family);
    const from = label(item?.from);
    const to = label(item?.to);
    const source = sourceLabel(item?.source);
    const change = item?.changed ? `${from} → ${to}` : `${from} · STABLE`;
    return `
      <div class="project-intelligence-response" data-intelligence-family="${escapeHtml(item?.family || 'unknown')}">
        <div class="project-intelligence-response-main"><strong>${family}</strong><span>${change}</span></div>
        <span class="project-intelligence-source">${source}</span>
      </div>`;
  }

  function renderBoundary(state, boundary) {
    const fromScene = sceneById(state, boundary?.fromSceneId);
    const toScene = sceneById(state, boundary?.toSceneId);
    const responses = (boundary?.visualResponse || []).map(renderResponse).join('');
    const fromTitle = escapeHtml(fromScene?.title || boundary?.fromSceneId || 'Scene');
    const toTitle = escapeHtml(toScene?.title || boundary?.toSceneId || 'Scene');
    const causeFrom = label(boundary?.cause?.agencyFrom);
    const causeTo = label(boundary?.cause?.agencyTo);
    const role = label(boundary?.cause?.narrativeRole, 'UNRESOLVED ROLE');
    const status = label(boundary?.status, 'UNRESOLVED');
    const consequence = escapeHtml(boundary?.ownershipConsequence?.summary || 'Ownership consequence unresolved.');
    const why = escapeHtml(boundary?.why || 'Evidence is insufficient to explain this boundary safely.');
    const previousEnd = label(boundary?.handoff?.previousEndingAgency);
    const currentStart = label(boundary?.handoff?.currentStartingAgency);
    const handoffStatus = label(boundary?.handoff?.status, 'UNRESOLVED');
    const grammarFrom = label(fromScene?.grammarId, 'UNRESOLVED');
    const grammarTo = label(toScene?.grammarId, 'UNRESOLVED');
    const provenanceFrom = label(fromScene?.provenanceStatus, 'MISSING');
    const provenanceTo = label(toScene?.provenanceStatus, 'MISSING');

    return `
      <article class="project-intelligence-boundary" data-project-intelligence-boundary="${escapeHtml(boundary?.id || '')}" data-status="${escapeHtml(boundary?.status || 'UNRESOLVED')}">
        <div class="project-intelligence-boundary-head">
          <div>
            <div class="project-intelligence-route">${fromTitle} → ${toTitle}</div>
            <div class="project-intelligence-rule">${label(boundary?.rule, 'UNRESOLVED')}</div>
          </div>
          <span class="project-intelligence-status">${status}</span>
        </div>

        <div class="project-intelligence-causal-grid">
          <section>
            <span class="project-intelligence-kicker">CAUSE · CURRENT SCENE</span>
            <strong>${causeFrom} → ${causeTo}</strong>
            <small>${role}</small>
          </section>
          <section>
            <span class="project-intelligence-kicker">VISUAL RESPONSE</span>
            ${responses || '<span class="project-intelligence-empty-inline">UNRESOLVED</span>'}
          </section>
          <section>
            <span class="project-intelligence-kicker">OWNERSHIP CONSEQUENCE</span>
            <strong>${consequence}</strong>
          </section>
        </div>

        <p class="project-intelligence-why"><span>WHY</span>${why}</p>

        <details class="project-intelligence-detail">
          <summary>Inspect Project Intelligence</summary>
          <div class="project-intelligence-detail-grid">
            <div><span>HANDOFF</span><strong>${previousEnd} → ${currentStart}</strong><small>${handoffStatus}</small></div>
            <div><span>GRAMMAR</span><strong>${grammarFrom}</strong><small>→ ${grammarTo}</small></div>
            <div><span>PROVENANCE</span><strong>${provenanceFrom}</strong><small>→ ${provenanceTo}</small></div>
            <div><span>COMPILER OWNED</span><strong>${listLabel(toScene?.compilerOwnedFamilies)}</strong></div>
            <div><span>AI COMPLETED</span><strong>${listLabel(toScene?.aiCompletedFamilies)}</strong></div>
            <div><span>BLOCKED</span><strong>${listLabel(toScene?.blockedFamilies)}</strong></div>
          </div>
        </details>
      </article>`;
  }

  function renderProjectIntelligence(intelligenceState = {}) {
    const state = intelligenceState || {};
    const status = label(state.status, 'UNRESOLVED');
    const boundaries = Array.isArray(state.boundaries) ? state.boundaries : [];
    const body = boundaries.length
      ? boundaries.map(boundary => renderBoundary(state, boundary)).join('')
      : `
        <div class="project-intelligence-empty" data-status="UNRESOLVED">
          <strong>UNRESOLVED</strong>
          <p>Add or direct at least two Scenes to evaluate a cross-Scene causal boundary.</p>
        </div>`;

    return `
      <section class="project-intelligence-panel" data-project-intelligence-panel data-status="${escapeHtml(state.status || 'UNRESOLVED')}">
        <div class="project-intelligence-head">
          <div>
            <span class="project-intelligence-eyebrow">PROJECT INTELLIGENCE · SHADOW</span>
            <h3>Cause → visual response → ownership consequence</h3>
          </div>
          <span class="project-intelligence-status">${status}</span>
        </div>
        <p class="project-intelligence-note">Read-only provenance analysis. Missing, blocked, legacy, or divergent evidence remains UNRESOLVED.</p>
        <div class="project-intelligence-boundaries">${body}</div>
      </section>`;
  }

  return {
    escapeHtml,
    renderProjectIntelligence
  };
});
