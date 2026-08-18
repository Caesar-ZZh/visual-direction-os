'use strict';

const assert = require('assert');
const fixtures = require('../../visual-direction-os/narrative-demo-fixtures.js');
const { createOpenAIProvider } = require('./_openai-adapter.js');

function response(ok, status, body) {
  return { ok, status, async json() { return body; } };
}

(async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return response(true, 200, {
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(fixtures.interpret) }] }]
    });
  };
  const provider = createOpenAIProvider({ apiKey: 'sk-test', model: 'gpt-5.6', fetchImpl: fakeFetch });
  const input = { narrative: 'A character recognizes control and refuses.', directorIntent: '', clarificationAnswer: null };
  const result = await provider.generate({ stage: 'interpret', input });
  assert.deepEqual(result, fixtures.interpret);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer sk-test');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, 'gpt-5.6');
  assert.equal(body.store, false);
  assert.equal(typeof body.instructions, 'string');
  assert.ok(body.instructions.includes('Narrative Reading'));
  assert.equal(body.input, JSON.stringify(input));
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.name, 'vdos_interpret');
  assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.schema.type, 'object');

  const noKey = createOpenAIProvider({ apiKey: '', fetchImpl: fakeFetch });
  await assert.rejects(() => noKey.generate({ stage: 'interpret', input }), error => error.code === 'PROVIDER');

  const httpFailure = createOpenAIProvider({
    apiKey: 'sk-test',
    fetchImpl: async () => response(false, 429, { error: { message: 'raw upstream rate limit detail' } })
  });
  await assert.rejects(() => httpFailure.generate({ stage: 'interpret', input }), error => error.code === 'PROVIDER' && !String(error.message).includes('raw upstream'));

  const malformed = createOpenAIProvider({
    apiKey: 'sk-test',
    fetchImpl: async () => response(true, 200, { output: [{ type: 'message', content: [{ type: 'output_text', text: '{not-json' }] }] })
  });
  await assert.rejects(() => malformed.generate({ stage: 'interpret', input }), error => error.code === 'SCHEMA');

  const invalidDomain = createOpenAIProvider({
    apiKey: 'sk-test',
    fetchImpl: async () => response(true, 200, { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ signal: 'strong', readings: [] }) }] }] })
  });
  await assert.rejects(() => invalidDomain.generate({ stage: 'interpret', input }), error => error.code === 'SCHEMA');

  const missingText = createOpenAIProvider({
    apiKey: 'sk-test',
    fetchImpl: async () => response(true, 200, { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] })
  });
  await assert.rejects(() => missingText.generate({ stage: 'interpret', input }), error => error.code === 'PROVIDER');

  console.log('_openai-adapter.test.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});