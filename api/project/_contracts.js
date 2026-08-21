'use strict';

const domain = require('../../visual-direction-os/project-contracts.js');
const AGENCIES = domain.AGENCIES;
const SCENE_ROLES = domain.SCENE_ROLES;
const clone = value => JSON.parse(JSON.stringify(value));
const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());

function failure(errors) { return { valid:false, errors }; }
function success(value) { return { valid:true, errors:[], value:clone(value) }; }

function validateInput(body = {}) {
  if (!isObject(body)) return failure(['Request body must be a JSON object']);
  const sourceNarrative = body.sourceNarrative == null ? '' : String(body.sourceNarrative);
  const directorIntent = body.directorIntent == null ? '' : String(body.directorIntent);
  const errors = [];
  if (!nonEmpty(sourceNarrative)) errors.push('sourceNarrative is required');
  if (sourceNarrative.length > 12000) errors.push('sourceNarrative must be 12000 characters or fewer');
  if (directorIntent.length > 1000) errors.push('directorIntent must be 1000 characters or fewer');
  return errors.length ? failure(errors) : success({ sourceNarrative, directorIntent });
}

function validateOutput(value) {
  return domain.validateBreakdownResponse(value);
}

const projectReading = {
  type:'object', additionalProperties:false,
  properties:{
    narrativeProblem:{type:'string',minLength:1},
    coreConflict:{type:'string',minLength:1},
    startingState:{type:'string',minLength:1},
    endingState:{type:'string',minLength:1},
    agencyArc:{type:'array',minItems:2,maxItems:6,items:{type:'string',enum:AGENCIES}}
  },
  required:['narrativeProblem','coreConflict','startingState','endingState','agencyArc']
};

const sceneProposal = {
  type:'object', additionalProperties:false,
  properties:{
    id:{type:'string',minLength:1},
    title:{type:'string',minLength:1},
    role:{type:'string',enum:SCENE_ROLES},
    narrativeFunction:{type:'string',minLength:1},
    startingState:{type:'string',minLength:1},
    endingState:{type:'string',minLength:1},
    turningPoint:{type:'string',minLength:1},
    agencyTransition:{type:'array',minItems:2,maxItems:4,items:{type:'string',enum:AGENCIES}},
    relationToPrevious:{anyOf:[{type:'null'},{type:'string',minLength:1}]},
    sourceBasis:{type:'string',minLength:1},
    breakBasis:{type:'string',minLength:1}
  },
  required:['id','title','role','narrativeFunction','startingState','endingState','turningPoint','agencyTransition','relationToPrevious','sourceBasis','breakBasis']
};

const OUTPUT_SCHEMA = {
  type:'object', additionalProperties:false,
  properties:{
    projectReading,
    scenes:{type:'array',minItems:1,maxItems:12,items:sceneProposal}
  },
  required:['projectReading','scenes']
};

function schemaFor() { return clone(OUTPUT_SCHEMA); }

module.exports = { validateInput, validateOutput, schemaFor };
