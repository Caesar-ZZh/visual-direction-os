(function attachPromptCompiler(root, factory) {
  let api;
  if (typeof module !== 'undefined' && module.exports) {
    api = factory(require('./visual-ir.js'));
    module.exports = api;
  } else if (root) {
    api = factory(root.VisualDirectionRuntime || {});
    root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function compilerFactory(runtime) {
  'use strict';

  const { validateVisualIR } = runtime;

  function value(node, fallback = 'unknown') {
    if (node && typeof node === 'object' && 'value' in node) return node.value;
    return node ?? fallback;
  }

  function compact(list) { return [...new Set(list.filter(Boolean))]; }

  function compileVisualIR(ir) {
    if (typeof validateVisualIR !== 'function') {
      throw new Error('compileVisualIR: validateVisualIR is unavailable');
    }

    const check = validateVisualIR(ir);
    if (!check.valid) {
      throw new Error('compileVisualIR: invalid VisualIR — ' + check.errors.join('; '));
    }

    const backbone = [ir?.narrative?.verb, ir?.character?.primaryVariable, ir?.composition?.shotSize];
    if (backbone.some((signal) => !signal || signal.value === 'unknown')) {
      throw new Error('compileVisualIR: evidence insufficient — narrative.verb / character.primaryVariable / composition.shotSize must be resolved before compiling');
    }

    const hierarchyReads = Array.isArray(ir.hierarchy?.reads) ? ir.hierarchy.reads : [];
    const identityAnchors = Array.isArray(ir.character?.anchors) ? ir.character.anchors : [];
    const localOwners = Array.isArray(ir.fx?.localOwners) ? ir.fx.localOwners : [];

    const must = compact([
      `Narrative verb: ${value(ir.narrative.verb)}; preserve the narrative function before surface styling.`,
      `Primary variable: ${value(ir.character.primaryVariable)}; it must carry the main visual storytelling load.`,
      `Composition: ${value(ir.composition.shotSize)}, ${value(ir.composition.subjectScale)} subject, ${value(ir.composition.negativeSpace)} negative space; ${value(ir.composition.direction)}.`,
      `Hierarchy: ${hierarchyReads.join(' / ')}.`,
      `Identity anchors: ${identityAnchors.join(', ')} must remain readable.`,
      `World relation: ${value(ir.world.relation)}; keep the host world behavior autonomous unless ownership explicitly transfers.`,
      `FX ownership: global=${ir.fx.global}; effects may only belong to ${localOwners.join(', ') || 'named local owners'}.`
    ]);

    const should = compact([
      `Camera: ${value(ir.camera.allegiance)}; ${value(ir.camera.behavior)}.`,
      `Color: ${value(ir.color.ownershipMode)} ownership; ${value(ir.color.boundary)}; ${value(ir.color.migration)}.`,
      `Edge: character ${value(ir.edge.character)}; environment ${value(ir.edge.environment)}.`,
      `Detail: character ${value(ir.detail.character)}; environment ${value(ir.detail.environment)}.`,
      `Medium: character ${value(ir.medium.character)}; world ${value(ir.medium.world)}; ownership ${value(ir.medium.ownership)}.`,
      `Agency: ${value(ir.agency.mode)}; ownership trajectory ${value(ir.agency.trajectory)}.`
    ]);

    const optional = compact([
      value(ir.medium.typography) !== 'unknown' ? `Typography: ${value(ir.medium.typography)}.` : null,
      value(ir.texture?.behavior) !== 'unknown' ? `Texture: ${value(ir.texture.behavior)}.` : null,
      ir.temporal.evidenceStatus === 'evidence_incomplete'
        ? 'Temporal cadence: leave unspecified beyond supported ownership transitions; evidence is incomplete.'
        : `Temporal: ${value(ir.temporal.signature)}.`
    ]);

    const antiRules = ir.antiRules.slice();
    const evidenceGaps = ir.evidence && Array.isArray(ir.evidence.gaps) ? ir.evidence.gaps.slice() : [];
    const meta = {
      schema: ir.metadata.schema,
      version: ir.metadata.version,
      engine: ir.metadata.engine,
      generatedAt: ir.metadata.generatedAt,
      grammarId: value(ir.world.grammarId)
    };
    const header = `VISUAL DIRECTION / MODEL-NEUTRAL — IR ${meta.version} / ${meta.engine} / grammar ${meta.grammarId}`;

    const prompt = [
      header,
      '',
      'MUST:', ...must.map((rule) => `- ${rule}`),
      '',
      'SHOULD:', ...should.map((rule) => `- ${rule}`),
      '',
      'OPTIONAL:', ...optional.filter(Boolean).map((rule) => `- ${rule}`),
      ...(evidenceGaps.length ? ['', 'EVIDENCE GAPS:'] : []),
      ...evidenceGaps.map((gap) => `- ${gap.field}: ${gap.status}${gap.confidence != null ? ` (conf ${gap.confidence})` : ''}`),
      '',
      'ANTI-RULES:', ...antiRules.map((rule) => `- ${rule}`)
    ].join('\n');

    return { ...meta, must, should, optional, antiRules, evidenceGaps, prompt };
  }

  return { compileVisualIR };
});
