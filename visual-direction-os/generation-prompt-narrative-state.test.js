const test = require('node:test');
const assert = require('node:assert/strict');
const { createNarrativeState } = require('./narrative-state.js');
const evidence = require('./generation-prompt-apply-evidence.js');

const receiptState = evidence.createEmptySequenceApplyState();
const sourceState = {
  confirmedReading:{id:'reading-01'},
  selectedStrategy:{id:'strategy-01'},
  sequenceSkeleton:{version:'0.1.0'},
  sequenceProvenance:{origin:'compiler-first',skeletonVersion:'0.1.0',grammarId:'camera-authority-transfer',fields:{}}
};
const beat={id:'rupture',label:'RUPTURE',narrativeBeat:'Break.',agency:'contested',primaryVariable:'Camera',supportingVariables:[],restrainedVariables:[],visualEvents:[],sceneStatePatch:{agency:'contested'},rationale:'break'};
const proposal={beats:[beat]};
const sequence={beats:[{id:'rupture',label:'RUPTURE',narrativePurpose:'Break.',primaryVariable:'Camera',supportingVariables:[],restrainedVariables:[],scenePatch:{agency:'contested'},start:0,end:1}],events:[]};

test('Narrative State initializes and restores sequenceApplyState', () => {
  const fresh = createNarrativeState();
  assert.deepEqual(fresh.getState().sequenceApplyState, receiptState);
  const valid = evidence.recordAppliedBeats(receiptState,{source:{readingId:'reading-01',strategyId:'strategy-01',grammarId:'camera-authority-transfer',sequenceOrigin:'compiler-first',skeletonVersion:'0.1.0'},proposal,provenance:sourceState.sequenceProvenance,sequence,beatIds:['rupture']});
  const restored = createNarrativeState({ sequenceApplyState:valid });
  assert.equal(restored.getState().sequenceApplyState.revision, 1);
});

test('malformed restored sequenceApplyState fails with controlled error', () => {
  assert.throws(() => createNarrativeState({sequenceApplyState:{schemaVersion:'0.1.0',revision:1,beats:{rupture:{beatId:'rupture'}}}}), /Invalid Sequence Apply Evidence/);
});

test('upstream input invalidation clears current Apply Evidence', () => {
  const valid = evidence.recordAppliedBeats(receiptState,{source:{readingId:'reading-01',strategyId:'strategy-01',grammarId:'camera-authority-transfer',sequenceOrigin:'compiler-first',skeletonVersion:'0.1.0'},proposal,provenance:sourceState.sequenceProvenance,sequence,beatIds:['rupture']});
  const draft = createNarrativeState({...sourceState,sequenceApplyState:valid});
  draft.setInput('new scene');
  assert.deepEqual(draft.getState().sequenceApplyState.beats, {});
  assert.equal(draft.getState().sequenceApplyState.revision, 0);
});

test('recordSequenceApplyEvidence records selected Beats using current source identity', () => {
  const draft=createNarrativeState(sourceState);
  const next=draft.recordSequenceApplyEvidence({proposal,provenance:sourceState.sequenceProvenance,sequence,beatIds:['rupture']});
  assert.equal(next.sequenceApplyState.revision,1);
  assert.deepEqual(Object.keys(next.sequenceApplyState.beats),['rupture']);
  assert.equal(next.sequenceApplyState.beats.rupture.source.readingId,'reading-01');
});

test('clearSequenceApplyEvidence resets receipts without touching sequence proposal', () => {
  const draft=createNarrativeState({...sourceState,sequenceProposal:proposal});
  draft.recordSequenceApplyEvidence({proposal,provenance:sourceState.sequenceProvenance,sequence,beatIds:['rupture']});
  const next=draft.clearSequenceApplyEvidence();
  assert.equal(next.sequenceApplyState.revision,0);
  assert.deepEqual(next.sequenceApplyState.beats,{});
  assert.deepEqual(next.sequenceProposal,proposal);
});
