const assert = require('node:assert/strict');
const {
  DIRECTOR_MEMORY_DB_VERSION,
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
  const sequences = new Map();
  const shots = new Map();
  const comparisons = new Map();
  let failWrites = false;
  let failBundle = false;
  const byProject = (map, projectId) => [...map.values()].filter((row) => row.projectId === projectId).map((row) => structuredClone(row));
  return {
    artifacts, projects, sequences, shots, comparisons,
    setFailWrites(value){ failWrites = Boolean(value); },
    setFailBundle(value){ failBundle = Boolean(value); },
    async putArtifact(row){ if (failWrites) throw new Error('quota exceeded'); artifacts.set(row.id, structuredClone(row)); return row; },
    async getArtifact(id){ return artifacts.get(id) || null; },
    async listArtifacts(projectId){ return byProject(artifacts, projectId); },
    async listArtifactsForShot(projectId, sequenceId, shotId){ return byProject(artifacts, projectId).filter((row) => row.sequenceId === sequenceId && row.shotId === shotId); },
    async getChildren(parentId){ return [...artifacts.values()].filter((row) => row.parentArtifactId === parentId).map((row) => structuredClone(row)); },
    async putProject(project){ projects.set(project.id, structuredClone(project)); return project; },
    async getProject(id){ return projects.get(id) ? structuredClone(projects.get(id)) : null; },
    async listProjects(){ return [...projects.values()].map((row) => structuredClone(row)).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); },
    async getLatestProject(){ return [...projects.values()].sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null; },
    async putSequence(row){ sequences.set(row.id, structuredClone(row)); return row; },
    async getSequence(id){ return sequences.get(id) ? structuredClone(sequences.get(id)) : null; },
    async listSequences(projectId){ return byProject(sequences, projectId).sort((a,b)=>a.order-b.order); },
    async deleteSequence(id){ sequences.delete(id); },
    async putShot(row){ shots.set(row.id, structuredClone(row)); return row; },
    async getShot(id){ return shots.get(id) ? structuredClone(shots.get(id)) : null; },
    async listShots(sequenceId){ return [...shots.values()].filter((row)=>row.sequenceId===sequenceId).map((row)=>structuredClone(row)).sort((a,b)=>a.order-b.order); },
    async deleteShot(id){ shots.delete(id); },
    async putComparison(row){ comparisons.set(row.id, structuredClone(row)); return row; },
    async listComparisons(projectId){ return byProject(comparisons, projectId); },
    async listComparisonsForShot(projectId, sequenceId, shotId){ return byProject(comparisons, projectId).filter((row) => row.sequenceId === sequenceId && row.shotId === shotId); },
    async loadProjectBundle(projectId){
      return {
        project:projects.get(projectId) ? structuredClone(projects.get(projectId)) : null,
        sequences:byProject(sequences, projectId).sort((a,b)=>a.order-b.order),
        shots:byProject(shots, projectId).sort((a,b)=>a.order-b.order),
        artifacts:byProject(artifacts, projectId),
        comparisons:byProject(comparisons, projectId)
      };
    },
    async commitProjectBundle({ mode, project, sequences:incomingSequences = [], shots:incomingShots = [], artifacts:incomingArtifacts = [], comparisons:incomingComparisons = [], replaceProjectId = null }){
      if (failBundle) throw new Error('bundle transaction aborted');
      const copyMap = (map) => new Map([...map].map(([id,row]) => [id, structuredClone(row)]));
      const next = { projects:copyMap(projects), sequences:copyMap(sequences), shots:copyMap(shots), artifacts:copyMap(artifacts), comparisons:copyMap(comparisons) };
      if (mode === 'replace') {
        const target = replaceProjectId || project.id;
        next.projects.delete(target);
        for (const key of ['sequences','shots','artifacts','comparisons']) for (const [id,row] of next[key]) if (row.projectId === target) next[key].delete(id);
      }
      next.projects.set(project.id, structuredClone(project));
      for (const row of incomingSequences) next.sequences.set(row.id, structuredClone(row));
      for (const row of incomingShots) next.shots.set(row.id, structuredClone(row));
      for (const row of incomingArtifacts) next.artifacts.set(row.id, structuredClone(row));
      for (const row of incomingComparisons) next.comparisons.set(row.id, structuredClone(row));
      for (const [key,map] of Object.entries({projects,sequences,shots,artifacts,comparisons})) { map.clear(); for (const [id,row] of next[key]) map.set(id,row); }
      return { project:structuredClone(project), sequenceCount:incomingSequences.length, shotCount:incomingShots.length, artifactCount:incomingArtifacts.length, comparisonCount:incomingComparisons.length };
    },
    async deleteArtifacts(ids){ ids.forEach((id) => artifacts.delete(id)); },
    async clearProject(projectId){
      for (const map of [sequences,shots,artifacts,comparisons]) for (const [id,row] of map) if (row.projectId === projectId) map.delete(id);
      projects.delete(projectId);
    }
  };
}

