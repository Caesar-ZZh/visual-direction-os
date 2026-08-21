((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualIRBridge = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));

  const sourced = (value, source, confidence = 'medium') => ({
    value: clone(value),
    status: 'known',
    source,
    confidence
  });

  function compileVisualIR({ confirmedReading, selectedStrategy } = {}) {
    if (!confirmedReading || !selectedStrategy) {
      throw new Error('Visual IR requires a confirmed Narrative Reading and selected Strategy.');
    }

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
      }
    };
  }

  return { compileVisualIR };
});
