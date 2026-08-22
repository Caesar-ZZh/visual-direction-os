const assert = require('assert');
const { createNarrativeState } = require('./narrative-state.js');

const grounded = (value, sourceType = 'inferred') => ({ value, sourceType, basis: 'short evidence' });
const interpret = {
  signal: 'strong',
  readings: [
    {
      id: 'reading-agency', title: 'AGENCY RECOVERY', confidence: 'high',
      narrativeProblem: grounded('An assigned role becomes control.'),
      coreConflict: grounded('Authority versus self-determination.'),
      startingState: grounded('Compliance', 'explicit'),
      endingState: grounded('Self-directed', 'director_intent'),
      turningPoint: grounded('The assignment is recognized as control.', 'explicit'),
      agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'authority transfers' }
    },
    {
      id: 'reading-rupture', title: 'INSTITUTIONAL RUPTURE', confidence: 'medium',
      narrativeProblem: grounded('Routine becomes rupture.'),
      coreConflict: grounded('Continuity versus refusal.'),
      startingState: grounded('Institution-led'),
      endingState: grounded('Relationship broken'),
      turningPoint: grounded('Task changes meaning.', 'explicit'),
      agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'refusal transfers immediate agency' }
    }
  ],
  clarification: { question: 'Why does the character leave?', options: ['Independent decision', 'External demand'] }
};
const strategies = { strategies: [
  { id:'space', title:'SPACE-LED', primaryVariable:'space', supportingVariables:['camera'], restrainedVariables:['texture'], mechanism:'Pressure accumulates spatially.', rationale:'Freedom is the causal signal.' },
  { id:'camera', title:'CAMERA-LED', primaryVariable:'camera', supportingVariables:['space'], restrainedVariables:['color'], mechanism:'Viewpoint authority transfers.', rationale:'Perspective carries agency.' }
] };
const ids = ['setup','pressure','rupture','release','new-ownership'];
const sequence = { sequenceProposal: { beats: ids.map((id, index) => ({
  id,
  label: id === 'new-ownership' ? 'NEW OWNERSHIP' : id.toUpperCase(),
  narrativeBeat: `beat ${index}`,
  agency: index < 2 ? 'world' : index < 4 ? 'contested' : 'character',
  primaryVariable: index === 4 ? 'agency' : 'camera',
  supportingVariables: ['space'],
  restrainedVariables: ['texture'],
  visualEvents: [],
  sceneStatePatch: { agency: index < 2 ? 'world' : index < 4 ? 'contested' : 'character' },
  rationale: 'causal reason'
})) } };
const skeleton = {
  version:'0.1.0', mode:'compiler-first', grammarId:'camera-authority-transfer',
  agencyConstraint:{path:['world','contested','character'],start:'world',end:'character'},
  beats:ids.map(id=>({id,patchSlots:{}}))
};
const sequenceCompletion = { sequenceCompletion:{ beats:ids.map((id,index)=>({
  id, narrativeBeat:`beat ${index}`, agency:index<2?'world':index<4?'contested':'character', visualEvents:[], rationale:'reason', openPatch:{}
})) } };
const provenance = { origin:'compiler-first', skeletonVersion:'0.1.0', grammarId:'camera-authority-transfer', fields:{} };

const draft = createNarrativeState();
let state = draft.getState();
assert.equal(state.sequenceSkeleton, null);
assert.equal(state.sequenceCompletion, null);
assert.equal(state.sequenceProposal, null);
assert.equal(state.sequenceProvenance, null);

draft.setInput('A character recognizes an assignment as control.', 'End with reclaimed agency.');
assert.equal(draft.getState().stage, 'input');
draft.setInterpretResult(interpret);
assert.equal(draft.getState().stage, 'interpret');
assert.equal(draft.getState().clarification.question, interpret.clarification.question);
draft.setClarificationAnswer('Independent decision');
assert.equal(draft.getState().clarificationAnswer, 'Independent decision');

draft.selectReading('reading-agency');
draft.editSelectedReadingField('endingState', 'The character defines the next action.');
state = draft.getState();
assert.equal(state.selectedReading.endingState.directorEdited, true);
assert.equal(state.selectedReading.endingState.sourceType, 'director_intent');
assert.equal(state.selectedReading.endingState.directorEditBasis, 'Edited by the director.');
assert.equal(state.strategies.length, 0);

