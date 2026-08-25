(function attachEvaluationEngine(root, factory) {
  let deps = {};
  if (typeof module !== 'undefined' && module.exports) deps = require('./image-measurements.js');
  else if (root) deps = root.VisualDirectionRuntime || {};
  const api = factory(deps);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function evaluationEngineFactory(runtime) {
  'use strict';

  const { compareRatio } = runtime;

  function valueOf(node, fallback = 'unknown') {
    if (node && typeof node === 'object' && 'value' in node) return node.value;
    return node ?? fallback;
  }

  function textOf(node) { return String(valueOf(node, 'unknown') || 'unknown').trim(); }
  function normalized(node) { return textOf(node).toLowerCase(); }
  function fixed(value) { return Number.isFinite(value) ? Number(value.toFixed(3)) : null; }

  function directionFromText(node, dimension) {
    const text = normalized(node);
    if (!text || text === 'unknown' || /evidence incomplete/.test(text)) return null;
    if (dimension === 'saturation') {
      if (/\bhigh saturation\b|\bhighly saturated\b|\bvivid saturation\b|\bintense saturation\b/.test(text)) return 'high';
      if (/\blow saturation\b|\bdesaturated\b|\bmuted\b|\brestrained\b|reserve saturation|functional accents only|hierarchy before palette/.test(text)) return 'low';
      if (/\bmoderate saturation\b|\bbalanced saturation\b/.test(text)) return 'moderate';
      return null;
    }
    if (dimension === 'detail') {
      if (/\bhigh\b|\bdense\b/.test(text)) return 'high';
      if (/\blow\b|\bsparse\b|strongly suppressed/.test(text)) return 'low';
      if (/\bmoderate\b/.test(text)) return 'moderate';
      return null;
    }
    if (dimension === 'contrast') {
      if (/\bhigh contrast\b|\bstrong contrast\b/.test(text)) return 'high';
      if (/\blow contrast\b|\bsoft contrast\b/.test(text)) return 'low';
      if (/\bmoderate contrast\b|\bbalanced contrast\b/.test(text)) return 'moderate';
      return null;
    }
    if (dimension === 'edge') {
      if (/\bhigh edge activity\b|\bhard overall edges\b|\bunstable edges\b/.test(text)) return 'high';
      if (/\blow edge activity\b|\bsoft overall edges\b|\brestrained edges\b/.test(text)) return 'low';
      if (/\bmoderate edge activity\b/.test(text)) return 'moderate';
      return null;
    }
    return null;
  }

  function directionalStatus(direction, observed, thresholds) {
    if (!direction || !Number.isFinite(observed)) return null;
    if (direction === 'low') return observed <= thresholds.lowMax ? 'pass' : 'warn';
    if (direction === 'high') return observed >= thresholds.highMin ? 'pass' : 'warn';
    if (direction === 'moderate') return observed >= thresholds.moderateMin && observed <= thresholds.moderateMax ? 'pass' : 'warn';
    return null;
  }

  function unsupportedCheck(id, label, target, reason) {
    return { id, label, evidenceMode: 'unsupported', status: 'unsupported', target, observed: null, reason };
  }

  function directionalCheck({ id, label, targetNode, dimension, observed, thresholds, observedLabel }) {
    const targetText = textOf(targetNode);
    const direction = directionFromText(targetNode, dimension);
    if (!direction) {
      return unsupportedCheck(id, label, targetText, 'The Visual IR does not define a safe global low / moderate / high target for this measurable signal.');
    }
    const status = directionalStatus(direction, observed, thresholds);
    if (!status) return unsupportedCheck(id, label, targetText, 'The image measurement required for this check is unavailable.');
    const observedText = `${observedLabel} ${fixed(observed)}`;
    return {
      id,
      label,
      evidenceMode: 'measured',
      status,
      target: `${direction} · ${targetText}`,
      observed: observedText,
      reason: status === 'pass'
        ? `Measured ${observedLabel.toLowerCase()} is consistent with the ${direction} direction encoded by the Visual IR.`
        : `Measured ${observedLabel.toLowerCase()} conflicts with the ${direction} direction encoded by the Visual IR.`
    };
  }

  function ratioCheck(request, measurements) {
    if (!request?.ratio || !measurements || typeof compareRatio !== 'function') {
      return unsupportedCheck('canvas-ratio', 'Canvas Ratio', request?.ratio || 'unknown', 'Target ratio or measurable image dimensions are unavailable.');
    }
    const comparison = compareRatio(measurements.width, measurements.height, request.ratio);
    return {
      id: 'canvas-ratio',
      label: 'Canvas Ratio',
      evidenceMode: 'measured',
      status: comparison.status,
      target: request.ratio,
      observed: `${measurements.width}×${measurements.height} · ${comparison.actual}`,
      reason: comparison.status === 'pass'
        ? `Actual aspect ratio is within ${Math.round(0.03 * 100)}% of the requested canvas.`
        : `Actual aspect ratio differs from the requested canvas by ${fixed(comparison.relativeError * 100)}%.`
    };
  }

  function measuredChecks(ir, request, measurements) {
    if (!measurements) {
      return [
        unsupportedCheck('canvas-ratio', 'Canvas Ratio', request?.ratio || 'unknown', 'Pixel analysis is unavailable for this image.'),
        unsupportedCheck('saturation-direction', 'Saturation Direction', textOf(ir?.color?.saturation), 'Pixel analysis is unavailable for this image.'),
        unsupportedCheck('detail-density', 'Detail Density', textOf(ir?.detail?.informationDensity), 'Pixel analysis is unavailable for this image.'),
        unsupportedCheck('value-contrast', 'Value Contrast', textOf(ir?.value?.contrastBudget), 'Pixel analysis is unavailable for this image.'),
        unsupportedCheck('edge-activity', 'Edge Activity', textOf(ir?.edge?.policy), 'Pixel analysis is unavailable for this image.')
      ];
    }
    const densityScore = measurements.edgeDensity * 0.45 + measurements.entropyProxy * 0.55;
    const contrastScore = measurements.luminanceStdDev * 0.6 + measurements.localContrast * 0.4;
    return [
      ratioCheck(request, measurements),
      directionalCheck({
        id: 'saturation-direction', label: 'Saturation Direction', targetNode: ir?.color?.saturation,
        dimension: 'saturation', observed: measurements.meanSaturation,
        thresholds: { lowMax: 0.38, highMin: 0.58, moderateMin: 0.3, moderateMax: 0.65 }, observedLabel: 'mean saturation'
      }),
      directionalCheck({
        id: 'detail-density', label: 'Detail Density', targetNode: ir?.detail?.informationDensity,
        dimension: 'detail', observed: densityScore,
        thresholds: { lowMax: 0.38, highMin: 0.55, moderateMin: 0.28, moderateMax: 0.65 }, observedLabel: 'density proxy'
      }),
      directionalCheck({
        id: 'value-contrast', label: 'Value Contrast', targetNode: ir?.value?.contrastBudget,
        dimension: 'contrast', observed: contrastScore,
        thresholds: { lowMax: 0.18, highMin: 0.32, moderateMin: 0.15, moderateMax: 0.36 }, observedLabel: 'contrast proxy'
      }),
      directionalCheck({
        id: 'edge-activity', label: 'Edge Activity', targetNode: ir?.edge?.policy,
        dimension: 'edge', observed: measurements.edgeDensity,
        thresholds: { lowMax: 0.22, highMin: 0.45, moderateMin: 0.18, moderateMax: 0.5 }, observedLabel: 'edge density'
      })
    ];
  }

  const HUMAN_CHECKS = [
    ['narrative-verb', 'Narrative Verb', (ir) => `The frame should communicate ${textOf(ir?.narrative?.verb)} as the governing action.`],
    ['primary-variable', 'Primary Variable', (ir) => `${textOf(ir?.character?.primaryVariable)} should carry the main visual storytelling load.`],
    ['identity-anchors', 'Identity Anchors', (ir) => `Keep ${(ir?.character?.anchors || []).join(', ') || 'the protected character anchors'} readable.`],
    ['world-ownership', 'World / Ownership', (ir) => `World relation should read as ${textOf(ir?.world?.relation)} without unowned global contamination.`],
    ['composition-hierarchy', 'Composition Hierarchy', (ir) => `${textOf(ir?.composition?.shotSize)} shot, ${textOf(ir?.composition?.subjectScale)} subject, ${textOf(ir?.composition?.negativeSpace)} negative space should support the intended read order.`],
    ['camera-allegiance', 'Camera Allegiance', (ir) => `Camera allegiance should read as ${textOf(ir?.camera?.allegiance)}.`],
    ['color-ownership', 'Color Ownership', (ir) => `Color ownership should read as ${textOf(ir?.color?.ownershipMode)} rather than a generic full-frame mood.`],
    ['medium-ownership', 'Medium Ownership', (ir) => `Medium ownership should remain ${textOf(ir?.medium?.ownership)}.`],
    ['fx-ownership', 'FX Ownership', (ir) => `FX must remain local to ${(ir?.fx?.localOwners || []).join(', ') || 'named owners'}; global FX=${String(ir?.fx?.global)}.`],
    ['anti-rules', 'Anti-rules', (ir) => `The result must avoid ${(ir?.antiRules || []).join('; ') || 'the protected anti-rules'}.`]
  ];

  function normalizeHumanDecision(decision) {
    const status = typeof decision === 'string' ? decision : decision?.status;
    if (status === 'pass' || status === 'needs_work' || status === 'not_sure') return status;
    return 'needs_judgment';
  }

  function humanChecks(ir, human = {}) {
    return HUMAN_CHECKS.map(([id, label, targetBuilder]) => {
      const decision = human[id];
      const status = normalizeHumanDecision(decision);
      const note = typeof decision === 'object' ? String(decision.note || '').trim() : '';
      return {
        id,
        label,
        evidenceMode: 'human_required',
        status,
        target: targetBuilder(ir),
        observed: status === 'needs_judgment' ? null : status.replace('_', ' '),
        reason: note || (status === 'pass'
          ? 'Director judgment confirms the generated frame satisfies this semantic rule.'
          : status === 'needs_work'
            ? 'Director judgment indicates this semantic rule needs correction.'
            : status === 'not_sure'
              ? 'Director judgment is unresolved; do not convert it into a generation instruction.'
              : 'This semantic rule cannot be proven by the current pixel-analysis runtime.'),
        note
      };
    });
  }

  function summarize(checks) {
    const summary = { measuredPass: 0, measuredWarn: 0, humanPassed: 0, humanNeedsWork: 0, unresolved: 0 };
    for (const check of checks) {
      if (check.evidenceMode === 'measured' && check.status === 'pass') summary.measuredPass += 1;
      else if (check.evidenceMode === 'measured' && check.status === 'warn') summary.measuredWarn += 1;
      else if (check.evidenceMode === 'human_required' && check.status === 'pass') summary.humanPassed += 1;
      else if (check.evidenceMode === 'human_required' && check.status === 'needs_work') summary.humanNeedsWork += 1;
      if (['unsupported', 'needs_judgment', 'not_sure'].includes(check.status)) summary.unresolved += 1;
    }
    return summary;
  }

  function evaluateArtifact({ artifactId, ir, request, measurements = null, human = {} } = {}) {
    const checks = [...measuredChecks(ir || {}, request || {}, measurements), ...humanChecks(ir || {}, human)];
    return {
      artifactId: artifactId || null,
      measuredAt: new Date().toISOString(),
      measurements,
      checks,
      summary: summarize(checks)
    };
  }

  function deltaEntry(check) {
    let intent = 'unresolved';
    let instruction = `${check.label}: ${check.reason}`;
    if (check.status === 'pass') {
      intent = 'preserve';
      instruction = `${check.label}: preserve the currently successful behavior. ${check.reason}`;
    } else if (check.status === 'warn') {
      intent = 'correct';
      instruction = `${check.label}: ${check.reason} Target: ${check.target}. Observed: ${check.observed}.`;
    } else if (check.status === 'needs_work') {
      intent = 'correct';
      instruction = `${check.label}: ${check.note || check.reason} Target: ${check.target}`;
    }
    return {
      checkId:check.id,
      label:check.label,
      intent,
      sourceStatus:check.status,
      evidenceMode:check.evidenceMode,
      instruction
    };
  }

  function compileReDirectionDelta(report) {
    const entries = (report?.checks || []).map(deltaEntry);
    const preserve = entries.filter((entry) => entry.intent === 'preserve').map((entry) => entry.instruction);
    const correct = entries.filter((entry) => entry.intent === 'correct').map((entry) => entry.instruction);
    const unresolved = entries.filter((entry) => entry.intent === 'unresolved').map((entry) => entry.instruction);

    const sections = [];
    if (preserve.length) sections.push(`PRESERVE:\n${preserve.map((item) => `- ${item}`).join('\n')}`);
    if (correct.length) sections.push(`CORRECT:\n${correct.map((item) => `- ${item}`).join('\n')}`);
    const promptAppendix = sections.length ? `ITERATION / EVALUATION DELTA\n${sections.join('\n\n')}` : '';
    return { preserve, correct, unresolved, promptAppendix, entries };
  }

  return { evaluateArtifact, compileReDirectionDelta, directionFromText };
});
