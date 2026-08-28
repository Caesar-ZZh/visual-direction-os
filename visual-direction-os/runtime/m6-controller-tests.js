const assert = require('node:assert/strict');
const { createM6Controller } = require('./m6-controller.js');

const clone = (v) => v == null ? v : structuredClone(v);
const blob = (text) => new Blob([text], {type:'image/webp'});

function createMemory(seed) {
  let bundle = clone(seed);
  const byId = (rows,id) => rows.find((x)=>x.id===id) || null;
  return {
    async getProject(id){ return id===bundle.project.id ? clone(bundle.project) : null; },
    async getLatestProject(){ return clone(bundle.project); },
    async ensureProject(input={}){ bundle.project={...bundle.project,...clone(input)}; return clone(bundle.project); },
    async loadProjectBundle(id){ return id===bundle.project.id ? clone(bundle) : {project:null,sequences:[],shots:[],artifacts:[],comparisons:[]}; },
    async commitProjectBundle(input){
      if (input.mode!=='replace') throw new Error('test memory expects replace');
      bundle={project:clone(input.project),sequences:clone(input.sequences||[]),shots:clone(input.shots||[]),artifacts:clone(input.artifacts||[]),comparisons:clone(input.comparisons||[])};
      return {project:clone(bundle.project)};
    },
    async putSequence(row){ bundle.sequences=bundle.sequences.filter((x)=>x.id!==row.id).concat(clone(row)); return clone(row); },
    async putShot(row){ bundle.shots=bundle.shots.filter((x)=>x.id!==row.id).concat(clone(row)); return clone(row); },
    async getShot(id){ return clone(byId(bundle.shots,id)); },
    snapshot(){ return clone(bundle); }
  };
}

function seedProject() {
  return {
    project:{id:'p2',title:'Sequence Project',createdAt:'2026-08-28T00:00:00.000Z',updatedAt:'2026-08-28T00:00:00.000Z',activeSequenceId:'q1',activeShotId:'s2'},
    sequences:[
      {id:'q1',projectId:'p2',order:1,title:'Main',intent:'Move from isolation to action',createdAt:'a',updatedAt:'a'},
      {id:'q2',projectId:'p2',order:2,title:'Other',intent:'Other sequence',createdAt:'a',updatedAt:'a'}
    ],
    shots:[
      {id:'s1',projectId:'p2',sequenceId:'q1',order:1,title:'One',intent:'Establish Miles',approvedArtifactId:null,continuityMode:'auto',continuitySourceShotId:null,continuityReview:null,continuityInvalidation:null,createdAt:'a',updatedAt:'a'},
      {id:'s2',projectId:'p2',sequenceId:'q1',order:2,title:'Two',intent:'Move closer',approvedArtifactId:null,continuityMode:'auto',continuitySourceShotId:null,continuityReview:null,continuityInvalidation:null,createdAt:'a',updatedAt:'a'},
      {id:'s3',projectId:'p2',sequenceId:'q1',order:3,title:'Three',intent:'Reaction',approvedArtifactId:null,continuityMode:'auto',continuitySourceShotId:null,continuityReview:null,continuityInvalidation:null,createdAt:'a',updatedAt:'a'},
      {id:'s4',projectId:'p2',sequenceId:'q2',order:1,title:'Other shot',intent:'',approvedArtifactId:null,continuityMode:'auto',continuitySourceShotId:null,continuityReview:null,continuityInvalidation:null,createdAt:'a',updatedAt:'a'}
    ],
    artifacts:[
      {id:'g1',projectId:'p2',sequenceId:'q1',shotId:'s1',rootArtifactId:'g1',parentArtifactId:null,generationIndex:1,imageBlob:blob('g1'),continuityProvenance:{sourceShotId:null,sourceArtifactId:null,status:'not_applicable'}},
      {id:'g2',projectId:'p2',sequenceId:'q1',shotId:'s1',rootArtifactId:'g1',parentArtifactId:'g1',generationIndex:2,imageBlob:blob('g2'),continuityProvenance:{sourceShotId:null,sourceArtifactId:null,status:'not_applicable'}},
      {id:'h1',projectId:'p2',sequenceId:'q1',shotId:'s2',rootArtifactId:'h1',parentArtifactId:null,generationIndex:1,imageBlob:blob('h1'),continuityProvenance:{sourceShotId:'s1',sourceArtifactId:'g1',status:'resolved'}},
      {id:'k1',projectId:'p2',sequenceId:'q1',shotId:'s3',rootArtifactId:'k1',parentArtifactId:null,generationIndex:1,imageBlob:blob('k1'),continuityProvenance:{sourceShotId:'s2',sourceArtifactId:'h1',status:'resolved'}},
      {id:'x1',projectId:'p2',sequenceId:'q2',shotId:'s4',rootArtifactId:'x1',parentArtifactId:null,generationIndex:1,imageBlob:blob('x1'),continuityProvenance:{sourceShotId:null,sourceArtifactId:null,status:'not_applicable'}}
    ],
    comparisons:[]
  };
}

