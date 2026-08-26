const assert = require('node:assert/strict');
const { createProjectLibrary, ACTIVE_PROJECT_KEY } = require('./project-library.js');
const { commitStagedProject, createProjectPackageWorkspace } = require('./project-package-ui.js');

function createPreferences(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key){ return values.has(key) ? values.get(key) : null; },
    setItem(key, value){ values.set(key, String(value)); },
    removeItem(key){ values.delete(key); },
    snapshot(){ return Object.fromEntries(values); }
  };
}

function createMemory(seed = []) {
  const projects = new Map(seed.map((project) => [project.id, structuredClone(project)]));
  let commitError = null;
  return {
    projects,
    setCommitError(error){ commitError = error || null; },
    async listProjects(){
      return [...projects.values()]
        .map((row) => structuredClone(row))
        .sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || String(a.id).localeCompare(String(b.id)));
    },
    async getProject(id){ return projects.has(id) ? structuredClone(projects.get(id)) : null; },
    async getLatestProject(){ return (await this.listProjects())[0] || null; },
    async ensureProject(input = {}){
      const now = input.updatedAt || '2026-08-26T00:00:00Z';
      const project = {
        id:input.id,
        title:input.title || 'Untitled Director Project',
        createdAt:input.createdAt || now,
        updatedAt:now
      };
      projects.set(project.id, structuredClone(project));
      return structuredClone(project);
    },
    async putProject(project){ projects.set(project.id, structuredClone(project)); return structuredClone(project); },
    async clearProject(id){ projects.delete(id); },
    async commitProjectBundle({ project, artifacts = [], comparisons = [] } = {}) {
      if (commitError) throw commitError;
      projects.set(project.id, structuredClone(project));
      return { project:structuredClone(project), artifactCount:artifacts.length, comparisonCount:comparisons.length };
    }
  };
}

