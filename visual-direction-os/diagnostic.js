((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSDiagnostic = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const fixtures = {
    coherent:{ narrativeState:'self-directed focus', agency:'character', ownership:{character:'high',world:'low',narrative:'medium'}, variables:{ camera:{perspective:'character',stability:'medium'}, texture:{noise:'medium'}, space:{compression:'medium'} }, diagnosticContext:{hasNarrativeCause:true,primaryChanges:2,backgroundAbstraction:'medium',emotionalPressure:'medium'} },
    incoherent:{ narrativeState:'baseline', agency:'character', ownership:{character:'high',world:'high',narrative:'medium'}, variables:{ camera:{perspective:'world',stability:'low'}, texture:{noise:'high'}, space:{compression:'high'} }, diagnosticContext:{hasNarrativeCause:false,primaryChanges:6,backgroundAbstraction:'high',emotionalPressure:'low'} }
  };

  const finding = (id, level, message, reason, suggestion, meta = {}) => ({
    id,
    level,
    category: meta.category || 'CAUSALITY',
    message,
    reason,
    suggestion,
    route: meta.route ?? null,
    learnTarget: meta.learnTarget ?? null,
    current: meta.current ?? null,
    recommendedDirection: meta.recommendedDirection ?? null
  });

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function peakState(state, family) {
    const variables = state.variables || {};
    if (family === 'texture') return variables.texture?.noise === 'high' || variables.texture?.granularity === 'high';
    if (family === 'line') return variables.line?.density === 'high' || variables.line?.stability === 'low';
    if (family === 'rhythm') return variables.rhythm?.motionEnergy === 'high' || variables.rhythm?.cutDensity === 'high';
    if (family === 'space') return variables.space?.compression === 'high';
    if (family === 'color') return variables.color?.saturation === 'high' || variables.color?.contrast === 'high';
    if (family === 'camera') return variables.camera?.stability === 'low' || variables.camera?.distance === 'near';
    return false;
  }

  function runDiagnostic(state = {}) {
    const ctx = state.diagnosticContext || {};
    const ownership = state.ownership || {};
    const camera = state.variables?.camera || {};
    const findings = [];

    const conflict = ownership.character === 'high' && ownership.world === 'high';
    findings.push(conflict
      ? finding('ownership-conflict','FAIL','Character and World both claim primary ownership.','Two primary owners are issuing competing visual instructions.','Choose a dominant owner or make the conflict an explicit narrative state.',{ category:'OWNERSHIP', learnTarget:'color', current:'character + world', recommendedDirection:'one dominant owner or explicit contested state' })
      : finding('ownership-conflict','PASS','Ownership hierarchy is legible.','One owner is dominant or the relationship is intentionally non-primary.','Keep the ownership transition explicit when it changes.',{ category:'OWNERSHIP', learnTarget:'color' }));

    const cameraMismatch = state.agency === 'character' && camera.perspective === 'world';
    findings.push(cameraMismatch
      ? finding('camera-ownership','WARN','Camera perspective does not follow declared agency.','Character owns the scene while the camera still behaves as World POV.','Either justify the lag as resistance or move camera perspective toward Character.',{ category:'OWNERSHIP', route:{ family:'camera', control:'perspective', suggestedDirection:'character' }, learnTarget:'character', current:camera.perspective || 'world', recommendedDirection:'mixed → character' })
      : finding('camera-ownership','PASS','Camera and agency are aligned.','Camera perspective does not contradict current ownership.','Preserve this alignment unless resistance is intentional.',{ category:'OWNERSHIP', learnTarget:'character', current:camera.perspective || null }));

    const unexplained = ctx.hasNarrativeCause === false;
    findings.push(unexplained
      ? finding('narrative-cause','WARN','A visual change has no stated narrative cause.','The current behavior cannot answer why it changed.','Attach the change to narrative state, ownership, hierarchy, or remove it.',{ category:'CAUSALITY', learnTarget:'decision-tree', current:'unstated cause', recommendedDirection:'declare narrative state or ownership cause' })
      : finding('narrative-cause','PASS','Visual change has a narrative cause.','The behavior is linked to an explicit state or ownership condition.','Keep the cause visible in the scene definition.',{ category:'CAUSALITY', learnTarget:'decision-tree' }));

    const overload = Number(ctx.primaryChanges || 0) >= 5;
    findings.push(overload
      ? finding('simultaneous-change','WARN','Too many primary variables change at once.','Peak stacking reduces hierarchy and makes the visual cause unreadable.','Stagger peaks or reserve one variable for the ownership shift.',{ category:'HIERARCHY', route:null, learnTarget:'sequence', current:`${Number(ctx.primaryChanges || 0)} primary changes`, recommendedDirection:'one primary carrier with staged support' })
      : finding('simultaneous-change','PASS','Primary changes remain hierarchically staged.','The scene does not ask every visual system to peak together.','Continue staggering high-salience changes.',{ category:'HIERARCHY', route:null, learnTarget:'sequence' }));

    const abstractionMismatch = ctx.backgroundAbstraction === 'high' && ctx.emotionalPressure === 'low' && state.narrativeState === 'baseline';
    findings.push(abstractionMismatch
      ? finding('state-abstraction','WARN','Background abstraction exceeds the emotional state.','The environment is behaving as if the character is under pressure while narrative state remains baseline.','Reduce abstraction or declare the pressure that justifies it.',{ category:'CONTINUITY', route:{ family:'texture', control:'noise', suggestedDirection:'low' }, learnTarget:'world', current:state.variables?.texture?.noise || 'high', recommendedDirection:'medium → low' })
      : finding('state-abstraction','PASS','Background behavior is plausible for the state.','Abstraction does not visibly contradict declared pressure.','Maintain the link between emotional pressure and environment behavior.',{ category:'CONTINUITY', learnTarget:'world' }));

    if (ctx.sequenceBeat) {
      const restrained = Array.isArray(ctx.restrainedVariables) ? ctx.restrainedVariables : [];
      const peakingRestrained = restrained.filter(family => peakState(state, family));
      findings.push(peakingRestrained.length
        ? finding('sequence-hierarchy','WARN','A restrained variable is competing with the declared primary.',`${peakingRestrained.map(value => value.toUpperCase()).join(' · ')} is peaking during a ${String(ctx.declaredPrimary || 'declared').toUpperCase()}-led beat.`,'Reduce the restrained variable or make its competition an explicit event.',{ category:'HIERARCHY', route:null, learnTarget:'sequence', current:peakingRestrained.join(' · '), recommendedDirection:`keep ${restrained.join(' · ')} secondary` })
        : finding('sequence-hierarchy','PASS','Declared beat hierarchy remains legible.','Restrained variables are not competing with the primary visual carrier.','Keep support visible without turning it into a second primary.',{ category:'HIERARCHY', route:null, learnTarget:'sequence' }));

      const recoveryConflict = ctx.sequenceBeat === 'release' && (
        state.variables?.space?.compression === 'high' ||
        state.variables?.texture?.noise === 'high' ||
        state.variables?.texture?.granularity === 'high' ||
        state.variables?.camera?.stability === 'low'
      );
      findings.push(recoveryConflict
        ? finding('sequence-recovery','WARN','Visual energy remains elevated after narrative pressure releases.','Compression, texture, or camera instability is still carrying rupture-level energy into RELEASE.','Let at least one high-salience system recover before the new ownership state settles.',{ category:'RECOVERY', route:null, learnTarget:'sequence', current:'rupture energy persists', recommendedDirection:'reduce pressure before new ownership' })
        : finding('sequence-recovery','PASS','Visual energy recovers with the narrative beat.','The sequence releases enough pressure for the next ownership state to read clearly.','Preserve this recovery window unless continued resistance is intentional.',{ category:'RECOVERY', route:null, learnTarget:'sequence' }));
    }

    const status = findings.some(f => f.level === 'FAIL') ? 'FAIL' : findings.some(f => f.level === 'WARN') ? 'WARN' : 'PASS';
    return { status, findings };
  }

  function directionMarkup(f) {
    if (!f.current && !f.recommendedDirection) return '';
    return `<div class="diagnostic-direction">
      ${f.current ? `<div><span>CURRENT</span><strong>${escapeHtml(String(f.current).toUpperCase())}</strong></div>` : ''}
      ${f.recommendedDirection ? `<div><span>RECOMMENDED DIRECTION</span><strong>${escapeHtml(String(f.recommendedDirection).toUpperCase())}</strong></div>` : ''}
    </div>`;
  }

  function findingMarkup(f, routing) {
    const learnHref = routing?.learnHref?.(f.learnTarget);
    const canRoute = Boolean(f.route && routing?.goToControl);
    return `<article data-level="${escapeHtml(f.level)}" data-finding-id="${escapeHtml(f.id)}" data-category="${escapeHtml(f.category)}">
      <div class="diagnostic-category">${escapeHtml(f.category)}</div>
      <header><strong>${escapeHtml(f.level)}</strong><h3>${escapeHtml(f.message)}</h3></header>
      <p>${escapeHtml(f.reason)}</p>
      <small>${escapeHtml(f.suggestion)}</small>
      ${directionMarkup(f)}
      ${(canRoute || learnHref) ? `<div class="diagnostic-actions">
        ${canRoute ? `<button type="button" data-fix-route="${escapeHtml(f.id)}">GO TO CONTROL</button>` : ''}
        ${learnHref ? `<a data-learn-route href="${escapeHtml(learnHref)}">UNDERSTAND MECHANISM</a>` : ''}
      </div>` : ''}
    </article>`;
  }

  function remainingStatusText(result) {
    const fails = result.findings.filter(item => item.level === 'FAIL').length;
    const warns = result.findings.filter(item => item.level === 'WARN').length;
    if (fails > 0) return fails === 1 ? '1 FAIL REMAINS' : `${fails} FAILS REMAIN`;
    if (warns > 0) return warns === 1 ? '1 WARN REMAINS' : `${warns} WARNINGS REMAIN`;
    return '';
  }

  function resolutionMarkup(resolution, result) {
    if (!resolution) return '';
    const remaining = remainingStatusText(result);
    return `<div class="diagnostic-route-resolution" role="status">
      <span>ROUTE RESOLVED</span>
      <strong>${escapeHtml(String(resolution.family || 'CONTROL').toUpperCase())} → PASS</strong>
      <small>${escapeHtml(resolution.message || 'The routed diagnostic finding now passes.')}${remaining ? ` · ${escapeHtml(remaining)}` : ' · SYSTEM COHERENCE PASS'}</small>
    </div>`;
  }

  function initDiagnostic(root, scene, options = {}) {
    if (!root || !scene) return () => {};
    const routing = options.routing || null;
    root.innerHTML = `<div class="diagnostic-toolbar"><button type="button" data-diagnostic="current">Current scene</button><button type="button" data-diagnostic="coherent">Coherent fixture</button><button type="button" data-diagnostic="incoherent">Incoherent fixture</button></div><p class="diagnostic-question">Why did this visual behavior change?</p><div id="diagnostic-result" aria-live="polite"></div>`;
    const resultRoot = root.querySelector('#diagnostic-result');
    let activeView = 'current';
    let lastResult = null;
    let activeRoute = null;
    let resolvedRoute = null;

    const bindRoutes = () => {
      resultRoot.querySelectorAll('[data-fix-route]').forEach(button => button.addEventListener('click', () => {
        const findingId = button.dataset.fixRoute;
        const targetFinding = lastResult?.findings?.find(item => item.id === findingId);
        if (!targetFinding?.route || !routing?.goToControl) return;
        activeRoute = { id: findingId, family: targetFinding.route.family || 'control' };
        resolvedRoute = null;
        routing.goToControl(targetFinding.route, { doc: root.ownerDocument, setMode: options.setMode });
      }));
    };

    const render = state => {
      const previousResult = lastResult;
      const result = runDiagnostic(state);

      if (activeView === 'current' && activeRoute) {
        const previousFinding = previousResult?.findings?.find(item => item.id === activeRoute.id);
        const currentFinding = result.findings.find(item => item.id === activeRoute.id);
        if (currentFinding?.level === 'PASS' && previousFinding?.level !== 'PASS') {
          resolvedRoute = {
            id: activeRoute.id,
            family: activeRoute.family,
            message: currentFinding.message
          };
          activeRoute = null;
        }
      }

      if (resolvedRoute) {
        const resolvedFinding = result.findings.find(item => item.id === resolvedRoute.id);
        if (resolvedFinding && resolvedFinding.level !== 'PASS') resolvedRoute = null;
      }

      lastResult = result;
      const remaining = remainingStatusText(result);
      resultRoot.innerHTML = `<p class="diagnostic-status" data-level="${result.status}">SYSTEM COHERENCE · ${result.status}${remaining ? ` · ${remaining}` : ''}</p>${resolutionMarkup(resolvedRoute, result)}<div class="diagnostic-list">${result.findings.map(f => findingMarkup(f, routing)).join('')}</div>`;
      bindRoutes();
    };

    const setView = view => {
      activeView = view;
      activeRoute = null;
      resolvedRoute = null;
      root.querySelectorAll('[data-diagnostic]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.diagnostic === view)));
      render(view === 'current' ? scene.getSceneState() : fixtures[view]);
    };

    root.querySelector('[data-diagnostic="current"]').addEventListener('click', () => setView('current'));
    root.querySelector('[data-diagnostic="coherent"]').addEventListener('click', () => setView('coherent'));
    root.querySelector('[data-diagnostic="incoherent"]').addEventListener('click', () => setView('incoherent'));
    const unsubscribe = scene.subscribeSceneState(state => { if (activeView === 'current') render(state); });
    setView('current');
    return unsubscribe;
  }

  return { fixtures, runDiagnostic, initDiagnostic };
});
