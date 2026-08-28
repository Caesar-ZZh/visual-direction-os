const assert = require('assert');
const contracts = require('./_contracts.js');

const ids = ['setup','pressure','rupture','release','new-ownership'];
const labels = ['SETUP','PRESSURE','RUPTURE','RELEASE','NEW OWNERSHIP'];
const patchSlots = {
  'ownership.character': { status:'open' },
  'ownership.world': { status:'open' },
  'ownership.narrative': { status:'open' },
  'camera.distance': { status:'open' },
  'camera.perspective': { status:'compiler-derived', support:'supported' },
  'space.compression': { status:'blocked', support:'blocked' }
};
const skeleton = {
  version:'0.1.0', mode:'compiler-first', grammarId:'camera-authority-transfer', grammarStatus:'resolved',
  readingId:'reading-1', strategyId:'camera',
  agencyConstraint:{ path:['world','contested','character'], start:'world', end:'character', rule:'monotonic-progression' },
  beats: ids.map((id,index) => ({
    id, label:labels[index],
    structure:{ primaryVariable:'camera', supportingVariables:['space'], restrainedVariables:['texture'] },
    agencySlot:index===0 ? {status:'fixed',value:'world'} : index===4 ? {status:'fixed',value:'character'} : {status:'open',allowedValues:['world','contested','character']},
    patchSlots
  }))
};

const strategy = {
  id:'camera', title:'CAMERA-LED', grammarId:'camera-authority-transfer', primaryVariable:'camera',
  supportingVariables:['space'], restrainedVariables:['texture'], mechanism:'Authority follows agency.', rationale:'Perspective carries authorship.'
};
const reading = {
  id:'reading-1', title:'AGENCY', confidence:'high',
  narrativeProblem:{value:'problem',sourceType:'explicit',basis:'basis'},
  coreConflict:{value:'conflict',sourceType:'explicit',basis:'basis'},
  startingState:{value:'start',sourceType:'explicit',basis:'basis'},
  endingState:{value:'end',sourceType:'explicit',basis:'basis'},
  turningPoint:{value:'turn',sourceType:'explicit',basis:'basis'},
  agencyTransition:{value:['world','contested','character'],sourceType:'explicit',basis:'basis'}
};

const completion = {
  sequenceCompletion:{ beats:ids.map((id,index)=>({
    id,
    narrativeBeat:`beat ${index}`,
    agency:index<2?'world':index<4?'contested':'character',
    visualEvents:[],
    rationale:'causal reason',
    openPatch:index===0?{ownership:{world:'high'},variables:{camera:{distance:'wide'}}}:{}
  }))}
};

const baseInput = { narrative:'A character refuses control.', directorIntent:'Restore agency.', reading, strategy };
assert.equal(contracts.validateInput('sequence', baseInput).valid, false, 'M5 sequence requests require the compiler Skeleton');
const checkedInput = contracts.validateInput('sequence', { ...baseInput, sequenceSkeleton:skeleton });
assert.equal(checkedInput.valid, true);
assert.deepEqual(checkedInput.value.sequenceSkeleton, skeleton, 'validated Skeleton is preserved for provider + semantic output validation');

const schema = contracts.schemaFor('sequence');
assert.ok(schema.required.includes('sequenceCompletion'));
assert.equal(schema.required.includes('sequenceProposal'), false);
assert.equal(contracts.validateOutput('sequence', completion, { input:checkedInput.value }).valid, true);
assert.equal(contracts.validateOutput('sequence', { sequenceProposal:{beats:[]} }, { input:checkedInput.value }).valid, false);

const forbidden = JSON.parse(JSON.stringify(completion));
forbidden.sequenceCompletion.beats[2].openPatch = { variables:{camera:{perspective:'world'}} };
const forbiddenCheck = contracts.validateOutput('sequence', forbidden, { input:checkedInput.value });
assert.equal(forbiddenCheck.valid, false);
assert.ok(forbiddenCheck.errors.some(error => /camera\.perspective/i.test(error) && /compiler/i.test(error)));

const blocked = JSON.parse(JSON.stringify(completion));
blocked.sequenceCompletion.beats[2].openPatch = { variables:{space:{compression:'high'}} };
const blockedCheck = contracts.validateOutput('sequence', blocked, { input:checkedInput.value });
assert.equal(blockedCheck.valid, false);
assert.ok(blockedCheck.errors.some(error => /space\.compression/i.test(error) && /blocked/i.test(error)));

console.log('_contracts-sequence-completion.test.js passed');
