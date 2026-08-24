const test=require('node:test');
const assert=require('node:assert/strict');
const promptIR=require('./generation-prompt-ir.js');

const unknown=()=>({value:'UNKNOWN',status:'unknown',evidenceStatus:'unresolved'});
const visualIR={
  schemaVersion:'0.3.0',mode:'shadow',source:{readingId:'reading-01',strategyId:'strategy-01',grammarId:'camera-authority-transfer'},
  narrative:{problem:{value:'control'},coreConflict:{value:'obedience vs agency'},startingState:{value:'compliance'},endingState:{value:'refusal'},turningPoint:{value:'recognition'}},
  direction:{primaryVariable:{value:'Camera',status:'known'},supportingVariables:{value:['Space'],status:'known'},restrainedVariables:{value:['Texture'],status:'known'},mechanism:{value:'camera authority follows agency',status:'known'},rationale:{value:'camera carries control transfer',status:'known'}},
  agency:{transition:{value:['world','character']}},
  grammar:{id:'camera-authority-transfer',status:'resolved',contractStatus:'executable',evidenceStatus:'supported',evidenceTier:'calibrated',refs:[],guards:[]},
  visual:{character:unknown(),world:unknown(),composition:unknown(),camera:{value:{authority:'agency-linked'},status:'known',evidenceStatus:'supported'},hierarchy:unknown(),shape:unknown(),value:unknown(),color:unknown(),edge:unknown(),detail:unknown(),medium:unknown(),texture:unknown(),fx:unknown(),temporal:unknown(),space:unknown(),line:unknown(),rhythm:unknown()},
  constraints:{antiRules:{value:['Do not change camera authority without narrative cause.'],status:'known',source:'grammar:camera-authority-transfer'}},
  evidence:{status:'supported',confidence:'high',unresolved:['medium','texture'],gaps:[{field:'temporal.signature',status:'evidence_incomplete',confidence:0.42}],refs:[]}
};
const skeletonBeat={id:'setup',label:'SETUP',structure:{primaryVariable:'Camera',supportingVariables:['Space'],restrainedVariables:['Texture']},patchSlots:{'camera.perspective':{status:'compiler-derived',support:'supported',owner:'compiler'},'color.temperature':{status:'open',support:'open',owner:'ai'},'space.depth':{status:'blocked',support:'blocked',owner:'none',source:'camera-authority-transfer',why:'not justified'}}};
const proposalBeat={id:'setup',label:'SETUP',narrativeBeat:'The world still holds the frame.',agency:'world',primaryVariable:'Camera',supportingVariables:['Space'],restrainedVariables:['Texture'],visualEvents:['enter'],sceneStatePatch:{agency:'world',variables:{camera:{perspective:'world'},color:{temperature:'cool'}}},rationale:'Establish world authority.'};
const sequenceProvenance={origin:'compiler-first',skeletonVersion:'0.1.0',grammarId:'camera-authority-transfer',fields:{'setup.camera.perspective':{owner:'compiler',support:'supported',source:'camera-authority-transfer',projectConstraintIds:['constraint-1']},'setup.color.temperature':{owner:'ai',support:'open',source:'sequence-completion'},'setup.agency':{owner:'compiler',support:'supported',source:'agency-constraint'}},projectConstraints:{registryVersion:'0.1.0',resolutions:[{constraintId:'constraint-1',revision:1,result:'satisfied',beatId:'setup',path:'camera.perspective'}]}};
const baseArgs={sceneId:'scene-03',narrativeInput:'A young employee enters the office.',confirmedReading:{id:'reading-01'},selectedStrategy:{id:'strategy-01',primaryVariable:'Camera'},visualIR,skeletonBeat,proposalBeat,sequenceProvenance,projectResolutions:[{constraintId:'constraint-1',revision:1,status:'SATISFIED',beatId:'setup',path:'camera.perspective'}],compileState:{phase:'proposal',applyRevision:null}};

