const test = require('node:test');
const assert = require('node:assert/strict');
const compiler = require('./generation-prompt-compiler.js');
const skeletonApi = require('./visual-sequence-skeleton.js');
const completionApi = require('./visual-sequence-completion.js');
const narrativeApply = require('./narrative-apply.js');
const applyEvidence = require('./generation-prompt-apply-evidence.js');
const registryApi = require('./project-constraint-registry.js');
const candidateApi = require('./project-constraint-candidates.js');
const authorityApi = require('./project-constraint-authority.js');
const contracts = require('./narrative-contracts.js');

const clone = value => JSON.parse(JSON.stringify(value));
const unknown = field => ({ value:'UNKNOWN', status:'unknown', evidenceStatus:'unresolved', source:'not-yet-compiled', basis:`${field} unresolved` });

function reading(start = 'world', end = 'character') {
  const field = value => ({ value, sourceType:'explicit', basis:'fixture' });
  return {
    id:'reading-01', title:'Control transfer', confidence:'high',
    narrativeProblem:field('control'), coreConflict:field('obedience vs agency'),
    startingState:field('compliance'), endingState:field('refusal'), turningPoint:field('recognition'),
    agencyTransition:{ value:[start,end], sourceType:'explicit', basis:'fixture' }
  };
}

function strategy() {
  return {
    id:'strategy-01', title:'Camera authority', grammarId:'camera-authority-transfer',
    primaryVariable:'camera', supportingVariables:['space'], restrainedVariables:['texture'],
    mechanism:'camera authority follows agency', rationale:'camera carries the transfer'
  };
}

function visualIRFor(confirmedReading = reading()) {
  const visual = Object.fromEntries(['character','world','composition','camera','hierarchy','shape','value','color','edge','detail','medium','texture','fx','temporal','space','line','rhythm'].map(field => [field, unknown(field)]));
  visual.camera = { value:{authority:'agency-linked'}, status:'known', evidenceStatus:'supported', source:'grammar:camera-authority-transfer', confidence:'high' };
  return {
    schemaVersion:'0.3.0', mode:'shadow',
    source:{readingId:confirmedReading.id,strategyId:'strategy-01',grammarId:'camera-authority-transfer',contract:'fixture'},
    narrative:{problem:clone(confirmedReading.narrativeProblem),coreConflict:clone(confirmedReading.coreConflict),startingState:clone(confirmedReading.startingState),endingState:clone(confirmedReading.endingState),turningPoint:clone(confirmedReading.turningPoint)},
    direction:{
      primaryVariable:{value:'camera',status:'known',evidenceStatus:'supported',source:'selected-strategy',confidence:'high'},
      supportingVariables:{value:['space'],status:'known',evidenceStatus:'supported',source:'selected-strategy',confidence:'high'},
      restrainedVariables:{value:['texture'],status:'known',evidenceStatus:'supported',source:'selected-strategy',confidence:'high'},
      mechanism:{value:'camera authority follows agency',status:'known',evidenceStatus:'supported',source:'selected-strategy',confidence:'high'},
      rationale:{value:'camera carries the transfer',status:'known',evidenceStatus:'supported',source:'selected-strategy',confidence:'high'}
    },
    agency:{transition:{value:clone(confirmedReading.agencyTransition.value),status:'known',evidenceStatus:'supported',source:'confirmed-reading',confidence:'high'}},
    grammar:{id:'camera-authority-transfer',label:'Camera Authority Transfer',status:'resolved',contractStatus:'executable',evidenceStatus:'supported',evidenceTier:'calibrated',refs:[],guards:[]},
    visual,
    constraints:{antiRules:{value:['Do not change camera authority without narrative cause.'],status:'known',evidenceStatus:'supported',source:'grammar:camera-authority-transfer',confidence:'high'}},
    evidence:{status:'supported',confidence:'high',unresolved:['medium','texture'],refs:[]}
  };
}

function completionFor(skeleton) {
  const agencies = skeleton.agencyConstraint.start === 'contested'
    ? ['contested','contested','shared','shared','character']
    : ['world','contested','contested','shared','character'];
  return { sequenceCompletion:{ beats:skeleton.beats.map((beat,index) => ({
    id:beat.id,
    narrativeBeat:`Narrative ${beat.id}`,
    agency:agencies[index],
    visualEvents:[`event-${beat.id}`],
    rationale:`Rationale ${beat.id}`,
    openPatch:{variables:{color:{temperature:index < 2 ? 'cool' : 'neutral'}}}
  })) } };
}

