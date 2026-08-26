(function attachProjectPackageUi(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function projectPackageUiFactory() {
  'use strict';

  async function commitStagedProject({
    memory,
    library,
    m4,
    staged,
    mode = 'copy',
    replaceProjectId = null
  } = {}) {
    if (!memory || typeof memory.commitProjectBundle !== 'function') throw new Error('Import commit requires Director Memory atomic bundle support');
    if (!library || typeof library.open !== 'function') throw new Error('Import commit requires Project Library activation');
    if (!m4 || typeof m4.openProject !== 'function') throw new Error('Import commit requires M4 project switching');
    if (!staged?.project?.id || !Array.isArray(staged?.artifacts) || !Array.isArray(staged?.comparisons)) {
      throw new Error('Import commit requires a complete staged project');
    }
    const selectedMode = String(mode || 'copy').toLowerCase();
    if (!['copy','replace'].includes(selectedMode)) throw new Error(`Unsupported import commit mode: ${mode}`);

    const commit = await memory.commitProjectBundle({
      mode:selectedMode,
      project:staged.project,
      artifacts:staged.artifacts,
      comparisons:staged.comparisons,
      replaceProjectId:selectedMode === 'replace' ? (replaceProjectId || staged.project.id) : null
    });

    await library.open(staged.project.id);
    await m4.openProject(staged.project.id);
    return {
      project:staged.project,
      commit,
      activeProjectId:staged.project.id
    };
  }

  function createProjectPackageWorkspace({ memory, library, m4, packageRuntime = {} } = {}) {
    if (!memory) throw new Error('Project package workspace requires Director Memory');
    if (!library) throw new Error('Project package workspace requires Project Library');
    if (!m4 || typeof m4.openProject !== 'function') throw new Error('Project package workspace requires M4 project switching');
    for (const method of ['list','open','newProject','rename','delete','getActiveProjectId']) {
      if (typeof library[method] !== 'function') throw new Error(`Project package workspace requires library.${method}()`);
    }

    async function list() {
      return library.list();
    }

    async function open(projectId) {
      const id = String(projectId || '').trim();
      if (!id) throw new Error('Project ID is required');
      await m4.openProject(id);
      return library.open(id);
    }

    async function newProject(title) {
      const project = await library.newProject(title);
      await m4.openProject(project.id);
      return project;
    }

    async function rename(projectId, title) {
      const project = await library.rename(projectId, title);
      if (library.getActiveProjectId() === project.id) await m4.openProject(project.id);
      return project;
    }

    async function deleteProject(projectId) {
      const id = String(projectId || '').trim();
      const wasActive = library.getActiveProjectId() === id;
      const result = await library.delete(id);
      if (wasActive && result?.activeProject?.id) await m4.openProject(result.activeProject.id);
      return result;
    }

    async function exportProject() {
      if (typeof packageRuntime.exportProject === 'function') return packageRuntime.exportProject();
      throw new Error('Project package export is not configured');
    }

    async function importProject() {
      if (typeof packageRuntime.importProject === 'function') return packageRuntime.importProject();
      throw new Error('Project package import is not configured');
    }

    return {
      list,
      open,
      new:newProject,
      rename,
      delete:deleteProject,
      export:exportProject,
      import:importProject
    };
  }

  return { commitStagedProject, createProjectPackageWorkspace };
});
