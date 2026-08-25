(function attachEvaluationUI(root) {
  'use strict';
  if (!root || !root.document) return;

  const runtime = root.VisualDirectionRuntime || {};
  const {
    measurePixels,
    evaluateArtifact,
    compileReDirectionDelta,
    applyIterationDelta,
    canRedirect,
    runGenerationIteration
  } = runtime;
  if (![measurePixels, evaluateArtifact, compileReDirectionDelta, applyIterationDelta, canRedirect, runGenerationIteration].every((fn) => typeof fn === 'function')) {
    console.error('[Visual Direction OS] Evaluation runtime failed to initialize.');
    return;
  }

  const document = root.document;
  const $ = (selector, base = document) => base.querySelector(selector);
  const state = { artifact:null, measurements:null, measurementError:'', human:{}, report:null, delta:null, redirectBusy:false, redirectMessage:'' };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  function buildPanel() {
    const generation = $('#generation-console');
    if (!generation || $('#evaluation-console')) return;
    const section = document.createElement('section');
    section.className = 'evaluation-console';
    section.id = 'evaluation-console';
    section.hidden = true;
    section.innerHTML = `
      <header class="evaluation-head"><div><small>VISUAL QA / EVIDENCE LAYER</small><h3>Measure what is measurable. <em>Judge what is semantic.</em></h3><p>M3 never turns pixel statistics into fake narrative certainty. Every check declares where its evidence comes from.</p></div><div class="evaluation-artifact"><span>ARTIFACT</span><strong id="evaluation-artifact-id">—</strong><small id="evaluation-summary">—</small></div></header>
      <div class="evaluation-columns">
        <section class="evaluation-measured"><header><span>MEASURED SIGNALS</span><small>Canvas / value / saturation / edge / density</small></header><div id="measurement-raw" class="measurement-raw"></div><p class="measurement-warning" id="measurement-warning" hidden></p><div id="evaluation-measured-list"></div></section>
        <section class="evaluation-human"><header><span>DIRECTOR JUDGMENT</span><small>PASS / NEEDS WORK / NOT SURE</small></header><div id="evaluation-human-list"></div></section>
      </div>
      <section class="deviation-ledger"><header><div><span>DEVIATION LEDGER</span><h4>What survives into the next generation?</h4></div><button type="button" id="evaluation-redirect" disabled><span>RE-DIRECT & GENERATE</span><small id="evaluation-redirect-state">Compile iteration delta</small></button></header><div class="deviation-columns"><article><span>PRESERVE</span><div id="delta-preserve"></div></article><article><span>CORRECT</span><div id="delta-correct"></div></article><article><span>UNRESOLVED</span><div id="delta-unresolved"></div></article></div><details><summary>Iteration prompt appendix</summary><pre id="delta-prompt"></pre></details></section>`;
    generation.append(section);
    $('#evaluation-redirect')?.addEventListener('click', redirectAndGenerate);
  }

  function statusLabel(check) {
    if (check.status === 'pass') return 'PASS';
    if (check.status === 'warn') return 'WARN';
    if (check.status === 'needs_work') return 'NEEDS WORK';
    if (check.status === 'not_sure') return 'NOT SURE';
    if (check.status === 'needs_judgment') return 'JUDGE';
    return 'UNSUPPORTED';
  }

  function setRedirectMessage(message) {
    state.redirectMessage = String(message || '');
    const node = $('#evaluation-redirect-state');
    if (node) node.textContent = state.redirectMessage || 'Compile iteration delta';
  }

  function renderRawMeasurements() {
    const node = $('#measurement-raw');
    if (!node) return;
    const m = state.measurements;
    if (!m) {
      node.innerHTML = '<p class="measurement-raw-empty">No pixel measurements available.</p>';
      return;
    }
    const metrics = [
      ['CANVAS', `${m.width}×${m.height}`],
      ['ASPECT', m.aspectRatio],
      ['LUMA', m.meanLuminance],
      ['LUMA σ', m.luminanceStdDev],
      ['SAT', m.meanSaturation],
      ['HIGH SAT', m.highSaturationShare],
      ['EDGE', m.edgeDensity],
      ['LOCAL Δ', m.localContrast],
      ['ENTROPY', m.entropyProxy]
    ];
    node.innerHTML = metrics.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  function renderMeasured() {
    const list = $('#evaluation-measured-list');
    if (!list || !state.report) return;
    renderRawMeasurements();
    const checks = state.report.checks.filter((check) => check.evidenceMode === 'measured' || ['canvas-ratio','saturation-direction','detail-density','value-contrast','edge-activity'].includes(check.id));
    list.innerHTML = checks.map((check) => `<article class="evaluation-check" data-status="${escapeHtml(check.status)}"><div><span>${escapeHtml(check.label)}</span><b>${statusLabel(check)}</b></div><strong>${escapeHtml(check.observed || (check.status === 'unsupported' ? 'Target not safely mappable' : 'No comparable observation'))}</strong><p>${escapeHtml(check.reason)}</p><small>TARGET / ${escapeHtml(check.target || 'unknown')}</small></article>`).join('');
    const warning = $('#measurement-warning');
    if (warning) {
      warning.hidden = !state.measurementError;
      warning.textContent = state.measurementError;
    }
  }

  function renderHuman() {
    const list = $('#evaluation-human-list');
    if (!list || !state.report) return;
    const checks = state.report.checks.filter((check) => check.evidenceMode === 'human_required');
    list.innerHTML = checks.map((check) => {
      const decision = state.human[check.id] || {};
      return `<article class="human-check" data-check="${escapeHtml(check.id)}" data-status="${escapeHtml(check.status)}"><div class="human-check-head"><span>${escapeHtml(check.label)}</span><b>${statusLabel(check)}</b></div><p>${escapeHtml(check.target)}</p><div class="human-actions"><button type="button" data-decision="pass" aria-pressed="${decision.status === 'pass'}">PASS</button><button type="button" data-decision="needs_work" aria-pressed="${decision.status === 'needs_work'}">NEEDS WORK</button><button type="button" data-decision="not_sure" aria-pressed="${decision.status === 'not_sure'}">NOT SURE</button></div><label><span>CORRECTION NOTE</span><input data-note value="${escapeHtml(decision.note || '')}" placeholder="What should change in the next frame?"></label></article>`;
    }).join('');

    list.querySelectorAll('.human-check').forEach((card) => {
      const id = card.dataset.check;
      card.querySelectorAll('[data-decision]').forEach((button) => button.addEventListener('click', () => {
        state.human[id] = { status:button.dataset.decision, note:state.human[id]?.note || card.querySelector('[data-note]')?.value || '' };
        recompute();
      }));
      card.querySelector('[data-note]')?.addEventListener('change', (event) => {
        state.human[id] = { status:state.human[id]?.status || 'needs_judgment', note:String(event.target.value || '').trim() };
        recompute();
      });
    });
  }

  function renderList(selector, values, emptyCopy) {
    const node = $(selector);
    if (!node) return;
    node.innerHTML = values.length ? values.map((item) => `<p>${escapeHtml(item)}</p>`).join('') : `<p class="ledger-empty">${escapeHtml(emptyCopy)}</p>`;
  }

  function renderLedger() {
    if (!state.delta || !state.report) return;
    renderList('#delta-preserve', state.delta.preserve, 'Nothing protected yet.');
    renderList('#delta-correct', state.delta.correct, 'No correction compiled yet.');
    renderList('#delta-unresolved', state.delta.unresolved, 'No unresolved evidence.');
    if ($('#delta-prompt')) $('#delta-prompt').textContent = state.delta.promptAppendix || 'No generation delta until evidence produces preserve/correct instructions.';
    const summary = state.report.summary;
    if ($('#evaluation-summary')) $('#evaluation-summary').textContent = `${summary.measuredPass} measured pass · ${summary.measuredWarn} measured warn · ${summary.humanPassed} judged pass · ${summary.humanNeedsWork} needs work · ${summary.unresolved} unresolved`;
    const redirect = $('#evaluation-redirect');
    const ready = canRedirect(state.delta);
    if (redirect) redirect.disabled = !ready || state.redirectBusy;
    if (!state.redirectBusy && !state.redirectMessage) setRedirectMessage(ready ? 'Generate corrected iteration' : 'Compile iteration delta');
  }

  function recompute() {
    if (!state.artifact) return;
    state.report = evaluateArtifact({ artifactId:state.artifact.id, ir:state.artifact.visualIR, request:state.artifact.request, measurements:state.measurements, human:state.human });
    state.delta = compileReDirectionDelta(state.report);
    state.artifact.measurements = state.measurements;
    state.artifact.evaluation = state.report;
    if (!state.redirectBusy) state.redirectMessage = '';
    renderMeasured();
    renderHuman();
    renderLedger();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      try {
        const parsed = new URL(src, root.location.href);
        if (!String(src).startsWith('data:') && parsed.origin !== root.location.origin) image.crossOrigin = 'anonymous';
      } catch (_) {}
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Generated image could not be loaded for pixel analysis.'));
      image.src = src;
    });
  }

  async function measureArtifact(artifact) {
    const image = await loadImage(artifact.result.src);
    const max = 256;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently:true });
    if (!context) throw new Error('Canvas pixel analysis is unavailable in this browser.');
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    const measured = measurePixels({ width, height, data:pixels.data });
    return { ...measured, width:image.naturalWidth, height:image.naturalHeight, aspectRatio:Number((image.naturalWidth / image.naturalHeight).toFixed(4)) };
  }

  async function analyzeArtifact(artifact) {
    state.artifact = artifact;
    state.measurements = null;
    state.measurementError = '';
    state.human = {};
    state.redirectMessage = '';
    const panel = $('#evaluation-console');
    if (panel) panel.hidden = false;
    if ($('#evaluation-artifact-id')) $('#evaluation-artifact-id').textContent = artifact.id;
    if ($('#evaluation-summary')) $('#evaluation-summary').textContent = 'Reading measurable evidence…';
    try {
      state.measurements = await measureArtifact(artifact);
    } catch (error) {
      state.measurementError = `${error.message || 'Pixel analysis unavailable'} Semantic Director Judgment remains available; remote URL images may require CORS-enabled storage for Canvas measurement.`;
    }
    recompute();
    panel?.scrollIntoView({ behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' });
  }

  async function redirectAndGenerate() {
    if (state.redirectBusy || !state.artifact || !canRedirect(state.delta)) return;
    state.redirectBusy = true;
    setRedirectMessage('Generating corrected iteration…');
    renderLedger();
    try {
      const artifact = await runGenerationIteration({
        root,
        artifact: state.artifact,
        delta: state.delta,
        applyIterationDelta
      });
      if (!artifact) {
        const upstreamStatus = String($('#generation-status')?.textContent || '').trim();
        throw new Error(upstreamStatus || 'Iteration generation did not return an artifact');
      }
      setRedirectMessage(`Generated ${artifact.id}`);
    } catch (error) {
      console.error('[Visual Direction OS] Re-direction failed:', error);
      setRedirectMessage(error.message || 'Re-direction failed');
    } finally {
      state.redirectBusy = false;
      renderLedger();
    }
  }

  buildPanel();
  root.addEventListener('vdos:generation-complete', (event) => {
    const artifact = event.detail?.artifact;
    if (artifact) analyzeArtifact(artifact);
  });

  root.VisualDirectionOS = Object.assign(root.VisualDirectionOS || {}, { evaluation:{ get report(){return state.report;}, get delta(){return state.delta;}, get artifact(){return state.artifact;}, recompute } });
})(typeof globalThis !== 'undefined' ? globalThis : window);
