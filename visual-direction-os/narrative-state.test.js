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
  clarification: null
};
const strategies = { strategies: [
  { id:'space', title:'SPACE-LED', primaryVariable:'space', supportingVariables:['camera'], restrainedVariables:['texture'], mechanism:'Pressure accumulates spatially.', rationale:'Freedom is the causal signal.' },
  { id:'camera', title:'CAMERA-LED', primaryVariable:'camera', supportingVariables:['space'], restrainedVariables:['color'], mechanism:'Viewpoint authority transfers.', rationale:'Perspective carries agency.' }
] };

const draft = createNarrativeState();
draft.setInput('A character recognizes an assignment as control.', 'End with reclaimed agency.');
draft.setInterpretResult(interpret);
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

const stale = draft.beginRequest('strategy');
const current = draft.beginRequest('strategy');
assert.equal(draft.acceptResponse('strategy', stale, strategies), false);
assert.equal(draft.getState().requests.strategy.token, current);
assert.equal(draft.getState().requests.strategy.status, 'loading');
console.log('narrative-state.test.js passed');
