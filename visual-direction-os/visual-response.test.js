const assert = require('assert');

const { deriveVisualResponse, applyVisualResponse } = require('./visual-response.js');

function scene(overrides = {}) {
  const base = {
    mode: 'direct',
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
  };

  const merge = (a, b) => {
    const out = { ...a };
    Object.entries(b || {}).forEach(([key, value]) => {
      out[key] = value && typeof value === 'object' && !Array.isArray(value) && a?.[key] && typeof a[key] === 'object'
        ? merge(a[key], value)
        : value;
    });
    return out;
  };
  return merge(base, overrides);
}

{
  const response = deriveVisualResponse(scene());
  assert.equal(response.temperature, 'neutral');
  assert.equal(response.agency, 'world');
  assert.equal(response.pressure, 'low');
  assert.equal(response.focus, 'world');
  assert.equal(response.focusDistance, 'medium');
  assert.equal(response.line, 'stable');
  assert.equal(response.texture, 'low');
  assert.equal(response.motion, 'low');
}

{
  const response = deriveVisualResponse(scene({
    variables: {
      color: { temperature: 'warm', territory: 'character' },
      space: { compression: 'high', openness: 'low' },
      camera: { perspective: 'character', distance: 'near' },
      rhythm: { motionEnergy: 'medium', cutDensity: 'medium' }
    },
    agency: 'character'
  }));
  assert.equal(response.temperature, 'warm');
  assert.equal(response.territory, 'character');
  assert.equal(response.pressure, 'high');
  assert.equal(response.focus, 'character');
  assert.equal(response.focusDistance, 'near');
  assert.equal(response.agency, 'character');
  assert.ok(response.css.focusScale < 1);
}

{
  const response = deriveVisualResponse(scene({
    variables: {
      color: { temperature: 'neutral', territory: 'contested' },
      camera: { perspective: 'mixed', stability: 'medium' },
      line: { stability: 'low', density: 'high' },
      texture: { noise: 'high', granularity: 'high' },
      rhythm: { motionEnergy: 'high', cutDensity: 'high' }
    },
    agency: 'contested'
  }));
  assert.equal(response.agency, 'contested');
  assert.equal(response.focus, 'mixed');
  assert.equal(response.line, 'unstable');
  assert.equal(response.texture, 'high');
  assert.equal(response.motion, 'high');
  assert.ok(response.css.lineOpacity > 0.2);
  assert.ok(response.css.textureOpacity > 0.05);
}

{
  const input = scene({
    variables: {
      color: { temperature: 'cool', territory: 'world' },
      camera: { perspective: 'world', distance: 'far' },
      space: { compression: 'low' }
    },
    agency: 'character'
  });
  const before = JSON.stringify(input);
  const response = deriveVisualResponse(input);
  assert.equal(response.temperature, 'cool');
  assert.equal(response.territory, 'world');
  assert.equal(response.focus, 'world');
  assert.equal(JSON.stringify(input), before, 'deriveVisualResponse must not mutate scene state');
}

{
  const attrs = {};
  const styles = {};
  const root = {
    dataset: {},
    setAttribute(name, value) { attrs[name] = String(value); },
    style: { setProperty(name, value) { styles[name] = String(value); } },
    querySelector() { return null; }
  };
  const response = deriveVisualResponse(scene());
  applyVisualResponse(root, response);
  assert.equal(attrs['data-vr-temperature'], 'neutral');
  assert.equal(attrs['data-vr-pressure'], 'low');
  assert.ok(styles['--vr-focus-x']);
  assert.ok(styles['--vr-motion-duration']);
}

console.log('visual response tests passed');
