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
  const finding = (id, level, message, reason, suggestion) => ({ id, level, message, reason, suggestion });
  function runDiagnostic(state = {}) {
    const ctx = state.diagnosticContext || {};
    const ownership = state.ownership || {};
    const camera = state.variables?.camera || {};
    const findings = [];
    const conflict = ownership.character === 'high' && ownership.world === 'high';
    findings.push(conflict
      ? finding('ownership-conflict','FAIL','Character and World both claim primary ownership.','Two primary owners are issuing competing visual instructions.','Choose a dominant owner or make the conflict an explicit narrative state.')
      : finding('ownership-conflict','PASS','Ownership hierarchy is legible.','One owner is dominant or the relationship is intentionally non-primary.','Keep the ownership transition explicit when it changes.'));

    const cameraMismatch = state.agency === 'character' && camera.perspective === 'world';
    findings.push(cameraMismatch
      ? finding('camera-ownership','WARN','Camera perspective does not follow declared agency.','Character owns the scene while the camera still behaves as World POV.','Either justify the lag as resistance or move camera perspective toward Character.')
      : finding('camera-ownership','PASS','Camera and agency are aligned.','Camera perspective does not contradict current ownership.','Preserve this alignment unless resistance is intentional.'));

    const unexplained = ctx.hasNarrativeCause === false;
    findings.push(unexplained
      ? finding('narrative-cause','WARN','A visual change has no stated narrative cause.','The current behavior cannot answer why it changed.','Attach the change to narrative state, ownership, hierarchy, or remove it.')
      : finding('narrative-cause','PASS','Visual change has a narrative cause.','The behavior is linked to an explicit state or ownership condition.','Keep the cause visible in the scene definition.'));

    const overload = Number(ctx.primaryChanges || 0) >= 5;
    findings.push(overload
      ? finding('simultaneous-change','WARN','Too many primary variables change at once.','Peak stacking reduces hierarchy and makes the visual cause unreadable.','Stagger peaks or reserve one variable for the ownership shift.')
      : finding('simultaneous-change','PASS','Primary changes remain hierarchically staged.','The scene does not ask every visual system to peak together.','Continue staggering high-salience changes.'));

    const abstractionMismatch = ctx.backgroundAbstraction === 'high' && ctx.emotionalPressure === 'low' && state.narrativeState === 'baseline';
    findings.push(abstractionMismatch
      ? finding('state-abstraction','WARN','Background abstraction exceeds the emotional state.','The environment is behaving as if the character is under pressure while narrative state remains baseline.','Reduce abstraction or declare the pressure that justifies it.')
      : finding('state-abstraction','PASS','Background behavior is plausible for the state.','Abstraction does not visibly contradict declared pressure.','Maintain the link between emotional pressure and environment behavior.'));

    const status = findings.some(f=>f.level==='FAIL') ? 'FAIL' : findings.some(f=>f.level==='WARN') ? 'WARN' : 'PASS';
    return { status, findings };
  }
  function initDiagnostic(root, scene) {
    if (!root || !scene) return () => {};
    root.innerHTML = `<div class="diagnostic-toolbar"><button type="button" data-diagnostic="current">Current scene</button><button type="button" data-diagnostic="coherent">Coherent fixture</button><button type="button" data-diagnostic="incoherent">Incoherent fixture</button></div><p class="diagnostic-question">Why did this visual behavior change?</p><div id="diagnostic-result" aria-live="polite"></div>`;
    const resultRoot = root.querySelector('#diagnostic-result');
    const render = state => {
      const result = runDiagnostic(state);
      resultRoot.innerHTML = `<p class="diagnostic-status" data-level="${result.status}">SYSTEM COHERENCE · ${result.status}</p><div class="diagnostic-list">${result.findings.map(f=>`<article data-level="${f.level}"><header><strong>${f.level}</strong><h3>${f.message}</h3></header><p>${f.reason}</p><small>${f.suggestion}</small></article>`).join('')}</div>`;
    };
    root.querySelector('[data-diagnostic="current"]').addEventListener('click',()=>render(scene.getSceneState()));
    root.querySelector('[data-diagnostic="coherent"]').addEventListener('click',()=>render(fixtures.coherent));
    root.querySelector('[data-diagnostic="incoherent"]').addEventListener('click',()=>render(fixtures.incoherent));
    const unsubscribe = scene.subscribeSceneState((state, source) => { if (!String(source).startsWith('diagnostic:fixture')) render(state); });
    return unsubscribe;
  }
  return { fixtures, runDiagnostic, initDiagnostic };
});