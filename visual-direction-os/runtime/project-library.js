(function attachProjectLibrary(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function projectLibraryFactory(root) {
  'use strict';

  const ACTIVE_PROJECT_KEY = 'vdos-active-project-id';
  const DEFAULT_TITLE = 'Untitled Director Project';

  function clone(value) {
    if (value == null) return value;
    if (typeof root?.structuredClone === 'function') return root.structuredClone(value);
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function cleanTitle(value) {
    return String(value ?? '').trim() || DEFAULT_TITLE;
  }

  function defaultId() {
    const uuid = root?.crypto?.randomUUID?.();
    if (uuid) return `project-${uuid}`;
    return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createProjectLibrary({
    memory,
    preferences = root?.localStorage || null,
    now = () => new Date().toISOString(),
    makeId = defaultId
  } = {}) {
    if (!memory) throw new Error('Project library requires Director Memory');
    for (const method of ['listProjects','getProject','ensureProject','clearProject']) {
      if (typeof memory[method] !== 'function') throw new Error(`Project library requires memory.${method}()`);
    }
    if (!preferences || typeof preferences.getItem !== 'function' || typeof preferences.setItem !== 'function') {
      throw new Error('Project library requires a preference store with getItem/setItem');
    }
    if (typeof makeId !== 'function') throw new Error('Project library requires makeId()');

    let activeProjectId = null;
    const issuedIds = new Set();
    let fallbackCounter = 0;

    function readPreference() {
      try {
        const value = String(preferences.getItem(ACTIVE_PROJECT_KEY) || '').trim();
        return value || null;
      } catch (_) {
        return null;
      }
    }

    function writePreference(projectId) {
      activeProjectId = String(projectId || '').trim() || null;
      try {
        if (activeProjectId) preferences.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
        else preferences.removeItem?.(ACTIVE_PROJECT_KEY);
      } catch (_) {}
      return activeProjectId;
    }

    async function list() {
      const rows = await memory.listProjects();
      for (const row of rows || []) if (row?.id) issuedIds.add(row.id);
      return clone(rows || []);
    }

    async function nextUniqueId() {
      const existing = new Set((await list()).map((row) => row.id));
      for (let attempt = 0; attempt < 32; attempt += 1) {
        const candidate = String(makeId() || '').trim();
        if (!candidate) continue;
        if (!existing.has(candidate) && !issuedIds.has(candidate)) {
          issuedIds.add(candidate);
          return candidate;
        }
      }
      let base = String(makeId() || 'project').trim() || 'project';
      let candidate;
      do {
        fallbackCounter += 1;
        candidate = `${base}-${fallbackCounter}`;
      } while (existing.has(candidate) || issuedIds.has(candidate));
      issuedIds.add(candidate);
      return candidate;
    }

    async function createFreshProject(title = DEFAULT_TITLE) {
      const timestamp = now();
      const project = await memory.ensureProject({
        id:await nextUniqueId(),
        title:cleanTitle(title),
        createdAt:timestamp,
        updatedAt:timestamp
      });
      return clone(project);
    }

    async function resolveFallback(projects = null) {
      const rows = projects || await list();
      if (rows.length) return clone(rows[0]);
      return createFreshProject(DEFAULT_TITLE);
    }

    async function boot() {
      const projects = await list();
      const preferredId = readPreference();
      let activeProject = preferredId
        ? projects.find((row) => row.id === preferredId) || null
        : null;
      if (!activeProject) activeProject = await resolveFallback(projects);
      writePreference(activeProject.id);
      return {
        activeProject:clone(activeProject),
        projects:await list()
      };
    }

    async function open(projectId) {
      const id = String(projectId || '').trim();
      const project = id ? await memory.getProject(id) : null;
      if (!project) throw new Error(`Project not found: ${id || '(empty id)'}`);
      issuedIds.add(project.id);
      writePreference(project.id);
      return clone(project);
    }

    async function newProject(title = DEFAULT_TITLE) {
      const project = await createFreshProject(title);
      writePreference(project.id);
      return project;
    }

    async function rename(projectId, title) {
      const id = String(projectId || '').trim();
      const existing = id ? await memory.getProject(id) : null;
      if (!existing) throw new Error(`Project not found: ${id || '(empty id)'}`);
      const updated = await memory.ensureProject({
        ...clone(existing),
        id:existing.id,
        title:cleanTitle(title),
        createdAt:existing.createdAt,
        updatedAt:now()
      });
      return clone(updated);
    }

    async function deleteProject(projectId) {
      const id = String(projectId || '').trim();
      const existing = id ? await memory.getProject(id) : null;
      if (!existing) throw new Error(`Project not found: ${id || '(empty id)'}`);
      issuedIds.add(existing.id);
      await memory.clearProject(existing.id);

      let activeProject = null;
      const currentActive = activeProjectId || readPreference();
      if (currentActive && currentActive !== existing.id) {
        activeProject = await memory.getProject(currentActive);
      }
      if (!activeProject) activeProject = await resolveFallback();
      writePreference(activeProject.id);
      return {
        deletedProjectId:existing.id,
        activeProject:clone(activeProject),
        projects:await list()
      };
    }

    return {
      boot,
      list,
      newProject,
      open,
      rename,
      delete:deleteProject,
      getActiveProjectId:() => activeProjectId || readPreference()
    };
  }

  return {
    ACTIVE_PROJECT_KEY,
    PROJECT_LIBRARY_DEFAULT_TITLE:DEFAULT_TITLE,
    createProjectLibrary
  };
});