function makeController(memory) {
  const m4Calls=[];
  let tick=0;
  const controller=createM6Controller({memory,m4:{async openShot(ctx){m4Calls.push(clone(ctx));}},now:()=>`2026-08-28T00:00:${String(tick++).padStart(2,'0')}.000Z`});
  return {controller,m4Calls};
}

(async()=>{
  {
    const legacy={
      project:{id:'p1',title:'Legacy',createdAt:'2026-08-01T00:00:00.000Z',updatedAt:'2026-08-01T00:00:00.000Z'},
      sequences:[],shots:[],
      artifacts:[
        {id:'lg1',projectId:'p1',rootArtifactId:'lg1',parentArtifactId:null,generationIndex:1},
        {id:'lg2',projectId:'p1',rootArtifactId:'lg1',parentArtifactId:'lg1',generationIndex:2}
      ],
      comparisons:[{id:'lg1::lg2',projectId:'p1',artifactAId:'lg1',artifactBId:'lg2'}]
    };
    const memory=createMemory(legacy);
    const {controller,m4Calls}=makeController(memory);
    const state=await controller.boot({projectId:'p1'});
    assert.equal(state.sequences.length,1);
    assert.equal(state.shots.length,1);
    assert.equal(state.shots[0].approvedArtifactId,null);
    assert.equal(state.activeShotId,state.shots[0].id);
    assert.deepEqual(m4Calls.at(-1),{projectId:'p1',sequenceId:state.sequences[0].id,shotId:state.shots[0].id});
    assert.deepEqual((await memory.loadProjectBundle('p1')).artifacts.map((x)=>x.id),['lg1','lg2']);
    const seq2=await controller.createSequence({title:'Sequence 02',intent:'Second passage'});
    assert.equal(seq2.order,2);
    const shot2=await controller.createShot({sequenceId:state.sequences[0].id,title:'Shot 02',intent:'Reveal'});
    assert.equal(shot2.continuityMode,'auto');
    assert.equal(shot2.approvedArtifactId,null);
    await controller.setActiveShot(shot2.id);
    assert.equal(controller.getState().activeShotId,shot2.id);
    await controller.updateSequence(seq2.id,{title:'Renamed'});
    assert.equal(controller.getState().sequences.find((x)=>x.id===seq2.id).title,'Renamed');
    await controller.updateShot(shot2.id,{intent:'Updated reveal'});
    assert.equal(controller.getState().shots.find((x)=>x.id===shot2.id).intent,'Updated reveal');
  }

  {
    const memory=createMemory(seedProject());
    const {controller}=makeController(memory);
    await controller.boot({projectId:'p2'});
    await controller.setApprovedFrame('s1','g1');
    await controller.setApprovedFrame('s2','h1');
    await controller.setApprovedFrame('s3','k1');
    await controller.setApprovedFrame('s1','g2');
    assert.equal(controller.resolveContinuity('s2').sourceArtifactId,'g2');
    assert.equal(controller.getState().continuityByShotId.s2,'review_required');
    assert.equal(controller.getState().continuityByShotId.s3,'review_required');
    assert.equal(controller.getState().shots.find((x)=>x.id==='s2').approvedArtifactId,'h1');

    await controller.acceptCurrentContinuity('s2','still works');
    let s2=controller.getState().shots.find((x)=>x.id==='s2');
    assert.equal(s2.continuityReview.reviewedArtifactId,'h1');
    assert.equal(s2.continuityReview.sourceArtifactId,'g2');
    assert.equal(controller.getState().continuityByShotId.s2,'current');
    assert.equal(controller.getState().continuityByShotId.s3,'review_required');

    await controller.setActiveShot('s2');
    const prepared=await controller.prepareGeneration({ordinaryReferences:[{role:'character',source:'data:image/png;base64,AA=='}]});
    assert.equal(prepared.sequenceIntent,'Move from isolation to action');
    assert.equal(prepared.shotIntent,'Move closer');
    assert.equal(prepared.continuity.reference.sourceArtifactId,'g2');
    assert.ok(prepared.continuity.reference.imageBlob instanceof Blob);
    assert.deepEqual(prepared.continuityProvenance,{sourceShotId:'s1',sourceArtifactId:'g2',status:'resolved'});
    assert.equal(prepared.ordinaryReferences.length,1);

    await controller.clearApprovedFrame('s1');
    assert.equal(controller.getState().continuityByShotId.s2,'source_missing');
    assert.equal(controller.getState().continuityByShotId.s3,'review_required');

    await controller.setApprovedFrame('s1','g2');
    await controller.acceptCurrentContinuity('s2');
    await controller.setContinuityManual('s3','s1');
    await controller.reorderShots('q1',['s3','s1','s2']);
    const s3=controller.getState().shots.find((x)=>x.id==='s3');
    assert.equal(s3.continuitySourceShotId,'s1');
    assert.equal(controller.getState().continuityByShotId.s3,'source_out_of_order');
    const outOfOrderPrepared=await controller.setActiveShot('s3').then(()=>controller.prepareGeneration());
    assert.equal(outOfOrderPrepared.continuity.sourceArtifactId,'g2');
    assert.equal(outOfOrderPrepared.continuityProvenance.status,'resolved');
    await controller.setContinuityAuto('s3');
    assert.equal(controller.getState().shots.find((x)=>x.id==='s3').continuitySourceShotId,null);

    await assert.rejects(()=>controller.setContinuityManual('s2','s4'),/same Sequence/);
    await assert.rejects(()=>controller.setApprovedFrame('s2','g1'),/same Shot/);
  }

  {
    const seed=seedProject();
    seed.shots.find((x)=>x.id==='s1').approvedArtifactId='g1';
    seed.shots.find((x)=>x.id==='s2').approvedArtifactId='h1';
    seed.shots.find((x)=>x.id==='s3').approvedArtifactId='k1';
    const memory=createMemory(seed);
    const {controller}=makeController(memory);
    await controller.boot({projectId:'p2'});
    const impact=controller.getContinuityImpact('s1');
    assert.deepEqual(impact.directDependents,['s2']);
    assert.deepEqual(impact.descendants.sort(),['s2','s3']);
    await controller.deleteShot('s1');
    assert.ok(controller.getState().shots.some((x)=>x.id==='s2'));
    assert.ok(controller.getState().shots.some((x)=>x.id==='s3'));
    assert.equal(controller.getState().continuityByShotId.s2,'source_missing');
    assert.equal(controller.getState().continuityByShotId.s3,'review_required');
    const s2=controller.getState().shots.find((x)=>x.id==='s2');
    assert.equal(s2.continuityMode,'auto');
    assert.equal(s2.continuityInvalidation.directSourceDeleted,true);
    await controller.setContinuityAuto('s2');
    assert.equal(controller.getState().shots.find((x)=>x.id==='s2').continuityInvalidation?.directSourceDeleted||false,false);
  }

  {
    const seed=seedProject();
    seed.shots.find((x)=>x.id==='s1').approvedArtifactId='g2';
    seed.artifacts.find((x)=>x.id==='g2').imageBlob=null;
    const memory=createMemory(seed);
    const {controller}=makeController(memory);
    await controller.boot({projectId:'p2'});
    await controller.setActiveShot('s2');
    const prepared=await controller.prepareGeneration();
    assert.equal(prepared.continuity.reference,null);
    assert.deepEqual(prepared.continuityProvenance,{sourceShotId:'s1',sourceArtifactId:'g2',status:'unavailable_at_generation'});
  }

  console.log('m6 controller task5 tests passed');
})().catch((error)=>{console.error(error);process.exit(1);});
