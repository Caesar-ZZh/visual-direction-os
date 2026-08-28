const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('./project-constraint-registry.js');

test('canonical JSON sorts object keys and preserves array order', () => {
  const a = {z:1,a:{y:2,x:3},list:['b','a']};
  const b = {list:['b','a'],a:{x:3,y:2},z:1};
  assert.equal(registry.canonicalJSONString(a), registry.canonicalJSONString(b));
  assert.match(registry.fingerprintSnapshot('pcf', a), /^pcf-[0-9a-f]{16}$/);
});

test('undefined object keys are omitted', () => {
  assert.equal(registry.canonicalJSONString({a:1,b:undefined}), '{"a":1}');
});

const candidate = {
  candidateId:'candidate-scene02-scene03-camera-carry',
  candidateFingerprint:'pcand-1111111111111111',
  type:'ownership-carry',
  family:'camera',
  path:'camera.perspective',
  expected:'mixed',
  scope:{sourceSceneId:'scene-02',targetSceneId:'scene-03',beatIds:['setup']},
  evidenceSnapshot:{sourceSceneId:'scene-02',targetSceneId:'scene-03',path:'camera.perspective',expected:'mixed'}
};

test('confirm creates REV 01 with immutable evidence snapshot', () => {
  const next = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const item = Object.values(next.constraints)[0];
  assert.equal(item.decision, 'confirmed');
  assert.equal(item.currentRevision, 1);
  assert.equal(item.revisions['1'].state, 'current');
  assert.equal(item.revisions['1'].expected, 'mixed');
  assert.deepEqual(item.revisions['1'].evidence.canonicalSnapshot, candidate.evidenceSnapshot);
  assert.match(item.revisions['1'].evidence.fingerprint, /^pcf-[0-9a-f]{16}$/);
  assert.notEqual(item.revisions['1'].evidence.canonicalSnapshot, candidate.evidenceSnapshot);
});

test('reject persists fingerprint only and does not create a constraint', () => {
  const next = registry.rejectCandidate(registry.createEmptyRegistry(), candidate);
  assert.equal(next.dismissals[candidate.candidateFingerprint].decision, 'rejected');
  assert.deepEqual(next.constraints, {});
});

test('REV 02 supersedes REV 01 and does not inherit release', () => {
  let next = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const id = Object.keys(next.constraints)[0];
  next = registry.releaseConstraintScope(next, id, {sceneId:'scene-03',beatId:'setup'});
  next = registry.reconfirmConstraint(next, id, {
    ...candidate,
    expected:'character',
    evidenceSnapshot:{...candidate.evidenceSnapshot,expected:'character'}
  });
  assert.equal(next.constraints[id].currentRevision, 2);
  assert.equal(next.constraints[id].revisions['1'].state, 'superseded');
  assert.equal(next.constraints[id].revisions['1'].exceptions.length, 1);
  assert.equal(next.constraints[id].revisions['2'].exceptions.length, 0);
});

test('revoke removes runtime decision authority but preserves revision history', () => {
  let next = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const id = Object.keys(next.constraints)[0];
  next = registry.revokeConstraint(next, id);
  assert.equal(next.constraints[id].decision, 'revoked');
  assert.equal(next.constraints[id].currentRevision, 1);
  assert.equal(next.constraints[id].revisions['1'].expected, 'mixed');
});

test('validator rejects invalid schema, missing current revision, and revision-mismatched release', () => {
  assert.equal(registry.validateRegistry({schemaVersion:'broken',constraints:{},dismissals:{}}).valid, false);

  const confirmed = registry.confirmCandidate(registry.createEmptyRegistry(), candidate);
  const id = Object.keys(confirmed.constraints)[0];

  const missing = JSON.parse(JSON.stringify(confirmed));
  delete missing.constraints[id].revisions['1'];
  assert.equal(registry.validateRegistry(missing).valid, false);

  const mismatched = JSON.parse(JSON.stringify(confirmed));
  mismatched.constraints[id].revisions['1'].exceptions.push({sceneId:'scene-03',beatId:'setup',action:'release',revision:2});
  assert.equal(registry.validateRegistry(mismatched).valid, false);
});
