const test = require('node:test');
const assert = require('node:assert/strict');
const registryApi = require('./project-constraint-registry.js');
const candidateApi = require('./project-constraint-candidates.js');
const authorityApi = require('./project-constraint-authority.js');

const clone = value => JSON.parse(JSON.stringify(value));

function baseInput() {
  const projectState = {
    id:'project-1', title:'Film', projectIntent:'', sourceNarrative:'',
    sceneOrder:['scene-01','scene-02','scene-03'], activeSceneId:'scene-03',
    scenes:{
      'scene-01':{
        id:'scene-01',order:1,title:'One',
        narrativeRole:{role:'setup',narrativeFunction:'Establish.',startingState:'A',endingState:'B',turningPoint:'T1',agencyTransition:['world','world'],relationToPrevious:null},
        workspace:{narrativeState:{},sceneState:{agency:'world',variables:{camera:{perspective:'world'},color:{territory:'world'}}},sequenceState:null},
        status:{narrative:'confirmed',visual:'directed',continuity:'pass'}
      },
      'scene-02':{
        id:'scene-02',order:2,title:'Two',
        narrativeRole:{role:'rupture',narrativeFunction:'Contest.',startingState:'B',endingState:'C',turningPoint:'T2',agencyTransition:['world','contested'],relationToPrevious:'Pressure.'},
        workspace:{
          narrativeState:{
            confirmedReading:{id:'reading-2'},
            selectedStrategy:{id:'strategy-2',grammarId:'camera-authority-transfer'},
            sequenceSkeleton:{grammarId:'camera-authority-transfer'},
            sequenceProvenance:{origin:'compiler-first',grammarId:'camera-authority-transfer'},
            sequenceProposal:{beats:[{id:'new-ownership',sceneStatePatch:{variables:{camera:{perspective:'mixed'}}}}]}
          },
          sceneState:{narrativeState:'new-ownership',agency:'contested',variables:{camera:{perspective:'mixed'},color:{territory:'world'}}},
          sequenceState:{activeBeatId:'new-ownership'}
        },
        status:{narrative:'confirmed',visual:'directed',continuity:'pass'}
      },
      'scene-03':{
        id:'scene-03',order:3,title:'Three',
        narrativeRole:{role:'resolution',narrativeFunction:'Resolve.',startingState:'C',endingState:'D',turningPoint:'T3',agencyTransition:['contested','character'],relationToPrevious:'Continue contest.'},
        workspace:{narrativeState:null,sceneState:null,sequenceState:null},
        status:{narrative:'defined',visual:'undirected',continuity:'unresolved'}
      }
    }
  };
  const projectIntelligence = {
    schemaVersion:'0.1.0',mode:'shadow',status:'UNRESOLVED',sceneOrder:clone(projectState.sceneOrder),
    scenes:[
      {sceneId:'scene-01',order:0,provenanceStatus:'compiler-first',narrativeRole:'SETUP',narrativeAgency:{start:'WORLD',end:'WORLD'},sources:{camera:'compiler-backed',color:'compiler-backed'},integrityFindings:[]},
      {sceneId:'scene-02',order:1,provenanceStatus:'compiler-first',narrativeRole:'RUPTURE',grammarId:'camera-authority-transfer',appliedBeatId:'new-ownership',narrativeAgency:{start:'WORLD',end:'CONTESTED'},sources:{camera:'compiler-backed',color:'ai-completed'},integrityFindings:[]},
      {sceneId:'scene-03',order:2,provenanceStatus:'missing',narrativeRole:'RESOLUTION',narrativeAgency:{start:'CONTESTED',end:'CHARACTER'},sources:{camera:'unknown',color:'unknown'},integrityFindings:[]}
    ],
    boundaries:[
      {id:'scene-01->scene-02',fromSceneId:'scene-01',toSceneId:'scene-02',status:'PASS',visualResponse:[{family:'camera',from:'WORLD',to:'CONTESTED',changed:true,source:'compiler-backed'}]},
      {id:'scene-02->scene-03',fromSceneId:'scene-02',toSceneId:'scene-03',status:'UNRESOLVED',visualResponse:[]}
    ],findings:[]
  };
  const candidate = candidateApi.deriveProjectConstraintCandidates({projectState,projectIntelligence,registry:registryApi.createEmptyRegistry()})[0];
  const registry = registryApi.confirmCandidate(registryApi.createEmptyRegistry(), candidate);
  const visualIR = {grammar:{status:'resolved',id:'camera-authority-transfer'}};
  const baseSkeleton = {beats:[{id:'setup',label:'SETUP',agencySlot:{status:'fixed',owner:'compiler',value:'contested',allowedValues:['contested']}}]};
  return {projectState,projectIntelligence,registry,targetSceneId:'scene-03',visualIR,baseSkeleton};
}

