((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSPromptLanguageRegistry = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const LANGUAGE_REGISTRY_VERSION = '0.1.0';
  const EXACT = Object.freeze({
    agency: Object.freeze({
      world:'Keep agency with the world/system for this beat.',
      contested:'Keep agency contested between world/system and character.',
      shared:'Keep agency shared for this beat.',
      character:'Keep agency with the character for this beat.'
    }),
    'camera.perspective': Object.freeze({
      world:'Keep camera authority primarily with the environment.',
      mixed:'Maintain mixed camera authority between world and character.',
      character:'Keep camera authority primarily with the character.'
    }),
    'color.territory': Object.freeze({
      world:'Let the world hold the active color territory.',
      contested:'Maintain contested color territory between world and character.',
      character:'Let the character hold the active color territory.'
    })
  });

  function getExactPhrase(path, value) {
    const family = EXACT[String(path || '')];
    if (!family) return null;
    const phrase = family[String(value)];
    return typeof phrase === 'string' ? phrase : null;
  }

  function listText(values) {
    return Array.isArray(values) ? values.map(String).filter(Boolean).join(' and ') : '';
  }

  function renderStructuralDirective(item = {}) {
    if (item.key === 'primaryVariable') {
      const value = String(item.value || '').trim();
      return value ? `${value} carries the primary visual change.` : null;
    }
    if (item.key === 'supportingVariables') {
      const values = listText(item.value);
      return values ? `${values} may support that change.` : null;
    }
    if (item.key === 'restrainedVariables') {
      const values = listText(item.value);
      return values ? `Keep ${values} subordinate.` : null;
    }
    return null;
  }

  return { LANGUAGE_REGISTRY_VERSION, getExactPhrase, renderStructuralDirective };
});
