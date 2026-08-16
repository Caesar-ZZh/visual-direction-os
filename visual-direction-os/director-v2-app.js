(() => {
  'use strict';
  const scene = window.VDOSScene;
  if (!scene) throw new Error('VDOSScene is required before director-v2-app.js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const modeOrder = ['learn', 'direct', 'diagnose'];

  function setMode(mode) {
    const safe = modeOrder.includes(mode) ? mode : 'learn';
    scene.updateSceneState({ mode: safe }, 'mode-switch');
    $$('[data-mode]').forEach((button) => {
      if (button.dataset.mode === safe) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const target = safe === 'learn' ? '#learn-panel' : safe === 'direct' ? '#direct-panel' : '#diagnose-panel';
    $(target)?.scrollIntoView({ block: 'start' });
  }

  $$('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));

  const ownerPatches = {
    world: { agency: 'world', ownership: { character: 'low', world: 'high', narrative: 'medium' }, variables: { color: { temperature: 'cool', territory: 'world' }, camera: { perspective: 'world', stability: 'high' }, line: { stability: 'high' }, space: { compression: 'low' } } },
    contested: { agency: 'contested', ownership: { character: 'medium', world: 'medium', narrative: 'high' }, variables: { color: { temperature: 'neutral', territory: 'contested' }, camera: { perspective: 'mixed', stability: 'medium' }, line: { stability: 'medium' }, space: { compression: 'medium' } } },
    character: { agency: 'character', ownership: { character: 'high', world: 'low', narrative: 'medium' }, variables: { color: { temperature: 'warm', territory: 'character' }, camera: { perspective: 'character', stability: 'medium' }, line: { stability: 'low' }, space: { compression: 'high' } } }
  };

  $$('[data-owner-choice]').forEach((button) => button.addEventListener('click', () => {
    const owner = button.dataset.ownerChoice;
    $$('[data-owner-choice]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    scene.updateSceneState(ownerPatches[owner], 'ownership-demo');
  }));

  $$('[data-variable-family][data-variable-key]').forEach((select) => select.addEventListener('change', () => {
    const family = select.dataset.variableFamily;
    const key = select.dataset.variableKey;
    scene.updateSceneState({ variables: { [family]: { [key]: select.value } }, diagnosticContext: { hasNarrativeCause: true, primaryChanges: 1 } }, `workspace:${family}.${key}`);
  }));

  function render(state) {
    const stage = $('.ownership-stage');
    if (stage) stage.dataset.owner = state.agency === 'character' ? 'character' : state.agency === 'contested' ? 'contested' : 'world';
    const ownerText = state.agency === 'character' ? 'WORLD → CHARACTER' : state.agency === 'contested' ? 'WORLD ↔ CHARACTER' : state.agency === 'shared' ? 'CHARACTER + WORLD' : 'WORLD OWNS FRAME';
    const status = $('#ownership-status');
    if (status) status.textContent = `OWNERSHIP · ${ownerText}`;
    const agency = $('#summary-agency'); if (agency) agency.textContent = String(state.agency).toUpperCase();
    const narrative = $('#summary-narrative'); if (narrative) narrative.textContent = String(state.narrativeState).toUpperCase();
    const color = $('#summary-color'); if (color) color.textContent = `${state.variables.color.temperature} / ${state.variables.color.territory}`.toUpperCase();
    const camera = $('#summary-camera'); if (camera) camera.textContent = `${state.variables.camera.perspective} / ${state.variables.camera.stability}`.toUpperCase();
    $$('[data-variable-family][data-variable-key]').forEach((select) => {
      const value = state.variables?.[select.dataset.variableFamily]?.[select.dataset.variableKey];
      if (value && [...select.options].some(option => option.value === value) && select.value !== value) select.value = value;
      const output = document.querySelector(`[data-output="${select.dataset.variableFamily}.${select.dataset.variableKey}"]`);
      if (output) output.textContent = value || '—';
    });
  }

  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(window[globalName]);
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function loadToolStyles() {
    if ($('link[href="director-v2-tools.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'director-v2-tools.css';
    document.head.appendChild(link);
  }

  function ensureToolSections() {
    const diagnose = $('#diagnose-panel');
    if (!diagnose || $('#state-machine-panel')) return;
    diagnose.insertAdjacentHTML('beforebegin', `
      <section class="workspace tool-workspace" id="state-machine-panel" aria-labelledby="state-machine-title">
        <p class="eyebrow">Direct / Character mechanism</p><h2 id="state-machine-title">Visual State Machine</h2>
        <p>机制而非画风模仿。拖动 playhead，观察叙事状态如何同步改变视觉变量与 ownership。</p><div id="state-machine-root"></div>
      </section>
      <section class="workspace tool-workspace" id="sequence-panel" aria-labelledby="sequence-title">
        <p class="eyebrow">Direct / Temporal orchestration</p><h2 id="sequence-title">Sequence Score</h2>
        <p>六条视觉轨道错峰变化。高潮由控制权转移定义，而不是所有参数一起达到最大值。</p><div id="sequence-root"></div>
      </section>
      <section class="workspace tool-workspace" id="color-ownership-panel" aria-labelledby="color-ownership-title">
        <p class="eyebrow">Direct / Color territory</p><h2 id="color-ownership-title">Color Ownership Map</h2>
        <p>颜色不仅是什么，更重要的是此刻由谁拥有、在哪里占领、是否发生冲突。</p><div id="color-ownership-root"></div>
      </section>`);
    diagnose.innerHTML = `<p class="eyebrow">Diagnose / Visual system diagnostic</p><h2 id="diagnose-title">Why did this visual behavior change?</h2><p>使用与 DIRECT 完全相同的 scene state，输出确定性的 PASS / WARN / FAIL，不制造总分。</p><div id="diagnostic-root"></div>`;
  }

  async function initAdvancedTools() {
    loadToolStyles();
    ensureToolSections();
    await Promise.all([
      loadScript('state-machine.js', 'VDOSStateMachine'),
      loadScript('sequence-score.js', 'VDOSSequenceScore'),
      loadScript('color-ownership.js', 'VDOSColorOwnership'),
      loadScript('diagnostic.js', 'VDOSDiagnostic'),
      loadScript('timeline-sync.js', 'VDOSTimelineSync')
    ]);
    window.VDOSStateMachine.initStateMachine($('#state-machine-root'), scene);
    window.VDOSSequenceScore.initSequenceScore($('#sequence-root'), scene);
    window.VDOSColorOwnership.initColorOwnership($('#color-ownership-root'), scene);
    window.VDOSDiagnostic.initDiagnostic($('#diagnostic-root'), scene);
    window.VDOSTimelineSync.syncTimelines(scene, window.VDOSStateMachine, window.VDOSSequenceScore, document);
  }

  scene.subscribeSceneState(render);
  scene.createSceneState({ mode: 'learn' });
  initAdvancedTools().catch((error) => {
    console.error(error);
    const diagnose = $('#diagnose-panel');
    if (diagnose) diagnose.insertAdjacentHTML('beforeend', `<p class="tool-error" role="alert">Advanced tools failed to load. Core LEARN and DIRECT controls remain available.</p>`);
  });
})();