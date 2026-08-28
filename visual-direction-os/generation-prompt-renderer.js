((root, factory) => {
  const promptIR = typeof module === 'object' && module.exports
    ? require('./generation-prompt-ir.js')
    : root?.VDOSGenerationPromptIR;
  const language = typeof module === 'object' && module.exports
    ? require('./prompt-language-registry.js')
    : root?.VDOSPromptLanguageRegistry;
  const registry = typeof module === 'object' && module.exports
    ? require('./project-constraint-registry.js')
    : root?.VDOSProjectConstraintRegistry;
  const api = factory(promptIR, language, registry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSGenerationPromptRenderer = api;
})(typeof window !== 'undefined' ? window : globalThis, (promptIR, language, registry) => {
  'use strict';

  if (!promptIR?.validatePromptIR) throw new Error('VDOSGenerationPromptIR is required before generation-prompt-renderer.js');
  if (!language?.getExactPhrase || !language?.renderStructuralDirective) throw new Error('VDOSPromptLanguageRegistry is required before generation-prompt-renderer.js');
  if (!registry?.canonicalJSONString) throw new Error('VDOSProjectConstraintRegistry is required before generation-prompt-renderer.js');

  const RENDERER_VERSION = '0.1.0';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function domainError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details != null) error.details = clone(details);
    return error;
  }

  function textValue(value) {
    if (typeof value === 'string') return value.trim();
    if (value == null) return '';
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return registry.canonicalJSONString(value);
  }

  function sentence(value) {
    const text = textValue(value);
    if (!text) return '';
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }

  function section(title, lines) {
    const body = (lines || []).filter(Boolean).join('\n');
    return body ? `${title}\n${body}` : title;
  }

  function renderContent(ir) {
    return sentence(ir.content?.sceneDescription?.value);
  }

  function renderBeat(ir) {
    const lines = [];
    const beat = sentence(ir.content?.beatRealization?.value);
    if (beat) lines.push(beat);
    for (const item of ir.content?.visualEvents || []) {
      const value = textValue(item?.value);
      if (value) lines.push(`Visual event: ${sentence(value)}`);
    }
    return lines.join('\n');
  }

  function renderPriority(ir) {
    return (ir.required || [])
      .filter(item => item?.kind === 'structural')
      .map(language.renderStructuralDirective)
      .filter(Boolean)
      .join('\n');
  }

  function renderRequired(ir) {
    const lines = [];
    for (const item of ir.required || []) {
      if (item?.kind !== 'exact') continue;
      const phrase = language.getExactPhrase(item.path, item.value);
      if (!phrase) throw domainError(
        'UNRENDERABLE_REQUIRED_VALUE',
        `No canonical prompt language exists for REQUIRED ${item.path}=${textValue(item.value)}.`,
        { path:item.path, value:clone(item.value) }
      );
      lines.push(phrase);
    }
    return lines.join('\n');
  }

  function renderGuided(ir) {
    return (ir.guided || []).map(item => {
      const value = textValue(item?.value);
      return value ? `Guidance for ${item.path}: ${sentence(value)}` : null;
    }).filter(Boolean).join('\n');
  }

  function renderAvoid(ir) {
    return (ir.antiRules || []).map(item => textValue(item?.value)).filter(Boolean).join('\n');
  }

  function renderAudit(ir) {
    const meta = ir.meta || {};
    const lines = [
      `VISUAL DIRECTION / MODEL-NEUTRAL — IR ${meta.sourceVisualIRVersion || 'unresolved'} / deterministic / grammar ${meta.grammarId || 'unresolved'}`,
      `SCENE ${ir.sceneId} / BEAT ${String(ir.beatId || '').toUpperCase()}`,
      `READING ${meta.readingId || 'unresolved'} / STRATEGY ${meta.strategyId || 'unresolved'}`,
      `PROMPT IR ${ir.fingerprint || 'unresolved'}`
    ];
    if ((ir.evidenceGaps || []).length) {
      lines.push('', 'EVIDENCE GAPS:');
      for (const gap of ir.evidenceGaps) {
        const confidence = gap.confidence !== undefined ? ` (conf ${textValue(gap.confidence)})` : '';
        lines.push(`- ${gap.field}: ${gap.status}${confidence}`);
      }
    }
    return lines.join('\n');
  }

  function renderPromptIR(ir) {
    promptIR.validatePromptIR(ir);
    const sections = {
      content: renderContent(ir),
      narrativeBeat: renderBeat(ir),
      directingPriority: renderPriority(ir),
      required: renderRequired(ir),
      guided: renderGuided(ir),
      avoid: renderAvoid(ir)
    };
    const neutralText = [
      section('SCENE CONTENT', [sections.content]),
      section('NARRATIVE BEAT', [sections.narrativeBeat]),
      section('DIRECTING PRIORITY', [sections.directingPriority]),
      section('REQUIRED VISUAL BEHAVIOR', [sections.required]),
      section('VISUAL GUIDANCE', [sections.guided])
    ].join('\n\n');
    return {
      rendererVersion: RENDERER_VERSION,
      neutralText,
      negativeText: sections.avoid,
      auditText: renderAudit(ir),
      sections
    };
  }

  return { RENDERER_VERSION, renderPromptIR };
});
