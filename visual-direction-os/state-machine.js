((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSStateMachine = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const cases = {
    miles: {
      label: 'Miles', thesis: 'Identity collision → self-authorship', mechanism: 'Urban texture, chromatic disagreement and perspective instability become legible only when tied to authorship pressure.',
      states: [
        { id: 'inherited', narrativeState: 'inherited identity', agency: 'world', ownership: { character: 'low', world: 'high', narrative: 'medium' }, variables: { color: { temperature: 'neutral', territory: 'world' }, space: { compression: 'low' }, camera: { perspective: 'world', stability: 'high' }, line: { stability: 'high', density: 'medium' }, texture: { noise: 'medium', granularity: 'medium' }, rhythm: { motionEnergy: 'low', cutDensity: 'low' } } },
        { id: 'collision', narrativeState: 'identity collision', agency: 'contested', ownership: { character: 'medium', world: 'medium', narrative: 'high' }, variables: { color: { temperature: 'mixed', territory: 'contested' }, space: { compression: 'medium' }, camera: { perspective: 'mixed', stability: 'medium' }, line: { stability: 'medium', density: 'high' }, texture: { noise: 'high', granularity: 'high' }, rhythm: { motionEnergy: 'medium', cutDensity: 'medium' } } },
        { id: 'pressure', narrativeState: 'multiverse pressure', agency: 'contested', ownership: { character: 'medium', world: 'high', narrative: 'high' }, variables: { color: { temperature: 'split', territory: 'contested' }, space: { compression: 'high' }, camera: { perspective: 'unstable', stability: 'low' }, line: { stability: 'low', density: 'high' }, texture: { noise: 'high', granularity: 'high' }, rhythm: { motionEnergy: 'high', cutDensity: 'high' } } },
        { id: 'authorship', narrativeState: 'self-authorship', agency: 'character', ownership: { character: 'high', world: 'medium', narrative: 'medium' }, variables: { color: { temperature: 'warm', territory: 'character' }, space: { compression: 'medium' }, camera: { perspective: 'character', stability: 'medium' }, line: { stability: 'medium', density: 'medium' }, texture: { noise: 'medium', granularity: 'medium' }, rhythm: { motionEnergy: 'high', cutDensity: 'medium' } } }
      ]
    },
    gwen: {
      label: 'Gwen', thesis: 'Emotion owns environment', mechanism: 'Palette temperature, negative space, abstraction and edge softness move with emotional safety rather than decorative mood.',
      states: [
        { id: 'isolation', narrativeState: 'isolation', agency: 'world', ownership: { character: 'low', world: 'high', narrative: 'medium' }, variables: { color: { temperature: 'cool', territory: 'world' }, space: { compression: 'low', openness: 'high', negativeSpace: 'high' }, camera: { distance: 'far', stability: 'high', perspective: 'world' }, line: { stability: 'medium', density: 'low' }, texture: { noise: 'low', granularity: 'low', materiality: 'soft' }, rhythm: { motionEnergy: 'low', cutDensity: 'low' } } },
        { id: 'connection', narrativeState: 'connection', agency: 'contested', ownership: { character: 'medium', world: 'medium', narrative: 'high' }, variables: { color: { temperature: 'warm', territory: 'shared' }, space: { compression: 'low', openness: 'medium', negativeSpace: 'medium' }, camera: { distance: 'medium', stability: 'medium', perspective: 'mixed' }, line: { stability: 'soft', density: 'medium' }, texture: { noise: 'low', granularity: 'medium', materiality: 'bleed' }, rhythm: { motionEnergy: 'medium', cutDensity: 'low' } } },
        { id: 'rupture', narrativeState: 'rupture', agency: 'contested', ownership: { character: 'medium', world: 'low', narrative: 'high' }, variables: { color: { temperature: 'split', territory: 'narrative' }, space: { compression: 'high', openness: 'low', negativeSpace: 'high' }, camera: { distance: 'close', stability: 'low', perspective: 'subjective' }, line: { stability: 'low', density: 'low' }, texture: { noise: 'medium', granularity: 'high', materiality: 'bleed' }, rhythm: { motionEnergy: 'high', cutDensity: 'medium' } } },
        { id: 'self-ownership', narrativeState: 'self-ownership', agency: 'character', ownership: { character: 'high', world: 'low', narrative: 'medium' }, variables: { color: { temperature: 'warm', territory: 'character' }, space: { compression: 'medium', openness: 'high', negativeSpace: 'intentional' }, camera: { distance: 'medium', stability: 'medium', perspective: 'character' }, line: { stability: 'soft', density: 'medium' }, texture: { noise: 'low', granularity: 'medium', materiality: 'controlled bleed' }, rhythm: { motionEnergy: 'medium', cutDensity: 'low' } } }
      ]
    },
    hobie: {
      label: 'Hobie', thesis: 'Character refuses system ownership', mechanism: 'Discontinuity, print texture and timing mismatch remain character-owned instead of being normalized by the world.',
      states: [
        { id: 'imposed', narrativeState: 'system imposed', agency: 'world', ownership: { character: 'low', world: 'high', narrative: 'medium' }, variables: { color: { temperature: 'neutral', territory: 'world' }, camera: { perspective: 'world', stability: 'high' }, line: { stability: 'high', density: 'medium' }, texture: { noise: 'low', granularity: 'low' }, rhythm: { motionEnergy: 'low', repetition: 'stable' } } },
        { id: 'refusal', narrativeState: 'refusal', agency: 'character', ownership: { character: 'high', world: 'medium', narrative: 'high' }, variables: { color: { temperature: 'mixed', territory: 'character' }, camera: { perspective: 'character', stability: 'medium' }, line: { stability: 'low', density: 'high' }, texture: { noise: 'high', granularity: 'high' }, rhythm: { motionEnergy: 'high', repetition: 'off-grid' } } },
        { id: 'rupture', narrativeState: 'graphic rupture', agency: 'character', ownership: { character: 'high', world: 'low', narrative: 'high' }, variables: { color: { temperature: 'split', territory: 'character' }, camera: { perspective: 'independent', stability: 'low' }, line: { stability: 'low', density: 'high' }, texture: { noise: 'high', granularity: 'high' }, rhythm: { motionEnergy: 'high', repetition: 'mismatched' } } },
        { id: 'independent', narrativeState: 'independent field', agency: 'character', ownership: { character: 'high', world: 'low', narrative: 'medium' }, variables: { color: { temperature: 'mixed', territory: 'character' }, camera: { perspective: 'character', stability: 'medium' }, line: { stability: 'intentional', density: 'medium' }, texture: { noise: 'high', granularity: 'medium' }, rhythm: { motionEnergy: 'medium', repetition: 'self-timed' } } }
      ]
    },
    elian: {
      label: 'Elian', thesis: 'Focus ownership shift', mechanism: 'Clarity and focal hierarchy move from institutional assignment toward deliberate character choice.',
      states: [
        { id: 'assigned', narrativeState: 'assigned focus', agency: 'world', ownership: { character: 'low', world: 'high', narrative: 'medium' }, variables: { color: { temperature: 'neutral', territory: 'world' }, space: { compression: 'low' }, camera: { perspective: 'world', stability: 'high' }, line: { stability: 'high' }, texture: { noise: 'low' }, rhythm: { motionEnergy: 'low' } } },
        { id: 'conflict', narrativeState: 'forbidden detail', agency: 'contested', ownership: { character: 'medium', world: 'medium', narrative: 'high' }, variables: { color: { temperature: 'neutral', territory: 'contested' }, space: { compression: 'medium' }, camera: { perspective: 'mixed', stability: 'medium' }, line: { stability: 'medium' }, texture: { noise: 'medium' }, rhythm: { motionEnergy: 'medium' } } },
        { id: 'collapse', narrativeState: 'perceptual collapse', agency: 'contested', ownership: { character: 'low', world: 'low', narrative: 'high' }, variables: { color: { temperature: 'split', territory: 'narrative' }, space: { compression: 'high' }, camera: { perspective: 'unstable', stability: 'low' }, line: { stability: 'low' }, texture: { noise: 'high' }, rhythm: { motionEnergy: 'high' } } },
        { id: 'self-directed', narrativeState: 'self-directed focus', agency: 'character', ownership: { character: 'high', world: 'low', narrative: 'medium' }, variables: { color: { temperature: 'warm', territory: 'character' }, space: { compression: 'medium' }, camera: { perspective: 'character', stability: 'medium' }, line: { stability: 'medium' }, texture: { noise: 'low' }, rhythm: { motionEnergy: 'medium' } } }
      ]
    }
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const listCases = () => Object.keys(cases);
  function sampleCase(caseId = 'elian', playhead = 0) {
    const entry = cases[caseId] || cases.elian;
    const t = clamp01(playhead);
    const index = Math.min(entry.states.length - 1, Math.floor(t * (entry.states.length - 1) + 0.5));
    const state = clone(entry.states[index]);
    return { caseId: cases[caseId] ? caseId : 'elian', label: entry.label, thesis: entry.thesis, mechanism: entry.mechanism, stateIndex: index, stateCount: entry.states.length, playhead: t, ...state };
  }

  function initStateMachine(root, scene) {
    if (!root || !scene) return () => {};
    root.innerHTML = `<div class="case-tabs" role="tablist" aria-label="Mechanism case studies">${listCases().map((id, i) => `<button type="button" role="tab" data-case="${id}" aria-selected="${i === 3 ? 'true' : 'false'}">${cases[id].label}</button>`).join('')}</div><p class="mechanism-note" id="mechanism-note">Mechanism, not style imitation.</p><div class="state-timeline"><input id="case-playhead" type="range" min="0" max="100" value="0" step="1" aria-label="Character visual state timeline"><div class="state-ticks" aria-hidden="true"></div></div><div class="case-state-panel" aria-live="polite"><p class="eyebrow">Current visual state</p><h3 id="case-state-title"></h3><p id="case-thesis"></p><dl><div><dt>Agency</dt><dd id="case-agency"></dd></div><div><dt>Color territory</dt><dd id="case-color"></dd></div><div><dt>Camera</dt><dd id="case-camera"></dd></div><div><dt>Line</dt><dd id="case-line"></dd></div><div><dt>Texture</dt><dd id="case-texture"></dd></div></dl></div>`;
    const input = root.querySelector('#case-playhead');
    let activeCase = scene.getSceneState().activeCase || 'elian';
    const apply = (source = 'state-machine') => {
      const sampled = sampleCase(activeCase, Number(input.value) / 100);
      scene.updateSceneState({ activeCase, playhead: sampled.playhead, narrativeState: sampled.narrativeState, agency: sampled.agency, ownership: sampled.ownership, variables: sampled.variables }, source);
      root.querySelector('#case-state-title').textContent = `${sampled.label} / ${sampled.narrativeState}`;
      root.querySelector('#case-thesis').textContent = sampled.mechanism;
      root.querySelector('#case-agency').textContent = sampled.agency;
      root.querySelector('#case-color').textContent = sampled.variables.color?.territory || '—';
      root.querySelector('#case-camera').textContent = `${sampled.variables.camera?.perspective || '—'} / ${sampled.variables.camera?.stability || '—'}`;
      root.querySelector('#case-line').textContent = sampled.variables.line?.stability || '—';
      root.querySelector('#case-texture').textContent = sampled.variables.texture?.materiality || sampled.variables.texture?.noise || '—';
      root.querySelectorAll('[data-case]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.case === activeCase)));
    };
    root.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => { activeCase = button.dataset.case; input.value = '0'; apply('state-machine:case'); }));
    input.addEventListener('input', () => apply('state-machine:playhead'));
    apply('state-machine:init');
    return () => {};
  }

  return { cases: clone(cases), listCases, sampleCase, initStateMachine };
});