((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeApplyUI = api;
})(typeof window !== 'undefined' ? window : globalThis, root => {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));

  function applySceneAtCurrentPlayhead(sequence) {
    const scene = root.VDOSScene;
    const sequenceModel = root.VDOSSequenceDirectorModel;
    if (!scene || !sequenceModel) throw new Error('Sequence model and Scene State are required before applying Narrative direction.');
    const current = scene.getSceneState();
    const view = sequenceModel.deriveSequenceState(sequence, current.playhead);
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
    }, 'narrative:apply');
  }

  function installApplyControls(output) {
    if (!output || output.querySelector('[data-apply-controls]')) return false;
    const preview = output.querySelector('.narrative-apply-preview');
    const workspace = root.VDOSNarrativeWorkspaceController;
    const apply = root.VDOSNarrativeApply;
    const sequenceController = root.VDOSSequenceDirectorController;
    if (!preview || !workspace || !apply || !sequenceController?.getSequence || !sequenceController?.setSequence) return false;

    const draftState = workspace.getDraftState?.();
    const beats = draftState?.sequenceProposal?.beats || [];
    if (!beats.length) return false;

    let mode = 'all';
    let selected = new Set(beats.map(beat => beat.id));

    preview.classList.add('narrative-apply-panel');
    preview.innerHTML = `
      <div class="narrative-apply-title">
        <span>05 / APPLY</span>
        <div><strong>Choose what enters the Director</strong><p>Preview stays isolated until this action is explicit.</p></div>
      </div>
      <div class="narrative-apply-controls" data-apply-controls>
        <div class="narrative-apply-modes" role="group" aria-label="Apply scope">
          <button type="button" data-apply-mode="all" aria-pressed="true">Apply all</button>
          <button type="button" data-apply-mode="selected" aria-pressed="false">Apply selected</button>
        </div>
        <div class="narrative-apply-beats" aria-label="Beats to apply">
          ${beats.map(beat => `<button type="button" data-apply-beat="${beat.id}" aria-pressed="true"><small>${beat.label}</small><span>INCLUDED</span></button>`).join('')}
        </div>
        <div class="narrative-apply-footer">
          <p data-apply-status>Not applied yet. DIRECT and Sequence Director remain unchanged.</p>
          <button type="button" class="narrative-primary" data-apply-action>Apply to Director</button>
        </div>
      </div>`;

    const modeButtons = [...preview.querySelectorAll('[data-apply-mode]')];
    const beatButtons = [...preview.querySelectorAll('[data-apply-beat]')];
    const action = preview.querySelector('[data-apply-action]');
    const status = preview.querySelector('[data-apply-status]');

    const sync = () => {
      modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.applyMode === mode)));
      beatButtons.forEach(button => {
        const included = selected.has(button.dataset.applyBeat);
        button.setAttribute('aria-pressed', String(included));
        button.querySelector('span').textContent = included ? 'INCLUDED' : 'HELD BACK';
        button.disabled = mode === 'all';
      });
      action.disabled = mode === 'selected' && selected.size === 0;
    };

    modeButtons.forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.applyMode;
      if (mode === 'all') selected = new Set(beats.map(beat => beat.id));
      sync();
    }));

    beatButtons.forEach(button => button.addEventListener('click', () => {
      if (mode !== 'selected') return;
      const id = button.dataset.applyBeat;
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      sync();
    }));

    action.addEventListener('click', () => {
      const latest = workspace.getDraftState?.();
      const proposal = latest?.sequenceProposal;
      const beatIds = mode === 'all' ? beats.map(beat => beat.id) : beats.map(beat => beat.id).filter(id => selected.has(id));
      if (!proposal || !beatIds.length) return;

      const intelligence = root.VDOSVisualIRShadowController;
      const authorityPlan = intelligence?.syncAuthorityPlan?.() || intelligence?.getAuthorityPlan?.() || null;
      const guarded = Boolean(authorityPlan?.grammarId && authorityPlan?.resolvedProposal);
      const proposalForApply = guarded ? authorityPlan.resolvedProposal : proposal;

      const currentSequence = sequenceController.getSequence();
      const nextSequence = apply.buildSequenceFromProposal(proposalForApply, currentSequence, beatIds);
      const currentPlayhead = root.VDOSScene.getSceneState().playhead;
      sequenceController.setSequence(nextSequence, { playhead: currentPlayhead });
      applySceneAtCurrentPlayhead(nextSequence);

      const labels = beats.filter(beat => beatIds.includes(beat.id)).map(beat => beat.label);
      status.textContent = guarded
        ? `COMPILER GUARDED · Applied ${labels.join(' · ')} to Director.`
        : `COMPILER UNRESOLVED · AI proposal applied ${labels.join(' · ')} to Director.`;
      root.document.querySelectorAll('[data-narrative-stage]').forEach(node => {
        if (node.dataset.narrativeStage === '5') node.setAttribute('aria-current', 'step');
        else node.removeAttribute('aria-current');
      });
      action.textContent = 'Applied to Director';
      root.document.querySelector('[data-narrative-live]')?.replaceChildren(root.document.createTextNode(
        guarded
          ? 'Compiler-guarded Narrative proposal applied. DIRECT remains manually editable.'
          : 'Narrative proposal applied without resolved compiler authority. DIRECT remains manually editable.'
      ));
    });

    sync();
    return true;
  }

  function init() {
    const narrativeRoot = root.document?.querySelector('#narrative-root');
    if (!narrativeRoot) return { destroy() {} };
    let observer = null;
    const attempt = () => installApplyControls(narrativeRoot.querySelector('[data-narrative-output]'));
    observer = new MutationObserver(() => attempt());
    observer.observe(narrativeRoot, { childList: true, subtree: true });
    attempt();
    return { destroy() { observer?.disconnect(); } };
  }

  if (typeof document !== 'undefined') {
    const start = () => { root.VDOSNarrativeApplyUIController = init(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }

  return { init, installApplyControls };
});
