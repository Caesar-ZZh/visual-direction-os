const assert = require('node:assert/strict');
const { compareArtifacts } = require('./comparison-engine.js');
const { deriveMemoryForPath, compileMemoryAppendix } = require('./memory-engine.js');
const { createM4Controller, createBrowserGenerationRunner } = require('./m4-controller.js');

const clone = (value) => value == null ? value : structuredClone(value);

function generationArtifact(id, iterationOf = null, continuityProvenance = null) {
  return {
    id,
    createdAt:'2026-08-28T00:00:00.000Z',
    provider:'agnes-image-2.1-flash',
    request:{ model:'agnes-image-2.1-flash', prompt:'BASE', ratio:'16:9', return_base64:true, extra_body:{response_format:'b64_json'} },
    baseRequest:{ model:'agnes-image-2.1-flash', prompt:'BASE', ratio:'16:9', return_base64:true, extra_body:{response_format:'b64_json'} },
    result:{ kind:'base64', src:'data:image/png;base64,AAAA' },
    visualIR:{ metadata:{version:'0.1.0'} },
    iterationOf,
    parentArtifactId:iterationOf,
    iterationDelta:iterationOf ? { entries:[], promptAppendix:'CHILD HISTORICAL DELTA' } : null,
    continuityProvenance
  };
}

function evaluationDetail(artifact, measuredStatus = 'pass') {
  const report = {
    artifactId:artifact.id,
    checks:[
      { id:'canvas-ratio', label:'Canvas Ratio', evidenceMode:'measured', status:measuredStatus, target:'16:9', observed:measuredStatus, reason:'test' },
      { id:'narrative-verb', label:'Narrative Verb', evidenceMode:'human_required', status:'pass', target:'WITHDRAW', observed:'pass', reason:'director pass' }
    ],
    summary:{ measuredPass:measuredStatus === 'pass' ? 1 : 0, measuredWarn:measuredStatus === 'warn' ? 1 : 0, humanPassed:1, humanNeedsWork:0, unresolved:0 }
  };
  const delta = {
    entries:report.checks.map((check) => ({ checkId:check.id, label:check.label, intent:check.status === 'pass' ? 'preserve' : 'correct', sourceStatus:check.status, evidenceMode:check.evidenceMode, instruction:`${check.label}: ${check.status}` })),
    preserve:measuredStatus === 'pass' ? ['Canvas Ratio: preserve current success'] : [],
    correct:measuredStatus === 'warn' ? ['Canvas Ratio: correct current failure'] : [],
    unresolved:[],
    promptAppendix:'ITERATION / EVALUATION DELTA'
  };
  return { artifact, human:{'narrative-verb':{status:'pass'}}, report, delta };
}

function persistedEvaluated({ id, projectId='p1', sequenceId='q1', shotId, parentArtifactId=null, rootArtifactId=id, generationIndex=1, measuredStatus='pass', continuityProvenance=null }) {
  const artifact = generationArtifact(id, parentArtifactId, continuityProvenance);
  const detail = evaluationDetail(artifact, measuredStatus);
  return {
    ...artifact,
    projectId, sequenceId, shotId, parentArtifactId, rootArtifactId, generationIndex,
    evaluation:detail.report, humanJudgments:detail.human, evaluationDelta:detail.delta,
    persistenceStatus:'persisted', imageBlob:new Blob([`image-${id}`], {type:'image/png'}), imageMimeType:'image/png'
  };
}

