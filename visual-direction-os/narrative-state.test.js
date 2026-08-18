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

const draft = createNarrativeState();
draft.setInput('A character recognizes an assignment as control.', 'End with reclaimed agency.');
assert.equal(draft.getState().stage, 'input');
draft.setInterpretResult(interpret);
assert.equal(draft.getState().stage, 'interpret');
assert.equal(draft.getState().clarification.question, interpret.clarification.question);
draft.setClarificationAnswer('Independent decision');
assert.equal(draft.getState().clarificationAnswer, 'Independent decision');

draft.selectReading('reading-agency');
draft.editSelectedReadingField('endingState', 'The character defines the next action.');
let state = draft.getState();
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
draft.setSequenceResult(sequence);
assert.equal(draft.getState().stage, 'sequence');
assert.equal(draft.getState().sequenceProposal.beats.length, 5);

draft.setApplyMode('selected');
draft.toggleBeat('setup');
assert.equal(draft.getState().applyMode, 'selected');
assert.equal(draft.getState().selectedBeatIds.includes('setup'), false);

const stale = draft.beginRequest('strategy');
const current = draft.beginRequest('strategy');
assert.equal(draft.acceptResponse('strategy', stale, strategies), false);
assert.equal(draft.getState().requests.strategy.token, current);
assert.equal(draft.getState().requests.strategy.status, 'loading');
draft.failRequest('strategy', current, { code: 'NETWORK', message: 'offline' });
assert.equal(draft.getState().requests.strategy.status, 'error');
assert.equal(draft.getState().requests.strategy.error.code, 'NETWORK');

// Editing a confirmed upstream decision invalidates downstream generated work.
draft.editSelectedReadingField('coreConflict', 'Authority versus refusal.');
state = draft.getState();
assert.equal(state.confirmedReading, null);
assert.equal(state.strategies.length, 0);
assert.equal(state.selectedStrategy, null);
assert.equal(state.sequenceProposal, null);
console.log('narrative-state.test.js passed');
