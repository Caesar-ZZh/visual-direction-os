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

  function value(node, fallback = 'unknown') {
    if (node && typeof node === 'object' && 'value' in node) return node.value;
    return node ?? fallback;
  }

  function compact(list) { return [...new Set(list.filter(Boolean))]; }

  function compileVisualIR(ir) {
    const must = compact([
      `Narrative verb: ${value(ir.narrative.verb)}; preserve the narrative function before surface styling.`,
      `Primary variable: ${value(ir.character.primaryVariable)}; it must carry the main visual storytelling load.`,
      `Composition: ${value(ir.composition.shotSize)}, ${value(ir.composition.subjectScale)} subject, ${value(ir.composition.negativeSpace)} negative space; ${value(ir.composition.direction)}.`,
      `Hierarchy: ${ir.hierarchy.reads.join(' / ')}.`,
      `Identity anchors: ${ir.character.anchors.join(', ')} must remain readable.`,
      `World relation: ${value(ir.world.relation)}; keep the host world behavior autonomous unless ownership explicitly transfers.`,
      `FX ownership: global=${ir.fx.global}; effects may only belong to ${ir.fx.localOwners.join(', ') || 'named local owners'}.`
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
      value(ir.texture.behavior) !== 'unknown' ? `Texture: ${value(ir.texture.behavior)}.` : null,
      ir.temporal.evidenceStatus === 'evidence_incomplete' ? 'Temporal cadence: leave unspecified beyond supported ownership transitions; evidence is incomplete.' : `Temporal: ${value(ir.temporal.signature)}.`
    ]);

    const antiRules = ir.antiRules.slice();
    const prompt = [
      'VISUAL DIRECTION / MODEL-NEUTRAL',
      '',
      'MUST:', ...must.map((rule) => `- ${rule}`),
      '',
      'SHOULD:', ...should.map((rule) => `- ${rule}`),
      '',
      'OPTIONAL:', ...optional.map((rule) => `- ${rule}`),
      '',
      'ANTI-RULES:', ...antiRules.map((rule) => `- ${rule}`)
    ].join('\n');

    return { must, should, optional, antiRules, prompt };
  }

  return { compileVisualIR };
});
