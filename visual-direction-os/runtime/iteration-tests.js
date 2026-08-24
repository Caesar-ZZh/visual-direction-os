const assert = require('node:assert/strict');
const { applyIterationDelta } = require('./agnes-adapter.js');
const { createGenerationArtifact } = require('./generation-client.js');

const request = {
  model: 'agnes-image-2.1-flash',
  prompt: 'BASE PROMPT',
  size: '2K',
  ratio: '16:9',
  extra_body: { response_format: 'url' }
};
const delta = {
  preserve: ['Canvas ratio is correct'],
  correct: ['Reduce saturation'],
  unresolved: ['Camera allegiance'],
  promptAppendix: 'ITERATION / EVALUATION DELTA\nPRESERVE:\n- Canvas ratio is correct\n\nCORRECT:\n- Reduce saturation'
};
const revised = applyIterationDelta(request, delta);
assert.notEqual(revised, request);
assert.equal(request.prompt, 'BASE PROMPT', 'base request must not be mutated');
assert.match(revised.prompt, /BASE PROMPT/);
assert.match(revised.prompt, /ITERATION \/ EVALUATION DELTA/);
assert.match(revised.prompt, /Reduce saturation/);
assert.doesNotMatch(revised.prompt, /Camera allegiance/, 'unresolved items must not be appended');
assert.deepEqual(revised.extra_body, request.extra_body);

const unchanged = applyIterationDelta(request, { promptAppendix: '' });
assert.deepEqual(unchanged, request);
assert.notEqual(unchanged, request);

const ir = {
  metadata: { version: '0.1.0' },
  world: { grammarId: { value: 'boundary-relational' } }
};
const result = { kind: 'url', src: 'https://example.com/generated.png', revisedPrompt: null };
const artifact = createGenerationArtifact({
  provider: 'agnes-image-2.1-flash',
  request,
  result,
  ir,
  id: 'gen-test',
  createdAt: '2026-08-24T08:00:00.000Z'
});
assert.equal(artifact.id, 'gen-test');
assert.equal(artifact.createdAt, '2026-08-24T08:00:00.000Z');
assert.equal(artifact.provider, 'agnes-image-2.1-flash');
assert.equal(artifact.visualIRVersion, '0.1.0');
assert.equal(artifact.grammarId, 'boundary-relational');
assert.equal(artifact.measurements, null);
assert.equal(artifact.evaluation, null);
assert.deepEqual(artifact.request, request);
assert.notEqual(artifact.request, request, 'artifact must snapshot the request');

console.log('iteration tests passed');