function createFakeMemory() {
  const projects = new Map();
  const artifacts = new Map();
  const comparisons = new Map();
  let nextPersistenceStatus = 'persisted';
  return {
    projects, artifacts, comparisons,
    seedProject(row){ projects.set(row.id, clone(row)); },
    seedArtifact(row){ artifacts.set(row.id, clone(row)); },
    seedComparison(row){ comparisons.set(row.id, clone(row)); },
    setNextPersistenceStatus(status){ nextPersistenceStatus = status; },
    async ensureProject(input={}) {
      const previous = projects.get(input.id) || {};
      const row = { ...clone(previous), id:input.id || previous.id || 'p1', title:input.title || previous.title || 'Project', createdAt:input.createdAt || previous.createdAt || '2026-08-28T00:00:00.000Z', updatedAt:input.updatedAt || previous.updatedAt || '2026-08-28T00:00:00.000Z', ...(input.activeSequenceId !== undefined ? {activeSequenceId:input.activeSequenceId} : {}), ...(input.activeShotId !== undefined ? {activeShotId:input.activeShotId} : {}) };
      projects.set(row.id, clone(row)); return clone(row);
    },
    async getProject(id){ return clone(projects.get(id) || null); },
    async getLatestProject(){ return clone([...projects.values()].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0] || null); },
    async listArtifactsForShot(projectId, sequenceId, shotId){ return [...artifacts.values()].filter((row)=>row.projectId===projectId&&row.sequenceId===sequenceId&&row.shotId===shotId).map(clone); },
    async listComparisonsForShot(projectId, sequenceId, shotId){ return [...comparisons.values()].filter((row)=>row.projectId===projectId&&row.sequenceId===sequenceId&&row.shotId===shotId).map(clone); },
    async saveGenerationArtifact({artifact,lineage}) {
      const status = nextPersistenceStatus; nextPersistenceStatus = 'persisted';
      const record = { ...clone(artifact), ...clone(lineage), continuityProvenance:clone(artifact.continuityProvenance || null), persistenceStatus:status, imageBlob:status === 'persisted' ? new Blob(['image'],{type:'image/png'}) : null, imageMimeType:status === 'persisted' ? 'image/png' : null };
      if (status !== 'not_persisted') artifacts.set(record.id, clone(record));
      if (status === 'not_persisted') record.persistenceError = 'quota exceeded';
      return clone(record);
    },
    async saveComparison(row){
      const a = artifacts.get(row.artifactAId); const b = artifacts.get(row.artifactBId);
      if ((a && a.shotId !== row.shotId) || (b && b.shotId !== row.shotId)) throw new Error('comparison crosses Shot boundaries');
      comparisons.set(row.id, clone(row)); return clone(row);
    },
    async estimateStorage(){ return {usage:2048,quota:8192}; },
    async deleteSubtree(id){
      const start = artifacts.get(id); if (!start) return [];
      const ids=[]; const visit=(current)=>{ if(ids.includes(current)) return; ids.push(current); for(const row of artifacts.values()) if(row.shotId===start.shotId && row.parentArtifactId===current) visit(row.id); };
      visit(id); ids.forEach((x)=>artifacts.delete(x)); return ids;
    },
    async clearProject(projectId){ for(const [id,row] of artifacts) if(row.projectId===projectId) artifacts.delete(id); for(const [id,row] of comparisons) if(row.projectId===projectId) comparisons.delete(id); projects.delete(projectId); }
  };
}

