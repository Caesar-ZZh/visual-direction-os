((root, factory) => {
  const api = factory(() => root?.VDOSSequenceDirectorModel);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSSequenceDirector = api;
})(typeof window !== 'undefined' ? window : globalThis, resolveModel => {
  'use strict';

  const TRACKS = ['color', 'space', 'camera', 'line', 'texture', 'agency'];
  const PLAYBACK_DURATION = 12000;
  const clone = value => JSON.parse(JSON.stringify(value));
  const EVENT_SHORT_LABELS = {
    'SPACE COLLAPSE': 'SPACE',
    'CAMERA BREAK': 'CAMERA',
    'TEXTURE PEAK': 'TEXTURE',
    'COLOR MIGRATION': 'COLOR',
    'AGENCY TRANSFER': 'AGENCY',
    'OWNERSHIP SHIFT': 'OWNERSHIP'
  };

  const model = () => {
    const current = resolveModel();
    if (!current) throw new Error('VDOSSequenceDirectorModel is required before Sequence Director initialization');
    return current;
  };

  function eventLabel(event = {}) {
    return event.type || 'VISUAL EVENT';
  }

  function eventShortLabel(event = {}) {
    const full = eventLabel(event);
    return EVENT_SHORT_LABELS[full] || full.split(/\s+/)[0] || 'EVENT';
  }

  function pointOnPathAtProgress(path, progress) {
    if (!path?.getTotalLength || !path?.getPointAtLength) return null;
    const targetX = Math.max(0, Math.min(1, Number(progress) || 0)) * 100;
    const total = path.getTotalLength();
    let low = 0;
    let high = total;
    let point = path.getPointAtLength(0);
    for (let index = 0; index < 24; index += 1) {
      const length = (low + high) / 2;
      point = path.getPointAtLength(length);
      if (point.x < targetX) low = length;
      else high = length;
    }
    return path.getPointAtLength((low + high) / 2);
  }

  function scaleCircleToScreen(circle, x, y, svg, screenRadius) {
    if (!circle || !svg) return;
    const width = svg.clientWidth || svg.getBoundingClientRect?.().width || 100;
    const height = svg.clientHeight || svg.getBoundingClientRect?.().height || 34;
    const xScale = width / 100 || 1;
    const yScale = height / 34 || 1;
    const radius = Number(circle.getAttribute('r')) || 1;
    const localScaleX = screenRadius / (radius * xScale);
    const localScaleY = screenRadius / (radius * yScale);
    circle.setAttribute('transform', `translate(${x} ${y}) scale(${localScaleX} ${localScaleY}) translate(${-x} ${-y})`);
  }

  function positionTensionProbe(rootNode, playhead) {
    const path = rootNode.querySelector('[data-tension-path]');
    const ring = rootNode.querySelector('[data-tension-probe-ring]');
    const core = rootNode.querySelector('[data-tension-probe-core]');
    const point = pointOnPathAtProgress(path, playhead);
    if (!path || !ring || !core || !point) return;

    const x = Number(point.x.toFixed(3));
    const y = Number(point.y.toFixed(3));
    [ring, core].forEach(circle => {
      circle.setAttribute('cx', String(x));
      circle.setAttribute('cy', String(y));
    });

    const svg = path.ownerSVGElement;
    scaleCircleToScreen(ring, x, y, svg, 5);
    scaleCircleToScreen(core, x, y, svg, 2.2);
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
    if (!rootNode || !scene) return { play() {}, pause() {}, isPlaying: () => false, destroy() {} };
    const sequenceModel = model();
    const sequence = sequenceModel.DEFAULT_SEQUENCE;
    const doc = rootNode.ownerDocument;
    const viewWindow = doc.defaultView || (typeof window !== 'undefined' ? window : null);
    let selectedEventId = null;
    let playing = false;
    let frameId = 0;
    let lastTimestamp = null;

    rootNode.innerHTML = `
      <div class="sequence-director-toolbar">
        <div class="sequence-playhead-copy"><span>SEQUENCE PLAYHEAD</span><output id="sequence-beat">SETUP</output></div>
        <div class="sequence-control-row">
          <label class="sr-only" for="sequence-playhead">Sequence playhead</label>
          <input id="sequence-playhead" type="range" min="0" max="100" value="0" step="1" aria-label="Sequence playhead">
          <div class="sequence-transport" aria-label="Sequence playback controls">
            <button type="button" data-sequence-action="play" aria-pressed="false">Play</button>
            <button type="button" data-sequence-action="pause" disabled>Pause</button>
          </div>
        </div>
      </div>

      <section class="sequence-tension" aria-label="Narrative tension curve" data-tension="low">
        <div class="sequence-tension-head"><span>NARRATIVE TENSION</span><strong data-tension-value>LOW</strong></div>
        <div class="sequence-tension-chart" aria-hidden="true">
          <svg viewBox="0 0 100 34" preserveAspectRatio="none">
            <path class="sequence-tension-base" d="M0 27 C14 27 20 23 30 18 C38 14 42 4 50 4 C58 4 62 17 70 21 C80 25 86 17 100 16"></path>
            <path class="sequence-tension-active" data-tension-path d="M0 27 C14 27 20 23 30 18 C38 14 42 4 50 4 C58 4 62 17 70 21 C80 25 86 17 100 16"></path>
            <circle class="sequence-tension-probe-ring" data-tension-probe-ring cx="0" cy="27" r="1.35"></circle>
            <circle class="sequence-tension-probe-core" data-tension-probe-core cx="0" cy="27" r="0.62"></circle>
          </svg>
          <div class="sequence-tension-axis"><span>LOW</span><span>MEDIUM</span><span>HIGH</span></div>
        </div>
      </section>

      <div class="sequence-beat-band" aria-label="Narrative beats">
        ${sequence.beats.map(beat => `<div class="sequence-beat" data-sequence-beat="${beat.id}" style="--beat-start:${beat.start * 100}%;--beat-span:${(beat.end - beat.start) * 100}%"><span>${beat.label}</span><small>${beat.narrativePurpose}</small></div>`).join('')}
      </div>

      <div class="sequence-events" aria-label="Visual events">
        <div class="sequence-event-line" aria-hidden="true"></div>
        ${sequence.events.map(event => `<button type="button" data-sequence-event="${event.id}" data-event-at="${event.at}" style="--event-at:${event.at * 100}%" aria-label="${eventLabel(event)}" aria-pressed="false"><i aria-hidden="true"></i><span class="sequence-event-visible-label">${eventShortLabel(event)}</span></button>`).join('')}
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
    const playButton = rootNode.querySelector('[data-sequence-action="play"]');
    const pauseButton = rootNode.querySelector('[data-sequence-action="pause"]');

    function setPlaybackUI() {
      playButton.setAttribute('aria-pressed', String(playing));
      playButton.disabled = playing;
      pauseButton.disabled = !playing;
      rootNode.dataset.playing = String(playing);
    }

    function selectedEventFor(view) {
      if (selectedEventId) {
        const explicit = sequence.events.find(event => event.id === selectedEventId);
        if (explicit) return explicit;
      }
      return sequence.events.reduce((nearest, event) => {
        if (!nearest) return event;
        return Math.abs(event.at - view.playhead) < Math.abs(nearest.at - view.playhead) ? event : nearest;
      }, null);
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
      positionTensionProbe(rootNode, view.playhead);

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

    function pause() {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      lastTimestamp = null;
      playing = false;
      setPlaybackUI();
    }

    function playbackFrame(timestamp) {
      if (!playing) return;
      if (lastTimestamp == null) {
        lastTimestamp = timestamp;
        frameId = requestAnimationFrame(playbackFrame);
        return;
      }
      const elapsed = Math.max(0, timestamp - lastTimestamp);
      lastTimestamp = timestamp;
      const current = Number(scene.getSceneState().playhead) || 0;
      const next = sequenceModel.clamp01(current + elapsed / PLAYBACK_DURATION);
      publish(next, 'sequence-director:playback');
      if (next >= 1) {
        pause();
        return;
      }
      frameId = requestAnimationFrame(playbackFrame);
    }

    function play() {
      if (playing) return;
      const current = Number(scene.getSceneState().playhead) || 0;
      if (current >= 1) return;
      playing = true;
      lastTimestamp = null;
      setPlaybackUI();
      frameId = requestAnimationFrame(playbackFrame);
    }

    function isPlaying() {
      return playing;
    }

    input.addEventListener('input', () => {
      pause();
      publish(Number(input.value) / 100);
    });
    playButton.addEventListener('click', play);
    pauseButton.addEventListener('click', pause);

    rootNode.querySelectorAll('[data-sequence-event]').forEach(button => button.addEventListener('click', () => {
      selectedEventId = button.dataset.sequenceEvent;
      const current = sequenceModel.deriveSequenceState(sequence, scene.getSceneState().playhead);
      renderView(current);
    }));

    const manualControlSelector = '[data-variable-family][data-variable-key][data-variable-value],[data-owner-choice],[data-case]';
    const pauseForManualClick = event => {
      if (!playing || !event.target.closest?.(manualControlSelector)) return;
      pause();
    };
    const pauseForManualInput = event => {
      if (playing && event.target?.matches?.('#case-playhead')) pause();
    };
    doc.addEventListener('click', pauseForManualClick, true);
    doc.addEventListener('input', pauseForManualInput, true);

    const unsubscribe = scene.subscribeSceneState((state, source) => {
      if (source === 'sequence-director:playhead' || source === 'sequence-director:playback') return;
      const view = sequenceModel.deriveSequenceState(sequence, state.playhead);
      renderView(view);
    });

    const onResize = () => {
      if (!viewWindow?.requestAnimationFrame) return;
      viewWindow.requestAnimationFrame(() => {
        const view = sequenceModel.deriveSequenceState(sequence, scene.getSceneState().playhead);
        positionTensionProbe(rootNode, view.playhead);
      });
    };
    viewWindow?.addEventListener?.('resize', onResize, { passive: true });

    renderView(sequenceModel.deriveSequenceState(sequence, scene.getSceneState().playhead));
    setPlaybackUI();

    return {
      play,
      pause,
      isPlaying,
      destroy() {
        pause();
        unsubscribe();
        doc.removeEventListener('click', pauseForManualClick, true);
        doc.removeEventListener('input', pauseForManualInput, true);
        viewWindow?.removeEventListener?.('resize', onResize);
      }
    };
  }

  return { initSequenceDirector };
});