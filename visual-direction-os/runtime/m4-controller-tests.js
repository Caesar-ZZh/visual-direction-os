const assert = require('node:assert/strict');
const { compareArtifacts } = require('./comparison-engine.js');
const { deriveMemoryForPath, compileMemoryAppendix } = require('./memory-engine.js');
const { createM4Controller } = require('./m4-controller.js');

function clone(value) { return value == null ? value : structuredClone(value); }

function createFakeMemory() {
  let project = null;
  const artifacts = new Map();
  const comparisons = new Map();
  let nextPersistenceStatus = 'persisted';
  return {
    artifacts,
    setNextPersistenceStatus(status){ nextPersistenceStatus = status; },
    async ensureProject(input = {}) {
      project = { id:input.id || 'project-test', title:input.title || 'Untitled Director Project', createdAt:input.createdAt, updatedAt:input.updatedAt };
      return clone(project);
    },
    async getLatestProject(){ return clone(project); },
    async saveGenerationArtifact({ artifact, lineage }) {
      const status = nextPersistenceStatus;
      nextPersistenceStatus = 'persisted';
      const record = {
        ...clone(artifact),
        ...clone(lineage),
        persistenceStatus:status,
        imageBlob:status === 'persisted' ? new Blob(['image'], { type:'image/png' }) : null
      };
      if (status !== 'not_persisted') artifacts.set(record.id, clone(record));
      return record;
    },
    async getArtifact(id){ return clone(artifacts.get(id) || null); },
    async listArtifacts(projectId){ return [...artifacts.values()].filter((row) => row.projectId === projectId).map(clone); },
    async getChildren(parentId){ return [...artifacts.values()].filter((row) => row.parentArtifactId === parentId).map(clone); },
    async saveComparison(row){ comparisons.set(row.id, clone(row)); return clone(row); },
    async listComparisons(projectId){ return [...comparisons.values()].filter((row) => row.projectId === projectId).map(clone); },
    async estimateStorage(){ return { usage:2048, quota:8192 }; },
    async deleteSubtree(id) {
      const ids = [];
      const visit = (current) => {
        ids.push(current);
        for (const row of artifacts.values()) if (row.parentArtifactId === current) visit(row.id);
      };
      visit(id);
      ids.forEach((artifactId) => artifacts.delete(artifactId));
      return ids;
    },
    async clearProject(projectId){ for (const [id,row] of artifacts) if (row.projectId === projectId) artifacts.delete(id); project = null; }
  };
}

function generationArtifact(id, iterationOf = null) {
  return {
    id,
    createdAt:`2026-08-25T00:${String(id.length + (iterationOf ? 2 : 1)).padStart(2,'0')}:00.000Z`,
    provider:'agnes-image-2.1-flash',
    request:{ model:'agnes-image-2.1-flash', prompt:iterationOf ? 'BASE\n\nCHILD HISTORICAL DELTA' : 'BASE', ratio:'16:9', return_base64:true, extra_body:{response_format:'b64_json'} },
    baseRequest:{ model:'agnes-image-2.1-flash', prompt:'BASE', ratio:'16:9', return_base64:true, extra_body:{response_format:'b64_json'} },
    result:{ kind:'base64', src:'data:image/png;base64,AAAA' },
    visualIR:{ metadata:{version:'0.1.0'} },
    iterationOf,
    parentArtifactId:iterationOf,
    iterationDelta:iterationOf ? { entries:[{checkId:'canvas-ratio',label:'Canvas Ratio',intent:'preserve',evidenceMode:'measured',instruction:'preserve canvas'}], promptAppendix:'CHILD HISTORICAL DELTA' } : null
  };
}