function baseSequence() {
  return {
    beats:contracts.BEAT_IDS.map((id,index) => ({
      id,
      label:['SETUP','PRESSURE','RUPTURE','RELEASE','NEW OWNERSHIP'][index],
      start:index / 5,
      end:(index + 1) / 5,
      narrativePurpose:`old-${id}`,
      primaryVariable:'space', supportingVariables:[], restrainedVariables:[], scenePatch:{}
    })),
    events:[]
  };
}

function merge(base, patch) {
  const next = clone(base || {});
  Object.entries(patch || {}).forEach(([key,value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) next[key] = merge(next[key] || {}, value);
    else next[key] = clone(value);
  });
  return next;
}

function buildContext({ appliedBeatIds = [], activeBeatId = 'setup', confirmedReading = reading(), projectConstraintContext = null, projectResolutions = [] } = {}) {
  const selectedStrategy = strategy();
  const visualIR = visualIRFor(confirmedReading);
  const skeleton = skeletonApi.compileSequenceSkeleton({confirmedReading,selectedStrategy,visualIR});
  const assembled = completionApi.assembleSequenceProposal({
    skeleton,
    completion:completionFor(skeleton),
    visualIR,
    projectConstraintResolutions:projectResolutions,
    projectConstraintRegistryVersion:'0.1.0'
  });
  const proposal = assembled.sequenceProposal;
  const provenance = assembled.sequenceProvenance;
  const sequence = narrativeApply.buildSequenceFromProposal(proposal,baseSequence(),appliedBeatIds);
  let sequenceApplyState = applyEvidence.createEmptySequenceApplyState();
  if (appliedBeatIds.length) {
    sequenceApplyState = applyEvidence.recordAppliedBeats(sequenceApplyState,{
      source:{readingId:confirmedReading.id,strategyId:selectedStrategy.id,grammarId:provenance.grammarId,sequenceOrigin:provenance.origin,skeletonVersion:provenance.skeletonVersion},
      proposal,provenance,sequence,beatIds:appliedBeatIds
    });
  }
  const activeProposal = proposal.beats.find(item => item.id === activeBeatId);
  const sceneState = merge({narrativeState:activeBeatId,playhead:0,agency:'world',ownership:{character:'low',world:'high',narrative:'medium'},variables:{}},activeProposal?.sceneStatePatch || {});
  return {
    sceneId:'scene-03',
    narrativeState:{
      input:'A young employee enters the office.', confirmedReading, selectedStrategy,
      sequenceSkeleton:skeleton, sequenceProposal:proposal, sequenceProvenance:provenance, sequenceApplyState
    },
    visualIR, sequence, sceneState, projectConstraintContext
  };
}

