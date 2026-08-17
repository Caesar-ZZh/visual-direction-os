(() => {
  'use strict';
  const scene = window.VDOSScene;
  if (!scene) throw new Error('VDOSScene is required before director-v2-app.js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const modeOrder = ['learn', 'direct', 'diagnose'];
  const explicitVariables = new Set();

  function updateModeUI(mode) {
    $$('[data-mode]').forEach((control) => {
      if (control.dataset.mode === mode) control.setAttribute('aria-current', 'page');
      else control.removeAttribute('aria-current');
    });
  }

  function modeTarget(mode) {
    return mode === 'learn' ? $('#learn-panel') : mode === 'direct' ? $('#direct-panel') : $('#diagnose-panel');
  }

  function setMode(mode, options = {}) {
    const safe = modeOrder.includes(mode) ? mode : 'learn';
    scene.updateSceneState({ mode: safe }, 'mode-switch');
    updateModeUI(safe);
    if (options.scroll === false) return;
    const target = modeTarget(safe);
    if (!target) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.innerWidth <= 900 || reduced) {
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, left: 0, behavior: 'auto' });
    } else {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  $$('[data-mode]').forEach((control) => control.addEventListener('click', (event) => {
    if (control.tagName === 'A') {
      event.preventDefault();
      const hash = control.getAttribute('href');
      if (hash && hash.startsWith('#')) history.replaceState(null, '', hash);
    }
    setMode(control.dataset.mode);
  }));

  function modeFromScroll() {
    const direct = $('#direct-panel');
    const diagnose = $('#diagnose-panel');
    if (!direct || !diagnose) return 'learn';
    const probe = window.scrollY + Math.min(180, window.innerHeight * .24);
    if (probe >= diagnose.offsetTop) return 'diagnose';
    if (probe >= direct.offsetTop) return 'direct';
    return 'learn';
  }

  let scrollTicking = false;
  function syncModeFromScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollTicking = false;
      const mode = modeFromScroll();
      updateModeUI(mode);
      const current = scene.getSceneState?.();
      if (current && current.mode !== mode) scene.updateSceneState({ mode }, 'scroll-spy');
    });
  }
  window.addEventListener('scroll', syncModeFromScroll, { passive: true });

  function initDesktopRail() {
    const rail = $('.v2-rail');
    if (!rail) return;
    let revealTimer = 0;

    const cancelReveal = () => {
      if (revealTimer) window.clearTimeout(revealTimer);
      revealTimer = 0;
    };

    const expandSoon = () => {
      if (window.innerWidth <= 900 || rail.dataset.expanded === 'true') return;
      cancelReveal();
      revealTimer = window.setTimeout(() => {
        rail.dataset.expanded = 'true';
        revealTimer = 0;
      }, 100);
    };

    const collapse = () => {
      cancelReveal();
      window.requestAnimationFrame(() => {
        if (!rail.matches(':focus-within')) rail.dataset.expanded = 'false';
      });
    };

    rail.dataset.expanded = 'false';
    rail.addEventListener('pointerenter', expandSoon);
    rail.addEventListener('pointermove', expandSoon, { passive: true });
    rail.addEventListener('pointerleave', collapse);
    rail.addEventListener('focusin', () => {
      cancelReveal();
      rail.dataset.expanded = 'true';
    });
    rail.addEventListener('focusout', collapse);
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 900) {
        cancelReveal();
        rail.dataset.expanded = 'false';
      }
    }, { passive: true });
  }

  const ownerPatches = {
    world: { agency: 'world', ownership: { character: 'low', world: 'high', narrative: 'medium' }, variables: { color: { temperature: 'cool', territory: 'world' }, camera: { perspective: 'world', stability: 'high' }, line: { stability: 'high' }, space: { compression: 'low' } } },
    contested: { agency: 'contested', ownership: { character: 'medium', world: 'medium', narrative: 'high' }, variables: { color: { temperature: 'neutral', territory: 'contested' }, camera: { perspective: 'mixed', stability: 'medium' }, line: { stability: 'medium' }, space: { compression: 'medium' } } },
    character: { agency: 'character', ownership: { character: 'high', world: 'low', narrative: 'medium' }, variables: { color: { temperature: 'warm', territory: 'character' }, camera: { perspective: 'character', stability: 'medium' }, line: { stability: 'low' }, space: { compression: 'high' } } }
  };

  function filteredOwnerPatch(owner) {
    const preset = ownerPatches[owner];
    const variables = {};
    Object.entries(preset.variables || {}).forEach(([family, values]) => {
      Object.entries(values).forEach(([key, value]) => {
        if (explicitVariables.has(`${family}.${key}`)) return;
        if (!variables[family]) variables[family] = {};
        variables[family][key] = value;
      });
    });
    return { agency: preset.agency, ownership: preset.ownership, variables };
  }

  $$('[data-owner-choice]').forEach((button) => button.addEventListener('click', () => {
    window.VDOSDiagnosticRouting?.clearRouteTargets?.(document);
    const owner = button.dataset.ownerChoice;
    scene.updateSceneState(filteredOwnerPatch(owner), 'ownership-demo');
  }));

  $$('[data-variable-family][data-variable-key][data-variable-value]').forEach((button) => button.addEventListener('click', () => {
    window.VDOSDiagnosticRouting?.clearRouteTargets?.(document);
    const family = button.dataset.variableFamily;
    const key = button.dataset.variableKey;
    const value = button.dataset.variableValue;
    explicitVariables.add(`${family}.${key}`);
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

  function ensureVisualResponseReadout() {
    const summary = $('.state-summary');
    if (!summary || $('#vr-live')) return;
    summary.insertAdjacentHTML('afterend', `
      <section class="vr-live" id="vr-live" aria-live="polite" aria-label="Live visual response">
        <div class="vr-live-header"><span>LIVE VISUAL RESPONSE</span><small>SCENE → PAGE</small></div>
        <div class="vr-live-grid">
          <span id="vr-atmosphere">ATMOSPHERE · NEUTRAL / WORLD-LED</span>
          <span id="vr-pressure">PRESSURE · LOW</span>
          <span id="vr-focus">FOCUS · WORLD / MEDIUM</span>
          <span id="vr-motion">MOTION · LOW</span>
        </div>
      </section>`);
  }

  function loadStylesheet(href) {
    if ([...document.styleSheets].some(sheet => sheet.href && sheet.href.includes(href.split('?')[0]))) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`Failed to load ${href}`));
      document.head.appendChild(link);
    });
  }

  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => window[globalName] ? resolve() : reject(new Error(`${globalName} unavailable after ${src}`));
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function initAdvancedTools() {
    const required = ['VDOSSequenceDirectorModel', 'VDOSSequenceDirector', 'VDOSDiagnosticRouting', 'VDOSStateMachine', 'VDOSSequenceScore', 'VDOSColorOwnership', 'VDOSDiagnostic', 'VDOSTimelineSync', 'VDOSVisualResponse'];
    const missing = required.filter(name => !window[name]);
    if (missing.length) throw new Error(`Advanced tools unavailable: ${missing.join(', ')}`);
    ensureKnowledgeAtlas();
    ensureVisualResponseReadout();
    window.VDOSVisualResponse.initVisualResponse(document.documentElement, scene);
    window.VDOSStateMachine.initStateMachine($('#state-machine-root'), scene);
    window.VDOSSequenceDirectorController = window.VDOSSequenceDirector.initSequenceDirector($('#sequence-root'), scene);
    window.VDOSColorOwnership.initColorOwnership($('#color-ownership-root'), scene);
    window.VDOSDiagnostic.initDiagnostic($('#diagnostic-root'), scene, {
      routing: window.VDOSDiagnosticRouting,
      setMode: mode => setMode(mode, { scroll: false })
    });
    window.VDOSTimelineSync.syncTimelines(scene, window.VDOSStateMachine, window.VDOSSequenceScore, document);
  }

  function showInitError(error) {
    console.error(error);
    const diagnose = $('#diagnose-panel');
    if (diagnose && !diagnose.querySelector('.tool-error')) diagnose.insertAdjacentHTML('beforeend', `<p class="tool-error" role="alert">Advanced tools failed to initialize. Reload this preview to retry.</p>`);
  }

  initDesktopRail();
  scene.subscribeSceneState(render);
  scene.createSceneState({ mode: 'learn' });

  Promise.all([
    loadStylesheet('visual-response.css?v=20260817-1218'),
    loadStylesheet('sequence-director.css?v=20260817-1218'),
    loadStylesheet('diagnostic-routing.css?v=20260817-1218'),
    loadScript('sequence-director-model.js?v=20260817-1218', 'VDOSSequenceDirectorModel'),
    loadScript('sequence-director.js?v=20260817-1218', 'VDOSSequenceDirector'),
    loadScript('diagnostic-routing.js?v=20260817-1218', 'VDOSDiagnosticRouting'),
    loadScript('visual-response.js?v=20260817-1218', 'VDOSVisualResponse')
  ]).then(() => {
    initAdvancedTools();
    syncModeFromScroll();
  }).catch(showInitError);
})();
