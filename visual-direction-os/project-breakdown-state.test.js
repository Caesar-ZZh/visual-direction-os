const assert = require('assert');
const fixture = require('./project-breakdown-fixtures.js');
const { createProjectBreakdownState } = require('./project-breakdown-state.js');
const draft = createProjectBreakdownState();
draft.setInput('story', 'End with reclaimed agency.');
const stale = draft.beginRequest();
const current = draft.beginRequest();
assert.equal(draft.acceptResponse(stale, fixture.breakdown), false);
assert.equal(draft.acceptResponse(current, fixture.breakdown), true);
assert.equal(draft.getState().proposedScenes.length, 4);

draft.editSceneField('proposal-scene-03', 'endingState', 'The refusal becomes public.');
assert.equal(draft.getState().proposedScenes[2].directorEdits.endingState, true);

draft.splitScene('proposal-scene-02', [
  { ...draft.getState().proposedScenes[1], id:'proposal-scene-02a', title:'Recognition' },
  { ...draft.getState().proposedScenes[1], id:'proposal-scene-02b', title:'Hesitation', role:'pressure' }
]);
assert.equal(draft.getState().proposedScenes.length, 5);
assert.throws(() => draft.mergeScenes('proposal-scene-01','proposal-scene-03',{ id:'merged' }), /adjacent/i);
console.log('project-breakdown-state.test.js passed');
