((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectArc = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const LEVEL_SCORE = { low:0, medium:1, high:2 };
  const upper = value => typeof value === 'string' && value ? value.toUpperCase() : null;

  function normalizeAuthority(value) {
    if (value === 'world') return 'WORLD';
    if (value === 'character') return 'CHARACTER';
    if (['mixed','contested','shared'].includes(value)) return 'CONTESTED';
    return value ? String(value).toUpperCase() : null;
  }

  function deriveSpatialPressure(sceneState) {
    const space = sceneState?.variables?.space || {};
    if (space.compression === 'high') return 'HIGH';
    if (space.compression === 'medium') return 'MEDIUM';
    if (space.compression === 'low' && space.openness === 'low') return 'MEDIUM';
    if (space.compression === 'low' && ['medium','high'].includes(space.openness)) return 'LOW';
    if (space.openness === 'low' && space.negativeSpace === 'low') return 'HIGH';
    if (space.openness === 'high' && space.negativeSpace === 'high') return 'LOW';
    return 'MEDIUM';
  }

  function scoreLevel(value, fallback = 1) {
    return Object.prototype.hasOwnProperty.call(LEVEL_SCORE, value) ? LEVEL_SCORE[value] : fallback;
  }

  function categoryFromAverage(values) {
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (average < 0.67) return 'LOW';
    if (average < 1.34) return 'MEDIUM';
    return 'HIGH';
  }

  function deriveGraphicDensity(sceneState) {
    const line = sceneState?.variables?.line || {};
    const texture = sceneState?.variables?.texture || {};
    return categoryFromAverage([
      scoreLevel(line.density),
      scoreLevel(texture.noise),
      scoreLevel(texture.granularity)
    ]);
  }

  function repetitionScore(value) {
    if (['unstable','irregular','fragmented','high'].includes(value)) return 2;
    if (['building','variable','medium'].includes(value)) return 1;
    if (['stable','low','repetitive'].includes(value)) return 0;
    return 1;
  }

  function deriveRhythmicEnergy(sceneState) {
    const rhythm = sceneState?.variables?.rhythm || {};
    return categoryFromAverage([
      scoreLevel(rhythm.motionEnergy),
      scoreLevel(rhythm.cutDensity),
      repetitionScore(rhythm.repetition)
    ]);
  }

  function deriveDirectedScene(scene) {
    const directed = scene?.status?.visual === 'directed';
    const state = scene?.workspace?.sceneState;
    const agencyTransition = Array.isArray(scene?.narrativeRole?.agencyTransition)
      ? scene.narrativeRole.agencyTransition.map(item => upper(item))
      : [];
    const base = {
      id: scene?.id || null,
      title: scene?.title || '',
      narrativeRole: upper(scene?.narrativeRole?.role),
      narrativeAgency: agencyTransition,
      visualStatus: scene?.status?.visual || 'undirected',
      visualAgency: null,
      cameraAuthority: null,
      colorTerritory: null,
      spatialPressure: null,
      graphicDensity: null,
      rhythmicEnergy: null
    };
    if (!directed || !state) return base;
    return {
      ...base,
      visualAgency: normalizeAuthority(state.agency),
      cameraAuthority: normalizeAuthority(state.variables?.camera?.perspective),
      colorTerritory: normalizeAuthority(state.variables?.color?.territory),
      spatialPressure: deriveSpatialPressure(state),
      graphicDensity: deriveGraphicDensity(state),
      rhythmicEnergy: deriveRhythmicEnergy(state)
    };
  }

  function deriveProjectArc(projectState = {}) {
    const order = Array.isArray(projectState.sceneOrder) ? projectState.sceneOrder : [];
    const scenes = order.map(id => deriveDirectedScene(projectState.scenes?.[id] || { id }));
    return {
      sceneOrder: order.slice(),
      scenes,
      rows: {
        narrativeRole: scenes.map(scene => scene.narrativeRole),
        agency: scenes.map(scene => scene.visualAgency),
        camera: scenes.map(scene => scene.cameraAuthority),
        color: scenes.map(scene => scene.colorTerritory),
        space: scenes.map(scene => scene.spatialPressure),
        density: scenes.map(scene => scene.graphicDensity),
        rhythm: scenes.map(scene => scene.rhythmicEnergy)
      }
    };
  }

  return {
    deriveProjectArc,
    deriveSpatialPressure,
    deriveGraphicDensity,
    deriveRhythmicEnergy
  };
});