test('maps structural, exact, guided, open, blocked, anti-rule and content authority',()=>{
 const ir=promptIR.buildGenerationPromptIR(baseArgs);
 assert.ok(ir.required.some(item=>item.kind==='exact'&&item.path==='camera.perspective'&&item.owner==='compiler'&&item.value==='world'));
 assert.ok(ir.required.some(item=>item.kind==='exact'&&item.path==='agency'&&item.value==='world'));
 assert.ok(ir.guided.some(item=>item.path==='color.temperature'&&item.owner==='ai'&&item.value==='cool'));
 assert.ok(ir.open.some(item=>item.field==='medium'));
 assert.ok(ir.blocked.some(item=>item.path==='space.depth'));
 assert.deepEqual(ir.required.find(item=>item.path==='camera.perspective').projectSupport.map(item=>item.constraintId),['constraint-1']);
 assert.equal(ir.antiRules.length,1);
 assert.equal(ir.content.sceneDescription.owner,'director');
 assert.equal(ir.content.beatRealization.owner,'ai');
 assert.equal(ir.meta.sourceVisualIRVersion,'0.3.0');
 assert.match(ir.fingerprint,/^pir-[0-9a-f]{16}$/);
});

test('evidence gaps are data-driven and unresolved fields are de-duplicated',()=>{
 const ir=promptIR.buildGenerationPromptIR(baseArgs);
 assert.deepEqual(ir.evidenceGaps.find(g=>g.field==='temporal.signature'),{field:'temporal.signature',status:'evidence_incomplete',confidence:0.42,source:'visual-ir'});
 assert.equal(ir.evidenceGaps.filter(g=>g.field==='medium').length,1);
 assert.equal(ir.evidenceGaps.find(g=>g.field==='medium').status,'unresolved');
});

test('authority escalation is rejected',()=>{
 const valid=promptIR.buildGenerationPromptIR(baseArgs);
 assert.throws(()=>promptIR.validatePromptIR({...valid,required:[{kind:'exact',path:'color.temperature',value:'cool',owner:'ai',authorityClass:'required'}]}),e=>e?.code==='AUTHORITY_ESCALATION');
 assert.throws(()=>promptIR.validatePromptIR({...valid,required:[{kind:'exact',path:'medium',value:'painterly',owner:'none',authorityClass:'required'}]}),e=>e?.code==='AUTHORITY_ESCALATION');
});

test('malformed source and malformed Visual IR fail with controlled domain codes',()=>{
 assert.throws(()=>promptIR.buildGenerationPromptIR({...baseArgs,sceneId:''}),e=>e?.code==='PROMPT_SOURCE_INVALID');
 assert.throws(()=>promptIR.buildGenerationPromptIR({...baseArgs,visualIR:{}}),e=>e?.code==='VISUAL_IR_INVALID');
 assert.throws(()=>promptIR.buildGenerationPromptIR({...baseArgs,sequenceProvenance:{origin:'compiler-first',fields:{'setup.camera.perspective':{owner:'compiler',support:'supported'}}},proposalBeat:{...proposalBeat,sceneStatePatch:{agency:'world',variables:{}}}}),e=>e?.code==='PROMPT_SOURCE_INVALID');
});

test('fingerprint ignores generatedAt metadata but changes with semantic values',()=>{
 const first=promptIR.buildGenerationPromptIR(baseArgs);
 const withTime=structuredClone(first);withTime.meta.generatedAt='later';
 assert.equal(promptIR.fingerprintPromptIR(first),promptIR.fingerprintPromptIR(withTime));
 const changed=structuredClone(first);changed.guided[0].value='warm';
 assert.notEqual(promptIR.fingerprintPromptIR(first),promptIR.fingerprintPromptIR(changed));
});

test('readProposalPath supports agency, ownership and variables paths',()=>{
 const beat={sceneStatePatch:{agency:'shared',ownership:{character:'high'},variables:{camera:{perspective:'mixed'}}}};
 assert.equal(promptIR.readProposalPath(beat,'agency'),'shared');
 assert.equal(promptIR.readProposalPath(beat,'ownership.character'),'high');
 assert.equal(promptIR.readProposalPath(beat,'camera.perspective'),'mixed');
});

test('project support requires both current SATISFIED resolution and stored compiler annotation',()=>{
 const args=structuredClone(baseArgs);
 args.projectResolutions.push({constraintId:'constraint-ghost',revision:1,status:'SATISFIED',beatId:'setup',path:'camera.perspective'});
 const ir=promptIR.buildGenerationPromptIR(args);
 assert.deepEqual(ir.source.projectConstraints.map(item=>item.constraintId),['constraint-1']);
 assert.deepEqual(ir.provenance.projectConstraintRefs.map(item=>item.constraintId),['constraint-1']);
});
