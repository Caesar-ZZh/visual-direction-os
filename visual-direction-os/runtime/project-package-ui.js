(function attachProjectPackageUi(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
    if (root.document && typeof api.mountProjectPackageUi === 'function') {
      Promise.resolve().then(() => api.mountProjectPackageUi(root)).catch((error) => {
        console.error('[Visual Direction OS M5] Project workspace mount failed:', error);
      });
    }
  }
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

    async function list() { return library.list(); }

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
      return { status:'exported', bytes, filename:packageFilename(live.project), report, stage };
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

  function scrubMessage(value) {
    return String(value || 'Operation failed')
      .replace(/Bearer\s+\S+/ig, 'Bearer [redacted]')
      .replace(/((?:api[-_ ]?key|token|secret|cookie|authorization)\s*[:=]\s*)[^\s,;]+/ig, '$1[redacted]')
      .slice(0, 420);
  }

  function reportLines(report = {}) {
    const lines = [];
    if (report.packageCompleteness) lines.push(`Package: ${report.packageCompleteness}`);
    if (report.recoveryStatus) lines.push(`Recovery: ${report.recoveryStatus}`);
    if (report.memoryReconciliation) lines.push(report.memoryReconciliation);
    if (Array.isArray(report.migrations) && report.migrations.length) lines.push(`Migrations: ${report.migrations.join(', ')}`);
    if (Array.isArray(report.missingAssets) && report.missingAssets.length) lines.push(`Missing assets: ${report.missingAssets.length}`);
    if (Array.isArray(report.assetErrors) && report.assetErrors.length) lines.push(`Recovered asset errors: ${report.assetErrors.length}`);
    return lines;
  }

  function downloadVdos(browserRoot, result) {
    const blob = new Blob([result.bytes], { type:'application/zip' });
    const url = browserRoot.URL.createObjectURL(blob);
    const anchor = browserRoot.document.createElement('a');
    anchor.href = url;
    anchor.download = result.filename;
    anchor.hidden = true;
    browserRoot.document.body.append(anchor);
    anchor.click();
    anchor.remove();
    browserRoot.setTimeout(() => browserRoot.URL.revokeObjectURL(url), 0);
  }

  async function mountProjectPackageUi(browserRoot = root) {
    const runtime = browserRoot?.VisualDirectionRuntime || {};
    const m4 = browserRoot?.VisualDirectionOS?.m4;
    if (!browserRoot?.document || !m4) throw new Error('Project Package UI requires the browser M4 runtime');
    for (const method of ['createIndexedDbStore','createDirectorMemory','createProjectLibrary','createSchemaMigrator']) {
      if (typeof runtime[method] !== 'function') throw new Error(`Project Package UI requires ${method}()`);
    }

    const memory = runtime.createDirectorMemory({ store:runtime.createIndexedDbStore(browserRoot) });
    const library = runtime.createProjectLibrary({ memory, preferences:browserRoot.localStorage });
    await library.boot();
    const migrator = runtime.createSchemaMigrator({ currentVersion:runtime.VDOS_SCHEMA_VERSION || 1, migrations:{} });
    const workspace = createProjectPackageWorkspace({
      memory,
      library,
      m4,
      packageRuntime:runtime,
      migrator,
      recomputeDerived:createCurrentDerivedReconciler({
        compareArtifacts:runtime.compareArtifacts,
        deriveMemoryForPath:runtime.deriveMemoryForPath
      })
    });
    browserRoot.VisualDirectionOS = Object.assign(browserRoot.VisualDirectionOS || {}, { projects:workspace });

    const rail = browserRoot.document.querySelector('.system-rail');
    if (!rail) return workspace;
    const existing = rail.querySelector('.vdos-project-panel');
    if (existing) existing.remove();

    const panel = browserRoot.document.createElement('section');
    panel.className = 'vdos-project-panel';
    panel.setAttribute('aria-label', 'Project package workspace');
    panel.innerHTML = `
      <div class="vdos-project-kicker">PROJECT</div>
      <button type="button" class="vdos-project-current" data-project-action="open" aria-label="Open project"><span>Untitled Director Project</span><b>▾</b></button>
      <div class="vdos-project-actions">
        <button type="button" data-project-action="new">New Project</button>
        <button type="button" data-project-action="open">Open</button>
        <button type="button" data-project-action="rename">Rename</button>
        <button type="button" data-project-action="export">Export .vdos</button>
        <button type="button" data-project-action="import">Import .vdos</button>
        <button type="button" data-project-action="delete" class="is-destructive">Delete Project</button>
      </div>
      <input class="vdos-project-file" type="file" accept=".vdos,application/zip" hidden>
      <div class="vdos-project-report" role="status" aria-live="polite" hidden></div>
      <div class="vdos-project-dialog" role="dialog" aria-modal="true" aria-labelledby="vdos-project-dialog-title" hidden>
        <div class="vdos-project-dialog-card">
          <h3 id="vdos-project-dialog-title"></h3>
          <p></p>
          <div class="vdos-project-dialog-actions"></div>
        </div>
      </div>`;
    const railStatus = rail.querySelector('.rail-status');
    if (railStatus) railStatus.after(panel);
    else rail.prepend(panel);

    const titleNode = panel.querySelector('.vdos-project-current span');
    const reportNode = panel.querySelector('.vdos-project-report');
    const fileInput = panel.querySelector('.vdos-project-file');
    const dialog = panel.querySelector('.vdos-project-dialog');
    const dialogTitle = dialog.querySelector('h3');
    const dialogBody = dialog.querySelector('p');
    const dialogActions = dialog.querySelector('.vdos-project-dialog-actions');

    async function refresh() {
      const projects = await workspace.list();
      const activeId = library.getActiveProjectId();
      const active = projects.find((project) => project.id === activeId) || null;
      titleNode.textContent = active?.title || 'Untitled Director Project';
      return { projects, active };
    }

    function showReport(report, heading = '') {
      const lines = reportLines(report);
      reportNode.hidden = false;
      reportNode.textContent = [heading, ...lines].filter(Boolean).join(' · ');
    }

    function showError(error) {
      reportNode.hidden = false;
      reportNode.textContent = scrubMessage(error?.message || error);
    }

    function decision(title, body, actions) {
      return new Promise((resolve) => {
        dialogTitle.textContent = title;
        dialogBody.textContent = body;
        dialogActions.replaceChildren();
        dialog.hidden = false;
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          dialog.hidden = true;
          resolve(value);
        };
        for (const action of actions) {
          const button = browserRoot.document.createElement('button');
          button.type = 'button';
          button.textContent = action.label;
          if (action.kind) button.className = action.kind;
          if (action.autofocus) button.autofocus = true;
          button.addEventListener('click', () => finish(action.value));
          dialogActions.append(button);
        }
      });
    }

    async function chooseProject() {
      const { projects, active } = await refresh();
      const options = projects.map((project, index) => `${index + 1}. ${project.title}${project.id === active?.id ? ' (active)' : ''}`).join('\n');
      const answer = browserRoot.prompt(`Open project:\n${options}\n\nEnter number or project ID`, active?.id || '');
      if (answer == null) return;
      const trimmed = String(answer).trim();
      const index = Number(trimmed);
      const selected = Number.isInteger(index) && index >= 1 && index <= projects.length ? projects[index - 1] : projects.find((project) => project.id === trimmed);
      if (!selected) throw new Error('Project not found');
      await workspace.open(selected.id);
      await refresh();
    }

    async function exportActive() {
      const result = await workspace.export();
      if (result.status === 'preflight') {
        showReport(result.report, 'Export Preflight');
        const choice = await decision(
          'Export Preflight',
          `${result.report.missingAssets?.length || 0} asset issue(s) were found. Cancel keeps the package from being exported.`,
          [
            { label:'Cancel', value:'cancel', autofocus:true },
            { label:'Export Incomplete Package', value:'export', kind:'is-destructive' }
          ]
        );
        if (choice !== 'export') return;
        const incomplete = await workspace.export({ allowIncomplete:true });
        downloadVdos(browserRoot, incomplete);
        showReport(incomplete.report, 'Incomplete package exported');
        return;
      }
      downloadVdos(browserRoot, result);
      showReport(result.report, 'Package exported');
    }

    async function importBytes(file) {
      const bytes = await toBytes(file);
      const decoded = await runtime.decodeVdos(bytes);
      const sourceProjectId = decoded?.manifest?.project?.id || null;
      const projects = await workspace.list();
      const conflict = sourceProjectId && projects.some((project) => project.id === sourceProjectId);
      let mode = 'copy';
      if (conflict) {
        mode = await decision(
          'Project already exists',
          'Import as Copy is the default. Replace Existing is destructive and only runs after staging succeeds.',
          [
            { label:'Import as Copy', value:'copy', autofocus:true },
            { label:'Replace Existing', value:'replace', kind:'is-destructive' },
            { label:'Cancel', value:'cancel' }
          ]
        );
        if (mode === 'cancel') return;
      }
      const result = await workspace.import(bytes, {
        mode,
        replaceProjectId:mode === 'replace' ? sourceProjectId : null
      });
      await refresh();
      showReport(result.report, 'Import Report');
    }

    async function run(action) {
      try { await action(); }
      catch (error) { console.error('[Visual Direction OS M5]', error); showError(error); }
    }

    panel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-project-action]');
      if (!button) return;
      const action = button.dataset.projectAction;
      if (action === 'open') return void run(chooseProject);
      if (action === 'new') return void run(async () => {
        const title = browserRoot.prompt('New Project name', 'Untitled Director Project');
        if (title == null) return;
        await workspace.new(title);
        await refresh();
      });
      if (action === 'rename') return void run(async () => {
        const { active } = await refresh();
        if (!active) return;
        const title = browserRoot.prompt('Rename Project', active.title);
        if (title == null) return;
        await workspace.rename(active.id, title);
        await refresh();
      });
      if (action === 'export') return void run(exportActive);
      if (action === 'import') return void fileInput.click();
      if (action === 'delete') return void run(async () => {
        const { active } = await refresh();
        if (!active) return;
        if (!browserRoot.confirm(`Delete project “${active.title}”? This removes its local project data.`)) return;
        await workspace.delete(active.id);
        await refresh();
      });
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void run(() => importBytes(file));
    });

    await refresh();
    return workspace;
  }

  return {
    commitStagedProject,
    createCurrentDerivedReconciler,
    createProjectPackageWorkspace,
    mountProjectPackageUi
  };
});