(async () => {
  const runnerCalls=[];
  const root={ VisualDirectionOS:{generation:{generate:async()=>null}} };
  const browserRunner=createBrowserGenerationRunner({
    root,
    runGenerationIteration:async(input)=>{ runnerCalls.push(input); return {id:'branch'}; },
    applyIterationDelta:(request,delta)=>({...request,prompt:`${request.prompt}\n\n${delta.promptAppendix}`})
  });
  const rootArtifact=generationArtifact('root');
  rootArtifact.evaluationDelta=evaluationDetail(rootArtifact).delta;
  assert.equal((await browserRunner({artifact:rootArtifact,promptAppendix:'ITERATION / DIRECTOR MEMORY'})).id,'branch');
  assert.equal(runnerCalls.length,1);

  const memory=createFakeMemory();
  memory.seedProject({id:'p1',title:'Project',createdAt:'2026-08-28T00:00:00.000Z',updatedAt:'2026-08-28T01:00:00.000Z',activeSequenceId:'q1',activeShotId:'s1'});
  memory.seedArtifact(persistedEvaluated({id:'g1',shotId:'s1',generationIndex:1}));
  memory.seedArtifact(persistedEvaluated({id:'g2',shotId:'s1',parentArtifactId:'g1',rootArtifactId:'g1',generationIndex:2}));
  memory.seedArtifact(persistedEvaluated({id:'h1',shotId:'s2',generationIndex:1,continuityProvenance:{sourceShotId:'s1',sourceArtifactId:'g2',status:'resolved'}}));
  memory.seedComparison({id:'g1::g2',projectId:'p1',sequenceId:'q1',shotId:'s1',artifactAId:'g1',artifactBId:'g2',directorJudgments:{},comparison:{summary:{stablePass:1}},updatedAt:'2026-08-28T00:00:00.000Z'});

  const emitted=[]; const revoked=[]; let urlCounter=0; const generationRuns=[];
  const controller=createM4Controller({
    memory,compareArtifacts,deriveMemoryForPath,compileMemoryAppendix,
    generationRunner:async(input)=>{generationRuns.push(clone(input));return {id:`branch-${generationRuns.length}`,iterationOf:input.artifact.id};},
    now:()=> '2026-08-28T02:00:00.000Z',
    createObjectURL:()=>`blob:m4-${++urlCounter}`,
    revokeObjectURL:(url)=>revoked.push(url),
    onState:(state)=>emitted.push(state)
  });

  await controller.openShot({projectId:'p1',sequenceId:'q1',shotId:'s1'});
  let state=controller.getState();
  assert.equal(state.activeSequenceId,'q1');
  assert.equal(state.activeShotId,'s1');
  assert.deepEqual(state.artifacts.map((a)=>a.id),['g1','g2']);
  assert.deepEqual(state.comparisons.map((c)=>c.id),['g1::g2']);
  assert.equal(state.selectedAId,'g1');
  assert.equal(state.selectedBId,'g2');
  const s1Url=await controller.getRenderableImage('g2');

  await controller.openShot({projectId:'p1',sequenceId:'q1',shotId:'s2'});
  state=controller.getState();
  assert.deepEqual(state.artifacts.map((a)=>a.id),['h1']);
  assert.equal(state.comparisons.length,0);
  await assert.rejects(()=>controller.selectA('g1'),/Unknown A artifact/);
  assert.equal(revoked.includes(s1Url),true,'switching Shots must revoke prior object URLs');

  const h2=generationArtifact('h2','h1',{sourceShotId:'s1',sourceArtifactId:'g2',status:'resolved'});
  const ingested=await controller.ingestGeneration(h2);
  assert.equal(ingested.parentArtifactId,'h1');
  assert.equal(ingested.rootArtifactId,'h1');
  assert.equal(ingested.sequenceId,'q1');
  assert.equal(ingested.shotId,'s2');
  assert.equal(ingested.continuityProvenance.sourceArtifactId,'g2');
  assert.notEqual(ingested.parentArtifactId,ingested.continuityProvenance.sourceArtifactId);
  const persisted=await controller.ingestEvaluation(evaluationDetail(h2,'pass'));
  assert.equal(persisted.parentArtifactId,'h1');
  assert.equal(persisted.continuityProvenance.sourceArtifactId,'g2');
  const stored=memory.artifacts.get('h2');
  assert.equal(stored.shotId,'s2');
  assert.equal(stored.parentArtifactId,'h1');
  assert.equal(stored.continuityProvenance.sourceArtifactId,'g2');
  const comparison=memory.comparisons.get('h1::h2');
  assert.equal(comparison.sequenceId,'q1');
  assert.equal(comparison.shotId,'s2');

  await assert.rejects(
    ()=>controller.ingestGeneration(generationArtifact('bad-parent','g1',{sourceShotId:'s1',sourceArtifactId:'g2',status:'resolved'})),
    /not in the Active Shot/
  );

  await controller.setSemanticJudgment('narrative-verb','improved','Reads better.');
  assert.equal(controller.getState().memory.locked.some((x)=>x.checkId==='narrative-verb'),true);
  const branch=await controller.redirectFromArtifact('h1');
  assert.equal(branch.iterationOf,'h1');
  assert.equal(generationRuns[0].artifact.id,'h1');

  memory.setNextPersistenceStatus('not_persisted');
  const h3=generationArtifact('h3','h2',{sourceShotId:'s1',sourceArtifactId:'g2',status:'resolved'});
  await controller.ingestGeneration(h3);
  await controller.ingestEvaluation(evaluationDetail(h3,'pass'));
  assert.match(controller.getState().persistenceWarning,/not persisted/i);
  assert.ok(memory.artifacts.has('h1'));
  assert.ok(memory.artifacts.has('h2'));

  await controller.deleteSubtree('h2');
  assert.deepEqual(controller.getState().artifacts.map((x)=>x.id),['h1']);
  assert.ok(memory.artifacts.has('g1'),'other Shot history must survive same-Shot subtree deletion');

  await controller.openProject('p1');
  assert.equal(controller.getState().activeShotId,'s2','openProject compatibility must honor the persisted Active Shot');
  assert.deepEqual(controller.getState().artifacts.map((x)=>x.id),['h1']);

  const snapshot=controller.getExportSnapshot();
  assert.equal(snapshot.activeShotId,'s2');
  snapshot.artifacts[0].id='mutated';
  assert.equal(controller.getState().artifacts[0].id,'h1');

  memory.seedProject({id:'p2',title:'Newer',createdAt:'2026-08-28T00:00:00.000Z',updatedAt:'2026-08-29T00:00:00.000Z',activeSequenceId:'q2',activeShotId:'s9'});
  memory.seedArtifact(persistedEvaluated({id:'z1',projectId:'p2',sequenceId:'q2',shotId:'s9',generationIndex:1}));
  const restored=createM4Controller({memory,compareArtifacts,deriveMemoryForPath,compileMemoryAppendix,now:()=> '2026-08-28T03:00:00.000Z'});
  await restored.boot({projectId:'missing'});
  assert.equal(restored.getState().project.id,'p2');
  assert.equal(restored.getState().activeShotId,'s9');
  assert.deepEqual(restored.getState().artifacts.map((x)=>x.id),['z1']);

  assert.ok(emitted.length>0);
  console.log('m4 controller tests passed');
})().catch((error)=>{ console.error(error); process.exit(1); });