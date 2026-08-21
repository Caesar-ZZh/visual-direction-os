const assert = require('assert');
const model = require('./sequence-director-model.js');

assert.equal(model.clamp01(-1), 0);
assert.equal(model.clamp01(2), 1);

const setup = model.deriveActiveBeat(model.DEFAULT_SEQUENCE, 0.05);
assert.equal(setup.id, 'setup');
const pressureBoundary = model.deriveActiveBeat(model.DEFAULT_SEQUENCE, 0.18);
assert.equal(pressureBoundary.id, 'pressure');
const rupture = model.deriveActiveBeat(model.DEFAULT_SEQUENCE, 0.5);
assert.equal(rupture.id, 'rupture');
const release = model.deriveActiveBeat(model.DEFAULT_SEQUENCE, 0.68);
assert.equal(release.id, 'release');
const ownership = model.deriveActiveBeat(model.DEFAULT_SEQUENCE, 0.92);
assert.equal(ownership.id, 'new-ownership');

const atShift = model.deriveSequenceState(model.DEFAULT_SEQUENCE, 0.82);
assert.ok(atShift.events.some(event => event.type === 'OWNERSHIP SHIFT'));
assert.equal(atShift.hierarchy.primary, 'agency');
assert.equal(atShift.patch.agency, 'character');
assert.equal(atShift.patch.variables.color.territory, 'character');
assert.equal(atShift.patch.variables.camera.perspective, 'character');

const releaseState = model.deriveSequenceState(model.DEFAULT_SEQUENCE, 0.68);
assert.equal(releaseState.beat.id, 'release');
assert.ok(['low', 'medium'].includes(releaseState.tension));
assert.ok(releaseState.hierarchy.restrain.includes('texture'));
assert.ok(releaseState.hierarchy.support.includes('camera'));

const ruptureState = model.deriveSequenceState(model.DEFAULT_SEQUENCE, 0.5);
assert.equal(ruptureState.tension, 'high');
assert.equal(ruptureState.hierarchy.primary, 'space');
assert.ok(ruptureState.events.some(event => event.type === 'TEXTURE PEAK'));
assert.ok(ruptureState.tracks.space > ruptureState.tracks.agency);
assert.equal(ruptureState.qualitative.space, 'high');

const sampled = model.sampleSequence(0.5);
assert.equal(sampled.currentBeat.id, 'rupture');
assert.equal(sampled.playhead, 0.5);
assert.ok(sampled.ownership.narrative);
assert.ok(sampled.tracks.color >= 0 && sampled.tracks.color <= 1);

assert.deepStrictEqual(model.validateSequence(model.DEFAULT_SEQUENCE), { valid: true, errors: [] });

const invalid = model.validateSequence({
  beats: [
    { id: 'a', start: 0, end: 0.6 },
    { id: 'b', start: 0.5, end: 1 }
  ],
  events: []
});
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.some(error => error.includes('overlap')));

console.log('sequence director model tests passed');
