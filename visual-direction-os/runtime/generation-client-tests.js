const assert = require('node:assert/strict');
const {
  normalizeGenerationResponse,
  generateViaProxy,
  generateDirectAgnes
} = require('./generation-client.js');

assert.deepEqual(
  normalizeGenerationResponse({ data: [{ url: 'https://example.com/out.png', revised_prompt: 'revised' }] }),
  { kind: 'url', src: 'https://example.com/out.png', revisedPrompt: 'revised' }
);
const b64 = normalizeGenerationResponse({ data: [{ b64_json: 'AAAA' }] });
assert.equal(b64.kind, 'base64');
assert.equal(b64.src, 'data:image/png;base64,AAAA');
assert.equal(b64.revisedPrompt, null);

const base64Request = {
  model: 'agnes-image-2.1-flash',
  prompt: 'test base64',
  size: '1K',
  ratio: '1:1',
  return_base64: true,
  extra_body: { response_format: 'b64_json' }
};
const dualResponse = normalizeGenerationResponse({
  data: [{ url: 'https://example.com/fallback.png', b64_json: 'CCCC' }]
}, base64Request);
assert.equal(dualResponse.kind, 'base64', 'a Base64 request must not be downgraded to a remote URL when both fields are present');
assert.equal(dualResponse.src, 'data:image/png;base64,CCCC');
assert.throws(() => normalizeGenerationResponse({ data: [] }), /did not include an image/i);

const request = { model: 'agnes-image-2.1-flash', prompt: 'test', size: '1K', ratio: '1:1', extra_body: { response_format: 'url' } };

(async () => {
  let proxyCall;
  const proxyFetch = async (url, options) => {
    proxyCall = { url, options };
    return { ok: true, json: async () => ({ data: [{ url: 'https://example.com/proxy.png' }] }) };
  };
  const proxied = await generateViaProxy(request, {
    endpoint: '/api/agnes-generate',
    proxyToken: 'session-proxy-secret',
    fetchImpl: proxyFetch
  });
  assert.equal(proxyCall.url, '/api/agnes-generate');
  assert.equal(proxyCall.options.method, 'POST');
  assert.equal(proxyCall.options.headers['Content-Type'], 'application/json');
  assert.equal(proxyCall.options.headers['X-VDOS-Proxy-Token'], 'session-proxy-secret');
  assert.equal('Authorization' in proxyCall.options.headers, false, 'browser proxy calls must never receive Agnes credentials');
  assert.deepEqual(JSON.parse(proxyCall.options.body), request);
  assert.equal(proxied.src, 'https://example.com/proxy.png');

  const dualFetch = async () => ({
    ok: true,
    json: async () => ({ data: [{ url: 'https://example.com/fallback.png', b64_json: 'DDDD' }] })
  });
  const proxiedBase64 = await generateViaProxy(base64Request, {
    endpoint: '/api/agnes-generate',
    proxyToken: 'session-proxy-secret',
    fetchImpl: dualFetch
  });
  assert.equal(proxiedBase64.kind, 'base64', 'generateViaProxy must preserve the requested Base64 output mode');
  assert.equal(proxiedBase64.src, 'data:image/png;base64,DDDD');

  let directCall;
  const directFetch = async (url, options) => {
    directCall = { url, options };
    return { ok: true, json: async () => ({ data: [{ b64_json: 'BBBB' }] }) };
  };
  const direct = await generateDirectAgnes(request, { apiKey: 'secret', fetchImpl: directFetch });
  assert.equal(directCall.options.headers.Authorization, 'Bearer secret');
  assert.equal(direct.kind, 'base64');

  await assert.rejects(() => generateViaProxy(request, {
    endpoint: '',
    proxyToken: 'session-proxy-secret',
    fetchImpl: proxyFetch
  }), /proxy endpoint/i);
  await assert.rejects(() => generateViaProxy(request, {
    endpoint: '/api/agnes-generate',
    proxyToken: '',
    fetchImpl: proxyFetch
  }), /proxy token/i);
  await assert.rejects(() => generateDirectAgnes(request, { apiKey: '', fetchImpl: directFetch }), /API key/i);

  const failingFetch = async () => ({ ok: false, status: 429, text: async () => '{"error":{"message":"rate limited"}}' });
  await assert.rejects(() => generateDirectAgnes(request, { apiKey: 'secret', fetchImpl: failingFetch }), /429.*rate limited/i);

  console.log('generation client tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
