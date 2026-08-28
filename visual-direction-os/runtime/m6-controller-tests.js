const assert = require('node:assert/strict');
const { createM6Controller } = require('./m6-controller.js');

function clone(value) { return value == null ? value : structuredClone(value); }

function createMemory() {
  let bundle = {
    project:{ id:'p1', title:'Legacy', createdAt:'2026-08-01T00:00:00.000Z', updatedAt:'2026-08-01T00:00:00.000Z' },
    sequences:[], shots:[],
    artifacts:[
      { id:'g1', projectId:'p1', rootArtifactId:'g1', parentArtifactId:null, generationIndex:1 },
      { id:'g2', projectId:'p1', rootArtifactId:'g1', parentArtifactId:'g1', generationIndex:2 }
    ],
    comparisons:[{ id:'g1::g2', projectId:'p1', artifactAId:'g1', artifactBId:'g2' }]
  };
  return {
    async getProject(id){ return id === bundle.project.id ? clone(bundle.project) : null; },
    async getLatestProject(){ return clone(bundle.project); },
    async ensureProject(input={}) { bundle.project={...bundle.project,...clone(input)}; return clone(bundle.project); },
    async loadProjectBundle(id){ if(id!==bundle.project.id) return {project:null,sequences:[],shots:[],artifacts:[],comparisons:[]}; return clone(bundle); },
    async commitProjectBundle(input){
      if (input.mode !== 'replace') throw new Error('test memory expects replace');
      bundle={ project:clone(input.project), sequences:clone(input.sequences||[]), shots:clone(input.shots||[]), artifacts:clone(input.artifacts||[]), comparisons:clone(input.comparisons||[]) };
      return { project:clone(bundle.project) };
    },
    async putSequence(row){ bundle.sequences=bundle.sequences.filter((x)=>x.id!==row.id).concat(clone(row)); return clone(row); },
    async putShot(row){ bundle.shots=bundle.shots.filter((x)=>x.id!==row.id).concat(clone(row)); return clone(row); },
    snapshot(){ return clone(bundle); }
  };
}

(async () => {
  const memory = createMemory();
  const m4Calls=[];
  const m4={ async openShot(ctx){ m4Calls.push(clone(ctx)); } };
  let tick=0;
  const controller=createM6Controller({
    memory,m4,
    now:()=>`2026-08-28T00:00:0${tick++}.000Z`,
    makeSequenceId:()=>`q-new-${tick}`,
    makeShotId:()=>`s-new-${tick}`
  });

  const state=await controller.boot({projectId:'p1'});
  assert.equal(state.sequences.length,1);
  assert.equal(state.shots.length,1);
  assert.equal(state.activeShotId,state.shots[0].id);
  assert.deepEqual(m4Calls.at(-1),{projectId:'p1',sequenceId:state.sequences[0].id,shotId:state.shots[0].id});
  const migrated=await memory.loadProjectBundle('p1');
  assert.deepEqual(migrated.artifacts.map((x)=>x.id),['g1','g2']);
  assert.equal(migrated.artifacts[0].shotId,state.shots[0].id);
  assert.equal(migrated.shots[0].approvedArtifactId,null);
  assert.equal(controller.resolveContinuity(state.shots[0].id).status,'not_applicable');

  const seq2=await controller.createSequence({title:'Sequence 02',intent:'Gwen street passage'});
  assert.equal(seq2.order,2);
  const firstSequenceId=state.sequences[0].id;
  const shot2=await controller.createShot({sequenceId:firstSequenceId,title:'Shot 02',intent:'Gwen reveal'});
  assert.equal(shot2.continuityMode,'auto');
  assert.equal(shot2.approvedArtifactId,null);
  await controller.setActiveShot(shot2.id);
  assert.equal(controller.getState().activeShotId,shot2.id);
  assert.equal(controller.getState().activeSequenceId,firstSequenceId);
  assert.deepEqual(m4Calls.at(-1),{projectId:'p1',sequenceId:firstSequenceId,shotId:shot2.id});

  const renamed=await controller.updateSequence(seq2.id,{title:'Street Sequence'});
  assert.equal(renamed.title,'Street Sequence');
  const updatedShot=await controller.updateShot(shot2.id,{intent:'Reveal Gwen from street level'});
  assert.equal(updatedShot.intent,'Reveal Gwen from street level');

  const shot3=await controller.createShot({sequenceId:firstSequenceId,title:'Shot 03'});
  await controller.reorderShots(firstSequenceId,[shot3.id,state.shots[0].id,shot2.id]);
  assert.deepEqual(controller.getState().shots.filter((x)=>x.sequenceId===firstSequenceId).map((x)=>x.id),[shot3.id,state.shots[0].id,shot2.id]);

  await controller.deleteShot(shot2.id);
  assert.equal(controller.getState().shots.some((x)=>x.id===shot2.id),false);
  assert.ok(controller.getState().shots.some((x)=>x.id===shot3.id));

  const seq2Shot=await controller.createShot({sequenceId:seq2.id,title:'Only Shot'});
  await controller.deleteSequence(seq2.id);
  assert.equal(controller.getState().sequences.some((x)=>x.id===seq2.id),false);
  assert.equal(controller.getState().shots.some((x)=>x.id===seq2Shot.id),false);
  assert.ok(controller.getState().shots.some((x)=>x.id===shot3.id));

  console.log('m6 controller tests passed');
})().catch((error)=>{console.error(error);process.exit(1);});