function projectConstraintFixture() {
  const projectState = {
    id:'project-1',title:'Film',projectIntent:'',sourceNarrative:'',sceneOrder:['scene-01','scene-02','scene-03'],activeSceneId:'scene-03',scenes:{
      'scene-01':{id:'scene-01',order:1,title:'One',narrativeRole:{role:'setup',narrativeFunction:'Establish.',startingState:'A',endingState:'B',turningPoint:'T1',agencyTransition:['world','world'],relationToPrevious:null},workspace:{narrativeState:{},sceneState:{agency:'world',variables:{camera:{perspective:'world'},color:{territory:'world'}}},sequenceState:null},status:{narrative:'confirmed',visual:'directed',continuity:'pass'}},
      'scene-02':{id:'scene-02',order:2,title:'Two',narrativeRole:{role:'rupture',narrativeFunction:'Contest.',startingState:'B',endingState:'C',turningPoint:'T2',agencyTransition:['world','contested'],relationToPrevious:'Pressure.'},workspace:{narrativeState:{confirmedReading:{id:'reading-2'},selectedStrategy:{id:'strategy-2',grammarId:'camera-authority-transfer'},sequenceSkeleton:{grammarId:'camera-authority-transfer'},sequenceProvenance:{origin:'compiler-first',grammarId:'camera-authority-transfer'},sequenceProposal:{beats:[{id:'new-ownership',sceneStatePatch:{variables:{camera:{perspective:'mixed'}}}}]}},sceneState:{narrativeState:'new-ownership',agency:'contested',variables:{camera:{perspective:'mixed'},color:{territory:'world'}}},sequenceState:{activeBeatId:'new-ownership'}},status:{narrative:'confirmed',visual:'directed',continuity:'pass'}},
      'scene-03':{id:'scene-03',order:3,title:'Three',narrativeRole:{role:'resolution',narrativeFunction:'Resolve.',startingState:'C',endingState:'D',turningPoint:'T3',agencyTransition:['contested','character'],relationToPrevious:'Continue contest.'},workspace:{narrativeState:null,sceneState:null,sequenceState:null},status:{narrative:'defined',visual:'undirected',continuity:'unresolved'}}
    }
  };
  const projectIntelligence={schemaVersion:'0.1.0',mode:'shadow',status:'UNRESOLVED',sceneOrder:clone(projectState.sceneOrder),scenes:[
    {sceneId:'scene-01',order:0,provenanceStatus:'compiler-first',narrativeRole:'SETUP',narrativeAgency:{start:'WORLD',end:'WORLD'},sources:{camera:'compiler-backed',color:'compiler-backed'},integrityFindings:[]},
    {sceneId:'scene-02',order:1,provenanceStatus:'compiler-first',narrativeRole:'RUPTURE',grammarId:'camera-authority-transfer',appliedBeatId:'new-ownership',narrativeAgency:{start:'WORLD',end:'CONTESTED'},sources:{camera:'compiler-backed',color:'ai-completed'},integrityFindings:[]},
    {sceneId:'scene-03',order:2,provenanceStatus:'missing',narrativeRole:'RESOLUTION',narrativeAgency:{start:'CONTESTED',end:'CHARACTER'},sources:{camera:'unknown',color:'unknown'},integrityFindings:[]}
  ],boundaries:[
    {id:'scene-01->scene-02',fromSceneId:'scene-01',toSceneId:'scene-02',status:'PASS',visualResponse:[{family:'camera',from:'WORLD',to:'CONTESTED',changed:true,source:'compiler-backed'}]},
    {id:'scene-02->scene-03',fromSceneId:'scene-02',toSceneId:'scene-03',status:'UNRESOLVED',visualResponse:[]}
  ],findings:[]};
  const candidate=candidateApi.deriveProjectConstraintCandidates({projectState,projectIntelligence,registry:registryApi.createEmptyRegistry()})[0];
  const registry=registryApi.confirmCandidate(registryApi.createEmptyRegistry(),candidate);
  return {projectState,projectIntelligence,registry,targetSceneId:'scene-03'};
}

test('before Apply all five Beat packages are DRAFT', () => {
  const set=compiler.compileGenerationPromptSet(buildContext());
  assert.deepEqual(set.packages.map(item=>item.readiness.status),['DRAFT','DRAFT','DRAFT','DRAFT','DRAFT']);
  assert.equal(set.summary.draft,5);assert.equal(set.summary.ready,0);assert.equal(set.summary.blocked,0);
});

test('selected Apply makes only selected valid Beats READY', () => {
  const set=compiler.compileGenerationPromptSet(buildContext({appliedBeatIds:['rupture','release'],activeBeatId:'rupture'}));
  assert.equal(set.packages.find(item=>item.promptIR.beatId==='rupture').readiness.status,'READY');
  assert.equal(set.packages.find(item=>item.promptIR.beatId==='release').readiness.status,'READY');
  assert.equal(set.packages.find(item=>item.promptIR.beatId==='setup').readiness.status,'DRAFT');
  assert.equal(set.summary.ready,2);assert.equal(set.summary.draft,3);
});

test('non-backbone UNKNOWN remains OPEN and does not block READY', () => {
  const ctx=buildContext({appliedBeatIds:['setup'],activeBeatId:'setup'});
  const pkg=compiler.compileBeatPromptPackage({...ctx,beatId:'setup'});
  assert.equal(pkg.readiness.status,'READY');
  assert.ok(pkg.promptIR.open.some(item=>item.field==='medium'));
});

test('current Beat Scene divergence BLOCKS current Beat but not another Beat', () => {
  const ctx=buildContext({appliedBeatIds:['setup','release'],activeBeatId:'setup'});
  ctx.sceneState.variables.camera.perspective='character';
  const setup=compiler.compileBeatPromptPackage({...ctx,beatId:'setup'});
  assert.equal(setup.readiness.status,'BLOCKED');
  assert.ok(setup.readiness.reasons.some(item=>item.code==='SCENE_PROVENANCE_DIVERGENCE'));
  const release=compiler.compileBeatPromptPackage({...ctx,beatId:'release'});
  assert.equal(release.readiness.reasons.some(item=>item.code==='SCENE_PROVENANCE_DIVERGENCE'),false);
  assert.equal(release.readiness.status,'READY');
});