(async () => {
  assert.equal(DIRECTOR_MEMORY_DB_VERSION, 2);
  const blob = dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=');
  assert.equal(blob.type, 'image/png');
  assert.ok(blob.size > 0);

  const artifact = makeArtifact();
  artifact.continuityProvenance = { sourceShotId:'shot-0', sourceArtifactId:'prev-1', status:'resolved' };
  const record = shapeArtifactRecord({ artifact, projectId:'project-1', sequenceId:'sequence-1', shotId:'shot-1', rootArtifactId:'gen-1', parentArtifactId:null, generationIndex:1, imageBlob:blob, persistenceStatus:'persisted' });
  assert.equal(record.projectId, 'project-1');
  assert.equal(record.sequenceId, 'sequence-1');
  assert.equal(record.shotId, 'shot-1');
  assert.deepEqual(record.continuityProvenance, artifact.continuityProvenance);
  assert.equal(record.result.src, undefined);
  assert.equal(record.imageMimeType, 'image/png');
  assert.notEqual(record.baseRequest, artifact.baseRequest);

  const store = createFakeStore();
  const memory = createDirectorMemory({ store, storageManager:{ estimate:async () => ({ usage:1024, quota:4096 }) } });
  const project = await memory.ensureProject({ id:'project-1', createdAt:'2026-08-25T00:00:00.000Z', updatedAt:'2026-08-25T00:00:00.000Z', activeSequenceId:'sequence-1', activeShotId:'shot-1' });
  assert.equal(project.activeShotId, 'shot-1');
  await memory.putSequence({ id:'sequence-1', projectId:'project-1', order:1, title:'Seq' });
  await memory.putShot({ id:'shot-1', projectId:'project-1', sequenceId:'sequence-1', order:1, title:'One' });
  await memory.putShot({ id:'shot-2', projectId:'project-1', sequenceId:'sequence-1', order:2, title:'Two' });

  const savedRoot = await memory.saveGenerationArtifact({ artifact, lineage:{ projectId:'project-1', sequenceId:'sequence-1', shotId:'shot-1', rootArtifactId:'gen-1', parentArtifactId:null, generationIndex:1 } });
  assert.equal(savedRoot.persistenceStatus, 'persisted');
  assert.ok(savedRoot.imageBlob instanceof Blob);

  const child = makeArtifact('gen-2');
  const savedChild = await memory.saveGenerationArtifact({ artifact:child, lineage:{ projectId:'project-1', sequenceId:'sequence-1', shotId:'shot-1', rootArtifactId:'gen-1', parentArtifactId:'gen-1', generationIndex:2 } });
  assert.equal(savedChild.parentArtifactId, 'gen-1');
  assert.deepEqual((await memory.getChildren('gen-1')).map((row) => row.id), ['gen-2']);

  const h1 = makeArtifact('h1');
  await memory.saveGenerationArtifact({ artifact:h1, lineage:{ projectId:'project-1', sequenceId:'sequence-1', shotId:'shot-2', rootArtifactId:'h1', parentArtifactId:null, generationIndex:1 } });
  await memory.saveComparison({ id:'h1::h2', projectId:'project-1', sequenceId:'sequence-1', shotId:'shot-2', artifactAId:'h1', artifactBId:'h2' });
  assert.deepEqual((await memory.listArtifactsForShot('project-1','sequence-1','shot-2')).map((x)=>x.id), ['h1']);
  assert.deepEqual((await memory.listComparisonsForShot('project-1','sequence-1','shot-2')).map((x)=>x.id), ['h1::h2']);

  const urlArtifact = makeArtifact('gen-url', { kind:'url', src:'https://example.invalid/image.png' });
  const metaOnlyMemory = createDirectorMemory({ store, fetchImpl:async () => { throw new TypeError('Failed to fetch'); } });
  const metaOnly = await metaOnlyMemory.saveGenerationArtifact({ artifact:urlArtifact, lineage:{ projectId:'project-1', sequenceId:'sequence-1', shotId:'shot-1', rootArtifactId:'gen-url', parentArtifactId:null, generationIndex:3 } });
  assert.equal(metaOnly.persistenceStatus, 'meta_only');

  const beforeFailure = (await memory.listArtifacts('project-1')).map((row) => row.id).sort();
  store.setFailWrites(true);
  const failed = await memory.saveGenerationArtifact({ artifact:makeArtifact('gen-failed'), lineage:{ projectId:'project-1', sequenceId:'sequence-1', shotId:'shot-1', rootArtifactId:'gen-failed', parentArtifactId:null, generationIndex:4 } });
  assert.equal(failed.persistenceStatus, 'not_persisted');
  store.setFailWrites(false);
  assert.deepEqual((await memory.listArtifacts('project-1')).map((row) => row.id).sort(), beforeFailure);
  assert.deepEqual(await memory.estimateStorage(), { usage:1024, quota:4096 });

  const importedProject = { id:'project-import', title:'Imported', createdAt:'2026-08-26T00:00:00.000Z', updatedAt:'2026-08-26T00:00:00.000Z', activeSequenceId:'q1', activeShotId:'s1' };
  const importedSequences = [{ id:'q1', projectId:'project-import', order:1 }];
  const importedShots = [{ id:'s1', projectId:'project-import', sequenceId:'q1', order:1 }];
  const importedArtifacts = [{ id:'import-g1', projectId:'project-import', sequenceId:'q1', shotId:'s1', rootArtifactId:'import-g1', parentArtifactId:null, generationIndex:1, persistenceStatus:'persisted' }];
  const importedComparisons = [{ id:'import-g1::import-g1', projectId:'project-import', sequenceId:'q1', shotId:'s1', artifactAId:'import-g1', artifactBId:'import-g1' }];
  await memory.commitProjectBundle({ mode:'copy', project:importedProject, sequences:importedSequences, shots:importedShots, artifacts:importedArtifacts, comparisons:importedComparisons });
  const importedBundle = await memory.loadProjectBundle('project-import');
  assert.deepEqual(importedBundle.sequences.map((row)=>row.id), ['q1']);
  assert.deepEqual(importedBundle.shots.map((row)=>row.id), ['s1']);
  assert.deepEqual(importedBundle.artifacts.map((row)=>row.id), ['import-g1']);

  const beforeReplace = structuredClone(importedBundle);
  store.setFailBundle(true);
  await assert.rejects(() => memory.commitProjectBundle({ mode:'replace', replaceProjectId:'project-import', project:{ ...importedProject, title:'Replacement' }, sequences:[{...importedSequences[0],id:'q2'}], shots:[{...importedShots[0],id:'s2',sequenceId:'q2'}], artifacts:[], comparisons:[] }), /transaction aborted/i);
  store.setFailBundle(false);
  assert.deepEqual(await memory.loadProjectBundle('project-import'), beforeReplace);

  await memory.deleteSubtree('gen-1');
  assert.equal(await memory.getArtifact('gen-1'), null);
  assert.equal(await memory.getArtifact('gen-2'), null);
  assert.ok(await memory.getArtifact('h1'));

  await memory.clearProject('project-1');
  const cleared = await memory.loadProjectBundle('project-1');
  assert.equal(cleared.project, null);
  assert.deepEqual(cleared.sequences, []);
  assert.deepEqual(cleared.shots, []);
  assert.deepEqual(cleared.artifacts, []);

  console.log('director memory tests passed');
})().catch((error) => { console.error(error); process.exit(1); });
