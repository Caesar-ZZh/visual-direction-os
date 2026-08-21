const test = require('node:test');
const assert = require('node:assert/strict');
const origin = require('./visual-sequence-origin.js');

const ids = ['setup','pressure','rupture','release','new-ownership'];
const skeleton = {
  version:'0.1.0',
  grammarId:'camera-authority-transfer',
  beats:ids.map((id,index)=>({
    id,
    label:id === 'new-ownership' ? 'NEW OWNERSHIP' : id.toUpperCase(),
    patchSlots:{
      'camera.perspective':{status:'compiler-derived'},
      'camera.distance':{status:'open'},
      'space.compression':{status:index === 2 ? 'blocked' : 'open'}
    }
  }))
};
const completion = { sequenceCompletion:{ beats:ids.map((id,index)=>({
  id,
  agency:index < 2 ? 'world' : index < 4 ? 'contested' : 'character',
  openPatch:index === 2 ? {variables:{camera:{distance:'close'}}} : {}
})) } };
const proposal = { beats:ids.map(id=>({id})) };
const provenance = {
  origin:'compiler-first', skeletonVersion:'0.1.0', grammarId:'camera-authority-transfer',
  fields:{
    'setup.agency':{owner:'compiler',support:'supported',source:'agency-constraint'},
    'rupture.agency':{owner:'ai',support:'constrained',source:'agency-constraint'},
    'rupture.camera.distance':{owner:'ai',support:'open',source:'sequence-completion'},
    'rupture.camera.perspective':{owner:'compiler',support:'supported',source:'camera-authority-transfer'}
  }
};

test('renders compact compiler-first origin with explicit ownership categories and no score', () => {
  const html = origin.renderSequenceOrigin({ skeleton, completion, provenance, proposal });
  assert.match(html, /SEQUENCE ORIGIN · COMPILER-FIRST/);
  assert.match(html, /COMPILER OWNED/);
  assert.match(html, /AI COMPLETED/);
  assert.match(html, /BLOCKED/);
  assert.match(html, /CAMERA\.PERSPECTIVE/);
  assert.match(html, /CAMERA\.DISTANCE/);
  assert.match(html, /SPACE\.COMPRESSION/);
  assert.doesNotMatch(html, /score/i);
  assert.match(html, /<details[^>]*data-sequence-origin-details/);
});

test('builds per-beat provenance from all four M5 artifacts without treating open-but-unused slots as AI output', () => {
  const model = origin.buildSequenceOrigin({ skeleton, completion, provenance, proposal });
  assert.equal(model.origin, 'compiler-first');
  assert.equal(model.assembled, true);
  assert.equal(model.beats.length, 5);
  const rupture = model.beats.find(beat => beat.id === 'rupture');
  assert.deepEqual(rupture.compilerOwned.sort(), ['camera.perspective']);
  assert.deepEqual(rupture.aiCompleted.sort(), ['agency','camera.distance']);
  assert.deepEqual(rupture.blocked.sort(), ['space.compression']);
  const pressure = model.beats.find(beat => beat.id === 'pressure');
  assert.deepEqual(pressure.aiCompleted, []);
});

test('returns no origin UI for a legacy proposal without compiler-first provenance', () => {
  assert.equal(origin.renderSequenceOrigin({ skeleton:null, completion:null, provenance:null, proposal }), '');
});
