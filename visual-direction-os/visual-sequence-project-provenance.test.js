const test = require('node:test');
const assert = require('node:assert/strict');
const { assembleSequenceProposal } = require('./visual-sequence-completion.js');

const ids = ['setup','pressure','rupture','release','new-ownership'];
function skeleton() {
  const patchSlots = {
    'camera.perspective': {status:'compiler-derived',support:'supported',owner:'compiler'},
    'color.temperature': {status:'open',support:'open',owner:'ai'}
  };
  return {
    version:'0.1.0', grammarId:'camera-authority-transfer',
    agencyConstraint:{path:['contested','character'],start:'contested',end:'character'},
    beats:ids.map((id,index) => ({
      id, label:id === 'new-ownership' ? 'NEW OWNERSHIP' : id.toUpperCase(),
      structure:{primaryVariable:'camera',supportingVariables:[],restrainedVariables:[]},
      agencySlot:index === 0 || index === 4 ? {status:'fixed',owner:'compiler'} : {status:'open',owner:'ai'},
      patchSlots
    }))
  };
}
function completion() {
  return {sequenceCompletion:{beats:ids.map((id,index) => ({
    id, narrativeBeat:`beat ${id}`, agency:index === 4 ? 'character' : 'contested', visualEvents:[], rationale:'because', openPatch:{}
  }))}};
}

test('SATISFIED Project constraint annotates compiler provenance without changing owner or exact value', () => {
  const result = assembleSequenceProposal({
    skeleton:skeleton(), completion:completion(), visualIR:{grammar:{status:'resolved',id:'camera-authority-transfer'}},
    projectConstraintResolutions:[{constraintId:'constraint-camera-001',revision:1,status:'SATISFIED',beatId:'setup',path:'camera.perspective'}]
  });
  const field = result.sequenceProvenance.fields['setup.camera.perspective'];
  assert.equal(field.owner,'compiler');
  assert.deepEqual(field.projectConstraintIds,['constraint-camera-001']);
  assert.equal(result.sequenceProposal.beats[0].sceneStatePatch.variables.camera.perspective,'mixed');
  assert.deepEqual(result.sequenceProvenance.projectConstraints.resolutions,[
    {constraintId:'constraint-camera-001',revision:1,result:'satisfied',beatId:'setup',path:'camera.perspective'}
  ]);
});
