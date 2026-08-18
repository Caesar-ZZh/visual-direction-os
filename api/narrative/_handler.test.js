const assert = require('assert');
const fixtures = require('../../visual-direction-os/narrative-demo-fixtures.js');
const { createHandler } = require('./_handler.js');

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

async function run(handler, req) {
  const res = makeRes();
  await handler(req, res);
  return { ...res, jsonBody: res.body ? JSON.parse(res.body) : null };
}

(async () => {
  const calls = [];
  const provider = {
    async generate(input) {
      calls.push(input);
      return fixtures[input.stage];
    }
  };
  const handler = createHandler({
    stage: 'interpret',
    provider,
    allowedOrigin: 'https://caesar-zzh.github.io',
    production: true
  });

  const projectContext = {
    projectIntent: 'End with reclaimed agency.',
    sceneRole: 'rupture',
    narrativeFunction: 'Recognition becomes explicit refusal.',
    startingState: 'Agency is contested.',
    endingState: 'The character refuses.',
    agencyTransition: ['contested', 'character']
  };
  const request = {
    method: 'POST',
    headers: { origin: 'https://caesar-zzh.github.io' },
    body: { narrative: 'A character recognizes an assignment as control and refuses it.', directorIntent: 'End with reclaimed agency.', projectContext }
  };
  const ok = await run(handler, request);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['access-control-allow-origin'], 'https://caesar-zzh.github.io');
  assert.equal(ok.headers['vary'], 'Origin');
  assert.equal(ok.jsonBody.readings.length, 2);
  assert.equal(calls[0].stage, 'interpret');
  assert.equal(calls[0].input.narrative, request.body.narrative);
  assert.deepEqual(calls[0].input.projectContext, projectContext, 'Interpret provider must receive validated Project Context');

  const invalidContext = await run(handler, { ...request, body: { ...request.body, projectContext: { ...projectContext, camera: { perspective: 'character' } } } });
  assert.equal(invalidContext.statusCode, 400);
  assert.equal(invalidContext.jsonBody.error.code, 'BAD_REQUEST');

  const blocked = await run(handler, { ...request, headers: { origin: 'https://evil.example' } });
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.jsonBody.error.code, 'FORBIDDEN');

  const wrongMethod = await run(handler, { ...request, method: 'GET' });
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.jsonBody.error.code, 'METHOD_NOT_ALLOWED');

  const tooLong = await run(handler, { ...request, body: { narrative: 'x'.repeat(2001), directorIntent: '' } });
  assert.equal(tooLong.statusCode, 400);
  assert.equal(tooLong.jsonBody.error.code, 'BAD_REQUEST');

  const providerFailure = createHandler({
    stage: 'interpret',
    provider: { async generate() { const error = new Error('secret upstream detail'); error.code = 'PROVIDER'; throw error; } },
    allowedOrigin: 'https://caesar-zzh.github.io',
    production: true
  });
  const failed = await run(providerFailure, request);
  assert.equal(failed.statusCode, 502);
  assert.equal(failed.jsonBody.error.code, 'PROVIDER');
  assert.equal(failed.body.includes('secret upstream detail'), false, 'provider internals must not leak to browser responses');

  console.log('_handler.test.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});