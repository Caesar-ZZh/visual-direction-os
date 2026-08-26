(function attachProjectPackageUi(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function projectPackageUiFactory(root) {
  'use strict';

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function defaultProjectId() {
    const uuid = root?.crypto?.randomUUID?.();
    return uuid ? `project-${uuid}` : `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  }

  function defaultArtifactId(oldId) {
    const uuid = root?.crypto?.randomUUID?.();
    return uuid ? `gen-${uuid}` : `gen-${String(oldId || 'artifact')}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  }

  function packageFilename(project) {
    const title = String(project?.title || 'Visual-Direction-Project')
      .trim()
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 120) || 'Visual-Direction-Project';
    return `${title}.vdos`;
  }

  async function toBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    if (input && typeof input.arrayBuffer === 'function') return new Uint8Array(await input.arrayBuffer());
    throw new Error('Import requires .vdos bytes or a File/Blob');
  }

  function memoryComparable(memory) {
    const source = memory && typeof memory === 'object' ? memory : {};
    return {
      pathHeadArtifactId:source.pathHeadArtifactId ?? source.pathArtifactIds?.at?.(-1) ?? null,
      pathArtifactIds:Array.isArray(source.pathArtifactIds) ? source.pathArtifactIds : [],
      locked:Array.isArray(source.locked) ? source.locked : [],
      active:Array.isArray(source.active) ? source.active : [],
      watch:Array.isArray(source.watch) ? source.watch : []
    };
  }

  function createCurrentDerivedReconciler({ compareArtifacts, deriveMemoryForPath } = {}) {
    return async function recomputeDerived({ artifacts = [], comparisons = [], memorySnapshot = null } = {}) {
      if (typeof compareArtifacts !== 'function' || typeof deriveMemoryForPath !== 'function') {
        return {
          comparisons:clone(comparisons),
          memory:clone(memorySnapshot || { pathArtifactIds:[], locked:[], active:[], watch:[] }),
          memoryReconciliation:'MEMORY VERIFIED'
        };
      }
      const byId = new Map((artifacts || []).map((artifact) => [artifact.id, artifact]));
      const currentComparisons = (comparisons || []).map((row) => {
        const a = byId.get(row.artifactAId);
        const b = byId.get(row.artifactBId);
        if (!a?.evaluation || !b?.evaluation) return clone(row);
        return {
          ...clone(row),
          comparison:compareArtifacts({ artifactA:a, artifactB:b, directorJudgments:clone(row.directorJudgments || {}) })
        };
      });
      const headId = memorySnapshot?.pathHeadArtifactId
        || memorySnapshot?.pathArtifactIds?.at?.(-1)
        || [...artifacts].sort((a,b) => (Number(a.generationIndex) || 0) - (Number(b.generationIndex) || 0)).at(-1)?.id
        || null;
      const semanticLocks = {};
      for (const row of currentComparisons) {
        if (row.artifactBId !== headId) continue;
        for (const [checkId, decision] of Object.entries(row.directorJudgments || {})) {
          if (decision?.state === 'improved') semanticLocks[checkId] = true;
        }
      }
      const currentMemory = headId
        ? deriveMemoryForPath({ artifacts, comparisons:currentComparisons, pathHeadId:headId, semanticLocks })
        : { pathArtifactIds:[], locked:[], active:[], watch:[] };
      const normalizedCurrent = memoryComparable({ ...currentMemory, pathHeadArtifactId:headId });
      const normalizedHistorical = memoryComparable(memorySnapshot);
      return {
        comparisons:currentComparisons,
        memory:{ ...clone(currentMemory), pathHeadArtifactId:headId },
        memoryReconciliation:JSON.stringify(normalizedCurrent) === JSON.stringify(normalizedHistorical)
          ? 'MEMORY VERIFIED'
          : 'MEMORY MIGRATED'
      };
    };
  }

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

  function createProjectPackageWorkspace({
    memory,
    library,
    m4,
    packageRuntime = {},
    migrator = null,
    makeProjectId = defaultProjectId,
    makeArtifactId = defaultArtifactId,
    recomputeDerived = null
  } = {}) {
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

    async function exportProject({ allowIncomplete = false } = {}) {
      for (const method of ['buildExportStage','buildExportReport','buildArchiveFiles','encodeVdos']) {
        if (typeof packageRuntime[method] !== 'function') throw new Error(`Project package export requires ${method}()`);
      }
      if (typeof m4.getExportSnapshot !== 'function') throw new Error('Project package export requires M4 export snapshot support');
      if (typeof memory.loadProjectBundle !== 'function') throw new Error('Project package export requires persisted project bundle access');

      const live = m4.getExportSnapshot();
      if (!live?.project?.id) throw new Error('No active project is available for export');
      const persisted = await memory.loadProjectBundle(live.project.id);
      const stage = await packageRuntime.buildExportStage({
        project:live.project,
        runtimeArtifacts:Array.isArray(live.artifacts) ? live.artifacts : [],
        persistedArtifacts:Array.isArray(persisted?.artifacts) ? persisted.artifacts : [],
        comparisons:Array.isArray(live.comparisons) ? live.comparisons : [],
        memorySnapshot:live.memorySnapshot || null
      });
      const report = packageRuntime.buildExportReport(stage);
      if (report.packageCompleteness === 'partial' && !allowIncomplete) {
        return { status:'preflight', report, stage };
      }
      const files = packageRuntime.buildArchiveFiles(stage);
      const bytes = await packageRuntime.encodeVdos({ files, manifestBase:stage.manifestBase });
      return {
        status:'exported',
        bytes,
        filename:packageFilename(live.project),
        report,
        stage
      };
    }

    async function importProject(input, { mode = 'copy', replaceProjectId = null } = {}) {
      for (const method of ['decodeVdos','stageImport','buildImportReport']) {
        if (typeof packageRuntime[method] !== 'function') throw new Error(`Project package import requires ${method}()`);
      }
      const activeMigrator = migrator
        || (typeof packageRuntime.createSchemaMigrator === 'function'
          ? packageRuntime.createSchemaMigrator({ currentVersion:packageRuntime.VDOS_SCHEMA_VERSION || 1, migrations:{} })
          : null);
      if (!activeMigrator) throw new Error('Project package import requires a schema migrator');
      const bytes = await toBytes(input);
      const decoded = await packageRuntime.decodeVdos(bytes);
      const projects = await library.list();
      const derived = recomputeDerived || createCurrentDerivedReconciler({
        compareArtifacts:packageRuntime.compareArtifacts,
        deriveMemoryForPath:packageRuntime.deriveMemoryForPath
      });
      const selectedMode = String(mode || 'copy').toLowerCase();
      const staged = await packageRuntime.stageImport({
        decoded,
        migrator:activeMigrator,
        existingProjectIds:new Set(projects.map((project) => project.id)),
        mode:selectedMode,
        makeProjectId,
        makeArtifactId,
        recomputeDerived:derived
      });
      const report = packageRuntime.buildImportReport(staged);
      const committed = await commitStagedProject({
        memory,
        library,
        m4,
        staged,
        mode:selectedMode,
        replaceProjectId
      });
      return { status:'imported', staged, report, commit:committed.commit, activeProjectId:committed.activeProjectId };
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

  return {
    commitStagedProject,
    createCurrentDerivedReconciler,
    createProjectPackageWorkspace
  };
});
