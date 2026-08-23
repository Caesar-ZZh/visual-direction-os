const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('./project-constraint-registry.js');
const candidatesApi = require('./project-constraint-candidates.js');

function baseFixture() {
  const projectState = {
    id:'project-1', title:'Film', projectIntent:'', sourceNarrative:'',
    sceneOrder:['scene-01','scene-02','scene-03'], activeSceneId:'scene-03',
    scenes:{
      'scene-01': {
        id:'scene-01', order:1, title:'One',
        narrativeRole:{role:'setup',narrativeFunction:'Establish world.',startingState:'A',endingState:'B',turningPoint:'T1',agencyTransition:['world','world'],relationToPrevious:null},
        workspace:{narrativeState:{},sceneState:{agency:'world',variables:{camera:{perspective:'world'},color:{territory:'world'}}},sequenceState:null},
        status:{narrative:'confirmed',visual:'directed',continuity:'pass'}
      },
      'scene-02': {
        id:'scene-02', order:2, title:'Two',
        narrativeRole:{role:'rupture',narrativeFunction:'Contest authority.',startingState:'B',endingState:'C',turningPoint:'T2',agencyTransition:['world','contested'],relationToPrevious:'Pressure becomes explicit.'},
        workspace:{
          narrativeState:{confirmedReading:{id:'reading-2'},selectedStrategy:{id:'strategy-2',grammarId:'camera-authority-transfer'},sequenceSkeleton:{grammarId:'camera-authority-transfer'},sequenceProvenance:{origin:'compiler-first',grammarId:'camera-authority-transfer'},sequenceProposal:{beats:[{id:'new-ownership',sceneStatePatch:{variables:{camera:{perspective:'mixed'}}}}]}},
          sceneState:{narrativeState:'new-ownership',agency:'contested',variables:{camera:{perspective:'mixed'},color:{territory:'world'}}},sequenceState:{activeBeatId:'new-ownership'}
        },
        status:{narrative:'confirmed',visual:'directed',continuity:'pass'}
      },
      'scene-03': {
        id:'scene-03', order:3, title:'Three',
        narrativeRole:{role:'resolution',narrativeFunction:'Resolve contested state.',startingState:'C',endingState:'D',turningPoint:'T3',agencyTransition:['contested','character'],relationToPrevious:'Contest becomes self-authorship.'},
        workspace:{narrativeState:null,sceneState:null,sequenceState:null},status:{narrative:'defined',visual:'undirected',continuity:'unresolved'}
      }
    }
  };
  const projectIntelligence = {
    schemaVersion:'0.1.0', mode:'shadow', status:'UNRESOLVED',sceneOrder:['scene-01','scene-02','scene-03'],
    scenes:[
      {sceneId:'scene-01',provenanceStatus:'compiler-first',narrativeRole:'SETUP',narrativeAgency:{start:'WORLD',end:'WORLD'},sources:{camera:'compiler-backed',color:'compiler-backed'},cameraAuthority:'WORLD',colorTerritory:'WORLD',integrityFindings:[]},
      {sceneId:'scene-02',provenanceStatus:'compiler-first',narrativeRole:'RUPTURE',grammarId:'camera-authority-transfer',appliedBeatId:'new-ownership',narrativeAgency:{start:'WORLD',end:'CONTESTED'},sources:{camera:'compiler-backed',color:'ai-completed'},cameraAuthority:'CONTESTED',colorTerritory:'WORLD',integrityFindings:[]},
      {sceneId:'scene-03',provenanceStatus:'missing',narrativeRole:'RESOLUTION',narrativeAgency:{start:'CONTESTED',end:'CHARACTER'},sources:{camera:'unknown',color:'unknown'},cameraAuthority:null,colorTerritory:null,integrityFindings:[]}
    ],
    boundaries:[
      {id:'scene-01->scene-02',fromSceneId:'scene-01',toSceneId:'scene-02',status:'PASS',rule:'boundary-pass',evidenceStatus:'supported',visualResponse:[{family:'camera',from:'WORLD',to:'CONTESTED',changed:true,source:'compiler-backed'},{family:'color',from:'WORLD',to:'WORLD',changed:false,source:'ai-completed'}]},
      {id:'scene-02->scene-03',fromSceneId:'scene-02',toSceneId:'scene-03',status:'UNRESOLVED',rule:'missing-provenance',visualResponse:[]}
    ],findings:[]
  };
  return {projectState,projectIntelligence,registry:registry.createEmptyRegistry()};
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

test('derives immediate-next SETUP Camera carry from material compiler-backed evidence', () => {
  const input = baseFixture(); const before = clone(input); const candidates = candidatesApi.deriveProjectConstraintCandidates(input);
  assert.equal(candidates.length,1); assert.equal(candidates[0].type,'ownership-carry'); assert.equal(candidates[0].sourceBoundaryId,'scene-01->scene-02'); assert.equal(candidates[0].sourceSceneId,'scene-02'); assert.equal(candidates[0].targetSceneId,'scene-03'); assert.equal(candidates[0].path,'camera.perspective'); assert.equal(candidates[0].expected,'mixed'); assert.deepEqual(candidates[0].scope.beatIds,['setup']); assert.match(candidates[0].candidateFingerprint,/^pcand-[0-9a-f]{16}$/); assert.equal(candidates[0].evidence.source,'compiler-backed'); assert.deepEqual(input,before); assert.deepEqual(candidatesApi.deriveProjectConstraintCandidates(input),candidates);
});

test('exact expected value comes from final Scene State, not normalized M6 authority label', () => {
  const input=baseFixture(); input.projectIntelligence.scenes[1].cameraAuthority='CONTESTED'; input.projectState.scenes['scene-02'].workspace.sceneState.variables.camera.perspective='mixed'; const [candidate]=candidatesApi.deriveProjectConstraintCandidates(input); assert.equal(candidate.expected,'mixed');
});

test('AI-completed, legacy, unknown/divergent, blocked, WARN, and handoff mismatch are ineligible', () => {
  const cases=[input=>{input.projectIntelligence.scenes[1].sources.camera='ai-completed';},input=>{input.projectIntelligence.scenes[1].provenanceStatus='legacy';},input=>{input.projectIntelligence.scenes[1].sources.camera='unknown';input.projectIntelligence.scenes[1].integrityFindings=[{rule:'provenance-final-state-divergence'}];},input=>{input.projectIntelligence.scenes[1].sources.camera='blocked';},input=>{input.projectIntelligence.boundaries[0].status='WARN';},input=>{input.projectIntelligence.scenes[2].narrativeAgency.start='CHARACTER';}];
  for(const mutate of cases){const input=baseFixture();mutate(input);assert.deepEqual(candidatesApi.deriveProjectConstraintCandidates(input),[]);}
});

test('does not skip a directed immediate target to constrain a later Scene', () => {
  const input=baseFixture(); input.projectState.scenes['scene-03'].status.visual='directed'; input.projectState.sceneOrder.push('scene-04'); input.projectState.scenes['scene-04']=clone(input.projectState.scenes['scene-03']); input.projectState.scenes['scene-04'].id='scene-04'; input.projectState.scenes['scene-04'].status.visual='undirected'; input.projectIntelligence.sceneOrder.push('scene-04'); input.projectIntelligence.scenes.push({sceneId:'scene-04',provenanceStatus:'missing',narrativeRole:'RESOLUTION',narrativeAgency:{start:'CONTESTED',end:'CHARACTER'},sources:{camera:'unknown',color:'unknown'},integrityFindings:[]}); assert.deepEqual(candidatesApi.deriveProjectConstraintCandidates(input),[]);
});

test('identical rejected Candidate stays hidden until compatible material evidence changes', () => {
  const input=baseFixture(); const first=candidatesApi.deriveProjectConstraintCandidates(input)[0]; const dismissed=registry.rejectCandidate(registry.createEmptyRegistry(),first); assert.deepEqual(candidatesApi.deriveProjectConstraintCandidates({...input,registry:dismissed}),[]); const changed=clone(input.projectState); changed.scenes['scene-03'].narrativeRole.agencyTransition=['contested','shared','character']; const changedIntel=clone(input.projectIntelligence); changedIntel.scenes[2].narrativeAgency={start:'CONTESTED',end:'CHARACTER'}; const next=candidatesApi.deriveProjectConstraintCandidates({projectState:changed,projectIntelligence:changedIntel,registry:dismissed}); assert.equal(next.length,1); assert.notEqual(next[0].candidateFingerprint,first.candidateFingerprint);
});

test('confirmed identical Candidate is suppressed while changed evidence can be proposed as a new revision', () => {
  const input=baseFixture(); const first=candidatesApi.deriveProjectConstraintCandidates(input)[0]; const confirmed=registry.confirmCandidate(registry.createEmptyRegistry(),first); assert.deepEqual(candidatesApi.deriveProjectConstraintCandidates({...input,registry:confirmed}),[],'confirmed current evidence must not reappear as a Candidate'); const changed=clone(input.projectState); changed.scenes['scene-03'].narrativeRole.agencyTransition=['contested','shared','character']; const changedIntel=clone(input.projectIntelligence); changedIntel.scenes[2].narrativeAgency={start:'CONTESTED',end:'CHARACTER'}; const next=candidatesApi.deriveProjectConstraintCandidates({projectState:changed,projectIntelligence:changedIntel,registry:confirmed}); assert.equal(next.length,1); assert.notEqual(next[0].candidateFingerprint,first.candidateFingerprint);
});
