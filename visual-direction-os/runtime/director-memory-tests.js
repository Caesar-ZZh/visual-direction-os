const assert = require('node:assert/strict');
const {
  dataUrlToBlob,
  shapeArtifactRecord,
  createDirectorMemory
} = require('./director-memory.js');

function makeArtifact(id = 'gen-1', result = { kind:'base64', src:'data:image/png;base64,iVBORw0KGgo=' }) {
  return {
    id,
    createdAt:'2026-08-25T00:00:00.000Z',
    provider:'agnes-image-2.1-flash',
    request:{ model:'agnes-image-2.1-flash', prompt:'BASE', ratio:'16:9', return_base64:true, extra_body:{ response_format:'b64_json' } },
    baseRequest:{ model:'agnes-image-2.1-flash', prompt:'BASE', ratio:'16:9', return_base64:true, extra_body:{ response_format:'b64_json' } },
    visualIR:{ metadata:{version:'0.1.0'} },
    measurements:{ meanSaturation:0.31 },
    evaluation:{ checks:[] },
    humanJudgments:{},
    iterationDelta:null,
    result
  };
}

function createFakeStore() {
  const artifacts = new Map();
  const projects = new Map();
  const comparisons = new Map();
  let failWrites = false;
  let failBundle = false;
  return {
    artifacts,
    projects,
    comparisons,
    setFailWrites(value){ failWrites = Boolean(value); },
    setFailBundle(value){ failBundle = Boolean(value); },
    async putArtifact(row){ if (failWrites) throw new Error('quota exceeded'); artifacts.set(row.id, structuredClone(row)); return row; },
    async getArtifact(id){ return artifacts.get(id) || null; },
    async listArtifacts(projectId){ return [...artifacts.values()].filter((row) => row.projectId === projectId); },
    async getChildren(parentId){ return [...artifacts.values()].filter((row) => row.parentArtifactId === parentId); },
    async putProject(project){ projects.set(project.id, structuredClone(project)); return project; },
    async getProject(id){ return projects.get(id) ? structuredClone(projects.get(id)) : null; },
    async listProjects(){ return [...projects.values()].map((row) => structuredClone(row)).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); },
    async getLatestProject(){ return [...projects.values()].sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null; },
    async putComparison(row){ comparisons.set(row.id, structuredClone(row)); return row; },
    async listComparisons(projectId){ return [...comparisons.values()].filter((row) => row.projectId === projectId).map((row) => structuredClone(row)); },
    async loadProjectBundle(projectId){
      return {
        project:projects.get(projectId) ? structuredClone(projects.get(projectId)) : null,
        artifacts:[...artifacts.values()].filter((row) => row.projectId === projectId).map((row) => structuredClone(row)),
        comparisons:[...comparisons.values()].filter((row) => row.projectId === projectId).map((row) => structuredClone(row))
      };
    },
    async commitProjectBundle({ mode, project, artifacts:incomingArtifacts = [], comparisons:incomingComparisons = [], replaceProjectId = null }){
      if (failBundle) throw new Error('bundle transaction aborted');
      const nextProjects = new Map([...projects].map(([id,row]) => [id, structuredClone(row)]));
      const nextArtifacts = new Map([...artifacts].map(([id,row]) => [id, structuredClone(row)]));
      const nextComparisons = new Map([...comparisons].map(([id,row]) => [id, structuredClone(row)]));
      if (mode === 'replace') {
        const target = replaceProjectId || project.id;
        nextProjects.delete(target);
        for (const [id,row] of nextArtifacts) if (row.projectId === target) nextArtifacts.delete(id);
        for (const [id,row] of nextComparisons) if (row.projectId === target) nextComparisons.delete(id);
      }
      nextProjects.set(project.id, structuredClone(project));
      for (const row of incomingArtifacts) nextArtifacts.set(row.id, structuredClone(row));
      for (const row of incomingComparisons) nextComparisons.set(row.id, structuredClone(row));
      projects.clear(); for (const [id,row] of nextProjects) projects.set(id,row);
      artifacts.clear(); for (const [id,row] of nextArtifacts) artifacts.set(id,row);
      comparisons.clear(); for (const [id,row] of nextComparisons) comparisons.set(id,row);
      return { project:structuredClone(project), artifactCount:incomingArtifacts.length, comparisonCount:incomingComparisons.length };
    },
    async deleteArtifacts(ids){ ids.forEach((id) => artifacts.delete(id)); },
    async clearProject(projectId){
      for (const [id,row] of artifacts) if (row.projectId === projectId) artifacts.delete(id);
      for (const [id,row] of comparisons) if (row.projectId === projectId) comparisons.delete(id);
      projects.delete(projectId);
    }
  };
}

