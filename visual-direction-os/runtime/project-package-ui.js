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

  return { commitStagedProject };
});
