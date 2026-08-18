((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeWorkspace = api;
})(typeof window !== 'undefined' ? window : globalThis, root => {
  'use strict';

  const STAGES = [['01','Interpret'],['02','Edit Reading'],['03','Strategy'],['04','Sequence'],['05','Apply']];
  const READING_FIELDS = [
    ['narrativeProblem','Narrative Problem'],['coreConflict','Core Conflict'],['startingState','Starting State'],
    ['endingState','Ending State'],['turningPoint','Turning Point'],['agencyTransition','Agency Transition']
  ];
  const SOURCE_LABELS = { explicit:'EXPLICIT', inferred:'INFERRED', director_intent:'DIRECTOR INTENT' };
  const escapeHtml = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const displayValue = field => Array.isArray(field?.value) ? field.value.map(value => String(value).toUpperCase()).join(' → ') : String(field?.value ?? '');
  const groundingLabel = field => field?.directorEdited ? 'DIRECTOR EDIT' : (SOURCE_LABELS[field?.sourceType] || 'INFERRED');

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
    const controllers = { interpret:null, strategy:null, sequence:null };
    let destroyed = false;

    rootNode.innerHTML = `
      <div class="narrative-shell">
        <header class="narrative-head">
          <div><p class="eyebrow">Narrative / Upstream direction</p><h2 id="narrative-title">Narrative becomes a directing hypothesis</h2></div>
          <div>${demoMode ? '<span class="narrative-demo-badge" data-narrative-demo-badge>DEMO FIXTURE</span>' : `<span class="narrative-service-status" data-ready="${Boolean(configuredBase)}">${configuredBase ? 'AI SERVICE READY' : 'AI SERVICE NOT CONFIGURED'}</span>`}</div>
        </header>
        <div class="narrative-stages" aria-label="Narrative direction stages">
          ${STAGES.map(([number,label],index) => `<div class="narrative-stage" data-narrative-stage="${index+1}" ${index===0?'aria-current="step"':''}><small>${number}</small><strong>${label}</strong></div>`).join('')}
        </div>
        <div class="narrative-entry">
          <form class="narrative-editor" data-narrative-entry novalidate>
            <h3>Tell your story</h3>
            <p>描述正在发生的场景，不需要先懂 Camera、Space 或 Color。系统先帮助你形成可检查的叙事判断。</p>
            <div class="narrative-field"><label for="narrative-scene">Scene description</label><textarea id="narrative-scene" name="narrative" maxlength="2000" required placeholder="例：他进入办公室，本来只是接受任务，但随着对话推进逐渐意识到自己正在被控制。最后他拒绝任务并离开。"></textarea></div>
            <div class="narrative-field narrative-field--intent"><label for="narrative-intent">Director intent <span>Optional</span></label><textarea id="narrative-intent" name="directorIntent" maxlength="600" placeholder="例：我希望最后让角色重新获得控制权。"></textarea></div>
            <div class="narrative-editor-foot"><span class="narrative-counter" data-narrative-counter>0 / 2000</span><button class="narrative-primary" type="submit" ${!demoMode && !configuredBase ? 'disabled' : ''}>Start interpretation</button></div>
            <div class="narrative-live" data-narrative-live aria-live="polite">${demoMode ? 'Demo fixture mode. Results remain proposals until Apply.' : configuredBase ? 'Narrative AI service configured.' : 'AI service not configured. Configure the Narrative API base or use explicit demo mode for UI review.'}</div>
          </form>
          <aside class="narrative-aside" aria-label="Narrative Input principles">
            <div class="narrative-aside-block"><span>01 / Interpret</span><strong>Multiple readings, not one truth</strong><p>系统会提出 2–3 个候选 Narrative Reading，而不是把一个模型判断伪装成唯一答案。</p></div>
            <div class="narrative-aside-block"><span>02 / Director authority</span><strong>You confirm before the system advances</strong><p>Reading、Strategy、Sequence 每一层都必须经过你的选择，AI 不直接写入 DIRECT。</p></div>
            <div class="narrative-aside-block"><span>03 / Apply boundary</span><strong>Proposal first · Mutation later</strong><p>生成结果先进入 Preview。只有明确 Apply 才会触碰 canonical Scene State。</p></div>
          </aside>
        </div>
        <section class="narrative-output" data-narrative-output aria-live="polite"></section>
      </div>`;

    const form = rootNode.querySelector('[data-narrative-entry]');
    const sceneInput = rootNode.querySelector('#narrative-scene');
    const intentInput = rootNode.querySelector('#narrative-intent');
    const counter = rootNode.querySelector('[data-narrative-counter]');
    const live = rootNode.querySelector('[data-narrative-live]');
    const output = rootNode.querySelector('[data-narrative-output]');
    const submitButton = form.querySelector('button[type="submit"]');

    const setStage = index => rootNode.querySelectorAll('[data-narrative-stage]').forEach(node => Number(node.dataset.narrativeStage) === index ? node.setAttribute('aria-current','step') : node.removeAttribute('aria-current'));
    const setBusy = (busy,message) => { submitButton.disabled = busy || (!demoMode && !configuredBase); if (message) live.textContent = message; };

    function abortStage(stage) {
      const controller = controllers[stage];
      if (!controller) return;
      controller.abort();
      controllers[stage] = null;
    }

    function abortAll() {
      Object.keys(controllers).forEach(abortStage);
    }

    function beginRequest(stage) {
      abortStage(stage);
      const controller = new AbortController();
      controllers[stage] = controller;
      return { controller, token:draft.beginRequest(stage) };
    }

    function finishRequest(stage,controller) {
      if (controllers[stage] === controller) controllers[stage] = null;
    }

    function syncDraft() {
      if (destroyed) return;
      counter.textContent = `${sceneInput.value.length} / 2000`;
      draft.setInput(sceneInput.value,intentInput.value);
    }

    function handleInputEdit() {
      abortAll();
      syncDraft();
      output.replaceChildren();
      setStage(1);
      setBusy(false,'Input changed. Start a new interpretation when ready.');
    }

    function renderStageError(stage,error,retry) {
      const label = stage === 'interpret' ? 'Interpret' : stage === 'strategy' ? 'Strategy' : 'Sequence';
      output.innerHTML = `<div class="narrative-stage-error" data-narrative-error role="alert"><span>${escapeHtml(label.toUpperCase())} · RECOVERABLE ERROR</span><strong>${escapeHtml(error?.message || `${label} failed`)}</strong><p>Your confirmed upstream work is preserved. Retry only this stage.</p><button type="button" class="narrative-primary" data-retry-stage="${stage}">Retry ${label}</button></div>`;
      output.querySelector('[data-retry-stage]')?.addEventListener('click',retry);
    }

    function failStage(stage,token,controller,error,retry) {
      finishRequest(stage,controller);
      if (controller.signal.aborted || error?.name === 'AbortError') {
        setBusy(false,'Request cancelled. Your latest input is ready.');
        return false;
      }
      const accepted = draft.failRequest(stage,token,{ code:error?.code || 'UNKNOWN', message:error?.message || 'Narrative request failed.' });
      if (!accepted) {
        setBusy(false,'A stale response was ignored. Your latest input remains authoritative.');
        return false;
      }
      setBusy(false,error?.message || 'Narrative request failed.');
      renderStageError(stage,error,retry);
      return true;
    }

    async function requestInterpret(message = 'Interpreting the scene…') {
      output.innerHTML = '<div class="narrative-loading">Interpreting narrative problem, conflict and agency…</div>';
      setBusy(true,message);
      setStage(1);
      const { token,controller } = beginRequest('interpret');
      try {
        const current = draft.getState();
        const result = await api.interpret({ narrative:current.input, directorIntent:current.directorIntent, clarificationAnswer:current.clarificationAnswer },controller.signal);
        finishRequest('interpret',controller);
        if (!draft.acceptResponse('interpret',token,result)) {
          setBusy(false,'A stale response was ignored. Your latest input remains authoritative.');
          return false;
        }
        renderReadings();
        setBusy(false,result.clarification ? 'One clarification can materially sharpen the interpretation.' : `${result.readings.length} candidate Narrative Readings ready.`);
        return true;
      } catch (error) {
        failStage('interpret',token,controller,error,() => requestInterpret('Retrying Interpret…'));
        return false;
      }
    }

    function renderReadingEditor() {
      const state = draft.getState();
      const reading = state.selectedReading;
      if (!reading) return;
      setStage(2);
      output.innerHTML = `
        <div class="narrative-section-head"><p class="eyebrow">02 / Director edit</p><h3>Confirm the reading before visual translation</h3><p>${escapeHtml(reading.title)} · Edit any field where the proposed interpretation is not yours.</p></div>
        <div class="narrative-reading-editor" data-reading-editor>
          ${READING_FIELDS.map(([key,label]) => {
            const field = reading[key];
            return `<div class="narrative-grounded-field" data-field="${key}"><div class="narrative-grounded-head"><label for="reading-${key}">${label}</label><span data-grounding-badge>${groundingLabel(field)}</span></div><textarea id="reading-${key}" data-reading-field="${key}" rows="${key==='agencyTransition'?2:3}">${escapeHtml(displayValue(field))}</textarea><p data-field-basis>${escapeHtml(field?.directorEdited ? field.directorEditBasis : field?.basis)}</p></div>`;
          }).join('')}
          <div class="narrative-actions"><button type="button" class="narrative-primary" data-confirm-reading>Confirm reading</button></div>
        </div>`;
      output.querySelectorAll('[data-reading-field]').forEach(textarea => textarea.addEventListener('input',event => {
        const key = event.currentTarget.dataset.readingField;
        draft.editSelectedReadingField(key,event.currentTarget.value);
        const field = draft.getState().selectedReading[key];
        const container = event.currentTarget.closest('[data-field]');
        container.querySelector('[data-grounding-badge]').textContent = groundingLabel(field);
        container.querySelector('[data-field-basis]').textContent = field.directorEditBasis || field.basis;
      }));
      output.querySelector('[data-confirm-reading]').addEventListener('click',requestStrategy);
    }

    async function requestStrategy() {
      if (!draft.getState().confirmedReading) draft.confirmReading();
      setStage(3);
      output.innerHTML = '<div class="narrative-loading">Building visual direction strategies…</div>';
      const { token,controller } = beginRequest('strategy');
      try {
        const current = draft.getState();
        const result = await api.strategy({ narrative:current.input, directorIntent:current.directorIntent, reading:current.confirmedReading },controller.signal);
        finishRequest('strategy',controller);
        if (!draft.acceptResponse('strategy',token,result)) {
          setBusy(false,'A stale response was ignored.');
          return;
        }
        renderStrategies();
      } catch (error) {
        failStage('strategy',token,controller,error,requestStrategy);
      }
    }

    function renderReadings() {
      const state = draft.getState();
      setStage(1);
      const clarification = state.clarification;
      output.innerHTML = `
        <div class="narrative-section-head"><p class="eyebrow">01 / Interpretation</p><h3>Choose the reading you want to direct</h3><p>Narrative signal · ${escapeHtml(String(state.signal || '').toUpperCase())}. These are candidate interpretations, not a single hidden truth.</p></div>
        ${clarification ? `<section class="narrative-clarification" data-narrative-clarification><span>CLARIFICATION · ONE QUESTION</span><strong>${escapeHtml(clarification.question)}</strong><p>Answer only if this distinction matters to your directing intent. The system will rerun Interpret, not the downstream visual stages.</p><div class="narrative-clarification-options">${clarification.options.map(option => `<button type="button" data-clarification-option>${escapeHtml(option)}</button>`).join('')}</div></section>` : ''}
        <div class="narrative-reading-grid">
          ${state.readings.map(reading => `<button type="button" class="narrative-reading-card" data-reading-card data-reading-id="${escapeHtml(reading.id)}"><span>${escapeHtml(String(reading.confidence).toUpperCase())} CONFIDENCE</span><strong>${escapeHtml(reading.title)}</strong><p>${escapeHtml(reading.narrativeProblem.value)}</p><small>${groundingLabel(reading.narrativeProblem)} · ${escapeHtml(reading.narrativeProblem.basis)}</small></button>`).join('')}
        </div>`;
      output.querySelectorAll('[data-reading-card]').forEach(card => card.addEventListener('click',() => { draft.selectReading(card.dataset.readingId); renderReadingEditor(); }));
      output.querySelectorAll('[data-clarification-option]').forEach(button => button.addEventListener('click',async () => {
        draft.setClarificationAnswer(button.textContent.trim());
        await requestInterpret('Refining the Narrative Reading from your clarification…');
      }));
    }

    function renderStrategies() {
      const state = draft.getState();
      setStage(3);
      output.innerHTML = `
        <div class="narrative-section-head"><p class="eyebrow">03 / Visual strategy</p><h3>Choose what leads the image</h3><p>Each strategy shares the confirmed narrative mechanism but assigns different variable ownership.</p></div>
        <div class="narrative-strategy-grid">${state.strategies.map(strategy => `<button type="button" class="narrative-strategy-card" data-strategy-card data-strategy-id="${escapeHtml(strategy.id)}" aria-pressed="false"><span>PRIMARY · ${escapeHtml(strategy.primaryVariable.toUpperCase())}</span><strong>${escapeHtml(strategy.title)}</strong><p>${escapeHtml(strategy.mechanism)}</p><small>SUPPORT · ${escapeHtml(strategy.supportingVariables.join(' / ').toUpperCase())}</small><small>RESTRAIN · ${escapeHtml(strategy.restrainedVariables.join(' / ').toUpperCase() || '—')}</small></button>`).join('')}</div>
        <div class="narrative-actions"><button type="button" class="narrative-primary" data-select-strategy disabled>Select strategy</button></div>`;
      const selectButton = output.querySelector('[data-select-strategy]');
      output.querySelectorAll('[data-strategy-card]').forEach(card => card.addEventListener('click',() => {
        draft.selectStrategy(card.dataset.strategyId);
        output.querySelectorAll('[data-strategy-card]').forEach(item => item.setAttribute('aria-pressed',String(item===card)));
        selectButton.disabled = false;
      }));
      selectButton.addEventListener('click',requestSequence);
    }

    async function requestSequence() {
      if (!draft.getState().selectedStrategy) return;
      setStage(4);
      output.innerHTML = '<div class="narrative-loading">Building five-beat sequence proposal…</div>';
      const { token,controller } = beginRequest('sequence');
      try {
        const current = draft.getState();
        const result = await api.sequence({ narrative:current.input, directorIntent:current.directorIntent, reading:current.confirmedReading, strategy:current.selectedStrategy },controller.signal);
        finishRequest('sequence',controller);
        if (!draft.acceptResponse('sequence',token,result)) {
          setBusy(false,'A stale response was ignored.');
          return;
        }
        renderSequence();
      } catch (error) {
        failStage('sequence',token,controller,error,requestSequence);
      }
    }

    function renderSequence() {
      const state = draft.getState();
      setStage(4);
      const beats = state.sequenceProposal?.beats || [];
      output.innerHTML = `
        <div class="narrative-section-head"><p class="eyebrow">04 / Proposal preview</p><h3>Sequence before state mutation</h3><p>The proposal remains isolated from canonical Scene State until an explicit Apply action.</p></div>
        <div class="narrative-sequence-grid">${beats.map((beat,index) => `<article class="narrative-sequence-beat" data-sequence-proposal-beat data-beat-id="${escapeHtml(beat.id)}"><div class="narrative-beat-index">${String(index+1).padStart(2,'0')}</div><div class="narrative-beat-copy"><div class="narrative-beat-head"><strong data-beat-label>${escapeHtml(beat.label)}</strong><span>AGENCY · ${escapeHtml(beat.agency.toUpperCase())}</span></div><p>${escapeHtml(beat.narrativeBeat)}</p><div class="narrative-beat-variables"><b>PRIMARY · ${escapeHtml(beat.primaryVariable.toUpperCase())}</b><span>SUPPORT · ${escapeHtml(beat.supportingVariables.join(' / ').toUpperCase() || '—')}</span><span>RESTRAIN · ${escapeHtml(beat.restrainedVariables.join(' / ').toUpperCase() || '—')}</span></div><div class="narrative-events">${beat.visualEvents.length ? beat.visualEvents.map(event => `<span>${escapeHtml(typeof event==='string'?event:event.type)}</span>`).join('') : '<span>NO EVENT</span>'}</div></div></article>`).join('')}</div>
        <div class="narrative-apply-preview"><span>05 / APPLY</span><strong>Not applied yet</strong><p>DIRECT and Sequence Director remain unchanged in Preview mode.</p></div>`;
      live.textContent = 'Sequence proposal ready. Canonical Scene State is still unchanged.';
    }

    sceneInput.addEventListener('input',handleInputEdit);
    intentInput.addEventListener('input',handleInputEdit);
    form.addEventListener('submit',async event => {
      event.preventDefault();
      syncDraft();
      if (!sceneInput.value.trim()) { live.textContent = 'Add a scene description before interpretation.'; sceneInput.focus(); return; }
      await requestInterpret();
    });

    return {
      api,
      scene,
      getDraftState:() => draft.getState(),
      destroy(){ destroyed=true; abortAll(); rootNode.replaceChildren(); }
    };
  }

  function autoInit() {
    const rootNode = document.querySelector('#narrative-root');
    if (!rootNode || rootNode.dataset.narrativeInitialized === 'true') return;
    rootNode.dataset.narrativeInitialized = 'true';
    root.VDOSNarrativeWorkspaceController = initNarrativeWorkspace(rootNode);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',autoInit,{ once:true });
    else autoInit();
  }

  return { initNarrativeWorkspace };
});