(async () => {
  const blob = dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=');
  assert.equal(blob.type, 'image/png');
  assert.ok(blob.size > 0);

  const artifact = makeArtifact();
  const record = shapeArtifactRecord({
    artifact,
    projectId:'project-1',
    rootArtifactId:'gen-1',
    parentArtifactId:null,
    generationIndex:1,
    imageBlob:blob,
    persistenceStatus:'persisted'
  });
  assert.equal(record.projectId, 'project-1');
  assert.equal(record.rootArtifactId, 'gen-1');
  assert.equal(record.parentArtifactId, null);
  assert.equal(record.persistenceStatus, 'persisted');
  assert.equal(record.result.kind, 'base64');
  assert.equal(record.result.src, undefined, 'raw base64 must not be duplicated into persisted metadata');
  assert.equal(record.imageMimeType, 'image/png');
  assert.deepEqual(record.baseRequest, artifact.baseRequest);
  assert.notEqual(record.baseRequest, artifact.baseRequest);

  const store = createFakeStore();
  const memory = createDirectorMemory({ store, storageManager:{ estimate:async () => ({ usage:1024, quota:4096 }) } });
  const project = await memory.ensureProject({ id:'project-1', createdAt:'2026-08-25T00:00:00.000Z', updatedAt:'2026-08-25T00:00:00.000Z' });
  assert.equal(project.id, 'project-1');

  const savedRoot = await memory.saveGenerationArtifact({
    artifact,
    lineage:{ projectId:'project-1', rootArtifactId:'gen-1', parentArtifactId:null, generationIndex:1 }
  });
  assert.equal(savedRoot.persistenceStatus, 'persisted');
  assert.ok(savedRoot.imageBlob instanceof Blob);
  assert.equal((await memory.getArtifact('gen-1')).id, 'gen-1');

  const child = makeArtifact('gen-2');
  const savedChild = await memory.saveGenerationArtifact({
    artifact:child,
    lineage:{ projectId:'project-1', rootArtifactId:'gen-1', parentArtifactId:'gen-1', generationIndex:2 }
  });
  assert.equal(savedChild.parentArtifactId, 'gen-1');
  assert.deepEqual((await memory.getChildren('gen-1')).map((row) => row.id), ['gen-2']);
  assert.equal((await memory.listArtifacts('project-1')).length, 2);

  const urlArtifact = makeArtifact('gen-url', { kind:'url', src:'https://example.invalid/image.png' });
  const metaOnlyMemory = createDirectorMemory({
    store,
    fetchImpl:async () => { throw new TypeError('Failed to fetch'); }
  });
  const metaOnly = await metaOnlyMemory.saveGenerationArtifact({
    artifact:urlArtifact,
    lineage:{ projectId:'project-1', rootArtifactId:'gen-url', parentArtifactId:null, generationIndex:3 }
  });
  assert.equal(metaOnly.persistenceStatus, 'meta_only');
  assert.equal(metaOnly.imageBlob, null);
  assert.equal((await memory.getArtifact('gen-url')).persistenceStatus, 'meta_only', 'URL image failure must still persist metadata');

  const beforeFailure = (await memory.listArtifacts('project-1')).map((row) => row.id).sort();
  store.setFailWrites(true);
  const failed = await memory.saveGenerationArtifact({
    artifact:makeArtifact('gen-failed'),
    lineage:{ projectId:'project-1', rootArtifactId:'gen-failed', parentArtifactId:null, generationIndex:4 }
  });
  assert.equal(failed.persistenceStatus, 'not_persisted');
  assert.match(failed.persistenceError, /quota exceeded/i);
  store.setFailWrites(false);
  assert.deepEqual((await memory.listArtifacts('project-1')).map((row) => row.id).sort(), beforeFailure, 'failed write must not delete or alter persisted history');

  const estimate = await memory.estimateStorage();
  assert.deepEqual(estimate, { usage:1024, quota:4096 });

  // M5 multi-project read boundary.
  await memory.ensureProject({ id:'project-2', title:'Second', createdAt:'2026-08-25T01:00:00.000Z', updatedAt:'2026-08-25T01:00:00.000Z' });
  assert.equal((await memory.getProject('project-2')).title, 'Second');
  assert.deepEqual((await memory.listProjects()).map((row) => row.id), ['project-2','project-1']);

  const importedProject = { id:'project-import', title:'Imported', createdAt:'2026-08-26T00:00:00.000Z', updatedAt:'2026-08-26T00:00:00.000Z' };
  const importedArtifacts = [
    { id:'import-g1', projectId:'project-import', rootArtifactId:'import-g1', parentArtifactId:null, generationIndex:1, persistenceStatus:'persisted' }
  ];
  const importedComparisons = [
    { id:'import-g1::import-g1', projectId:'project-import', artifactAId:'import-g1', artifactBId:'import-g1' }
  ];
  await memory.commitProjectBundle({ mode:'copy', project:importedProject, artifacts:importedArtifacts, comparisons:importedComparisons });
  const importedBundle = await memory.loadProjectBundle('project-import');
  assert.equal(importedBundle.project.title, 'Imported');
  assert.deepEqual(importedBundle.artifacts.map((row) => row.id), ['import-g1']);
  assert.deepEqual(importedBundle.comparisons.map((row) => row.id), ['import-g1::import-g1']);

  // Replace must be atomic: a failed bundle transaction leaves old rows untouched.
  const beforeReplace = structuredClone(await memory.loadProjectBundle('project-import'));
  store.setFailBundle(true);
  await assert.rejects(
    () => memory.commitProjectBundle({
      mode:'replace',
      replaceProjectId:'project-import',
      project:{ ...importedProject, title:'Replacement' },
      artifacts:[{ ...importedArtifacts[0], id:'replacement-g1' }],
      comparisons:[]
    }),
    /transaction aborted/i
  );
  store.setFailBundle(false);
  assert.deepEqual(await memory.loadProjectBundle('project-import'), beforeReplace, 'failed replace must preserve the existing project bundle exactly');

  await memory.deleteSubtree('gen-1');
  assert.equal(await memory.getArtifact('gen-1'), null);
  assert.equal(await memory.getArtifact('gen-2'), null);
  assert.ok(await memory.getArtifact('gen-url'), 'unrelated branch must survive subtree deletion');

  await memory.clearProject('project-1');
  assert.equal((await memory.listArtifacts('project-1')).length, 0);
  assert.equal(await memory.getProject('project-1'), null);

  console.log('director memory tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
