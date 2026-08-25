const assert = require('node:assert/strict');
const {
  canRedirect,
  resolveGenerationController,
  runGenerationIteration
} = require('./iteration-controller.js');

const delta = {
  promptAppendix: 'ITERATION / EVALUATION DELTA\nCORRECT:\n- Reduce detail density',
  preserve: ['Canvas ratio'],
  correct: ['Reduce detail density'],
  unresolved: []
};

assert.equal(canRedirect(delta), true);
assert.equal(canRedirect({ promptAppendix: '' }), false);
assert.equal(canRedirect(null), false);

const calls = [];
const generation = {
  setRequest(request, options) {
    calls.push(['setRequest', request, options]);
  },
  async generate(request, context) {
    calls.push(['generate', request, context]);
    return { id: 'gen-iteration-2' };
  }
};
const root = { VisualDirectionOS: { generation } };
assert.equal(resolveGenerationController(root), generation);
assert.equal(resolveGenerationController({}), null);

const artifact = {
  id: 'gen-iteration-1',
  request: { model: 'agnes-image-2.1-flash', prompt: 'BASE', size: '2K', ratio: '16:9', return_base64: true, extra_body: { response_format: 'b64_json' } },
  visualIR: { metadata: { version: '0.1.0' } }
};

(async () => {
  const applyIterationDelta = (request, suppliedDelta) => ({
    ...request,
    prompt: `${request.prompt}\n\n${suppliedDelta.promptAppendix}`
  });

  const result = await runGenerationIteration({
    root,
    artifact,
    delta,
    applyIterationDelta
  });

  assert.equal(result.id, 'gen-iteration-2');
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'setRequest');
  assert.match(calls[0][1].prompt, /Reduce detail density/);
  assert.equal(calls[0][2].label, 'ITERATION / QA DELTA');
  assert.equal(calls[1][0], 'generate');
  assert.equal(calls[1][2].iterationOf, 'gen-iteration-1');
  assert.deepEqual(calls[1][2].iterationDelta, delta);
  assert.deepEqual(calls[1][2].visualIR, artifact.visualIR);
  assert.equal(calls[1][1].return_base64, true, 'iteration must preserve Base64 output mode');
  assert.equal(calls[1][1].extra_body.response_format, 'b64_json');

  await assert.rejects(
    () => runGenerationIteration({ root: {}, artifact, delta, applyIterationDelta }),
    /generation runtime is not ready/i
  );

  await assert.rejects(
    () => runGenerationIteration({ root, artifact, delta: { promptAppendix: '' }, applyIterationDelta }),
    /iteration delta/i
  );

  console.log('iteration controller tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
