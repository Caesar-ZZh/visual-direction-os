(() => {
  'use strict';

  const DEFAULT_SCENE_STATE = Object.freeze({
    mode: 'learn',
    narrativeState: 'baseline',
    activeCase: 'elian',
    playhead: 0,
    variables: {
      color: { temperature: 'neutral', saturation: 'medium', contrast: 'medium', territory: 'world' },
      space: { depth: 'medium', compression: 'low', openness: 'medium', negativeSpace: 'medium' },
      camera: { distance: 'medium', stability: 'high', perspective: 'world', movement: 'low' },
      line: { stability: 'high', density: 'medium', direction: 'ordered' },
      texture: { noise: 'low', granularity: 'low', materiality: 'clean' },
      rhythm: { cutDensity: 'low', motionEnergy: 'low', repetition: 'stable' }
    },
    agency: 'world',
    ownership: { character: 'low', world: 'high', narrative: 'medium' }
  });

  const clone = (value) => JSON.parse(JSON.stringify(value));
  let state = clone(DEFAULT_SCENE_STATE);
  const listeners = new Set();

  function mergeNested(base, patch) {
    const next = { ...base };
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && base?.[key] && typeof base[key] === 'object') {
        next[key] = mergeNested(base[key], value);
      } else {
        next[key] = value;
      }
    });
    return next;
  }

  function createSceneState(initial = {}) {
    state = mergeNested(clone(DEFAULT_SCENE_STATE), initial);
    notify('create');
    return getSceneState();
  }

  function getSceneState() {
    return clone(state);
  }

  function updateSceneState(patch, source = 'unknown') {
    state = mergeNested(state, patch || {});
    notify(source);
    return getSceneState();
  }

  function subscribeSceneState(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    listener(getSceneState(), 'subscribe');
    return () => listeners.delete(listener);
  }

  function notify(source) {
    const snapshot = getSceneState();
    listeners.forEach((listener) => listener(snapshot, source));
    window.dispatchEvent(new CustomEvent('vdos:scene-state', { detail: { state: snapshot, source } }));
  }

  window.VDOSScene = {
    DEFAULT_SCENE_STATE: clone(DEFAULT_SCENE_STATE),
    createSceneState,
    getSceneState,
    updateSceneState,
    subscribeSceneState
  };
})();