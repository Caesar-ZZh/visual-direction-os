((root, factory) => {
  const registry = typeof module === 'object' && module.exports
    ? require('./visual-grammar-registry.js')
    : root?.VDOSVisualGrammarRegistry;
  const api = factory(registry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualIRBridge = api;
})(typeof window !== 'undefined' ? window : globalThis, registry => {
  'use strict';

  if (!registry) throw new Error('VDOSVisualGrammarRegistry is required before visual-ir-bridge.js');

  const clone = value => JSON.parse(JSON.stringify(value));
  const VISUAL_FIELDS = ['character','world','composition','camera','hierarchy','shape','value','color','edge','detail','medium','texture','fx','temporal','space','line','rhythm'];

  const sourced = (value, source, confidence = 'medium', evidenceStatus = 'supported') => ({
    value: clone(value),
    status: 'known',
    evidenceStatus,
    source,
    confidence
  });

  const unknown = field => ({
    value: 'UNKNOWN',
    status: 'unknown',
    evidenceStatus: 'unresolved',
    source: 'not-yet-compiled',
    basis: `${field} is intentionally unresolved until an evidence-aware grammar provides support.`
  });

  function unresolvedGrammar() {
    return {
      id: null,
      label: 'Unresolved',
      status: 'unresolved',
      contractStatus: 'unresolved',
      evidenceStatus: 'unresolved',
      evidenceTier: null,
      refs: [],
      guards: []
    };
  }

  function grammarSummary(grammar) {
    if (!grammar) return unresolvedGrammar();
    return {
      id: grammar.id,
      label: grammar.label,
      status: 'resolved',
      contractStatus: grammar.contract.status,
      evidenceStatus: grammar.evidence.status,
      evidenceTier: grammar.evidence.tier,
      refs: clone(grammar.evidence.refs || []),
      guards: clone(grammar.guards || [])
    };
  }

  function applyGrammarBindings(visual, grammar, confidence) {
    if (!grammar) return;
    Object.entries(grammar.bindings || {}).forEach(([field, signal]) => {
      if (!VISUAL_FIELDS.includes(field)) return;
      visual[field] = {
        value: clone(signal.value),
        status: signal.status || 'known',
        evidenceStatus: signal.evidenceStatus || grammar.evidence.status,
        source: `grammar:${grammar.id}`,
        confidence,
        basis: `${grammar.label} is the resolved evidence-aware grammar for the selected Strategy.`
      };
    });
  }

  function compileVisualIR({ confirmedReading, selectedStrategy } = {}) {
    if (!confirmedReading || !selectedStrategy) {
      throw new Error('Visual IR requires a confirmed Narrative Reading and selected Strategy.');
    }

    const requestedGrammarId = selectedStrategy.grammarId || 'unresolved';
    const grammar = registry.resolveGrammar({ confirmedReading, selectedStrategy });
    const visual = Object.fromEntries(VISUAL_FIELDS.map(field => [field, unknown(field)]));
    const confidence = confirmedReading.confidence || 'unknown';
    applyGrammarBindings(visual, grammar, confidence);

    const antiRules = grammar?.antiRules?.length
      ? sourced(grammar.antiRules, `grammar:${grammar.id}`, confidence, grammar.evidence.status)
      : unknown('antiRules');

    const unresolved = VISUAL_FIELDS.filter(field => visual[field].status === 'unknown');
    if (antiRules.status === 'unknown') unresolved.push('antiRules');

    return {
      schemaVersion: '0.3.0',
      mode: 'shadow',
      source: {
        readingId: confirmedReading.id,
        strategyId: selectedStrategy.id,
        grammarId: requestedGrammarId,
        contract: 'confirmed-reading+selected-strategy+grammar-registry'
      },
      narrative: {
        problem: clone(confirmedReading.narrativeProblem),
        coreConflict: clone(confirmedReading.coreConflict),
        startingState: clone(confirmedReading.startingState),
        endingState: clone(confirmedReading.endingState),
        turningPoint: clone(confirmedReading.turningPoint)
      },
      direction: {
        primaryVariable: sourced(selectedStrategy.primaryVariable, 'selected-strategy', confidence),
        supportingVariables: sourced(selectedStrategy.supportingVariables || [], 'selected-strategy', confidence),
        restrainedVariables: sourced(selectedStrategy.restrainedVariables || [], 'selected-strategy', confidence),
        mechanism: sourced(selectedStrategy.mechanism, 'selected-strategy', confidence),
        rationale: sourced(selectedStrategy.rationale, 'selected-strategy', confidence)
      },
      agency: {
        transition: sourced(confirmedReading.agencyTransition?.value || [], 'confirmed-reading', confidence)
      },
      grammar: grammarSummary(grammar),
      visual,
      constraints: { antiRules },
      evidence: {
        status: grammar ? grammar.evidence.status : 'partial',
        confidence,
        unresolved,
        refs: grammar ? clone(grammar.evidence.refs || []) : []
      }
    };
  }

  function validateVisualIR(value = {}) {
    const errors = [];
    if (value.schemaVersion !== '0.3.0') errors.push('schemaVersion must be 0.3.0');
    if (value.mode !== 'shadow') errors.push('mode must be shadow');
    if (!value.source?.readingId) errors.push('source.readingId is required');
    if (!value.source?.strategyId) errors.push('source.strategyId is required');
    if (!value.source?.grammarId) errors.push('source.grammarId is required');
    if (value.direction?.primaryVariable?.status !== 'known' || !value.direction?.primaryVariable?.value) {
      errors.push('direction.primaryVariable must be known');
    }
    if (!Array.isArray(value.agency?.transition?.value)) errors.push('agency.transition.value must be an array');
    if (!value.grammar?.status) errors.push('grammar.status is required');
    if (value.grammar?.status === 'resolved' && !value.grammar?.id) errors.push('grammar.id is required when resolved');
    if (!Array.isArray(value.evidence?.unresolved)) errors.push('evidence.unresolved must be an array');
    if (!value.constraints?.antiRules) errors.push('constraints.antiRules is required');
    VISUAL_FIELDS.forEach(field => {
      const signal = value.visual?.[field];
      if (!signal) errors.push(`visual.${field} is required`);
      else if (signal.status === 'unknown' && signal.value !== 'UNKNOWN') errors.push(`visual.${field} unknown value must be UNKNOWN`);
    });
    return { valid: errors.length === 0, errors };
  }

  return { VISUAL_FIELDS: clone(VISUAL_FIELDS), compileVisualIR, validateVisualIR };
});
