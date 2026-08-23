const test = require('node:test');
const assert = require('node:assert/strict');
const inspector = require('./project-constraint-inspector.js');
const registry = require('./project-constraint-registry.js');

const candidate = {
  candidateFingerprint:'pcand-1111111111111111',
  type:'ownership-carry', sourceSceneId:'scene-02', targetSceneId:'scene-03',
  family:'camera', path:'camera.perspective', expected:'mixed'
};

function confirmedRegistry() {
  return registry.confirmCandidate(registry.createEmptyRegistry(), {
    candidateId:'candidate-1', candidateFingerprint:'pcand-1111111111111111',
    type:'ownership-carry', family:'camera', path:'camera.perspective', expected:'mixed',
    scope:{sourceSceneId:'scene-02',targetSceneId:'scene-03',beatIds:['setup']},
    evidenceSnapshot:{sourceSceneId:'scene-02',targetSceneId:'scene-03',path:'camera.perspective',expected:'mixed'}
  });
}

test('Candidate renders Confirm/Reject and no Project write owner', () => {
  const html = inspector.renderProjectConstraints({candidates:[candidate],registry:registry.createEmptyRegistry(),authorityState:null});
  assert.match(html, /PROJECT CONSTRAINTS · DIRECTOR CONTROL/);
  assert.match(html, /CANDIDATE/);
  assert.match(html, /CONFIRM/);
  assert.match(html, /REJECT/);
  assert.doesNotMatch(html, /owner:\s*project/i);
});

test('stale renders AUTHORITY REMOVED', () => {
  const state = confirmedRegistry();
  const id = Object.keys(state.constraints)[0];
  const html = inspector.renderProjectConstraints({candidates:[],registry:state,authorityState:{resolutions:[{constraintId:id,status:'STALE',reason:'EVIDENCE_CHANGED',sceneExpected:null}]}});
  assert.match(html, /STALE · AUTHORITY REMOVED/);
  assert.match(html, /EXACT AUTHORITY · NONE/);
  assert.match(html, /REVIEW NEW REVISION/);
});

test('conflict renders blocked write authority and no AI completion', () => {
  const state = confirmedRegistry();
  const id = Object.keys(state.constraints)[0];
  const html = inspector.renderProjectConstraints({candidates:[],registry:state,authorityState:{resolutions:[{constraintId:id,status:'CONFLICT',reason:'TARGET_GRAMMAR_UNSUPPORTED',sceneExpected:null}]}});
  assert.match(html, /CONFIRMED · CONFLICT/);
  assert.match(html, /WRITE AUTHORITY · BLOCKED/);
  assert.match(html, /AI COMPLETION · NOT STARTED/);
  assert.match(html, /RELEASE FOR THIS BEAT/);
});

test('dynamic content is escaped', () => {
  const html = inspector.renderProjectConstraints({candidates:[{...candidate,sourceSceneId:'<script>alert(1)</script>'}],registry:registry.createEmptyRegistry()});
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;SCRIPT&gt;/);
});
