(function attachMemoryEngine(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function memoryEngineFactory() {
  'use strict';

  const EFFECTIVENESS_STATES = Object.freeze(['resolved', 'regressed', 'unresolved', 'not_applicable']);

  function effectivenessState(entry, comparisonRow, semanticRow) {
    if (entry?.intent === 'preserve') return comparisonRow?.state === 'regressed' || semanticRow?.state === 'regressed' ? 'regressed' : 'not_applicable';
    if (entry?.intent !== 'correct') return 'not_applicable';

    if (entry.evidenceMode === 'measured') {
      if (comparisonRow?.state === 'resolved') return 'resolved';
      if (comparisonRow?.state === 'regressed') return 'regressed';
      return 'unresolved';
    }

    if (entry.evidenceMode === 'human_required') {
      if (semanticRow?.state === 'improved') return 'resolved';
      if (semanticRow?.state === 'regressed') return 'regressed';
      return 'unresolved';
    }

    return 'unresolved';
  }

  function evaluateEffectiveness({ parentDelta, comparison, directorJudgments = {} } = {}) {
    const measured = new Map((comparison?.measuredComparisons || []).map((row) => [row.checkId, row]));
    const semantic = new Map((comparison?.semanticComparisons || []).map((row) => [row.checkId, row]));
    return (parentDelta?.entries || []).map((entry) => {
      let semanticRow = semantic.get(entry.checkId) || null;
      if (!semanticRow && directorJudgments?.[entry.checkId]) {
        const decision = directorJudgments[entry.checkId];
        semanticRow = { checkId:entry.checkId, state:decision.state || null, note:String(decision.note || '').trim() };
      }
      const comparisonRow = measured.get(entry.checkId) || null;
      return {
        checkId:entry.checkId,
        label:entry.label,
        intent:entry.intent,
        evidenceMode:entry.evidenceMode,
        comparisonState:comparisonRow?.state || semanticRow?.state || null,
        state:effectivenessState(entry, comparisonRow, semanticRow)
      };
    });
  }

  function buildPath(artifacts, pathHeadId) {
    const byId = new Map((artifacts || []).map((artifact) => [artifact.id, artifact]));
    const path = [];
    const seen = new Set();
    let current = byId.get(pathHeadId) || null;
    while (current && !seen.has(current.id)) {
      path.push(current);
      seen.add(current.id);
      current = current.parentArtifactId ? byId.get(current.parentArtifactId) || null : null;
    }
    return path.reverse();
  }

  function rowFromCheck(check, artifact, state, evidenceSource, instruction) {
    return {
      checkId:check.id,
      label:check.label || check.id,
      state,
      evidenceSource,
      target:check.target ?? null,
      observed:check.observed ?? null,
      sourceArtifactId:artifact?.id || null,
      instruction
    };
  }

  function measuredInstruction(check, mode) {
    if (mode === 'locked') return `${check.label}: preserve the validated measured behavior. Target: ${check.target ?? 'current validated target'}.`;
    if (mode === 'confirming') return `${check.label}: preserve the newly successful measured behavior and confirm it remains stable. Target: ${check.target ?? 'current target'}.`;
    return `${check.label}: correct the regressed or unresolved measured behavior. Target: ${check.target ?? 'current target'}. Observed: ${check.observed ?? 'current observation'}.`;
  }

  function semanticInstruction(check, mode) {
    if (mode === 'locked') return `${check.label}: preserve the director-confirmed semantic behavior. Target: ${check.target ?? 'director-confirmed target'}.`;
    return `${check.label}: correct the director-identified semantic issue. Target: ${check.target ?? 'current target'}.`;
  }

  function deriveMemoryForPath({ artifacts = [], comparisons = [], pathHeadId, semanticLocks = {} } = {}) {
    void comparisons;
    const path = buildPath(artifacts, pathHeadId);
    const measuredHistory = new Map();
    const semanticLatest = new Map();
    const watchLatest = new Map();

    for (const artifact of path) {
      for (const check of artifact?.evaluation?.checks || []) {
        if (!check?.id) continue;
        if (check.evidenceMode === 'measured' && ['pass', 'warn'].includes(check.status)) {
          if (!measuredHistory.has(check.id)) measuredHistory.set(check.id, []);
          measuredHistory.get(check.id).push({ artifact, check });
          watchLatest.delete(check.id);
        } else if (check.evidenceMode === 'human_required') {
          semanticLatest.set(check.id, { artifact, check });
        } else if (check.evidenceMode === 'unsupported' || ['unsupported', 'needs_judgment', 'not_sure'].includes(check.status)) {
          watchLatest.set(check.id, { artifact, check });
        }
      }
    }

    const locked = [];
    const active = [];
    const watch = [];

    for (const history of measuredHistory.values()) {
      const current = history[history.length - 1];
      const previous = history.length > 1 ? history[history.length - 2] : null;
      const { check, artifact } = current;
      if (check.status === 'warn') {
        const regressed = previous?.check?.status === 'pass';
        active.push(rowFromCheck(check, artifact, regressed ? 'regressed' : 'unresolved', 'measured', measuredInstruction(check, 'active')));
      } else if (check.status === 'pass' && previous?.check?.status === 'pass') {
        locked.push(rowFromCheck(check, artifact, 'locked', 'measured', measuredInstruction(check, 'locked')));
      } else if (check.status === 'pass') {
        active.push(rowFromCheck(check, artifact, 'confirming', 'measured', measuredInstruction(check, 'confirming')));
      }
    }

    for (const [checkId, current] of semanticLatest) {
      const { check, artifact } = current;
      if (check.status === 'needs_work') {
        active.push(rowFromCheck(check, artifact, 'unresolved', 'director-confirmed', semanticInstruction(check, 'active')));
      } else if (check.status === 'pass' && semanticLocks[checkId] === true) {
        locked.push(rowFromCheck(check, artifact, 'locked', 'director-confirmed', semanticInstruction(check, 'locked')));
      } else {
        watch.push(rowFromCheck(check, artifact, check.status || 'unresolved', 'unresolved', `${check.label}: retain for director review; do not force as a generation instruction.`));
      }
      watchLatest.delete(checkId);
    }

    for (const { artifact, check } of watchLatest.values()) {
      if (locked.some((row) => row.checkId === check.id) || active.some((row) => row.checkId === check.id) || watch.some((row) => row.checkId === check.id)) continue;
      watch.push(rowFromCheck(check, artifact, check.status || 'unresolved', 'unresolved', `${check.label}: evidence is unresolved; do not force as a generation instruction.`));
    }

    return { pathArtifactIds:path.map((artifact) => artifact.id), locked, active, watch };
  }

  function dedupe(values) {
    const seen = new Set();
    const result = [];
    for (const value of values || []) {
      const text = String(value || '').trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      result.push(text);
    }
    return result;
  }

  function compileMemoryAppendix({ currentDelta, memory } = {}) {
    const entries = currentDelta?.entries || [];
    const preserve = dedupe([
      ...(memory?.locked || []).map((row) => row.instruction || `${row.label}: preserve the validated behavior.`),
      ...entries.filter((entry) => entry.intent === 'preserve').map((entry) => entry.instruction)
    ]);
    const correct = dedupe([
      ...(memory?.active || []).map((row) => row.instruction || `${row.label}: correct the regressed or unresolved behavior.`),
      ...entries.filter((entry) => entry.intent === 'correct').map((entry) => entry.instruction)
    ]);

    const sections = [];
    if (preserve.length) sections.push(`PRESERVE LOCKED:\n${preserve.map((item) => `- ${item}`).join('\n')}`);
    if (correct.length) sections.push(`CORRECT ACTIVE:\n${correct.map((item) => `- ${item}`).join('\n')}`);
    return sections.length ? `ITERATION / DIRECTOR MEMORY\n\n${sections.join('\n\n')}` : '';
  }

  return {
    M4_EFFECTIVENESS_STATES:EFFECTIVENESS_STATES,
    effectivenessState,
    evaluateEffectiveness,
    deriveMemoryForPath,
    compileMemoryAppendix
  };
});
