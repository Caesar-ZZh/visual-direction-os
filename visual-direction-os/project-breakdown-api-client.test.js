const assert = require('assert');
const fixture = require('./project-breakdown-fixtures.js');
const { createProjectBreakdownApiClient } = require('./project-breakdown-api-client.js');
let captured;
const client = createProjectBreakdownApiClient({
  baseUrl:'https://api.example.test',
  fetchImpl: async (url, init) => {
    captured = { url, init };
    return { ok:true, status:200, json:async () => fixture.breakdown };
  }
});
(async () => {
  const result = await client.breakdown({ sourceNarrative:'story', directorIntent:'intent' });
  assert.equal(captured.url, 'https://api.example.test/api/project/breakdown');
  assert.equal(JSON.parse(captured.init.body).sourceNarrative, 'story');
  assert.equal(result.scenes.length, 4);
  const unconfigured = createProjectBreakdownApiClient({ fetchImpl: async () => { throw new Error('should not call'); } });
  await assert.rejects(() => unconfigured.breakdown({ sourceNarrative:'story' }), error => error.code === 'NOT_CONFIGURED');
  console.log('project-breakdown-api-client.test.js passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
