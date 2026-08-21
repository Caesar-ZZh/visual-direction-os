(function attachVisualIR(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function visualIRFactory() {
  'use strict';

  const VISUAL_IR_VERSION = '0.1.0';

  function signal(value = null, confidence = 0, evidenceStatus = 'unknown', status = 'unknown') {
    return {
      value: value ?? 'unknown',
      status,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      evidenceStatus
    };
  }

  function createDefaultVisualIR(rawBrief = '') {
    return {
      metadata: {
        schema: 'VisualIR',
        version: VISUAL_IR_VERSION,
        generatedAt: null,
        engine: 'deterministic-v0.1'
      },
      brief: { raw: String(rawBrief || ''), language: 'auto' },
      narrative: {
        verb: signal(),
        state: signal(),
        relationshipState: signal(),
        intensity: signal(0, 0, 'unknown'),
        shotIntent: signal()
      },
      character: {
        archetype: signal(),
        primaryVariable: signal(),
        secondaryVariables: [],
        anchors: [],
        stateMachine: {},
        evidenceStatus: 'unknown',
        confidence: 0
      },
      world: {
        grammarId: signal(),
        thesis: signal(),
        relation: signal(),
        stability: signal(),
        evidenceStatus: 'unknown',
        confidence: 0
      },
      state: { active: signal('baseline', 0, 'unknown') },
      composition: {
        shotSize: signal(), subjectScale: signal(), negativeSpace: signal(),
        direction: signal(), staging: signal()
      },
      camera: {
        allegiance: signal(), angle: signal(), projection: signal(), behavior: signal()
      },
      hierarchy: { reads: [], protected: [] },
      shape: { behavior: signal(), anchors: [] },
      value: { structure: signal(), contrastBudget: signal() },
      color: {
        ownershipMode: signal(), territory: {}, boundary: signal(), migration: signal(), saturation: signal()
      },
      edge: { character: signal(), environment: signal(), policy: signal() },
      detail: { character: signal(), environment: signal(), informationDensity: signal() },
      medium: {
        character: signal(), world: signal(), ownership: signal(), hostContamination: false, typography: signal()
      },
      texture: { behavior: signal(), frequency: signal() },
      fx: { global: false, localOwners: [], notes: [] },
      temporal: {
        signature: signal(), sequence: [], evidenceStatus: 'unknown', confidence: 0
      },
      agency: { mode: signal(), owner: signal(), trajectory: signal() },
      antiRules: [],
      qa: {
        schemaVersion: '0.1',
        dimensions: ['narrative', 'hierarchy', 'characterIdentity', 'worldGrammar', 'composition', 'camera', 'colorOwnership', 'edge', 'mediumOwnership', 'detailHierarchy', 'fxLeakage', 'antiRules'],
        status: 'not_scored'
      },
      evidence: { grammar: [], rules: [], gaps: [] }
    };
  }

  function validateVisualIR(ir) {
    const errors = [];
    if (!ir || typeof ir !== 'object') errors.push('IR must be an object');
    if (ir?.metadata?.schema !== 'VisualIR') errors.push('metadata.schema must be VisualIR');
    if (ir?.metadata?.version !== VISUAL_IR_VERSION) errors.push('unsupported VisualIR version');
    for (const key of ['brief', 'narrative', 'character', 'world', 'composition', 'camera', 'color', 'edge', 'detail', 'medium', 'fx', 'temporal', 'agency', 'qa', 'evidence']) {
      if (!(key in (ir || {}))) errors.push(`missing ${key}`);
    }
    if (!Array.isArray(ir?.antiRules)) errors.push('antiRules must be an array');
    if (typeof ir?.fx?.global !== 'boolean') errors.push('fx.global must be boolean');
    return { valid: errors.length === 0, errors };
  }

  return { VISUAL_IR_VERSION, signal, createDefaultVisualIR, validateVisualIR };
});
