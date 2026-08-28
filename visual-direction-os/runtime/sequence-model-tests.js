const assert = require('node:assert/strict');
const {
  legacySequenceIdForProject,
  legacyShotIdForProject,
  shapeSequence,
  shapeShot,
  sortSequences,
  sortShots,
  migrateLegacyBundleToM6
} = require('./sequence-model.js');

const project = { id:'project-a', title:'Legacy', createdAt:'2026-01-01', updatedAt:'2026-01-02' };
const artifacts = [
  { id:'g1', projectId:'project-a', rootArtifactId:'g1', parentArtifactId:null, generationIndex:1, imageMimeType:'image/webp' },
  { id:'g2', projectId:'project-a', rootArtifactId:'g1', parentArtifactId:'g1', generationIndex:2 }
];
const comparisons = [{ id:'g1::g2', projectId:'project-a', artifactAId:'g1', artifactBId:'g2' }];

assert.throws(() => legacySequenceIdForProject(''), /projectId/i);
assert.throws(() => legacyShotIdForProject(''), /projectId/i);
assert.equal(legacySequenceIdForProject('project a'), 'sequence-legacy-project%20a');
assert.equal(legacyShotIdForProject('project a'), 'shot-legacy-project%20a');

const seq = shapeSequence({ id:'q2', projectId:'p1', order:2, title:'B', intent:'two', createdAt:'a', updatedAt:'b' });
const shot = shapeShot({ id:'s2', projectId:'p1', sequenceId:'q2', order:2, title:'B', intent:'two', createdAt:'a', updatedAt:'b' });
assert.equal(seq.order, 2);
assert.equal(shot.continuityMode, 'auto');
assert.equal(shot.approvedArtifactId, null);
assert.deepEqual(sortSequences([{...seq,id:'q3',order:3},{...seq,id:'q1',order:1}]).map((x)=>x.id), ['q1','q3']);
assert.deepEqual(sortShots([{...shot,id:'s3',order:3},{...shot,id:'s1',order:1}]).map((x)=>x.id), ['s1','s3']);

const first = migrateLegacyBundleToM6({ project, artifacts, comparisons });
const second = migrateLegacyBundleToM6({ project, artifacts, comparisons });
assert.equal(first.sequences[0].id, legacySequenceIdForProject('project-a'));
assert.equal(first.shots[0].id, legacyShotIdForProject('project-a'));
assert.deepEqual(first.sequences, second.sequences);
assert.deepEqual(first.shots, second.shots);
assert.equal(first.shots[0].approvedArtifactId, null);
assert.equal(first.project.activeSequenceId, first.sequences[0].id);
assert.equal(first.project.activeShotId, first.shots[0].id);
assert.equal(first.artifacts[1].parentArtifactId, 'g1');
assert.equal(first.artifacts[1].rootArtifactId, 'g1');
assert.equal(first.artifacts[1].shotId, first.shots[0].id);
assert.equal(first.artifacts[0].imageMimeType, 'image/webp');
assert.equal(first.comparisons[0].shotId, first.shots[0].id);
assert.equal(project.activeShotId, undefined, 'migration must not mutate source project');
assert.equal(artifacts[0].shotId, undefined, 'migration must not mutate source artifacts');

console.log('sequence model tests passed');
