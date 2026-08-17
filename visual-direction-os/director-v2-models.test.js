const assert = require('assert');

const stateMachine = require('./state-machine.js');
const sequence = require('./sequence-score.js');
const colorOwnership = require('./color-ownership.js');
const diagnostic = require('./diagnostic.js');
const timelineSync = require('./timeline-sync.js');

assert.deepStrictEqual(stateMachine.listCases().sort(), ['elian','gwen','hobie','miles']);
const gwenMid = stateMachine.sampleCase('gwen', 0.5);
assert.equal(gwenMid.caseId, 'gwen');
assert.ok(['connection','rupture'].includes(gwenMid.narrativeState));
assert.ok(gwenMid.variables.color.temperature);
assert.ok(gwenMid.ownership.character);

const seq = sequence.sampleSequence(0.72);
assert.equal(seq.playhead, 0.72);
assert.ok(seq.tracks.color);
assert.ok(seq.tracks.agency);
assert.ok(seq.ownership.character);
assert.ok(seq.currentBeat.id);

const semanticSeq = sequence.sampleSequence(0.5);
assert.equal(semanticSeq.currentBeat.id, 'rupture');
assert.equal(semanticSeq.currentBeat.label, 'RUPTURE');
assert.ok(semanticSeq.hierarchy.primary);
assert.ok(semanticSeq.tension);
assert.ok(Array.isArray(semanticSeq.events));
assert.ok(semanticSeq.events.some(event => event.type === 'TEXTURE PEAK'));

const synced = timelineSync.deriveTimelineView({ activeCase:'gwen', playhead:0.5 }, stateMachine, sequence);
assert.equal(synced.caseView.caseId, 'gwen');
assert.equal(synced.caseView.playhead, 0.5);
assert.equal(synced.sequenceView.playhead, 0.5);
assert.equal(synced.sequenceView.currentBeat.id, 'rupture');

const territory = colorOwnership.describeOwnership({ character: 'high', world: 'low', narrative: 'medium' });
assert.equal(territory.primaryOwner, 'character');
assert.equal(territory.conflict, false);
const conflict = colorOwnership.describeOwnership({ character: 'high', world: 'high', narrative: 'medium' });
assert.equal(conflict.conflict, true);

const coherent = diagnostic.runDiagnostic(diagnostic.fixtures.coherent);
assert.ok(coherent.findings.every(f => ['PASS','WARN'].includes(f.level)));
const incoherent = diagnostic.runDiagnostic(diagnostic.fixtures.incoherent);
assert.ok(incoherent.findings.some(f => f.level === 'FAIL'));
assert.ok(incoherent.findings.some(f => f.id === 'ownership-conflict'));

console.log('director-v2 model tests passed');