test('stale Apply Evidence BLOCKS the affected Beat', () => {
  const ctx=buildContext({appliedBeatIds:['setup'],activeBeatId:'setup'});
  ctx.sequence.beats.find(item=>item.id==='setup').primaryVariable='color';
  const pkg=compiler.compileBeatPromptPackage({...ctx,beatId:'setup'});
  assert.equal(pkg.readiness.status,'BLOCKED');
  assert.ok(pkg.readiness.reasons.some(item=>item.code==='BEAT_APPLY_EVIDENCE_STALE'));
});

test('malformed backbone fails with controlled domain codes', () => {
  const ctx=buildContext();
  assert.throws(()=>compiler.compileGenerationPromptSet({...ctx,visualIR:{}}),error=>error?.code==='VISUAL_IR_INVALID'&&!/Cannot read propert/.test(error.message));
  assert.throws(()=>compiler.compileGenerationPromptSet({...ctx,narrativeState:{...ctx.narrativeState,sequenceProvenance:null}}),error=>error?.code==='SEQUENCE_PROVENANCE_MISSING');
});

test('M7 STALE blocks only its scoped Beat and removes current project support', () => {
  const projectConstraintContext=projectConstraintFixture();
  const confirmedReading=reading('contested','character');
  const visualIR=visualIRFor(confirmedReading);
  const selectedStrategy=strategy();
  const skeleton=skeletonApi.compileSequenceSkeleton({confirmedReading,selectedStrategy,visualIR});
  const authority=authorityApi.resolveProjectConstraintAuthority({...projectConstraintContext,visualIR,baseSkeleton:skeleton});
  assert.equal(authority.resolutions[0].status,'SATISFIED');
  const ctx=buildContext({confirmedReading,projectConstraintContext,projectResolutions:authority.resolutions,appliedBeatIds:['setup','rupture'],activeBeatId:'setup'});
  ctx.projectConstraintContext.projectState.scenes['scene-02'].workspace.sceneState.variables.camera.perspective='character';
  const set=compiler.compileGenerationPromptSet(ctx);
  const setup=set.packages.find(item=>item.promptIR.beatId==='setup');
  const rupture=set.packages.find(item=>item.promptIR.beatId==='rupture');
  assert.equal(setup.readiness.status,'BLOCKED');
  assert.ok(setup.readiness.reasons.some(item=>item.code==='PROJECT_CONSTRAINT_STALE'));
  assert.deepEqual(setup.promptIR.provenance.projectConstraintRefs,[]);
  assert.equal(rupture.readiness.status,'READY');
});

test('M7 current compiler disagreement blocks its scoped Beat as CONFLICT', () => {
  const projectConstraintContext=projectConstraintFixture();
  const confirmedReading=reading('contested','character');
  const visualIR=visualIRFor(confirmedReading);
  const selectedStrategy=strategy();
  const skeleton=skeletonApi.compileSequenceSkeleton({confirmedReading,selectedStrategy,visualIR});
  const authority=authorityApi.resolveProjectConstraintAuthority({...projectConstraintContext,visualIR,baseSkeleton:skeleton});
  const ctx=buildContext({confirmedReading,projectConstraintContext,projectResolutions:authority.resolutions,appliedBeatIds:['setup'],activeBeatId:'setup'});
  const id=Object.keys(ctx.projectConstraintContext.registry.constraints)[0];
  ctx.projectConstraintContext.registry.constraints[id].revisions['1'].expected='character';
  const pkg=compiler.compileBeatPromptPackage({...ctx,beatId:'setup'});
  assert.equal(pkg.readiness.status,'BLOCKED');
  assert.ok(pkg.readiness.reasons.some(item=>item.code==='PROJECT_CONSTRAINT_CONFLICT'));
});

test('five Beat prompt identities remain distinct because Beat data differs', () => {
  const set=compiler.compileGenerationPromptSet(buildContext());
  assert.equal(new Set(set.packages.map(item=>item.promptIR.fingerprint)).size,5);
});
