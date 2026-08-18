((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const asAsync = value => Promise.resolve(value);

  function createProjectRuntime({
    projectStore,
    sceneRuntime,
    narrativeRuntime = null,
    sequenceRuntime = null,
    abortTransient = null
  } = {}) {
    if (!projectStore || typeof projectStore.getProject !== 'function' || typeof projectStore.saveSceneSnapshot !== 'function' || typeof projectStore.setActiveScene !== 'function') {
      throw new Error('Project Runtime requires a Project Store.');
    }
    if (!sceneRuntime || typeof sceneRuntime.getState !== 'function' || typeof sceneRuntime.restore !== 'function') {
      throw new Error('Project Runtime requires a Scene runtime adapter.');
    }

    const listeners = new Set();
    let switchChain = Promise.resolve();
    let switchToken = 0;

    function notify(source) {
      const project = projectStore.getProject();
      const scene = project?.activeSceneId ? project.scenes?.[project.activeSceneId] || null : null;
      const detail = clone({ projectId:project?.id || null, activeSceneId:project?.activeSceneId || null, scene });
      listeners.forEach(listener => listener(detail, source));
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      notify('subscribe');
      return () => listeners.delete(listener);
    }

    function readAdapter(adapter) {
      return adapter && typeof adapter.getState === 'function' ? clone(adapter.getState()) : null;
    }

    async function captureActiveScene() {
      const project = projectStore.getProject();
      const activeSceneId = project?.activeSceneId;
      if (!activeSceneId || !project.scenes?.[activeSceneId]) return null;
      const snapshot = {
        sceneState: readAdapter(sceneRuntime),
        narrativeState: readAdapter(narrativeRuntime),
        sequenceState: readAdapter(sequenceRuntime)
      };
      projectStore.saveSceneSnapshot(activeSceneId, snapshot);
      notify('scene:capture');
      return clone(snapshot);
    }

    async function restoreAdapter(adapter, value) {
      if (!adapter || typeof adapter.restore !== 'function') return;
      await asAsync(adapter.restore(clone(value)));
    }

    function switchScene(sceneId) {
      const token = ++switchToken;
      const run = async () => {
        const before = projectStore.getProject();
        if (!before?.scenes?.[sceneId]) throw new Error(`Unknown Scene: ${sceneId}`);
        if (before.activeSceneId === sceneId) return clone(before.scenes[sceneId]);

        await captureActiveScene();
        if (typeof abortTransient === 'function') await asAsync(abortTransient());

        projectStore.setActiveScene(sceneId);
        const project = projectStore.getProject();
        const target = project.scenes[sceneId];
        const workspace = clone(target.workspace || {});
        await restoreAdapter(sceneRuntime, workspace.sceneState);
        await restoreAdapter(narrativeRuntime, workspace.narrativeState);
        await restoreAdapter(sequenceRuntime, workspace.sequenceState);
        notify(`scene:switch:${token}`);
        return clone(target);
      };
      const result = switchChain.then(run, run);
      switchChain = result.catch(() => {});
      return result;
    }

    function markVisualDirected(sceneId = null) {
      const project = projectStore.getProject();
      const targetId = sceneId || project?.activeSceneId;
      if (!targetId || !project?.scenes?.[targetId]) throw new Error(`Unknown Scene: ${targetId}`);
      projectStore.updateScene(targetId, { status:{ visual:'directed' } });
      notify('scene:directed');
      return clone(projectStore.getProject().scenes[targetId]);
    }

    function markVisualInProgress(sceneId = null) {
      const project = projectStore.getProject();
      const targetId = sceneId || project?.activeSceneId;
      if (!targetId || !project?.scenes?.[targetId]) throw new Error(`Unknown Scene: ${targetId}`);
      const current = project.scenes[targetId].status?.visual;
      if (current !== 'directed') projectStore.updateScene(targetId, { status:{ visual:'in-progress' } });
      notify('scene:in-progress');
      return clone(projectStore.getProject().scenes[targetId]);
    }

    return { captureActiveScene, switchScene, markVisualDirected, markVisualInProgress, subscribe };
  }

  return { createProjectRuntime };
});
