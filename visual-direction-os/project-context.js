((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectContextContract = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const SCENE_ROLES = ['setup','development','pressure','recognition','escalation','rupture','reversal','release','resolution','transition'];
  const AGENCIES = ['world','contested','shared','character'];
  const ALLOWED = ['projectIntent','sceneRole','narrativeFunction','startingState','endingState','agencyTransition'];
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());

  function validateProjectContext(value) {
    if (value == null) return { valid:true, errors:[], value:null };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid:false, errors:['projectContext must be an object'] };
    const errors = [];
    Object.keys(value).forEach(key => { if (!ALLOWED.includes(key)) errors.push(`projectContext.${key} is not allowed`); });
    if (typeof value.projectIntent !== 'string') errors.push('projectContext.projectIntent must be a string');
    if (!SCENE_ROLES.includes(value.sceneRole)) errors.push('projectContext.sceneRole is invalid');
    ['narrativeFunction','startingState','endingState'].forEach(key => { if (!nonEmpty(value[key])) errors.push(`projectContext.${key} is required`); });
    if (!Array.isArray(value.agencyTransition) || value.agencyTransition.length < 2 || value.agencyTransition.length > 4 || value.agencyTransition.some(item => !AGENCIES.includes(item))) {
      errors.push('projectContext.agencyTransition is invalid');
    }
    return errors.length ? { valid:false, errors } : { valid:true, errors:[], value:clone(value) };
  }

  function projectContextForScene(project, sceneId) {
    const scene = project?.scenes?.[sceneId];
    if (!scene) return null;
    const role = scene.narrativeRole || {};
    const context = {
      projectIntent:String(project?.projectIntent || ''),
      sceneRole:role.role,
      narrativeFunction:role.narrativeFunction,
      startingState:role.startingState,
      endingState:role.endingState,
      agencyTransition:clone(role.agencyTransition)
    };
    const checked = validateProjectContext(context);
    if (!checked.valid) throw new Error(`Invalid Project Context: ${checked.errors.join('; ')}`);
    return checked.value;
  }

  return { SCENE_ROLES:clone(SCENE_ROLES), AGENCIES:clone(AGENCIES), validateProjectContext, projectContextForScene };
});
