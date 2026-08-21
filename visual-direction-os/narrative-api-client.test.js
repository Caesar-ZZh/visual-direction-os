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
  const demoSequence = await demo.sequence({ sequenceSkeleton:{ beats:[] } });
  assert.ok(demoSequence.sequenceCompletion, 'demo sequence returns raw constrained completion, not preassembled proposal');
  assert.equal(demoSequence.sequenceCompletion.beats.length, 5);

  const ids = ['setup','pressure','rupture','release','new-ownership'];
  const completionResponse = { sequenceCompletion:{ beats:ids.map((id,index)=>({
    id, narrativeBeat:`beat ${index}`, agency:index<2?'world':index<4?'contested':'character', visualEvents:[], rationale:'reason', openPatch:{}
  })) } };
  const sequenceCalls = [];
  const liveSequence = createNarrativeApiClient({
    baseUrl:'https://api.example.test/api/narrative/',
    fetchImpl:async (url, options) => {
      sequenceCalls.push({url,options});
      return {ok:true,status:200,json:async()=>completionResponse};
    }
  });
  const skeleton = { version:'0.1.0', beats:ids.map(id=>({id})) };
  const liveResult = await liveSequence.sequence({ narrative:'scene', sequenceSkeleton:skeleton });
  assert.deepEqual(liveResult, completionResponse);
  assert.deepEqual(JSON.parse(sequenceCalls[0].options.body).sequenceSkeleton, skeleton);

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
