'use strict';

const domain = require('../../visual-direction-os/narrative-contracts.js');

const STAGES = ['interpret', 'strategy', 'sequence'];
const AGENT_SOURCE_TYPES = ['explicit', 'inferred', 'director_intent'];
const AGENCIES = ['world', 'contested', 'shared', 'character'];
const VARIABLES = ['color', 'space', 'camera', 'line', 'texture', 'rhythm', 'agency'];
const GRAMMAR_IDS = ['spatial-authorship', 'camera-authority-transfer', 'color-ownership-transfer', 'surface-assignment', 'agency-ownership-transfer', 'unresolved'];
const LEVELS = ['low', 'medium', 'high'];
const BEAT_IDS = ['setup', 'pressure', 'rupture', 'release', 'new-ownership'];

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());
const clone = value => JSON.parse(JSON.stringify(value));

function failure(errors) {
  return { valid: false, errors };
}

function success(value) {
  return { valid: true, errors: [], value: clone(value) };
}

function validateInput(stage, body = {}) {
  if (!STAGES.includes(stage)) return failure([`Unknown Narrative API stage: ${stage}`]);
  if (!isObject(body)) return failure(['Request body must be a JSON object']);
  const errors = [];
  const narrative = body.narrative == null ? '' : String(body.narrative);
  const directorIntent = body.directorIntent == null ? '' : String(body.directorIntent);

  if (!nonEmpty(narrative)) errors.push('narrative is required');
  if (narrative.length > 2000) errors.push('narrative must be 2000 characters or fewer');
  if (directorIntent.length > 600) errors.push('directorIntent must be 600 characters or fewer');

  if (stage === 'interpret') {
    if (body.clarificationAnswer != null && typeof body.clarificationAnswer !== 'string') errors.push('clarificationAnswer must be a string or null');
    if (String(body.clarificationAnswer || '').length > 1000) errors.push('clarificationAnswer must be 1000 characters or fewer');
    return errors.length ? failure(errors) : success({
      narrative,
      directorIntent,
      clarificationAnswer: body.clarificationAnswer == null ? null : String(body.clarificationAnswer)
    });
  }

  if (!isObject(body.reading)) errors.push('reading is required');
  if (stage === 'sequence') {
    if (!isObject(body.strategy)) errors.push('strategy is required');
    if (!isObject(body.sequenceSkeleton)) errors.push('sequenceSkeleton is required');
    else {
      if (!Array.isArray(body.sequenceSkeleton.beats) || body.sequenceSkeleton.beats.length !== 5) errors.push('sequenceSkeleton.beats must contain exactly 5 beats');
      if (!Array.isArray(body.sequenceSkeleton.agencyConstraint?.path) || body.sequenceSkeleton.agencyConstraint.path.length < 2) errors.push('sequenceSkeleton.agencyConstraint.path is invalid');
    }
  }

  if (errors.length) return failure(errors);
  const value = { narrative, directorIntent, reading: clone(body.reading) };
  if (stage === 'sequence') {
    value.strategy = clone(body.strategy);
    value.sequenceSkeleton = clone(body.sequenceSkeleton);
  }
  return success(value);
}

function flattenCompletionPatch(openPatch = {}) {
  const result = {};
  const walk = (value, prefix = '') => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      if (prefix) {
        const canonical = prefix.startsWith('variables.') ? prefix.slice('variables.'.length) : prefix;
        result[canonical] = value;
      }
      return;
    }
    Object.entries(value).forEach(([key, child]) => walk(child, prefix ? `${prefix}.${key}` : key));
  };
  walk(openPatch);
  return result;
}

function validateCompletionAgainstSkeleton(value, skeleton) {
  const staticCheck = domain.validateSequenceCompletionResponse(value);
  if (!staticCheck.valid) return staticCheck;
  if (!isObject(skeleton) || !Array.isArray(skeleton.beats) || skeleton.beats.length !== 5) {
    return failure(['sequenceSkeleton is required for sequence completion validation']);
  }
  const errors = [];
  staticCheck.value.sequenceCompletion.beats.forEach((beat, index) => {
    const skeletonBeat = skeleton.beats[index];
    if (!skeletonBeat || skeletonBeat.id !== beat.id) {
      errors.push(`sequenceCompletion.beats[${index}].id does not match the authoritative Skeleton`);
      return;
    }
    const flat = flattenCompletionPatch(beat.openPatch || {});
    Object.keys(flat).forEach(path => {
      const slot = skeletonBeat.patchSlots?.[path];
      if (!slot) errors.push(`sequenceCompletion.beats[${index}].openPatch.${path} is not declared by the Skeleton`);
      else if (slot.status === 'blocked') errors.push(`sequenceCompletion.beats[${index}].openPatch.${path} is blocked by the compiler`);
      else if (slot.status !== 'open') errors.push(`sequenceCompletion.beats[${index}].openPatch.${path} is compiler-owned and cannot be written by AI completion`);
    });
  });
  return errors.length ? failure(errors) : success(staticCheck.value);
}

function validateOutput(stage, value, context = {}) {
  if (stage === 'interpret') return domain.validateInterpretResponse(value);
  if (stage === 'strategy') {
    const checked = domain.validateStrategyResponse(value);
    if (!checked.valid) return checked;
    const errors = [];
    checked.value.strategies.forEach((strategy, index) => {
      if (!GRAMMAR_IDS.includes(strategy.grammarId)) errors.push(`strategies[${index}].grammarId is required and must be executable or unresolved`);
    });
    return errors.length ? failure(errors) : success(checked.value);
  }
  if (stage === 'sequence') return validateCompletionAgainstSkeleton(value, context.input?.sequenceSkeleton);
  return failure([`Unknown Narrative API stage: ${stage}`]);
}

