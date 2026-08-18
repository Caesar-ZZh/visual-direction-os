((root, factory) => {
  const nodeModel = typeof module === 'object' && module.exports ? require('./sequence-director-model.js') : null;
  const api = factory(() => nodeModel || root?.VDOSSequenceDirectorModel);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSSequenceScore = api;
})(typeof window !== 'undefined' ? window : globalThis, resolveModel => {
  'use strict';

  const model = () => {
    const current = resolveModel();
    if (!current) throw new Error('VDOSSequenceDirectorModel is required before sampling sequence state');
    return current;
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function sampleSequence(playhead = 0) {
    return model().sampleSequence(playhead);
  }

  function initSequenceScore(root, scene) {
    if (!root || !scene) return () => {};
    const sequence = model().DEFAULT_SEQUENCE;
    const ownershipEvents = (sequence.events || []).filter(event => event.type === 'OWNERSHIP SHIFT');
    root.innerHTML = `<div class="score-toolbar"><label for="sequence-playhead">Sequence playhead</label><input id="sequence-playhead" type="range" min="0" max="100" value="0" step="1"><output id="sequence-beat">SETUP</output></div><div class="score-tracks" role="img" aria-describedby="sequence-text-state">${['color','space','camera','line','texture','agency'].map(name => `<div class="score-track"><span>${name}</span><div class="score-track-line"><i data-score-fill="${name}"></i></div><b data-score-value="${name}">low</b></div>`).join('')}</div><div class="ownership-markers" aria-label="Ownership shift markers">${ownershipEvents.map(event => `<button type="button" data-sequence-marker="${event.at}" style="--marker:${event.at * 100}%">${event.type.replace(' SHIFT',' Shift')}</button>`).join('')}</div><p id="sequence-text-state" class="mechanism-note" aria-live="polite"></p>`;
    const input = root.querySelector('#sequence-playhead');

    const render = (t, source) => {
      const sample = sampleSequence(t);
      root.querySelector('#sequence-beat').textContent = sample.currentBeat.label;
      Object.entries(sample.tracks).forEach(([name, value]) => {
        const fill = root.querySelector(`[data-score-fill="${name}"]`);
        if (fill) fill.style.width = `${Math.round(value * 100)}%`;
        const text = root.querySelector(`[data-score-value="${name}"]`);
        if (text) text.textContent = sample.qualitative[name];
      });
      root.querySelector('#sequence-text-state').textContent = `${sample.currentBeat.label}: ${Object.entries(sample.qualitative).map(([key, value]) => `${key} ${value}`).join(' · ')} · agency ${sample.agency}`;
      scene.updateSceneState({
        ...clone(sample.patch),
        playhead: sample.playhead,
        narrativeState: sample.currentBeat.id,
        diagnosticContext: {
          hasNarrativeCause: true,
          primaryChanges: 1 + sample.hierarchy.support.length,
          sequenceBeat: sample.currentBeat.id,
          declaredPrimary: sample.hierarchy.primary,
          restrainedVariables: sample.hierarchy.restrain,
          tension: sample.tension
        }
      }, source);
    };

    input.addEventListener('input', () => render(Number(input.value) / 100, 'sequence-score:playhead'));
    root.querySelectorAll('[data-sequence-marker]').forEach(button => button.addEventListener('click', () => {
      input.value = String(Number(button.dataset.sequenceMarker) * 100);
      render(Number(button.dataset.sequenceMarker), 'sequence-score:marker');
    }));
    render(0, 'sequence-score:init');
    return () => {};
  }

  return {
    get beats() { return clone(model().DEFAULT_SEQUENCE.beats); },
    sampleSequence,
    initSequenceScore
  };
});
