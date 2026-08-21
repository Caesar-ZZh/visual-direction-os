((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualIRBridge = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const VISUAL_FIELDS = ['character','world','composition','camera','hierarchy','shape','value','color','edge','detail','medium','texture','fx','temporal'];

  const sourced = (value, source, confidence = 'medium') => ({
    value: clone(value),
    status: 'known',
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

  function compileVisualIR({ confirmedReading, selectedStrategy } = {}) {
    if (!confirmedReading || !selectedStrategy) {
      throw new Error('Visual IR requires a confirmed Narrative Reading and selected Strategy.');
    }

    const visual = Object.fromEntries(VISUAL_FIELDS.map(field => [field, unknown(field)]));

    return {
      schemaVersion: '0.2.0',
      mode: 'shadow',
      source: {
        readingId: confirmedReading.id,
        strategyId: selectedStrategy.id,
        contract: 'confirmed-reading+selected-strategy'
      },
      narrative: {
        problem: clone(confirmedReading.narrativeProblem),
        coreConflict: clone(confirmedReading.coreConflict),
        startingState: clone(confirmedReading.startingState),
        endingState: clone(confirmedReading.endingState),
        turningPoint: clone(confirmedReading.turningPoint)
      },
      direction: {
        primaryVariable: sourced(selectedStrategy.primaryVariable, 'selected-strategy', confirmedReading.confidence),
        supportingVariables: sourced(selectedStrategy.supportingVariables || [], 'selected-strategy', confirmedReading.confidence),
        restrainedVariables: sourced(selectedStrategy.restrainedVariables || [], 'selected-strategy', confirmedReading.confidence),
        mechanism: sourced(selectedStrategy.mechanism, 'selected-strategy', confirmedReading.confidence),
        rationale: sourced(selectedStrategy.rationale, 'selected-strategy', confirmedReading.confidence)
      },
      agency: {
        transition: sourced(confirmedReading.agencyTransition?.value || [], 'confirmed-reading', confirmedReading.confidence)
      },
      visual,
      constraints: {
        antiRules: unknown('antiRules')
      },
      evidence: {
        status: 'partial',
        confidence: confirmedReading.confidence || 'unknown',
        unresolved: [...VISUAL_FIELDS, 'antiRules']
      }
    };
  }

  function validateVisualIR(value = {}) {
    const errors = [];
    if (value.schemaVersion !== '0.2.0') errors.push('schemaVersion must be 0.2.0');
    if (value.mode !== 'shadow') errors.push('mode must be shadow');
    if (!value.source?.readingId) errors.push('source.readingId is required');
    if (!value.source?.strategyId) errors.push('source.strategyId is required');
    if (value.direction?.primaryVariable?.status !== 'known' || !value.direction?.primaryVariable?.value) {
      errors.push('direction.primaryVariable must be known');
    }
    if (!Array.isArray(value.agency?.transition?.value)) errors.push('agency.transition.value must be an array');
    if (!Array.isArray(value.evidence?.unresolved)) errors.push('evidence.unresolved must be an array');
    VISUAL_FIELDS.forEach(field => {
      const signal = value.visual?.[field];
      if (!signal) errors.push(`visual.${field} is required`);
      else if (signal.status === 'unknown' && signal.value !== 'UNKNOWN') errors.push(`visual.${field} unknown value must be UNKNOWN`);
    });
    return { valid: errors.length === 0, errors };
  }

  return { VISUAL_FIELDS: clone(VISUAL_FIELDS), compileVisualIR, validateVisualIR };
});
