(function attachComparisonEngine(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function comparisonEngineFactory() {
  'use strict';

  const COMPARISON_STATES = Object.freeze(['resolved', 'regressed', 'stable_pass', 'stable_warn', 'unresolved']);
  const SEMANTIC_STATES = Object.freeze(['improved', 'unchanged', 'regressed', 'not_sure']);

  const METRICS = Object.freeze({
    'saturation-direction': (m) => m?.meanSaturation,
    'detail-density': (m) => Number.isFinite(m?.edgeDensity) && Number.isFinite(m?.entropyProxy) ? m.edgeDensity * 0.45 + m.entropyProxy * 0.55 : null,
    'value-contrast': (m) => Number.isFinite(m?.luminanceStdDev) && Number.isFinite(m?.localContrast) ? m.luminanceStdDev * 0.6 + m.localContrast * 0.4 : null,
    'edge-activity': (m) => m?.edgeDensity,
    'canvas-ratio': (m) => m?.aspectRatio
  });

  function fixed(value, digits = 4) {
    return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
  }

  function comparisonState(checkA, checkB) {
    if (!checkA || !checkB || checkA.evidenceMode !== 'measured' || checkB.evidenceMode !== 'measured') return 'unresolved';
    if (checkA.status === 'warn' && checkB.status === 'pass') return 'resolved';
    if (checkA.status === 'pass' && checkB.status === 'warn') return 'regressed';
    if (checkA.status === 'pass' && checkB.status === 'pass') return 'stable_pass';
    if (checkA.status === 'warn' && checkB.status === 'warn') return 'stable_warn';
    return 'unresolved';
  }

  function metricFor(checkId, measurements) {
    const reader = METRICS[checkId];
    if (!reader) return null;
    const value = reader(measurements || null);
    return Number.isFinite(value) ? fixed(value) : null;
  }

  function indexChecks(artifact) {
    const index = new Map();
    for (const check of artifact?.evaluation?.checks || []) {
      if (!check?.id || check.evidenceMode === 'unsupported') continue;
      index.set(check.id, check);
    }
    return index;
  }

  function measuredRows(artifactA, artifactB, checksA, checksB) {
    const rows = [];
    for (const [checkId, checkA] of checksA) {
      if (checkA.evidenceMode !== 'measured') continue;
      const checkB = checksB.get(checkId);
      if (!checkB || checkB.evidenceMode !== 'measured') continue;
      const metricA = metricFor(checkId, artifactA?.measurements);
      const metricB = metricFor(checkId, artifactB?.measurements);
      rows.push({
        checkId,
        label:checkB.label || checkA.label || checkId,
        target:checkB.target ?? checkA.target ?? null,
        state:comparisonState(checkA, checkB),
        statusA:checkA.status,
        statusB:checkB.status,
        observedA:checkA.observed ?? null,
        observedB:checkB.observed ?? null,
        metricA,
        metricB,
        metricDelta:Number.isFinite(metricA) && Number.isFinite(metricB) ? fixed(metricB - metricA) : null
      });
    }
    return rows;
  }

  function semanticRows(checksA, checksB, directorJudgments) {
    const rows = [];
    for (const [checkId, checkA] of checksA) {
      if (checkA.evidenceMode !== 'human_required') continue;
      const checkB = checksB.get(checkId);
      if (!checkB || checkB.evidenceMode !== 'human_required') continue;
      const decision = directorJudgments?.[checkId] || null;
      const state = decision?.state ?? null;
      if (state != null && !SEMANTIC_STATES.includes(state)) throw new Error(`Unsupported semantic comparison state: ${state}`);
      rows.push({
        checkId,
        label:checkB.label || checkA.label || checkId,
        target:checkB.target ?? checkA.target ?? null,
        state,
        note:String(decision?.note || '').trim(),
        statusA:checkA.status,
        statusB:checkB.status,
        observedA:checkA.observed ?? null,
        observedB:checkB.observed ?? null
      });
    }
    return rows;
  }

  function summarize(rows) {
    const summary = { resolved:0, regressed:0, stablePass:0, stableWarn:0, unresolved:0 };
    for (const row of rows) {
      if (row.state === 'resolved') summary.resolved += 1;
      else if (row.state === 'regressed') summary.regressed += 1;
      else if (row.state === 'stable_pass') summary.stablePass += 1;
      else if (row.state === 'stable_warn') summary.stableWarn += 1;
      else summary.unresolved += 1;
    }
    return summary;
  }

  function compareArtifacts({ artifactA, artifactB, directorJudgments = {} } = {}) {
    if (!artifactA?.id || !artifactB?.id) throw new Error('A/B comparison requires two generation artifacts');
    const checksA = indexChecks(artifactA);
    const checksB = indexChecks(artifactB);
    const measuredComparisons = measuredRows(artifactA, artifactB, checksA, checksB);
    const semanticComparisons = semanticRows(checksA, checksB, directorJudgments);
    return {
      artifactAId:artifactA.id,
      artifactBId:artifactB.id,
      measuredComparisons,
      semanticComparisons,
      summary:summarize(measuredComparisons)
    };
  }

  return {
    M4_COMPARISON_STATES:COMPARISON_STATES,
    M4_SEMANTIC_COMPARISON_STATES:SEMANTIC_STATES,
    comparisonState,
    compareArtifacts
  };
});
