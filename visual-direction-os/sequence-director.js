((root, factory) => {
  const api = factory(() => root?.VDOSSequenceDirectorModel);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSSequenceDirector = api;
})(typeof window !== 'undefined' ? window : globalThis, resolveModel => {
  'use strict';

  const TRACKS = ['color', 'space', 'camera', 'line', 'texture', 'agency'];
  const clone = value => JSON.parse(JSON.stringify(value));

  const model = () => {
    const current = resolveModel();
    if (!current) throw new Error('VDOSSequenceDirectorModel is required before Sequence Director initialization');
    return current;
  };

  function eventLabel(event = {}) {
    return event.type || 'VISUAL EVENT';
  }

  function eventDetailMarkup(event) {
    if (!event) {
      return `<p class="sequence-detail-empty">Move through the sequence or select a visual event to inspect its causal role.</p>`;
    }
    const support = (event.supportingChanges || []).join(' · ') || '—';
    const held = (event.heldBack || []).join(' · ') || '—';
    return `
      <div class="sequence-event-heading"><span>VISUAL EVENT</span><strong>${eventLabel(event)}</strong></div>
      <dl class="sequence-event-readout">
        <div><dt>Cause</dt><dd>${event.cause || '—'}</dd></div>
        <div><dt>Primary change</dt><dd>${event.primaryChange || '—'}</dd></div>
        <div><dt>Supporting change</dt><dd>${support}</dd></div>
        <div><dt>Held back</dt><dd>${held}</dd></div>
      </dl>`;
  }

  function initSequenceDirector(rootNode, scene) {
    if (!rootNode || !scene) return { destroy() {} };
    const sequenceModel = model();
    const sequence = sequenceModel.DEFAULT_SEQUENCE;
    let selectedEventId = null;

    rootNode.innerHTML = `
      <div class="sequence-director-toolbar">
        <div class="sequence-playhead-copy"><span>SEQUENCE PLAYHEAD</span><output id="sequence-beat">SETUP</output></div>
        <label class="sr-only" for="sequence-playhead">Sequence playhead</label>
        <input id="sequence-playhead" type="range" min="0" max="100" value="0" step="1" aria-label="Sequence playhead">
      </div>

      <section class="sequence-tension" aria-label="Narrative tension curve" data-tension="low">
        <div class="sequence-tension-head"><span>NARRATIVE TENSION</span><strong data-tension-value>LOW</strong></div>
        <div class="sequence-tension-chart" aria-hidden="true">
          <svg viewBox="0 0 100 34" preserveAspectRatio="none">
            <path class="sequence-tension-base" d="M0 27 C14 27 20 23 30 18 C38 14 42 4 50 4 C58 4 62 17 70 21 C80 25 86 17 100 16"></path>
            <path class="sequence-tension-active" data-tension-path d="M0 27 C14 27 20 23 30 18 C38 14 42 4 50 4 C58 4 62 17 70 21 C80 25 86 17 100 16"></path>
          </svg>
          <i class="sequence-tension-marker" data-tension-marker></i>
          <div class="sequence-tension-axis"><span>LOW</span><span>MEDIUM</span><span>HIGH</span></div>
        </div>
      </section>

      <div class="sequence-beat-band" aria-label="Narrative beats">
        ${sequence.beats.map(beat => `<div class="sequence-beat" data-sequence-beat="${beat.id}" style="--beat-start:${beat.start * 100}%;--beat-span:${(beat.end - beat.start) * 100}%"><span>${beat.label}</span><small>${beat.narrativePurpose}</small></div>`).join('')}
      </div>

      <div class="sequence-events" aria-label="Visual events">
        <div class="sequence-event-line" aria-hidden="true"></div>
        ${sequence.events.map(event => `<button type="button" data-sequence-event="${event.id}" data-event-at="${event.at}" style="--event-at:${event.at * 100}%" aria-pressed="false"><i aria-hidden="true"></i><span>${eventLabel(event)}</span></button>`).join('')}
      </div>

      <div class="score-tracks" role="img" aria-describedby="sequence-text-state">
        ${TRACKS.map(name => `<div class="score-track"><span>${name}</span><div class="score-track-line"><i data-score-fill="${name}"></i></div><b data-score-value="${name}">low</b></div>`).join('')}
      </div>

      <div class="sequence-detail-grid">
        <section class="sequence-hierarchy" aria-live="polite">
          <div class="sequence-detail-heading"><span>ACTIVE BEAT HIERARCHY</span><strong data-hierarchy-beat>SETUP</strong></div>
          <div class="sequence-hierarchy-grid">
            <div data-hierarchy-role="primary"><span>PRIMARY</span><strong data-hierarchy-primary>CAMERA</strong></div>
            <div data-hierarchy-role="support"><span>SUPPORT</span><strong data-hierarchy-support>COLOR · SPACE</strong></div>
            <div data-hierarchy-role="restrain"><span>RESTRAIN</span><strong data-hierarchy-restrain>TEXTURE · LINE · RHYTHM</strong></div>
          </div>
          <p data-beat-purpose></p>
        </section>
        <section class="sequence-event-detail" aria-live="polite">${eventDetailMarkup(null)}</section>
      </div>

      <p id="sequence-text-state" class="mechanism-note" aria-live="polite"></p>`;

    const input = rootNode.querySelector('#sequence-playhead');
    const beatOutput = rootNode.querySelector('#sequence-beat');

    function selectedEventFor(view) {
      if (selectedEventId) {
        const explicit = sequence.events.find(event => event.id === selectedEventId);
        if (explicit) return explicit;
      }
      return view.events.length ? view.events[view.events.length - 1] : null;
    }

    function renderView(view) {
      if (!view?.beat) return;
      input.value = String(Math.round(view.playhead * 100));
      beatOutput.textContent = view.beat.label;

      rootNode.querySelectorAll('[data-sequence-beat]').forEach(node => {
        const active = node.dataset.sequenceBeat === view.beat.id;
        node.dataset.active = String(active);
      });

      const tension = rootNode.querySelector('.sequence-tension');
      tension.dataset.tension = view.tension;
      rootNode.querySelector('[data-tension-value]').textContent = String(view.tension).toUpperCase();
      rootNode.querySelector('[data-tension-marker]').style.left = `${view.playhead * 100}%`;

      Object.entries(view.tracks).forEach(([name, value]) => {
        const fill = rootNode.querySelector(`[data-score-fill="${name}"]`);
        if (fill) fill.style.width = `${Math.round(value * 100)}%`;
        const text = rootNode.querySelector(`[data-score-value="${name}"]`);
        if (text) text.textContent = view.qualitative[name];
      });

      rootNode.querySelector('[data-hierarchy-beat]').textContent = view.beat.label;
      rootNode.querySelector('[data-hierarchy-primary]').textContent = String(view.hierarchy.primary || '—').toUpperCase();
      rootNode.querySelector('[data-hierarchy-support]').textContent = view.hierarchy.support.length ? view.hierarchy.support.map(value => value.toUpperCase()).join(' · ') : '—';
      rootNode.querySelector('[data-hierarchy-restrain]').textContent = view.hierarchy.restrain.length ? view.hierarchy.restrain.map(value => value.toUpperCase()).join(' · ') : '—';
      rootNode.querySelector('[data-beat-purpose]').textContent = view.beat.narrativePurpose;

      const selected = selectedEventFor(view);
      rootNode.querySelector('.sequence-event-detail').innerHTML = eventDetailMarkup(selected);
      rootNode.querySelectorAll('[data-sequence-event]').forEach(button => {
        const event = sequence.events.find(item => item.id === button.dataset.sequenceEvent);
        const reached = Number(event?.at) <= view.playhead;
        button.dataset.reached = String(reached);
        button.setAttribute('aria-pressed', String(button.dataset.sequenceEvent === selected?.id));
      });

      rootNode.querySelector('#sequence-text-state').textContent = `${view.beat.label}: ${Object.entries(view.qualitative).map(([key, value]) => `${key} ${value}`).join(' · ')} · primary ${view.hierarchy.primary} · tension ${view.tension}`;
    }

    function publish(playhead, source = 'sequence-director:playhead') {
      const view = sequenceModel.deriveSequenceState(sequence, playhead);
      selectedEventId = null;
      renderView(view);
      scene.updateSceneState({
        ...clone(view.patch),
        playhead: view.playhead,
        narrativeState: view.beat.id,
        diagnosticContext: {
          hasNarrativeCause: true,
          primaryChanges: 1 + view.hierarchy.support.length,
          sequenceBeat: view.beat.id,
          declaredPrimary: view.hierarchy.primary,
          restrainedVariables: clone(view.hierarchy.restrain),
          tension: view.tension
        }
      }, source);
    }

    input.addEventListener('input', () => publish(Number(input.value) / 100));

    rootNode.querySelectorAll('[data-sequence-event]').forEach(button => button.addEventListener('click', () => {
      selectedEventId = button.dataset.sequenceEvent;
      const current = sequenceModel.deriveSequenceState(sequence, scene.getSceneState().playhead);
      renderView(current);
    }));

    const unsubscribe = scene.subscribeSceneState((state, source) => {
      if (source === 'sequence-director:playhead') return;
      const view = sequenceModel.deriveSequenceState(sequence, state.playhead);
      renderView(view);
    });

    renderView(sequenceModel.deriveSequenceState(sequence, scene.getSceneState().playhead));

    return {
      destroy() {
        unsubscribe();
      }
    };
  }

  return { initSequenceDirector };
});
