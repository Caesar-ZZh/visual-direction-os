const assert = require('node:assert/strict');
const {
  evaluateEffectiveness,
  deriveMemoryForPath,
  compileMemoryAppendix
} = require('./memory-engine.js');

const comparison = {
  measuredComparisons:[
    { checkId:'saturation-direction', label:'Saturation Direction', state:'resolved' },
    { checkId:'detail-density', label:'Detail Density', state:'stable_warn' },
    { checkId:'canvas-ratio', label:'Canvas Ratio', state:'regressed' }
  ],
  semanticComparisons:[
    { checkId:'narrative-verb', label:'Narrative Verb', state:'improved' }
  ]
};
const parentDelta = { entries:[
  { checkId:'saturation-direction', label:'Saturation Direction', intent:'correct', evidenceMode:'measured' },
  { checkId:'detail-density', label:'Detail Density', intent:'correct', evidenceMode:'measured' },
  { checkId:'canvas-ratio', label:'Canvas Ratio', intent:'preserve', evidenceMode:'measured' },
  { checkId:'narrative-verb', label:'Narrative Verb', intent:'correct', evidenceMode:'human_required' }
] };
const effectiveness = evaluateEffectiveness({ parentDelta, comparison });
assert.equal(effectiveness.find((row) => row.checkId === 'saturation-direction').state, 'resolved');
assert.equal(effectiveness.find((row) => row.checkId === 'detail-density').state, 'unresolved', 'stable_warn comparison is unresolved effectiveness');
assert.equal(effectiveness.find((row) => row.checkId === 'canvas-ratio').state, 'regressed');
assert.equal(effectiveness.find((row) => row.checkId === 'narrative-verb').state, 'resolved');

function measuredArtifact(id, parentArtifactId, status) {
  return {
    id,
    parentArtifactId,
    evaluation:{ checks:[
      { id:'canvas-ratio', label:'Canvas Ratio', evidenceMode:'measured', status, target:'16:9', reason:status === 'pass' ? 'correct' : 'wrong', observed:status }
    ] }
  };
}

let artifacts = [
  measuredArtifact('g1', null, 'pass'),
  measuredArtifact('g2', 'g1', 'pass')
];
let memory = deriveMemoryForPath({ artifacts, comparisons:[], pathHeadId:'g2' });
assert.equal(memory.locked.some((row) => row.checkId === 'canvas-ratio'), true, 'two consecutive measured passes lock a rule');
assert.equal(memory.active.some((row) => row.checkId === 'canvas-ratio'), false);

artifacts = [
  measuredArtifact('g1', null, 'warn'),
  measuredArtifact('g2', 'g1', 'pass')
];
memory = deriveMemoryForPath({ artifacts, comparisons:[], pathHeadId:'g2' });
assert.equal(memory.locked.some((row) => row.checkId === 'canvas-ratio'), false, 'warn to pass must not lock immediately');
assert.equal(memory.active.some((row) => row.checkId === 'canvas-ratio'), true, 'resolved-once measured rule stays active until confirmed by next pass');

artifacts = [
  measuredArtifact('g1', null, 'warn'),
  measuredArtifact('g2', 'g1', 'pass'),
  measuredArtifact('g3', 'g2', 'pass')
];
memory = deriveMemoryForPath({ artifacts, comparisons:[], pathHeadId:'g3' });
assert.equal(memory.locked.some((row) => row.checkId === 'canvas-ratio'), true, 'warn to pass to pass locks');

artifacts = [
  measuredArtifact('g1', null, 'pass'),
  measuredArtifact('g2', 'g1', 'pass'),
  measuredArtifact('g3', 'g2', 'warn')
];
memory = deriveMemoryForPath({ artifacts, comparisons:[], pathHeadId:'g3' });
assert.equal(memory.locked.some((row) => row.checkId === 'canvas-ratio'), false, 'current-path regression removes lock');
assert.equal(memory.active.some((row) => row.checkId === 'canvas-ratio'), true, 'regression reactivates correction');
assert.equal(memory.active.find((row) => row.checkId === 'canvas-ratio').state, 'regressed');

