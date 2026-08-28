const assert = require('node:assert/strict');
const {
  resolveContinuitySource,
  deriveContinuityStatus,
  buildContinuityDependents,
  collectContinuityDescendants,
  detectAutoSourceChange,
  isContinuityReviewCurrent
} = require('./continuity-engine.js');

const blob = new Blob(['x'], {type:'image/webp'});
const shots = [
  { id:'s1', sequenceId:'q1', order:1, continuityMode:'auto', approvedArtifactId:'g1' },
  { id:'s2', sequenceId:'q1', order:2, continuityMode:'auto', approvedArtifactId:'h1' },
  { id:'s3', sequenceId:'q1', order:3, continuityMode:'manual', continuitySourceShotId:'s1', approvedArtifactId:'k1' }
];
const artifactsById = new Map([
  ['g1', { id:'g1', shotId:'s1', imageBlob:blob }],
  ['h1', { id:'h1', shotId:'s2', imageBlob:blob }],
  ['k1', { id:'k1', shotId:'s3', imageBlob:blob }]
]);

assert.equal(resolveContinuitySource({ shot:shots[1], shots, artifactsById }).sourceShotId, 's1');
assert.equal(resolveContinuitySource({ shot:shots[2], shots, artifactsById }).sourceShotId, 's1');
assert.equal(deriveContinuityStatus({ shot:shots[0], shots, artifactsById }), 'not_applicable');
assert.deepEqual(collectContinuityDescendants('s1', shots).sort(), ['s2','s3']);
assert.deepEqual(buildContinuityDependents(shots).get('s1').sort(), ['s2','s3']);

const noApproved = shots.map((s) => ({...s}));
noApproved[0].approvedArtifactId = null;
assert.equal(deriveContinuityStatus({ shot:noApproved[1], shots:noApproved, artifactsById }), 'source_missing');

const missingBytes = new Map(artifactsById);
missingBytes.set('g1', { id:'g1', shotId:'s1', imageBlob:null });
assert.equal(deriveContinuityStatus({ shot:shots[1], shots, artifactsById:missingBytes }), 'source_unavailable');

const reordered = [
  {...shots[1], order:1},
  {...shots[0], order:2},
  {...shots[2], order:3}
];
assert.deepEqual(detectAutoSourceChange({ shotId:'s2', beforeShots:shots, afterShots:reordered }), {
  previousSourceShotId:'s1', currentSourceShotId:null
});

const outOfOrder = {...shots[2], order:1};
assert.equal(deriveContinuityStatus({ shot:outOfOrder, shots:[outOfOrder,{...shots[0],order:2},{...shots[1],order:3}], artifactsById }), 'source_out_of_order');

const reviewed = {...shots[1], continuityReview:{ status:'accepted', reviewedArtifactId:'h1', sourceArtifactId:'g1' }};
const reviewedResolution = resolveContinuitySource({shot:reviewed,shots:[shots[0],reviewed,shots[2]],artifactsById});
assert.equal(isContinuityReviewCurrent({ shot:reviewed, resolution:reviewedResolution }), true);
assert.equal(isContinuityReviewCurrent({ shot:{...reviewed,continuityReview:{...reviewed.continuityReview,sourceArtifactId:'old'}}, resolution:reviewedResolution }), false);
assert.equal(deriveContinuityStatus({ shot:{...reviewed, continuityInvalidation:{causedByShotId:'s1'}}, shots:[shots[0],reviewed,shots[2]], artifactsById }), 'current');
assert.equal(deriveContinuityStatus({ shot:{...shots[1], continuityInvalidation:{causedByShotId:'s1'}}, shots, artifactsById }), 'review_required');

const crossSequence = {...shots[2], sequenceId:'q2', continuitySourceShotId:'s1'};
assert.equal(resolveContinuitySource({ shot:crossSequence, shots:[shots[0],crossSequence], artifactsById }).status, 'missing');

const dataUriArtifacts = new Map(artifactsById);
dataUriArtifacts.set('g1', { id:'g1', shotId:'s1', result:{src:'data:image/webp;base64,AA=='} });
assert.equal(resolveContinuitySource({ shot:shots[1], shots, artifactsById:dataUriArtifacts }).status, 'resolved');

console.log('continuity engine tests passed');
