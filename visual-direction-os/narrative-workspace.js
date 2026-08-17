((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeWorkspace = api;
})(typeof window !== 'undefined' ? window : globalThis, root => {
  'use strict';

  const STAGES = [
    ['01', 'Interpret'],
    ['02', 'Edit Reading'],
    ['03', 'Strategy'],
    ['04', 'Sequence'],
    ['05', 'Apply']
  ];

  function updatePrimaryModeUI(mode) {
    document.querySelectorAll('[data-mode]').forEach(control => {
      if (control.dataset.mode === mode) control.setAttribute('aria-current', 'page');
      else control.removeAttribute('aria-current');
    });
  }

  function installNarrativeModeOverride(scene) {
    document.querySelectorAll('[data-mode="narrative"]').forEach(control => {
      control.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (control.tagName === 'A') history.replaceState(null, '', '#narrative-panel');
        scene?.updateSceneState?.({ mode: 'narrative' }, 'narrative-mode');
        updatePrimaryModeUI('narrative');
        const panel = document.querySelector('#narrative-panel');
        if (!panel) return;
        const reduced = root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (root.innerWidth <= 900 || reduced) {
          root.scrollTo({ top: panel.getBoundingClientRect().top + root.scrollY, left: 0, behavior: 'auto' });
        } else {
          panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }, true);
    });

    let ticking = false;
    root.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      root.requestAnimationFrame(() => {
        ticking = false;
        const narrative = document.querySelector('#narrative-panel');
        const direct = document.querySelector('#direct-panel');
        if (!narrative || !direct) return;
        const probe = root.scrollY + Math.min(180, root.innerHeight * .24);
        if (probe >= narrative.offsetTop && probe < direct.offsetTop) {
          updatePrimaryModeUI('narrative');
          const current = scene?.getSceneState?.();
          if (current && current.mode !== 'narrative') scene.updateSceneState({ mode: 'narrative' }, 'narrative-scroll-spy');
        }
      });
    }, { passive: true });
  }

  function initNarrativeWorkspace(rootNode, options = {}) {
    if (!rootNode) throw new Error('Narrative workspace root is required.');
    const scene = options.scene || root.VDOSScene;
    const contracts = options.contracts || root.VDOSNarrativeContracts;
    const stateFactory = options.stateFactory || root.VDOSNarrativeState;
    const apiFactory = options.apiFactory || root.VDOSNarrativeApiClient;
    const fixtures = options.fixtures || root.VDOSNarrativeDemoFixtures;
    if (!contracts || !stateFactory || !apiFactory) throw new Error('Narrative workspace dependencies are missing.');

    const params = new URLSearchParams(root.location?.search || '');
    const demoMode = options.demoMode ?? params.get('narrativeDemo') === '1';
    const configuredBase = options.baseUrl ?? document.querySelector('meta[name="vdos-narrative-api-base"]')?.content?.trim() ?? '';
    const draft = options.draft || stateFactory.createNarrativeState();
    const api = options.api || apiFactory.createNarrativeApiClient({ baseUrl: configuredBase, demoMode, fixtures });
    let destroyed = false;

    rootNode.innerHTML = `
      <div class="narrative-shell">
        <header class="narrative-head">
          <div>
            <p class="eyebrow">Narrative / Upstream direction</p>
            <h2 id="narrative-title">Narrative becomes a directing hypothesis.</h2>
          </div>
          <div>
            ${demoMode ? '<span class="narrative-demo-badge" data-narrative-demo-badge>DEMO FIXTURE</span>' : `<span class="narrative-service-status" data-ready="${Boolean(configuredBase)}">${configuredBase ? 'AI SERVICE READY' : 'AI SERVICE NOT CONFIGURED'}</span>`}
          </div>
        </header>
        <div class="narrative-stages" aria-label="Narrative direction stages">
          ${STAGES.map(([number, label], index) => `<div class="narrative-stage" data-narrative-stage="${index + 1}" ${index === 0 ? 'aria-current="step"' : ''}><small>${number}</small><strong>${label}</strong></div>`).join('')}
        </div>
        <div class="narrative-entry">
          <form class="narrative-editor" data-narrative-entry novalidate>
            <h3>Tell your story.</h3>
            <p>描述正在发生的场景，不需要先懂 Camera、Space 或 Color。系统先帮助你形成可检查的叙事判断。</p>
            <div class="narrative-field">
              <label for="narrative-scene">Scene description</label>
              <textarea id="narrative-scene" name="narrative" maxlength="2000" required placeholder="例：他进入办公室，本来只是接受任务，但随着对话推进逐渐意识到自己正在被控制。最后他拒绝任务并离开。"></textarea>
            </div>
            <div class="narrative-field narrative-field--intent">
              <label for="narrative-intent">Director intent <span>Optional</span></label>
              <textarea id="narrative-intent" name="directorIntent" maxlength="600" placeholder="例：我希望最后让角色重新获得控制权。"></textarea>
            </div>
            <div class="narrative-editor-foot">
              <span class="narrative-counter" data-narrative-counter>0 / 2000</span>
              <button class="narrative-primary" type="submit" ${!demoMode && !configuredBase ? 'disabled' : ''}>Start interpretation</button>
            </div>
            <div class="narrative-live" data-narrative-live aria-live="polite">${demoMode ? 'Demo fixture mode. Your input stays local until later AI stages are connected.' : configuredBase ? 'Narrative AI service configured.' : 'AI service not configured. Configure the Narrative API base or use explicit demo mode for UI review.'}</div>
          </form>
          <aside class="narrative-aside" aria-label="Narrative Input principles">
            <div class="narrative-aside-block"><span>01 / Interpret</span><strong>Multiple readings, not one truth.</strong><p>系统会提出 2–3 个候选 Narrative Reading，而不是把一个模型判断伪装成唯一答案。</p></div>
            <div class="narrative-aside-block"><span>02 / Director authority</span><strong>You confirm before the system advances.</strong><p>Reading、Strategy、Sequence 每一层都必须经过你的选择，AI 不直接写入 DIRECT。</p></div>
            <div class="narrative-aside-block"><span>03 / Apply boundary</span><strong>Proposal first. Mutation later.</strong><p>生成结果先进入 Preview。只有明确 Apply 才会触碰 canonical Scene State。</p></div>
          </aside>
        </div>
      </div>`;

    const form = rootNode.querySelector('[data-narrative-entry]');
    const sceneInput = rootNode.querySelector('#narrative-scene');
    const intentInput = rootNode.querySelector('#narrative-intent');
    const counter = rootNode.querySelector('[data-narrative-counter]');
    const live = rootNode.querySelector('[data-narrative-live]');

    const syncDraft = () => {
      if (destroyed) return;
      counter.textContent = `${sceneInput.value.length} / 2000`;
      draft.setInput(sceneInput.value, intentInput.value);
    };
    sceneInput.addEventListener('input', syncDraft);
    intentInput.addEventListener('input', syncDraft);
    form.addEventListener('submit', event => {
      event.preventDefault();
      syncDraft();
      if (!sceneInput.value.trim()) {
        live.textContent = 'Add a scene description before interpretation.';
        sceneInput.focus();
        return;
      }
      live.textContent = 'Interpretation stage is ready. Candidate Reading rendering follows in the next implementation slice.';
    });

    return {
      api,
      getDraftState: () => draft.getState(),
      destroy() { destroyed = true; rootNode.replaceChildren(); }
    };
  }

  function autoInit() {
    const rootNode = document.querySelector('#narrative-root');
    if (!rootNode || rootNode.dataset.narrativeInitialized === 'true') return;
    rootNode.dataset.narrativeInitialized = 'true';
    installNarrativeModeOverride(root.VDOSScene);
    root.VDOSNarrativeWorkspaceController = initNarrativeWorkspace(rootNode);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit, { once: true });
    else autoInit();
  }

  return { initNarrativeWorkspace };
});
