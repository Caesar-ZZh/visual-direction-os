'use strict';

const domain = require('../../visual-direction-os/narrative-contracts.js');

const STAGES = ['interpret', 'strategy', 'sequence'];
const AGENT_SOURCE_TYPES = ['explicit', 'inferred', 'director_intent'];
const AGENCIES = ['world', 'contested', 'shared', 'character'];
const VARIABLES = ['color', 'space', 'camera', 'line', 'texture', 'rhythm', 'agency'];
const GRAMMAR_IDS = ['spatial-authorship', 'camera-authority-transfer', 'color-ownership-transfer', 'surface-assignment', 'agency-ownership-transfer', 'unresolved'];
const LEVELS = ['low', 'medium', 'high'];

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
  if (stage === 'sequence' && !isObject(body.strategy)) errors.push('strategy is required');

  if (errors.length) return failure(errors);
  const value = { narrative, directorIntent, reading: clone(body.reading) };
  if (stage === 'sequence') value.strategy = clone(body.strategy);
  return success(value);
}

function validateOutput(stage, value) {
  if (stage === 'interpret') return domain.validateInterpretResponse(value);
  if (stage === 'strategy') return domain.validateStrategyResponse(value);
  if (stage === 'sequence') return domain.validateSequenceResponse(value);
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

const ownershipSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    character: { type: 'string', enum: LEVELS },
    world: { type: 'string', enum: LEVELS },
    narrative: { type: 'string', enum: LEVELS }
  },
  required: ['character', 'world', 'narrative']
};

const variablesSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    color: {
      type: 'object', additionalProperties: false,
      properties: {
        temperature: { type: 'string', minLength: 1 }, saturation: { type: 'string', minLength: 1 },
        contrast: { type: 'string', minLength: 1 }, territory: { type: 'string', minLength: 1 }
      }, required: ['temperature', 'saturation', 'contrast', 'territory']
    },
    space: {
      type: 'object', additionalProperties: false,
      properties: {
        depth: { type: 'string', minLength: 1 }, compression: { type: 'string', minLength: 1 },
        openness: { type: 'string', minLength: 1 }, negativeSpace: { type: 'string', minLength: 1 }
      }, required: ['depth', 'compression', 'openness', 'negativeSpace']
    },
    camera: {
      type: 'object', additionalProperties: false,
      properties: {
        distance: { type: 'string', minLength: 1 }, stability: { type: 'string', minLength: 1 },
        perspective: { type: 'string', minLength: 1 }, movement: { type: 'string', minLength: 1 }
      }, required: ['distance', 'stability', 'perspective', 'movement']
    },
    line: {
      type: 'object', additionalProperties: false,
      properties: {
        stability: { type: 'string', minLength: 1 }, density: { type: 'string', minLength: 1 }, direction: { type: 'string', minLength: 1 }
      }, required: ['stability', 'density', 'direction']
    },
    texture: {
      type: 'object', additionalProperties: false,
      properties: {
        noise: { type: 'string', minLength: 1 }, granularity: { type: 'string', minLength: 1 }, materiality: { type: 'string', minLength: 1 }
      }, required: ['noise', 'granularity', 'materiality']
    },
    rhythm: {
      type: 'object', additionalProperties: false,
      properties: {
        cutDensity: { type: 'string', minLength: 1 }, motionEnergy: { type: 'string', minLength: 1 }, repetition: { type: 'string', minLength: 1 }
      }, required: ['cutDensity', 'motionEnergy', 'repetition']
    }
  },
  required: ['color', 'space', 'camera', 'line', 'texture', 'rhythm']
};

const scenePatch = {
  type: 'object',
  additionalProperties: false,
  properties: {
    agency: { type: 'string', enum: AGENCIES },
    ownership: ownershipSchema,
    variables: variablesSchema
  },
  required: ['agency', 'ownership', 'variables']
};

const beatLabels = ['SETUP', 'PRESSURE', 'RUPTURE', 'RELEASE', 'NEW OWNERSHIP'];
const beatIds = ['setup', 'pressure', 'rupture', 'release', 'new-ownership'];
const sequenceBeat = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', enum: beatIds },
    label: { type: 'string', enum: beatLabels },
    narrativeBeat: { type: 'string', minLength: 1 },
    agency: { type: 'string', enum: AGENCIES },
    primaryVariable: { type: 'string', enum: VARIABLES },
    supportingVariables: { type: 'array', items: { type: 'string', enum: VARIABLES } },
    restrainedVariables: { type: 'array', items: { type: 'string', enum: VARIABLES } },
    visualEvents: { type: 'array', maxItems: 3, items: { type: 'string', minLength: 1 } },
    sceneStatePatch: scenePatch,
    rationale: { type: 'string', minLength: 1 }
  },
  required: ['id', 'label', 'narrativeBeat', 'agency', 'primaryVariable', 'supportingVariables', 'restrainedVariables', 'visualEvents', 'sceneStatePatch', 'rationale']
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
      sequenceProposal: {
        type: 'object', additionalProperties: false,
        properties: {
          beats: { type: 'array', minItems: 5, maxItems: 5, items: sequenceBeat }
        },
        required: ['beats']
      }
    },
    required: ['sequenceProposal']
  }
};

function schemaFor(stage) {
  if (!OUTPUT_SCHEMAS[stage]) throw new Error(`Unknown Narrative API stage: ${stage}`);
  return clone(OUTPUT_SCHEMAS[stage]);
}

module.exports = { STAGES, GRAMMAR_IDS, validateInput, validateOutput, schemaFor };
