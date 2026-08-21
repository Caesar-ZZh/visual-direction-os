const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const authority = require('./visual-compiler-authority.js');
const apply = require('./narrative-apply.js');
const model = require('./sequence-director-model.js');
const fixtures = require('./narrative-demo-fixtures.js');

const clone = value => JSON.parse(JSON.stringify(value));
const cameraIR = { grammar: { status: 'resolved', id: 'camera-authority-transfer' } };

test('resolved proposal overrides a supported AI conflict without mutating the raw proposal', () => {
  const proposal = clone(fixtures.legacySequence.sequenceProposal);
  const rupture = proposal.beats.find(beat => beat.id === 'rupture');
  rupture.sceneStatePatch.variables.camera.perspective = 'world';
  const rawBefore = JSON.stringify(proposal);

  const plan = authority.resolveSequenceAuthority({ visualIR: cameraIR, proposal });
  const rupturePlan = plan.beats.find(beat => beat.id === 'rupture');
  assert.equal(rupturePlan.decisions.find(item => item.path === 'camera.perspective').action, 'OVERRIDE');
  assert.equal(plan.resolvedProposal.beats.find(beat => beat.id === 'rupture').sceneStatePatch.variables.camera.perspective, 'mixed');
  assert.equal(JSON.stringify(proposal), rawBefore, 'authority resolution must not rewrite the raw Narrative proposal');

  const next = apply.buildSequenceFromProposal(plan.resolvedProposal, model.DEFAULT_SEQUENCE, ['rupture']);
  const nextRupture = next.beats.find(beat => beat.id === 'rupture');
  assert.equal(nextRupture.scenePatch.variables.camera.perspective, 'mixed');
  const ruptureEvents = next.events.filter(event => event.beatId === 'rupture');
  assert.ok(ruptureEvents.length > 0);
  assert.ok(ruptureEvents.every(event => event.targetPatch.variables.camera.perspective === 'mixed'));
  assert.equal(proposal.beats.find(beat => beat.id === 'rupture').sceneStatePatch.variables.camera.perspective, 'world');
});

test('Apply UI consumes the latest guarded authority plan only at explicit Apply time', () => {
  const ui = fs.readFileSync(path.join(__dirname, 'narrative-apply-ui.js'), 'utf8');
  assert.match(ui, /getAuthorityPlan/);
  assert.match(ui, /resolvedProposal/);
  assert.match(ui, /proposalForApply/);
  assert.match(ui, /COMPILER GUARDED/);
  assert.match(ui, /COMPILER UNRESOLVED/);
  assert.match(ui, /data-apply-action/);
  assert.match(ui, /narrative:apply/);
});
