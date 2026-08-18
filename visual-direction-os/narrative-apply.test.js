const assert = require('assert');
const apply = require('./narrative-apply.js');
const model = require('./sequence-director-model.js');
const fixtures = require('./narrative-demo-fixtures.js');

const next = apply.buildSequenceFromProposal(
  fixtures.sequence.sequenceProposal,
  model.DEFAULT_SEQUENCE,
  ['rupture', 'release']
);

const originalSetup = model.DEFAULT_SEQUENCE.beats.find(beat => beat.id === 'setup');
const nextSetup = next.beats.find(beat => beat.id === 'setup');
const proposalRupture = fixtures.sequence.sequenceProposal.beats.find(beat => beat.id === 'rupture');
const nextRupture = next.beats.find(beat => beat.id === 'rupture');

assert.equal(nextSetup.narrativePurpose, originalSetup.narrativePurpose, 'unselected beats stay untouched');
assert.equal(nextRupture.narrativePurpose, proposalRupture.narrativeBeat, 'selected beat receives proposal narrative purpose');
assert.equal(nextRupture.primaryVariable, proposalRupture.primaryVariable);
assert.deepEqual(nextRupture.supportingVariables, proposalRupture.supportingVariables);
assert.deepEqual(nextRupture.restrainedVariables, proposalRupture.restrainedVariables);
assert.deepEqual(nextRupture.scenePatch, proposalRupture.sceneStatePatch);
assert.equal(model.validateSequence(next).valid, true, 'applied sequence remains a valid Sequence Director sequence');

const setupEventsBefore = model.DEFAULT_SEQUENCE.events.filter(event => event.beatId === 'setup');
const setupEventsAfter = next.events.filter(event => event.beatId === 'setup');
assert.deepEqual(setupEventsAfter, setupEventsBefore, 'unselected beat events stay untouched');
const ruptureEvents = next.events.filter(event => event.beatId === 'rupture');
assert.deepEqual(ruptureEvents.map(event => event.type), proposalRupture.visualEvents);
assert.ok(ruptureEvents.every(event => event.at >= nextRupture.start && event.at <= nextRupture.end));
assert.ok(ruptureEvents.every((event, index) => event.id === `rupture-proposal-${index}`));

const impact = apply.summarizeImpact(model.DEFAULT_SEQUENCE, next);
assert.deepEqual(impact.changedBeatIds, ['rupture', 'release']);
assert.ok(impact.changedEventBeatIds.includes('rupture'));
assert.ok(impact.changedEventBeatIds.includes('release'));

assert.throws(
  () => apply.buildSequenceFromProposal(
    { beats: fixtures.sequence.sequenceProposal.beats.map(beat => beat.id === 'rupture' ? { ...beat, sceneStatePatch: null } : beat) },
    model.DEFAULT_SEQUENCE,
    ['rupture']
  ),
  /scene state patch/i,
  'invalid proposal patches are rejected instead of invented'
);

console.log('narrative-apply.test.js passed');