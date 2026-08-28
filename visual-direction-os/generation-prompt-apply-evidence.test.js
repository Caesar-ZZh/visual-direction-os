const test = require('node:test');
const assert = require('node:assert/strict');
const evidence = require('./generation-prompt-apply-evidence.js');

const beat = {
  id:'setup', label:'SETUP', narrativeBeat:'Establish the institution.', agency:'world',
  primaryVariable:'Camera', supportingVariables:['Space'], restrainedVariables:['Texture'],
  visualEvents:['enter'],
  sceneStatePatch:{agency:'world',variables:{camera:{perspective:'world'}}},
  rationale:'The world still holds the frame.'
};
const pressureBeat = {...beat,id:'pressure',label:'PRESSURE',agency:'contested',sceneStatePatch:{agency:'contested',variables:{camera:{perspective:'mixed'}}}};
const provenance = {
  origin:'compiler-first', skeletonVersion:'0.1.0', grammarId:'camera-authority-transfer',
  fields:{
    'setup.agency':{owner:'compiler',support:'supported',source:'agency-constraint'},
    'setup.camera.perspective':{owner:'compiler',support:'supported',source:'camera-authority-transfer'},
    'pressure.color.temperature':{owner:'ai',support:'open',source:'sequence-completion'}
  },
  projectConstraints:{registryVersion:'0.1.0',resolutions:[{constraintId:'constraint-a',revision:1,result:'satisfied',beatId:'setup',path:'camera.perspective'}]}
};
const source = {
  readingId:'reading-01', strategyId:'strategy-01', grammarId:'camera-authority-transfer',
  sequenceOrigin:'compiler-first', skeletonVersion:'0.1.0'
};
const proposal = { beats:[beat, pressureBeat] };
const sequence = {
  beats: proposal.beats.map(item => ({
    id:item.id,label:item.label,narrativePurpose:item.narrativeBeat,
    primaryVariable:item.primaryVariable,supportingVariables:item.supportingVariables,
    restrainedVariables:item.restrainedVariables,scenePatch:item.sceneStatePatch,start:0,end:0.5
  })),
  events:[{beatId:'setup',type:'camera',label:'enter'},{beatId:'pressure',type:'camera',label:'press'}]
};

test('fingerprints are deterministic and Beat-scoped', () => {
  assert.match(evidence.proposalBeatFingerprint(beat), /^pbeat-[0-9a-f]{16}$/);
  assert.match(evidence.provenanceFingerprint(provenance, 'setup'), /^pprv-[0-9a-f]{16}$/);
  assert.match(evidence.sequenceDirectorBeatFingerprint(sequence, 'setup'), /^sbeat-[0-9a-f]{16}$/);
  const reordered = {...provenance, fields:{
    'pressure.color.temperature':provenance.fields['pressure.color.temperature'],
    'setup.camera.perspective':provenance.fields['setup.camera.perspective'],
    'setup.agency':provenance.fields['setup.agency']
  }};
  assert.equal(evidence.provenanceFingerprint(provenance, 'setup'), evidence.provenanceFingerprint(reordered, 'setup'));
  const changedOtherBeat = structuredClone(provenance);
  changedOtherBeat.fields['pressure.color.temperature'].source = 'different';
  assert.equal(evidence.provenanceFingerprint(provenance, 'setup'), evidence.provenanceFingerprint(changedOtherBeat, 'setup'));
});

test('selected Apply records only selected Beats and increments action revision once', () => {
  const next = evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(), {
    source, proposal, provenance, sequence, beatIds:['setup']
  });
  assert.equal(next.revision, 1);
  assert.ok(next.beats.setup);
  assert.equal(next.beats.pressure, undefined);
  assert.equal(next.beats.setup.applyRevision, 1);
  assert.deepEqual(next.beats.setup.source, source);
});

test('progressive selected Apply preserves current unselected receipt', () => {
  let state = evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(), {
    source, proposal, provenance, sequence, beatIds:['setup']
  });
  const setupReceipt = state.beats.setup;
  state = evidence.recordAppliedBeats(state, {
    source, proposal, provenance, sequence, beatIds:['pressure']
  });
  assert.equal(state.revision, 2);
  assert.deepEqual(state.beats.setup, setupReceipt);
  assert.equal(state.beats.pressure.applyRevision, 2);
});

test('changed Sequence Director Beat makes prior receipt stale', () => {
  const state = evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(), {
    source, proposal, provenance, sequence, beatIds:['setup']
  });
  const changed = structuredClone(sequence);
  changed.beats[0].primaryVariable = 'Color';
  const result = evidence.reconcileBeatApplyEvidence(state, {
    source, proposal, provenance, sequence:changed, beatId:'setup'
  });
  assert.equal(result.status, 'STALE');
  assert.equal(result.reason, 'SEQUENCE_DIRECTOR_BEAT_CHANGED');
});

test('changed source, proposal, and provenance report precise stale reasons', () => {
  const state = evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(), {source, proposal, provenance, sequence, beatIds:['setup']});
  assert.equal(evidence.reconcileBeatApplyEvidence(state,{source:{...source,strategyId:'strategy-02'},proposal,provenance,sequence,beatId:'setup'}).reason,'SOURCE_CHANGED');
  const changedProposal = structuredClone(proposal); changedProposal.beats[0].rationale = 'changed';
  assert.equal(evidence.reconcileBeatApplyEvidence(state,{source,proposal:changedProposal,provenance,sequence,beatId:'setup'}).reason,'PROPOSAL_BEAT_CHANGED');
  const changedProvenance = structuredClone(provenance); changedProvenance.fields['setup.camera.perspective'].source='changed';
  assert.equal(evidence.reconcileBeatApplyEvidence(state,{source,proposal,provenance:changedProvenance,sequence,beatId:'setup'}).reason,'PROVENANCE_CHANGED');
});

test('missing receipt is explicit and state validation rejects malformed receipts', () => {
  const empty = evidence.createEmptySequenceApplyState();
  assert.deepEqual(evidence.reconcileBeatApplyEvidence(empty,{source,proposal,provenance,sequence,beatId:'setup'}), {status:'MISSING',reason:'NOT_APPLIED',receipt:null});
  assert.equal(evidence.validateSequenceApplyState(empty).valid, true);
  assert.equal(evidence.validateSequenceApplyState({schemaVersion:'0.1.0',revision:1,beats:{setup:{beatId:'setup'}}}).valid, false);
});

test('recordAppliedBeats rejects duplicate or missing selected Beats', () => {
  assert.throws(() => evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(),{source,proposal,provenance,sequence,beatIds:['setup','setup']}), /unique/);
  assert.throws(() => evidence.recordAppliedBeats(evidence.createEmptySequenceApplyState(),{source,proposal,provenance,sequence,beatIds:['release']}), /proposal/i);
});
