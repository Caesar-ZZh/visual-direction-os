((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectConstraintInspector = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const label = value => escapeHtml(String(value ?? 'UNKNOWN').toUpperCase());

  function currentRevision(constraint) {
    return constraint?.revisions?.[String(constraint.currentRevision)] || null;
  }

  function resolutionFor(authorityState, constraintId) {
    return (authorityState?.resolutions || []).find(item => item?.constraintId === constraintId) || null;
  }

  function renderCandidate(candidate) {
    return `<article class="project-constraint-card project-constraint-card--candidate" data-project-constraint-candidate="${escapeHtml(candidate.candidateFingerprint)}">
      <header><span>CANDIDATE</span><strong>${label(candidate.type)}</strong></header>
      <div class="project-constraint-route"><span>SOURCE</span><strong>${label(candidate.sourceSceneId)}</strong><i>→</i><span>TARGET</span><strong>${label(candidate.targetSceneId)} / SETUP</strong></div>
      <div class="project-constraint-grid">
        <div><span>FAMILY</span><strong>${label(candidate.family)}</strong></div>
        <div><span>PATH</span><strong>${escapeHtml(candidate.path)}</strong></div>
        <div><span>EXPECTED</span><strong>${label(candidate.expected)}</strong></div>
        <div><span>EVIDENCE</span><strong>COMPILER-BACKED</strong></div>
      </div>
      <p>Verified upstream ownership can be carried through the compatible narrative handoff. This proposal has zero authority until you confirm it.</p>
      <footer><button type="button" data-action="reject-project-constraint" data-candidate-fingerprint="${escapeHtml(candidate.candidateFingerprint)}">REJECT</button><button type="button" data-action="confirm-project-constraint" data-candidate-fingerprint="${escapeHtml(candidate.candidateFingerprint)}">CONFIRM</button></footer>
    </article>`;
  }

  function renderConstraint(constraint, authorityState) {
    const revision = currentRevision(constraint);
    if (!revision) return '';
    const resolution = resolutionFor(authorityState, constraint.constraintId);
    const runtime = constraint.decision === 'revoked' ? 'REVOKED' : (resolution?.status || 'ACTIVE');
    const reason = resolution?.reason || (runtime === 'ACTIVE' ? 'AWAITING SEQUENCE SKELETON' : 'DIRECTOR REVOKED');
    const stale = runtime === 'STALE';
    const conflict = runtime === 'CONFLICT';
    const statusCopy = stale ? 'STALE · AUTHORITY REMOVED' : constraint.decision === 'revoked' ? 'REVOKED' : `CONFIRMED · ${runtime}`;
    const targetSceneId = revision.scope?.targetSceneId || '';
    const beatId = revision.scope?.beatIds?.[0] || 'setup';
    const actions = constraint.decision === 'revoked' ? '' : stale
      ? `<button type="button" data-action="revoke-project-constraint" data-constraint-id="${escapeHtml(constraint.constraintId)}">REVOKE</button><button type="button" data-action="review-project-constraint" data-constraint-id="${escapeHtml(constraint.constraintId)}">REVIEW NEW REVISION</button>`
      : conflict
        ? `<button type="button" data-action="release-project-constraint" data-constraint-id="${escapeHtml(constraint.constraintId)}" data-scene-id="${escapeHtml(targetSceneId)}" data-beat-id="${escapeHtml(beatId)}">RELEASE FOR THIS BEAT</button><button type="button" data-action="revoke-project-constraint" data-constraint-id="${escapeHtml(constraint.constraintId)}">REVOKE</button>`
        : `<button type="button" data-action="revoke-project-constraint" data-constraint-id="${escapeHtml(constraint.constraintId)}">REVOKE</button>`;

    return `<article class="project-constraint-card project-constraint-card--confirmed" data-project-constraint-id="${escapeHtml(constraint.constraintId)}" data-status="${escapeHtml(runtime.toLowerCase())}">
      <header><span>${statusCopy}</span><strong>${label(constraint.type)}</strong></header>
      <div class="project-constraint-route"><span>SOURCE</span><strong>${label(revision.scope?.sourceSceneId)}</strong><i>→</i><span>TARGET</span><strong>${label(targetSceneId)} / ${label(beatId)}</strong></div>
      <div class="project-constraint-grid">
        <div><span>PATH</span><strong>${escapeHtml(revision.path)}</strong></div>
        <div><span>PROJECT</span><strong>${label(revision.expected)}</strong></div>
        <div><span>SCENE COMPILER</span><strong>${resolution?.sceneExpected == null ? '—' : label(resolution.sceneExpected)}</strong></div>
        <div><span>REVISION</span><strong>REV ${String(revision.revision).padStart(2,'0')}</strong></div>
      </div>
      <p><span>WHY</span> ${label(reason)}</p>
      ${conflict ? '<p class="project-constraint-blocked"><strong>WRITE AUTHORITY · BLOCKED</strong><span>AI COMPLETION · NOT STARTED</span></p>' : ''}
      ${stale ? '<p class="project-constraint-blocked"><strong>EXACT AUTHORITY · NONE</strong><span>RECONFIRM OR REVOKE BEFORE SEQUENCE</span></p>' : ''}
      ${actions ? `<footer>${actions}</footer>` : ''}
    </article>`;
  }

  function renderProjectConstraints({ candidates = [], authorityState = null, registry = null } = {}) {
    const constraints = Object.values(registry?.constraints || {});
    const candidateHtml = candidates.map(renderCandidate).join('');
    const constraintHtml = constraints.map(item => renderConstraint(item, authorityState)).join('');
    const empty = !candidateHtml && !constraintHtml
      ? '<div class="project-constraint-empty"><strong>NO PROJECT CONSTRAINTS</strong><span>Verified cross-Scene ownership evidence can become a Director-confirmed commitment here.</span></div>'
      : '';
    return `<section class="project-constraint-panel" data-project-constraints>
      <div class="project-constraint-head"><div><span>PROJECT CONSTRAINTS · DIRECTOR CONTROL</span><h3>Confirmed relationships, never automatic style rules</h3></div><small>DIRECTOR AUTHORITY · NO AUTO-FIX</small></div>
      <p class="project-constraint-note">Candidates are evidence-backed proposals. Confirmed constraints guard future Sequence synthesis but never write Scene State directly.</p>
      <div class="project-constraint-list">${candidateHtml}${constraintHtml}${empty}</div>
    </section>`;
  }

  return { escapeHtml, renderProjectConstraints };
});