draft.confirmReading();
assert.equal(draft.getState().stage, 'strategy');
assert.ok(draft.getState().confirmedReading);
draft.setStrategyResult(strategies);
assert.equal(draft.getState().strategies.length, 2);
draft.selectStrategy('camera');
assert.equal(draft.getState().selectedStrategy.id, 'camera');

assert.equal(typeof draft.setSequenceSkeleton, 'function');
assert.equal(typeof draft.setSequenceCompletionResult, 'function');
assert.equal(typeof draft.setSequenceCompletionFailure, 'function');
draft.setSequenceSkeleton(skeleton);
state = draft.getState();
assert.deepEqual(state.sequenceSkeleton, skeleton);
assert.equal(state.sequenceCompletion, null);
assert.equal(state.sequenceProposal, null);
assert.equal(state.sequenceProvenance, null);

draft.setSequenceCompletionResult({ completion:sequenceCompletion, proposal:sequence.sequenceProposal, provenance });
state = draft.getState();
assert.equal(state.stage, 'sequence');
assert.deepEqual(state.sequenceCompletion, sequenceCompletion);
assert.deepEqual(state.sequenceProposal, sequence.sequenceProposal);
assert.deepEqual(state.sequenceProvenance, provenance);
assert.deepEqual(state.sequenceSkeleton, skeleton);

draft.setApplyMode('selected');
draft.toggleBeat('setup');
assert.equal(draft.getState().applyMode, 'selected');
assert.equal(draft.getState().selectedBeatIds.includes('setup'), false);

// Replacing the deterministic skeleton invalidates stale completion artifacts without invalidating upstream intent.
const nextSkeleton = { ...skeleton, version:'0.1.1' };
draft.setSequenceSkeleton(nextSkeleton);
state = draft.getState();
assert.equal(state.confirmedReading.id, 'reading-agency');
assert.equal(state.selectedStrategy.id, 'camera');
assert.deepEqual(state.sequenceSkeleton, nextSkeleton);
assert.equal(state.sequenceCompletion, null);
assert.equal(state.sequenceProposal, null);
assert.equal(state.sequenceProvenance, null);

// A dynamically invalid but structurally legal raw completion is retained for diagnostics, never promoted to a proposal.
draft.setSequenceCompletionFailure(sequenceCompletion);
state = draft.getState();
assert.deepEqual(state.sequenceSkeleton, nextSkeleton);
assert.deepEqual(state.sequenceCompletion, sequenceCompletion);
assert.equal(state.sequenceProposal, null);
assert.equal(state.sequenceProvenance, null);

// Legacy assembled Sequence path remains loadable for pre-M5 proposals.
draft.setSequenceResult(sequence);
assert.equal(draft.getState().sequenceProposal.beats.length, 5);

const stale = draft.beginRequest('strategy');
const current = draft.beginRequest('strategy');
assert.equal(draft.acceptResponse('strategy', stale, strategies), false);
assert.equal(draft.getState().requests.strategy.token, current);
assert.equal(draft.getState().requests.strategy.status, 'loading');
draft.failRequest('strategy', current, { code: 'NETWORK', message: 'offline' });
assert.equal(draft.getState().requests.strategy.status, 'error');
assert.equal(draft.getState().requests.strategy.error.code, 'NETWORK');

// Editing a confirmed upstream decision invalidates every M5 generation artifact.
draft.setSequenceSkeleton(skeleton);
draft.setSequenceCompletionResult({ completion:sequenceCompletion, proposal:sequence.sequenceProposal, provenance });
draft.editSelectedReadingField('coreConflict', 'Authority versus refusal.');
state = draft.getState();
assert.equal(state.confirmedReading, null);
assert.equal(state.strategies.length, 0);
assert.equal(state.selectedStrategy, null);
assert.equal(state.sequenceSkeleton, null);
assert.equal(state.sequenceCompletion, null);
assert.equal(state.sequenceProposal, null);
assert.equal(state.sequenceProvenance, null);
console.log('narrative-state.test.js passed');
