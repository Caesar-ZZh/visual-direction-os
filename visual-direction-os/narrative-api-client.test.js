const assert = require('assert');
const fixtures = require('./narrative-demo-fixtures.js');
const { createNarrativeApiClient } = require('./narrative-api-client.js');

(async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => fixtures.interpret };
  };
  const client = createNarrativeApiClient({ baseUrl: 'https://api.example.test/api/narrative/', fetchImpl: fakeFetch });
  const result = await client.interpret({ narrative: 'scene', directorIntent: '' });
  assert.equal(result.readings.length, 2);
  assert.equal(calls[0].url, 'https://api.example.test/api/narrative/interpret');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(JSON.parse(calls[0].options.body).narrative, 'scene');

  const unconfigured = createNarrativeApiClient({ baseUrl: '', fetchImpl: fakeFetch });
  await assert.rejects(() => unconfigured.interpret({ narrative: 'scene' }), error => error.code === 'NOT_CONFIGURED');

  const demo = createNarrativeApiClient({ baseUrl: '', demoMode: true, fixtures });
  const demoStrategy = await demo.strategy({ confirmedReading: {} });
  assert.equal(demoStrategy.strategies.length, 3);

  const invalid = createNarrativeApiClient({
    baseUrl: 'https://api.example.test/api/narrative',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ readings: [] }) })
  });
  await assert.rejects(() => invalid.interpret({ narrative: 'scene' }), error => error.code === 'SCHEMA');

  const failed = createNarrativeApiClient({
    baseUrl: 'https://api.example.test/api/narrative',
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) })
  });
  await assert.rejects(() => failed.sequence({}), error => error.code === 'HTTP' && /503/.test(error.message));
  console.log('narrative-api-client.test.js passed');
})();