const semanticArtifacts = [
  { id:'s1', parentArtifactId:null, evaluation:{ checks:[{ id:'narrative-verb', label:'Narrative Verb', evidenceMode:'human_required', status:'pass', target:'WITHDRAW' }] } },
  { id:'s2', parentArtifactId:'s1', evaluation:{ checks:[{ id:'narrative-verb', label:'Narrative Verb', evidenceMode:'human_required', status:'pass', target:'WITHDRAW' }] } }
];
memory = deriveMemoryForPath({ artifacts:semanticArtifacts, comparisons:[], pathHeadId:'s2' });
assert.equal(memory.locked.some((row) => row.checkId === 'narrative-verb'), false, 'semantic rule never auto-locks');
memory = deriveMemoryForPath({ artifacts:semanticArtifacts, comparisons:[], pathHeadId:'s2', semanticLocks:{ 'narrative-verb':true } });
assert.equal(memory.locked.some((row) => row.checkId === 'narrative-verb'), true, 'director-confirmed semantic rule can lock');
assert.equal(memory.locked.find((row) => row.checkId === 'narrative-verb').evidenceSource, 'director-confirmed');

const branchArtifacts = [
  measuredArtifact('root', null, 'pass'),
  measuredArtifact('g2a', 'root', 'pass'),
  measuredArtifact('g2b', 'root', 'warn')
];
const memoryA = deriveMemoryForPath({ artifacts:branchArtifacts, comparisons:[], pathHeadId:'g2a' });
const memoryB = deriveMemoryForPath({ artifacts:branchArtifacts, comparisons:[], pathHeadId:'g2b' });
assert.equal(memoryA.locked.some((row) => row.checkId === 'canvas-ratio'), true, 'sibling regression must not unlock selected successful path');
assert.equal(memoryB.locked.some((row) => row.checkId === 'canvas-ratio'), false);
assert.equal(memoryB.active.some((row) => row.checkId === 'canvas-ratio'), true);

const watchArtifacts = [
  { id:'w1', parentArtifactId:null, evaluation:{ checks:[
    { id:'camera-allegiance', label:'Camera Allegiance', evidenceMode:'human_required', status:'not_sure', target:'witness' },
    { id:'edge-activity', label:'Edge Activity', evidenceMode:'unsupported', status:'unsupported', target:'mixed' }
  ] } }
];
memory = deriveMemoryForPath({ artifacts:watchArtifacts, comparisons:[], pathHeadId:'w1' });
assert.equal(memory.watch.some((row) => row.checkId === 'camera-allegiance'), true);
assert.equal(memory.watch.some((row) => row.checkId === 'edge-activity'), true);

const appendix = compileMemoryAppendix({
  currentDelta:{ entries:[
    { checkId:'detail-density', label:'Detail Density', intent:'correct', instruction:'Detail Density: reduce background density.' },
    { checkId:'camera-allegiance', label:'Camera Allegiance', intent:'unresolved', instruction:'Camera Allegiance unresolved.' }
  ] },
  memory:{
    locked:[{ checkId:'canvas-ratio', label:'Canvas Ratio', instruction:'Canvas Ratio: preserve 16:9.' }],
    active:[{ checkId:'saturation-direction', label:'Saturation Direction', instruction:'Saturation Direction: reduce global saturation.' }],
    watch:[{ checkId:'camera-allegiance', label:'Camera Allegiance', instruction:'Do not force this.' }]
  }
});
assert.match(appendix, /ITERATION \/ DIRECTOR MEMORY/);
assert.match(appendix, /PRESERVE LOCKED/);
assert.match(appendix, /Canvas Ratio: preserve 16:9/);
assert.match(appendix, /CORRECT ACTIVE/);
assert.match(appendix, /reduce global saturation/);
assert.match(appendix, /reduce background density/);
assert.doesNotMatch(appendix, /Do not force this|Camera Allegiance unresolved/, 'WATCH and unresolved items must not become deterministic generation instructions');

console.log('memory engine tests passed');
