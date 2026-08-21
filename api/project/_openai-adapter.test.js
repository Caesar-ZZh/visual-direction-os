'use strict';
const assert = require('assert');
const fixtures = require('../../visual-direction-os/project-breakdown-fixtures.js');
const { createProjectOpenAIProvider } = require('./_openai-adapter.js');

function response(ok, status, body) {
  return { ok, status, async json() { return body; } };
}

(async () => {
  const calls = [];
  const provider = createProjectOpenAIProvider({
    apiKey:'sk-test', model:'gpt-5.6',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(true, 200, { output:[{ type:'message', content:[{ type:'output_text', text:JSON.stringify(fixtures.breakdown) }] }] });
    }
  });
  const result = await provider.generate({ input:{ sourceNarrative:'story', directorIntent:'intent' } });
  assert.equal(result.scenes.length, 4);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.store, false);
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.name, 'vdos_project_breakdown');
  assert.match(body.instructions, /narrative state transitions/i);
  assert.doesNotMatch(body.instructions, /recommend a lens/i);
  assert.equal(JSON.stringify(body.text.format.schema).includes('camera'), false);
  console.log('project _openai-adapter.test.js passed');
})().catch(error => { console.error(error); process.exit(1); });
