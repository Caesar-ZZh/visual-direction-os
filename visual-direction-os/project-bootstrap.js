((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectBootstrap = api;
})(typeof window !== 'undefined' ? window : globalThis, root => {
  'use strict';

  const VERSION = '20260823-m7-controls';
  const DEMO_STORY = 'A young employee enters a routine assignment meeting expecting to comply. During the conversation, he realizes the assignment itself is a mechanism of control. Recognition turns into explicit refusal, and he leaves the institution acting from self-authored agency.';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function deriveProjectApiBase(narrativeBase = '') {
    const base = String(narrativeBase || '').trim().replace(/\/+$/, '');
    return base.replace(/\/api\/narrative$/i, '');
  }

  function createInitialProjectInput(demoMode = false) {
    return { id:'project-untitled', title:'Untitled Film', projectIntent:demoMode ? 'End with the character reclaiming agency.' : '', sourceNarrative:demoMode ? DEMO_STORY : '' };
  }

  function createNarrativeApiProxy(baseApi, getContext) {
    if (!baseApi || typeof baseApi.interpret !== 'function') throw new Error('Narrative API proxy requires a base API client.');
    return {
      interpret(payload, signal) {
        const projectContext = typeof getContext === 'function' ? getContext() : null;
        return baseApi.interpret(projectContext ? { ...(payload || {}), projectContext:clone(projectContext) } : { ...(payload || {}) }, signal);
      },
      strategy(payload, signal) { return baseApi.strategy(payload, signal); },
      sequence(payload, signal) { return baseApi.sequence(payload, signal); }
    };
  }

  function renderSceneContextBar(project, sceneId = project?.activeSceneId) {
    const order = Array.isArray(project?.sceneOrder) ? project.sceneOrder : [];
    const index = order.indexOf(sceneId);
    const scene = index >= 0 ? project?.scenes?.[sceneId] : null;
    if (!scene) return '';
    const agency = Array.isArray(scene.narrativeRole?.agencyTransition) ? scene.narrativeRole.agencyTransition.map(value => String(value).toUpperCase()).join(' → ') : '—';
    const previousId = index > 0 ? order[index - 1] : null;
    const nextId = index < order.length - 1 ? order[index + 1] : null;
    return `<div class="project-scene-context-inner"><div class="project-scene-context-id"><span>${esc(String(project.title || 'Untitled Project').toUpperCase())}</span><strong>${String(index + 1).padStart(2,'0')} / ${String(order.length).padStart(2,'0')} · ${esc(scene.title)}</strong><small>${esc(String(scene.narrativeRole?.role || '').toUpperCase())} · ${esc(agency)}</small></div><div class="project-scene-context-actions"><button type="button" data-project-scene-nav="project">← PROJECT ARC</button><button type="button" data-project-scene-nav="previous" data-scene-id="${esc(previousId || '')}" ${previousId ? '' : 'disabled'}>PREV SCENE</button><button type="button" data-project-scene-nav="next" data-scene-id="${esc(nextId || '')}" ${nextId ? '' : 'disabled'}>NEXT SCENE →</button></div></div>`;
  }

  function shouldPersistSceneEvent(source, runtime) {
    if (runtime?.isSwitching?.()) return null;
    const value = String(source || '');
    if (value === 'narrative:apply') return 'directed';
    if (value === 'ownership-demo' || value.startsWith('workspace:') || value.startsWith('sequence-director:')) return 'in-progress';
    return null;
  }

  function renderNarrativeProjectContext(context) {
    if (!context) return '';
    const agency = Array.isArray(context.agencyTransition) ? context.agencyTransition.map(value => String(value).toUpperCase()).join(' → ') : '—';
    return `<section class="project-narrative-context" aria-label="Project context for current Scene"><header><span>PROJECT CONTEXT</span><strong>Upstream intent · not confirmed Scene truth</strong></header><div><span>ROLE</span><strong>${esc(String(context.sceneRole || '').toUpperCase())}</strong></div><div><span>FUNCTION</span><strong>${esc(context.narrativeFunction)}</strong></div><div><span>START</span><strong>${esc(context.startingState)}</strong></div><div><span>END</span><strong>${esc(context.endingState)}</strong></div><div><span>AGENCY</span><strong>${esc(agency)}</strong></div></section>`;
  }

  function loadStyle(href) {
    if (typeof document === 'undefined') return Promise.resolve();
    if ([...document.styleSheets].some(sheet => sheet.href && sheet.href.includes(href.split('?')[0]))) return Promise.resolve();
    return new Promise((resolve,reject) => { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; link.onload = resolve; link.onerror = () => reject(new Error(`Failed to load ${href}`)); document.head.appendChild(link); });
  }

  function loadScript(src, globalName) {
    if (root?.[globalName]) return Promise.resolve(root[globalName]);
    if (typeof document === 'undefined') return Promise.reject(new Error(`Cannot load ${src} without a document.`));
    return new Promise((resolve,reject) => { const script = document.createElement('script'); script.src = src; script.onload = () => root?.[globalName] ? resolve(root[globalName]) : reject(new Error(`${globalName} unavailable after ${src}`)); script.onerror = () => reject(new Error(`Failed to load ${src}`)); document.head.appendChild(script); });
  }

  async function loadOptionalPersistence(loader = loadScript) {
    try {
      const persistenceApi = await loader(`project-persistence.js?v=${VERSION}`, 'VDOSProjectPersistence');
      if (!persistenceApi || typeof persistenceApi.createProjectPersistence !== 'function') throw new Error('VDOSProjectPersistence is unavailable after project-persistence.js');
      return { enabled:true, api:persistenceApi, error:null };
    } catch (error) {
      if (root?.console?.warn) root.console.warn('Project persistence unavailable; Project Workspace will continue without local save.', error);
      return { enabled:false, api:null, error };
    }
  }

  async function loadProjectDependencies() {
    await loadScript(`project-constraint-registry.js?v=${VERSION}`, 'VDOSProjectConstraintRegistry');
    await Promise.all([
      loadStyle(`project-workspace.css?v=${VERSION}`),
      loadStyle(`project-context.css?v=${VERSION}`),
      loadStyle(`project-intelligence.css?v=${VERSION}`),
      loadStyle(`project-constraint.css?v=${VERSION}`),
      loadScript(`project-contracts.js?v=${VERSION}`, 'VDOSProjectContracts'),
      loadScript(`project-context.js?v=${VERSION}`, 'VDOSProjectContextContract')
    ]);
    await Promise.all([
      loadScript(`project-state.js?v=${VERSION}`, 'VDOSProjectState'),
      loadScript(`project-breakdown-state.js?v=${VERSION}`, 'VDOSProjectBreakdownState'),
      loadScript(`project-breakdown-api-client.js?v=${VERSION}`, 'VDOSProjectBreakdownApiClient'),
      loadScript(`project-breakdown-fixtures.js?v=${VERSION}`, 'VDOSProjectBreakdownFixtures'),
      loadScript(`project-arc.js?v=${VERSION}`, 'VDOSProjectArc')
    ]);
    await Promise.all([loadScript(`project-runtime.js?v=${VERSION}`, 'VDOSProjectRuntime'),loadScript(`project-continuity.js?v=${VERSION}`, 'VDOSProjectContinuity')]);
    await loadScript(`project-intelligence.js?v=${VERSION}`, 'VDOSProjectIntelligence');
    await loadScript(`project-constraint-candidates.js?v=${VERSION}`, 'VDOSProjectConstraintCandidates');
    await loadScript(`project-constraint-authority.js?v=${VERSION}`, 'VDOSProjectConstraintAuthority');
    await loadScript(`visual-sequence-project-constraints.js?v=${VERSION}`, 'VDOSVisualSequenceProjectConstraints');
    await loadScript(`project-intelligence-inspector.js?v=${VERSION}`, 'VDOSProjectIntelligenceInspector');
    await loadScript(`project-constraint-inspector.js?v=${VERSION}`, 'VDOSProjectConstraintInspector');
    await loadScript(`project-workspace.js?v=${VERSION}`, 'VDOSProjectWorkspace');
    const persistence = await loadOptionalPersistence();
    return { persistence };
  }

  function ensureRoot() {
    let projectRoot = document.querySelector('#project-workspace-root'); if (projectRoot) return projectRoot;
    const stage = document.querySelector('.stage'); const first = document.querySelector('#learn-panel');
    if (!stage || !first) throw new Error('Director stage is unavailable for Project Workspace.');
    projectRoot = document.createElement('section'); projectRoot.id = 'project-workspace-root'; projectRoot.className = 'project-workspace-root'; projectRoot.setAttribute('aria-label','Project workspace'); stage.insertBefore(projectRoot, first); return projectRoot;
  }

  function ensureSceneContextRoot(projectRoot) {
    let node = document.querySelector('#project-scene-context-bar'); if (node) return node;
    node = document.createElement('aside'); node.id = 'project-scene-context-bar'; node.className = 'project-scene-context-bar'; node.hidden = true; node.setAttribute('aria-label','Active Project Scene context'); projectRoot.insertAdjacentElement('afterend', node); return node;
  }

  function sceneAdapter(scene) {
    return { getState:() => scene.getSceneState(), restore(snapshot) { const currentMode = scene.getSceneState?.()?.mode || 'narrative'; return scene.createSceneState(snapshot || { mode:currentMode }); } };
  }

  function configuredBase() {
    const explicit = document.querySelector('meta[name="vdos-project-api-base"]')?.content?.trim() || ''; if (explicit) return String(explicit).replace(/\/+$/,'');
    const narrative = document.querySelector('meta[name="vdos-narrative-api-base"]')?.content?.trim() || ''; return deriveProjectApiBase(narrative);
  }
  function narrativeBase() { return document.querySelector('meta[name="vdos-narrative-api-base"]')?.content?.trim() || ''; }
  function currentProjectContext(store) { const project = store.getProject(); const sceneId = project?.activeSceneId; if (!sceneId) return null; return root.VDOSProjectContextContract.projectContextForScene(project, sceneId); }
  function currentProjectConstraintContext(store) {
    const projectState = store.getProject();
    return {
      projectState,
      projectIntelligence: root.VDOSProjectIntelligence.deriveProjectIntelligence(projectState),
      registry: projectState?.projectConstraints || root.VDOSProjectConstraintRegistry.createEmptyRegistry(),
      targetSceneId: projectState?.activeSceneId || null
    };
  }

  function injectNarrativeProjectContext(context) {
    const narrativeRoot = document.querySelector('#narrative-root'); if (!narrativeRoot) return;
    narrativeRoot.querySelector('.project-narrative-context')?.remove(); if (!context) return;
    const stages = narrativeRoot.querySelector('.narrative-stages'); if (stages) stages.insertAdjacentHTML('afterend', renderNarrativeProjectContext(context));
  }

  function createNarrativeRuntime(store, params) {
    let controller = root.VDOSNarrativeWorkspaceController || null;
    const demoMode = params.get('narrativeDemo') === '1'; const baseUrl = narrativeBase();
    function destroyController() { controller?.destroy?.(); controller = null; root.VDOSNarrativeWorkspaceController = null; }
    return {
      getState() { return controller?.getDraftState?.() || null; },
      abort() { destroyController(); },
      restore(snapshot) {
        const narrativeRoot = document.querySelector('#narrative-root');
        if (!narrativeRoot || !root.VDOSNarrativeWorkspace || !root.VDOSNarrativeState || !root.VDOSNarrativeApiClient) return null;
        destroyController();
        const projectContext = currentProjectContext(store);
        const baseApi = root.VDOSNarrativeApiClient.createNarrativeApiClient({ baseUrl, demoMode, fixtures:root.VDOSNarrativeDemoFixtures });
        const api = createNarrativeApiProxy(baseApi, () => currentProjectContext(store));
        const draft = root.VDOSNarrativeState.createNarrativeState(snapshot || {});
        controller = root.VDOSNarrativeWorkspace.initNarrativeWorkspace(narrativeRoot, {
          draft, api, demoMode, baseUrl,
          projectConstraintGuard: root.VDOSVisualSequenceProjectConstraints,
          projectConstraintProvider: () => currentProjectConstraintContext(store)
        });
        root.VDOSNarrativeWorkspaceController = controller;
        injectNarrativeProjectContext(projectContext);
        return controller;
      }
    };
  }

  function createSequenceRuntime(scene) {
    return { getState() { return root.VDOSSequenceDirectorController?.getSequence?.() || null; }, restore(snapshot) { const controller = root.VDOSSequenceDirectorController; if (!controller?.setSequence) return null; const sequence = snapshot || root.VDOSSequenceDirectorModel?.DEFAULT_SEQUENCE; if (!sequence) return null; controller.setSequence(sequence, { playhead:scene.getSceneState?.()?.playhead || 0 }); return sequence; } };
  }

  function scrollToNarrative() { document.querySelector('[data-mode="narrative"]')?.click(); document.querySelector('#narrative-panel')?.scrollIntoView({ behavior:'auto', block:'start' }); }
  function createNoopPersistence(reason = null) { return { enabled:false, reason:reason?.message || String(reason || 'Persistence unavailable'), key:null, load(){ return null; }, save(project){ return clone(project); }, clear(){}, bind(){ return () => {}; } }; }

  function createPersistence(options, demoMode, persistenceApi = root?.VDOSProjectPersistence) {
    if (options.projectPersistence) return options.projectPersistence;
    if (!persistenceApi || typeof persistenceApi.createProjectPersistence !== 'function') return createNoopPersistence(new Error('Persistence module unavailable'));
    const persistenceOptions = { onError(error) { if (root?.console?.warn) root.console.warn('Project persistence write failed; continuing without interrupting the workspace.', error); } };
    if (Object.prototype.hasOwnProperty.call(options, 'storage')) persistenceOptions.storage = options.storage;
    if (options.persistenceKey) persistenceOptions.key = options.persistenceKey; else if (demoMode) persistenceOptions.key = 'vdos-project-v2.1-demo';
    try { const persistence = persistenceApi.createProjectPersistence(persistenceOptions); if (persistence && persistence.enabled == null) persistence.enabled = true; return persistence; }
    catch (error) { if (root?.console?.warn) root.console.warn('Project persistence initialization failed; continuing without local save.', error); return createNoopPersistence(error); }
  }

  async function initProjectShell(options = {}) {
    const dependencyStatus = await loadProjectDependencies(); if (root.VDOSProjectContext) return root.VDOSProjectContext;
    const scene = options.scene || root.VDOSScene; if (!scene) throw new Error('VDOSScene is required before Project Bootstrap.');
    const params = new URLSearchParams(root.location?.search || ''); const demoMode = options.demoMode ?? params.get('projectDemo') === '1';
    const rootNode = options.rootNode || ensureRoot(); const sceneContextRoot = ensureSceneContextRoot(rootNode);
    let persistence = createPersistence(options, demoMode, dependencyStatus?.persistence?.api || root?.VDOSProjectPersistence); let hydratedProject = null;
    if (!options.projectStore) { try { hydratedProject = persistence.load(); } catch (error) { if (root?.console?.warn) root.console.warn('Project persistence hydration failed; continuing with a fresh Project.', error); persistence = createNoopPersistence(error); } }
    const store = options.projectStore || root.VDOSProjectState.createProjectStore(hydratedProject); if (!store.getProject()) store.createProject(createInitialProjectInput(demoMode));
    let unbindPersistence = () => {}; if (!options.disablePersistence) { try { unbindPersistence = persistence.bind(store); } catch (error) { if (root?.console?.warn) root.console.warn('Project persistence binding failed; continuing without local save.', error); persistence = createNoopPersistence(error); } }
    const breakdownState = options.breakdownState || root.VDOSProjectBreakdownState.createProjectBreakdownState();
    const apiClient = options.apiClient || root.VDOSProjectBreakdownApiClient.createProjectBreakdownApiClient({ baseUrl:options.baseUrl ?? configuredBase(), demoMode, fixtures:root.VDOSProjectBreakdownFixtures });
    const narrativeRuntime = createNarrativeRuntime(store, params);
    const runtime = options.projectRuntime || root.VDOSProjectRuntime.createProjectRuntime({ projectStore:store, sceneRuntime:sceneAdapter(scene), narrativeRuntime, sequenceRuntime:createSequenceRuntime(scene), abortTransient:() => narrativeRuntime.abort() });
    const workspace = root.VDOSProjectWorkspace.initProjectWorkspace(rootNode, { projectStore:store, breakdownState, projectRuntime:runtime, apiClient });
    const context = { store, persistence, persistenceEnabled:persistence?.enabled !== false, persistenceLoadError:dependencyStatus?.persistence?.error || null, unbindPersistence, breakdownState, apiClient, runtime, workspace, demoMode, rootNode, sceneContextRoot };
    root.VDOSProjectContext = context;

    function syncSceneContext() { const loadedSceneId = runtime.getLoadedSceneId?.(); const project = store.getProject(); const html = loadedSceneId ? renderSceneContextBar(project, loadedSceneId) : ''; sceneContextRoot.innerHTML = html; sceneContextRoot.hidden = !html; }
    sceneContextRoot.addEventListener('click', async event => { const button = event.target.closest?.('[data-project-scene-nav]'); if (!button || button.disabled) return; const action = button.dataset.projectSceneNav; if (action === 'project') { workspace.showProject(); rootNode.scrollIntoView({behavior:'auto',block:'start'}); return; } const sceneId = button.dataset.sceneId; if (sceneId) { await runtime.switchScene(sceneId); syncSceneContext(); scrollToNarrative(); } });
    store.subscribe(syncSceneContext); runtime.subscribe(syncSceneContext);
    let sceneSyncChain = Promise.resolve();
    root.addEventListener('vdos:scene-state', event => { const source = String(event?.detail?.source || ''); const loadedSceneId = runtime.getLoadedSceneId?.(); if (!loadedSceneId) return; const persistenceMode = shouldPersistSceneEvent(source, runtime); if (!persistenceMode) return; sceneSyncChain = sceneSyncChain.then(async () => { await runtime.captureActiveScene(); if (persistenceMode === 'directed') runtime.markVisualDirected(loadedSceneId); else runtime.markVisualInProgress(loadedSceneId); }).catch(error => console.error(error)); });
    root.addEventListener('vdos:project-scene-open', event => { const sceneId = event?.detail?.sceneId; if (!store.getProject()?.scenes?.[sceneId]) return; syncSceneContext(); scrollToNarrative(); });
    return context;
  }

  function showBootstrapError(error) { console.error(error); const stage = document.querySelector('.stage'); if (!stage || document.querySelector('.project-bootstrap-error')) return; const message = document.createElement('p'); message.className = 'project-bootstrap-error'; message.setAttribute('role','alert'); message.dataset.error = String(error?.message || error || 'Unknown Project bootstrap error').slice(0,240); message.textContent = 'Project Workspace failed to initialize. Single-Scene Director remains available.'; stage.insertBefore(message, stage.firstChild); }
  function autoInit() { if (typeof document === 'undefined') return; initProjectShell().catch(showBootstrapError); }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',autoInit,{once:true}); else autoInit(); }

  return { deriveProjectApiBase, createInitialProjectInput, createNarrativeApiProxy, renderSceneContextBar, renderNarrativeProjectContext, shouldPersistSceneEvent, createNoopPersistence, loadOptionalPersistence, createPersistence, loadProjectDependencies, initProjectShell };
});