const assert = require('node:assert/strict');
const { compareArtifacts } = require('./comparison-engine.js');
const { deriveMemoryForPath, compileMemoryAppendix } = require('./memory-engine.js');
const { createM4Controller, createBrowserGenerationRunner } = require('./m4-controller.js');

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
    async getProject(id){ return project?.id === id ? clone(project) : null; },
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

function createProjectSwitchMemory() {
  const projects = new Map();
  const artifacts = new Map();
  const comparisons = new Map();
  return {
    seedProject(row){ projects.set(row.id, clone(row)); },
    seedArtifact(row){ artifacts.set(row.id, clone(row)); },
    seedComparison(row){ comparisons.set(row.id, clone(row)); },
    async getProject(id){ return clone(projects.get(id) || null); },
    async getLatestProject(){
      return clone([...projects.values()].sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null);
    },
    async ensureProject(input = {}) {
      const timestamp = input.updatedAt || '2026-08-25T00:00:00.000Z';
      const row = { id:input.id || 'project-created', title:input.title || 'Untitled Director Project', createdAt:input.createdAt || timestamp, updatedAt:timestamp };
      projects.set(row.id, clone(row));
      return clone(row);
    },
    async listArtifacts(projectId){ return [...artifacts.values()].filter((row) => row.projectId === projectId).map(clone); },
    async listComparisons(projectId){ return [...comparisons.values()].filter((row) => row.projectId === projectId).map(clone); },
    async estimateStorage(){ return { usage:4096, quota:16384 }; }
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

function persistedEvaluatedArtifact({ id, projectId, parentArtifactId = null, rootArtifactId = id, generationIndex, measuredStatus = 'pass' }) {
  const artifact = generationArtifact(id, parentArtifactId);
  const detail = evaluationDetail(artifact, measuredStatus);
  return {
    ...artifact,
    projectId,
    parentArtifactId,
    rootArtifactId,
    generationIndex,
    evaluation:detail.report,
    humanJudgments:detail.human,
    evaluationDelta:detail.delta,
    persistenceStatus:'persisted',
    imageBlob:new Blob([`image-${id}`], {type:'image/png'}),
    imageMimeType:'image/png'
  };
}

(async () => {
  const browserRunnerCalls = [];
  const fakeRoot = { VisualDirectionOS:{ generation:{ generate:async () => null } } };
  const browserRunner = createBrowserGenerationRunner({
    root:fakeRoot,
    runGenerationIteration:async (input) => { browserRunnerCalls.push(input); return { id:'browser-branch' }; },
    applyIterationDelta:(request, delta) => ({ ...request, prompt:`${request.prompt}\n\n${delta.promptAppendix}` })
  });
  const browserArtifact = generationArtifact('browser-root');
  browserArtifact.evaluationDelta = evaluationDetail(browserArtifact, 'pass').delta;
  const browserResult = await browserRunner({ artifact:browserArtifact, promptAppendix:'ITERATION / DIRECTOR MEMORY\n\nPRESERVE CURRENT:\n- Keep canvas' });
  assert.equal(browserResult.id, 'browser-branch');
  assert.equal(browserRunnerCalls.length, 1);
  assert.equal(browserRunnerCalls[0].root, fakeRoot);
  assert.equal(browserRunnerCalls[0].artifact.id, 'browser-root');
  assert.deepEqual(browserRunnerCalls[0].delta, browserArtifact.evaluationDelta);
  assert.deepEqual(browserRunnerCalls[0].baseRequest, browserArtifact.baseRequest);
  assert.match(browserRunnerCalls[0].promptAppendix, /ITERATION \/ DIRECTOR MEMORY/);
  assert.equal(typeof browserRunnerCalls[0].applyIterationDelta, 'function');

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

  const switchMemory = createProjectSwitchMemory();
  switchMemory.seedProject({id:'project-a',title:'Project A',createdAt:'2026-08-24T00:00:00.000Z',updatedAt:'2026-08-25T00:00:00.000Z'});
  switchMemory.seedProject({id:'project-b',title:'Project B',createdAt:'2026-08-24T00:00:00.000Z',updatedAt:'2026-08-26T00:00:00.000Z'});
  switchMemory.seedArtifact(persistedEvaluatedArtifact({id:'a1',projectId:'project-a',rootArtifactId:'a1',generationIndex:1}));
  switchMemory.seedArtifact(persistedEvaluatedArtifact({id:'a2',projectId:'project-a',parentArtifactId:'a1',rootArtifactId:'a1',generationIndex:2}));
  switchMemory.seedArtifact(persistedEvaluatedArtifact({id:'b1',projectId:'project-b',rootArtifactId:'b1',generationIndex:1}));
  switchMemory.seedArtifact(persistedEvaluatedArtifact({id:'b2',projectId:'project-b',parentArtifactId:'b1',rootArtifactId:'b1',generationIndex:2}));
  switchMemory.seedComparison({
    id:'b1::b2',projectId:'project-b',artifactAId:'b1',artifactBId:'b2',
    directorJudgments:{'narrative-verb':{state:'improved',note:'Project B only'}},
    comparison:{summary:{stablePass:1}},updatedAt:'2026-08-26T00:00:00.000Z'
  });

  const switchRevoked = [];
  let switchUrlCount = 0;
  const switching = createM4Controller({
    memory:switchMemory,
    compareArtifacts,
    deriveMemoryForPath,
    compileMemoryAppendix,
    createObjectURL:() => `blob:switch-${++switchUrlCount}`,
    revokeObjectURL:(url) => switchRevoked.push(url),
    now:() => '2026-08-26T00:30:00.000Z'
  });

  await switching.boot({projectId:'project-a'});
  let switchState = switching.getState();
  assert.equal(switchState.project.id, 'project-a', 'explicit boot project must win over latest updatedAt project');
  assert.deepEqual(switchState.artifacts.map((row) => row.id), ['a1','a2']);
  assert.equal(switchState.selectedAId, 'a1');
  assert.equal(switchState.selectedBId, 'a2');
  assert.equal(switchState.memory.locked.some((row) => row.checkId === 'narrative-verb'), false, 'Project B semantic judgment must not leak into Project A');

  const projectAUrl = await switching.getRenderableImage('a2');
  assert.match(projectAUrl, /^blob:switch-/);
  await switching.openProject('project-b');
  switchState = switching.getState();
  assert.equal(switchState.project.id, 'project-b');
  assert.deepEqual(switchState.artifacts.map((row) => row.id), ['b1','b2']);
  assert.equal(switchState.selectedAId, 'b1');
  assert.equal(switchState.selectedBId, 'b2');
  assert.equal(switchState.memory.locked.some((row) => row.checkId === 'narrative-verb'), true, 'selected project comparison judgments must restore on switch');
  assert.equal(switchRevoked.includes(projectAUrl), true, 'successful project switch must revoke prior project object URLs');

  const beforeMissingOpen = switching.getState();
  await assert.rejects(() => switching.openProject('project-missing'), /missing|unknown|project/i);
  assert.deepEqual(switching.getState(), beforeMissingOpen, 'opening a missing project must preserve current working state');

  const exportSnapshot = switching.getExportSnapshot();
  assert.equal(exportSnapshot.project.id, 'project-b');
  assert.deepEqual(exportSnapshot.artifacts.map((row) => row.id), ['b1','b2']);
  assert.equal(exportSnapshot.comparisons.length, 1);
  assert.ok(exportSnapshot.memorySnapshot, 'export snapshot must expose current derived memory');
  exportSnapshot.project.title = 'MUTATED';
  exportSnapshot.artifacts[0].id = 'mutated-artifact';
  exportSnapshot.comparisons[0].id = 'mutated-comparison';
  exportSnapshot.memorySnapshot.locked.length = 0;
  const afterSnapshotMutation = switching.getState();
  assert.equal(afterSnapshotMutation.project.title, 'Project B', 'export snapshot project must be detached from controller state');
  assert.equal(afterSnapshotMutation.artifacts[0].id, 'b1', 'export snapshot artifacts must be detached from controller state');
  assert.equal(afterSnapshotMutation.comparisons[0].id, 'b1::b2', 'export snapshot comparisons must be detached from controller state');
  assert.equal(afterSnapshotMutation.memory.locked.some((row) => row.checkId === 'narrative-verb'), true, 'export snapshot memory must be detached from controller state');

  const staleBoot = createM4Controller({
    memory:switchMemory,
    compareArtifacts,
    deriveMemoryForPath,
    compileMemoryAppendix,
    now:() => '2026-08-26T00:30:00.000Z'
  });
  await staleBoot.boot({projectId:'project-does-not-exist'});
  assert.equal(staleBoot.getState().project.id, 'project-b', 'stale preferred project ID must fall back to latest existing project');

  assert.ok(emitted.length > 0, 'controller should emit state changes');
  console.log('m4 controller tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