const groundedField = {
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: 'string', minLength: 1 },
    sourceType: { type: 'string', enum: AGENT_SOURCE_TYPES },
    basis: { type: 'string', minLength: 1 }
  },
  required: ['value', 'sourceType', 'basis']
};

const agencyTransition = {
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', enum: AGENCIES } },
    sourceType: { type: 'string', enum: AGENT_SOURCE_TYPES },
    basis: { type: 'string', minLength: 1 }
  },
  required: ['value', 'sourceType', 'basis']
};

const reading = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    narrativeProblem: groundedField,
    coreConflict: groundedField,
    startingState: groundedField,
    endingState: groundedField,
    turningPoint: groundedField,
    agencyTransition
  },
  required: ['id', 'title', 'confidence', 'narrativeProblem', 'coreConflict', 'startingState', 'endingState', 'turningPoint', 'agencyTransition']
};

const strategyItem = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    grammarId: { type: 'string', enum: GRAMMAR_IDS },
    primaryVariable: { type: 'string', enum: VARIABLES },
    supportingVariables: { type: 'array', minItems: 1, items: { type: 'string', enum: VARIABLES } },
    restrainedVariables: { type: 'array', items: { type: 'string', enum: VARIABLES } },
    mechanism: { type: 'string', minLength: 1 },
    rationale: { type: 'string', minLength: 1 }
  },
  required: ['id', 'title', 'grammarId', 'primaryVariable', 'supportingVariables', 'restrainedVariables', 'mechanism', 'rationale']
};

const partialOwnershipSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    character: { type: 'string', enum: LEVELS },
    world: { type: 'string', enum: LEVELS },
    narrative: { type: 'string', enum: LEVELS }
  }
};

const variableFamily = properties => ({
  type: 'object', additionalProperties: false, properties
});

const partialVariablesSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    color: variableFamily({
      temperature: { type: 'string', minLength: 1 }, saturation: { type: 'string', minLength: 1 },
      contrast: { type: 'string', minLength: 1 }, territory: { type: 'string', minLength: 1 }
    }),
    space: variableFamily({
      depth: { type: 'string', minLength: 1 }, compression: { type: 'string', minLength: 1 },
      openness: { type: 'string', minLength: 1 }, negativeSpace: { type: 'string', minLength: 1 }
    }),
    camera: variableFamily({
      distance: { type: 'string', minLength: 1 }, stability: { type: 'string', minLength: 1 },
      perspective: { type: 'string', minLength: 1 }, movement: { type: 'string', minLength: 1 }
    }),
    line: variableFamily({
      stability: { type: 'string', minLength: 1 }, density: { type: 'string', minLength: 1 }, direction: { type: 'string', minLength: 1 }
    }),
    texture: variableFamily({
      noise: { type: 'string', minLength: 1 }, granularity: { type: 'string', minLength: 1 }, materiality: { type: 'string', minLength: 1 }
    }),
    rhythm: variableFamily({
      cutDensity: { type: 'string', minLength: 1 }, motionEnergy: { type: 'string', minLength: 1 }, repetition: { type: 'string', minLength: 1 }
    })
  }
};

const openPatchSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ownership: partialOwnershipSchema,
    variables: partialVariablesSchema
  }
};

const sequenceCompletionBeat = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', enum: BEAT_IDS },
    narrativeBeat: { type: 'string', minLength: 1 },
    agency: { type: 'string', enum: AGENCIES },
    visualEvents: { type: 'array', maxItems: 3, items: { type: 'string', minLength: 1 } },
    rationale: { type: 'string', minLength: 1 },
    openPatch: openPatchSchema
  },
  required: ['id', 'narrativeBeat', 'agency', 'visualEvents', 'rationale', 'openPatch']
};

const OUTPUT_SCHEMAS = {
  interpret: {
    type: 'object', additionalProperties: false,
    properties: {
      signal: { type: 'string', enum: ['weak', 'partial', 'strong'] },
      readings: { type: 'array', minItems: 2, maxItems: 3, items: reading },
      clarification: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object', additionalProperties: false,
            properties: {
              question: { type: 'string', minLength: 1 },
              options: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 1 } }
            },
            required: ['question', 'options']
          }
        ]
      }
    },
    required: ['signal', 'readings', 'clarification']
  },
  strategy: {
    type: 'object', additionalProperties: false,
    properties: { strategies: { type: 'array', minItems: 2, maxItems: 3, items: strategyItem } },
    required: ['strategies']
  },
  sequence: {
    type: 'object', additionalProperties: false,
    properties: {
      sequenceCompletion: {
        type: 'object', additionalProperties: false,
        properties: {
          beats: { type: 'array', minItems: 5, maxItems: 5, items: sequenceCompletionBeat }
        },
        required: ['beats']
      }
    },
    required: ['sequenceCompletion']
  }
};

function schemaFor(stage) {
  if (!OUTPUT_SCHEMAS[stage]) throw new Error(`Unknown Narrative API stage: ${stage}`);
  return clone(OUTPUT_SCHEMAS[stage]);
}

module.exports = { STAGES, GRAMMAR_IDS, validateInput, validateOutput, validateCompletionAgainstSkeleton, schemaFor };