function resolve(input) { return authorityApi.resolveProjectConstraintAuthority(input); }

test('matching supported Scene Compiler expectation is SATISFIED', () => {
  const input = baseInput();
  const before = clone(input);
  const result = resolve(input);
  assert.equal(result.safeToComplete,true);
  assert.equal(result.resolutions.length,1);
  assert.equal(result.resolutions[0].status,'SATISFIED');
  assert.equal(result.resolutions[0].path,'camera.perspective');
  assert.equal(result.resolutions[0].expected,'mixed');
  assert.equal(result.resolutions[0].sceneExpected,'mixed');
  assert.equal(result.projectConstraintContext.constraints[0].resolution,'satisfied');
  assert.deepEqual(input,before,'authority resolution must not mutate inputs');
  assert.deepEqual(resolve(input),result,'authority resolution must be deterministic');
});

test('target Grammar without exact Camera support is reachable CONFLICT', () => {
  const input = baseInput();
  input.visualIR = {grammar:{status:'resolved',id:'color-ownership-transfer'}};
  const result = resolve(input);
  assert.equal(result.safeToComplete,false);
  assert.equal(result.resolutions[0].status,'CONFLICT');
  assert.equal(result.resolutions[0].reason,'TARGET_GRAMMAR_UNSUPPORTED');
  assert.equal(result.projectConstraintContext.constraints.length,0);
});

test('material evidence changes make confirmed constraint STALE with zero exact authority', () => {
  const mutations = [
    input => { input.projectState.scenes['scene-02'].workspace.sceneState.variables.camera.perspective = 'character'; },
    input => { input.projectState.scenes['scene-02'].workspace.narrativeState.confirmedReading.id = 'reading-2b'; },
    input => { input.projectState.scenes['scene-02'].workspace.narrativeState.selectedStrategy.id = 'strategy-2b'; },
    input => { input.projectIntelligence.scenes[1].grammarId = 'color-ownership-transfer'; },
    input => { input.projectIntelligence.scenes[1].appliedBeatId = 'release'; },
    input => { input.projectState.scenes['scene-03'].narrativeRole.agencyTransition = ['contested','shared','character']; },
    input => { input.projectState.sceneOrder = ['scene-01','scene-03','scene-02']; }
  ];
  for (const mutate of mutations) {
    const input = baseInput(); mutate(input);
    const result = resolve(input);
    assert.equal(result.safeToComplete,false);
    assert.equal(result.resolutions[0].status,'STALE');
    assert.equal(result.resolutions[0].sceneExpected,null);
  }
});

test('current revision release is INAPPLICABLE and revoked constraints do not participate', () => {
  const released = baseInput();
  const id = Object.keys(released.registry.constraints)[0];
  released.registry = registryApi.releaseConstraintScope(released.registry,id,{sceneId:'scene-03',beatId:'setup'});
  const releaseResult = resolve(released);
  assert.equal(releaseResult.safeToComplete,true);
  assert.equal(releaseResult.resolutions[0].status,'INAPPLICABLE');

  const revoked = baseInput();
  const revokedId = Object.keys(revoked.registry.constraints)[0];
  revoked.registry = registryApi.revokeConstraint(revoked.registry,revokedId);
  const revokeResult = resolve(revoked);
  assert.equal(revokeResult.safeToComplete,true);
  assert.deepEqual(revokeResult.resolutions,[]);
});

test('current evidence with no Skeleton is ACTIVE, not falsely SATISFIED', () => {
  const input = baseInput();
  input.baseSkeleton = null;
  const result = resolve(input);
  assert.equal(result.safeToComplete,true);
  assert.equal(result.resolutions[0].status,'ACTIVE');
  assert.equal(result.projectConstraintContext.constraints.length,0);
});

test('defensive contradictory current expected value is SCENE_COMPILER_DISAGREES', () => {
  const input = baseInput();
  const id = Object.keys(input.registry.constraints)[0];
  const current = input.registry.constraints[id].revisions['1'];
  current.expected = 'character';
  const result = resolve(input);
  assert.equal(result.safeToComplete,false);
  assert.equal(result.resolutions[0].status,'CONFLICT');
  assert.equal(result.resolutions[0].reason,'SCENE_COMPILER_DISAGREES');
});