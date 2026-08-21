((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const SOURCE_TYPES = ['explicit', 'inferred', 'director_intent'];
  const SIGNAL_LEVELS = ['weak', 'partial', 'strong'];
  const CONFIDENCE_LEVELS = ['low', 'medium', 'high'];
  const AGENCIES = ['world', 'contested', 'shared', 'character'];
  const VARIABLE_FAMILIES = ['color', 'space', 'camera', 'line', 'texture', 'rhythm', 'agency'];
  const BEAT_IDS = ['setup', 'pressure', 'rupture', 'release', 'new-ownership'];
  const BEAT_LABELS = ['SETUP', 'PRESSURE', 'RUPTURE', 'RELEASE', 'NEW OWNERSHIP'];
  const OWNERSHIP_KEYS = ['character', 'world', 'narrative'];
  const LEVELS = ['low', 'medium', 'high'];
  const VARIABLE_KEYS = {
    color: ['temperature', 'saturation', 'contrast', 'territory'],
    space: ['depth', 'compression', 'openness', 'negativeSpace'],
    camera: ['distance', 'stability', 'perspective', 'movement'],
    line: ['stability', 'density', 'direction'],
    texture: ['noise', 'granularity', 'materiality'],
    rhythm: ['cutDensity', 'motionEnergy', 'repetition']
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());

  function validationResult(errors, value) {
    return errors.length ? { valid: false, errors } : { valid: true, errors: [], value: clone(value) };
  }

  function validateGroundedField(field, path, errors) {
    if (!isObject(field)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!nonEmpty(field.value)) errors.push(`${path}.value is required`);
    if (!SOURCE_TYPES.includes(field.sourceType)) errors.push(`${path}.sourceType is invalid`);
    if (!nonEmpty(field.basis)) errors.push(`${path}.basis is required`);
    if ('directorEdited' in field && typeof field.directorEdited !== 'boolean') errors.push(`${path}.directorEdited must be boolean`);
    if (field.directorEdited && !nonEmpty(field.directorEditBasis)) errors.push(`${path}.directorEditBasis is required when directorEdited`);
  }

  function validateAgencyTransition(field, path, errors) {
    if (!isObject(field)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!Array.isArray(field.value) || field.value.length < 2 || field.value.length > 4 || field.value.some(item => !AGENCIES.includes(item))) {
      errors.push(`${path}.value is invalid`);
    }
    if (!SOURCE_TYPES.includes(field.sourceType)) errors.push(`${path}.sourceType is invalid`);
    if (!nonEmpty(field.basis)) errors.push(`${path}.basis is required`);
    if ('directorEdited' in field && typeof field.directorEdited !== 'boolean') errors.push(`${path}.directorEdited must be boolean`);
    if (field.directorEdited && !nonEmpty(field.directorEditBasis)) errors.push(`${path}.directorEditBasis is required when directorEdited`);
  }

  function validateInterpretResponse(value = {}) {
    const errors = [];
    if (!SIGNAL_LEVELS.includes(value.signal)) errors.push('signal is invalid');
    if (!Array.isArray(value.readings) || value.readings.length < 2 || value.readings.length > 3) {
      errors.push('readings must contain 2 or 3 candidates');
    }
    (Array.isArray(value.readings) ? value.readings : []).forEach((reading, index) => {
      const path = `readings[${index}]`;
      if (!isObject(reading)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (!nonEmpty(reading.id)) errors.push(`${path}.id is required`);
      if (!nonEmpty(reading.title)) errors.push(`${path}.title is required`);
      if (!CONFIDENCE_LEVELS.includes(reading.confidence)) errors.push(`${path}.confidence is invalid`);
      ['narrativeProblem', 'coreConflict', 'startingState', 'endingState', 'turningPoint']
        .forEach(key => validateGroundedField(reading[key], `${path}.${key}`, errors));
      validateAgencyTransition(reading.agencyTransition, `${path}.agencyTransition`, errors);
    });
    if (value.clarification != null) {
      if (!isObject(value.clarification)) {
        errors.push('clarification must be an object or null');
      } else {
        if (!nonEmpty(value.clarification.question)) errors.push('clarification.question is required');
        const options = value.clarification.options;
        if (!Array.isArray(options) || options.length < 2 || options.length > 4 || options.some(option => !nonEmpty(option))) {
          errors.push('clarification.options must contain 2 to 4 non-empty choices');
        }
      }
    }
    return validationResult(errors, value);
  }

  function validateVariableList(values, path, errors, options = {}) {
    if (!Array.isArray(values)) {
      errors.push(`${path} must be an array`);
      return;
    }
    if (options.min != null && values.length < options.min) errors.push(`${path} must contain at least ${options.min} item(s)`);
    if (values.some(item => !VARIABLE_FAMILIES.includes(item))) errors.push(`${path} contains an invalid variable family`);
    if (new Set(values).size !== values.length) errors.push(`${path} must not contain duplicates`);
  }

  function validateStrategyResponse(value = {}) {
    const errors = [];
    if (!Array.isArray(value.strategies) || value.strategies.length < 2 || value.strategies.length > 3) {
      errors.push('strategies must contain 2 or 3 candidates');
    }
    (Array.isArray(value.strategies) ? value.strategies : []).forEach((strategy, index) => {
      const path = `strategies[${index}]`;
      if (!isObject(strategy)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (!nonEmpty(strategy.id)) errors.push(`${path}.id is required`);
      if (!nonEmpty(strategy.title)) errors.push(`${path}.title is required`);
      if (!VARIABLE_FAMILIES.includes(strategy.primaryVariable)) errors.push(`${path}.primaryVariable is invalid`);
      validateVariableList(strategy.supportingVariables, `${path}.supportingVariables`, errors, { min: 1 });
      validateVariableList(strategy.restrainedVariables, `${path}.restrainedVariables`, errors);
      if (Array.isArray(strategy.supportingVariables) && strategy.supportingVariables.includes(strategy.primaryVariable)) errors.push(`${path}.supportingVariables must not include primaryVariable`);
      if (Array.isArray(strategy.restrainedVariables) && strategy.restrainedVariables.includes(strategy.primaryVariable)) errors.push(`${path}.restrainedVariables must not include primaryVariable`);
      if (!nonEmpty(strategy.mechanism)) errors.push(`${path}.mechanism is required`);
      if (!nonEmpty(strategy.rationale)) errors.push(`${path}.rationale is required`);
    });
    return validationResult(errors, value);
  }

  function validateSceneStatePatch(patch = {}) {
    const errors = [];
    if (!isObject(patch)) return { valid: false, errors: ['sceneStatePatch must be an object'] };
    const allowedTopLevel = ['agency', 'ownership', 'variables'];
    Object.keys(patch).forEach(key => {
      if (!allowedTopLevel.includes(key)) errors.push(`sceneStatePatch.${key} is not allowed`);
    });
    if ('agency' in patch && !AGENCIES.includes(patch.agency)) errors.push('sceneStatePatch.agency is invalid');
    if ('ownership' in patch) {
      if (!isObject(patch.ownership)) errors.push('sceneStatePatch.ownership must be an object');
      else Object.entries(patch.ownership).forEach(([key, value]) => {
        if (!OWNERSHIP_KEYS.includes(key)) errors.push(`sceneStatePatch.ownership.${key} is not allowed`);
        else if (!LEVELS.includes(value)) errors.push(`sceneStatePatch.ownership.${key} is invalid`);
      });
    }
    if ('variables' in patch) {
      if (!isObject(patch.variables)) errors.push('sceneStatePatch.variables must be an object');
      else Object.entries(patch.variables).forEach(([family, values]) => {
        if (!(family in VARIABLE_KEYS)) {
          errors.push(`sceneStatePatch.variables.${family} is not allowed`);
          return;
        }
        if (!isObject(values)) {
          errors.push(`sceneStatePatch.variables.${family} must be an object`);
          return;
        }
        Object.entries(values).forEach(([key, value]) => {
          if (!VARIABLE_KEYS[family].includes(key)) errors.push(`sceneStatePatch.variables.${family}.${key} is not allowed`);
          else if (!nonEmpty(value)) errors.push(`sceneStatePatch.variables.${family}.${key} must be a non-empty string`);
        });
      });
    }
    return validationResult(errors, patch);
  }

  function validateVisualEvents(events, path, errors) {
    if (!Array.isArray(events)) {
      errors.push(`${path} must be an array`);
      return;
    }
    if (events.length > 3) errors.push(`${path} supports at most 3 events per beat`);
    events.forEach((event, index) => {
      if (typeof event === 'string') {
        if (!nonEmpty(event)) errors.push(`${path}[${index}] must be non-empty`);
        return;
      }
      if (!isObject(event) || !nonEmpty(event.type)) errors.push(`${path}[${index}] must be a non-empty event label or object with type`);
    });
  }

  function validateSequenceResponse(value = {}) {
    const errors = [];
    const beats = value?.sequenceProposal?.beats;
    if (!Array.isArray(beats) || beats.length !== BEAT_IDS.length) {
      errors.push('sequenceProposal.beats must contain exactly 5 beats');
      return validationResult(errors, value);
    }
    beats.forEach((beat, index) => {
      const path = `sequenceProposal.beats[${index}]`;
      if (!isObject(beat)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (beat.id !== BEAT_IDS[index]) errors.push(`${path}.id must be ${BEAT_IDS[index]}`);
      if (beat.label !== BEAT_LABELS[index]) errors.push(`${path}.label must be ${BEAT_LABELS[index]}`);
      if (!nonEmpty(beat.narrativeBeat)) errors.push(`${path}.narrativeBeat is required`);
      if (!AGENCIES.includes(beat.agency)) errors.push(`${path}.agency is invalid`);
      if (!VARIABLE_FAMILIES.includes(beat.primaryVariable)) errors.push(`${path}.primaryVariable is invalid`);
      validateVariableList(beat.supportingVariables, `${path}.supportingVariables`, errors);
      validateVariableList(beat.restrainedVariables, `${path}.restrainedVariables`, errors);
      validateVisualEvents(beat.visualEvents, `${path}.visualEvents`, errors);
      const patchCheck = validateSceneStatePatch(beat.sceneStatePatch);
      patchCheck.errors.forEach(error => errors.push(`${path}.${error.replace(/^sceneStatePatch\.?/, 'sceneStatePatch.')}`));
      if (!nonEmpty(beat.rationale)) errors.push(`${path}.rationale is required`);
    });
    return validationResult(errors, value);
  }

  return {
    SOURCE_TYPES: clone(SOURCE_TYPES),
    SIGNAL_LEVELS: clone(SIGNAL_LEVELS),
    CONFIDENCE_LEVELS: clone(CONFIDENCE_LEVELS),
    AGENCIES: clone(AGENCIES),
    VARIABLE_FAMILIES: clone(VARIABLE_FAMILIES),
    BEAT_IDS: clone(BEAT_IDS),
    clone,
    validateInterpretResponse,
    validateStrategyResponse,
    validateSequenceResponse,
    validateSceneStatePatch
  };
});