function evaluationDetail(artifact, measuredStatus = 'pass') {
  const report = {
    artifactId:artifact.id,
    checks:[
      { id:'canvas-ratio', label:'Canvas Ratio', evidenceMode:'measured', status:measuredStatus, target:'16:9', observed:measuredStatus, reason:measuredStatus === 'pass' ? 'correct' : 'wrong' },
      { id:'narrative-verb', label:'Narrative Verb', evidenceMode:'human_required', status:'pass', target:'WITHDRAW', observed:'pass', reason:'director pass' }
    ],
    summary:{ measuredPass:measuredStatus === 'pass' ? 1 : 0, measuredWarn:measuredStatus === 'warn' ? 1 : 0, humanPassed:1, humanNeedsWork:0, unresolved:0 }
  };
  const delta = {
    entries:report.checks.map((check) => ({
      checkId:check.id,
      label:check.label,
      intent:check.status === 'pass' ? 'preserve' : 'correct',
      sourceStatus:check.status,
      evidenceMode:check.evidenceMode,
      instruction:`${check.label}: ${check.status === 'pass' ? 'preserve current success' : 'correct current failure'}`
    })),
    preserve:measuredStatus === 'pass' ? ['Canvas Ratio: preserve current success'] : [],
    correct:measuredStatus === 'warn' ? ['Canvas Ratio: correct current failure'] : [],
    unresolved:[],
    promptAppendix:'ITERATION / EVALUATION DELTA'
  };
  return { artifact, human:{ 'narrative-verb':{status:'pass'} }, report, delta };
}