(async () => {
  assert.equal(ACTIVE_PROJECT_KEY, 'vdos-active-project-id');

  const seed = [
    { id:'project-old', title:'Old', createdAt:'2026-08-25T00:00:00Z', updatedAt:'2026-08-25T01:00:00Z' },
    { id:'project-b', title:'B', createdAt:'2026-08-25T00:00:00Z', updatedAt:'2026-08-25T02:00:00Z' }
  ];
  const memory = createMemory(seed);
  const preferences = createPreferences({ [ACTIVE_PROJECT_KEY]:'project-old' });
  let nextId = 0;
  const library = createProjectLibrary({
    memory,
    preferences,
    now:() => '2026-08-26T00:00:00Z',
    makeId:() => `project-new-${++nextId}`
  });

  const boot = await library.boot();
  assert.equal(boot.activeProject.id, 'project-old', 'explicit active project must beat a newer updatedAt project');
  assert.deepEqual(boot.projects.map((row) => row.id), ['project-b','project-old']);

  await library.open('project-b');
  assert.equal(library.getActiveProjectId(), 'project-b');
  assert.equal(preferences.getItem(ACTIVE_PROJECT_KEY), 'project-b');

  await memory.putProject({ id:'project-c', title:'Touched', createdAt:'2026-08-25T00:00:00Z', updatedAt:'2099-01-01T00:00:00Z' });
  assert.equal((await library.boot()).activeProject.id, 'project-b');

  const renamed = await library.rename('project-c', '  Study C  ');
  assert.equal(renamed.title, 'Study C');
  assert.equal(renamed.updatedAt, '2026-08-26T00:00:00Z');
  assert.equal(library.getActiveProjectId(), 'project-b', 'rename must not change active project');
  await assert.rejects(() => library.rename('missing', 'Nope'), /not found/i);

  const created = await library.newProject('  New Visual Study  ');
  assert.equal(created.id, 'project-new-1');
  assert.equal(created.title, 'New Visual Study');
  assert.equal(library.getActiveProjectId(), 'project-new-1');
  assert.equal(preferences.getItem(ACTIVE_PROJECT_KEY), 'project-new-1');

  await assert.rejects(() => library.open('missing'), /not found/i);
  assert.equal(library.getActiveProjectId(), 'project-new-1', 'failed open must preserve active identity');

  const afterDelete = await library.delete('project-new-1');
  assert.equal(afterDelete.deletedProjectId, 'project-new-1');
  assert.equal(afterDelete.activeProject.id, 'project-c', 'deleting active project should choose latest remaining project');
  assert.equal(preferences.getItem(ACTIVE_PROJECT_KEY), 'project-c');

  await library.delete('project-old');
  assert.equal(library.getActiveProjectId(), 'project-c');

  preferences.setItem(ACTIVE_PROJECT_KEY, 'stale-project');
  const staleBoot = await library.boot();
  assert.equal(staleBoot.activeProject.id, 'project-c');
  assert.equal(preferences.getItem(ACTIVE_PROJECT_KEY), 'project-c');

  const emptyMemory = createMemory();
  const emptyPreferences = createPreferences();
  const emptyLibrary = createProjectLibrary({
    memory:emptyMemory,
    preferences:emptyPreferences,
    now:() => '2026-08-26T03:00:00Z',
    makeId:() => 'project-empty'
  });
  const emptyBoot = await emptyLibrary.boot();
  assert.equal(emptyBoot.activeProject.id, 'project-empty');
  assert.equal(emptyBoot.activeProject.title, 'Untitled Director Project');
  assert.equal(emptyPreferences.getItem(ACTIVE_PROJECT_KEY), 'project-empty');

  const replacement = await emptyLibrary.delete('project-empty');
  assert.equal(replacement.activeProject.title, 'Untitled Director Project');
  assert.notEqual(replacement.activeProject.id, 'project-empty');
  assert.equal(emptyPreferences.getItem(ACTIVE_PROJECT_KEY), replacement.activeProject.id);

  const importMemory = createMemory([
    { id:'project-current', title:'Current', createdAt:'2026-08-26T00:00:00Z', updatedAt:'2026-08-26T00:00:00Z' }
  ]);
  const importPreferences = createPreferences({ [ACTIVE_PROJECT_KEY]:'project-current' });
  const importLibrary = createProjectLibrary({
    memory:importMemory,
    preferences:importPreferences,
    now:() => '2026-08-26T04:00:00Z',
    makeId:() => 'project-generated'
  });
  await importLibrary.boot();
  const opened = [];
  const m4 = { async openProject(id){ opened.push(id); return { project:{id} }; } };
  const staged = {
    project:{ id:'project-imported', title:'Imported', createdAt:'2026-08-25T00:00:00Z', updatedAt:'2026-08-26T04:00:00Z' },
    artifacts:[], comparisons:[]
  };

  importMemory.setCommitError(new Error('forced import commit failure'));
  await assert.rejects(() => commitStagedProject({
    memory:importMemory,
    library:importLibrary,
    m4,
    staged,
    mode:'copy'
  }), /commit failure/i);
  assert.equal(importPreferences.getItem(ACTIVE_PROJECT_KEY), 'project-current', 'failed import commit must preserve active project preference');
  assert.deepEqual(opened, [], 'failed import commit must not switch M4 runtime');

  importMemory.setCommitError(null);
  await commitStagedProject({ memory:importMemory, library:importLibrary, m4, staged, mode:'copy' });
  assert.equal(importPreferences.getItem(ACTIVE_PROJECT_KEY), 'project-imported', 'active project changes only after successful import commit');
  assert.deepEqual(opened, ['project-imported']);

  const workspaceMemory = createMemory([
    { id:'workspace-a', title:'Workspace A', createdAt:'2026-08-26T00:00:00Z', updatedAt:'2026-08-26T00:00:00Z' }
  ]);
  const workspacePreferences = createPreferences({ [ACTIVE_PROJECT_KEY]:'workspace-a' });
  let workspaceId = 0;
  const workspaceLibrary = createProjectLibrary({
    memory:workspaceMemory,
    preferences:workspacePreferences,
    now:() => '2026-08-26T05:00:00Z',
    makeId:() => `workspace-new-${++workspaceId}`
  });
  await workspaceLibrary.boot();
  const workspaceOpened = [];
  const workspaceM4 = {
    async openProject(id){ workspaceOpened.push(id); return {project:{id}}; },
    getExportSnapshot(){ return {project:{id:workspaceLibrary.getActiveProjectId()},artifacts:[],comparisons:[],memorySnapshot:{locked:[],active:[],watch:[]}}; }
  };
  const workspace = createProjectPackageWorkspace({
    memory:workspaceMemory,
    library:workspaceLibrary,
    m4:workspaceM4,
    packageRuntime:{}
  });
  for (const method of ['list','open','new','rename','delete','export','import']) {
    assert.equal(typeof workspace[method], 'function', `workspace must expose ${method}()`);
  }
  assert.deepEqual((await workspace.list()).map((row) => row.id), ['workspace-a']);
  await workspace.open('workspace-a');
  assert.equal(workspacePreferences.getItem(ACTIVE_PROJECT_KEY), 'workspace-a');
  const workspaceCreated = await workspace.new('Workspace New');
  assert.equal(workspaceCreated.id, 'workspace-new-1');
  assert.equal(workspacePreferences.getItem(ACTIVE_PROJECT_KEY), 'workspace-new-1');
  assert.deepEqual(workspaceOpened.slice(-2), ['workspace-a','workspace-new-1']);
  const workspaceRenamed = await workspace.rename('workspace-new-1', 'Workspace Renamed');
  assert.equal(workspaceRenamed.title, 'Workspace Renamed');
  assert.equal(workspaceOpened.at(-1), 'workspace-new-1', 'renaming active project must refresh M4 project metadata');
  const workspaceDeleted = await workspace.delete('workspace-new-1');
  assert.equal(workspaceDeleted.activeProject.id, 'workspace-a');
  assert.equal(workspacePreferences.getItem(ACTIVE_PROJECT_KEY), 'workspace-a');
  assert.equal(workspaceOpened.at(-1), 'workspace-a', 'deleting active project must open the library fallback');

  // Portable export/import orchestration: live runtime + persisted bytes -> preflight -> archive; import defaults to Copy.
  const portableMemory = createMemory([
    { id:'portable-a', title:'Portable / A', createdAt:'2026-08-26T00:00:00Z', updatedAt:'2026-08-26T05:00:00Z' }
  ]);
  portableMemory.loadProjectBundle = async (projectId) => ({
    project:{id:projectId,title:'Portable / A'},
    artifacts:[{id:'g1',projectId,imageBlob:new Blob(['persisted'],{type:'image/png'})}],
    comparisons:[{id:'g1::g2',projectId,artifactAId:'g1',artifactBId:'g2'}]
  });
  const portablePreferences = createPreferences({ [ACTIVE_PROJECT_KEY]:'portable-a' });
  const portableLibrary = createProjectLibrary({
    memory:portableMemory,
    preferences:portablePreferences,
    now:() => '2026-08-26T06:00:00Z',
    makeId:() => 'portable-copy'
  });
  await portableLibrary.boot();
  const portableOpened = [];
  const portableM4 = {
    getExportSnapshot(){
      return {
        project:{id:'portable-a',title:'Portable / A'},
        artifacts:[{id:'g1',projectId:'portable-a',persistenceStatus:'persisted'}],
        comparisons:[{id:'g1::g2',projectId:'portable-a',artifactAId:'g1',artifactBId:'g2'}],
        memorySnapshot:{pathHeadArtifactId:'g1',locked:[],active:[],watch:[]}
      };
    },
    async openProject(id){ portableOpened.push(id); return {project:{id}}; }
  };
  const packageCalls = [];
  let completeness = 'complete';
  let encodedCount = 0;
  const portablePackageRuntime = {
    buildExportStage:async (input) => {
      packageCalls.push(['buildExportStage', input]);
      return {project:input.project,artifacts:input.runtimeArtifacts,comparisons:{comparisons:input.comparisons},memory:input.memorySnapshot,lineage:{roots:[],nodes:[]},imageAssets:[],referenceAssets:[],manifestBase:{format:'vdos-project'},packageCompleteness:completeness,missingAssets:completeness === 'partial' ? [{code:'meta_only'}] : []};
    },
    buildExportReport:(stage) => ({packageCompleteness:stage.packageCompleteness,missingAssets:stage.missingAssets}),
    buildArchiveFiles:(stage) => { packageCalls.push(['buildArchiveFiles', stage]); return [{path:'project.json',role:'core',bytes:Uint8Array.of(1)}]; },
    encodeVdos:async ({files,manifestBase}) => { encodedCount += 1; packageCalls.push(['encodeVdos',{files,manifestBase}]); return Uint8Array.of(86,68,79,83); },
    decodeVdos:async (bytes) => { packageCalls.push(['decodeVdos',bytes]); return {manifest:{project:{id:'portable-a'}},entries:new Map()}; },
    stageImport:async (options) => {
      packageCalls.push(['stageImport',options]);
      assert.equal(options.mode, 'copy', 'import conflict mode defaults to Copy');
      assert.equal(options.existingProjectIds.has('portable-a'), true);
      assert.equal(typeof options.makeProjectId, 'function');
      assert.equal(typeof options.makeArtifactId, 'function');
      assert.equal(typeof options.recomputeDerived, 'function');
      return {
        project:{id:'portable-copy',title:'Imported Copy',createdAt:'2026-08-26T00:00:00Z',updatedAt:'2026-08-26T06:00:00Z'},
        artifacts:[],comparisons:[],lineage:{roots:[],nodes:[]},derived:{memoryReconciliation:'MEMORY VERIFIED'},importAudit:{packageCompleteness:'complete'},recoveryStatus:'complete'
      };
    },
    buildImportReport:(stage) => ({projectId:stage.project.id,recoveryStatus:stage.recoveryStatus,memoryReconciliation:stage.derived.memoryReconciliation})
  };
  const portableWorkspace = createProjectPackageWorkspace({
    memory:portableMemory,
    library:portableLibrary,
    m4:portableM4,
    packageRuntime:portablePackageRuntime,
    migrator:{assertSupported(){},migrate(model){return {model,steps:[]};}},
    makeProjectId:() => 'portable-copy',
    makeArtifactId:(id) => `copy-${id}`
  });

  const exported = await portableWorkspace.export();
  assert.equal(exported.status, 'exported');
  assert.deepEqual([...exported.bytes], [86,68,79,83]);
  assert.match(exported.filename, /\.vdos$/);
  assert.equal(encodedCount, 1);
  const exportInput = packageCalls.find(([name]) => name === 'buildExportStage')[1];
  assert.equal(exportInput.runtimeArtifacts[0].id, 'g1');
  assert.equal(exportInput.persistedArtifacts[0].id, 'g1');
  assert.equal(exportInput.memorySnapshot.pathHeadArtifactId, 'g1');

  completeness = 'partial';
  const preflight = await portableWorkspace.export();
  assert.equal(preflight.status, 'preflight');
  assert.equal(preflight.report.packageCompleteness, 'partial');
  assert.equal(encodedCount, 1, 'partial export must not encode without explicit user override');
  const incompleteExport = await portableWorkspace.export({allowIncomplete:true});
  assert.equal(incompleteExport.status, 'exported');
  assert.equal(encodedCount, 2, 'explicit incomplete export may encode');

  const imported = await portableWorkspace.import(Uint8Array.of(1,2,3));
  assert.equal(imported.status, 'imported');
  assert.equal(imported.report.projectId, 'portable-copy');
  assert.equal(portablePreferences.getItem(ACTIVE_PROJECT_KEY), 'portable-copy');
  assert.equal(portableOpened.at(-1), 'portable-copy');
  assert.equal(portableMemory.projects.has('portable-copy'), true, 'staged import must commit before activation');

  console.log('project library tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
