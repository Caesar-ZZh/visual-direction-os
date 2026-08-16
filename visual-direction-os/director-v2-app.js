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
    $$('[data-mode]').forEach((button) => button.setAttribute('aria-current', button.dataset.mode === safe ? 'page' : 'false'));
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
    scene.updateSceneState({ variables: { [family]: { [key]: select.value } } }, `workspace:${family}.${key}`);
  }));

  function render(state) {
    const stage = $('.ownership-stage');
    if (stage) stage.dataset.owner = state.agency === 'character' ? 'character' : state.agency === 'contested' ? 'contested' : 'world';
    const ownerText = state.agency === 'character' ? 'WORLD → CHARACTER' : state.agency === 'contested' ? 'WORLD ↔ CHARACTER' : 'WORLD OWNS FRAME';
    const status = $('#ownership-status');
    if (status) status.textContent = `OWNERSHIP · ${ownerText}`;
    const agency = $('#summary-agency'); if (agency) agency.textContent = state.agency.toUpperCase();
    const narrative = $('#summary-narrative'); if (narrative) narrative.textContent = state.narrativeState.toUpperCase();
    const color = $('#summary-color'); if (color) color.textContent = `${state.variables.color.temperature} / ${state.variables.color.territory}`.toUpperCase();
    const camera = $('#summary-camera'); if (camera) camera.textContent = `${state.variables.camera.perspective} / ${state.variables.camera.stability}`.toUpperCase();
    $$('[data-variable-family][data-variable-key]').forEach((select) => {
      const value = state.variables?.[select.dataset.variableFamily]?.[select.dataset.variableKey];
      if (value && select.value !== value) select.value = value;
      const output = document.querySelector(`[data-output="${select.dataset.variableFamily}.${select.dataset.variableKey}"]`);
      if (output) output.textContent = value || '—';
    });
  }

  scene.subscribeSceneState(render);
  scene.createSceneState({ mode: 'learn' });
})();