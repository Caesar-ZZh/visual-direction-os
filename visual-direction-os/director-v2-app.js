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
    $$('[data-mode]').forEach((control) => {
      if (control.dataset.mode === safe) control.setAttribute('aria-current', 'page');
      else control.removeAttribute('aria-current');
    });
    const target = safe === 'learn' ? '#learn-panel' : safe === 'direct' ? '#direct-panel' : '#diagnose-panel';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $(target)?.scrollIntoView({ block: 'start', behavior: window.innerWidth <= 900 || reduced ? 'auto' : 'smooth' });
  }

  $$('[data-mode]').forEach((control) => control.addEventListener('click', () => setMode(control.dataset.mode)));

  const ownerPatches = {
    world: { agency: 'world', ownership: { character: 'low', world: 'high', narrative: 'medium' }, variables: { color: { temperature: 'cool', territory: 'world' }, camera: { perspective: 'world', stability: 'high' }, line: { stability: 'high' }, space: { compression: 'low' } } },
    contested: { agency: 'contested', ownership: { character: 'medium', world: 'medium', narrative: 'high' }, variables: { color: { temperature: 'neutral', territory: 'contested' }, camera: { perspective: 'mixed', stability: 'medium' }, line: { stability: 'medium' }, space: { compression: 'medium' } } },
    character: { agency: 'character', ownership: { character: 'high', world: 'low', narrative: 'medium' }, variables: { color: { temperature: 'warm', territory: 'character' }, camera: { perspective: 'character', stability: 'medium' }, line: { stability: 'low' }, space: { compression: 'high' } } }
  };

  $$('[data-owner-choice]').forEach((button) => button.addEventListener('click', () => {
    const owner = button.dataset.ownerChoice;
    scene.updateSceneState(ownerPatches[owner], 'ownership-demo');
  }));

  $$('[data-variable-family][data-variable-key][data-variable-value]').forEach((button) => button.addEventListener('click', () => {
    const family = button.dataset.variableFamily;
    const key = button.dataset.variableKey;
    const value = button.dataset.variableValue;
    scene.updateSceneState({ variables: { [family]: { [key]: value } }, diagnosticContext: { hasNarrativeCause: true, primaryChanges: 1 } }, `workspace:${family}.${key}`);
  }));

  function directionalPosition(value) {
    if (value === 'character') return 'character';
    if (value === 'mixed' || value === 'contested' || value === 'shared') return 'contested';
    return 'world';
  }

  function renderOwnership(state) {
    const stage = $('.ownership-stage');
    const ownerState = state.agency === 'character' ? 'character' : state.agency === 'contested' || state.agency === 'shared' ? 'contested' : 'world';
    if (stage) stage.dataset.owner = ownerState;

    const ownerText = state.agency === 'character' ? 'WORLD → CHARACTER' : state.agency === 'contested' ? 'WORLD ↔ CHARACTER' : state.agency === 'shared' ? 'CHARACTER + WORLD' : 'WORLD OWNS FRAME';
    const status = $('#ownership-status');
    if (status) status.textContent = `OWNERSHIP · ${ownerText}`;

    const primary = $('#ownership-primary');
    if (primary) primary.textContent = ownerState === 'contested' ? 'CONTESTED' : ownerState.toUpperCase();

    const cameraPosition = directionalPosition(state.variables.camera.perspective);
    const colorPosition = directionalPosition(state.variables.color.territory);
    const spacePosition = ['low', 'medium', 'high'].includes(state.variables.space.compression) ? state.variables.space.compression : 'medium';

    const cameraTrack = $('[data-ownership-track="camera"]');
    const colorTrack = $('[data-ownership-track="color"]');
    const spaceTrack = $('[data-ownership-track="space"]');
    if (cameraTrack) cameraTrack.dataset.position = cameraPosition;
    if (colorTrack) colorTrack.dataset.position = colorPosition;
    if (spaceTrack) spaceTrack.dataset.position = spacePosition;

    const ownershipCamera = $('#ownership-camera');
    if (ownershipCamera) ownershipCamera.textContent = cameraPosition === 'contested' ? 'SHARED' : `${cameraPosition.toUpperCase()}-LED`;
    const ownershipColor = $('#ownership-color');
    if (ownershipColor) ownershipColor.textContent = colorPosition === 'contested' ? 'SHARED' : `${colorPosition.toUpperCase()}-LED`;
    const ownershipSpace = $('#ownership-space');
    if (ownershipSpace) ownershipSpace.textContent = spacePosition.toUpperCase();

    const reason = $('#ownership-reason');
    if (reason) {
      if (ownerState === 'character') reason.textContent = `CHARACTER leads camera and color; spatial pressure is ${spacePosition}.`;
      else if (ownerState === 'contested') reason.textContent = `WORLD and CHARACTER split camera/color authority; spatial pressure is ${spacePosition}.`;
      else reason.textContent = `WORLD leads camera and color; spatial pressure is ${spacePosition}.`;
    }

    $$('[data-owner-choice]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ownerChoice === ownerState)));
  }

  function render(state) {
    renderOwnership(state);

    const agency = $('#summary-agency'); if (agency) agency.textContent = String(state.agency).toUpperCase();
    const narrative = $('#summary-narrative'); if (narrative) narrative.textContent = String(state.narrativeState).toUpperCase();
    const color = $('#summary-color'); if (color) color.textContent = `${state.variables.color.temperature} / ${state.variables.color.territory}`.toUpperCase();
    const camera = $('#summary-camera'); if (camera) camera.textContent = `${state.variables.camera.perspective} / ${state.variables.camera.stability}`.toUpperCase();
    $$('[data-variable-family][data-variable-key][data-variable-value]').forEach((button) => {
      const value = state.variables?.[button.dataset.variableFamily]?.[button.dataset.variableKey];
      button.setAttribute('aria-pressed', String(button.dataset.variableValue === value));
    });
  }

  function ensureKnowledgeAtlas() {
    const hero = $('#learn-panel');
    const ownership = $('.ownership-lab');
    if (!hero || !ownership || $('#knowledge-atlas')) return;
    const destinations = [
      ['overview', '00', 'Overview', 'Master framework and system map'],
      ['character', '01', 'Character', 'Identity as a controlled range'],
      ['world', '02', 'World', 'Default visual grammar and compatibility'],
      ['sequence', '03', 'Sequence', 'Temporal orchestration and score'],
      ['color', '04', 'Color', 'Territory, migration and ownership'],
      ['production', '05', 'Production', 'Reverse, rebuild and validate'],
      ['case-study', '06', 'Case Study', 'Mechanism analysis in context'],
      ['glossary', 'G', 'Glossary', 'Shared visual-direction vocabulary'],
      ['decision-tree', 'D', 'Decision Tree', 'Route narrative questions into visual variables'],
      ['workflow', 'W', 'Master Workflow', 'From analysis to production delivery'],
      ['qa', 'Q', 'Visual QA', 'Check system coherence before ship']
    ];
    ownership.insertAdjacentHTML('beforebegin', `
      <section class="knowledge-atlas workspace" id="knowledge-atlas" aria-labelledby="knowledge-atlas-title">
        <p class="eyebrow">Learn / Knowledge Atlas</p>
        <div class="atlas-heading"><div><h2 id="knowledge-atlas-title">The existing knowledge system stays intact.</h2><p>v2.1 adds a Director Workspace without rewriting the twelve knowledge sources. These routes open the established v2.0 knowledge views directly.</p></div><span>11 VIEWS · READ-ONLY SOURCE</span></div>
        <div class="atlas-grid">${destinations.map(([route, index, label, copy]) => `<a data-knowledge-route="${route}" href="knowledge.html#${route}"><span>${index}</span><strong>${label}</strong><small>${copy}</small><b aria-hidden="true">↗</b></a>`).join('')}</div>
      </section>`);
  }

  function initAdvancedTools() {
    const required = ['VDOSStateMachine', 'VDOSSequenceScore', 'VDOSColorOwnership', 'VDOSDiagnostic', 'VDOSTimelineSync'];
    const missing = required.filter(name => !window[name]);
    if (missing.length) throw new Error(`Advanced tools unavailable: ${missing.join(', ')}`);
    ensureKnowledgeAtlas();
    window.VDOSStateMachine.initStateMachine($('#state-machine-root'), scene);
    window.VDOSSequenceScore.initSequenceScore($('#sequence-root'), scene);
    window.VDOSColorOwnership.initColorOwnership($('#color-ownership-root'), scene);
    window.VDOSDiagnostic.initDiagnostic($('#diagnostic-root'), scene);
    window.VDOSTimelineSync.syncTimelines(scene, window.VDOSStateMachine, window.VDOSSequenceScore, document);
  }

  scene.subscribeSceneState(render);
  scene.createSceneState({ mode: 'learn' });

  try {
    initAdvancedTools();
  } catch (error) {
    console.error(error);
    const diagnose = $('#diagnose-panel');
    if (diagnose) diagnose.insertAdjacentHTML('beforeend', `<p class="tool-error" role="alert">Advanced tools failed to initialize. Reload this preview to retry.</p>`);
  }
})();