(async () => {
  const memory = createFakeMemory();
  const emitted = [];
  const objectUrls = [];
  const revoked = [];
  const generationRuns = [];
  const controller = createM4Controller({
    memory,
    compareArtifacts,
    deriveMemoryForPath,
    compileMemoryAppendix,
    generationRunner:async (input) => {
      generationRuns.push(clone(input));
      return { id:`branch-${generationRuns.length}`, iterationOf:input.artifact.id };
    },
    now:() => '2026-08-25T00:00:00.000Z',
    createObjectURL:(blob) => { const url = `blob:test-${objectUrls.length + 1}`; objectUrls.push([url, blob]); return url; },
    revokeObjectURL:(url) => revoked.push(url),
    onState:(state) => emitted.push(state)
  });

  await controller.boot();
  let state = controller.getState();
  assert.equal(state.project.id, 'project-test');
  assert.deepEqual(state.artifacts, []);
  assert.equal(state.restoreError, '');

  const g1 = generationArtifact('g1');
  await controller.ingestGeneration(g1);
  await controller.ingestEvaluation(evaluationDetail(g1, 'pass'));
  state = controller.getState();
  assert.equal(state.artifacts.length, 1);
  assert.equal(state.artifacts[0].parentArtifactId, null);
  assert.equal(state.artifacts[0].rootArtifactId, 'g1');
  assert.equal(state.artifacts[0].generationIndex, 1);
  assert.equal(state.artifacts[0].persistenceStatus, 'persisted');
  assert.ok(state.artifacts[0].evaluationDelta, 'outgoing evaluation delta must be preserved separately');
  assert.equal(state.artifacts[0].iterationDelta, null, 'root has no incoming iteration delta');
  assert.equal(state.selectedAId, null);
  assert.equal(state.selectedBId, null);

  const g2 = generationArtifact('g2', 'g1');
  const incomingDelta = clone(g2.iterationDelta);
  await controller.ingestGeneration(g2);
  await controller.ingestEvaluation(evaluationDetail(g2, 'pass'));
  state = controller.getState();
  assert.equal(state.artifacts.length, 2);
  const child = state.artifacts.find((row) => row.id === 'g2');
  assert.equal(child.parentArtifactId, 'g1');
  assert.equal(child.rootArtifactId, 'g1');
  assert.equal(child.generationIndex, 2);
  assert.deepEqual(child.iterationDelta, incomingDelta, 'incoming delta that produced child must not be overwritten by child evaluation');
  assert.ok(child.evaluationDelta, 'child outgoing evaluation delta is stored separately');
  assert.equal(state.selectedAId, 'g1');
  assert.equal(state.selectedBId, 'g2');
  assert.equal(state.comparison.summary.stablePass, 1);
  assert.equal(state.memory.locked.some((row) => row.checkId === 'canvas-ratio'), true, 'two passes on selected path should lock measured rule');

  await controller.setSemanticJudgment('narrative-verb', 'improved', 'Withdrawal reads more clearly.');
  state = controller.getState();
  assert.equal(state.comparison.semanticComparisons.find((row) => row.checkId === 'narrative-verb').state, 'improved');
  assert.equal(state.memory.locked.some((row) => row.checkId === 'narrative-verb'), true, 'explicit improved director comparison can lock semantic rule on selected B path');

  const branchResult = await controller.redirectFromArtifact('g1');
  assert.equal(branchResult.iterationOf, 'g1');
  assert.equal(generationRuns.length, 1);
  assert.equal(generationRuns[0].artifact.id, 'g1');
  assert.equal(generationRuns[0].artifact.baseRequest.prompt, 'BASE');
  assert.equal((generationRuns[0].promptAppendix.match(/ITERATION \/ DIRECTOR MEMORY/g) || []).length, 1, 'branch prompt must contain exactly one bounded M4 appendix');
  assert.doesNotMatch(generationRuns[0].promptAppendix, /CHILD HISTORICAL DELTA/, 'branching from g1 must not inherit g2 historical delta');
  assert.match(generationRuns[0].promptAppendix, /Canvas Ratio/);

  const g2b = generationArtifact('g2b', 'g1');
  await controller.ingestGeneration(g2b);
  await controller.ingestEvaluation(evaluationDetail(g2b, 'warn'));
  const memoryA = controller.getMemoryFor('g2');
  const memoryB = controller.getMemoryFor('g2b');
  assert.equal(memoryA.locked.some((row) => row.checkId === 'canvas-ratio'), true, 'sibling regression must not unlock successful path A');
  assert.equal(memoryB.locked.some((row) => row.checkId === 'canvas-ratio'), false);
  assert.equal(memoryB.active.some((row) => row.checkId === 'canvas-ratio'), true);
  assert.equal(memoryB.locked.some((row) => row.checkId === 'narrative-verb'), false, 'semantic conclusion on sibling g2 must not leak to g2b');

  const renderUrl1 = await controller.getRenderableImage('g2');
  const renderUrl2 = await controller.getRenderableImage('g2');
  assert.equal(renderUrl1, renderUrl2, 'object URL must be cached per artifact');
  assert.equal(objectUrls.length, 1);

  const restored = createM4Controller({
    memory,
    compareArtifacts,
    deriveMemoryForPath,
    compileMemoryAppendix,
    now:() => '2026-08-25T00:10:00.000Z'
  });
  await restored.boot();
  const restoredState = restored.getState();
  assert.equal(restoredState.artifacts.length, 3);
  assert.equal(restoredState.selectedAId, 'g1');
  assert.equal(restoredState.selectedBId, 'g2b');
  assert.ok(restoredState.comparison);

  memory.setNextPersistenceStatus('not_persisted');
  const g3 = generationArtifact('g3', 'g2');
  await controller.ingestGeneration(g3);
  await controller.ingestEvaluation(evaluationDetail(g3, 'pass'));
  state = controller.getState();
  assert.equal(state.artifacts.find((row) => row.id === 'g3').persistenceStatus, 'not_persisted');
  assert.match(state.persistenceWarning, /not persisted/i);
  assert.equal(memory.artifacts.has('g1'), true, 'failed later write must not delete prior persisted history');

  await controller.deleteSubtree('g2');
  state = controller.getState();
  assert.equal(state.artifacts.some((row) => row.id === 'g2'), false);
  assert.equal(state.artifacts.some((row) => row.id === 'g3'), false);
  assert.equal(state.artifacts.some((row) => row.id === 'g2b'), true, 'deleting branch A must not delete sibling branch B');
  assert.equal(revoked.includes(renderUrl1), true, 'deleting subtree must revoke cached image URLs');

  assert.ok(emitted.length > 0, 'controller should emit state changes');
  console.log('m4 controller tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
