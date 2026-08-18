((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const SCENE_ROLES = ['setup','development','pressure','recognition','escalation','rupture','reversal','release','resolution','transition'];
  const AGENCIES = ['world','contested','shared','character'];
  const VISUAL_STATUSES = ['undirected','in-progress','directed'];
  const NARRATIVE_STATUSES = ['defined','in-progress','confirmed'];
  const CONTINUITY_STATUSES = ['pass','warn','fail','unresolved'];
  const FORBIDDEN_VISUAL_KEYS = new Set([
    'camera','color','space','line','texture','rhythm','shot','shotsize','lens','lighting',
    'composition','editrhythm','visualstyle','style','scenestate','scenestatepatch','variables'
  ]);

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());

  function result(errors, value) {
    return errors.length ? { valid:false, errors } : { valid:true, errors:[], value:clone(value) };
  }

  function validateAgencyTransition(value, path, errors) {
    if (!Array.isArray(value) || value.length < 2 || value.length > 4 || value.some(item => !AGENCIES.includes(item))) {
      errors.push(`${path} must contain 2 to 4 valid agencies`);
    }
  }

  function validateNarrativeRole(value, path, errors) {
    if (!isObject(value)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!SCENE_ROLES.includes(value.role)) errors.push(`${path}.role is invalid`);
    ['narrativeFunction','startingState','endingState','turningPoint'].forEach(key => {
      if (!nonEmpty(value[key])) errors.push(`${path}.${key} is required`);
    });
    validateAgencyTransition(value.agencyTransition, `${path}.agencyTransition`, errors);
    if (value.relationToPrevious != null && !nonEmpty(value.relationToPrevious)) errors.push(`${path}.relationToPrevious must be null or non-empty`);
  }

  function createEmptySceneRecord(input = {}) {
    return {
      id: String(input.id || ''),
      order: Number.isInteger(input.order) ? input.order : 1,
      title: String(input.title || ''),
      narrativeRole: clone(input.narrativeRole || {}),
      workspace: {
        narrativeState: null,
        sceneState: null,
        sequenceState: null
      },
      status: {
        narrative: 'defined',
        visual: 'undirected',
        continuity: 'unresolved'
      }
    };
  }

  function validateSceneRecord(value = {}) {
    const errors = [];
    if (!isObject(value)) return { valid:false, errors:['scene record must be an object'] };
    if (!nonEmpty(value.id)) errors.push('id is required');
    if (!Number.isInteger(value.order) || value.order < 1) errors.push('order must be a positive integer');
    if (!nonEmpty(value.title)) errors.push('title is required');
    validateNarrativeRole(value.narrativeRole, 'narrativeRole', errors);
    if (!isObject(value.workspace)) errors.push('workspace must be an object');
    else {
      const allowedWorkspace = ['narrativeState','sceneState','sequenceState'];
      Object.keys(value.workspace).forEach(key => {
        if (!allowedWorkspace.includes(key)) errors.push(`workspace.${key} is not allowed`);
      });
    }
    if (!isObject(value.status)) errors.push('status must be an object');
    else {
      if (!NARRATIVE_STATUSES.includes(value.status.narrative)) errors.push('status.narrative is invalid');
      if (!VISUAL_STATUSES.includes(value.status.visual)) errors.push('status.visual is invalid');
      if (!CONTINUITY_STATUSES.includes(value.status.continuity)) errors.push('status.continuity is invalid');
    }
    return result(errors, value);
  }

  function validateProjectState(value = {}) {
    const errors = [];
    if (!isObject(value)) return { valid:false, errors:['project must be an object'] };
    if (!nonEmpty(value.id)) errors.push('id is required');
    if (!nonEmpty(value.title)) errors.push('title is required');
    if (typeof value.projectIntent !== 'string') errors.push('projectIntent must be a string');
    if (typeof value.sourceNarrative !== 'string') errors.push('sourceNarrative must be a string');
    if (!Array.isArray(value.sceneOrder)) errors.push('sceneOrder must be an array');
    if (!isObject(value.scenes)) errors.push('scenes must be an object');
    if (Array.isArray(value.sceneOrder) && isObject(value.scenes)) {
      if (new Set(value.sceneOrder).size !== value.sceneOrder.length) errors.push('sceneOrder must not contain duplicates');
      value.sceneOrder.forEach((id, index) => {
        if (!nonEmpty(id) || !value.scenes[id]) errors.push(`sceneOrder[${index}] must reference an existing scene`);
      });
      Object.entries(value.scenes).forEach(([id, scene]) => {
        const checked = validateSceneRecord(scene);
        checked.errors.forEach(error => errors.push(`scenes.${id}.${error}`));
        if (scene?.id !== id) errors.push(`scenes.${id}.id must match key`);
      });
    }
    if (value.activeSceneId != null && (!nonEmpty(value.activeSceneId) || !value.scenes?.[value.activeSceneId])) {
      errors.push('activeSceneId must be null or reference an existing scene');
    }
    return result(errors, value);
  }

  function assertNoVisualDirectionFields(value, path = 'response', errors = []) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertNoVisualDirectionFields(item, `${path}[${index}]`, errors));
      return errors;
    }
    if (!isObject(value)) return errors;
    Object.entries(value).forEach(([key, child]) => {
      const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (FORBIDDEN_VISUAL_KEYS.has(normalized)) errors.push(`${path}.${key} is a forbidden visual-direction field`);
      assertNoVisualDirectionFields(child, `${path}.${key}`, errors);
    });
    return errors;
  }

  function validateBreakdownResponse(value = {}) {
    const errors = [];
    if (!isObject(value)) return { valid:false, errors:['breakdown response must be an object'] };
    assertNoVisualDirectionFields(value, 'response', errors);
    const reading = value.projectReading;
    if (!isObject(reading)) errors.push('projectReading must be an object');
    else {
      ['narrativeProblem','coreConflict','startingState','endingState'].forEach(key => {
        if (!nonEmpty(reading[key])) errors.push(`projectReading.${key} is required`);
      });
      if (!Array.isArray(reading.agencyArc) || reading.agencyArc.length < 2 || reading.agencyArc.length > 6 || reading.agencyArc.some(item => !AGENCIES.includes(item))) {
        errors.push('projectReading.agencyArc is invalid');
      }
    }
    if (!Array.isArray(value.scenes) || value.scenes.length < 1) errors.push('scenes must contain at least one proposal');
    (Array.isArray(value.scenes) ? value.scenes : []).forEach((scene, index) => {
      const path = `scenes[${index}]`;
      if (!isObject(scene)) {
        errors.push(`${path} must be an object`);
        return;
      }
      const allowed = ['id','title','role','narrativeFunction','startingState','endingState','turningPoint','agencyTransition','relationToPrevious','sourceBasis','breakBasis','directorEdits'];
      Object.keys(scene).forEach(key => {
        if (!allowed.includes(key)) errors.push(`${path}.${key} is not allowed`);
      });
      if (!nonEmpty(scene.id)) errors.push(`${path}.id is required`);
      if (!nonEmpty(scene.title)) errors.push(`${path}.title is required`);
      if (!SCENE_ROLES.includes(scene.role)) errors.push(`${path}.role is invalid`);
      ['narrativeFunction','startingState','endingState','turningPoint','sourceBasis','breakBasis'].forEach(key => {
        if (!nonEmpty(scene[key])) errors.push(`${path}.${key} is required`);
      });
      validateAgencyTransition(scene.agencyTransition, `${path}.agencyTransition`, errors);
      if (scene.relationToPrevious != null && !nonEmpty(scene.relationToPrevious)) errors.push(`${path}.relationToPrevious must be null or non-empty`);
      if (scene.directorEdits != null && !isObject(scene.directorEdits)) errors.push(`${path}.directorEdits must be an object when present`);
    });
    return result(errors, value);
  }

  return {
    SCENE_ROLES: clone(SCENE_ROLES),
    AGENCIES: clone(AGENCIES),
    VISUAL_STATUSES: clone(VISUAL_STATUSES),
    NARRATIVE_STATUSES: clone(NARRATIVE_STATUSES),
    CONTINUITY_STATUSES: clone(CONTINUITY_STATUSES),
    clone,
    createEmptySceneRecord,
    validateSceneRecord,
    validateProjectState,
    validateBreakdownResponse,
    assertNoVisualDirectionFields
  };
});
