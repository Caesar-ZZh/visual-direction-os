(function attachAgnesAdapter(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function agnesAdapterFactory() {
  'use strict';

  const AGNES_MODEL = 'agnes-image-2.1-flash';
  const AGNES_ENDPOINT = 'https://apihub.agnes-ai.com/v1/images/generations';
  const AGNES_SIZES = Object.freeze(['1K', '2K', '3K', '4K']);
  const AGNES_RATIOS = Object.freeze(['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9']);
  const REFERENCE_ROLES = Object.freeze({
    continuity: 'shot-to-shot continuity: stable character identity, wardrobe, props, environment state, palette ownership, and lighting logic while allowing the current shot to change framing, pose, action, and camera',
    character: 'character identity, silhouette, and stable identity anchors',
    subject: 'primary subject identity and form',
    composition: 'composition, framing, camera angle, and subject placement',
    color: 'color relationships, ownership territories, and palette behavior',
    medium: 'medium behavior, mark-making, and surface treatment',
    world: 'environment grammar, architecture, and spatial behavior',
    lighting: 'lighting direction, contrast structure, and atmosphere',
    texture: 'texture frequency, material cues, and surface detail'
  });

  function compact(list) { return list.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()); }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

  function assertCompiled(compiled) {
    if (!compiled || typeof compiled !== 'object') throw new Error('Agnes adapter requires compiled Visual IR output');
    if (!Array.isArray(compiled.must) || !compiled.must.length) throw new Error('Agnes adapter requires compiled MUST rules');
    if (!Array.isArray(compiled.antiRules)) throw new Error('Agnes adapter requires compiled antiRules');
  }

  function normalizeReference(reference, index) {
    if (!reference || typeof reference !== 'object') throw new Error(`Reference ${index + 1} must be an object`);
    const source = String(reference.source || '').trim();
    if (!source) throw new Error(`Reference ${index + 1} reference source is required`);
    const role = String(reference.role || 'subject').trim().toLowerCase();
    const roleDescription = REFERENCE_ROLES[role];
    if (!roleDescription) throw new Error(`Unsupported reference role: ${role}`);
    const preserve = Array.isArray(reference.preserve) ? compact(reference.preserve.map(String)) : [];
    return { source, role, roleDescription, preserve };
  }

  function buildReferenceInstructions(references = []) {
    if (!Array.isArray(references) || !references.length) return [];
    return references.map(normalizeReference).map((reference, index) => {
      const preserve = reference.preserve.length ? ` Preserve ${reference.preserve.join(', ')}.` : '';
      return `Reference image ${index + 1}: use it for ${reference.roleDescription}.${preserve}`;
    });
  }

  function buildAgnesPrompt(compiled, options = {}) {
    assertCompiled(compiled);
    const referenceInstructions = buildReferenceInstructions(options.references || []);
    const must = compact(compiled.must || []);
    const should = compact(compiled.should || []);
    const optional = compact(compiled.optional || []);
    const antiRules = compact(compiled.antiRules || []);
    const sections = [
      'Create a single resolved image from the following visual direction. Prioritize narrative function, composition, subject readability, and ownership logic before surface styling.',
      referenceInstructions.length ? `Reference guidance:\n${referenceInstructions.map((rule) => `- ${rule}`).join('\n')}` : null,
      `Visual hierarchy and narrative intent:\n${must.map((rule) => `- ${rule}`).join('\n')}`,
      should.length ? `Supporting visual behavior:\n${should.map((rule) => `- ${rule}`).join('\n')}` : null,
      optional.length ? `Secondary treatment, only when it does not weaken the hierarchy:\n${optional.map((rule) => `- ${rule}`).join('\n')}` : null,
      antiRules.length ? `Do not:\n${antiRules.map((rule) => `- ${rule}`).join('\n')}` : null,
      'Keep the image coherent as one designed frame. Do not flatten the direction into a generic global style filter. Preserve local ownership of color, edge, medium, detail, and effects whenever specified.'
    ].filter(Boolean);
    return sections.join('\n\n');
  }

  function buildAgnesRequest({ compiled, size = '2K', ratio = '16:9', references = [], responseFormat = 'url' } = {}) {
    assertCompiled(compiled);
    if (!AGNES_SIZES.includes(size)) throw new Error(`Unsupported Agnes size: ${size}`);
    if (!AGNES_RATIOS.includes(ratio)) throw new Error(`Unsupported Agnes ratio: ${ratio}`);
    if (!['url', 'b64_json'].includes(responseFormat)) throw new Error(`Unsupported Agnes response format: ${responseFormat}`);
    const normalizedReferences = Array.isArray(references) ? references.map(normalizeReference) : [];
    const extraBody = { response_format: responseFormat };
    if (normalizedReferences.length) extraBody.image = normalizedReferences.map((reference) => reference.source);
    const request = { model:AGNES_MODEL, prompt:buildAgnesPrompt(compiled,{references:normalizedReferences}), size, ratio, extra_body:extraBody };
    if (!normalizedReferences.length && responseFormat === 'b64_json') request.return_base64 = true;
    return request;
  }

  function shiftOrdinaryReferenceLabels(prompt) {
    return String(prompt || '').replace(/Reference image (\d+)/g, (_, value) => `Reference image ${Number(value) + 1}`);
  }

  function applyAgnesSequenceContext(request, { sequenceIntent = '', shotIntent = '', continuityReference = null } = {}) {
    if (!request || typeof request !== 'object') throw new Error('Agnes sequence context requires a request');
    const revised = clone(request);
    const sequence = String(sequenceIntent || '').trim();
    const shot = String(shotIntent || '').trim();
    const sections = [];
    if (sequence) sections.push(`SEQUENCE DIRECTION\n${sequence}`);
    if (shot) sections.push(`CURRENT SHOT INTENT\n${shot}`);
    if (continuityReference) {
      const normalized = normalizeReference({ ...continuityReference, role:'continuity' }, 0);
      revised.extra_body = revised.extra_body || {};
      const ordinaryImages = Array.isArray(revised.extra_body.image) ? revised.extra_body.image.slice() : [];
      revised.extra_body.image = [normalized.source, ...ordinaryImages];
      delete revised.return_base64;
      revised.prompt = shiftOrdinaryReferenceLabels(revised.prompt);
      sections.push('CONTINUITY GUIDANCE\nReference image 1 is the approved continuity frame. Keep the same visual world and preserve stable character identity, wardrobe, props, environment state, palette ownership, and lighting logic. The CURRENT SHOT INTENT has priority for framing, pose, action, and camera changes; do not copy the prior composition merely because it is the continuity source.');
    }
    if (sections.length) revised.prompt = `${sections.join('\n\n')}\n\n${String(revised.prompt || '').trim()}`.trim();
    return revised;
  }

  function applyIterationDelta(request, delta = {}) {
    if (!request || typeof request !== 'object') throw new Error('Iteration delta requires an Agnes request');
    const revised = clone(request);
    const appendix = String(delta?.promptAppendix || '').trim();
    if (!appendix) return revised;
    revised.prompt = `${String(revised.prompt || '').trim()}\n\n${appendix}`.trim();
    return revised;
  }

  return {
    AGNES_MODEL,
    AGNES_ENDPOINT,
    AGNES_SIZES,
    AGNES_RATIOS,
    AGNES_REFERENCE_ROLES:Object.freeze(Object.keys(REFERENCE_ROLES)),
    buildReferenceInstructions,
    buildAgnesPrompt,
    buildAgnesRequest,
    applyAgnesSequenceContext,
    applyIterationDelta
  };
});