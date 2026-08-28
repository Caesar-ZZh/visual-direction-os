((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSTimelineSync = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  function deriveTimelineView(sceneState = {}, stateMachine, sequence) {
    if (!stateMachine || !sequence) throw new Error('stateMachine and sequence models are required');
    const playhead = Math.max(0, Math.min(1, Number(sceneState.playhead) || 0));
    return {
      caseView: stateMachine.sampleCase(sceneState.activeCase || 'elian', playhead),
      sequenceView: sequence.sampleSequence(playhead)
    };
  }

  function syncTimelines(scene, stateMachine, sequence, doc = (typeof document !== 'undefined' ? document : null)) {
    if (!scene || !stateMachine || !sequence || !doc) return () => {};
    const render = state => {
      const { caseView, sequenceView } = deriveTimelineView(state, stateMachine, sequence);
      const caseInput = doc.querySelector('#case-playhead');
      const sequenceInput = doc.querySelector('#sequence-playhead');
      if (caseInput) caseInput.value = String(Math.round(caseView.playhead * 100));
      if (sequenceInput) sequenceInput.value = String(Math.round(sequenceView.playhead * 100));

      doc.querySelectorAll('[data-case]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.case === caseView.caseId)));
      const title = doc.querySelector('#case-state-title'); if (title) title.textContent = `${caseView.label} / ${caseView.narrativeState}`;
      const thesis = doc.querySelector('#case-thesis'); if (thesis) thesis.textContent = caseView.mechanism;
      const agency = doc.querySelector('#case-agency'); if (agency) agency.textContent = state.agency || caseView.agency;
      const color = doc.querySelector('#case-color'); if (color) color.textContent = state.variables?.color?.territory || caseView.variables.color?.territory || '—';
      const camera = doc.querySelector('#case-camera'); if (camera) camera.textContent = `${state.variables?.camera?.perspective || caseView.variables.camera?.perspective || '—'} / ${state.variables?.camera?.stability || caseView.variables.camera?.stability || '—'}`;
      const line = doc.querySelector('#case-line'); if (line) line.textContent = state.variables?.line?.stability || caseView.variables.line?.stability || '—';
      const texture = doc.querySelector('#case-texture'); if (texture) texture.textContent = state.variables?.texture?.materiality || state.variables?.texture?.noise || caseView.variables.texture?.materiality || caseView.variables.texture?.noise || '—';

      const beat = doc.querySelector('#sequence-beat'); if (beat) beat.textContent = sequenceView.currentBeat.label;
      Object.entries(sequenceView.tracks).forEach(([name,value]) => {
        const fill = doc.querySelector(`[data-score-fill="${name}"]`); if (fill) fill.style.width = `${Math.round(value * 100)}%`;
        const text = doc.querySelector(`[data-score-value="${name}"]`); if (text) text.textContent = sequenceView.qualitative[name];
      });
      const sequenceText = doc.querySelector('#sequence-text-state');
      if (sequenceText) sequenceText.textContent = `${sequenceView.currentBeat.label}: ${Object.entries(sequenceView.qualitative).map(([key,value]) => `${key} ${value}`).join(' · ')} · scene agency ${state.agency}`;
    };
    return scene.subscribeSceneState(render);
  }

  return { deriveTimelineView, syncTimelines };
});