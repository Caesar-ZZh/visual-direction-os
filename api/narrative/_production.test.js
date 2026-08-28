'use strict';

const assert = require('assert');
const fixtures = require('../../visual-direction-os/narrative-demo-fixtures.js');
const { createProductionHandler } = require('./_handler.js');

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = JSON.stringify(value); return this; }
  };
}

(async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(fixtures.interpret) }] }] };
      }
    };
  };
  const handler = createProductionHandler('interpret', {
    env: {
      OPENAI_API_KEY: 'sk-test',
      OPENAI_MODEL: 'gpt-5.6',
      VDOS_ALLOWED_ORIGIN: 'https://caesar-zzh.github.io',
      NODE_ENV: 'production'
    },
    fetchImpl
  });
  const res = makeRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://caesar-zzh.github.io' },
    body: { narrative: 'A character recognizes control and refuses.', directorIntent: '' }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).readings.length, 2);
  assert.equal(JSON.parse(calls[0].options.body).model, 'gpt-5.6');

  for (const stage of ['interpret', 'strategy', 'sequence']) {
    const endpoint = require(`./${stage}.js`);
    assert.equal(typeof endpoint, 'function', `${stage}.js must export a serverless handler function`);
  }

  console.log('_production.test.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});