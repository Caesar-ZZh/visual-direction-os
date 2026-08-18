((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectBootstrap = api;
})(typeof window !== 'undefined' ? window : globalThis, root => {
  'use strict';

  const VERSION = '20260818-1308';
  const DEMO_STORY = 'A young employee enters a routine assignment meeting expecting to comply. During the conversation, he realizes the assignment itself is a mechanism of control. Recognition turns into explicit refusal, and he leaves the institution acting from self-authored agency.';

  function deriveProjectApiBase(narrativeBase = '') {
    const base = String(narrativeBase || '').trim().replace(/\/+$/, '');
    return base.replace(/\/api\/narrative$/i, '');
  }

  function createInitialProjectInput(demoMode = false) {
    return {
      id:'project-untitled',
      title:'Untitled Film',
      projectIntent:demoMode ? 'End with the character reclaiming agency.' : '',
      sourceNarrative:demoMode ? DEMO_STORY : ''
    };
  }

  function loadStyle(href) {
    if (typeof document === 'undefined') return Promise.resolve();
    if ([...document.styleSheets].some(sheet => sheet.href && sheet.href.includes(href.split('?')[0]))) return Promise.resolve();
    return new Promise((resolve,reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = href; link.onload = resolve;
      link.onerror = () => reject(new Error(`Failed to load ${href}`));
      document.head.appendChild(link);
    });
  }

  function loadScript(src, globalName) {
    if (root?.[globalName]) return Promise.resolve(root[globalName]);
    if (typeof document === 'undefined') return Promise.reject(new Error(`Cannot load ${src} without a document.`));
    return new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => root?.[globalName] ? resolve(root[globalName]) : reject(new Error(`${globalName} unavailable after ${src}`));
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadProjectDependencies() {
    await Promise.all([
      loadStyle(`project-workspace.css?v=${VERSION}`),
      loadScript(`project-contracts.js?v=${VERSION}`, 'VDOSProjectContracts')
    ]);
    await Promise.all([
      loadScript(`project-state.js?v=${VERSION}`, 'VDOSProjectState'),
      loadScript(`project-breakdown-state.js?v=${VERSION}`, 'VDOSProjectBreakdownState'),
      loadScript(`project-breakdown-api-client.js?v=${VERSION}`, 'VDOSProjectBreakdownApiClient'),
      loadScript(`project-breakdown-fixtures.js?v=${VERSION}`, 'VDOSProjectBreakdownFixtures'),
      loadScript(`project-arc.js?v=${VERSION}`, 'VDOSProjectArc')
    ]);
    await Promise.all([
      loadScript(`project-runtime.js?v=${VERSION}`, 'VDOSProjectRuntime'),
      loadScript(`project-continuity.js?v=${VERSION}`, 'VDOSProjectContinuity')
    ]);
    await loadScript(`project-workspace.js?v=${VERSION}`, 'VDOSProjectWorkspace');
  }

  function ensureRoot() {
    let projectRoot = document.querySelector('#project-workspace-root');
    if (projectRoot) return projectRoot;
    const stage = document.querySelector('.stage');
    const first = document.querySelector('#learn-panel');
    if (!stage || !first) throw new Error('Director stage is unavailable for Project Workspace.');
    projectRoot = document.createElement('section');
    projectRoot.id = 'project-workspace-root';
    projectRoot.className = 'project-workspace-root';
    projectRoot.setAttribute('aria-label','Project workspace');
    stage.insertBefore(projectRoot, first);
    return projectRoot;
  }

  function sceneAdapter(scene) {
    return {
      getState:() => scene.getSceneState(),
      restore(snapshot) {
        const currentMode = scene.getSceneState?.()?.mode || 'narrative';
        return scene.createSceneState(snapshot || { mode:currentMode });
      }
    };
  }

  function configuredBase() {
    const explicit = document.querySelector('meta[name="vdos-project-api-base"]')?.content?.trim() || '';
    if (explicit) return String(explicit).replace(/\/+$/,'');
    const narrative = document.querySelector('meta[name="vdos-narrative-api-base"]')?.content?.trim() || '';
    return deriveProjectApiBase(narrative);
  }

  async function initProjectShell(options = {}) {
    await loadProjectDependencies();
    if (root.VDOSProjectContext) return root.VDOSProjectContext;
    const scene = options.scene || root.VDOSScene;
    if (!scene) throw new Error('VDOSScene is required before Project Bootstrap.');
    const params = new URLSearchParams(root.location?.search || '');
    const demoMode = options.demoMode ?? params.get('projectDemo') === '1';
    const rootNode = options.rootNode || ensureRoot();
    const store = options.projectStore || root.VDOSProjectState.createProjectStore();
    if (!store.getProject()) store.createProject(createInitialProjectInput(demoMode));
    const breakdownState = options.breakdownState || root.VDOSProjectBreakdownState.createProjectBreakdownState();
    const apiClient = options.apiClient || root.VDOSProjectBreakdownApiClient.createProjectBreakdownApiClient({
      baseUrl:options.baseUrl ?? configuredBase(),
      demoMode,
      fixtures:root.VDOSProjectBreakdownFixtures
    });
    const runtime = options.projectRuntime || root.VDOSProjectRuntime.createProjectRuntime({
      projectStore:store,
      sceneRuntime:sceneAdapter(scene),
      abortTransient:() => root.VDOSNarrativeWorkspaceController?.abortAll?.()
    });
    const workspace = root.VDOSProjectWorkspace.initProjectWorkspace(rootNode, {
      projectStore:store,
      breakdownState,
      projectRuntime:runtime,
      apiClient
    });
    const context = { store, breakdownState, apiClient, runtime, workspace, demoMode, rootNode };
    root.VDOSProjectContext = context;

    root.addEventListener('vdos:project-scene-open', event => {
      const sceneId = event?.detail?.sceneId;
      const record = store.getProject()?.scenes?.[sceneId];
      if (!record) return;
      const narrativeButton = document.querySelector('[data-mode="narrative"]');
      if (narrativeButton) narrativeButton.click();
      const target = document.querySelector('#narrative-panel');
      if (target) target.scrollIntoView({ behavior:'auto', block:'start' });
    });
    return context;
  }

  function showBootstrapError(error) {
    console.error(error);
    const stage = document.querySelector('.stage');
    if (!stage || document.querySelector('.project-bootstrap-error')) return;
    const message = document.createElement('p');
    message.className = 'project-bootstrap-error';
    message.setAttribute('role','alert');
    message.textContent = 'Project Workspace failed to initialize. Single-Scene Director remains available.';
    stage.insertBefore(message, stage.firstChild);
  }

  function autoInit() {
    if (typeof document === 'undefined') return;
    initProjectShell().catch(showBootstrapError);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',autoInit,{once:true});
    else autoInit();
  }

  return { deriveProjectApiBase, createInitialProjectInput, loadProjectDependencies, initProjectShell };
});
