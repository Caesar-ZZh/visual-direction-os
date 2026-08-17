(function (global) {
  'use strict';

  const LEVELS = ['low', 'medium', 'high'];
  const clampLevel = (value, fallback = 'medium') => LEVELS.includes(value) ? value : fallback;

  function derivePressure(space = {}) {
    const compression = clampLevel(space.compression, 'low');
    const openness = clampLevel(space.openness, 'medium');
    if (compression === 'high' || (compression === 'medium' && openness === 'low')) return 'high';
    if (compression === 'medium' || openness === 'low') return 'medium';
    return 'low';
  }

  function deriveLine(line = {}) {
    if (line.stability === 'low' || line.density === 'high') return 'unstable';
    if (line.stability === 'medium') return 'active';
    return 'stable';
  }

  function deriveTexture(texture = {}) {
    if (texture.noise === 'high' || texture.granularity === 'high') return 'high';
    if (texture.noise === 'medium' || texture.granularity === 'medium') return 'medium';
    return 'low';
  }

  function deriveMotion(rhythm = {}) {
    if (rhythm.motionEnergy === 'high' || rhythm.cutDensity === 'high') return 'high';
    if (rhythm.motionEnergy === 'medium' || rhythm.cutDensity === 'medium') return 'medium';
    return 'low';
  }

  function deriveFocus(camera = {}) {
    if (camera.perspective === 'character') return 'character';
    if (camera.perspective === 'mixed' || camera.perspective === 'contested' || camera.perspective === 'shared') return 'mixed';
    return 'world';
  }

  function deriveVisualResponse(sceneState = {}) {
    const variables = sceneState.variables || {};
    const color = variables.color || {};
    const space = variables.space || {};
    const camera = variables.camera || {};
    const line = variables.line || {};
    const texture = variables.texture || {};
    const rhythm = variables.rhythm || {};

    const temperature = ['cool', 'neutral', 'warm'].includes(color.temperature) ? color.temperature : 'neutral';
    const territory = ['world', 'contested', 'character'].includes(color.territory) ? color.territory : 'world';
    const agency = ['world', 'contested', 'character', 'shared'].includes(sceneState.agency) ? sceneState.agency : 'world';
    const pressure = derivePressure(space);
    const focus = deriveFocus(camera);
    const focusDistance = ['near', 'medium', 'far'].includes(camera.distance) ? camera.distance : 'medium';
    const lineState = deriveLine(line);
    const textureState = deriveTexture(texture);
    const motion = deriveMotion(rhythm);

    const focusX = focus === 'character' ? 46 : focus === 'mixed' ? 58 : 74;
    const focusY = focus === 'character' ? 42 : focus === 'mixed' ? 34 : 26;
    const focusScale = focusDistance === 'near' ? 0.78 : focusDistance === 'far' ? 1.28 : 1;
    const pressureValue = pressure === 'high' ? 1 : pressure === 'medium' ? 0.58 : 0.2;
    const lineOpacity = lineState === 'unstable' ? 0.34 : lineState === 'active' ? 0.22 : 0.12;
    const textureOpacity = textureState === 'high' ? 0.11 : textureState === 'medium' ? 0.065 : 0.025;
    const textureSize = textureState === 'high' ? 10 : textureState === 'medium' ? 18 : 28;
    const motionDuration = motion === 'high' ? 180 : motion === 'medium' ? 320 : 520;

    const atmosphere = temperature === 'warm'
      ? ['rgba(137,63,33,.28)', 'rgba(72,34,27,.12)']
      : temperature === 'cool'
        ? ['rgba(51,69,84,.28)', 'rgba(37,48,60,.12)']
        : ['rgba(102,76,63,.18)', 'rgba(52,58,65,.10)'];

    return {
      temperature,
      territory,
      agency,
      pressure,
      focus,
      focusDistance,
      line: lineState,
      texture: textureState,
      motion,
      css: {
        atmosphereA: atmosphere[0],
        atmosphereB: atmosphere[1],
        focusX,
        focusY,
        focusScale,
        pressure: pressureValue,
        lineOpacity,
        textureOpacity,
        textureSize,
        motionDuration
      }
    };
  }

  function setText(root, selector, value) {
    const node = root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
    if (node) node.textContent = value;
  }

  function applyVisualResponse(root, response) {
    if (!root || !response) return response;
    const attrs = {
      'data-vr-temperature': response.temperature,
      'data-vr-agency': response.agency,
      'data-vr-pressure': response.pressure,
      'data-vr-focus': response.focus,
      'data-vr-focus-distance': response.focusDistance,
      'data-vr-line': response.line,
      'data-vr-texture': response.texture,
      'data-vr-motion': response.motion,
      'data-vr-territory': response.territory
    };
    Object.entries(attrs).forEach(([name, value]) => root.setAttribute?.(name, value));

    const css = response.css || {};
    const vars = {
      '--vr-atmosphere-a': css.atmosphereA,
      '--vr-atmosphere-b': css.atmosphereB,
      '--vr-focus-x': `${css.focusX}%`,
      '--vr-focus-y': `${css.focusY}%`,
      '--vr-focus-scale': css.focusScale,
      '--vr-pressure': css.pressure,
      '--vr-line-opacity': css.lineOpacity,
      '--vr-texture-opacity': css.textureOpacity,
      '--vr-texture-size': `${css.textureSize}px`,
      '--vr-motion-duration': `${css.motionDuration}ms`
    };
    Object.entries(vars).forEach(([name, value]) => root.style?.setProperty?.(name, String(value)));

    const territoryLabel = response.territory === 'character' ? 'CHARACTER-LED' : response.territory === 'contested' ? 'CONTESTED' : 'WORLD-LED';
    setText(root, '#vr-atmosphere', `ATMOSPHERE · ${response.temperature.toUpperCase()} / ${territoryLabel}`);
    setText(root, '#vr-pressure', `PRESSURE · ${response.pressure.toUpperCase()}`);
    setText(root, '#vr-focus', `FOCUS · ${response.focus.toUpperCase()} / ${response.focusDistance.toUpperCase()}`);
    setText(root, '#vr-motion', `MOTION · ${response.motion.toUpperCase()}`);
    return response;
  }

  function initDesktopRail(root) {
    const doc = root?.ownerDocument || global.document;
    const rail = doc?.querySelector?.('.v2-rail');
    if (!rail || typeof rail.addEventListener !== 'function') return () => {};

    let pointerInside = false;
    let revealTimer = null;
    const clearRevealTimer = () => {
      if (revealTimer !== null && typeof global.clearTimeout === 'function') global.clearTimeout(revealTimer);
      revealTimer = null;
    };
    const expand = () => rail.setAttribute('data-expanded', 'true');
    const collapseIfIdle = () => {
      const active = doc?.activeElement;
      if (!pointerInside && !(active && rail.contains(active))) rail.removeAttribute('data-expanded');
    };
    const onPointerEnter = () => {
      pointerInside = true;
      clearRevealTimer();
      revealTimer = global.setTimeout?.(() => {
        revealTimer = null;
        if (pointerInside) expand();
      }, 100) ?? null;
    };
    const onPointerLeave = () => {
      pointerInside = false;
      clearRevealTimer();
      collapseIfIdle();
    };
    const onFocusIn = expand;
    const onFocusOut = () => global.setTimeout?.(collapseIfIdle, 0);

    rail.removeAttribute('data-expanded');
    rail.addEventListener('pointerenter', onPointerEnter);
    rail.addEventListener('pointerleave', onPointerLeave);
    rail.addEventListener('focusin', onFocusIn);
    rail.addEventListener('focusout', onFocusOut);

    return () => {
      clearRevealTimer();
      rail.removeEventListener('pointerenter', onPointerEnter);
      rail.removeEventListener('pointerleave', onPointerLeave);
      rail.removeEventListener('focusin', onFocusIn);
      rail.removeEventListener('focusout', onFocusOut);
      rail.removeAttribute('data-expanded');
    };
  }

  function initVisualResponse(root, sceneApi) {
    const api = sceneApi || global.VDOSScene;
    if (!root || !api || typeof api.subscribeSceneState !== 'function') return () => {};
    const cleanupRail = initDesktopRail(root);
    const unsubscribe = api.subscribeSceneState((state) => applyVisualResponse(root, deriveVisualResponse(state)));
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      cleanupRail();
    };
  }

  const api = { deriveVisualResponse, applyVisualResponse, initDesktopRail, initVisualResponse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.VDOSVisualResponse = api;
})(typeof window !== 'undefined' ? window : globalThis);
