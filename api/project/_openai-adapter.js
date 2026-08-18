'use strict';

const { schemaFor, validateOutput } = require('./_contracts.js');
const { promptForBreakdown } = require('./_prompts.js');
const RESPONSES_URL = 'https://api.openai.com/v1/responses';

function providerError(message = 'Project Breakdown model provider request failed.') {
  const error = new Error(message); error.code = 'PROVIDER'; return error;
}
function schemaError(message = 'Project Breakdown model returned invalid structured output.') {
  const error = new Error(message); error.code = 'SCHEMA'; return error;
}
function extractOutputText(payload) {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content?.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) return content.text;
    }
  }
  return null;
}

function createProjectOpenAIProvider({ apiKey, model = 'gpt-5.6', fetchImpl = globalThis.fetch } = {}) {
  return {
    async generate({ input } = {}) {
      if (!apiKey) throw providerError('Project Breakdown model provider is not configured.');
      if (typeof fetchImpl !== 'function') throw providerError('Project Breakdown model transport is unavailable.');
      const requestBody = {
        model,
        store:false,
        instructions:promptForBreakdown(),
        input:JSON.stringify(input ?? {}),
        text:{ format:{ type:'json_schema', name:'vdos_project_breakdown', strict:true, schema:schemaFor() } }
      };
      let response;
      try {
        response = await fetchImpl(RESPONSES_URL, {
          method:'POST',
          headers:{ Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json' },
          body:JSON.stringify(requestBody)
        });
      } catch (_) { throw providerError(); }
      if (!response?.ok) throw providerError();
      let payload;
      try { payload = await response.json(); }
      catch (_) { throw providerError('Project Breakdown model provider returned an unreadable response.'); }
      const text = extractOutputText(payload);
      if (!text) throw providerError('Project Breakdown model provider returned no usable output.');
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (_) { throw schemaError(); }
      const checked = validateOutput(parsed);
      if (!checked.valid) throw schemaError();
      return checked.value;
    }
  };
}
module.exports = { createProjectOpenAIProvider, extractOutputText };
