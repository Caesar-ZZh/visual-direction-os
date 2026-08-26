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

  // Merely touching another project must not steal startup identity.
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

  // Deleting a non-active project must not move active identity.
  await library.delete('project-old');
  assert.equal(library.getActiveProjectId(), 'project-c');

  // Stale stored active ID falls back to latest existing project and persists fallback.
  preferences.setItem(ACTIVE_PROJECT_KEY, 'stale-project');
  const staleBoot = await library.boot();
  assert.equal(staleBoot.activeProject.id, 'project-c');
  assert.equal(preferences.getItem(ACTIVE_PROJECT_KEY), 'project-c');

  // Empty storage creates and activates one Untitled project.
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

  // Deleting the sole active project creates a fresh Untitled replacement.
  const replacement = await emptyLibrary.delete('project-empty');
  assert.equal(replacement.activeProject.title, 'Untitled Director Project');
  assert.notEqual(replacement.activeProject.id, 'project-empty');
  assert.equal(emptyPreferences.getItem(ACTIVE_PROJECT_KEY), replacement.activeProject.id);

  // Import orchestration must not move active identity until the atomic bundle commit succeeds.
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

  // Workspace API must expose one coherent local-project surface and keep M4 aligned with explicit project actions.
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

  console.log('project library tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
